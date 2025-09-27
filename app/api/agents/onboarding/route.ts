/**
 * Onboarding Intelligence Agent API Endpoint
 *
 * Provides API access to the OnboardingIntelligenceAgent for processing
 * financial documents during user onboarding.
 *
 * Architecture:
 * - Uses withTeamContext middleware for team isolation and security
 * - Validates requests using existing validation schemas
 * - Handles both JSON and multipart/form-data for file uploads
 * - Integrates with existing audit logging system
 * - Provides comprehensive error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { OnboardingIntelligenceAgent, OnboardingAgentSchemas } from '@/lib/agents/OnboardingIntelligenceAgent'
import { ValidationError } from '@/lib/validation'
import { z } from 'zod'

// API-specific validation schema
const OnboardingAPIRequestSchema = z.object({
  files: z.array(z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    base64: z.string().min(1),
    size: z.number().optional()
  })).min(1, 'At least one file is required'),
  extractionType: z.enum(['auto', 'contracts', 'expenses', 'receivables']).optional().default('auto'),
  userGuidance: z.string().optional()
})

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    try {
      console.log(`🤖 OnboardingAgent API: Processing request for team ${context.teamId}`)

      // Check if Claude API is configured
      if (!process.env.CLAUDE_API_KEY) {
        return NextResponse.json(
          { error: 'Claude AI service not configured' },
          { status: 500 }
        )
      }

      // Parse request data (handle both JSON and multipart)
      let requestData: any = {}
      const contentType = request.headers.get('content-type') || ''

      if (contentType.includes('multipart/form-data')) {
        // Handle large file uploads via multipart
        const formData = await request.formData()

        requestData = {
          files: [],
          extractionType: formData.get('extractionType') || 'auto',
          userGuidance: formData.get('userGuidance') || undefined
        }

        // Process uploaded files
        const uploadedFiles = formData.getAll('files')
        for (const file of uploadedFiles) {
          if (file instanceof File) {
            console.log(`📄 Processing uploaded file: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)

            // Convert to base64
            const arrayBuffer = await file.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')

            requestData.files.push({
              name: file.name,
              type: file.type,
              base64,
              size: file.size
            })
          }
        }
      } else {
        // Handle JSON requests
        requestData = await request.json()
      }

      // Validate request data
      const validatedRequest = OnboardingAPIRequestSchema.parse(requestData)

      // Initialize and execute the agent
      const onboardingAgent = new OnboardingIntelligenceAgent(context)
      const result = await onboardingAgent.processDocuments({
        files: validatedRequest.files,
        extractionType: validatedRequest.extractionType,
        userGuidance: validatedRequest.userGuidance
      })

      console.log(`✅ OnboardingAgent API: Successfully processed ${result.totalFiles} files, created ${result.createdEntities} entities`)

      // Return structured response
      return NextResponse.json({
        success: true,
        agent: 'OnboardingIntelligenceAgent',
        result,
        message: `Successfully processed ${result.totalFiles} files and created ${result.createdEntities} financial entities`,
        summary: {
          files: {
            total: result.totalFiles,
            processed: result.processedFiles,
            errors: result.totalFiles - result.processedFiles
          },
          entities: {
            extracted: result.extractedEntities,
            created: result.createdEntities,
            breakdown: result.summary
          }
        }
      })

    } catch (error) {
      console.error('❌ OnboardingAgent API error:', error)

      // Handle validation errors
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid request format',
            details: ValidationError.formatZodError(error)
          },
          { status: 400 }
        )
      }

      // Handle business logic errors
      if (error instanceof Error && error.message.includes('SERVICE_ERROR')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Service error',
            message: error.message
          },
          { status: 400 }
        )
      }

      // Handle Claude API errors
      if (error instanceof Error && (error.message.includes('rate_limit') || error.message.includes('quota'))) {
        return NextResponse.json(
          {
            success: false,
            error: 'AI service temporarily unavailable',
            message: 'Please try again in a moment'
          },
          { status: 429 }
        )
      }

      // Generic error handler
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: 'Failed to process documents. Please try again.'
        },
        { status: 500 }
      )
    }
  })
}

/**
 * GET endpoint for agent information and capabilities
 */
export async function GET(request: NextRequest) {
  return withTeamContext(async (context) => {
    return NextResponse.json({
      agent: 'OnboardingIntelligenceAgent',
      version: '1.0.0',
      description: 'Transforms spreadsheets and documents into structured financial data',
      capabilities: [
        'Multimodal document processing (Excel, CSV, PDF, images)',
        'Financial pattern recognition',
        'Bulk entity creation with audit logging',
        'Interactive clarification for ambiguous data',
        'Team-scoped data isolation'
      ],
      supportedFileTypes: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
        'application/pdf', // .pdf
        'image/jpeg', // .jpg
        'image/png', // .png
        'image/webp' // .webp
      ],
      maxFileSize: '32MB',
      processingTarget: '<15 minutes for complete onboarding',
      teamId: context.teamId,
      status: 'active'
    })
  })
}