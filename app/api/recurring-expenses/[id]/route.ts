import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'
import { createDateForStorage } from '@/lib/date-utils'
import { createAuditContextFromAPI, auditUpdate, auditDelete, safeAudit } from '@/lib/audit-middleware'

// Validation schema for updating recurring expenses
const UpdateRecurringExpenseSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annual']).optional(),
  interval: z.number().min(1).max(12).optional(),
  dayOfMonth: z.number().min(1).max(31).optional().nullable(),
  startDate: z.string().transform((str) => createDateForStorage(str)).optional(),
  endDate: z.string().optional().nullable().transform(val => {
    if (val === '' || val === null || val === undefined) return null
    return createDateForStorage(val)
  }),
  maxOccurrences: z.number().min(1).optional().nullable().transform(val => val === 0 ? null : val),
  isActive: z.boolean().optional(),

  // Optional fields
  contractId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  vendor: z.string().optional().nullable().transform(val => val === '' ? null : val),
  invoiceNumber: z.string().optional().nullable().transform(val => val === '' ? null : val),
  type: z.enum(['operational', 'project', 'administrative']).optional().nullable(),
  notes: z.string().optional().nullable().transform(val => val === '' ? null : val),
})

// Calculate next due date based on frequency and interval
function calculateNextDue(startDate: Date, frequency: string, interval: number, dayOfMonth?: number): Date {
  const next = new Date(startDate)

  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + (7 * interval))
      break
    case 'monthly':
      if (dayOfMonth) {
        next.setDate(dayOfMonth)
        if (next <= startDate) {
          next.setMonth(next.getMonth() + interval)
        }
      } else {
        next.setMonth(next.getMonth() + interval)
      }
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + (3 * interval))
      if (dayOfMonth) {
        next.setDate(dayOfMonth)
      }
      break
    case 'annual':
      next.setFullYear(next.getFullYear() + interval)
      if (dayOfMonth) {
        next.setDate(dayOfMonth)
      }
      break
  }

  return next
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { teamId } = await requireAuth()
    const { id } = await params

    const recurringExpense = await prisma.recurringExpense.findFirst({
      where: {
        id,
        teamId, // Ensure team isolation
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
        expenses: {
          select: {
            id: true,
            dueDate: true,
            status: true,
            amount: true,
            description: true,
          },
          orderBy: {
            dueDate: 'desc'
          },
        },
      },
    })

    if (!recurringExpense) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 })
    }

    return NextResponse.json({ recurringExpense })

  } catch (error) {
    console.error('Recurring expense fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch recurring expense' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, teamId } = await requireAuth()
    const { id } = await params

    // First, get the existing recurring expense for audit trail
    const existingRecurringExpense = await prisma.recurringExpense.findFirst({
      where: {
        id,
        teamId, // Ensure team isolation
      },
    })

    if (!existingRecurringExpense) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = UpdateRecurringExpenseSchema.parse(body)

    // Prepare update data
    const updateData: any = { ...validatedData }

    // Recalculate nextDue if schedule parameters changed
    if (
      validatedData.frequency ||
      validatedData.interval !== undefined ||
      validatedData.dayOfMonth !== undefined ||
      validatedData.startDate
    ) {
      const frequency = validatedData.frequency || existingRecurringExpense.frequency
      const interval = validatedData.interval || existingRecurringExpense.interval
      const dayOfMonth = validatedData.dayOfMonth !== undefined ? validatedData.dayOfMonth : existingRecurringExpense.dayOfMonth
      const startDate = validatedData.startDate || existingRecurringExpense.startDate

      updateData.nextDue = calculateNextDue(startDate, frequency, interval, dayOfMonth || undefined)
    }

    const updatedRecurringExpense = await prisma.recurringExpense.update({
      where: { id },
      data: updateData,
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
            description: true,
          },
          orderBy: {
            dueDate: 'desc'
          },
          take: 5,
        },
      },
    })

    // Log audit entry for recurring expense update
    await safeAudit(async () => {
      const auditContext = createAuditContextFromAPI(user, teamId, request, {
        action: 'recurring_expense_update',
        source: 'api',
        contractId: updatedRecurringExpense.contractId,
        frequencyChanged: validatedData.frequency !== undefined,
        activeStatusChanged: validatedData.isActive !== undefined,
      })

      // Calculate field changes for audit
      const changes: any = {}
      Object.keys(validatedData).forEach(key => {
        const oldValue = (existingRecurringExpense as any)[key]
        const newValue = (validatedData as any)[key]
        if (oldValue !== newValue) {
          changes[key] = { from: oldValue, to: newValue }
        }
      })

      await auditUpdate(auditContext, 'recurring_expense', id, changes, updatedRecurringExpense)
    })

    return NextResponse.json({ recurringExpense: updatedRecurringExpense })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Recurring expense validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Recurring expense update error:', error)
    return NextResponse.json({ error: 'Failed to update recurring expense' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, teamId } = await requireAuth()
    const { id } = await params

    // First, get the existing recurring expense for audit trail
    const existingRecurringExpense = await prisma.recurringExpense.findFirst({
      where: {
        id,
        teamId, // Ensure team isolation
      },
    })

    if (!existingRecurringExpense) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 })
    }

    // Delete the recurring expense (generated expenses will remain)
    await prisma.recurringExpense.delete({
      where: { id },
    })

    // Log audit entry for recurring expense deletion
    await safeAudit(async () => {
      const auditContext = createAuditContextFromAPI(user, teamId, request, {
        action: 'recurring_expense_deletion',
        source: 'api',
        contractId: existingRecurringExpense.contractId,
        generatedCount: existingRecurringExpense.generatedCount,
      })
      await auditDelete(auditContext, 'recurring_expense', id, existingRecurringExpense)
    })

    return NextResponse.json({ message: 'Recurring expense deleted successfully' })

  } catch (error) {
    console.error('Recurring expense deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete recurring expense' }, { status: 500 })
  }
}