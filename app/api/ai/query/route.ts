/**
 * Financial Query API Route
 *
 * AI-powered financial query endpoint using Claude Sonnet
 * Provides intelligent natural language access to financial data
 *
 * Features:
 * - Semantic understanding (projeto→contract, concluído→completed)
 * - Conversation context management
 * - Service layer integration (no raw SQL)
 * - Team isolation enforced
 * - Portuguese and English support
 */

import { NextRequest, NextResponse } from 'next/server'
import { AISchemas } from '@/lib/validation/api'
import { FinancialQueryService } from '@/lib/services/FinancialQueryService'
import { withTeamContext } from '@/lib/middleware/team-context'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    try {
      // Validate request body
      const body = await request.json()
      const { question, history } = AISchemas.query.parse(body)

      // Create service instance with team context (pass request for audit logging)
      const queryService = new FinancialQueryService({ ...context, request })

      // Process query with conversation history
      const result = await queryService.query(question, history)

      return result
    } catch (error) {
      // Validation errors
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid question format', details: error.errors },
          { status: 400 }
        )
      }

      // Configuration errors
      if (error instanceof Error && error.message.includes('CLAUDE_API_KEY')) {
        console.error('Configuration error:', error.message)
        return NextResponse.json(
          { error: 'AI service not configured. Please contact support.' },
          { status: 503 }
        )
      }

      // General errors
      console.error('AI Query error:', error)
      return NextResponse.json(
        {
          error: 'Failed to process query. Please try rephrasing your question.',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}