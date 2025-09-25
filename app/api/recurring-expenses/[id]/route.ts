import { NextRequest } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { RecurringExpenseService } from '@/lib/services/RecurringExpenseService'



export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params

    const recurringExpenseService = new RecurringExpenseService(context)
    const recurringExpense = await recurringExpenseService.findById(id, {
      includeContract: true,
      includeUser: true,
      includeExpenses: true
    })

    if (!recurringExpense) {
      throw new Error('Recurring expense not found')
    }

    return { recurringExpense }
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params
    const body = await request.json()

    const recurringExpenseService = new RecurringExpenseService({ ...context, request })
    const recurringExpense = await recurringExpenseService.update(id, body)

    if (!recurringExpense) {
      throw new Error('Recurring expense not found')
    }

    return { recurringExpense }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTeamContext(async (context) => {
    const { id } = await params

    const recurringExpenseService = new RecurringExpenseService({ ...context, request })
    const success = await recurringExpenseService.delete(id)

    if (!success) {
      throw new Error('Recurring expense not found')
    }

    return { message: 'Recurring expense deleted successfully' }
  })
}