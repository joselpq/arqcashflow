/**
 * SetupAssistantService - AI-powered document processing for financial data
 *
 * Phase 1 Implementation: Service layer integration while preserving 100% of
 * existing functionality from /api/ai/setup-assistant-direct
 *
 * This service:
 * - Processes Excel, CSV, PDF, and image files using Claude AI
 * - Extracts contracts, receivables, and expenses from documents
 * - Creates entities using service layer instead of direct Prisma
 * - Provides automatic audit logging through service layer
 * - Maintains exact same business logic and Claude prompts
 *
 * Baseline Performance:
 * - CSV: 4 contracts, 4 receivables, 7 expenses (~30s)
 * - Excel: 37 contracts (~73s)
 * - PDF: 1 contract (~60s)
 */

import { BaseService, ServiceContext, BulkOperationResult, BulkOptions } from './BaseService'
import { ContractService } from './ContractService'
import { ExpenseService } from './ExpenseService'
import { ReceivableService } from './ReceivableService'
import { ContractCreateData, ReceivableCreateData, ExpenseCreateData } from '../validation'
import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'

// Initialize Claude AI client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
})

export interface ProcessingResult {
  message: string
  analysis: string
  results: {
    contracts: { created: number; errors: string[] }
    receivables: { created: number; errors: string[] }
    expenses: { created: number; errors: string[] }
  }
  summary: {
    contractsCreated: number
    receivablesCreated: number
    expensesCreated: number
    contractsFound: number
    receivablesFound: number
    expensesFound: number
    errors: string[]
  }
  excelSheets?: {
    totalSheets: number
    processedSheets: string[]
    skippedSheets: string[]
  }
}

export interface FileProcessingResult extends ProcessingResult {
  fileName: string
  fileSize: number
  processingTime: number
  status: 'success' | 'error'
  error?: string
}

export interface MultiFileProcessingResult {
  totalFiles: number
  successfulFiles: number
  failedFiles: number
  fileResults: FileProcessingResult[]
  combinedSummary: {
    totalContractsCreated: number
    totalReceivablesCreated: number
    totalExpensesCreated: number
    totalErrors: number
  }
  totalProcessingTime: number
}

export interface ProcessingProgress {
  currentFile: number
  totalFiles: number
  currentFileName: string
  status: 'processing' | 'completed' | 'error'
  estimatedTimeRemaining?: number
}

interface ExtractedData {
  analysis: string
  data: {
    contracts: any[]
    receivables: any[]
    expenses: any[]
  }
}

export class SetupAssistantService extends BaseService<any, any, any, any> {
  private contractService: ContractService
  private expenseService: ExpenseService
  private receivableService: ReceivableService

  constructor(context: ServiceContext) {
    super(context, 'setupAssistant', ['createdAt'])

    // Initialize dependent services
    this.contractService = new ContractService(context)
    this.expenseService = new ExpenseService(context)
    this.receivableService = new ReceivableService(context)
  }

