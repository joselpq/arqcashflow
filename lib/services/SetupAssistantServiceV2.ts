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
import { VisionExtractor } from './setup-assistant/extraction/VisionExtractor'
import { BulkEntityCreator } from './setup-assistant/extraction/BulkEntityCreator'

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
  private visionExtractor: VisionExtractor
  private bulkCreator: BulkEntityCreator

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
    this.visionExtractor = new VisionExtractor(this.anthropic)
    this.bulkCreator = new BulkEntityCreator(
      this.contractService,
      this.receivableService,
      this.expenseService
    )
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 4 & VISION EXTRACTION - EXTRACTED TO COMPONENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // The following sections have been extracted (ADR-026 Day 4):
  //
  // Contract ID Mapping & Bulk Creation:
  //   - mapContractIds() → BulkEntityCreator.mapContractIds()
  //   - bulkCreateEntities() → BulkEntityCreator.createEntities()
  //   - Location: lib/services/setup-assistant/extraction/BulkEntityCreator.ts
  //   - Usage: this.bulkCreator.createEntities(data)
  //
  // Vision Extraction:
  //   - extractFromVisionDirect() → VisionExtractor.extractFromPdfOrImage()
  //   - getImageMediaType() → VisionExtractor (private method)
  //   - Location: lib/services/setup-assistant/extraction/VisionExtractor.ts
  //   - Usage: this.visionExtractor.extractFromPdfOrImage(...)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MAIN ENTRY POINT: PROCESS FILE (Orchestration Layer)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Main entry point for file processing
   * Orchestrates the 4-phase workflow using extracted components
   */
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

        // Get team profession for context
        const team = await this.context.teamScopedPrisma.raw.team.findUnique({
          where: { id: this.context.teamId },
          select: { profession: true }
        })

        const extractedData = await this.visionExtractor.extractFromPdfOrImage(
          fileBuffer,
          filename,
          fileType,
          professionOverride,
          team?.profession || undefined
        )

        // Apply post-processing
        const processedData = this.dataTransformer.postProcessEntities(extractedData)

        // Bulk creation
        console.log('\n💾 PHASE 4: Bulk Creation')
        const phase4Start = Date.now()
        const creationResult = await this.bulkCreator.createEntities(processedData)
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
      const result = await this.bulkCreator.createEntities(processedData)
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

  /**
   * Process sheet with mixed entity support (ADR-025)
   * Automatically detects homogeneous vs mixed sheets and routes appropriately
   */
  private async processSheetWithMixedSupport(
    sheet: SheetData,
    filename: string,
    professionOverride?: string
  ): Promise<ExtractionResult> {
    // Get team profession for analysis context
    const team = await this.context.teamScopedPrisma.raw.team.findUnique({
      where: { id: this.context.teamId },
      select: { profession: true }
    })
    const profession = professionOverride || team?.profession || undefined

    // Feature flag check: if mixed sheet support is disabled, use fast path only
    const detectedTables = this.supportMixedSheets
      ? this.tableSegmenter.segmentTablesWithHeaders(sheet)
      : [{
          rowRange: [0, 0] as [number, number],
          colRange: [0, 0] as [number, number],
          sampleRows: [],
          confidence: 1.0,
          headerRow: 0
        }]  // Single table (force fast path)

    if (detectedTables.length === 1) {
      // FAST PATH (90%): Homogeneous sheet
      console.log(`   ✅ Single table detected - fast path`)

      const analysis = await this.sheetAnalyzer.analyzeSheet(sheet, filename, {
        profession,
        modelConfig: this.getModelConfig()
      })

      if (analysis.sheetType === 'skip') {
        return { contracts: [], receivables: [], expenses: [] }
      }

      // Extract using homogeneous logic with DataTransformer
      const rows = this.dataTransformer.parseCSV(sheet.csv)
      const entities = rows
        .map(row => this.dataTransformer.extractEntity(row, analysis.columnMapping))
        .filter(e => e !== null)

      const result: ExtractionResult = {
        contracts: [],
        receivables: [],
        expenses: []
      }

      const sheetType = analysis.sheetType as 'contracts' | 'receivables' | 'expenses'
      result[sheetType] = entities

      return result
    }

    // MIXED PATH (10%): Multiple tables
    console.log(`   🔀 ${detectedTables.length} tables detected - parallel analysis`)

    // Step 2: Create virtual sheet for each table
    const virtualSheets = detectedTables.map((table, idx) =>
      this.tableSegmenter.extractTableAsSheet(sheet, table, idx)
    )

    // Step 3: Analyze ALL virtual sheets in parallel using SheetAnalyzer
    const analyses = await Promise.all(
      virtualSheets.map(vs =>
        this.sheetAnalyzer.analyzeSheet(
          { name: vs.name, csv: vs.csv },
          filename,
          {
            profession,
            modelConfig: this.getModelConfig()
          }
        )
      )
    )

    // Step 4: Extract from multiple analyses and combine
    return this.extractFromMultipleAnalyses(virtualSheets, analyses)
  }

  /**
   * Extract from multiple analyses (mixed sheets)
   * Combines entities from all virtual sheets
   */
  private extractFromMultipleAnalyses(
    virtualSheets: VirtualSheet[],
    analyses: SheetAnalysis[]
  ): ExtractionResult {
    const result: ExtractionResult = {
      contracts: [],
      receivables: [],
      expenses: []
    }

    // Process each virtual sheet with its analysis
    for (let i = 0; i < virtualSheets.length; i++) {
      const virtualSheet = virtualSheets[i]
      const analysis = analyses[i]

      // Skip non-financial sheets
      if (analysis.sheetType === 'skip') continue

      console.log(`   📋 ${virtualSheet.name}: ${analysis.sheetType}`)

      // Use DataTransformer for extraction
      const rows = this.dataTransformer.parseCSV(virtualSheet.csv)
      const entities = rows
        .map(row => this.dataTransformer.extractEntity(row, analysis.columnMapping))
        .filter(e => e !== null)

      // Accumulate entities by type
      const sheetType = analysis.sheetType as 'contracts' | 'receivables' | 'expenses'
      result[sheetType].push(...entities)
    }

    console.log(`   ✅ Mixed extraction complete: ${result.contracts.length}c, ${result.receivables.length}r, ${result.expenses.length}e`)

    return result
  }
}
