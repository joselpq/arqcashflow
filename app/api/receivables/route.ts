/**
 * Receivables API with Service Layer
 *
 * Phase 3 service layer migration - migrated from middleware approach to service layer.
 * This provides centralized business logic, enhanced validation, and AI-ready interfaces.
 *
 * MIGRATION RESULTS:
 * - Service layer: Clean business logic separation
 * - Team security: Automatic team scoping via service layer
 * - Auth handling: Centralized in withTeamContext
 * - Business rules: Enforced consistently through service
 * - AI ready: Clean interfaces for Claude integration
 */

import { NextRequest } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { ReceivableService } from '@/lib/services/ReceivableService'

export async function GET(request: NextRequest) {
  return withTeamContext(async (context) => {
    const receivableService = new ReceivableService(context)
    const searchParams = request.nextUrl.searchParams

    const filters = {
      contractId: searchParams.get('contractId'),
      status: searchParams.get('status'),
      category: searchParams.get('category')
    }

    const options = {
      sortBy: searchParams.get('sortBy') || 'expectedDate',
      sortOrder: searchParams.get('sortOrder') || 'asc'
    }

    return await receivableService.findMany(filters, options)
  })
}

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    const receivableService = new ReceivableService(context)
    const body = await request.json()

    const receivable = await receivableService.create(body)

    return { receivable }
  })
}

/**
 * SERVICE LAYER MIGRATION ANALYSIS:
 *
 * Middleware route vs Service Layer route:
 *
 * 1. Lines of code:
 *    - Middleware: 269 lines
 *    - Service Layer: ~65 lines (76% reduction)
 *
 * 2. Business logic:
 *    - Middleware: Scattered throughout route handlers
 *    - Service Layer: Centralized in ReceivableService
 *
 * 3. Validation:
 *    - Middleware: Manual Zod schemas in route
 *    - Service Layer: Comprehensive validation in service
 *
 * 4. Code complexity:
 *    - Middleware: Complex filtering and status calculation logic
 *    - Service Layer: Clean service method calls
 *
 * 5. Maintainability:
 *    - Middleware: Business logic mixed with HTTP handling
 *    - Service Layer: Clear separation of concerns
 *
 * 6. AI Integration Ready:
 *    - Middleware: Direct database access, hard to reuse
 *    - Service Layer: Clean interfaces ready for AI endpoints
 */