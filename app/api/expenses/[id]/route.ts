/**
 * Individual Expense Operations with Service Layer
 *
 * Phase 3 service layer migration - migrated from middleware approach to service layer.
 * Provides GET, PUT, and DELETE operations for individual expenses.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { ExpenseService } from '@/lib/services/ExpenseService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const expenseService = new ExpenseService(context)
    const { id } = await params

    const expense = await expenseService.findById(id)

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    return expense
  }).then(result => {
    // If result is already a NextResponse, return it as-is
    if (result instanceof NextResponse) {
      return result
    }
    return NextResponse.json(result)
  })
    .catch(error => {
      console.error('EXPENSE FETCH ERROR:', error)
      if (error instanceof Error && error.message === "Unauthorized") {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 })
    })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const expenseService = new ExpenseService(context)
    const { id } = await params
    const body = await request.json()

    const expense = await expenseService.update(id, body)

    return expense
  }).then(result => NextResponse.json(result))
    .catch(error => {
      if (error instanceof Error && error.message === "Unauthorized") {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.name === 'ZodError') {
        return NextResponse.json({ error: error.errors }, { status: 400 })
      }
      console.error('Expense update error:', error)
      return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
    })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const expenseService = new ExpenseService(context)
    const { id } = await params

    await expenseService.delete(id)

    return { message: 'Expense deleted successfully' }
  }).then(result => NextResponse.json(result))
    .catch(error => {
      if (error instanceof Error && error.message === "Unauthorized") {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      console.error('Expense deletion error:', error)
      return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
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