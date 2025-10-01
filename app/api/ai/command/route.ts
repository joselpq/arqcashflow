/**
 * AI Command Agent API Route
 *
 * Natural language CRUD operations endpoint using Claude
 * Enables conversational interface for creating, updating, and deleting financial entities
 *
 * Features:
 * - Intent classification (create/update/delete detection)
 * - Smart inference from natural language
 * - Ambiguity resolution with clarification questions
 * - Confirmation workflow (preview → approve → execute)
 * - Conversation context retention
 * - Tool integration (Query Agent, Setup Assistant)
 * - Portuguese semantic understanding
 *
 * Examples:
 * - "R$50 em gasolina ontem" → Creates expense
 * - "R$400 de RT do projeto Mari para receber amanhã" → Creates receivable
 * - "Atualiza o contrato da ACME para R$150k" → Updates contract
 */

import { NextRequest, NextResponse } from 'next/server'
import { AISchemas } from '@/lib/validation/api'
import { CommandAgentService, ConversationState } from '@/lib/services/CommandAgentService'
import { withTeamContext } from '@/lib/middleware/team-context'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    try {
      // Validate request body
      const body = await request.json()
      const { command, conversationState, isConfirmation } = AISchemas.command.parse(body)

      // Create service instance with team context
      const commandService = new CommandAgentService({ ...context, request })

      // Handle confirmation vs new command
      let result

      if (isConfirmation && conversationState?.pendingOperation) {
        // User is confirming a pending operation
        const confirmed = parseConfirmation(command)
        result = await commandService.confirmOperation(
          conversationState as ConversationState,
          confirmed
        )
      } else {
        // New command to process
        result = await commandService.processCommand(
          command,
          conversationState as ConversationState | undefined
        )
      }

      // Return result with appropriate status code
      return NextResponse.json(result, {
        status: result.success ? 200 : 400
      })

    } catch (error) {
      // Validation errors
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid command format',
            details: error.errors
          },
          { status: 400 }
        )
      }

      // Configuration errors
      if (error instanceof Error && error.message.includes('CLAUDE_API_KEY')) {
        console.error('Configuration error:', error.message)
        return NextResponse.json(
          {
            success: false,
            error: 'AI service not configured. Please contact support.'
          },
          { status: 503 }
        )
      }

      // General errors
      console.error('AI Command error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process command. Please try rephrasing.',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}

/**
 * Parse user's confirmation response
 * Handles various ways users can confirm or reject
 */
function parseConfirmation(response: string): boolean {
  const normalized = response.toLowerCase().trim()

  // Positive confirmations
  const confirmations = [
    'sim',
    'yes',
    's',
    'y',
    'ok',
    'confirma',
    'confirmar',
    'pode',
    'vai',
    'faz',
    'fazer',
    'certo',
    'correto',
    'isso',
    'exato',
    'perfeito'
  ]

  // Negative rejections
  const rejections = [
    'não',
    'no',
    'n',
    'cancela',
    'cancelar',
    'nao',
    'nope',
    'nunca',
    'jamais',
    'para',
    'parar',
    'stop'
  ]

  // Check for explicit confirmations
  if (confirmations.some(word => normalized === word || normalized.startsWith(word + ' '))) {
    return true
  }

  // Check for explicit rejections
  if (rejections.some(word => normalized === word || normalized.startsWith(word + ' '))) {
    return false
  }

  // Default to false for ambiguous responses (safety first)
  return false
}
