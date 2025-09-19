import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'
import { createAuditContextFromAPI, auditUpdate, auditDelete, safeAudit, captureEntityState } from '@/lib/audit-middleware'

const UpdateExpenseSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().transform((str) => new Date(str + 'T00:00:00.000Z')).optional(),
  category: z.string().min(1).optional(),
  contractId: z.string().nullable().optional().transform(val => val === '' ? null : val),
  vendor: z.string().optional().nullable().transform(val => val === '' ? null : val),
  invoiceNumber: z.string().optional().nullable().transform(val => val === '' ? null : val),
  type: z.enum(['operational', 'project', 'administrative']).optional(),
  isRecurring: z.boolean().optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  paidDate: z.union([z.string(), z.date()]).nullable().optional().transform(val => {
    if (val === '' || val === null || val === undefined) return null
    return val instanceof Date ? val : new Date(val + 'T00:00:00.000Z')
  }),
  paidAmount: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable().transform(val => val === '' ? null : val),
  receiptUrl: z.string().optional().nullable().transform(val => val === '' ? null : val),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const expense = await prisma.expense.findUnique({
      where: { id },
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

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Expense fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, teamId } = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const validatedData = UpdateExpenseSchema.parse(body)

    // Capture state before update for audit
    const beforeState = await captureEntityState('expense', id, prisma)
    if (!beforeState) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Verify team ownership
    if (beforeState.teamId !== teamId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // If marking as paid and no paidDate/paidAmount provided, set defaults
    if (validatedData.status === 'paid') {
      if (!validatedData.paidDate) {
        validatedData.paidDate = new Date()
      }
      // If no paidAmount specified, use the full amount
      if (!validatedData.paidAmount) {
        validatedData.paidAmount = beforeState.amount
      }
    }

    const expense = await prisma.expense.update({
      where: { id },
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

    // Log audit entry for expense update
    await safeAudit(async () => {
      const auditContext = createAuditContextFromAPI(user, teamId, request, {
        action: 'expense_update',
        source: 'api',
        contractId: expense.contractId,
        category: expense.category,
        type: expense.type,
        statusChanged: beforeState.status !== expense.status
      })
      await auditUpdate(auditContext, 'expense', id, beforeState, validatedData, expense)
    })

    return NextResponse.json(expense)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      console.error('Expense update validation error:', error.errors)
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Expense update error:', error)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, teamId } = await requireAuth()
    const { id } = await params

    // Capture state before deletion for audit
    const beforeState = await captureEntityState('expense', id, prisma)
    if (!beforeState) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Verify team ownership
    if (beforeState.teamId !== teamId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await prisma.expense.delete({
      where: { id },
    })

    // Log audit entry for expense deletion
    await safeAudit(async () => {
      const auditContext = createAuditContextFromAPI(user, teamId, request, {
        action: 'expense_deletion',
        source: 'api',
        contractId: beforeState.contractId,
        category: beforeState.category,
        type: beforeState.type
      })
      await auditDelete(auditContext, 'expense', id, beforeState)
    })

    return NextResponse.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Expense deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}