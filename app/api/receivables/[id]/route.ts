import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'
import { createAuditContextFromAPI, auditUpdate, auditDelete, safeAudit, captureEntityState } from '@/lib/audit-middleware'

const UpdateReceivableSchema = z.object({
  expectedDate: z.string().optional(),
  amount: z.number().optional(),
  status: z.string().optional(),
  receivedDate: z.string().optional().nullable(),
  receivedAmount: z.number().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // New fields for non-contract receivables
  clientName: z.string().optional().nullable().transform(val => val === '' ? null : val),
  description: z.string().optional().nullable().transform(val => val === '' ? null : val),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, teamId } = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const validatedData = UpdateReceivableSchema.parse(body)

    // Capture state before update for audit
    const beforeState = await captureEntityState('receivable', id, prisma)
    if (!beforeState) {
      return NextResponse.json({ error: 'Receivable not found' }, { status: 404 })
    }

    // Verify team ownership
    const hasAccess = beforeState.teamId === teamId ||
                     (beforeState.contract && beforeState.contract.teamId === teamId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const updateData: any = { ...validatedData }
    if (validatedData.expectedDate) {
      updateData.expectedDate = new Date(validatedData.expectedDate + 'T00:00:00.000Z')
    }
    if (validatedData.receivedDate) {
      updateData.receivedDate = new Date(validatedData.receivedDate + 'T00:00:00.000Z')
    }

    const receivable = await prisma.receivable.update({
      where: { id },
      data: updateData,
      include: { contract: true }
    })

    // Log audit entry for receivable update
    await safeAudit(async () => {
      const auditContext = createAuditContextFromAPI(user, teamId, request, {
        action: 'receivable_update',
        source: 'api',
        contractId: receivable.contractId
      })
      await auditUpdate(auditContext, 'receivable', id, beforeState, validatedData, receivable)
    })

    return NextResponse.json(receivable)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update receivable' }, { status: 500 })
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
    const beforeState = await captureEntityState('receivable', id, prisma)
    if (!beforeState) {
      return NextResponse.json({ error: 'Receivable not found' }, { status: 404 })
    }

    // Verify team ownership
    const hasAccess = beforeState.teamId === teamId ||
                     (beforeState.contract && beforeState.contract.teamId === teamId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await prisma.receivable.delete({
      where: { id },
    })

    // Log audit entry for receivable deletion
    await safeAudit(async () => {
      const auditContext = createAuditContextFromAPI(user, teamId, request, {
        action: 'receivable_deletion',
        source: 'api',
        contractId: beforeState.contractId
      })
      await auditDelete(auditContext, 'receivable', id, beforeState)
    })

    return NextResponse.json({ message: 'Receivable deleted successfully' })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to delete receivable' }, { status: 500 })
  }
}