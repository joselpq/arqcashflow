import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { supervisorValidateExpense } from '@/lib/supervisor'

const ExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  dueDate: z.string().transform((str) => new Date(str + 'T00:00:00.000Z')),
  category: z.string().min(1, 'Category is required'),
  contractId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  vendor: z.string().optional().nullable().transform(val => val === '' ? null : val),
  invoiceNumber: z.string().optional().nullable().transform(val => val === '' ? null : val),
  type: z.enum(['operational', 'project', 'administrative']).default('operational'),
  isRecurring: z.boolean().default(false),
  notes: z.string().optional().nullable().transform(val => val === '' ? null : val),
  receiptUrl: z.string().optional().nullable().transform(val => val === '' ? null : val),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending'),
  paidDate: z.union([z.string(), z.date()]).nullable().optional().transform(val => {
    if (val === '' || val === null || val === undefined) return null
    return val instanceof Date ? val : new Date(val + 'T00:00:00.000Z')
  }),
  paidAmount: z.number().positive().optional().nullable().transform(val => val === 0 || val === null ? null : val),
})

const UpdateExpenseSchema = ExpenseSchema.partial().extend({
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  paidDate: z.union([z.string(), z.date()]).nullable().optional().transform(val => {
    if (val === '' || val === null || val === undefined) return null
    return val instanceof Date ? val : new Date(val + 'T00:00:00.000Z')
  }),
  paidAmount: z.number().positive().optional().nullable().transform(val => val === 0 || val === null ? null : val),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Filter parameters
    const contractId = searchParams.get('contractId')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const vendor = searchParams.get('vendor')

    // Sorting parameters
    const sortBy = searchParams.get('sortBy') || 'dueDate'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Date filters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const where: any = {}

    if (contractId && contractId !== 'all') where.contractId = contractId
    if (status && status !== 'all') where.status = status
    if (category && category !== 'all') where.category = category
    if (type && type !== 'all') where.type = type
    if (vendor) where.vendor = { contains: vendor }

    if (startDate || endDate) {
      where.dueDate = {}
      if (startDate) where.dueDate.gte = new Date(startDate)
      if (endDate) where.dueDate.lte = new Date(endDate)
    }

    // Build orderBy clause
    const validSortFields = ['dueDate', 'amount', 'status', 'category', 'createdAt', 'description', 'vendor']
    const orderBy: any = {}
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc'
    } else {
      orderBy.dueDate = 'asc'
    }

    const expenses = await prisma.expense.findMany({
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
      orderBy,
    })

    // Calculate summary statistics
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const paid = expenses
      .filter(expense => expense.status === 'paid')
      .reduce((sum, expense) => sum + (expense.paidAmount || expense.amount), 0)
    const pending = expenses
      .filter(expense => expense.status === 'pending')
      .reduce((sum, expense) => sum + expense.amount, 0)
    const overdue = expenses
      .filter(expense => {
        if (expense.status !== 'pending') return false
        return new Date(expense.dueDate) < new Date()
      })
      .reduce((sum, expense) => sum + expense.amount, 0)

    return NextResponse.json({
      expenses,
      summary: {
        total,
        paid,
        pending,
        overdue,
        count: expenses.length,
      },
    })

  } catch (error) {
    console.error('Expenses fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = ExpenseSchema.parse(body)

    const expense = await prisma.expense.create({
      data: validatedData,
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

    // Run supervisor validation after creating to get the expense ID
    const alerts = await supervisorValidateExpense(validatedData)

    // Complete the editUrl for any alerts
    const alertsWithEditUrl = alerts.map(alert => ({
      ...alert,
      entityInfo: alert.entityInfo ? {
        ...alert.entityInfo,
        editUrl: `/expenses?edit=${expense.id}`
      } : undefined
    }))

    return NextResponse.json({
      expense,
      alerts: alertsWithEditUrl.length > 0 ? alertsWithEditUrl : undefined
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Expense validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Expense creation error:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}