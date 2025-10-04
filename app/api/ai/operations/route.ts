/**
 * AI Operations Agent API Route - Simplified
 *
 * Claude handles the entire flow through conversation context.
 */

import { NextRequest, NextResponse } from 'next/server'
import { OperationsAgentService } from '@/lib/services/OperationsAgentService'
import { withTeamContext } from '@/lib/middleware/team-context'
import { z } from 'zod'
import type { CoreMessage } from 'ai'

const RequestSchema = z.object({
  message: z.string().min(1),
  conversationHistory: z.array(z.any()).optional().default([]) // CoreMessage[] type
})

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    try {
      const body = await request.json()
      const { message, conversationHistory } = RequestSchema.parse(body)

      const operationsService = new OperationsAgentService(context)
      const result = await operationsService.processCommand(message, conversationHistory)

      return result

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid request', details: error.errors },
          { status: 400 }
        )
      }

      console.error('[Operations API] Error:', error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          conversationHistory: []
        },
        { status: 500 }
      )
    }
  })
}
