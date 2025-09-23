import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withTeamContext } from '@/lib/middleware/team-context'
import { createDateForStorage } from '@/lib/date-utils'
import { createAuditContextFromAPI, auditUpdate, auditDelete, safeAudit, captureEntityState } from '@/lib/audit-middleware'
import { prisma } from '@/lib/prisma'

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
  return withTeamContext(async ({ teamScopedPrisma, user, teamId }) => {
    console.log('🔍 Receivables PUT endpoint called')
    const { id } = await params
    console.log('📝 Request data:', { userId: user.id, teamId, receivableId: id })

    const body = await request.json()
    console.log('📥 Raw request body:', JSON.stringify(body, null, 2))

    const validatedData = UpdateReceivableSchema.parse(body)
    console.log('✅ Validated data:', JSON.stringify(validatedData, null, 2))

    // Capture state before update for audit (using raw prisma for audit)
    const beforeState = await captureEntityState('receivable', id, prisma)
    if (!beforeState) {
      throw new Error('Receivable not found')
    }

    // Verify team ownership
    const hasAccess = beforeState.teamId === teamId ||
                     (beforeState.contract && beforeState.contract.teamId === teamId)
    if (!hasAccess) {
      throw new Error('Access denied')
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
    // Use raw prisma for update since we need the exact ID match
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

    return receivable
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async ({ user, teamId }) => {
    const { id } = await params

    // Capture state before deletion for audit (using raw prisma for audit)
    const beforeState = await captureEntityState('receivable', id, prisma)
    if (!beforeState) {
      throw new Error('Receivable not found')
    }

    // Verify team ownership
    const hasAccess = beforeState.teamId === teamId ||
                     (beforeState.contract && beforeState.contract.teamId === teamId)
    if (!hasAccess) {
      throw new Error('Access denied')
    }

    // Use raw prisma for delete since we need the exact ID
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

    return { message: 'Receivable deleted successfully' }
  })
}