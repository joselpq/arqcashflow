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

/**
 * Column mapping for deterministic extraction
 */
interface ColumnMapping {
  [csvColumn: string]: {
    field: string
    transform: 'date' | 'currency' | 'status' | 'text' | 'number' | 'enum'
    enumValues?: string[]
  }
}

/**
 * Sheet type classification for unified analysis
 */
type SheetType = 'contracts' | 'receivables' | 'expenses' | 'skip'

/**
 * Unified sheet analysis result (from ONE AI call)
 * Current version: single entity type per sheet (no mixed types yet)
 */
interface SheetAnalysis {
  sheetName: string
  sheetType: SheetType
  columnMapping: ColumnMapping
}

/**
 * Table boundary detection for mixed entity sheet support (ADR-025)
 */
interface TableBoundary {
  type: 'vertical' | 'horizontal'
  position: number      // Row or column index where boundary starts
  confidence: number    // 0-1 score based on blank sequence length
  blankLength: number   // Number of consecutive blank rows/columns
}

/**
 * Detected table region within a sheet (ADR-025)
 */
interface DetectedTable {
  rowRange: [number, number]
  colRange: [number, number]
  headerRow?: number          // Detected header within this region
  sampleRows: string[][]      // First 20 rows for AI context
  confidence: number          // Overall confidence in this table
}

