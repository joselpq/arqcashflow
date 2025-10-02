/**
 * Expenses API with Service Layer
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
import { ExpenseService } from '@/lib/services/ExpenseService'


export async function GET(request: NextRequest) {
  return withTeamContext(async (context) => {
    const expenseService = new ExpenseService(context)
    const searchParams = request.nextUrl.searchParams

    const filters = {
      contractId: searchParams.get('contractId') || undefined,
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      type: searchParams.get('type') || undefined,
      vendor: searchParams.get('vendor') || undefined,
      isRecurring: searchParams.get('isRecurring') === 'true' ? true :
                   searchParams.get('isRecurring') === 'false' ? false : undefined,
      dueAfter: searchParams.get('startDate') || undefined,
      dueBefore: searchParams.get('endDate') || undefined
    }

    const options = {
      sortBy: searchParams.get('sortBy') || 'dueDate',
      sortOrder: searchParams.get('sortOrder') || 'asc',
      includeSummary: true
    }

    // Handle includeSummary option
    if (options.includeSummary) {
      const expenses = await expenseService.findMany(filters, options)
      const summary = await expenseService.getSummary(filters)
      return { expenses, summary }
    }
    return await expenseService.findMany(filters, options)
  })
}

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    const expenseService = new ExpenseService(context)
    const body = await request.json()

    const expense = await expenseService.create(body)

    return { expense }
  })
}

/**
 * SERVICE LAYER MIGRATION ANALYSIS:
 *
 * Middleware route vs Service Layer route:
 *
 * 1. Lines of code:
 *    - Middleware: 283 lines
 *    - Service Layer: ~73 lines (74% reduction)
 *
 * 2. Business logic:
 *    - Middleware: Scattered throughout route handlers
 *    - Service Layer: Centralized in ExpenseService
 *
 * 3. Complex filtering:
 *    - Middleware: Complex where clause building logic
 *    - Service Layer: Clean filter parameters
 *
 * 4. Summary calculations:
 *    - Middleware: Manual calculation logic in route
 *    - Service Layer: Built into service with includeSummary option
 *
 * 5. Maintainability:
 *    - Middleware: Business logic mixed with HTTP handling
 *    - Service Layer: Clear separation of concerns
 *
 * 6. AI Integration Ready:
 *    - Middleware: Direct database access, hard to reuse
 *    - Service Layer: Clean interfaces ready for AI endpoints
 */