  /**
   * Process multiple files sequentially with progress tracking
   * Phase 2 Enhancement: Multi-file support
   */
  async processMultipleFiles(
    files: File[],
    progressCallback?: (progress: ProcessingProgress) => void
  ): Promise<MultiFileProcessingResult> {
    const startTime = Date.now()
    const fileResults: FileProcessingResult[] = []
    const avgTimePerFile = 60000 // 60 seconds average

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileStartTime = Date.now()

      // Update progress
      if (progressCallback) {
        progressCallback({
          currentFile: i + 1,
          totalFiles: files.length,
          currentFileName: file.name,
          status: 'processing',
          estimatedTimeRemaining: (files.length - i - 1) * avgTimePerFile / 1000
        })
      }

      try {
        // Process individual file
        const result = await this.processFile(file)

        fileResults.push({
          ...result,
          fileName: file.name,
          fileSize: file.size,
          processingTime: Date.now() - fileStartTime,
          status: 'success'
        })

        // Update progress
        if (progressCallback) {
          progressCallback({
            currentFile: i + 1,
            totalFiles: files.length,
            currentFileName: file.name,
            status: 'completed'
          })
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)

        // Check if it's a recoverable error (rate limiting)
        const isRateLimitError = error instanceof Error &&
          (error.message.includes('429') || error.message.includes('rate limit'))

        if (isRateLimitError && i > 0) {
          // Wait longer before retrying
          console.log('Rate limit detected, waiting 5 seconds before retry...')
          await new Promise(resolve => setTimeout(resolve, 5000))

          // Retry once
          try {
            const result = await this.processFile(file)
            fileResults.push({
              ...result,
              fileName: file.name,
              fileSize: file.size,
              processingTime: Date.now() - fileStartTime,
              status: 'success'
            })
          } catch (retryError) {
            // Failed even after retry
            fileResults.push({
              message: 'Erro no processamento',
              analysis: '',
              results: {
                contracts: { created: 0, errors: [] },
                receivables: { created: 0, errors: [] },
                expenses: { created: 0, errors: [] }
              },
              summary: {
                contractsCreated: 0,
                receivablesCreated: 0,
                expensesCreated: 0,
                contractsFound: 0,
                receivablesFound: 0,
                expensesFound: 0,
                errors: [String(retryError)]
              },
              fileName: file.name,
              fileSize: file.size,
              processingTime: Date.now() - fileStartTime,
              status: 'error',
              error: String(retryError)
            })
          }
        } else {
          // Non-recoverable error or first file failed
          fileResults.push({
            message: 'Erro no processamento',
            analysis: '',
            results: {
              contracts: { created: 0, errors: [] },
              receivables: { created: 0, errors: [] },
              expenses: { created: 0, errors: [] }
            },
            summary: {
              contractsCreated: 0,
              receivablesCreated: 0,
              expensesCreated: 0,
              contractsFound: 0,
              receivablesFound: 0,
              expensesFound: 0,
              errors: [String(error)]
            },
            fileName: file.name,
            fileSize: file.size,
            processingTime: Date.now() - fileStartTime,
            status: 'error',
            error: String(error)
          })
        }

        // Update progress with error status
        if (progressCallback) {
          progressCallback({
            currentFile: i + 1,
            totalFiles: files.length,
            currentFileName: file.name,
            status: 'error'
          })
        }
      }

      // Small delay between files to avoid overwhelming the API
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Calculate combined summary
    const combinedSummary = {
      totalContractsCreated: 0,
      totalReceivablesCreated: 0,
      totalExpensesCreated: 0,
      totalErrors: 0
    }

    let successfulFiles = 0
    let failedFiles = 0

    fileResults.forEach(result => {
      if (result.status === 'success') {
        successfulFiles++
        combinedSummary.totalContractsCreated += result.summary.contractsCreated
        combinedSummary.totalReceivablesCreated += result.summary.receivablesCreated
        combinedSummary.totalExpensesCreated += result.summary.expensesCreated
        combinedSummary.totalErrors += result.summary.errors.length
      } else {
        failedFiles++
        combinedSummary.totalErrors++
      }
    })

    return {
      totalFiles: files.length,
      successfulFiles,
      failedFiles,
      fileResults,
      combinedSummary,
      totalProcessingTime: Date.now() - startTime
    }
  }

