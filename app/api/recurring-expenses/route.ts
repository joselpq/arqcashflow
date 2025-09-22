import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'
import { createDateForStorage } from '@/lib/date-utils'
import { createAuditContextFromAPI, auditCreate, safeAudit } from '@/lib/audit-middleware'
import { generateInitialRecurringExpenses } from '@/lib/recurring-expense-generator'

// Validation schema for recurring expenses
const RecurringExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annual'], {
    errorMap: () => ({ message: 'Frequency must be weekly, monthly, quarterly, or annual' })
  }),
  interval: z.number().min(1).max(12, 'Interval must be between 1 and 12'),
  // dayOfMonth is now auto-calculated from startDate, remove from input schema
  startDate: z.string().transform((str) => createDateForStorage(str)),
  endDate: z.string().optional().nullable().transform(val => {
    if (val === '' || val === null || val === undefined) return null
    return createDateForStorage(val)
  }),
  maxOccurrences: z.number().min(1).optional().nullable().transform(val => val === 0 ? null : val),

  // Optional fields
  contractId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  vendor: z.string().optional().nullable().transform(val => val === '' ? null : val),
  invoiceNumber: z.string().optional().nullable().transform(val => val === '' ? null : val),
  type: z.enum(['operational', 'project', 'administrative']).optional().nullable(),
  notes: z.string().optional().nullable().transform(val => val === '' ? null : val),
})

const UpdateRecurringExpenseSchema = RecurringExpenseSchema.partial()

// Simplified next due date calculation - consistent with user expectations
function calculateNextDue(startDate: Date, frequency: string, interval: number, dayOfMonth: number): Date {
  const next = new Date(startDate)

  switch (frequency) {
    case 'weekly':
      // For weekly, just add weeks (dayOfMonth not relevant)
      next.setDate(next.getDate() + (7 * interval))
      break

    case 'monthly':
      // For monthly, go to next month and set the day
      next.setMonth(next.getMonth() + interval)
      // Handle month-end edge cases (e.g., Jan 31 → Feb 28)
      const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(dayOfMonth, lastDayOfMonth))
      break

    case 'quarterly':
      // For quarterly, add 3 months per interval
      next.setMonth(next.getMonth() + (3 * interval))
      const lastDayOfQuarter = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(dayOfMonth, lastDayOfQuarter))
      break

    case 'annual':
      // For annual, add years
      next.setFullYear(next.getFullYear() + interval)
      // Handle leap year edge case (Feb 29 → Feb 28)
      const lastDayOfYear = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(dayOfMonth, lastDayOfYear))
      break
  }

  return next
}

export async function GET(request: NextRequest) {
  try {
    const { teamId } = await requireAuth()

    const searchParams = request.nextUrl.searchParams

    // Filter parameters
    const contractId = searchParams.get('contractId')
    const category = searchParams.get('category')
    const frequency = searchParams.get('frequency')
    const isActive = searchParams.get('isActive')

    // Sorting parameters
    const sortBy = searchParams.get('sortBy') || 'nextDue'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Build where clause - ALWAYS filter by teamId
    const where: any = { teamId }

    if (contractId && contractId !== 'all') where.contractId = contractId
    if (category && category !== 'all') where.category = category
    if (frequency && frequency !== 'all') where.frequency = frequency
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    // Build orderBy clause
    const validSortFields = ['nextDue', 'amount', 'frequency', 'category', 'createdAt', 'description']
    const orderBy: any = {}
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc'
    } else {
      orderBy.nextDue = 'asc'
    }

    const recurringExpenses = await prisma.recurringExpense.findMany({
      where,
      include: {
        contract: {
          select: {
            id: true,
            clientName: true,
            projectName: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        expenses: {
          select: {
            id: true,
            dueDate: true,
            status: true,
            amount: true,
          },
          orderBy: {
            dueDate: 'desc'
          },
          take: 5, // Show last 5 generated expenses
        },
      },
      orderBy,
    })

    // Calculate summary statistics
    const total = recurringExpenses.reduce((sum, re) => sum + re.amount, 0)
    const active = recurringExpenses.filter(re => re.isActive).length
    const inactive = recurringExpenses.length - active

    return NextResponse.json({
      recurringExpenses,
      summary: {
        total,
        active,
        inactive,
        count: recurringExpenses.length,
      },
    })

  } catch (error) {
    console.error('Recurring expenses fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch recurring expenses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, teamId } = await requireAuth()

    const body = await request.json()
    const validatedData = RecurringExpenseSchema.parse(body)

    // Auto-calculate dayOfMonth from startDate
    const dayOfMonth = validatedData.startDate.getDate()

    // Calculate initial nextDue date
    const nextDue = calculateNextDue(
      validatedData.startDate,
      validatedData.frequency,
      validatedData.interval,
      dayOfMonth
    )

    const recurringExpense = await prisma.recurringExpense.create({
      data: {
        ...validatedData,
        dayOfMonth, // Add the auto-calculated dayOfMonth
        teamId,
        createdBy: user.id,
        nextDue,
      },
      include: {
        contract: {
          select: {
            id: true,
            clientName: true,
            projectName: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Generate initial expenses for past and current periods
    try {
      const generationResult = await generateInitialRecurringExpenses(recurringExpense.id, teamId)
      console.log(`Generated ${generationResult.generated} initial expenses for recurring expense ${recurringExpense.id}`)
    } catch (error) {
      console.error('Error generating initial expenses:', error)
      // Don't fail the creation if generation fails, just log it
    }

    // Log audit entry for recurring expense creation
    await safeAudit(async () => {
      const auditContext = createAuditContextFromAPI(user, teamId, request, {
        action: 'recurring_expense_creation',
        source: 'api',
        contractId: recurringExpense.contractId,
        frequency: recurringExpense.frequency,
        category: recurringExpense.category,
      })
      await auditCreate(auditContext, 'recurring_expense', recurringExpense.id, recurringExpense)
    })

    return NextResponse.json({
      recurringExpense
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Recurring expense validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Recurring expense creation error:', error)
    return NextResponse.json({ error: 'Failed to create recurring expense' }, { status: 500 })
  }
}