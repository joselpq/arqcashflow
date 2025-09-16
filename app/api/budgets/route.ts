import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'

const BudgetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  budgetAmount: z.number().positive('Budget amount must be positive'),
  period: z.enum(['monthly', 'quarterly', 'project', 'annual']),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  contractId: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { teamId } = await requireAuth()

    const searchParams = request.nextUrl.searchParams

    // Filter parameters
    const contractId = searchParams.get('contractId')
    const category = searchParams.get('category')
    const period = searchParams.get('period')
    const isActive = searchParams.get('isActive')

    // Build where clause - ensure team filtering
    const where: any = {
      teamId,
      NOT: { teamId: null }
    }

    if (contractId && contractId !== 'all') where.contractId = contractId
    if (category && category !== 'all') where.category = category
    if (period && period !== 'all') where.period = period
    if (isActive !== null) where.isActive = isActive === 'true'

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        contract: {
          select: {
            id: true,
            clientName: true,
            projectName: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    // Calculate budget utilization for each budget
    const budgetsWithUtilization = await Promise.all(
      budgets.map(async (budget) => {
        // Get expenses for this budget's category and date range, filtered by team
        const expenseWhere: any = {
          category: budget.category,
          dueDate: {
            gte: budget.startDate,
            lte: budget.endDate,
          },
          contract: { teamId }
        }

        // If budget is project-specific, filter by contract
        if (budget.contractId) {
          expenseWhere.contractId = budget.contractId
        }

        const expenses = await prisma.expense.findMany({
          where: expenseWhere,
          select: {
            amount: true,
            paidAmount: true,
            status: true,
          },
        })

        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
        const paidExpenses = expenses
          .filter(expense => expense.status === 'paid')
          .reduce((sum, expense) => sum + (expense.paidAmount || expense.amount), 0)

        const utilizationPercent = budget.budgetAmount > 0
          ? (totalExpenses / budget.budgetAmount) * 100
          : 0

        const remaining = budget.budgetAmount - totalExpenses

        return {
          ...budget,
          utilization: {
            totalExpenses,
            paidExpenses,
            utilizationPercent: Math.round(utilizationPercent * 100) / 100,
            remaining,
            isOverBudget: totalExpenses > budget.budgetAmount,
          },
        }
      })
    )

    return NextResponse.json(budgetsWithUtilization)

  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Budgets fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { teamId } = await requireAuth()

    const body = await request.json()
    const validatedData = BudgetSchema.parse(body)

    // If contractId is provided, verify it belongs to the user's team
    if (validatedData.contractId) {
      const contract = await prisma.contract.findFirst({
        where: {
          id: validatedData.contractId,
          teamId
        }
      })

      if (!contract) {
        return NextResponse.json({ error: 'Contract not found or access denied' }, { status: 404 })
      }
    }

    const budget = await prisma.budget.create({
      data: {
        ...validatedData,
        teamId
      },
      include: {
        contract: {
          select: {
            id: true,
            clientName: true,
            projectName: true,
          },
        },
      },
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Budget creation error:', error)
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
  }
}