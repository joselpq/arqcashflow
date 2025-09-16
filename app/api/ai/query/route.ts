import { NextRequest, NextResponse } from 'next/server'
import { queryDatabase } from '@/lib/langchain'
import { supervisorValidateQuery } from '@/lib/supervisor'
import { requireAuth } from '@/lib/auth-utils'
import { z } from 'zod'

const QuerySchema = z.object({
  question: z.string().min(1),
  history: z.array(z.object({
    question: z.string(),
    answer: z.string()
  })).optional()
})

export async function POST(request: NextRequest) {
  try {
    const { teamId } = await requireAuth()

    const body = await request.json()
    const { question, history } = QuerySchema.parse(body)

    const result = await queryDatabase(question, teamId, history)

    // Run supervisor validation on the query context
    const alerts = await supervisorValidateQuery(question, { result, history })

    return NextResponse.json({
      ...result,
      alerts: alerts.length > 0 ? alerts : undefined
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid question format' }, { status: 400 })
    }

    console.error('AI Query error:', error)
    return NextResponse.json(
      { error: 'Failed to process query. Make sure OPENAI_API_KEY is configured.' },
      { status: 500 }
    )
  }
}