/**
 * OnboardingIntelligenceAgent - The Data Migration Specialist
 *
 * Transforms spreadsheets and documents into structured financial data during user onboarding.
 * Provides the "wow factor" by converting messy data into a perfect financial system in minutes.
 *
 * Architecture:
 * - Extends BaseService for consistent team-scoped operations
 * - Uses existing ContractService, ExpenseService, ReceivableService
 * - Leverages existing validation schemas and audit logging
 * - Integrates with Claude AI for multimodal document processing
 *
 * Capabilities:
 * - Multimodal intake (Excel, CSV, PDF, images)
 * - Financial pattern recognition (contracts, expenses, receivables)
 * - Data extraction and validation
 * - Interactive clarification for ambiguous data
 * - Bulk API registration via existing services
 */

import { BaseService, ServiceContext, ServiceError } from '../services/BaseService'
import { ContractService } from '../services/ContractService'
import { ExpenseService } from '../services/ExpenseService'
import { ReceivableService } from '../services/ReceivableService'
import { BaseFieldSchemas, EnumSchemas } from '../validation'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

// Initialize Claude AI client
const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
})

// Agent-specific validation schemas using existing patterns
export const OnboardingAgentSchemas = {
  documentRequest: z.object({
    files: z.array(z.object({
      name: BaseFieldSchemas.shortName,
      type: z.string().min(1),
      base64: z.string().min(1),
      size: z.number().optional()
    })),
    extractionType: z.enum(['auto', 'contracts', 'expenses', 'receivables']).optional().default('auto'),
    userGuidance: BaseFieldSchemas.notes.optional()
  }),

  extractedEntity: z.object({
    type: z.enum(['contract', 'expense', 'receivable']),
    confidence: z.number().min(0).max(1),
    data: z.any(), // Will be validated by specific service schemas
    source: z.object({
      fileName: z.string(),
      extractionMethod: z.enum(['claude-vision', 'claude-document', 'filename-pattern'])
    })
  }),

  processingResult: z.object({
    totalFiles: z.number(),
    processedFiles: z.number(),
    extractedEntities: z.number(),
    createdEntities: z.number(),
    errors: z.array(z.string()),
    summary: z.object({
      contracts: z.number().default(0),
      expenses: z.number().default(0),
      receivables: z.number().default(0)
    })
  })
}

export type DocumentRequest = z.infer<typeof OnboardingAgentSchemas.documentRequest>
export type ExtractedEntity = z.infer<typeof OnboardingAgentSchemas.extractedEntity>
export type ProcessingResult = z.infer<typeof OnboardingAgentSchemas.processingResult>

export interface OnboardingFilters {
  // Placeholder for future filtering capabilities
}

export class OnboardingIntelligenceAgent extends BaseService<any, any, any, OnboardingFilters> {
  private contractService: ContractService
  private expenseService: ExpenseService
  private receivableService: ReceivableService

  constructor(context: ServiceContext) {
    super(context, 'onboardingAgent', ['createdAt'])

    // Initialize dependent services
    this.contractService = new ContractService(context)
    this.expenseService = new ExpenseService(context)
    this.receivableService = new ReceivableService(context)
  }

  /**
   * Main entry point: Process uploaded documents and create financial entities
   */
  async processDocuments(request: DocumentRequest): Promise<ProcessingResult> {
    // Validate request using existing schema patterns
    const validatedRequest = OnboardingAgentSchemas.documentRequest.parse(request)

    const result: ProcessingResult = {
      totalFiles: validatedRequest.files.length,
      processedFiles: 0,
      extractedEntities: 0,
      createdEntities: 0,
      errors: [],
      summary: { contracts: 0, expenses: 0, receivables: 0 }
    }

    if (validatedRequest.files.length === 0) {
      throw new ServiceError('No files provided for processing', 'NO_FILES', 400)
    }

    console.log(`🤖 OnboardingAgent: Processing ${validatedRequest.files.length} files for team ${this.context.teamId}`)

    // Step 1: Extract entities from all files
    const extractedEntities: ExtractedEntity[] = []
    for (const file of validatedRequest.files) {
      try {
        const entities = await this.extractEntitiesFromFile(file)
        extractedEntities.push(...entities)
        result.processedFiles++
      } catch (error) {
        console.error(`❌ Error processing file ${file.name}:`, error)
        result.errors.push(`File ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    result.extractedEntities = extractedEntities.length
    console.log(`📊 Extracted ${extractedEntities.length} entities from ${result.processedFiles} files`)

    // Step 2: Group entities by type for bulk operations
    const contractData = extractedEntities.filter(e => e.type === 'contract').map(e => e.data)
    const expenseData = extractedEntities.filter(e => e.type === 'expense').map(e => e.data)
    const receivableData = extractedEntities.filter(e => e.type === 'receivable').map(e => e.data)

    // Step 3: Bulk create using existing services (with audit logging)
    try {
      // Create contracts first (receivables may depend on them)
      if (contractData.length > 0) {
        console.log(`🔍 Attempting to create ${contractData.length} contracts:`)
        contractData.forEach((contract, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(contract, null, 2)}`)
        })

        const contractResults = await this.contractService.bulkCreate(contractData, { continueOnError: true })
        result.summary.contracts = contractResults.successCount
        result.createdEntities += contractResults.successCount
        if (contractResults.errors.length > 0) {
          console.log('❌ Contract creation errors:')
          contractResults.errors.forEach(error => console.log(`   - ${error}`))
          result.errors.push(...contractResults.errors)
        }
      }

