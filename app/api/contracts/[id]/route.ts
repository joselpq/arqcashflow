import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withTeamContext } from '@/lib/middleware/team-context'
import { createDateForStorage } from '@/lib/date-utils'
import { createAuditContextFromAPI, auditUpdate, auditDelete, safeAudit, captureEntityState } from '@/lib/audit-middleware'
import { prisma } from '@/lib/prisma'
import { withServiceLayerFlag } from '@/lib/feature-flags'
import { ContractService } from '@/lib/services/ContractService'

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
  return withTeamContext(async (context) => {
    const { teamScopedPrisma } = context
    const { id } = await params

    return await withServiceLayerFlag(
      // Service layer implementation
      async () => {
        const contractService = new ContractService({ ...context, request })
        const contract = await contractService.findById(id)

        if (!contract) {
          throw new Error('Contract not found')
        }

        return contract
      },

      // Legacy implementation
      async () => {
        const contract = await teamScopedPrisma.contract.findFirst({
          where: { id },
          include: { receivables: true },
        })

        if (!contract) {
          throw new Error('Contract not found')
        }

        return contract
      },
      `/api/contracts/${id}`,
      'GET'
    )
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { teamScopedPrisma, user, teamId } = context
    const { id } = await params
    const body = await request.json()

    return await withServiceLayerFlag(
      // Service layer implementation
      async () => {
        const contractService = new ContractService({ ...context, request })
        const validatedData = UpdateContractSchema.parse(body)

        const updatedContract = await contractService.update(id, validatedData)

        return {
          contract: updatedContract
        }
      },

      // Legacy implementation
      async () => {
        const validatedData = UpdateContractSchema.parse(body)

        // Capture state before update for audit (using raw prisma for audit)
        const beforeState = await captureEntityState('contract', id, prisma)
        if (!beforeState || beforeState.teamId !== teamId) {
          throw new Error('Contract not found')
        }

        const updateData: any = { ...validatedData }
        if (validatedData.signedDate && validatedData.signedDate.trim() !== '') {
          updateData.signedDate = createDateForStorage(validatedData.signedDate)
        }

        const contract = await teamScopedPrisma.contract.update({
          where: { id },
          data: updateData,
        })

        if (!contract) {
          throw new Error('Contract not found')
        }

        const updatedContract = await teamScopedPrisma.contract.findFirst({
          where: { id },
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

        return {
          contract: updatedContract
        }
      },
      `/api/contracts/${id}`,
      'PUT'
    )
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { teamScopedPrisma, user, teamId } = context
    const { id } = await params

    return await withServiceLayerFlag(
      // Service layer implementation
      async () => {
        const contractService = new ContractService({ ...context, request })
        await contractService.delete(id)

        return { message: 'Contract deleted successfully' }
      },

      // Legacy implementation
      async () => {
        // Capture state before deletion for audit (using raw prisma for audit)
        const beforeState = await captureEntityState('contract', id, prisma)
        if (!beforeState || beforeState.teamId !== teamId) {
          throw new Error('Contract not found')
        }

        const result = await teamScopedPrisma.contract.delete({
          where: { id },
        })

        if (!result) {
          throw new Error('Contract not found')
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

        return { message: 'Contract deleted successfully' }
      },
      `/api/contracts/${id}`,
      'DELETE'
    )
  })
}