/**
 * CONTRACTS API - Service Layer Migration Phase 1
 *
 * This API supports both legacy direct implementation and new service layer
 * controlled by the USE_SERVICE_LAYER feature flag.
 *
 * Phase 1: Side-by-side implementation with feature flag control
 * Phase 2: Full migration to service layer
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withTeamContext } from '@/lib/middleware/team-context'
import { createDateForStorage } from '@/lib/date-utils'
import { createAuditContextFromAPI, auditCreate, safeAudit } from '@/lib/audit-middleware'
import { withServiceLayerFlag } from '@/lib/feature-flags'
import { ContractService } from '@/lib/services/ContractService'

const ContractSchema = z.object({
  clientName: z.string(),
  projectName: z.string(),
  description: z.string().optional(),
  totalValue: z.number(),
  signedDate: z.string(),
  status: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  return withTeamContext(async (context) => {
    const { user, teamId, teamScopedPrisma } = context
    const searchParams = request.nextUrl.searchParams

    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    return await withServiceLayerFlag(
      // Service layer implementation
      async () => {
        const contractService = new ContractService({ ...context, request })

        const filters = {
          status: status && status !== 'all' ? status : undefined,
          category: category && category !== 'all' ? category : undefined
        }

        const options = {
          sortBy,
          sortOrder: sortOrder as 'asc' | 'desc'
        }

        const include = {
          receivables: true
        }

        return await contractService.findMany(filters, options, include)
      },

      // Legacy implementation
      async () => {
        // Build where clause - teamId is automatically added by teamScopedPrisma
        const where: any = {}
        if (status && status !== 'all') where.status = status
        if (category && category !== 'all') where.category = category

        // Valid sort fields (same as original)
        const validSortFields = ['createdAt', 'signedDate', 'clientName', 'projectName', 'totalValue', 'status']
        const orderBy: any = {}

        if (validSortFields.includes(sortBy)) {
          orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc'
        } else {
          orderBy.createdAt = 'desc'
        }

        // Use team-scoped prisma - teamId is automatically added
        const contracts = await teamScopedPrisma.contract.findMany({
          where,
          include: {
            receivables: true,
          },
          orderBy,
        })

        return contracts
      },
      '/api/contracts',
      'GET'
    )
  })
}

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    const { user, teamId, teamScopedPrisma } = context
    const body = await request.json()

    return await withServiceLayerFlag(
      // Service layer implementation
      async () => {
        const contractService = new ContractService({ ...context, request })
        const validatedData = ContractSchema.parse(body)

        const contract = await contractService.create(validatedData)

        return {
          contract
        }
      },

      // Legacy implementation
      async () => {
        const validatedData = ContractSchema.parse(body)

        // Create contract - teamId is automatically added by teamScopedPrisma
        const contract = await teamScopedPrisma.contract.create({
          data: {
            ...validatedData,
            signedDate: validatedData.signedDate && validatedData.signedDate.trim() !== ''
              ? createDateForStorage(validatedData.signedDate)
              : new Date(),
            // teamId automatically added by teamScopedPrisma
          },
        })

        // Log audit entry for contract creation (same as original)
        await safeAudit(async () => {
          const auditContext = createAuditContextFromAPI(user, teamId, request, {
            action: 'contract_creation',
            source: 'api'
          })
          await auditCreate(auditContext, 'contract', contract.id, contract)
        })

        return {
          contract
        }
      },
      '/api/contracts',
      'POST'
    )
  })
}

/**
 * COMPARISON ANALYSIS:
 *
 * Original route vs Middleware route:
 *
 * 1. Lines of code:
 *    - Original: 106 lines
 *    - Middleware: ~75 lines (29% reduction)
 *
 * 2. Team security:
 *    - Original: Manual teamId in queries
 *    - Middleware: Automatic team scoping
 *
 * 3. Auth handling:
 *    - Original: Manual requireAuth() calls
 *    - Middleware: Centralized in withTeamContext
 *
 * 4. Boilerplate reduction:
 *    - Original: Auth + team context in every function
 *    - Middleware: Clean business logic focus
 *
 * 5. Maintainability:
 *    - Original: Scattered auth/team logic
 *    - Middleware: Single source of truth
 */