import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'
import { createDateForStorage, isExpenseOverdue, getExpenseActualStatus } from '@/lib/date-utils'
import { createAuditContextFromAPI, auditCreate, safeAudit } from '@/lib/audit-middleware'

const ExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  dueDate: z.string().transform((str) => createDateForStorage(str)),
  category: z.string().min(1, 'Category is required'),
  contractId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  vendor: z.string().optional().nullable().transform(val => val === '' ? null : val),
  invoiceNumber: z.string().optional().nullable().transform(val => val === '' ? null : val),
  type: z.enum(['operational', 'project', 'administrative']).optional().nullable(),
  isRecurring: z.boolean().default(false),
  notes: z.string().optional().nullable().transform(val => val === '' ? null : val),
  receiptUrl: z.string().optional().nullable().transform(val => val === '' ? null : val),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending'),
  paidDate: z.union([z.string(), z.date()]).nullable().optional().transform(val => {
    if (val === '' || val === null || val === undefined) return null
    return val instanceof Date ? val : createDateForStorage(val)
  }),
  paidAmount: z.number().positive().optional().nullable().transform(val => val === 0 || val === null ? null : val),
})

const UpdateExpenseSchema = ExpenseSchema.partial().extend({
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  paidDate: z.union([z.string(), z.date()]).nullable().optional().transform(val => {
    if (val === '' || val === null || val === undefined) return null
    return val instanceof Date ? val : createDateForStorage(val)
  }),
  paidAmount: z.number().positive().optional().nullable().transform(val => val === 0 || val === null ? null : val),
})

export async function GET(request: NextRequest) {
  try {
    const { teamId } = await requireAuth()

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

    // Build where clause - ALWAYS filter by teamId
    const where: any = {
      teamId
    }

    if (contractId && contractId !== 'all') where.contractId = contractId

    // Handle status filtering with calculated overdue logic
    if (status && status !== 'all') {
      if (status === 'overdue') {
        // For overdue filter, get pending items and filter after calculation
        where.status = 'pending'
      } else {
        where.status = status
      }
    }

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

    let expenses = await prisma.expense.findMany({
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

    // Update status based on current date and apply post-filter for calculated statuses
    const requestedStatus = searchParams.get('status')
    const expensesWithUpdatedStatus = expenses.map(expense => {
      const actualStatus = getExpenseActualStatus(expense)
      if (actualStatus !== expense.status) {
        return { ...expense, status: actualStatus }
      }
      return expense
    })

    // Apply post-filter for calculated statuses
    let filteredExpenses = expensesWithUpdatedStatus
    if (requestedStatus === 'overdue') {
      // Filter to only show overdue items
      filteredExpenses = expensesWithUpdatedStatus.filter(expense =>
        expense.status === 'overdue'
      )
    } else if (requestedStatus === 'pending') {
      // Filter to only show truly pending (not overdue) items
      filteredExpenses = expensesWithUpdatedStatus.filter(expense =>
        expense.status === 'pending'
      )
    }

    // Calculate summary statistics from ALL expenses (not just filtered ones)
    const total = expensesWithUpdatedStatus.reduce((sum, expense) => sum + expense.amount, 0)
    const paid = expensesWithUpdatedStatus
      .filter(expense => expense.status === 'paid')
      .reduce((sum, expense) => sum + (expense.paidAmount || expense.amount), 0)
    const pending = expensesWithUpdatedStatus
      .filter(expense => expense.status === 'pending')
      .reduce((sum, expense) => sum + expense.amount, 0)
    const overdue = expensesWithUpdatedStatus
      .filter(expense => expense.status === 'overdue')
      .reduce((sum, expense) => sum + expense.amount, 0)

    return NextResponse.json({
      expenses: filteredExpenses,
      summary: {
        total,
        paid,
        pending,
        overdue,
        count: expensesWithUpdatedStatus.length, // Total count, not filtered count
      },
    })

  } catch (error) {
    console.error('Expenses fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, teamId } = await requireAuth()

    const body = await request.json()
    const validatedData = ExpenseSchema.parse(body)

    const expense = await prisma.expense.create({
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

    // Log audit entry for expense creation
    await safeAudit(async () => {
      const auditContext = createAuditContextFromAPI(user, teamId, request, {
        action: 'expense_creation',
        source: 'api',
        contractId: expense.contractId,
        category: expense.category,
        type: expense.type
      })
      await auditCreate(auditContext, 'expense', expense.id, expense)
    })

    return NextResponse.json({
      expense
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