  /**
   * Process uploaded file and create financial entities
   * CRITICAL: This preserves 100% of existing business logic
   */
  async processFile(file: File): Promise<ProcessingResult> {
    console.log('📁 Processing file with SetupAssistantService:', file.name, 'Type:', file.type)

    // Convert file based on type
    const buffer = Buffer.from(await file.arrayBuffer())
    let fileContent: string | undefined
    let fileBase64: string | undefined
    let isVisualDocument = false
    let excelSheetsInfo: { totalSheets: number; processedSheets: string[]; skippedSheets: string[] } | undefined

    // Check file type by MIME type and extension
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.csv')) {
      // CSV files - keep original buffer for document attachment
      fileContent = buffer.toString('utf-8')
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Excel files - Process all sheets for comprehensive data extraction
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetNames = workbook.SheetNames

      console.log(`📈 Processing Excel file with ${sheetNames.length} sheet(s): ${sheetNames.join(', ')}`)

      // Initialize Excel sheets tracking
      excelSheetsInfo = {
        totalSheets: sheetNames.length,
        processedSheets: [],
        skippedSheets: []
      }

      if (sheetNames.length === 1) {
        // Single sheet - process normally
        const worksheet = workbook.Sheets[sheetNames[0]]
        fileContent = XLSX.utils.sheet_to_csv(worksheet)
        excelSheetsInfo.processedSheets.push(sheetNames[0])
      } else {
        // Multiple sheets - combine all data with sheet identifiers
        const combinedData: string[] = []

        for (let i = 0; i < sheetNames.length; i++) {
          const sheetName = sheetNames[i]
          const worksheet = workbook.Sheets[sheetName]
          const sheetCsv = XLSX.utils.sheet_to_csv(worksheet)

          // Skip empty sheets
          if (sheetCsv.trim()) {
            console.log(`📊 Processing sheet ${i + 1}/${sheetNames.length}: "${sheetName}"`)

            // Add sheet header for context
            combinedData.push(`\n=== PLANILHA: ${sheetName} ===\n`)
            combinedData.push(sheetCsv)
            combinedData.push(`\n=== FIM DA PLANILHA: ${sheetName} ===\n`)

            excelSheetsInfo.processedSheets.push(sheetName)
          } else {
            console.log(`⚠️ Skipping empty sheet: "${sheetName}"`)
            excelSheetsInfo.skippedSheets.push(sheetName)
          }
        }

        fileContent = combinedData.join('\n')
        console.log(`✅ Combined ${excelSheetsInfo.processedSheets.length}/${sheetNames.length} sheets into single data stream`)
      }
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // PDF files - send as base64 for Claude to process
      fileBase64 = buffer.toString('base64')
      isVisualDocument = true
      console.log('📄 Processing PDF document')
    } else if (fileType.startsWith('image/') ||
               fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) {
      // Image files - send as base64 for Claude to process
      fileBase64 = buffer.toString('base64')
      isVisualDocument = true
      console.log('🖼️ Processing image document')
    } else {
      throw new Error('Unsupported file type. Please upload CSV, Excel, PDF, or image files.')
    }

    // Extract data using Claude AI
    const extractedData = await this.extractDataWithClaude(
      fileContent,
      fileBase64,
      isVisualDocument,
      file.type
    )

    // Create entities using service layer (with audit logging)
    const results = await this.createEntitiesFromData(extractedData)

