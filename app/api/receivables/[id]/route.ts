import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'
import { createDateForStorage } from '@/lib/date-utils'
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
    console.log('🔍 Receivables PUT endpoint called')
    const { user, teamId } = await requireAuth()
    const { id } = await params
    console.log('📝 Request data:', { userId: user.id, teamId, receivableId: id })

    const body = await request.json()
    console.log('📥 Raw request body:', JSON.stringify(body, null, 2))

    const validatedData = UpdateReceivableSchema.parse(body)
    console.log('✅ Validated data:', JSON.stringify(validatedData, null, 2))

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
    console.log('🔄 Processing dates...')

    if (validatedData.expectedDate && validatedData.expectedDate.trim() !== '') {
      console.log('📅 Processing expectedDate:', validatedData.expectedDate)
      try {
        updateData.expectedDate = createDateForStorage(validatedData.expectedDate)
        console.log('✅ expectedDate processed successfully:', updateData.expectedDate)
      } catch (error) {
        console.error('❌ Error processing expectedDate:', error)
        throw error
      }
    } else {
      console.log('⏭️ Skipping expectedDate (empty or undefined)')
    }

    if (validatedData.receivedDate && validatedData.receivedDate.trim() !== '') {
      console.log('📅 Processing receivedDate:', validatedData.receivedDate)
      try {
        updateData.receivedDate = createDateForStorage(validatedData.receivedDate)
        console.log('✅ receivedDate processed successfully:', updateData.receivedDate)
      } catch (error) {
        console.error('❌ Error processing receivedDate:', error)
        throw error
      }
    } else {
      console.log('⏭️ Skipping receivedDate (empty or undefined)')
    }

    // Clean up empty strings for Prisma - it expects null, not empty strings
    const cleanUpdateData = { ...updateData }
    if (cleanUpdateData.receivedDate === '') {
      delete cleanUpdateData.receivedDate
    }
    if (cleanUpdateData.expectedDate === '') {
      delete cleanUpdateData.expectedDate
    }
    // Clean up other optional string fields
    if (cleanUpdateData.invoiceNumber === '') {
      cleanUpdateData.invoiceNumber = null
    }
    if (cleanUpdateData.category === '') {
      cleanUpdateData.category = null
    }
    if (cleanUpdateData.notes === '') {
      cleanUpdateData.notes = null
    }

    console.log('📦 Final updateData:', JSON.stringify(updateData, null, 2))
    console.log('🧹 Cleaned updateData for Prisma:', JSON.stringify(cleanUpdateData, null, 2))

    console.log('💾 Updating receivable in database...')
    const receivable = await prisma.receivable.update({
      where: { id },
      data: cleanUpdateData,
      include: { contract: true }
    })
    console.log('✅ Receivable updated successfully:', receivable.id)

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
    console.error('❌ Error in receivables PUT endpoint:', error)

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      console.error('📋 Validation errors:', error.errors)
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('💥 Unexpected error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({
      error: 'Failed to update receivable',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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