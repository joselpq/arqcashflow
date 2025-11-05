/**
 * AI Operations Agent API Route - With Streaming Support (ADR-020)
 *
 * Supports both streaming (default) and non-streaming modes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { OperationsAgentService } from '@/lib/services/OperationsAgentService'
import { withTeamContext } from '@/lib/middleware/team-context'
import { z } from 'zod'
import type { CoreMessage } from 'ai'

const RequestSchema = z.object({
  message: z.string().min(1),
  conversationHistory: z.array(z.any()).optional().default([]), // CoreMessage[] type
  stream: z.boolean().optional().default(true) // Enable streaming by default
})

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    try {
      const body = await request.json()
      const { message, conversationHistory, stream } = RequestSchema.parse(body)

      const operationsService = new OperationsAgentService(context)

      // ✅ STREAMING MODE (Phase 2 - ADR-020)
      if (stream) {
        console.log('[Operations API] Using STREAMING mode')
        const result = await operationsService.processCommandStream(message, conversationHistory)

        // Return streaming response with proper headers
        return result.toTextStreamResponse()
      }

      // ✅ NON-STREAMING MODE (Backward compatibility)
      console.log('[Operations API] Using NON-STREAMING mode (backward compatibility)')
      const result = await operationsService.processCommand(message, conversationHistory)
      return NextResponse.json(result)

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
