/**
 * Setup Assistant V2 API Endpoint
 *
 * Phase 1 Implementation: Service layer integration
 * Uses SetupAssistantService instead of direct Prisma calls
 * Provides automatic audit logging and better error handling
 * Maintains 100% backward compatibility with existing endpoint
 *
 * Improvements:
 * - Uses withTeamContext middleware for standardized auth
 * - Service layer integration for audit logging
 * - Better error handling and validation
 * - Consistent with platform architecture patterns
 *
 * Expected Results (must match baseline):
 * - CSV: 4 contracts, 4 receivables, 7 expenses
 * - Excel: 37 contracts
 * - PDF: 1 contract
 */

import { NextRequest, NextResponse } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { SetupAssistantService } from '@/lib/services/SetupAssistantService'

export async function POST(request: NextRequest) {
  // Use team context middleware for auth and team isolation
  return withTeamContext(async (context) => {
    try {
      const contentType = request.headers.get('content-type') || ''

      if (!contentType.includes('multipart/form-data')) {
        return { error: 'Invalid request format. Expected multipart/form-data' }
      }

      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        return { error: 'No file provided' }
      }

      console.log('📁 [V2] Processing file with service layer:', file.name, 'Type:', file.type)

      // Create service instance with team context
      const setupAssistantService = new SetupAssistantService({
        ...context,
        request // Include request for audit context
      })

      // Process file using service layer
      const result = await setupAssistantService.processFile(file)

      console.log('✅ [V2] File processed successfully')
      console.log(`📊 [V2] Created: ${result.summary.contractsCreated} contracts, ${result.summary.receivablesCreated} receivables, ${result.summary.expensesCreated} expenses`)

      return result

    } catch (error) {
      console.error('[V2] Setup Assistant error:', error)

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Unsupported file type')) {
          return {
            error: error.message,
            supportedTypes: ['CSV', 'Excel', 'PDF', 'Images']
          }
        }

        if (error.message.includes('Claude')) {
          return {
            error: 'Erro ao processar arquivo com Claude',
            details: error.message
          }
        }

        // Generic error with details
        return {
          error: 'Internal server error',
          details: error.message
        }
      }

      // Unknown error type
      return {
        error: 'Internal server error',
        details: 'Unknown error occurred'
      }
    }
  })
}