/**
 * Virtual sheet created from a detected table (ADR-025)
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

  constructor(context: ServiceContext) {
    super(context, 'setup_assistant_v2', [])

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
    })

    this.contractService = new ContractService(context)
    this.receivableService = new ReceivableService(context)
    this.expenseService = new ExpenseService(context)
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
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private detectFileType(filename: string, buffer: Buffer): FileType {
    const ext = filename.toLowerCase().split('.').pop()

    if (ext === 'xlsx' || ext === 'xls') return 'xlsx'
    if (ext === 'csv') return 'csv'
    if (ext === 'pdf') return 'pdf'
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return 'image'

    if (buffer.length >= 2) {
      if (buffer[0] === 0x25 && buffer[1] === 0x50) return 'pdf'
      if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image'
      if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image'
      if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image'
    }

    throw new ServiceError(
      'Unsupported file type. Please upload XLSX, CSV, PDF, or image files.',
      'INVALID_FILE_TYPE',
      400
    )
  }

  private parseXlsx(fileBuffer: Buffer): XLSX.WorkBook {
    try {
      return XLSX.read(fileBuffer, { type: 'buffer' })
    } catch (error) {
      throw new ServiceError(
        'Failed to parse Excel file. Please ensure the file is not corrupted.',
        'PARSE_ERROR',
        400
      )
    }
  }

  /**
   * Extract sheets with NORMALIZED data using Excel cell metadata
   * This approach reads raw cell values and types BEFORE CSV conversion
   * Benefits:
   * - Dates are properly formatted (yyyy-mm-dd)
   * - Numbers are actual numbers (not formatted strings)
   * - Preserves precision for currency values
   * - Detects header row correctly (handles title rows, metadata, etc.)
   */
  private extractSheetsData(workbook: XLSX.WorkBook): SheetData[] {
    const sheetsData: SheetData[] = []

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]

      // Step 1: Get raw data as array of arrays (with Excel date formatting)
      const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, {
        header: 1,         // Return array of arrays (not objects)
        raw: false,        // Format dates/numbers as strings
        dateNF: 'yyyy-mm-dd',  // Standardize date format to ISO
        defval: ''         // Empty cells become empty strings
      })

      if (rawData.length === 0) continue

      // Step 2: For mixed sheet support, we DON'T detect headers here!
      // We need to preserve the entire sheet structure (including title rows, multiple headers)
      // Header detection will happen within each segmented table

      // However, for backward compatibility with homogeneous sheets,
      // we still detect headers to skip title rows at the top
      let startRowIndex = 0
      if (!this.supportMixedSheets) {
        // Legacy behavior: detect and use first header row
        let headerRowIndex = -1
        let bestScore = 0
        for (let i = 0; i < Math.min(5, rawData.length); i++) {
          const row = rawData[i]
          if (!row || row.length === 0) continue

          const score = this.scoreAsHeaderRow(row.map(v => String(v || '')))
          if (score >= 3 && score > bestScore) {
            bestScore = score
            headerRowIndex = i
          }
        }

        if (headerRowIndex !== -1) {
          console.log(`   🔍 Detected headers in row ${headerRowIndex + 1} (score: ${bestScore})`)
          startRowIndex = headerRowIndex
        } else {
          console.log(`   ⚠️  No headers detected in "${sheetName}", skipping`)
          continue
        }
      } else {
        // Mixed sheet mode: include ALL rows from the start
        console.log(`   🔍 Mixed sheet mode: preserving all ${rawData.length} rows for boundary detection`)
      }

      // Step 3: Extract ALL rows from start point (no header row used)
      const allRows = rawData.slice(startRowIndex)

      // CRITICAL: DO NOT filter empty rows here!
      // We need to preserve blank rows for mixed sheet boundary detection (ADR-025)
      // Empty rows will be handled during table segmentation

      // Only skip if there are literally no rows at all
      if (allRows.length === 0) continue

      // Step 4: Convert to CSV format (WITHOUT assuming headers!)
      const escapeCsvValue = (value: any): string => {
        const str = String(value || '')
        // Escape values containing commas, quotes, or newlines
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }

      // For mixed sheet mode: convert ALL rows as-is (each row determines its own column count)
      // For legacy mode: still use header-based column structure
      const csvRows = allRows.map(row => {
        if (!row) return ''
        // Determine max columns in this row
        const maxCols = row.length
        const cells: string[] = []
        for (let i = 0; i < maxCols; i++) {
          cells.push(escapeCsvValue(row[i]))
        }
        return cells.join(',')
      })

      const csv = csvRows.join('\n')

      if (csv.trim() === '') continue

      sheetsData.push({
        name: sheetName,
        csv: csv
      })
    }

    return sheetsData
  }


  /**
   * Score a row based on how likely it is to be a header row
   * Higher score = more likely to be headers
   */
  private scoreAsHeaderRow(cells: string[]): number {
    let score = 0

    // Count cells with text (not numbers, not empty)
    const textCells = cells.filter(c => {
      if (c === '') return false
      // Not a number
      if (/^[\d\s,.$%R-]+$/.test(c)) return false
      return true
    })

    // More text cells = more likely headers
    score += Math.min(textCells.length, 5)

    // Check for common header keywords (Portuguese and generic)
    const headerKeywords = [
      'nome', 'data', 'valor', 'status', 'descrição', 'categoria',
      'projeto', 'cliente', 'fornecedor', 'parcela', 'tipo',
      'name', 'date', 'value', 'description', 'category'
    ]

    const hasKeywords = cells.some(c =>
      headerKeywords.some(kw => c.toLowerCase().includes(kw))
    )

    if (hasKeywords) score += 3

    // Check if row has consistent non-empty cells (headers usually fill most columns)
    const nonEmptyRatio = cells.filter(c => c !== '').length / cells.length
    if (nonEmptyRatio > 0.5) score += 2

    return score
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TABLE BOUNDARY DETECTION (ADR-025: Mixed Entity Sheet Support)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Check if row is completely blank
   * A row is blank if all cells are empty or contain only commas
   */
  private isRowBlank(row: string[]): boolean {
    return row.every(cell => {
      const cleaned = cell.trim()
      return cleaned === '' || cleaned === ',' || /^,+$/.test(cleaned)
    })
  }

  /**
   * Check if column is blank across all rows
   * A column is blank if >95% of rows have empty cells in that column
   */
  private isColumnBlank(rows: string[][], colIndex: number): boolean {
    if (rows.length === 0) return true

    const blankCount = rows.filter(row => {
      const cell = row[colIndex] || ''
      return cell.trim() === ''
    }).length

    return blankCount / rows.length >= 0.95
  }

  /**
   * Detect vertical table boundaries (blank rows between filled sections)
   *
   * Pattern:
   *   Rows 1-10: Data (filled)
   *   Rows 11-12: Empty
   *   Rows 13-25: Data (filled)
   *
   * Result: Boundary at row 11 (confidence based on blank length)
   */
  private detectBlankRows(rows: string[][]): TableBoundary[] {
    const boundaries: TableBoundary[] = []
    let lastFilledRow = -1
    let blankSequenceStart = -1

    for (let i = 0; i < rows.length; i++) {
      const isBlank = this.isRowBlank(rows[i])

      if (!isBlank) {
        // Current row has data
        if (blankSequenceStart !== -1) {
          // We just exited a blank sequence
          // Create boundary if we had filled rows before the blank sequence
          if (lastFilledRow !== -1) {
            const blankLength = i - blankSequenceStart
            boundaries.push({
              type: 'vertical',
              position: blankSequenceStart,
              confidence: Math.min(1.0, blankLength / 2),  // 2+ blank rows = high confidence
              blankLength
            })
          }
          blankSequenceStart = -1
        }
        lastFilledRow = i
      } else {
        // Current row is blank
        if (blankSequenceStart === -1 && lastFilledRow !== -1) {
          // Starting a new blank sequence after filled rows
          blankSequenceStart = i
        }
      }
    }

    return boundaries.filter(b => b.confidence >= 0.5)  // Filter low-confidence boundaries
  }

  /**
   * Detect horizontal table boundaries (blank columns between filled sections)
   *
   * Pattern:
   *   Cols A-C: Data (filled)
   *   Col D: Empty
   *   Cols E-G: Data (filled)
   *
   * Result: Boundary at col 3 (D)
   */
  private detectBlankColumns(rows: string[][]): TableBoundary[] {
    if (rows.length === 0) return []

    const numCols = Math.max(...rows.map(r => r.length))
    const boundaries: TableBoundary[] = []

    let lastFilledCol = -1
    let blankSequenceStart = -1

    for (let col = 0; col < numCols; col++) {
      const isBlank = this.isColumnBlank(rows, col)

      if (!isBlank) {
        if (blankSequenceStart !== -1) {
          // Create boundary if we had filled columns before the blank sequence
          if (lastFilledCol !== -1) {
            const blankLength = col - blankSequenceStart
            boundaries.push({
              type: 'horizontal',
              position: blankSequenceStart,
              confidence: Math.min(1.0, blankLength / 1.5),  // Even 1 blank col is significant
              blankLength
            })
          }
          blankSequenceStart = -1
        }
        lastFilledCol = col
      } else {
        if (blankSequenceStart === -1 && lastFilledCol !== -1) {
          blankSequenceStart = col
        }
      }
    }

    return boundaries.filter(b => b.confidence >= 0.5)
  }

  /**
   * Check if region is entirely blank
   */
  private isBlankRegion(
    rows: string[][],
    rowStart: number,
    rowEnd: number,
    colStart: number,
    colEnd: number
  ): boolean {
    for (let r = rowStart; r <= rowEnd; r++) {
      const row = rows[r] || []
      for (let c = colStart; c <= colEnd; c++) {
        const cell = row[c] || ''
        if (cell.trim() !== '') return false
      }
    }
    return true
  }

  /**
   * Detect header row within a region using existing scoring heuristic
   * Returns the index within the region (not absolute row index)
   */
  private detectHeaderInRegion(regionRows: string[][]): number {
    let bestScore = 0
    let bestRow = -1

    // Check first 5 rows for header pattern
    for (let i = 0; i < Math.min(5, regionRows.length); i++) {
      const score = this.scoreAsHeaderRow(regionRows[i].map(c => String(c)))
      if (score >= 3 && score > bestScore) {
        bestScore = score
        bestRow = i
      }
    }

    return bestRow
  }

  /**
   * Calculate confidence score for a detected table
   * Confidence based on: header presence, data row count, column count
   */
  private calculateRegionConfidence(regionRows: string[][], headerRow: number): number {
    let confidence = 0.3  // Base confidence

    // Has detected header = +0.3
    if (headerRow !== -1) confidence += 0.3

    // Has multiple data rows = +0.2
    const dataRowCount = headerRow !== -1
      ? regionRows.length - headerRow - 1
      : regionRows.length
    if (dataRowCount >= 3) confidence += 0.2

    // Has meaningful column count = +0.2
    const avgCellsPerRow = regionRows.reduce((sum, r) =>
      sum + r.filter(c => c.trim() !== '').length, 0
    ) / regionRows.length
    if (avgCellsPerRow >= 3) confidence += 0.2

    return Math.min(1.0, confidence)
  }

  /**
   * Segment sheet into discrete tables based on detected boundaries
   * Returns array of table regions with metadata
   */
  private segmentTables(
    rows: string[][],
    verticalBoundaries: TableBoundary[],
    horizontalBoundaries: TableBoundary[]
  ): DetectedTable[] {

    // If no boundaries detected, entire sheet is one table (homogeneous case)
    if (verticalBoundaries.length === 0 && horizontalBoundaries.length === 0) {
      const numCols = Math.max(...rows.map(r => r.length), 0)
      return [{
        rowRange: [0, rows.length - 1],
        colRange: [0, numCols - 1],
        sampleRows: rows.slice(0, 20),
        confidence: 1.0
      }]
    }

    // Create partition boundaries (include start/end)
    const rowPartitions = [
      0,
      ...verticalBoundaries.map(b => b.position),
      rows.length
    ].sort((a, b) => a - b)

    const numCols = Math.max(...rows.map(r => r.length), 0)
    const colPartitions = [
      0,
      ...horizontalBoundaries.map(b => b.position),
      numCols
    ].sort((a, b) => a - b)

    const tables: DetectedTable[] = []

    // Create table for each region (Cartesian product of partitions)
    for (let v = 0; v < rowPartitions.length - 1; v++) {
      for (let h = 0; h < colPartitions.length - 1; h++) {
        const rowStart = rowPartitions[v]
        const rowEnd = rowPartitions[v + 1] - 1
        const colStart = colPartitions[h]
        const colEnd = colPartitions[h + 1] - 1

        // Skip if this region overlaps with a blank boundary
        if (this.isBlankRegion(rows, rowStart, rowEnd, colStart, colEnd)) {
          continue
        }

        // Extract region data
        const regionRows = rows.slice(rowStart, rowEnd + 1).map(row =>
          row.slice(colStart, colEnd + 1)
        )

        // Check if region has meaningful data (not just headers)
        const dataRowCount = regionRows.filter(r => !this.isRowBlank(r)).length
        if (dataRowCount < 2) continue  // Need at least 2 rows (header + data)

        // Detect header row within this region
        const headerRow = this.detectHeaderInRegion(regionRows)

        tables.push({
          rowRange: [rowStart, rowEnd],
          colRange: [colStart, colEnd],
          headerRow: headerRow !== -1 ? rowStart + headerRow : undefined,
          sampleRows: regionRows.slice(0, 20),
          confidence: this.calculateRegionConfidence(regionRows, headerRow)
        })
      }
    }

    return tables.filter(t => t.confidence >= 0.3)  // Filter very low confidence regions
  }

  /**
   * Convenience method: Detect tables with headers in one call
   * Combines boundary detection + segmentation + header detection
   */
  private segmentTablesWithHeaders(sheet: SheetData): DetectedTable[] {
    // Parse CSV to array of arrays
    const rows = sheet.csv.split('\n').map(line => {
      // Simple CSV parsing (reuse existing parseCSVLine)
      return this.parseCSVLine(line)
    })

    if (rows.length === 0) return []

    // Detect boundaries
    const verticalBoundaries = this.detectBlankRows(rows)
    const horizontalBoundaries = this.detectBlankColumns(rows)

    // Segment tables based on boundaries
    const tables = this.segmentTables(rows, verticalBoundaries, horizontalBoundaries)

    // 🔍 DIAGNOSTIC: Log table detection results
    if (tables.length > 1) {
      console.log(`   🔀 Mixed sheet detected: ${tables.length} tables`)
      tables.forEach((table, idx) => {
        console.log(`      Table ${idx + 1}: rows ${table.rowRange[0]}-${table.rowRange[1]}, ` +
                    `cols ${table.colRange[0]}-${table.colRange[1]}, ` +
                    `confidence: ${(table.confidence * 100).toFixed(0)}%`)
      })
    }

    return tables
  }

  /**
   * Extract a detected table as a standalone virtual sheet
   * Converts table region to CSV format for AI analysis
   */
  private extractTableAsSheet(
    sheet: SheetData,
    table: DetectedTable,
    tableIndex: number
  ): VirtualSheet {
    // Parse original CSV
    const allRows = sheet.csv.split('\n').map(line => this.parseCSVLine(line))

    // Extract rows for this table region
    const tableRows = allRows.slice(table.rowRange[0], table.rowRange[1] + 1)

    // Extract columns for this table region (if horizontal split)
    const tableData = tableRows.map(row =>
      row.slice(table.colRange[0], table.colRange[1] + 1)
    )

    // Ensure we have a header row
    let headers: string[]
    let dataRows: string[][]

    if (table.headerRow !== undefined) {
      // Header was detected - use it
      const headerIdx = table.headerRow - table.rowRange[0]
      headers = tableData[headerIdx]
      dataRows = tableData.slice(headerIdx + 1)
    } else {
      // No header detected - first row becomes header by default
      headers = tableData[0]
      dataRows = tableData.slice(1)
    }

    // Convert back to CSV format
    const escapeCsvValue = (value: string): string => {
      const str = String(value || '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csv = [
      headers.map(escapeCsvValue).join(','),
      ...dataRows.map(row => row.map(escapeCsvValue).join(','))
    ].join('\n')

    return {
      name: `${sheet.name}_table${tableIndex}`,
      csv,
      originalSheet: sheet.name,
      tableIndex,
      rowRange: table.rowRange,
      colRange: table.colRange,
      headerRow: table.headerRow
    }
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 2: UNIFIED SHEET ANALYSIS (AI, Parallel, ONE call per sheet)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Unified sheet analysis: column mapping + entity type detection in ONE call
   * This is the key optimization over V2 (which made TWO calls)
   */
  private async analyzeSheetUnified(
    sheet: SheetData,
    filename: string,
    professionOverride?: string
  ): Promise<SheetAnalysis> {
    const professionConfig = getProfessionConfig(professionOverride)
    const modelConfig = this.getModelConfig()

    // Extract headers and sample rows
    const rows = sheet.csv.split('\n')
    const headers = rows[0]
    const sampleRows = rows.slice(1, Math.min(21, rows.length)).join('\n') // First 20 data rows

    // 🔍 DIAGNOSTIC: Show what we're sending to AI
    console.log(`\n   🔍 ANALYZING "${sheet.name}":`)
    console.log(`      Headers: ${headers}`)
    console.log(`      Sample rows: ${Math.min(20, rows.length - 1)}`)

    const prompt = `
Você é um especialista em análise de planilhas financeiras brasileiras.

CONTEXTO DO NEGÓCIO:
- Profissão: ${professionConfig.businessContext.professionName}
- Descrição: ${professionConfig.businessContext.summaryContext}

PLANILHA A ANALISAR:
- Nome: "${sheet.name}"
- Arquivo: "${filename}"

CABEÇALHOS DAS COLUNAS:
${headers}

AMOSTRA DOS DADOS (primeiras 20 linhas para entender o tipo de dados):
${sampleRows}

SUA TAREFA:
Analise esta planilha e determine:
1. Que tipo de entidade financeira esta planilha contém?
2. Como cada coluna se mapeia para nossos campos de schema dessa entidade?
3. Retorne UM JSON para esta planilha, conforme instruções abaixo

TIPOS DE ENTIDADE (escolha UM):

A) "receivables" - Recebíveis (DINHEIRO ENTRANDO)
${professionConfig.businessContext.revenueDescription}
Indicadores comuns: "recebimento", "parcela", "cobrança", "RT", "medição", "fatura", "nota fiscal saída"
Exemplo: Parcelas a receber de clientes, RTs de fornecedores, medições aprovadas

B) "expenses" - Despesas (DINHEIRO SAINDO)
${professionConfig.businessContext.expenseDescription}
Indicadores comuns: "pagamento", "despesa", "custo", "a pagar", "fornecedor" (quando você é o cliente)
Exemplo: Contas a pagar, compras, custos operacionais

C) "contracts" - ${professionConfig.terminology.contracts}
${professionConfig.businessContext.projectTypes}
Indicadores comuns: "cliente", "projeto", "contrato", "valor total", "assinatura"
Exemplo: Novos projetos, contratos fechados com clientes

D) "skip" - NÃO é dado financeiro
Use para: instruções, metadados, planilhas de configuração, totais, resumos
Indicadores: "instruções", "como usar", "legenda", "configuração", "resumo"
Exemplo: Abas de instruções, legendas, ou dados não financeiros

SCHEMAS DISPONÍVEIS (use a terminologia exata):

RECEIVABLES (Recebíveis):
- contractId: texto - referência ao ${professionConfig.terminology.project.toLowerCase()} (opcional)
- expectedDate: data - data esperada de recebimento (opcional)
- amount: moeda - valor do recebível (opcional)
- status: enum (pending, received, overdue) (opcional)
- receivedDate: data - data real do recebimento (opcional)
- receivedAmount: moeda - valor real recebido (opcional)
- description: texto - descrição adicional (opcional)

EXPENSES (Despesas):
- description: texto - descrição da despesa (opcional)
- amount: moeda - valor da despesa (opcional)
- dueDate: data - data de vencimento (opcional)
- category: texto - categoria da despesa (opcional)
- status: enum (pending, paid, overdue, cancelled) (opcional)
- paidDate: data - data do pagamento (opcional)
- paidAmount: moeda - valor pago (opcional)

CONTRACTS (${professionConfig.terminology.contracts}):
- clientName: texto - ${professionConfig.terminology.clientName.toLowerCase()} (opcional)
- projectName: texto - ${professionConfig.terminology.projectName.toLowerCase()} (opcional)
- totalValue: moeda - ${professionConfig.terminology.totalValue.toLowerCase()} (opcional)
- signedDate: data - ${professionConfig.terminology.signedDate.toLowerCase()} (opcional)
- status: enum (active, completed, paused, cancelled) (opcional)
- description: texto - descrição adicional (opcional)
- category: texto - categoria do projeto (opcional)

INSTRUÇÕES DE MAPEAMENTO:

1. MAPEIE TODAS AS COLUNAS (não filtre nada - a validação será feita depois)
2. Para cada coluna, identifique:
   - Qual campo do schema ela representa
   - Que tipo de transformação será necessária

3. TIPOS DE TRANSFORMAÇÃO (para o parser determinístico):
   - "date": datas em qualquer formato (15/04/2024, 2024-04-15, etc)
   - "currency": valores monetários (R$ 1.500,50, 1500.5, etc)
   - "status": status/estado (Pendente, Pago, Recebido, Ativo, etc)
   - "enum": valores categóricos fixos
   - "text": texto simples
   - "number": números inteiros (não monetários, ex: número de parcela)

4. Se uma coluna não corresponde a nenhum campo específico:
   - Mapeie para "description" (como informação adicional)
   - Ou use múltiplas colunas para preencher "description" concatenando informações

FORMATO DE SAÍDA (retorne APENAS JSON válido, SEM "rowTypes"):

{
  "sheetType": "receivables" | "expenses" | "contracts" | "skip",
  "columnMapping": {
    "Nome Exato da Coluna": {
      "field": "nomeDoCampo",
      "transform": "date" | "currency" | "status" | "text" | "number"
    }
  }
}

IMPORTANTE: Se sheetType = "skip", pode retornar columnMapping vazio: {}

EXEMPLO PRÁTICO:

Se a planilha "Controle RTs" tem:
- Colunas: "Nome do Projeto", "Valor da Parcela", "Data Recebimento", "Cobrado?"
- Dados: projetos, valores em R$, datas, status de cobrança

Isso indica RECEIVABLES (RTs = recebíveis), então:

{
  "sheetType": "receivables",
  "columnMapping": {
    "Nome do Projeto": {"field": "contractId", "transform": "text"},
    "Valor da Parcela": {"field": "amount", "transform": "currency"},
    "Data Recebimento": {"field": "receivedDate", "transform": "date"},
    "Cobrado?": {"field": "status", "transform": "status"}
  }
}

REGRAS CRÍTICAS:
- As chaves do columnMapping devem ser EXATAMENTE como aparecem no cabeçalho CSV (case-sensitive!)
- Retorne APENAS o JSON, sem texto adicional ou explicações
- NÃO inclua "rowTypes" (não estamos lidando com planilhas mistas nesta versão)
- A transformação será aplicada programaticamente, você apenas indica o tipo

Analise e retorne o JSON:
`.trim()

    try {
      const message = await this.anthropic.messages.create({
        model: modelConfig.model,
        max_tokens: modelConfig.maxTokens,
        temperature: 1,
        thinking: { type: 'enabled', budget_tokens: modelConfig.thinkingBudget },
        messages: [{ role: 'user', content: prompt }]
      })

      let responseText = ''
      for (const block of message.content) {
        if (block.type === 'text') {
          responseText = block.text
          break
        }
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in analysis response')
      }

      const analysis = JSON.parse(jsonMatch[0]) as {
        sheetType: SheetType
        columnMapping: ColumnMapping
      }

      console.log(`   ✅ ${sheet.name}: ${analysis.sheetType} (${Object.keys(analysis.columnMapping).length} columns mapped)`)

      // 🔍 DIAGNOSTIC: Show AI's classification and mapping
      console.log(`\n   🔍 AI ANALYSIS RESULT:`)
      console.log(`      Classified as: "${analysis.sheetType}"`)
      console.log(`      Column Mapping:`)
      for (const [csvCol, mapping] of Object.entries(analysis.columnMapping)) {
        console.log(`         "${csvCol}" → ${mapping.field} (${mapping.transform})`)
      }

      return {
        sheetName: sheet.name,
        sheetType: analysis.sheetType,
        columnMapping: analysis.columnMapping
      }

    } catch (error) {
      console.error(`   ❌ ${sheet.name}: Analysis failed:`, error)
      throw new ServiceError(
        `Sheet analysis failed for "${sheet.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ANALYSIS_ERROR',
        500
      )
    }
  }

  /**
   * Process sheet with mixed entity type support (ADR-025)
   * Automatically detects if sheet is homogeneous or mixed
   * Returns extracted entities grouped by type
   */
  private async processSheetWithMixedSupport(
    sheet: SheetData,
    filename: string,
    professionOverride?: string
  ): Promise<ExtractionResult> {

    // Feature flag check: if mixed sheet support is disabled, use fast path only
    const detectedTables = this.supportMixedSheets
      ? this.segmentTablesWithHeaders(sheet)
      : [{
          rowRange: [0, 0] as [number, number],
          colRange: [0, 0] as [number, number],
          sampleRows: [],
          confidence: 1.0
        }]  // Single table (force fast path)

    if (detectedTables.length === 1) {
      // FAST PATH (90%): Homogeneous sheet
      // Use existing ADR-024 analysis directly
      console.log(`   ✅ Single table detected - fast path`)
      const analysis = await this.analyzeSheetUnified(sheet, filename, professionOverride)

      if (analysis.sheetType === 'skip') {
        return { contracts: [], receivables: [], expenses: [] }
      }

      // Extract using homogeneous logic
      const rows = this.parseCSV(sheet.csv)
      const entities = rows
        .map(row => this.extractEntity(row, analysis.columnMapping))
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
      this.extractTableAsSheet(sheet, table, idx)
    )

    // Step 3: Analyze ALL virtual sheets in parallel
    // Each uses the EXISTING analyzeSheetUnified() with no modifications!
    const analyses = await Promise.all(
      virtualSheets.map(vs =>
        this.analyzeSheetUnified(
          { name: vs.name, csv: vs.csv },
          filename,
          professionOverride
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

      // Use existing ADR-024 extraction logic!
      const rows = this.parseCSV(virtualSheet.csv)
      const entities = rows
        .map(row => this.extractEntity(row, analysis.columnMapping))
        .filter(e => e !== null)

      // Accumulate entities by type
      const sheetType = analysis.sheetType as 'contracts' | 'receivables' | 'expenses'
      result[sheetType].push(...entities)
    }

    console.log(`   ✅ Mixed extraction complete: ${result.contracts.length}c, ${result.receivables.length}r, ${result.expenses.length}e`)

    return result
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 3: DETERMINISTIC EXTRACTION (Pure Code, <1s)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private transformValue(
    value: string | null | undefined,
    transform: ColumnMapping[string]['transform'],
    enumValues?: string[]
  ): any {
    if (!value || value.trim() === '') return null

    const cleaned = value.trim()

    switch (transform) {
      case 'currency':
        // With normalized Excel export (yyyy-mm-dd dates, clean numbers),
        // currency values should already be numeric or simple formatted
        // Handle: "3500", "3500.50", "R$ 3500", "R$ 3500.50"
        // NOTE: Excel's sheet_to_json with raw:false should give us clean numbers

        // Remove currency symbols and whitespace
        const currencyCleaned = cleaned
          .replace(/R\$\s*/g, '')
          .replace(/[^\d.,-]/g, '')
          .trim()

        if (!currencyCleaned) return null

        let parsedValue: number

        // If it's already a plain number (from Excel normalization), parse directly
        if (/^\d+(\.\d+)?$/.test(currencyCleaned)) {
          parsedValue = parseFloat(currencyCleaned)
        } else {
          // Otherwise, handle formatted strings
          // Detect format based on last separator and digit count
          const lastComma = currencyCleaned.lastIndexOf(',')
          const lastDot = currencyCleaned.lastIndexOf('.')

          if (lastComma > lastDot) {
            // Comma is the rightmost separator
            const afterComma = currencyCleaned.substring(lastComma + 1)

            // If 1-2 digits after comma → decimal separator (e.g., "3.500,50" = 3500.50)
            // If 3+ digits after comma → thousands separator (e.g., "3,500" = 3500)
            if (afterComma.length <= 2) {
              // Brazilian decimal: "15.000,50" → 15000.50
              parsedValue = parseFloat(
                currencyCleaned
                  .replace(/\./g, '')  // Remove thousands separator
                  .replace(',', '.')   // Convert decimal separator
              )
            } else {
              // Thousands only: "3,500" → 3500
              parsedValue = parseFloat(currencyCleaned.replace(/,/g, ''))
            }
          } else if (lastDot > lastComma) {
            // Dot is the rightmost separator
            const afterDot = currencyCleaned.substring(lastDot + 1)

            if (afterDot.length <= 2) {
              // US decimal: "15,000.50" → 15000.50
              parsedValue = parseFloat(currencyCleaned.replace(/,/g, ''))
            } else {
              // Thousands only: "3.500" → 3500
              parsedValue = parseFloat(currencyCleaned.replace(/\./g, ''))
            }
          } else {
            // No separators, just parse as-is
            parsedValue = parseFloat(currencyCleaned)
          }
        }

        // CRITICAL: Check for NaN and return null instead
        // parseFloat() returns NaN for invalid inputs, and Zod validation rejects NaN
        return isNaN(parsedValue) ? null : parsedValue

      case 'date':
        // Use centralized date normalization logic
        const normalizedDate = this.normalizeDate(cleaned)
        // If normalization returned today's date, the parse likely failed
        // But we still return it (post-processing will handle it)
        return normalizedDate

      case 'status':
      case 'enum':
        const statusMap: Record<string, string> = {
          'Ativo': 'active',
          'Concluído': 'completed',
          'Completo': 'completed',
          'Finalizado': 'completed',
          'Pausado': 'paused',
          'Cancelado': 'cancelled',
          'Recebido': 'received',
          'Pago': 'paid',
          'Pendente': 'pending',
          'A Pagar': 'pending',
          'A Receber': 'pending',
          'Atrasado': 'overdue',
          'Vencido': 'overdue',
          // Boolean-like values (Portuguese)
          'Sim': 'received',        // "yes" for receivables = received
          'Não': 'pending',          // "no" for receivables = pending
          'Verdadeiro': 'received',  // "true" = received
          'Falso': 'pending'         // "false" = pending
        }

        if (statusMap[cleaned]) {
          return statusMap[cleaned]
        }

        const lowerCleaned = cleaned.toLowerCase()
        for (const [key, value] of Object.entries(statusMap)) {
          if (key.toLowerCase() === lowerCleaned) {
            return value
          }
        }

        if (enumValues) {
          for (const enumValue of enumValues) {
            if (lowerCleaned.includes(enumValue.toLowerCase()) ||
                enumValue.toLowerCase().includes(lowerCleaned)) {
              return enumValue
            }
          }
        }

        return lowerCleaned

      case 'number':
        const normalized = cleaned.replace(/\./g, '').replace(',', '.')
        const numValue = parseFloat(normalized)
        // CRITICAL: Check for NaN and return null instead
        return isNaN(numValue) ? null : numValue

      case 'text':
      default:
        return cleaned
    }
  }

  private extractEntity(
    row: Record<string, string>,
    mapping: ColumnMapping
  ): any {
    const entity: any = {}

    for (const [csvColumn, config] of Object.entries(mapping)) {
      const rawValue = row[csvColumn]
      const transformedValue = this.transformValue(
        rawValue,
        config.transform,
        config.enumValues
      )

      // Handle duplicate field mappings: prioritize FIRST non-null value
      // Don't overwrite existing non-null values with null
      const currentValue = entity[config.field]

      if (currentValue === undefined || currentValue === null) {
        // Field is empty, set the new value (even if null)
        entity[config.field] = transformedValue
      } else if (transformedValue !== null && transformedValue !== undefined) {
        // Field has a value, but new value is also non-null
        // Keep first non-null value (don't overwrite)
        // This handles cases like: "Valor RT" (10285) vs "Valor da Parcela" (null)
      }
      // If currentValue is non-null and transformedValue is null, do nothing (keep current)
    }

    return entity
  }

  private parseCSV(csv: string): Record<string, string>[] {
    const lines = csv.split('\n')
    if (lines.length < 2) return []

    const headers = this.parseCSVLine(lines[0])
    const rows: Record<string, string>[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i])
      if (values.length === 0) continue

      const row: Record<string, string> = {}
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || ''
      }
      rows.push(row)
    }

    return rows
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // POST-PROCESSING: Fill required fields with defaults
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Post-process extracted entities with inference and validation
   * This bridges the gap between extraction (where all fields are optional)
   * and validation (where some fields are required)
   *
   * Same logic as original SetupAssistantService.postProcessWithInference
   */
  private postProcessEntities(data: ExtractionResult): ExtractionResult {
    console.log('\n🔧 POST-PROCESSING: Inference and validation...')

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today for date comparisons
    const todayISO = today.toISOString().substring(0, 10)

    let filteredContracts = 0
    let filteredReceivables = 0
    let filteredExpenses = 0

    // Process CONTRACTS
    data.contracts = data.contracts
      .filter(contract => {
        // Filter: both clientName and projectName null → SKIP
        if (!contract.clientName && !contract.projectName) {
          filteredContracts++
          return false
        }
        return true
      })
      .map(contract => {
        const processed = { ...contract }

        // Inference: clientName null → use projectName
        if (!processed.clientName) {
          processed.clientName = processed.projectName
        }
        // Inference: projectName null → use clientName
        if (!processed.projectName) {
          processed.projectName = processed.clientName
        }

        // Inference: status null → 'active'
        if (!processed.status) {
          processed.status = 'active'
        }

        // Normalize signedDate to ISO-8601 format
        if (processed.signedDate) {
          processed.signedDate = this.normalizeDate(processed.signedDate)
        }

        // Round currency values to 2 decimal places to avoid validation errors
        if (processed.totalValue !== null && processed.totalValue !== undefined) {
          processed.totalValue = Math.round(processed.totalValue * 100) / 100
        }

        return processed
      })

    // Process RECEIVABLES
    data.receivables = data.receivables
      .filter(receivable => {
        // Filter: amount null or <= 0 → SKIP
        if (!receivable.amount || receivable.amount <= 0) {
          filteredReceivables++
          if (filteredReceivables <= 3) {
            console.log(`   ⚠️  Filtered receivable #${filteredReceivables}: amount = ${receivable.amount}, contractId = ${receivable.contractId}`)
          }
          return false
        }
        return true
      })
      .map(receivable => {
        const processed = { ...receivable }

        // Inference: expectedDate null → current date
        if (!processed.expectedDate) {
          processed.expectedDate = todayISO
        } else {
          // Normalize expectedDate to ISO-8601 format
          processed.expectedDate = this.normalizeDate(processed.expectedDate)
        }

        // Inference: status null → based on expectedDate
        if (!processed.status) {
          const expectedDate = new Date(processed.expectedDate)
          expectedDate.setHours(0, 0, 0, 0)

          // pending for expectedDate >= today, received if in past
          if (expectedDate >= today) {
            processed.status = 'pending'
          } else {
            processed.status = 'received'
          }
        }

        // Inference: if status='received', fill receivedDate and receivedAmount
        if (processed.status === 'received') {
          if (!processed.receivedDate) {
            processed.receivedDate = processed.expectedDate
          } else {
            processed.receivedDate = this.normalizeDate(processed.receivedDate)
          }
          if (!processed.receivedAmount) {
            processed.receivedAmount = processed.amount
          }
        }

        // Inference: clientName null → use contractId (if string) OR description OR default
        if (!processed.clientName) {
          if (processed.contractId && typeof processed.contractId === 'string' && processed.contractId.trim()) {
            processed.clientName = processed.contractId.trim()
          } else if (processed.description && processed.description.trim()) {
            processed.clientName = processed.description.trim()
          } else {
            processed.clientName = 'Cliente não especificado'
          }
        }

        // Round currency values to 2 decimal places to avoid validation errors
        if (processed.amount !== null && processed.amount !== undefined) {
          processed.amount = Math.round(processed.amount * 100) / 100
        }
        if (processed.receivedAmount !== null && processed.receivedAmount !== undefined) {
          processed.receivedAmount = Math.round(processed.receivedAmount * 100) / 100
        }

        return processed
      })

    // Process EXPENSES
    data.expenses = data.expenses
      .filter(expense => {
        // Filter: description null OR amount null or <= 0 → SKIP
        if (!expense.description || !expense.amount || expense.amount <= 0) {
          filteredExpenses++
          return false
        }
        return true
      })
      .map(expense => {
        const processed = { ...expense }

        // Inference: category null → 'Outros'
        if (!processed.category) {
          processed.category = 'Outros'
        }

        // Inference: dueDate null → current date
        if (!processed.dueDate) {
          processed.dueDate = todayISO
        } else {
          // Normalize dueDate to ISO-8601 format
          processed.dueDate = this.normalizeDate(processed.dueDate)
        }

        // Inference: status null → based on dueDate
        if (!processed.status) {
          const dueDate = new Date(processed.dueDate)
          dueDate.setHours(0, 0, 0, 0)

          // pending for dueDate >= today, paid if in past
          if (dueDate >= today) {
            processed.status = 'pending'
          } else {
            processed.status = 'paid'
          }
        }

        // Inference: if status='paid', fill paidDate and paidAmount
        if (processed.status === 'paid') {
          if (!processed.paidDate) {
            processed.paidDate = processed.dueDate
          } else {
            processed.paidDate = this.normalizeDate(processed.paidDate)
          }
          if (!processed.paidAmount) {
            processed.paidAmount = processed.amount
          }
        }

        // Round currency values to 2 decimal places to avoid validation errors
        if (processed.amount !== null && processed.amount !== undefined) {
          processed.amount = Math.round(processed.amount * 100) / 100
        }
        if (processed.paidAmount !== null && processed.paidAmount !== undefined) {
          processed.paidAmount = Math.round(processed.paidAmount * 100) / 100
        }

        return processed
      })

    console.log(`   📊 Contracts: ${data.contracts.length} valid (${filteredContracts} filtered)`)
    console.log(`   📊 Receivables: ${data.receivables.length} valid (${filteredReceivables} filtered)`)
    if (filteredReceivables > 0) {
      console.log(`      💡 Receivables filtered due to: amount null or <= 0`)
    }
    console.log(`   📊 Expenses: ${data.expenses.length} valid (${filteredExpenses} filtered)`)

    return data
  }

  /**
   * Normalize date to ISO-8601 format (YYYY-MM-DD)
   * Handles multiple formats: DD/MM/YYYY, DD-MMM-YY, YYYY-MM-DD, etc.
   */
  private normalizeDate(dateInput: string | Date): string {
    if (!dateInput) return new Date().toISOString().substring(0, 10)

    // If already ISO-8601, return as-is
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      return dateInput.substring(0, 10)
    }

    if (typeof dateInput === 'string') {
      const cleaned = dateInput.trim()

      // Handle Excel format: DD-MMM-YY or DD/MMM/YY (e.g., "23/Oct/20", "22-Apr-12")
      // Also handles YY-MMM-DD format (e.g., "20-Oct-23")
      const excelMatch = cleaned.match(/^(\d{1,2})[-\/]([A-Za-z]{3})[-\/](\d{2,4})$/)
      if (excelMatch) {
        let [, part1, monthName, part3] = excelMatch
        const monthMap: Record<string, string> = {
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
          'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        }
        const month = monthMap[monthName.toLowerCase()]
        if (month) {
          // Detect format: if part1 > 31, it's likely YY-MMM-DD, otherwise DD-MMM-YY
          let day: string, year: string
          if (parseInt(part1) > 31) {
            // Format: YY-MMM-DD (e.g., "20-Oct-23" means 2020-10-23)
            year = part1
            day = part3
          } else {
            // Format: DD-MMM-YY (e.g., "23-Oct-20" means 2020-10-23)
            day = part1
            year = part3
          }

          // Handle 2-digit year: 00-29 = 2000s, 30-99 = 1900s
          const fullYear = year.length === 2 ? (parseInt(year) < 30 ? '20' + year : '19' + year) : year
          return `${fullYear}-${month}-${day.padStart(2, '0')}`
        }
      }

      // Parse Brazilian format (DD/MM/YYYY or DD-MM-YYYY)
      const parts = cleaned.split(/[\/\-]/)
      if (parts.length === 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
        const [day, month, year] = parts
        // Determine if it's DD/MM/YYYY or YYYY/MM/DD based on first part
        if (parseInt(day) > 31) {
          // Likely YYYY/MM/DD
          return `${day}-${month.padStart(2, '0')}-${year.padStart(2, '0')}`
        } else {
          // DD/MM/YYYY
          const fullYear = year.length === 2 ? (parseInt(year) < 30 ? '20' + year : '19' + year) : year
          return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
      }
    }

    // Fallback: parse as Date
    const date = new Date(dateInput)
    if (!isNaN(date.getTime())) {
      return date.toISOString().substring(0, 10)
    }

    // If all fails, return current date
    return new Date().toISOString().substring(0, 10)
  }

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
      const fileType = this.detectFileType(filename, fileBuffer)

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
        const processedData = this.postProcessEntities(extractedData)

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

      const workbook = this.parseXlsx(fileBuffer)
      const sheetsData = this.extractSheetsData(workbook)

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
      const processedData = this.postProcessEntities(extractedData)

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
