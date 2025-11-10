/**
 * Setup Assistant V2 API Endpoint
 *
 * Supports multiple file formats:
 * - XLSX/XLS: Excel spreadsheets (existing two-phase parallel extraction)
 * - CSV: Comma-separated values
 * - PDF: Native Claude Vision API processing (up to 100 pages, 32MB)
 * - Images: PNG, JPG, GIF, WebP (Claude Vision API)
 *
 * Improvements:
 * - Uses withTeamContext middleware for standardized auth
 * - Service layer integration for audit logging
 * - Better error handling and validation
 * - Consistent with platform architecture patterns
 * - Unified Vision API for PDF and image processing
 *
 * Expected Results (must match baseline):
 * - CSV: 4 contracts, 4 receivables, 7 expenses
 * - Excel: 37 contracts
 * - PDF/Images: Varies based on content (90-95% extraction accuracy)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { SetupAssistantService } from '@/lib/services/SetupAssistantService'
import { SetupAssistantServiceV2 } from '@/lib/services/SetupAssistantServiceV2'

export async function POST(request: NextRequest) {
  // Use team context middleware for auth and team isolation
  return withTeamContext(async (context) => {
    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // ARCHITECTURE VERSION CHECK
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const useV2 = process.env.SETUP_ASSISTANT_USE_V2 === 'true'
      const useDeterministic = process.env.SETUP_ASSISTANT_USE_DETERMINISTIC !== 'false'

      console.log('\n' + '═'.repeat(80))
      console.log('🚀 SETUP ASSISTANT API - VERSION CHECK')
      console.log('═'.repeat(80))
      console.log(`📦 Architecture: ${useV2 ? '✅ V2 (NEW!)' : '⚠️  V1 (OLD)'}`)
      if (useV2) {
        console.log(`⚡ Extraction Mode: ${useDeterministic ? '✅ DETERMINISTIC (70% faster!)' : '⚠️  AI Chunking only (25% faster)'}`)
      }
      console.log('═'.repeat(80) + '\n')
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      const contentType = request.headers.get('content-type') || ''

      if (!contentType.includes('multipart/form-data')) {
        return { error: 'Invalid request format. Expected multipart/form-data' }
      }

      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        return { error: 'No file provided' }
      }

      console.log('📁 Processing file:', file.name, 'Type:', file.type)

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer()
      const fileBuffer = Buffer.from(arrayBuffer)

      // Create service instance with team context
      const setupAssistantService = useV2
        ? new SetupAssistantServiceV2({
            ...context,
            request // Include request for audit context
          })
        : new SetupAssistantService({
            ...context,
            request // Include request for audit context
          })

      // Process file using service layer
      const result = await setupAssistantService.processFile(fileBuffer, file.name)

      console.log(`✅ [${useV2 ? 'V3' : 'V1'}] File processed successfully`)
      console.log(`📊 Created: ${result.contractsCreated} contracts, ${result.receivablesCreated} receivables, ${result.expensesCreated} expenses`)

      return {
        success: result.success,
        summary: {
          contractsCreated: result.contractsCreated,
          receivablesCreated: result.receivablesCreated,
          expensesCreated: result.expensesCreated,
          errors: result.errors
        }
      }

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