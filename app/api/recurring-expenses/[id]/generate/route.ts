import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { generateForSpecificRecurringExpense } from '@/lib/recurring-expense-generator'
import { createAuditContextFromAPI, auditCreate, safeAudit } from '@/lib/audit-middleware'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, teamId } = await requireAuth()
    const { id } = await params

    const result = await generateForSpecificRecurringExpense(id, teamId)

    if (result.success && result.generated > 0) {
      // Log audit entry for manual generation
      await safeAudit(async () => {
        const auditContext = createAuditContextFromAPI(user, teamId, request, {
          action: 'recurring_expense_manual_generation',
          source: 'api',
          recurringExpenseId: id,
          generatedCount: result.generated,
        })
        await auditCreate(auditContext, 'recurring_expense_generation', id, {
          recurringExpenseId: id,
          generatedCount: result.generated,
          timestamp: new Date(),
          triggeredBy: user.id,
        })
      })
    }

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `${result.generated} expense${result.generated !== 1 ? 's' : ''} generated successfully`
        : 'Failed to generate expenses',
      result
    })

  } catch (error) {
    console.error('Manual recurring expense generation error:', error)
    return NextResponse.json({ error: 'Failed to generate expenses' }, { status: 500 })
  }
}