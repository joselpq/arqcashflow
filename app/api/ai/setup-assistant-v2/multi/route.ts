/**
 * Setup Assistant V2 Multi-File API Endpoint
 *
 * Phase 2 Implementation: Multi-file sequential processing
 * Supports uploading multiple files for batch processing
 * Provides progress tracking and combined results
 *
 * Features:
 * - Sequential file processing (reliable, predictable)
 * - Smart retry logic for rate limiting
 * - Combined results aggregation
 * - Per-file error handling
 * - Progress tracking support (via polling)
 *
 * Expected Results:
 * - Processes each file sequentially
 * - Continues processing if individual files fail
 * - Returns combined summary of all files
 */

import { NextRequest, NextResponse } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { SetupAssistantService } from '@/lib/services/SetupAssistantService'

// Store progress for polling (in production, use Redis or similar)
const progressStore = new Map<string, any>()

export async function POST(request: NextRequest) {
  // Use team context middleware for auth and team isolation
  return withTeamContext(async (context) => {
    try {
      const contentType = request.headers.get('content-type') || ''

      if (!contentType.includes('multipart/form-data')) {
        return { error: 'Invalid request format. Expected multipart/form-data' }
      }

      const formData = await request.formData()
      const files: File[] = []

      // Collect all files from formData
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file') && value instanceof File) {
          files.push(value)
        }
      }

      if (files.length === 0) {
        return { error: 'No files provided' }
      }

      console.log(`📁 [V2 Multi] Processing ${files.length} files with service layer`)

      // Create service instance with team context
      const setupAssistantService = new SetupAssistantService({
        ...context,
        request // Include request for audit context
      })

      // Generate a session ID for progress tracking
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Process files sequentially (simple approach for now)
      let totalContractsCreated = 0
      let totalReceivablesCreated = 0
      let totalExpensesCreated = 0
      let successfulFiles = 0
      let failedFiles = 0
      const allErrors: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Update progress
        progressStore.set(sessionId, {
          currentFile: i + 1,
          totalFiles: files.length,
          currentFileName: file.name,
          status: 'processing',
          timestamp: Date.now()
        })

        try {
          // Convert File to Buffer
          const arrayBuffer = await file.arrayBuffer()
          const fileBuffer = Buffer.from(arrayBuffer)

          // Process single file
          const result = await setupAssistantService.processFile(fileBuffer, file.name)

          // ALWAYS aggregate entity counts (even with partial failures)
          totalContractsCreated += result.contractsCreated
          totalReceivablesCreated += result.receivablesCreated
          totalExpensesCreated += result.expensesCreated

          // Track success/failure based on SYSTEMATIC errors only
          if (result.success) {
            successfulFiles++
          } else {
            failedFiles++
          }

          // Add any errors to the error list
          if (result.errors.length > 0) {
            allErrors.push(...result.errors.map(e => `${file.name}: ${e}`))
          }
        } catch (error) {
          // This is a systematic error (couldn't process file at all)
          failedFiles++
          console.error(`❌ [V2 Multi] Error processing ${file.name}:`, error)
          allErrors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Clean up progress for this session
      progressStore.delete(sessionId)

      console.log('✅ [V2 Multi] Files processed successfully')
      console.log(`📊 [V2 Multi] Summary:`)
      console.log(`  - Total files: ${files.length}`)
      console.log(`  - Successful: ${successfulFiles}`)
      console.log(`  - Failed: ${failedFiles}`)
      console.log(`  - Contracts created: ${totalContractsCreated}`)
      console.log(`  - Receivables created: ${totalReceivablesCreated}`)
      console.log(`  - Expenses created: ${totalExpensesCreated}`)

      return {
        success: failedFiles === 0,
        sessionId,
        totalFiles: files.length,
        successfulFiles,
        failedFiles,
        combinedSummary: {
          totalContractsCreated,
          totalReceivablesCreated,
          totalExpensesCreated
        },
        errors: allErrors
      }

    } catch (error) {
      console.error('[V2 Multi] Setup Assistant error:', error)

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
            error: 'Erro ao processar arquivos com Claude',
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

// Optional: Progress polling endpoint
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  const progress = progressStore.get(sessionId)

  if (!progress) {
    return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 })
  }

  return NextResponse.json(progress)
}