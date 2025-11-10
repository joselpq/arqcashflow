/**
 * SetupAssistantServiceV2 - Optimized File Import Architecture with Mixed Sheet Support
 *
 * This implementation provides significant performance improvements over V1:
 * - ONE AI call per sheet for unified column mapping + type classification
 * - Excel cell metadata reading for accurate date/number parsing
 * - MIXED SHEET SUPPORT: Automatically detects and handles multiple entity types per sheet (ADR-025)
 * - 70-85% faster: 90-130s → 15-25s for typical files
 * - Handles 100% of sheet types (homogeneous + mixed)
 *
 * Architecture (4 Phases):
 * Phase 1: File Structure Extraction (<0.5s, pure code)
 *   - Reads Excel cell metadata directly (preserves types)
 *   - Detects header rows intelligently (handles title rows, metadata)
 *   - Detects table boundaries (blank rows/columns) for mixed sheets
 *   - Normalizes dates to ISO format (yyyy-mm-dd)
 *   - Filters empty rows/columns
 *
 * Phase 2: Unified Sheet Analysis (10-15s for homogeneous, 15-28s for mixed, parallel AI)
 *   - Automatic detection: homogeneous (90%) vs mixed (10%) sheets
 *   - Homogeneous: ONE AI call per sheet (fast path)
 *   - Mixed: Virtual sheet creation + parallel analysis (reuses existing prompt!)
 *   - Parallel processing across all sheets and virtual sheets
 *   - Skips non-financial sheets (instructions, metadata)
 *
 * Phase 3: Deterministic Extraction (<1s, pure code)
 *   - Rule-based value transformation (no AI)
 *   - Currency parsing with Brazilian/US format support
 *   - Status normalization (Portuguese → English enums)
 *   - Post-processing inference for required fields
 *
 * Phase 4: Bulk Creation (1-2s, parallel by entity type)
 *   - Parallel validation using Promise.allSettled
 *   - Prisma createMany for batch inserts
 *   - Contract ID mapping (project names → UUIDs)
 *   - Batch audit logging (1 summary per batch)
 *
 * Feature Flags:
 * - SETUP_ASSISTANT_USE_HAIKU: Use Haiku 4.5 for speed (default: false, uses Sonnet)
 * - SETUP_ASSISTANT_SUPPORT_MIXED_SHEETS: Enable mixed sheet support (default: true)
 *
 * Current Limitations:
 * - Horizontal mixed tables require blank column separator
 * - PDF/images use V1's single-phase vision (proven approach)
 *
 * Next Steps:
 * - Add telemetry for mixed sheet detection rates
 * - Consider enhanced error recovery for malformed sheets
 *
 * Related: ADR-024 (Architecture V2 Success), ADR-025 (Mixed Sheet Support), ADR-023 (Planning)
 */

import { BaseService, ServiceContext, ServiceError } from './BaseService'
import { ContractService } from './ContractService'
import { ReceivableService } from './ReceivableService'
import { ExpenseService } from './ExpenseService'
import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'
import { getProfessionConfig } from '@/lib/professions'
import type {
  ExtractedReceivable,
  ExtractionResult,
  ProcessingResult,
  SheetData,
  FileType
} from './SetupAssistantService'

// Extracted components (ADR-026)
import { FileTypeDetector } from './setup-assistant/core/FileTypeDetector'
import { ExcelParser } from './setup-assistant/core/ExcelParser'
import { DataTransformer, ColumnMapping as DataColumnMapping } from './setup-assistant/core/DataTransformer'
import { TableSegmenter, DetectedTable } from './setup-assistant/analysis/TableSegmenter'
import { SheetAnalyzer, SheetType, SheetAnalysis, ModelConfig } from './setup-assistant/analysis/SheetAnalyzer'

/**
 * Column mapping for deterministic extraction
 * Re-exporting from DataTransformer for backwards compatibility
 */
type ColumnMapping = DataColumnMapping

