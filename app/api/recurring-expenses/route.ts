/**
 * Recurring Expense Operations with Service Layer
 *
 * Migrated to use service layer for consistent business logic and team isolation.
 * Provides GET and POST operations for recurring expenses collection.
 */

import { NextRequest } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { RecurringExpenseService } from '@/lib/services/RecurringExpenseService'

export async function GET(request: NextRequest) {
  return withTeamContext(async (context) => {
    const recurringExpenseService = new RecurringExpenseService(context)

    // Extract query parameters for filtering
    const url = new URL(request.url)
    const filters: any = {}

    if (url.searchParams.get('contractId')) filters.contractId = url.searchParams.get('contractId')
    if (url.searchParams.get('category')) filters.category = url.searchParams.get('category')
    if (url.searchParams.get('frequency')) filters.frequency = url.searchParams.get('frequency')
    if (url.searchParams.get('vendor')) filters.vendor = url.searchParams.get('vendor')
    if (url.searchParams.get('isActive')) filters.isActive = url.searchParams.get('isActive') === 'true'

    const recurringExpenses = await recurringExpenseService.findMany(filters, {
      includeContract: true,
      includeUser: true,
      includeExpenses: true,
      sortBy: url.searchParams.get('sortBy') || 'createdAt',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    })

    return { recurringExpenses }
  })
}

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    const body = await request.json()

    const recurringExpenseService = new RecurringExpenseService({ ...context, request })
    const recurringExpense = await recurringExpenseService.create(body)

    return { recurringExpense }
  })
}

/**
 * SERVICE LAYER MIGRATION ANALYSIS:
 *
 * Before (middleware route) vs After (service layer):
 *
 * 1. Lines of code:
 *    - Before: ~180 lines with complex validation and calculation logic
 *    - After: ~35 lines (80% reduction)
 *
 * 2. Business logic:
 *    - Before: Inline validation, date calculations, audit logging in route
 *    - After: Centralized in RecurringExpenseService with reusable methods
 *
 * 3. Validation:
 *    - Before: Local Zod schemas with manual transformations
 *    - After: Unified validation layer from lib/validation/financial.ts
 *
 * 4. Team isolation:
 *    - Before: Manual requireAuth() and team filtering
 *    - After: Automatic via withTeamContext middleware
 *
 * 5. Error handling:
 *    - Before: Manual try-catch blocks with custom error responses
 *    - After: Consistent error handling via service layer patterns
 *
 * 6. Audit logging:
 *    - Before: Manual audit context creation and logging
 *    - After: Automatic via service layer
 *
 * 7. Code reusability:
 *    - Before: Route-specific logic, not reusable
 *    - After: Service methods can be used by other APIs, tests, and AI integrations
 */