import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'
import { createAuditContextFromAPI, auditUpdate, auditDelete, safeAudit, captureEntityState } from '@/lib/audit-middleware'

const UpdateContractSchema = z.object({
  clientName: z.string().optional(),
  projectName: z.string().optional(),
  description: z.string().optional(),
  totalValue: z.number().optional(),
  signedDate: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { teamId } = await requireAuth()
    const { id } = await params

    const contract = await prisma.contract.findFirst({
      where: { id, teamId },
      include: { receivables: true },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    return NextResponse.json(contract)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 })
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
    const validatedData = UpdateContractSchema.parse(body)

    // Capture state before update for audit
    const beforeState = await captureEntityState('contract', id, prisma)
    if (!beforeState || beforeState.teamId !== teamId) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const updateData: any = { ...validatedData }
    if (validatedData.signedDate) {
      updateData.signedDate = new Date(validatedData.signedDate + 'T00:00:00.000Z')
    }

    const contract = await prisma.contract.updateMany({
      where: { id, teamId },
      data: updateData,
    })

    if (contract.count === 0) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const updatedContract = await prisma.contract.findFirst({
      where: { id, teamId },
      include: { receivables: true }
    })

    // Log audit entry for contract update
    await safeAudit(async () => {
      const auditContext = createAuditContextFromAPI(user, teamId, request, {
        action: 'contract_update',
        source: 'api',
        statusChanged: beforeState.status !== (validatedData.status || beforeState.status)
      })
      await auditUpdate(auditContext, 'contract', id, beforeState, validatedData, updatedContract)
    })

    return NextResponse.json({
      contract: updatedContract
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 })
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
    const beforeState = await captureEntityState('contract', id, prisma)
    if (!beforeState || beforeState.teamId !== teamId) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const result = await prisma.contract.deleteMany({
      where: { id, teamId },
    })

    if (result.count === 0) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Log audit entry for contract deletion
    await safeAudit(async () => {
      const auditContext = createAuditContextFromAPI(user, teamId, request, {
        action: 'contract_deletion',
        source: 'api',
        cascadeDelete: true // Note that this will delete associated receivables
      })
      await auditDelete(auditContext, 'contract', id, beforeState)
    })

    return NextResponse.json({ message: 'Contract deleted successfully' })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 })
  }
}