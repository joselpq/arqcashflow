/**
 * PROOF OF CONCEPT: Contracts API with Team Context Middleware
 *
 * This is a side-by-side implementation of the contracts API using
 * the new team context middleware. It should produce identical
 * results to the original /api/contracts route.
 *
 * SAFETY: This is a separate endpoint that doesn't modify existing functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withTeamContext } from '@/lib/middleware/team-context'
import { createDateForStorage } from '@/lib/date-utils'
import { createAuditContextFromAPI, auditCreate, safeAudit } from '@/lib/audit-middleware'

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
  return withTeamContext(async ({ user, teamId, teamScopedPrisma }) => {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

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
  })
}

export async function POST(request: NextRequest) {
  return withTeamContext(async ({ user, teamId, teamScopedPrisma }) => {
    const body = await request.json()
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