/**
 * Virtual sheet created from a detected table (ADR-025)
 * Re-exporting from TableSegmenter for backwards compatibility
 */
interface VirtualSheet {
  name: string              // e.g., "Sheet1_table0", "Sheet1_table1"
  csv: string              // CSV data for just this table
  originalSheet: string     // Original sheet name
  tableIndex: number        // Index within original sheet
  rowRange: [number, number]
  colRange: [number, number]
  headerRow?: number        // Pre-detected header row
}

/**
 * Performance tracking
 */
interface PerformanceMetrics {
  phase1_structure: number
  phase2_analysis: number
  phase3_extraction: number
  phase4_bulkcreate: number
  total: number
}

/**
 * SetupAssistantServiceV2 - Optimized File Import Service
 *
 * Key improvements over V1:
 * - 70-85% faster (90-130s → 15-25s)
 * - ONE AI call per sheet (unified column mapping + type detection)
 * - Excel cell metadata reading (accurate date/number parsing)
 * - Parallel sheet processing
 * - Deterministic value extraction
 */
export class SetupAssistantServiceV2 extends BaseService<any, any, any, any> {
  private anthropic: Anthropic
  private contractService: ContractService
  private receivableService: ReceivableService
  private expenseService: ExpenseService

  // Extracted components (ADR-026: Service Decomposition)
  private fileDetector: FileTypeDetector
  private excelParser: ExcelParser
  private tableSegmenter: TableSegmenter
  private sheetAnalyzer: SheetAnalyzer
  private dataTransformer: DataTransformer