      // Create expenses
      if (expenseData.length > 0) {
        const expenseResults = await this.expenseService.bulkCreate(expenseData, { continueOnError: true })
        result.summary.expenses = expenseResults.successCount
        result.createdEntities += expenseResults.successCount
        if (expenseResults.errors.length > 0) {
          result.errors.push(...expenseResults.errors)
        }
      }

      // Create receivables
      if (receivableData.length > 0) {
        console.log(`🔍 Attempting to create ${receivableData.length} receivables:`)
        receivableData.forEach((receivable, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(receivable, null, 2)}`)
        })

        const receivableResults = await this.receivableService.bulkCreate(receivableData, { continueOnError: true })
        result.summary.receivables = receivableResults.successCount
        result.createdEntities += receivableResults.successCount
        if (receivableResults.errors.length > 0) {
          console.log('❌ Receivable creation errors:')
          receivableResults.errors.forEach(error => console.log(`   - ${error}`))
          result.errors.push(...receivableResults.errors)
        }
      }

    } catch (error) {
      console.error('❌ Error during bulk entity creation:', error)
      result.errors.push(`Bulk creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Log successful onboarding completion
    await this.logAudit(async () => {
      const auditContext = this.createAuditContext('onboarding_completion', 'agent')
      auditContext.metadata = {
        totalFiles: result.totalFiles,
        createdEntities: result.createdEntities,
        summary: result.summary,
        processingTime: Date.now()
      }
    })

    console.log(`✅ OnboardingAgent: Created ${result.createdEntities} entities (${result.summary.contracts} contracts, ${result.summary.expenses} expenses, ${result.summary.receivables} receivables)`)

    return result
  }

  /**
   * Extract financial entities from a single file using Claude AI
   */
  private async extractEntitiesFromFile(file: { name: string; type: string; base64: string }): Promise<ExtractedEntity[]> {
    console.log(`🔍 Processing file: ${file.name} (${file.type})`)

    // Determine processing method based on file type
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      return await this.extractWithClaudeVision(file)
    } else if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.type.includes('csv')) {
      return await this.extractWithClaudeDocument(file)
    } else {
      // Fallback to filename pattern extraction
      return await this.extractFromFilename(file)
    }
  }

  /**
   * Extract entities using Claude's vision capabilities (images, PDFs)
   */
  private async extractWithClaudeVision(file: { name: string; type: string; base64: string }): Promise<ExtractedEntity[]> {
    try {
      const content: any[] = [
        {
          type: 'text',
          text: `Analyze this financial document and extract all contracts, expenses, and receivables. Return a JSON array of entities with this structure:

[
  {
    "type": "contract|expense|receivable",
    "confidence": 0.0-1.0,
    "data": {
      // For contracts:
      "clientName": "string",
      "projectName": "string",
      "totalValue": number,
      "signedDate": "YYYY-MM-DD",
      "description": "string",
      "category": "Residencial|Comercial|Restaurante|Loja",

      // For expenses:
      "description": "string",
      "amount": number,
      "dueDate": "YYYY-MM-DD",
      "category": "materiais|mão-de-obra|equipamentos|transporte|escritório|software|outros",
      "vendor": "string",

      // For receivables:
      "expectedDate": "YYYY-MM-DD",
      "amount": number,
      "description": "string",
      "clientName": "string",
      "category": "project work|consultation|commission"
    }
  }
]

Be thorough and extract ALL financial information. Use confidence scores to indicate certainty.`
        }
      ]

      // Add the file content
      if (file.type.startsWith('image/')) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.type,
            data: file.base64
          }
        })
      } else if (file.type === 'application/pdf') {
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: file.base64
          }
        })
      }

      const response = await claude.messages.create({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content
        }]
      })

      const responseText = response.content[0]?.type === 'text' ? response.content[0].text : ''
      const entities = this.parseExtractedEntities(responseText, file.name, 'claude-vision')

      console.log(`📄 Extracted ${entities.length} entities from ${file.name} using Claude Vision`)
      return entities

    } catch (error) {
      console.error(`❌ Claude Vision extraction failed for ${file.name}:`, error)
      return []
    }
  }

  /**
   * Extract entities using Claude's document processing (spreadsheets, CSVs)
   */
  private async extractWithClaudeDocument(file: { name: string; type: string; base64: string }): Promise<ExtractedEntity[]> {
    try {
      // Decode base64 to text for CSV files
      let fileContent = ''
      if (file.type === 'text/csv') {
        fileContent = Buffer.from(file.base64, 'base64').toString('utf-8')
      } else {
        // For Excel files, we still need to use vision API or a specialized parser
        return await this.extractWithClaudeVision(file)
      }

      const response = await claude.messages.create({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Analyze this CSV financial data and extract all contracts, expenses, and receivables. Return a JSON array of entities with this structure:

[
  {
    "type": "contract|expense|receivable",
    "confidence": 0.0-1.0,
    "data": {
      // For contracts:
      "clientName": "string",
      "projectName": "string",
      "totalValue": number,
      "signedDate": "YYYY-MM-DD",
      "description": "string",
      "category": "Residencial|Comercial|Restaurante|Loja",

      // For expenses:
      "description": "string",
      "amount": number,
      "dueDate": "YYYY-MM-DD",
      "category": "materiais|mão-de-obra|equipamentos|transporte|escritório|software|outros",
      "vendor": "string",

      // For receivables:
      "expectedDate": "YYYY-MM-DD",
      "amount": number,
      "description": "string",
      "clientName": "string",
      "category": "project work|consultation|commission"
    }
  }
]

CSV Content:
${fileContent}

Be thorough and extract ALL financial information. Use confidence scores to indicate certainty. The CSV uses Brazilian Portuguese terms.`
        }]
      })

      const responseText = response.content[0]?.type === 'text' ? response.content[0].text : ''
      const entities = this.parseExtractedEntities(responseText, file.name, 'claude-document')

      console.log(`📄 Extracted ${entities.length} entities from ${file.name} using Claude Document Processing`)
      return entities

    } catch (error) {
      console.error(`❌ Claude Document extraction failed for ${file.name}:`, error)
      return []
    }
  }

  /**
   * Fallback: Extract basic info from filename patterns
   */
  private async extractFromFilename(file: { name: string; type: string; base64: string }): Promise<ExtractedEntity[]> {
    console.log(`📝 Using filename pattern extraction for: ${file.name}`)

    const fileName = file.name.toLowerCase()
    const entities: ExtractedEntity[] = []

    // Basic pattern recognition
    if (fileName.includes('contrato') || fileName.includes('proposta') || fileName.includes('contract')) {
      entities.push({
        type: 'contract',
        confidence: 0.3,
        data: {
          clientName: 'Cliente do arquivo',
          projectName: `Projeto - ${file.name}`,
          totalValue: null,
          signedDate: new Date().toISOString().split('T')[0],
          description: `Contrato importado de arquivo: ${file.name}`,
          category: 'Residencial'
        },
        source: {
          fileName: file.name,
          extractionMethod: 'filename-pattern'
        }
      })
    } else if (fileName.includes('despesa') || fileName.includes('gasto') || fileName.includes('expense')) {
      entities.push({
        type: 'expense',
        confidence: 0.3,
        data: {
          description: `Despesa - ${file.name}`,
          amount: null,
          dueDate: new Date().toISOString().split('T')[0],
          category: 'outros',
          vendor: null
        },
        source: {
          fileName: file.name,
          extractionMethod: 'filename-pattern'
        }
      })
    }

    return entities
  }

  /**
   * Parse Claude's JSON response into typed entities
   */
  private parseExtractedEntities(responseText: string, fileName: string, method: 'claude-vision' | 'claude-document' | 'filename-pattern'): ExtractedEntity[] {
    try {
      // Extract JSON from the response text - look for array pattern
      let jsonText = responseText

      // Remove markdown code blocks
      jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '').trim()

      // Try to find JSON array in the response
      const arrayStartIndex = jsonText.indexOf('[')
      const arrayEndIndex = jsonText.lastIndexOf(']')

      if (arrayStartIndex !== -1 && arrayEndIndex !== -1 && arrayEndIndex > arrayStartIndex) {
        jsonText = jsonText.substring(arrayStartIndex, arrayEndIndex + 1)
      }

      const parsedData = JSON.parse(jsonText)

      if (!Array.isArray(parsedData)) {
        console.warn(`Expected array from Claude, got: ${typeof parsedData}`)
        return []
      }

      return parsedData.map((item: any) => ({
        type: item.type,
        confidence: item.confidence || 0.8,
        data: item.data,
        source: {
          fileName,
          extractionMethod: method
        }
      }))

    } catch (error) {
      console.error(`❌ Failed to parse entities from ${fileName}:`, error)
      console.error('Response text:', responseText)
      return []
    }
  }

  /**
   * Required abstract method implementation
   */
  async validateBusinessRules(data: any): Promise<void> {
    // Business rules will be validated by individual services
    // This agent focuses on extraction and bulk operations
    return Promise.resolve()
  }
}