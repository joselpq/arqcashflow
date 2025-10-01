/**
 * Unified AI API Route
 *
 * Single entry point for all AI interactions
 * Routes to specialized agents (Setup, Query, Operations) with unified conversation context
 *
 * Part of Phase 2: Unified AI Router System (ADR-008)
 *
 * Usage:
 * POST /api/ai/unified
 * {
 *   message: string,
 *   files?: File[],
 *   conversationState?: UnifiedConversationState
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { AIAgentRouterService } from '@/lib/services/AIAgentRouterService'
import {
  UnifiedConversationState,
  createInitialConversationState,
  addMessageToState
} from '@/lib/types/unified-conversation'
import { z } from 'zod'

/**
 * Request schema validation
 */
const UnifiedAIRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  files: z.array(z.object({
    name: z.string(),
    type: z.string(),
    base64: z.string()
  })).optional().default([]),
  conversationState: z.object({
    messages: z.array(z.any()),
    recentlyCreated: z.array(z.any()).optional().default([]),
    pendingOperation: z.any().optional(),
    lastAgent: z.enum(['setup', 'query', 'operations']).optional(),
    metadata: z.object({
      startedAt: z.string(),
      lastUpdatedAt: z.string(),
      messageCount: z.number(),
      entitiesCreated: z.number()
    }).optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    try {
      // Parse and validate request body
      const body = await request.json()
      const { message, files, conversationState } = UnifiedAIRequestSchema.parse(body)

      console.log(`[Unified AI] Message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`)
      console.log(`[Unified AI] Files: ${files.length}`)

      // Initialize conversation state if new conversation
      let state: UnifiedConversationState = conversationState || createInitialConversationState()

      // Convert date strings to Date objects if state was serialized
      if (state.metadata.startedAt && typeof state.metadata.startedAt === 'string') {
        state.metadata.startedAt = new Date(state.metadata.startedAt)
      }
      if (state.metadata.lastUpdatedAt && typeof state.metadata.lastUpdatedAt === 'string') {
        state.metadata.lastUpdatedAt = new Date(state.metadata.lastUpdatedAt)
      }
      state.messages = state.messages.map(m => ({
        ...m,
        timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp
      }))

      // Add user message to conversation state
      state = addMessageToState(
        state,
        'user',
        message,
        undefined,
        { filesAttached: files.length }
      )

      // Initialize router with team context
      const router = new AIAgentRouterService(context)

      // Process message through router
      const result = await router.processMessage(message, files, state)

      // Add assistant response to conversation state
      const updatedState = result.conversationState || state
      const finalState = addMessageToState(
        updatedState,
        'assistant',
        result.response,
        result.agentUsed,
        result.data?.metadata
      )

      // Return response
      return {
        success: true,
        response: result.response,
        agentUsed: result.agentUsed,
        data: result.data,
        conversationState: finalState
      }

    } catch (error) {
      // Validation errors
      if (error instanceof z.ZodError) {
        console.error('[Unified AI] Validation error:', error.errors)
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid request format',
            details: error.errors
          },
          { status: 400 }
        )
      }

      // Configuration errors
      if (error instanceof Error && error.message.includes('CLAUDE_API_KEY')) {
        console.error('[Unified AI] Configuration error:', error.message)
        return NextResponse.json(
          {
            success: false,
            error: 'AI service not configured. Please contact support.'
          },
          { status: 503 }
        )
      }

      // General errors
      console.error('[Unified AI] Error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process message. Please try again.',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}