  constructor(context: ServiceContext) {
    super(context, 'setup_assistant_v2', [])

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
    })

    this.contractService = new ContractService(context)
    this.receivableService = new ReceivableService(context)
    this.expenseService = new ExpenseService(context)

    // Initialize extracted components (ADR-026)
    this.fileDetector = new FileTypeDetector()
    this.excelParser = new ExcelParser()
    this.tableSegmenter = new TableSegmenter()
    this.sheetAnalyzer = new SheetAnalyzer(this.anthropic)
    this.dataTransformer = new DataTransformer()
  }

  async validateBusinessRules(_data: any): Promise<void> {
    return Promise.resolve()
  }

  /**
   * FEATURE FLAG: Use Haiku 4.5 for speed vs Sonnet for accuracy
   * Default: Sonnet for better classification accuracy (can switch to Haiku for speed)
   */
  private get useHaiku(): boolean {
    return process.env.SETUP_ASSISTANT_USE_HAIKU === 'true' // Default false (use Sonnet)
  }

  /**
   * FEATURE FLAG: Enable mixed entity sheet support (ADR-025)
   * Default: true (mixed sheet support enabled)
   * Set SETUP_ASSISTANT_SUPPORT_MIXED_SHEETS=false to disable
   */
  private get supportMixedSheets(): boolean {
    return process.env.SETUP_ASSISTANT_SUPPORT_MIXED_SHEETS !== 'false' // Default true
  }

  /**
   * Get Claude model configuration
   * Defaults to Sonnet for complex unified analysis task
   */
  private getModelConfig() {
    if (this.useHaiku) {
      return {
        model: 'claude-haiku-4-5-20251001' as const,
        thinkingBudget: 3000,
        maxTokens: 8000
      }
    } else {
      return {
        model: 'claude-sonnet-4-20250514' as const,
        thinkingBudget: 5000,
        maxTokens: 16000
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 1: FILE STRUCTURE EXTRACTION (Pure Code, <0.1s)
  // Delegated to FileTypeDetector and ExcelParser components (ADR-026)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TABLE BOUNDARY DETECTION (ADR-025) - EXTRACTED TO TableSegmenter
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // The following methods have been extracted to lib/services/setup-assistant/analysis/TableSegmenter.ts:
  // - isRowBlank(), isColumnBlank()
  // - detectBlankRows(), detectBlankColumns()
  // - isBlankRegion(), detectHeaderInRegion(), calculateRegionConfidence()
  // - segmentTables(), segmentTablesWithHeaders()
  // - extractTableAsSheet()
  //
  // Usage: this.tableSegmenter.segmentTablesWithHeaders(sheet)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 2: UNIFIED SHEET ANALYSIS (AI, Parallel, ONE call per sheet)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Unified sheet analysis: column mapping + entity type detection in ONE call
   * This is the key optimization over V2 (which made TWO calls)
   */

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 2 & 3: ANALYSIS & EXTRACTION - EXTRACTED TO COMPONENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // The following sections have been extracted (ADR-026 Day 3):
  //
  // Phase 2 (Analysis):
  //   - analyzeSheetUnified() → SheetAnalyzer.analyzeSheet()
  //   - Location: lib/services/setup-assistant/analysis/SheetAnalyzer.ts
  //   - Usage: this.sheetAnalyzer.analyzeSheet(sheet, filename, options)
  //
  // Phase 3 (Transformation):
  //   - transformValue(), extractEntity() → DataTransformer
  //   - parseCSV(), parseCSVLine() → DataTransformer
  //   - postProcessEntities(), normalizeDate() → DataTransformer
  //   - Location: lib/services/setup-assistant/core/DataTransformer.ts
  //   - Usage: this.dataTransformer.* methods
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CONTRACT ID MAPPING (Convert project names to UUIDs)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Map contractId (project name string) to actual contract UUID
   * If no match found, set contractId to null (standalone receivable)
   */
  private async mapContractIds(receivables: ExtractedReceivable[]): Promise<ExtractedReceivable[]> {
    if (receivables.length === 0) return receivables

    console.log('\n🔗 CONTRACT ID MAPPING...')

    // Get all contracts for this team
    const contracts = await this.contractService.findMany({})
    console.log(`   Found ${contracts.length} existing contracts`)

    // Map project names to contract UUIDs
    let mapped = 0
    let notFound = 0

    const mappedReceivables = receivables.map(receivable => {
      // If contractId is already null or undefined, keep it
      if (!receivable.contractId) {
        return { ...receivable, contractId: null }
      }

      // If contractId is already a UUID format, keep it
      if (typeof receivable.contractId === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(receivable.contractId)) {
        return receivable
      }

      // Try to find matching contract by project name (case-insensitive)
      const projectNameLower = receivable.contractId.toLowerCase()
      const matchingContract = contracts.find(c =>
        c.projectName.toLowerCase() === projectNameLower
      )

      if (matchingContract) {
        mapped++
        return { ...receivable, contractId: matchingContract.id }
      } else {
        notFound++
        return { ...receivable, contractId: null }
      }
    })

    console.log(`   Mapped: ${mapped} | Not found: ${notFound}`)

    // 🔍 DIAGNOSTIC: Show sample mapping
    if (mappedReceivables.length > 0) {
      const sample = mappedReceivables[0]
      console.log(`   Sample mapping: contractId = ${sample.contractId ? sample.contractId.substring(0, 8) + '...' : 'null (standalone)'}`)
    }

    return mappedReceivables
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 4: BULK CREATION (Database, Parallel by entity type)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private async bulkCreateEntities(data: ExtractionResult): Promise<ProcessingResult> {
    console.log('\n💾 PHASE 4: Bulk Creation')
    console.log(`   Creating: ${data.contracts.length}c, ${data.receivables.length}r, ${data.expenses.length}e`)

    const errors: string[] = []
    let contractsCreated = 0
    let receivablesCreated = 0
    let expensesCreated = 0

    // Helper to convert null to undefined for service layer compatibility
    const cleanEntity = <T extends Record<string, any>>(entity: T): any => {
      const cleaned: any = {}
      for (const [key, value] of Object.entries(entity)) {
        cleaned[key] = value === null ? undefined : value
      }
      return cleaned
    }

    // CRITICAL: For mixed sheet imports, we must create contracts FIRST
    // so that receivables can be mapped to the newly created contracts

    // Step 1: Create contracts first (sequential)
    let contractResult = null
    if (data.contracts.length > 0) {
      try {
        // CRITICAL: Use continueOnError to skip duplicates and create new contracts
        contractResult = await this.contractService.bulkCreate(
          data.contracts.map(cleanEntity) as any,
          { continueOnError: true }  // Skip duplicates, create new ones
        )
        contractsCreated = contractResult.successCount
        errors.push(...contractResult.errors)
        console.log(`   ✅ Contracts created: ${contractsCreated} (${contractResult.failureCount} duplicates skipped)`)
      } catch (error) {
        errors.push(`Contracts bulk create failed: ${error}`)
      }
    }

    // Step 2: Map receivables' contractId (now includes newly created contracts!)
    const mappedReceivables = await this.mapContractIds(data.receivables)

    // Step 3: Create receivables and expenses in parallel
    // Use continueOnError for both to handle potential duplicates gracefully
    const results = await Promise.allSettled([
      mappedReceivables.length > 0
        ? this.receivableService.bulkCreate(mappedReceivables.map(cleanEntity) as any, { continueOnError: true })
        : null,
      data.expenses.length > 0
        ? this.expenseService.bulkCreate(data.expenses.map(cleanEntity) as any, { continueOnError: true })
        : null
    ])

    // Process results (receivables and expenses)
    if (results[0].status === 'fulfilled' && results[0].value) {
      receivablesCreated = results[0].value.successCount
      errors.push(...results[0].value.errors)
    } else if (results[0].status === 'rejected') {
      errors.push(`Receivables bulk create failed: ${results[0].reason}`)
    }

    if (results[1].status === 'fulfilled' && results[1].value) {
      expensesCreated = results[1].value.successCount
      errors.push(...results[1].value.errors)
    } else if (results[1].status === 'rejected') {
      errors.push(`Expenses bulk create failed: ${results[1].reason}`)
    }

    console.log(`   ✅ Created: ${contractsCreated}c, ${receivablesCreated}r, ${expensesCreated}e`)
    if (errors.length > 0) {
      console.log(`   ⚠️  Errors: ${errors.length}`)
      // 🔍 DIAGNOSTIC: Show actual errors
      console.log(`\n   🔍 BULK CREATION ERRORS:`)
      errors.slice(0, 3).forEach((err, idx) => {
        console.log(`      ${idx + 1}. ${err}`)
      })
      if (errors.length > 3) {
        console.log(`      ... and ${errors.length - 3} more errors`)
      }
    }

    return {
      success: true,
      contractsCreated,
      receivablesCreated,
      expensesCreated,
      errors
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PDF/IMAGE VISION EXTRACTION (Single-phase direct extraction)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Single-phase vision extraction: Direct schema-based extraction from PDF/images
   * Ported from V1 with proven performance (50% cheaper, 50% faster than multi-phase)
   */
  private async extractFromVisionDirect(
    fileBuffer: Buffer,
    filename: string,
    fileType: 'pdf' | 'image',
    professionOverride?: string
  ): Promise<ExtractionResult> {
    console.log(`🔍 Processing ${fileType.toUpperCase()} with single-phase vision extraction...`)

    // Get team profession for context-aware prompts
    const team = await this.context.teamScopedPrisma.raw.team.findUnique({
      where: { id: this.context.teamId },
      select: { profession: true }
    })

    const profession = team?.profession || professionOverride
    const professionConfig = getProfessionConfig(profession)

    // Determine media type and content type for Anthropic API
    const mediaType = fileType === 'pdf'
      ? 'application/pdf'
      : this.getImageMediaType(filename)

    const contentType = fileType === 'pdf' ? 'document' : 'image'

    // Full schema prompt with profession-aware context (from V1)
    const prompt = `Você está analisando um documento de ${professionConfig.businessContext.businessType}.

• Este documento pode estar em formato PDF, imagem, ou qualquer outro formato visual, pode se tratar por exemplo de um contrato, uma proposta, um recibo, etc.
• Sua tarefa é extrair TODAS as entidades financeiras (contratos, recebíveis, despesas) encontradas neste documento.
• Preste atenção no tipo e nome do documento pois fornecem indícios dos tipos de entidade financeira que você deve encontrar
• Se encontrar formas de pagamento (recebíveis ou despesas), preste atenção nas condições de pagamento: quanto é à vista, quanto é parcelado, quais as datas de pagamento
   • É comum encontrar propostas com valores diferentes entre parcelas, que podem ser explícitos ou implícitos
   • Calcule quanto deve ser pago à vista, quantas parcelas são e qual o valor e data específico de cada parcela, evitando erros de interpretação por assumir algo incorretamente
• Revise o documento por inteiro antes de extrair as entidades financeiras, para ter todo contexto necessário

═══════════════════════════════════════════════════════════════════
CONTEXTO FINANCEIRO - ${professionConfig.businessContext.professionName.toUpperCase()}
═══════════════════════════════════════════════════════════════════

${professionConfig.businessContext.revenueDescription}

${professionConfig.businessContext.projectTypes}

${professionConfig.businessContext.expenseDescription}

Use este contexto para identificar e classificar corretamente as entidades financeiras.

═══════════════════════════════════════════════════════════════════
SCHEMA DAS ENTIDADES
═══════════════════════════════════════════════════════════════════

📋 CONTRACT (Contratos/Projetos):
{
  "clientName": "string",        // OBRIGATÓRIO
  "projectName": "string",       // OBRIGATÓRIO
  "totalValue": number,          // ${professionConfig.ai.schemaRequirements.contract.totalValue === 'REQUIRED' ? 'OBRIGATÓRIO' : 'OPCIONAL'}
  "signedDate": "ISO-8601",      // ${professionConfig.ai.schemaRequirements.contract.signedDate === 'REQUIRED' ? 'OBRIGATÓRIO' : 'OPCIONAL'}
  "status": "active" | "completed" | "cancelled",  // OBRIGATÓRIO - se não descobrir, use "active"
  "description": "string" | null,
  "category": "string" | null,
  "notes": "string" | null
}

💰 RECEIVABLE (Recebíveis):
{
  "contractId": "string" | null,     // OPCIONAL - nome do projeto associado
  "clientName": "string" | null,     // OPCIONAL - nome do cliente
  "expectedDate": "ISO-8601" | null,
  "amount": number,                  // OBRIGATÓRIO
  "status": "pending" | "received" | "overdue" | null,
  "receivedDate": "ISO-8601" | null,
  "receivedAmount": number | null,
  "description": "string" | null,
  "category": "string" | null
}

💳 EXPENSE (Despesas):
{
  "description": "string",           // OBRIGATÓRIO
  "amount": number,                  // OBRIGATÓRIO
  "dueDate": "ISO-8601" | null,
  "category": "string",              // OBRIGATÓRIO - use "Outros" se não souber
  "status": "pending" | "paid" | "overdue" | "cancelled" | null,
  "paidDate": "ISO-8601" | null,
  "paidAmount": number | null,
  "vendor": "string" | null,
  "invoiceNumber": "string" | null,
  "contractId": "string" | null,
  "notes": "string" | null
}

═══════════════════════════════════════════════════════════════════
FORMATO DE RESPOSTA
═══════════════════════════════════════════════════════════════════

Retorne APENAS um objeto JSON válido neste formato:

{
  "contracts": [ /* array de contratos */ ],
  "receivables": [ /* array de recebíveis */ ],
  "expenses": [ /* array de despesas */ ]
}

IMPORTANTE:
• Retorne apenas JSON válido, sem markdown, sem explicações
• Arrays vazios são permitidos se não houver entidades daquele tipo
• Extraia TODAS as entidades encontradas
• Use valores null para campos opcionais não encontrados
• Formate datas no padrão ISO-8601 (ex: "2024-01-15T00:00:00.000Z")
• Valores monetários devem ser números (sem símbolos de moeda)`

    try {
      // Call Claude Vision API with extended thinking for complex calculations
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        temperature: 1,
        thinking: {
          type: 'enabled',
          budget_tokens: 10000
        },
        messages: [{
          role: 'user',
          content: [
            {
              type: contentType as 'document' | 'image',
              source: {
                type: 'base64',
                media_type: mediaType as any,
                data: fileBuffer.toString('base64')
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }]
      })

      // Extract JSON from response (skip thinking blocks)
      let responseText = ''
      for (const block of message.content) {
        if (block.type === 'text') {
          responseText = block.text
          break
        }
      }

      const thinkingBlocks = message.content.filter(b => b.type === 'thinking')
      if (thinkingBlocks.length > 0) {
        console.log(`💭 Claude used ${thinkingBlocks.length} thinking block(s) for reasoning`)
      }

      if (!responseText.trim()) {
        throw new Error('Claude did not return any data from the file')
      }

      // Extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Claude did not return valid JSON')
      }

      // Parse JSON (direct parse, no repair needed for V2)
      const extractedData = JSON.parse(jsonMatch[0]) as ExtractionResult

      console.log(`✅ Vision extraction: ${extractedData.contracts.length}c, ${extractedData.receivables.length}r, ${extractedData.expenses.length}e`)

      return extractedData
    } catch (error) {
      console.error('Vision extraction error:', error)
      throw new ServiceError(
        `Failed to extract data from ${fileType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VISION_EXTRACTION_ERROR',
        500
      )
    }
  }

  /**
   * Helper: Get image media type from filename
   */
  private getImageMediaType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop()
    const mediaTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }
    return mediaTypes[ext || 'png'] || 'image/png'
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MAIN ENTRY POINT: PROCESS FILE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async processFile(
    fileBuffer: Buffer,
    filename: string,
    professionOverride?: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    const metrics: PerformanceMetrics = {
      phase1_structure: 0,
      phase2_analysis: 0,
      phase3_extraction: 0,
      phase4_bulkcreate: 0,
      total: 0
    }

    try {
      const fileType = this.fileDetector.detectFileType(filename, fileBuffer)

      console.log('\n' + '='.repeat(80))
      console.log('🚀 OPTIMIZED FILE IMPORT: Unified Analysis + Deterministic Extraction')
      console.log('='.repeat(80))
      console.log(`📁 File: ${filename} (${fileType.toUpperCase()})`)
      console.log(`⚙️  Model: ${this.useHaiku ? 'Haiku 4.5' : 'Sonnet 4'}`)

      // Handle PDF/Image files with vision extraction
      if (fileType === 'pdf' || fileType === 'image') {
        console.log(`\n🖼️ VISION EXTRACTION: ${fileType.toUpperCase()}`)
        const extractedData = await this.extractFromVisionDirect(fileBuffer, filename, fileType, professionOverride)

        // Apply post-processing
        const processedData = this.dataTransformer.postProcessEntities(extractedData)

        // Bulk creation
        console.log('\n💾 PHASE 4: Bulk Creation')
        const phase4Start = Date.now()
        const creationResult = await this.bulkCreateEntities(processedData)
        metrics.phase4_bulkcreate = Date.now() - phase4Start

        metrics.total = Date.now() - startTime

        console.log('\n' + '='.repeat(80))
        console.log('📊 PERFORMANCE METRICS')
        console.log('='.repeat(80))
        console.log(`Vision Extraction:        ~${metrics.total - metrics.phase4_bulkcreate}ms`)
        console.log(`Phase 4 (Bulk Create):    ${metrics.phase4_bulkcreate}ms`)
        console.log('─'.repeat(80))
        console.log(`TOTAL:                    ${metrics.total}ms (${(metrics.total / 1000).toFixed(1)}s)`)
        console.log('='.repeat(80))
        console.log('\n✅ Processing Complete')

        return creationResult
      }

      if (fileType !== 'xlsx' && fileType !== 'csv') {
        throw new ServiceError(
          'Unsupported file type. Please upload XLSX, CSV, PDF, or image files.',
          'UNSUPPORTED_FILE_TYPE',
          400
        )
      }

      // PHASE 1: File Structure Extraction (<0.1s, pure code)
      console.log('\n📊 PHASE 1: File Structure Extraction...')
      const phase1Start = Date.now()

      const workbook = this.excelParser.parseWorkbook(fileBuffer)
      const sheetsData = this.excelParser.extractSheetsData(workbook, {
        supportMixedSheets: this.supportMixedSheets,
        detectHeaders: true
      })

      metrics.phase1_structure = Date.now() - phase1Start
      console.log(`   ⏱️  Phase 1: ${metrics.phase1_structure}ms`)
      console.log(`   📄 Found ${sheetsData.length} sheets with data`)

      // PHASE 2+3: Mixed Sheet Analysis & Extraction
      // Uses processSheetWithMixedSupport for automatic homogeneous/mixed detection
      console.log('\n🧠 PHASE 2+3: Analysis & Extraction (with mixed sheet support)...')
      const phase2Start = Date.now()

      // Process all sheets in parallel with mixed sheet support
      const sheetResults = await Promise.all(
        sheetsData.map(sheet =>
          this.processSheetWithMixedSupport(sheet, filename, professionOverride)
        )
      )

      const phase3End = Date.now()
      const totalPhase23Time = phase3End - phase2Start

      // Combine results from all sheets
      const extractedData: ExtractionResult = {
        contracts: [],
        receivables: [],
        expenses: []
      }

      for (const result of sheetResults) {
        extractedData.contracts.push(...result.contracts)
        extractedData.receivables.push(...result.receivables)
        extractedData.expenses.push(...result.expenses)
      }

      metrics.phase2_analysis = totalPhase23Time // Combined time for simplicity
      metrics.phase3_extraction = 0 // Already included in phase2_analysis

      console.log(`   ⏱️  Phase 2+3: ${totalPhase23Time}ms (${(totalPhase23Time / 1000).toFixed(1)}s)`)
      console.log(`   📦 Extracted: ${extractedData.contracts.length}c, ${extractedData.receivables.length}r, ${extractedData.expenses.length}e`)

      // POST-PROCESSING: Fill required fields
      const processedData = this.dataTransformer.postProcessEntities(extractedData)

      // PHASE 4: Bulk Creation (1-2s, parallel by entity type)
      const phase4Start = Date.now()
      const result = await this.bulkCreateEntities(processedData)
      metrics.phase4_bulkcreate = Date.now() - phase4Start
      console.log(`   ⏱️  Phase 4: ${metrics.phase4_bulkcreate}ms`)

      // Calculate total time
      metrics.total = Date.now() - startTime

      // Print performance summary
      console.log('\n' + '='.repeat(80))
      console.log('📊 PERFORMANCE METRICS')
      console.log('='.repeat(80))
      console.log(`Phase 1 (Structure):      ${metrics.phase1_structure}ms (${(metrics.phase1_structure / metrics.total * 100).toFixed(1)}%)`)
      console.log(`Phase 2 (Analysis):       ${metrics.phase2_analysis}ms (${(metrics.phase2_analysis / metrics.total * 100).toFixed(1)}%)`)
      console.log(`Phase 3 (Extraction):     ${metrics.phase3_extraction}ms (${(metrics.phase3_extraction / metrics.total * 100).toFixed(1)}%)`)
      console.log(`Phase 4 (Bulk Create):    ${metrics.phase4_bulkcreate}ms (${(metrics.phase4_bulkcreate / metrics.total * 100).toFixed(1)}%)`)
      console.log('─'.repeat(80))
      console.log(`TOTAL:                    ${metrics.total}ms (${(metrics.total / 1000).toFixed(1)}s)`)
      console.log('='.repeat(80))

      console.log('\n✅ Processing Complete')

      return result

    } catch (error) {
      console.error('❌ Processing Error:', error)
      throw new ServiceError(
        `File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FILE_PROCESSING_ERROR',
        500
      )
    }
  }
}
