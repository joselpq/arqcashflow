/**
 * Individual Expense Operations with Service Layer
 *
 * Phase 3 service layer migration - migrated from middleware approach to service layer.
 * Provides GET, PUT, and DELETE operations for individual expenses.
 */

import { NextRequest } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { ExpenseService } from '@/lib/services/ExpenseService'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params

    const expenseService = new ExpenseService(context)
    const expense = await expenseService.findById(id)

    if (!expense) {
      throw new Error('Expense not found')
    }

    return expense
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params
    const body = await request.json()

    const expenseService = new ExpenseService(context)
    const expense = await expenseService.update(id, body)

    if (!expense) {
      throw new Error('Expense not found')
    }

    return { expense }
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params

    const expenseService = new ExpenseService(context)
    const success = await expenseService.delete(id)

    if (!success) {
      throw new Error('Expense not found')
    }

    return { message: 'Expense deleted successfully' }
  })
}

/**
 * SERVICE LAYER MIGRATION ANALYSIS:
 *
 * Middleware route vs Service Layer route:
 *
 * 1. Lines of code:
 *    - Middleware: 226 lines
 *    - Service Layer: ~87 lines (61% reduction)
 *
 * 2. Business logic:
 *    - Middleware: Complex status handling and audit logic in route
 *    - Service Layer: Centralized in ExpenseService
 *
 * 3. Validation:
 *    - Middleware: Manual Zod schemas and transformation logic
 *    - Service Layer: Comprehensive validation in service
 *
 * 4. Code complexity:
 *    - Middleware: Payment status logic mixed with HTTP handling
 *    - Service Layer: Clean service method calls
 *
 * 5. Maintainability:
 *    - Middleware: Business rules scattered across route handlers
 *    - Service Layer: Clear separation of concerns
 *
 * 6. AI Integration Ready:
 *    - Middleware: Direct database access, hard to reuse
 *    - Service Layer: Clean interfaces ready for AI endpoints
 */