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

import { ServiceContext, ServiceError } from '../services/BaseService'
import { ContractService } from '../services/ContractService'
import { ExpenseService } from '../services/ExpenseService'
import { ReceivableService } from '../services/ReceivableService'
import { BaseFieldSchemas, EnumSchemas } from '../validation'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'

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
    }),
    clarificationRequests: z.array(z.object({
      fileName: z.string(),
      field: z.string(),
      question: z.string(),
      suggestions: z.array(z.string()).optional(),
      entityType: z.enum(['contract', 'expense', 'receivable'])
    })).optional().default([])
  }),

  clarificationRequest: z.object({
    fileName: z.string(),
    field: z.string(),
    question: z.string(),
    suggestions: z.array(z.string()).optional(),
    entityType: z.enum(['contract', 'expense', 'receivable'])
  })
}

export type DocumentRequest = z.infer<typeof OnboardingAgentSchemas.documentRequest>
export type ExtractedEntity = z.infer<typeof OnboardingAgentSchemas.extractedEntity>
export type ProcessingResult = z.infer<typeof OnboardingAgentSchemas.processingResult>
export type ClarificationRequest = z.infer<typeof OnboardingAgentSchemas.clarificationRequest>

export interface OnboardingFilters {
  // Placeholder for future filtering capabilities
}

export class OnboardingIntelligenceAgent {
  private context: ServiceContext
  private contractService: ContractService
  private expenseService: ExpenseService
  private receivableService: ReceivableService

