import { NextRequest, NextResponse } from 'next/server'
import { generateRecurringExpenses } from '@/lib/recurring-expense-generator'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'development-secret'}`

    if (authHeader !== expectedAuth) {
      console.error('Unauthorized cron request:', { authHeader, expectedAuth })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting scheduled recurring expense generation...')

    const result = await generateRecurringExpenses({
      lookAheadMonths: 3,
      maxBatchSize: 100
    })

    console.log('Scheduled generation complete:', {
      success: result.success,
      generated: result.generated,
      errors: result.errors.length,
      skipped: result.skipped
    })

    return NextResponse.json({
      success: result.success,
      message: `Generated ${result.generated} expenses, skipped ${result.skipped}, errors: ${result.errors.length}`,
      details: {
        generated: result.generated,
        skipped: result.skipped,
        errors: result.errors,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({
      error: 'Failed to run recurring expense generation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Allow manual triggering via POST for testing
  return GET(request)
}