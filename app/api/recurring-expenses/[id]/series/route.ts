/**
 * Recurring Expense Series Operations
 *
 * Provides endpoints for managing the full series of expenses generated from a recurring expense.
 * Supports updating and deleting with different scopes (single, future, all).
 */

import { NextRequest } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { RecurringExpenseService, SeriesUpdateScope } from '@/lib/services/RecurringExpenseService'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params
    const body = await request.json()

    // Extract scope and data from request body
    const { scope = 'future', targetExpenseId, ...updateData } = body

    const updateScope: SeriesUpdateScope = {
      scope: scope as 'single' | 'future' | 'all',
      targetExpenseId
    }

    const recurringExpenseService = new RecurringExpenseService({ ...context, request })
    const result = await recurringExpenseService.updateExpenseSeries(id, updateData, updateScope)

    return {
      success: true,
      updatedCount: result.updatedCount,
      scope: updateScope.scope
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params

    // Get scope from query params or body
    const url = new URL(request.url)
    const scope = url.searchParams.get('scope') || 'future'
    const targetExpenseId = url.searchParams.get('targetExpenseId') || undefined

    const deleteScope: SeriesUpdateScope = {
      scope: scope as 'single' | 'future' | 'all',
      targetExpenseId
    }

    const recurringExpenseService = new RecurringExpenseService({ ...context, request })
    const result = await recurringExpenseService.deleteExpenseSeries(id, deleteScope)

    return {
      success: true,
      deletedCount: result.deletedCount,
      scope: deleteScope.scope
    }
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params
    const body = await request.json()

    const { action } = body

    const recurringExpenseService = new RecurringExpenseService({ ...context, request })

    if (action === 'regenerate') {
      // Regenerate the series (useful after frequency changes)
      const { preservePaidExpenses = true } = body
      const result = await recurringExpenseService.regenerateSeries(id, preservePaidExpenses)

      return {
        success: true,
        action: 'regenerate',
        generatedCount: result.generatedCount,
        expenses: result.expenses.slice(0, 10) // Return first 10 for preview
      }
    }

    throw new Error('Invalid action. Supported actions: regenerate')
  })
}