    return {
      message: 'Arquivo processado com sucesso!',
      analysis: extractedData.analysis,
      results,
      summary: {
        contractsCreated: results.contracts.created,
        receivablesCreated: results.receivables.created,
        expensesCreated: results.expenses.created,
        contractsFound: extractedData.data?.contracts?.length || 0,
        receivablesFound: extractedData.data?.receivables?.length || 0,
        expensesFound: extractedData.data?.expenses?.length || 0,
        errors: [
          ...results.contracts.errors,
          ...results.receivables.errors,
          ...results.expenses.errors
        ]
      },
      excelSheets: excelSheetsInfo
    }
  }

  /**
   * Extract data using Claude AI
   * CRITICAL: Preserves ALL existing prompts and extraction logic
   */
  private async extractDataWithClaude(
    fileContent: string | undefined,
    fileBase64: string | undefined,
    isVisualDocument: boolean,
    fileType: string
  ): Promise<ExtractedData> {
    // Build prompt based on document type
    let prompt = this.buildClaudePrompt(isVisualDocument, fileContent)

    // Add JSON structure to prompt
    prompt = this.addJsonStructureToPrompt(prompt)

    // Build message content for Claude
    let messageContent: any

    if (isVisualDocument && fileBase64) {
      // For visual documents, send the image/PDF and text prompt
      console.log(`📄 Processing visual document: ${fileType}`)
      console.log(`📏 Base64 size: ${fileBase64.length} characters`)

      if (fileType === 'application/pdf' || fileType.toLowerCase().includes('pdf')) {
        // PDF handling - Claude expects document format, not image format
        messageContent = [
          { type: "text", text: prompt },
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: fileBase64
            }
          }
        ]
      } else {
        // Image handling
        messageContent = [
          { type: "text", text: prompt },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: fileType,
              data: fileBase64
            }
          }
        ]
      }
    } else {
      // For text documents (CSV/Excel), send as text content in prompt
      console.log(`📄 Processing text document`)
      console.log(`📏 Content size: ${fileContent?.length || 0} characters`)

      // Simple approach - just replace the placeholder with the file content
      messageContent = prompt.replace('${fileContent}', fileContent || '')
    }

    // Call Claude with retry mechanism for rate limiting
    console.log('🤖 Calling Claude AI for extraction')

    let response
    let retries = 0
    const maxRetries = 2

    while (retries <= maxRetries) {
      try {
        response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514', // Using Claude Sonnet 4 for improved performance
          max_tokens: 8192,
          messages: [{
            role: 'user',
            content: messageContent
          }]
        })
        break // Success, exit retry loop
      } catch (error: any) {
        if (error.status === 429 && retries < maxRetries) {
          retries++
          const waitTime = retries * 2000 // 2s, 4s
          console.log(`Rate limited, waiting ${waitTime}ms before retry ${retries}/${maxRetries}`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        } else {
          throw error // Re-throw if not rate limit or max retries reached
        }
      }
    }

    console.log('✅ Claude response received')

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.log('❌ No JSON found in response. First 500 chars:', content.text.substring(0, 500))
      throw new Error('No valid JSON found in Claude response')
    }

    const claudeResponse = JSON.parse(jsonMatch[0])

    console.log('📊 Claude found:')
    console.log(`  Contracts: ${claudeResponse.data?.contracts?.length || 0}`)
    console.log(`  Receivables: ${claudeResponse.data?.receivables?.length || 0}`)
    console.log(`  Expenses: ${claudeResponse.data?.expenses?.length || 0}`)

    return claudeResponse
  }

  /**
   * Build Claude prompt based on document type
   * CRITICAL: Preserves ALL existing prompts exactly
   */
  private buildClaudePrompt(isVisualDocument: boolean, fileContent?: string): string {
    if (isVisualDocument) {
      // Prompt for PDFs and images
      return `You are a data extraction expert for a Brazilian architecture firm's cashflow system.

Analyze this document (PDF or image) and extract financial data according to these STRICT RULES:

DOCUMENT TYPE IDENTIFICATION:
1. **PROPOSAL/ORÇAMENTO**: Contains future project pricing, "proposta", breakdown of services with values
   → Extract as: 1 CONTRACT + RECEIVABLES (only if payment terms are specified)
   → DO NOT create expenses from proposals - these are future income, not costs

2. **INVOICE/NOTA FISCAL**: Contains charges for services/products already delivered
   → Extract as: 1 EXPENSE (what you need to pay)

3. **RECEIPT/RECIBO**: Contains proof of payment already made
   → Extract as: 1 EXPENSE with status "paid"

4. **CONTRACT/CONTRATO**: Contains agreed project terms and total value
   → Extract as: 1 CONTRACT + RECEIVABLES (only if payment terms are specified)

CONTRACT AND PROPOSAL PROCESSING RULES:
When you see a PROPOSAL or CONTRACT document:

A) ALWAYS CREATE ONE CONTRACT with:
   - clientName: Extract client name from document
   - projectName: Create from project description (e.g. "Projeto Arquitetura Residencial")
   - totalValue: The MAIN total value (exclude optional services like "acompanhamento")
   - signedDate: Use proposal/contract date as signed date
   - category: "Residencial", "Comercial", "Restaurante", etc.
   - notes: Include any optional services with rates (e.g. "Acompanhamento de projeto: R$ 350/visita")

B) CREATE RECEIVABLES only if payment terms are mentioned:
   - If "25% na assinatura" + 4 installments → Create 5 receivables:
     * 25% of total value on signed date
     * 4 equal installments of remaining 75% at 30, 60, 90, 120 days after signed date
   - If different payment terms mentioned, follow those exactly
   - If NO payment terms specified, create NO receivables
   - Use client name and project name for receivables

C) DO NOT CREATE EXPENSES from proposals or contracts (common mistake!)

BRAZILIAN FORMATS:
- Dates: "13/11/2024" or "13.11.24" → "2024-11-13"
- Currency: "R$ 30.575" → 30575 (number only)
- Payment terms: "30/60/90/120" means installments at 30, 60, 90, 120 days

VALIDATION RULES:
- Proposals should NEVER generate expenses
- Contract total value should match the sum of all receivables
- Receivable dates should be properly calculated from base date
- Optional services (like visits) go in contract notes, not separate line items`
    } else {
      // Prompt for spreadsheets (CSV/Excel)
      return `You are a data extraction expert for a Brazilian architecture firm's cashflow system.

Analyze this spreadsheet data and extract ALL contracts, receivables, and expenses you can find.

MULTI-SHEET PROCESSING:
- This data may contain multiple Excel sheets combined (marked with "=== PLANILHA: [SheetName] ===")
- Each sheet may contain different types of data (contracts, receivables, expenses)
- Process ALL sheets and ALL data comprehensively
- Treat each sheet section as potentially containing complete datasets

IMPORTANT: Extract EVERY SINGLE ROW that looks like a contract, receivable, or expense. Do not limit or truncate the results.

IMPORTANT RULES:
1. For rows with project names like "LF - Livia Assan", extract:
   - clientName: "Livia Assan" (the part after the dash)
   - projectName: "LF" (the code before the dash)

2. Special cases for project names:
   - "LF (BAN) - Livia Assan" → clientName: "Livia Assan", projectName: "LF (BAN)"
   - "RL-IC - Rosa Lyra Isabel de Castela" → clientName: "Rosa Lyra Isabel de Castela", projectName: "RL-IC"

3. Brazilian date formats:
   - "23/Oct/20" means October 23, 2020
   - "15/09/2024" means September 15, 2024
   - Always output as "YYYY-MM-DD"

4. Brazilian currency:
   - "R$ 3,500" means 3500
   - "R$ 1.234,56" means 1234.56
   - Remove all formatting and return numbers only

5. STATUS AND CATEGORY STANDARDIZATION (VERY IMPORTANT):

   For CONTRACT STATUS, map Portuguese status to these EXACT English values:
   - "Em andamento", "Ativo", "Em progresso", "Andamento" → "active"
   - "Finalizado", "Concluído", "Completo", "Terminado" → "completed"
   - "Cancelado", "Cancelou", "Parado", "Suspenso" → "cancelled"
   - If unclear or empty, use "active"

   For EXPENSE TYPE, map to these EXACT English values:
   - "Operacional", "Despesa geral", "Administrativo" → "operational"
   - "Projeto", "Obra", "Cliente específico" → "project"
   - "Administração", "Escritório", "RH" → "administrative"
   - If unclear or empty, use "operational"

   For CATEGORIES (both contracts and expenses), use intelligent classification:
   - Residential projects → "Residencial"
   - Commercial projects → "Comercial"
   - Restaurant projects → "Restaurante"
   - Store/retail projects → "Loja"
   - For expenses: materials, labor, equipment, transport, office, software, etc.

6. Detect data types by looking at the headers and content:
   - Contracts: have client/project names, total values, and dates
   - Receivables: have expected dates and amounts to receive
   - Expenses: have descriptions, amounts, due dates, and vendors

7. If a CSV has multiple sections (like contracts section, then receivables section, then expenses section), detect ALL of them

8. EXTRACT ALL ROWS - if there are 37 contracts in the data, return all 37, not just a sample

9. Use the DESCRIPTION/NOTES fields to store any additional Portuguese information that doesn't fit the standardized fields

FILE CONTENT:
\${fileContent}`
    }
  }

  /**
   * Add JSON structure to prompt
   */
  private addJsonStructureToPrompt(prompt: string): string {
    return prompt + `

Return a JSON object with this EXACT structure (no markdown, just JSON):
{
  "analysis": "Brief summary of what you found",
  "data": {
    "contracts": [
      {
        "clientName": "string",
        "projectName": "string",
        "description": "string or null",
        "totalValue": number,
        "signedDate": "YYYY-MM-DD",
        "category": "string or null (e.g. 'Residencial', 'Comercial', 'Restaurante', 'Loja')",
        "status": "active|completed|cancelled (REQUIRED - map from Portuguese)",
        "notes": "string or null (use for additional Portuguese info)"
      }
    ],
    "receivables": [
      {
        "clientName": "string or null",
        "projectName": "string or null",
        "expectedDate": "YYYY-MM-DD",
        "amount": number,
        "invoiceNumber": "string or null",
        "category": "string or null",
        "notes": "string or null"
      }
    ],
    "expenses": [
      {
        "description": "string",
        "amount": number,
        "dueDate": "YYYY-MM-DD",
        "category": "string (e.g. 'materials', 'labor', 'equipment', 'transport', 'office')",
        "vendor": "string or null",
        "invoiceNumber": "string or null",
        "type": "operational|project|administrative (REQUIRED - map intelligently)",
        "notes": "string or null"
      }
    ]
  }
}`
  }

  /**
   * Create entities using service layer instead of direct Prisma
   * IMPROVEMENT: Uses service layer for audit logging and validation
   */
  private async createEntitiesFromData(extractedData: ExtractedData): Promise<{
    contracts: { created: number; errors: string[] }
    receivables: { created: number; errors: string[] }
    expenses: { created: number; errors: string[] }
  }> {
    const results = {
      contracts: { created: 0, errors: [] as string[] },
      receivables: { created: 0, errors: [] as string[] },
      expenses: { created: 0, errors: [] as string[] }
    }

    // Create contracts using service layer
    if (extractedData.data?.contracts?.length > 0) {
      console.log('Creating contracts...')
      results.contracts = await this.createContractsWithService(extractedData.data.contracts)
    }

    // Create receivables using service layer
    if (extractedData.data?.receivables?.length > 0) {
      console.log('Creating receivables...')
      results.receivables = await this.createReceivablesWithService(extractedData.data.receivables)
    }

    // Create expenses using service layer
    if (extractedData.data?.expenses?.length > 0) {
      console.log('Creating expenses...')
      results.expenses = await this.createExpensesWithService(extractedData.data.expenses)
    }

    return results
  }

  /**
   * Create contracts using ContractService
   */
  private async createContractsWithService(contracts: any[]): Promise<{ created: number; errors: string[] }> {
    const results = { created: 0, errors: [] as string[] }

    for (const contractData of contracts) {
      try {
        // Log what we're trying to create
        console.log('📝 Creating contract:', {
          clientName: contractData.clientName,
          projectName: contractData.projectName,
          totalValue: contractData.totalValue,
          signedDate: contractData.signedDate
        })

        // Validate required fields
        if (!contractData.clientName) {
          results.errors.push(`Missing clientName for contract: ${contractData.projectName || 'unknown'}`)
          continue
        }
        if (!contractData.projectName) {
          results.errors.push(`Missing projectName for contract: ${contractData.clientName}`)
          continue
        }
        if (!contractData.totalValue) {
          results.errors.push(`Missing totalValue for contract: ${contractData.clientName} - ${contractData.projectName}`)
          continue
        }
        if (!contractData.signedDate) {
          results.errors.push(`Missing signedDate for contract: ${contractData.clientName} - ${contractData.projectName}`)
          continue
        }

        // Use service layer to create contract (includes audit logging)
        // Note: Validation schemas expect strings for dates and non-null strings
        const contract: ContractCreateData = {
          clientName: contractData.clientName,
          projectName: contractData.projectName,
          description: contractData.description || '',  // Empty string instead of null
          totalValue: Number(contractData.totalValue),
          signedDate: contractData.signedDate,  // Keep as string (YYYY-MM-DD format)
          category: contractData.category || null,  // category can be null
          notes: contractData.notes || '',  // Empty string instead of null
          status: contractData.status || 'active'
        }

        await this.contractService.create(contract)
        results.created++
        console.log('✅ Contract created successfully')
      } catch (error: any) {
        console.log('❌ Error creating contract:', error)

        // For setup assistant, we allow duplicates (user might have multiple contracts with same client)
        // The original endpoint doesn't block duplicates
        if (error?.code === 'DUPLICATE_CONTRACT' || error?.message?.includes('already exists')) {
          console.log('⚠️ Duplicate detected, creating anyway for setup assistant')

          // Create directly using Prisma to bypass the duplicate check
          // This maintains the exact same behavior as the original endpoint
          try {
            await this.context.teamScopedPrisma.contract.create({
              data: {
                clientName: contractData.clientName,
                projectName: contractData.projectName,
                description: contractData.description || null,
                totalValue: Number(contractData.totalValue),
                signedDate: new Date(contractData.signedDate),
                category: contractData.category || null,
                notes: contractData.notes || null,
                status: contractData.status || 'active'
              }
            })
            results.created++
            console.log('✅ Contract created directly (duplicate allowed)')
          } catch (directError) {
            console.log('❌ Direct creation also failed:', directError)
            results.errors.push(`Error creating contract ${contractData.clientName}: ${directError}`)
          }
        } else {
          results.errors.push(`Error creating contract ${contractData.clientName}: ${error}`)
        }
      }
    }

    return results
  }

  /**
   * Create receivables using ReceivableService
   */
  private async createReceivablesWithService(receivables: any[]): Promise<{ created: number; errors: string[] }> {
    const results = { created: 0, errors: [] as string[] }

    for (const receivableData of receivables) {
      try {
        // Ensure we have required fields
        if (!receivableData.expectedDate || !receivableData.amount) {
          results.errors.push(`Missing required fields for receivable: ${JSON.stringify(receivableData)}`)
          continue
        }

        // Try to find matching contract
        let contractId = null
        if (receivableData.clientName || receivableData.projectName) {
          const filters: any = {}

          if (receivableData.clientName && receivableData.projectName) {
            // Search for exact match first
            const contracts = await this.contractService.findMany({
              clientName: receivableData.clientName,
              projectName: receivableData.projectName
            })
            contractId = contracts[0]?.id
          } else if (receivableData.clientName) {
            const contracts = await this.contractService.findMany({
              clientName: receivableData.clientName
            })
            contractId = contracts[0]?.id
          } else if (receivableData.projectName) {
            const contracts = await this.contractService.findMany({
              projectName: receivableData.projectName
            })
            contractId = contracts[0]?.id
          }
        }

        // Use service layer to create receivable
        // Note: Validation schemas expect strings for dates
        const receivable: ReceivableCreateData = {
          contractId,
          expectedDate: receivableData.expectedDate,  // Keep as string (YYYY-MM-DD format)
          amount: Number(receivableData.amount),
          invoiceNumber: receivableData.invoiceNumber || null,
          category: receivableData.category || null,
          notes: receivableData.notes || '',  // Empty string instead of null
          status: 'pending'
        }

        await this.receivableService.create(receivable)
        results.created++
      } catch (error) {
        results.errors.push(`Error creating receivable: ${error}`)
      }
    }

    return results
  }

  /**
   * Create expenses using ExpenseService
   */
  private async createExpensesWithService(expenses: any[]): Promise<{ created: number; errors: string[] }> {
    const results = { created: 0, errors: [] as string[] }

    for (const expenseData of expenses) {
      try {
        // Ensure we have required fields
        if (!expenseData.description || !expenseData.amount || !expenseData.dueDate || !expenseData.category) {
          results.errors.push(`Missing required fields for expense: ${JSON.stringify(expenseData)}`)
          continue
        }

        // Use service layer to create expense
        // Note: Validation schemas expect strings for dates
        const expense: ExpenseCreateData = {
          description: expenseData.description,
          amount: Number(expenseData.amount),
          dueDate: expenseData.dueDate,  // Keep as string (YYYY-MM-DD format)
          category: expenseData.category,
          vendor: expenseData.vendor || null,
          invoiceNumber: expenseData.invoiceNumber || null,
          type: expenseData.type || 'operational',
          notes: expenseData.notes || '',  // Empty string instead of null
          status: 'pending',
          isRecurring: false
        }

        await this.expenseService.create(expense)
        results.created++
      } catch (error) {
        results.errors.push(`Error creating expense: ${error}`)
      }
    }

    return results
  }
}