  constructor(context: ServiceContext) {
    this.context = context

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
      summary: { contracts: 0, expenses: 0, receivables: 0 },
      clarificationRequests: []
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

    // Step 3: Validate entities and collect clarification requests
    const validatedEntities = { contracts: [], expenses: [], receivables: [] }

    for (const entity of extractedEntities) {
      const clarifications = this.validateEntityAndGetClarifications(entity)
      if (clarifications.length > 0) {
        result.clarificationRequests.push(...clarifications)
      } else {
        // Entity is valid, add to appropriate list
        if (entity.type === 'contract') validatedEntities.contracts.push(entity.data)
        else if (entity.type === 'expense') validatedEntities.expenses.push(entity.data)
        else if (entity.type === 'receivable') validatedEntities.receivables.push(entity.data)
      }
    }

    // Step 4: Bulk create using existing services (with audit logging)
    try {
      // Create contracts first (receivables may depend on them)
      if (validatedEntities.contracts.length > 0) {
        console.log(`🔍 Attempting to create ${validatedEntities.contracts.length} contracts:`)
        validatedEntities.contracts.forEach((contract, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(contract, null, 2)}`)
        })

        const contractResults = await this.contractService.bulkCreate(validatedEntities.contracts, { continueOnError: true })
        result.summary.contracts = contractResults.successCount
        result.createdEntities += contractResults.successCount
        if (contractResults.errors.length > 0) {
          console.log('❌ Contract creation errors:')
          contractResults.errors.forEach(error => console.log(`   - ${error}`))
          result.errors.push(...contractResults.errors)
        }
      }

      // Create expenses
      if (validatedEntities.expenses.length > 0) {
        const expenseResults = await this.expenseService.bulkCreate(validatedEntities.expenses, { continueOnError: true })
        result.summary.expenses = expenseResults.successCount
        result.createdEntities += expenseResults.successCount
        if (expenseResults.errors.length > 0) {
          result.errors.push(...expenseResults.errors)
        }
      }

      // Create receivables
      if (validatedEntities.receivables.length > 0) {
        console.log(`🔍 Attempting to create ${validatedEntities.receivables.length} receivables:`)
        validatedEntities.receivables.forEach((receivable, index) => {
          console.log(`   ${index + 1}. ${JSON.stringify(receivable, null, 2)}`)
        })

        const receivableResults = await this.receivableService.bulkCreate(validatedEntities.receivables, { continueOnError: true })
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

    // Log completion for debugging
    console.log(`📊 OnboardingAgent Summary: Processed ${result.totalFiles} files, extracted ${result.extractedEntities} entities, created ${result.createdEntities} entities`)

    if (result.clarificationRequests && result.clarificationRequests.length > 0) {
      console.log(`❓ Clarification requests: ${result.clarificationRequests.length} missing fields need user input`)
      result.clarificationRequests.forEach(req => {
        console.log(`   - ${req.fileName}: ${req.field} (${req.question})`)
      })
    }

    console.log(`✅ OnboardingAgent: Created ${result.createdEntities} entities (${result.summary.contracts} contracts, ${result.summary.expenses} expenses, ${result.summary.receivables} receivables)`)

    return result
  }

  /**
   * Get the improved extraction prompt with flexible rules
   */
  private getImprovedExtractionPrompt(): string {
    return `Analyze this financial document and extract all contracts, expenses, and receivables.

IMPORTANT: Return ONLY a valid JSON array with no additional text or explanations. The response must start with [ and end with ].

EXTRACTION RULES:
1. For contracts: If projectName is missing, use clientName. If clientName is missing, use projectName.
2. For receivables: If clientName is missing, use projectName or any available client/project identifier.
3. For expenses: Intelligently infer the category based on the expense description:
   - "materiais": construction materials, supplies, materials
   - "mão-de-obra": labor, workers, salaries, services
   - "equipamentos": equipment, tools, machinery
   - "transporte": fuel, transportation, delivery, combustível
   - "escritório": rent, utilities, office supplies, aluguel
   - "software": licenses, subscriptions, digital services
   - "outros": anything else

Use this exact JSON structure:
[
  {
    "type": "contract|expense|receivable",
    "confidence": 0.0-1.0,
    "data": {
      // Required fields only - leave optional fields out if not found

      // For contracts (required: clientName, projectName, totalValue, signedDate):
      "clientName": "string",
      "projectName": "string",
      "totalValue": number,
      "signedDate": "YYYY-MM-DD",
      "description": "string (optional)",
      "category": "Residencial|Comercial|Restaurante|Loja (optional)",

      // For expenses (required: description, amount, dueDate, category):
      "description": "string",
      "amount": number,
      "dueDate": "YYYY-MM-DD",
      "category": "materiais|mão-de-obra|equipamentos|transporte|escritório|software|outros",
      "vendor": "string (optional)",

      // For receivables (required: expectedDate, amount, clientName):
      "expectedDate": "YYYY-MM-DD",
      "amount": number,
      "clientName": "string (use project name if client not available)",
      "description": "string (optional)",
      "category": "string (optional)"
    }
  }
]

DATE CONVERSION: Convert any date format to YYYY-MM-DD (e.g., "15/03/2024" becomes "2024-03-15", "23/Oct/20" becomes "2020-10-23")
AMOUNT HANDLING: Extract numeric values, removing currency symbols (R$) and converting commas to periods if needed
CONFIDENCE: Use high confidence (0.8-1.0) when data is clear, lower (0.3-0.7) when inferring or guessing

Be thorough and extract ALL financial information found in the document.`
  }

  /**
   * Extract financial entities from a single file using Claude AI
   */
  private async extractEntitiesFromFile(file: { name: string; type: string; base64: string }): Promise<ExtractedEntity[]> {
    console.log(`🔍 Processing file: ${file.name} (${file.type})`)

    // Determine processing method based on file type
    if (file.type.startsWith('image/')) {
      return await this.extractWithClaudeVision(file)
    } else if (file.type === 'application/pdf') {
      return await this.extractWithClaudeDocument(file)
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
               file.type === 'application/vnd.ms-excel') { // .xls
      return await this.extractFromExcelFile(file)
    } else if (file.type === 'text/csv') {
      return await this.extractWithClaudeDocument(file)
    } else {
      // Fallback to filename pattern extraction
      return await this.extractFromFilename(file)
    }
  }

  /**
   * Extract entities using Claude's vision capabilities (images only)
   */
  private async extractWithClaudeVision(file: { name: string; type: string; base64: string }): Promise<ExtractedEntity[]> {
    try {
      const content: any[] = [
        {
          type: 'text',
          text: this.getImprovedExtractionPrompt()
        },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.type,
            data: file.base64
          }
        }
      ]

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
   * Extract entities using Claude's document processing (CSVs, PDFs)
   */
  private async extractWithClaudeDocument(file: { name: string; type: string; base64: string }): Promise<ExtractedEntity[]> {
    try {
      let content: any[] = [
        {
          type: 'text',
          text: this.getImprovedExtractionPrompt()
        }
      ]

      // Handle different file types
      if (file.type === 'text/csv') {
        // For CSV files, decode base64 to text and include in message
        const fileContent = Buffer.from(file.base64, 'base64').toString('utf-8')
        content[0].text += `\n\nCSV Content:\n${fileContent}\n\nThe data uses Brazilian Portuguese terms. Map Portuguese terms to the appropriate categories.`
      } else if (file.type === 'application/pdf') {
        // For PDF files, use Claude's native document processing
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
      const entities = this.parseExtractedEntities(responseText, file.name, 'claude-document')

      console.log(`📄 Extracted ${entities.length} entities from ${file.name} using Claude Document Processing`)
      return entities

    } catch (error) {
      console.error(`❌ Claude Document extraction failed for ${file.name}:`, error)
      return []
    }
  }

  /**
   * Extract entities from Excel files by converting to text first
   */
  private async extractFromExcelFile(file: { name: string; type: string; base64: string }): Promise<ExtractedEntity[]> {
    try {
      console.log(`📊 Processing Excel file: ${file.name}`)

      // Decode base64 to buffer
      const buffer = Buffer.from(file.base64, 'base64')

      // Parse Excel file using xlsx library
      const workbook = XLSX.read(buffer, { type: 'buffer' })

      // Convert all sheets to text
      let extractedText = `Excel File: ${file.name}\n\n`

      workbook.SheetNames.forEach((sheetName, index) => {
        const sheet = workbook.Sheets[sheetName]
        const csvText = XLSX.utils.sheet_to_csv(sheet)

        if (csvText.trim()) {
          extractedText += `Sheet ${index + 1}: ${sheetName}\n`
          extractedText += csvText + '\n\n'
        }
      })

      if (extractedText.length < 50) {
        console.warn(`⚠️ Excel file ${file.name} appears to be empty or unreadable`)
        return []
      }

      // Now send the extracted text to Claude for processing
      const response = await claude.messages.create({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: this.getImprovedExtractionPrompt() + `\n\nExcel Content:\n${extractedText}\n\nThe data uses Brazilian Portuguese terms. Map Portuguese terms to the appropriate categories.`
        }]
      })

      const responseText = response.content[0]?.type === 'text' ? response.content[0].text : ''
      const entities = this.parseExtractedEntities(responseText, file.name, 'claude-document')

      console.log(`📊 Extracted ${entities.length} entities from Excel file ${file.name}`)
      return entities

    } catch (error) {
      console.error(`❌ Excel processing failed for ${file.name}:`, error)
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
      console.log(`🔍 Parsing response from ${fileName} (length: ${responseText.length})`)

      // Extract JSON from the response text - look for array pattern
      let jsonText = responseText.trim()

      // Remove markdown code blocks (more comprehensive patterns)
      jsonText = jsonText.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim()

      // Remove common prefixes that Claude might add
      jsonText = jsonText.replace(/^(?:Here's the extracted data:|Here are the extracted entities:|Based on the document, here are the financial entities:|The extracted financial information is:)\s*/i, '').trim()

      // Try multiple patterns to find JSON array
      let extractedJson = ''

      // Pattern 1: Look for array with square brackets
      const arrayStartIndex = jsonText.indexOf('[')
      const arrayEndIndex = jsonText.lastIndexOf(']')

      if (arrayStartIndex !== -1 && arrayEndIndex !== -1 && arrayEndIndex > arrayStartIndex) {
        extractedJson = jsonText.substring(arrayStartIndex, arrayEndIndex + 1)
      } else {
        // Pattern 2: Look for individual objects and wrap them in array
        const objectPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g
        const objects = jsonText.match(objectPattern)
        if (objects && objects.length > 0) {
          extractedJson = '[' + objects.join(',') + ']'
        } else {
          console.warn(`No valid JSON structure found in response from ${fileName}`)
          console.warn('Response preview:', responseText.substring(0, 200) + '...')
          return []
        }
      }

      // Attempt to parse the extracted JSON
      let parsedData
      try {
        parsedData = JSON.parse(extractedJson)
      } catch (parseError) {
        // Try to fix common JSON issues
        let fixedJson = extractedJson
          .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
          .replace(/,\s*}/g, '}') // Remove trailing commas in objects
          .replace(/'/g, '"') // Replace single quotes with double quotes
          .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Quote unquoted keys

        console.log(`🔧 Attempting to fix JSON for ${fileName}`)
        parsedData = JSON.parse(fixedJson)
      }

      if (!Array.isArray(parsedData)) {
        console.warn(`Expected array from Claude, got: ${typeof parsedData}`)
        // If it's a single object, wrap it in array
        if (typeof parsedData === 'object' && parsedData !== null) {
          parsedData = [parsedData]
        } else {
          return []
        }
      }

      const entities = parsedData
        .filter((item: any) => item && typeof item === 'object') // Filter out invalid items
        .map((item: any) => {
          // Validate required fields
          if (!item.type || !item.data) {
            console.warn(`Invalid entity structure in ${fileName}:`, item)
            return null
          }

          return {
            type: item.type,
            confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
            data: item.data,
            source: {
              fileName,
              extractionMethod: method
            }
          }
        })
        .filter((entity: any) => entity !== null) // Remove invalid entities

      console.log(`✅ Successfully parsed ${entities.length} entities from ${fileName}`)
      return entities

    } catch (error) {
      console.error(`❌ Failed to parse entities from ${fileName}:`, error)
      console.error('Response text preview:', responseText.substring(0, 500))

      // Return empty array but log details for debugging
      console.error('Full response text:', responseText)
      return []
    }
  }

  /**
   * Validate extracted entity and generate clarification requests for missing fields
   */
  private validateEntityAndGetClarifications(entity: ExtractedEntity): ClarificationRequest[] {
    const clarifications: ClarificationRequest[] = []
    const { data, source, type } = entity

    // Check required fields based on entity type
    if (type === 'contract') {
      if (!data.clientName || data.clientName.trim() === '') {
        clarifications.push({
          fileName: source.fileName,
          field: 'clientName',
          question: 'What is the client name for this contract?',
          suggestions: ['Cliente A', 'João Silva', 'Empresa XYZ'],
          entityType: 'contract'
        })
      }
      if (!data.projectName || data.projectName.trim() === '') {
        clarifications.push({
          fileName: source.fileName,
          field: 'projectName',
          question: 'What is the project name for this contract?',
          suggestions: ['Projeto Residencial', 'Reforma Apartamento', 'Casa Nova'],
          entityType: 'contract'
        })
      }
      if (!data.totalValue || data.totalValue <= 0) {
        clarifications.push({
          fileName: source.fileName,
          field: 'totalValue',
          question: 'What is the total contract value?',
          suggestions: ['R$ 50.000', 'R$ 100.000', 'R$ 200.000'],
          entityType: 'contract'
        })
      }
      if (!data.category || !['Residencial', 'Comercial', 'Restaurante', 'Loja'].includes(data.category)) {
        clarifications.push({
          fileName: source.fileName,
          field: 'category',
          question: 'What type of project is this contract for?',
          suggestions: ['Residencial', 'Comercial', 'Restaurante', 'Loja'],
          entityType: 'contract'
        })
      }
    }

    if (type === 'expense') {
      if (!data.description || data.description.trim() === '') {
        clarifications.push({
          fileName: source.fileName,
          field: 'description',
          question: 'What is this expense for?',
          suggestions: ['Material de construção', 'Mão de obra', 'Equipamentos'],
          entityType: 'expense'
        })
      }
      if (!data.amount || data.amount <= 0) {
        clarifications.push({
          fileName: source.fileName,
          field: 'amount',
          question: 'What is the expense amount?',
          suggestions: ['R$ 500', 'R$ 1.000', 'R$ 2.500'],
          entityType: 'expense'
        })
      }
      if (!data.category || !['materiais', 'mão-de-obra', 'equipamentos', 'transporte', 'escritório', 'software', 'outros'].includes(data.category)) {
        clarifications.push({
          fileName: source.fileName,
          field: 'category',
          question: 'What category does this expense belong to?',
          suggestions: ['materiais', 'mão-de-obra', 'equipamentos', 'outros'],
          entityType: 'expense'
        })
      }
    }

    if (type === 'receivable') {
      if (!data.clientName || data.clientName.trim() === '') {
        clarifications.push({
          fileName: source.fileName,
          field: 'clientName',
          question: 'Who is the client for this receivable?',
          suggestions: ['Cliente A', 'João Silva', 'Empresa XYZ'],
          entityType: 'receivable'
        })
      }
      if (!data.amount || data.amount <= 0) {
        clarifications.push({
          fileName: source.fileName,
          field: 'amount',
          question: 'What is the receivable amount?',
          suggestions: ['R$ 5.000', 'R$ 10.000', 'R$ 25.000'],
          entityType: 'receivable'
        })
      }
      if (!data.description || data.description.trim() === '') {
        clarifications.push({
          fileName: source.fileName,
          field: 'description',
          question: 'What is this receivable for?',
          suggestions: ['Pagamento do projeto', 'Consultoria', 'Comissão'],
          entityType: 'receivable'
        })
      }
    }

    return clarifications
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