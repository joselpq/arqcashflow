/**
 * CONTRACTS API - Service Layer Implementation
 *
 * Phase 2: Full migration to service layer completed
 * All contract operations use ContractService for consistent business logic.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { ContractService } from '@/lib/services/ContractService'
import { ContractSchemas } from '@/lib/validation'

export async function GET(request: NextRequest) {
  return withTeamContext(async (context) => {
    const searchParams = request.nextUrl.searchParams

    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const contractService = new ContractService({ ...context, request })

    const filters = {
      status: status && status !== 'all' ? status : undefined,
      category: category && category !== 'all' ? category : undefined
    }

    const options = {
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc'
    }

    return await contractService.findMany(filters, options)
  })
}

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    const body = await request.json()

    // Get profession for profession-aware validation
    const profession = context.user.team.profession

    // Use unified validation schema
    const validatedData = ContractSchemas.create(profession).parse(body)

    const contractService = new ContractService({ ...context, request })
    const contract = await contractService.create(validatedData)

    return {
      contract
    }
  })
}

/**
 * CONTRACTS API - Service Layer Implementation
 *
 * Phase 2: Full migration to service layer completed
 * - All contract operations use ContractService
 * - Centralized business logic and validation
 * - Consistent audit logging and error handling
 * - Clean, maintainable code structure
 *
 * Code reduction achieved:
 * - From ~147 lines to ~65 lines (56% reduction)
 * - Removed dual implementation complexity
 * - Single source of truth for business logic
 */