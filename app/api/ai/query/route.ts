import { NextRequest, NextResponse } from 'next/server'
import { queryDatabase } from '@/lib/langchain'
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
    const body = await request.json()
    const { question, history } = QuerySchema.parse(body)

    const result = await queryDatabase(question, history)

    return NextResponse.json(result)
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