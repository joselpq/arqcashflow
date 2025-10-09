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
import { jsonrepair } from 'jsonrepair'

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
    batchInfo?: {
      totalBatches: number
      sheetsPerBatch: number[]
    }
  }
}

/**
 * Row range specification for sub-batch processing
 * Used when a sheet has >80 entities and needs to be split
 */
interface RowRange {
  startRow: number  // First data row to extract (1-indexed, inclusive)
  endRow: number    // Last data row to extract (1-indexed, inclusive)
}

/**
 * Represents a single sheet with its data and token estimates
 */
interface SheetData {
  name: string
  csvContent: string
  inputTokens: number
  estimatedOutputTokens: number
  analysis?: SheetAnalysis  // NEW: Rich context about sheet structure
  rowRange?: RowRange       // NEW: Optional row range for sub-batch splitting
  subBatchInfo?: {          // NEW: Sub-batch metadata
    subBatchNumber: number  // e.g., 1, 2, 3
    totalSubBatches: number // e.g., 3 (total sub-batches for this sheet)
  }
}

/**
 * Represents a batch of sheets to process together
 */
interface SheetBatch {
  batchNumber: number
  sheets: SheetData[]
  totalInputTokens: number
  totalEstimatedOutputTokens: number
}

/**
 * Sheet type detection
 */
type SheetType = 'contracts' | 'receivables' | 'expenses' | 'instructions' | 'unknown'

/**
 * Detailed analysis of a spreadsheet sheet structure
 * Used to generate semantic hints for Claude
 */
interface SheetAnalysis {
  name: string
  detectedType: SheetType
  hasInstructionRow: boolean  // Row 1 contains metadata, not headers
  headers: string[]            // Actual column headers (usually row 2)
  headerRow: number            // Which row has headers (1 or 2)
  sampleRows: string[][]       // First 3-5 data rows for context
  dataRowCount: number         // Total non-empty rows after header
  estimatedEntities: number    // Expected entity count
  keyColumns: string[]         // Important columns for this type
}

/**
 * Context passed between batches for contract disambiguation
 */
interface BatchContext {
  previousContracts: string[]  // Contract names from previous batches
  previousBatchNumber: number
  totalContractsFound: number
}

/**
 * Validation result for extraction accuracy
 */
interface ValidationResult {
  sheetName: string
  expected: number
  extracted: number
  accuracy: number
  status: 'perfect' | 'good' | 'poor' | 'critical'
  warnings: string[]
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
   * Validate business rules (not applicable for SetupAssistant)
   */
  async validateBusinessRules(data: any): Promise<void> {
    // Setup assistant doesn't have specific business rules
    // Validation happens at entity level (contracts, expenses, receivables)
  }

  /**
   * Estimate token count for text content
   * Rule of thumb: 1 token ≈ 3.5-4 characters for CSV data
   *
   * @param text - Text content to estimate
   * @returns Estimated token count
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5)
  }

  /**
   * Estimate output tokens Claude will generate for given input
   *
   * Based on empirical testing:
   * - teste_TH2.xlsx: 32k input → ~9k output (ratio ~0.28)
   * - Rule of thumb: output = (input / 4) + 500 overhead
   *
   * @param inputTokens - Estimated input tokens
   * @returns Estimated output tokens
   */
  private estimateOutputTokens(inputTokens: number): number {
    return Math.ceil(inputTokens / 4) + 500
  }

  /**
   * Group sheets into batches based on output token budget
   *
   * CRITICAL: Each sheet must be in EXACTLY ONE batch (never split sheets!)
   *
   * Strategy:
   * - Target 6,000 output tokens per batch (safety margin below 8k limit)
   * - Process ONE SHEET PER BATCH if it's large (>5000 tokens)
   * - Group multiple small sheets together if they fit
   * - NEVER split a sheet across batches
   *
   * @param sheets - Array of sheet data with token estimates
   * @returns Array of batches ready for processing
   */
  private createSheetBatches(sheets: SheetData[]): SheetBatch[] {
    const OUTPUT_TOKEN_BUDGET = 6000 // Increased to handle 120+ receivables per batch (was 3000, caused truncation at ~82-91 entities)
    const LARGE_SHEET_THRESHOLD = 2500 // Output tokens threshold for "large" sheet
    const batches: SheetBatch[] = []
    let currentBatch: SheetData[] = []
    let currentOutputTokens = 0
    let currentInputTokens = 0

    for (const sheet of sheets) {
      const isLargeSheet = sheet.estimatedOutputTokens > LARGE_SHEET_THRESHOLD

      if (isLargeSheet) {
        // Large sheet: Force it into its own batch
        if (currentBatch.length > 0) {
          // Save current batch first
          batches.push({
            batchNumber: batches.length + 1,
            sheets: currentBatch,
            totalInputTokens: currentInputTokens,
            totalEstimatedOutputTokens: currentOutputTokens
          })
          currentBatch = []
          currentOutputTokens = 0
          currentInputTokens = 0
        }

        // Create batch with just this large sheet
        batches.push({
          batchNumber: batches.length + 1,
          sheets: [sheet],
          totalInputTokens: sheet.inputTokens,
          totalEstimatedOutputTokens: sheet.estimatedOutputTokens
        })

        console.log(`⚠️ Large sheet "${sheet.name}" (${sheet.estimatedOutputTokens} est. output tokens) in dedicated batch ${batches.length}`)
      } else {
        // Small sheet: Try to group with others
        const wouldExceedBudget = currentOutputTokens + sheet.estimatedOutputTokens > OUTPUT_TOKEN_BUDGET

        if (wouldExceedBudget && currentBatch.length > 0) {
          // Save current batch and start new one
          batches.push({
            batchNumber: batches.length + 1,
            sheets: currentBatch,
            totalInputTokens: currentInputTokens,
            totalEstimatedOutputTokens: currentOutputTokens
          })

          currentBatch = [sheet]
          currentOutputTokens = sheet.estimatedOutputTokens
          currentInputTokens = sheet.inputTokens
        } else {
          // Add to current batch
          currentBatch.push(sheet)
          currentOutputTokens += sheet.estimatedOutputTokens
          currentInputTokens += sheet.inputTokens
        }
      }
    }

    // Don't forget the last batch
    if (currentBatch.length > 0) {
      batches.push({
        batchNumber: batches.length + 1,
        sheets: currentBatch,
        totalInputTokens: currentInputTokens,
        totalEstimatedOutputTokens: currentOutputTokens
      })
    }

    return batches
  }

  /**
   * Extract specific row range from worksheet and convert to CSV
   * Used for sub-batch processing of large sheets
   *
   * @param worksheet - XLSX worksheet object
   * @param rowRange - Row range to extract (1-indexed, inclusive)
   * @param sheetName - Sheet name for logging
   * @returns CSV string containing only specified rows
   */
  private extractRowRangeAsCSV(
    worksheet: XLSX.WorkSheet,
    rowRange: RowRange,
    sheetName: string
  ): string {
    // Get the full range of the worksheet
    const fullRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

    // Create a new worksheet with only the specified row range
    const newWorksheet: XLSX.WorkSheet = {}

    // Copy header row (usually row 1 or 2)
    const headerRow = fullRange.s.r
    for (let C = fullRange.s.c; C <= fullRange.e.c; ++C) {
      const headerCell = worksheet[XLSX.utils.encode_cell({ r: headerRow, c: C })]
      if (headerCell) {
        newWorksheet[XLSX.utils.encode_cell({ r: 0, c: C })] = headerCell
      }
    }

    // Copy data rows within the specified range
    // rowRange is 1-indexed (e.g., startRow=3 means Excel row 3)
    // XLSX.utils is 0-indexed, so Excel row 3 = index 2
    const startRowIndex = rowRange.startRow - 1
    const endRowIndex = rowRange.endRow - 1

    let newRowIndex = 1 // Start from row 1 in new sheet (row 0 is header)
    for (let R = startRowIndex; R <= endRowIndex && R <= fullRange.e.r; ++R) {
      for (let C = fullRange.s.c; C <= fullRange.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })]
        if (cell) {
          newWorksheet[XLSX.utils.encode_cell({ r: newRowIndex, c: C })] = cell
        }
      }
      newRowIndex++
    }

    // Set the new worksheet range
    newWorksheet['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: fullRange.s.c },
      e: { r: newRowIndex - 1, c: fullRange.e.c }
    })

    // Convert to CSV
    const csv = XLSX.utils.sheet_to_csv(newWorksheet)

    console.log(`   ✂️ Extracted rows ${rowRange.startRow}-${rowRange.endRow} from "${sheetName}" (${newRowIndex - 1} data rows)`)

    return csv
  }

  /**
   * Repair common JSON syntax errors from LLM responses
   *
   * Problem: Claude sometimes generates malformed JSON with syntax errors:
   * - Trailing commas: [1, 2, 3,]
   * - Missing commas between array elements: } {
   * - Unescaped quotes in strings
   * - Missing closing brackets
   * - Control characters in strings
   *
   * Solution: Use industrial-strength jsonrepair library designed for LLM output
   *
   * @param jsonString - Potentially malformed JSON string
   * @returns Repaired JSON string
   */
  private repairJSON(jsonString: string): string {
    try {
      // Use jsonrepair library - battle-tested for LLM outputs
      const repaired = jsonrepair(jsonString)
      console.log('✅ JSON repaired successfully using jsonrepair library')
      return repaired
    } catch (error) {
      console.log('⚠️ jsonrepair failed, falling back to manual repairs:', error instanceof Error ? error.message : String(error))

      // Fallback: Apply basic manual repairs
      let repaired = jsonString

      // 1. Remove trailing commas
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

      // 2. Fix missing commas between array elements: } { → }, {
      repaired = repaired.replace(/\}\s*\{/g, '}, {')

      // 3. Remove control characters
      repaired = repaired.replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/\\r/g, '')

      // 4. Remove null bytes
      repaired = repaired.replace(/\0/g, '')

      // 5. Trim whitespace
      repaired = repaired.trim()

      return repaired
    }
  }

  /**
   * Extract array from JSON string using bracket counting
   * Handles nested arrays/objects properly unlike simple regex
   *
   * @param jsonString - JSON string to search in
   * @param arrayName - Name of the array to extract (e.g., "contracts")
   * @returns Array content or null if not found
   */
  private extractArrayWithBrackets(jsonString: string, arrayName: string): string | null {
    const searchPattern = `"${arrayName}"\\s*:\\s*\\[`
    const match = jsonString.match(new RegExp(searchPattern))

    if (!match) {
      return null
    }

    const startIndex = match.index! + match[0].length - 1 // Position of opening [
    let bracketCount = 0
    let inString = false
    let escapeNext = false

    // Scan through string counting brackets to find matching closing bracket
    for (let i = startIndex; i < jsonString.length; i++) {
      const char = jsonString[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\') {
        escapeNext = true
        continue
      }

      if (char === '"' && !escapeNext) {
        inString = !inString
        continue
      }

      if (!inString) {
        if (char === '[') {
          bracketCount++
        } else if (char === ']') {
          bracketCount--
          if (bracketCount === 0) {
            // Found matching closing bracket
            const arrayContent = jsonString.substring(startIndex + 1, i)
            return arrayContent
          }
        }
      }
    }

    return null
  }

  /**
   * Try to parse JSON with incremental fallback
   *
   * Strategy: If full JSON parse fails, try to extract and parse individual sections
   * This allows partial success even if one array is malformed
   *
   * @param jsonString - JSON string to parse
   * @returns Parsed object with whatever could be extracted
   */
  private parseJSONIncremental(jsonString: string): any {
    // Try to extract contracts, receivables, and expenses arrays separately
    const result: any = {
      data: {
        contracts: [],
        receivables: [],
        expenses: []
      },
      analysis: ''
    }

    try {
      // Try to extract contracts array
      console.log('🔍 Attempting to extract contracts array...')
      const contractsContent = this.extractArrayWithBrackets(jsonString, 'contracts')
      if (contractsContent) {
        try {
          const contractsArray = JSON.parse(`[${contractsContent}]`)
          result.data.contracts = contractsArray
          console.log(`✅ Parsed ${result.data.contracts.length} contracts incrementally`)
        } catch (e) {
          console.log('⚠️ Could not parse contracts array:', e instanceof Error ? e.message : String(e))
          // Try with repair
          try {
            const repaired = this.repairJSON(`[${contractsContent}]`)
            result.data.contracts = JSON.parse(repaired)
            console.log(`✅ Parsed ${result.data.contracts.length} contracts after repair`)
          } catch (e2) {
            console.log('❌ Contracts array repair failed')
          }
        }
      } else {
        console.log('⚠️ No contracts array found in JSON')
      }

      // Try to extract receivables array
      console.log('🔍 Attempting to extract receivables array...')
      const receivablesContent = this.extractArrayWithBrackets(jsonString, 'receivables')
      if (receivablesContent) {
        try {
          const receivablesArray = JSON.parse(`[${receivablesContent}]`)
          result.data.receivables = receivablesArray
          console.log(`✅ Parsed ${result.data.receivables.length} receivables incrementally`)
        } catch (e) {
          console.log('⚠️ Could not parse receivables array:', e instanceof Error ? e.message : String(e))
          // Try with repair
          try {
            const repaired = this.repairJSON(`[${receivablesContent}]`)
            result.data.receivables = JSON.parse(repaired)
            console.log(`✅ Parsed ${result.data.receivables.length} receivables after repair`)
          } catch (e2) {
            console.log('❌ Receivables array repair failed')
          }
        }
      } else {
        console.log('⚠️ No receivables array found in JSON')
      }

      // Try to extract expenses array
      console.log('🔍 Attempting to extract expenses array...')
      const expensesContent = this.extractArrayWithBrackets(jsonString, 'expenses')
      if (expensesContent) {
        try {
          const expensesArray = JSON.parse(`[${expensesContent}]`)
          result.data.expenses = expensesArray
          console.log(`✅ Parsed ${result.data.expenses.length} expenses incrementally`)
        } catch (e) {
          console.log('⚠️ Could not parse expenses array:', e instanceof Error ? e.message : String(e))
          // Try with repair
          try {
            const repaired = this.repairJSON(`[${expensesContent}]`)
            result.data.expenses = JSON.parse(repaired)
            console.log(`✅ Parsed ${result.data.expenses.length} expenses after repair`)
          } catch (e2) {
            console.log('❌ Expenses array repair failed')
          }
        }
      } else {
        console.log('⚠️ No expenses array found in JSON')
      }

      // Try to extract analysis text
      const analysisMatch = jsonString.match(/"analysis"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      if (analysisMatch) {
        result.analysis = analysisMatch[1]
      }

    } catch (error) {
      console.log('⚠️ Incremental parsing encountered error:', error)
    }

    return result
  }

  /**
   * Trim trailing empty rows from Excel worksheet to reduce token usage
   *
   * Problem: Excel sheets have default dimensions (23×1000) even if only 50 rows filled
   * Empty rows export as commas in CSV: ",,,,,,,,,,,,,,,,,,,,,,"
   * 10-sheet file with 950 empty rows per sheet = ~70k tokens (exceeds 30k limit!)
   *
   * Solution: Find last row with actual data and update worksheet range
   * Result: 80-90% token reduction on typical Excel files
   *
   * @param worksheet - XLSX worksheet object
   * @returns Modified worksheet with trimmed range
   */
  private trimEmptyRows(worksheet: XLSX.WorkSheet): XLSX.WorkSheet {
    if (!worksheet['!ref']) {
      console.log('⚠️ Worksheet has no range reference, skipping trim')
      return worksheet
    }

    const range = XLSX.utils.decode_range(worksheet['!ref'])
    let lastRowWithData = range.s.r // Start with first row

    // Scan backwards from end to find last row with actual data
    for (let rowIdx = range.e.r; rowIdx >= range.s.r; rowIdx--) {
      let hasData = false

      // Check all columns in this row
      for (let colIdx = range.s.c; colIdx <= range.e.c; colIdx++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })
        const cell = worksheet[cellAddress]

        // Cell has data if it exists and has a non-empty value
        if (cell && cell.v !== null && cell.v !== undefined && cell.v !== '') {
          hasData = true
          break
        }
      }

      if (hasData) {
        lastRowWithData = rowIdx
        break
      }
    }

    const originalRows = range.e.r - range.s.r + 1
    const trimmedRows = lastRowWithData - range.s.r + 1
    const removedRows = originalRows - trimmedRows

    // Update worksheet range to exclude trailing empty rows
    worksheet['!ref'] = XLSX.utils.encode_range({
      s: { r: range.s.r, c: range.s.c },
      e: { r: lastRowWithData, c: range.e.c }
    })

    if (removedRows > 0) {
      console.log(`✂️ Trimmed ${removedRows} empty rows (${originalRows} → ${trimmedRows} rows)`)
    }

    return worksheet
  }

  /**
   * Filter out useless columns from worksheet to reduce noise
   *
   * Problem: Sheets have many useless columns (comments, calculated fields, internal tracking)
   * These inflate row counts and confuse Claude
   *
   * Solution: Identify and remove columns that don't contribute to entity extraction
   *
   * @param worksheet - XLSX worksheet object
   * @param headers - Column headers
   * @param sheetType - Detected sheet type
   * @returns Filtered worksheet
   */
  private filterUselessColumns(worksheet: XLSX.WorkSheet, headers: string[], sheetType: SheetType): XLSX.WorkSheet {
    if (!worksheet['!ref']) {
      return worksheet
    }

    const range = XLSX.utils.decode_range(worksheet['!ref'])

    // Define useless column patterns based on sheet type
    const uselessPatterns: RegExp[] = []

    // Common useless patterns across all sheets
    uselessPatterns.push(
      /sanity check/i,
      /yearmonth/i,
      /^year$/i,
      /^month$/i,
      /^quarter$/i,
      /calculado/i,
      /calculated/i,
      /interno/i,
      /internal/i,
      /comentário/i,
      /comment/i,
      /observação/i,
      /obs\.?$/i,
      /^id$/i,
      /^index$/i,
      /^#$/,
      /fórmula/i,
      /formula/i
    )

    // Sheet-specific useless patterns
    if (sheetType === 'receivables') {
      // For receivables, "Data Início" is redundant (contract date, not receivable date)
      uselessPatterns.push(/data\s+in[ií]cio/i, /data\s+do\s+projeto/i)
    }

    // Identify columns to keep
    const columnsToKeep: number[] = []
    headers.forEach((header, colIndex) => {
      const isUseless = uselessPatterns.some(pattern => pattern.test(header))

      // Also check if column is completely empty
      let hasData = false
      for (let rowIdx = range.s.r + 2; rowIdx <= Math.min(range.s.r + 10, range.e.r); rowIdx++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIndex })
        const cell = worksheet[cellAddress]
        if (cell && cell.v !== null && cell.v !== undefined && cell.v !== '') {
          hasData = true
          break
        }
      }

      if (!isUseless && hasData) {
        columnsToKeep.push(colIndex)
      }
    })

    // If we would remove too many columns (>70%), keep all to be safe
    if (columnsToKeep.length < headers.length * 0.3) {
      console.log(`   ⚠️ Would remove ${headers.length - columnsToKeep.length}/${headers.length} columns, keeping all to be safe`)
      return worksheet
    }

    // Create new worksheet with only useful columns
    const newWorksheet: XLSX.WorkSheet = {}
    const newRange = {
      s: { r: range.s.r, c: 0 },
      e: { r: range.e.r, c: columnsToKeep.length - 1 }
    }

    for (let rowIdx = range.s.r; rowIdx <= range.e.r; rowIdx++) {
      let newColIdx = 0
      for (const oldColIdx of columnsToKeep) {
        const oldAddress = XLSX.utils.encode_cell({ r: rowIdx, c: oldColIdx })
        const newAddress = XLSX.utils.encode_cell({ r: rowIdx, c: newColIdx })
        if (worksheet[oldAddress]) {
          newWorksheet[newAddress] = worksheet[oldAddress]
        }
        newColIdx++
      }
    }

    newWorksheet['!ref'] = XLSX.utils.encode_range(newRange)

    const removedCount = headers.length - columnsToKeep.length
    if (removedCount > 0) {
      console.log(`   ✂️ Filtered ${removedCount} useless columns (${headers.length} → ${columnsToKeep.length})`)
    }

    return newWorksheet
  }

  /**
   * Analyze sheet structure to provide rich context to Claude
   *
   * Problem: Claude can't distinguish between contracts and receivables without context
   * Solution: Analyze headers, sample data, and row counts to detect sheet type
   *
   * @param sheetName - Name of the sheet
   * @param worksheet - XLSX worksheet object
   * @returns Detailed analysis of sheet structure
   */
  private analyzeSheetStructure(sheetName: string, worksheet: XLSX.WorkSheet): SheetAnalysis {
    const csv = XLSX.utils.sheet_to_csv(worksheet, { blankrows: false })
    const rows = csv.split('\n').filter(r => r.trim())

    if (rows.length === 0) {
      return {
        name: sheetName,
        detectedType: 'unknown',
        hasInstructionRow: false,
        headers: [],
        headerRow: 1,
        sampleRows: [],
        dataRowCount: 0,
        estimatedEntities: 0,
        keyColumns: []
      }
    }

    // Detect if row 1 is instructions (contains long text, not proper headers)
    const row1 = rows[0].split(',')
    const row2 = rows.length > 1 ? rows[1].split(',') : []

    // Heuristic: If row 1 has very long cells or contains phrases like "Instruções", it's metadata
    const row1IsInstructions = row1.some(cell =>
      cell.length > 50 ||
      cell.toLowerCase().includes('instruç') ||
      cell.toLowerCase().includes('preencher')
    )

    const headerRow = row1IsInstructions ? 2 : 1
    const headers = row1IsInstructions ? row2 : row1

    // Get sample data rows (3-5 rows after header)
    const dataStartRow = headerRow
    const sampleRows: string[][] = []
    for (let i = dataStartRow; i < Math.min(dataStartRow + 5, rows.length); i++) {
      if (rows[i]) {
        sampleRows.push(rows[i].split(','))
      }
    }

    // Count non-empty data rows
    const dataRows = rows.slice(headerRow).filter(r => {
      const cells = r.split(',')
      return cells.some(c => c.trim() && c.trim() !== '')
    })

    const dataRowCount = dataRows.length

    // Detect sheet type based on headers AND sample data
    const detectedType = this.detectSheetType(headers, sheetName, sampleRows)

    // Identify key columns based on type
    const keyColumns = this.identifyKeyColumns(headers, detectedType)

    // For receivables/expenses, each row = 1 entity
    // For contracts, each row = 1 entity
    const estimatedEntities = detectedType === 'instructions' ? 0 : dataRowCount

    return {
      name: sheetName,
      detectedType,
      hasInstructionRow: row1IsInstructions,
      headers,
      headerRow,
      sampleRows,
      dataRowCount,
      estimatedEntities,
      keyColumns
    }
  }

  /**
   * Detect sheet type based on column headers AND data samples
   *
   * CRITICAL FIX: "Previsão Projetos" has "Valor do Projeto" column (looks like contracts)
   * BUT actual data shows repeated project names with "Parcela 1, 2, 3..." = RECEIVABLES!
   *
   * @param headers - Column headers from the sheet
   * @param sheetName - Sheet name for additional context
   * @param sampleRows - First few data rows to inspect
   * @returns Detected sheet type
   */
  private detectSheetType(headers: string[], sheetName: string, sampleRows?: string[][]): SheetType {
    const headerText = headers.join(',').toLowerCase()
    const nameText = sheetName.toLowerCase()

    // Check sheet name first for explicit hints
    if (nameText.includes('instruç') || nameText.includes('instru')) {
      return 'instructions'
    }

    // CRITICAL: Check for "Parcela" column first - this is the strongest signal for receivables
    // "Parcela" = installment number (e.g., 1, 2, 3)
    if (headerText.includes('parcela')) {
      // Look at sample data to confirm: do we see numbers like "1", "2", "3" in parcela column?
      if (sampleRows && sampleRows.length > 0) {
        const parcelaColIndex = headers.findIndex(h => h.toLowerCase().includes('parcela'))
        if (parcelaColIndex >= 0) {
          const parcelaValues = sampleRows.map(row => row[parcelaColIndex]?.trim())
          // If we see numbers or patterns like "1", "2", "3", this is receivables
          const hasInstallmentNumbers = parcelaValues.some(v =>
            v && /^[0-9]+$/.test(v) || v === '1' || v === '2' || v === '3'
          )
          if (hasInstallmentNumbers) {
            return 'receivables'
          }
        }
      }

      // Even without sample confirmation, "parcela" + sheet name "Previsão" = receivables
      if (nameText.includes('previsão') || nameText.includes('acompanhamento')) {
        return 'receivables'
      }
    }

    // Contracts: has "valor do projeto" + project/client identifiers
    // BUT: Only if NO "parcela" column (to avoid confusion with "Previsão Projetos")
    if (!headerText.includes('parcela') &&
        (headerText.includes('valor do projeto') || headerText.includes('valor projeto')) &&
        (headerText.includes('cliente') || headerText.includes('nome do projeto'))) {
      return 'contracts'
    }

    // Expenses: has "descrição" + "fornecedor" OR "tipo"
    if ((headerText.includes('descrição') || headerText.includes('descricao')) &&
        (headerText.includes('fornecedor') || headerText.includes('tipo') ||
         headerText.includes('valor') && !headerText.includes('parcela'))) {
      return 'expenses'
    }

    // Check sheet name for additional hints
    if (nameText.includes('custo') || nameText.includes('despesa')) {
      return 'expenses'
    }

    if (nameText.includes('projeto') && !nameText.includes('previsão')) {
      return 'contracts'
    }

    if (nameText.includes('previsão') || nameText.includes('acompanhamento') ||
        nameText.includes('recebimento')) {
      return 'receivables'
    }

    return 'unknown'
  }

  /**
   * Identify key columns for a given sheet type
   *
   * @param headers - Column headers
   * @param sheetType - Detected sheet type
   * @returns Array of important column names
   */
  private identifyKeyColumns(headers: string[], sheetType: SheetType): string[] {
    const keyColumns: string[] = []

    headers.forEach(header => {
      const h = header.toLowerCase()

      switch (sheetType) {
        case 'contracts':
          if (h.includes('projeto') || h.includes('cliente') ||
              h.includes('valor') || h.includes('data')) {
            keyColumns.push(header)
          }
          break

        case 'receivables':
          if (h.includes('projeto') || h.includes('parcela') ||
              h.includes('valor') || h.includes('data') || h.includes('pago')) {
            keyColumns.push(header)
          }
          break

        case 'expenses':
          if (h.includes('descriç') || h.includes('fornecedor') ||
              h.includes('valor') || h.includes('tipo') || h.includes('data')) {
            keyColumns.push(header)
          }
          break
      }
    })

    return keyColumns
  }

  /**
   * Generate semantic prompt with sheet analysis context
   *
   * Problem: Claude doesn't know what type of data is in each sheet
   * Solution: Provide explicit structure, type, and extraction rules
   *
   * @param analysis - Sheet structure analysis
   * @param contractContext - Previously extracted contract names
   * @returns Prompt prefix with semantic hints
   */
  private generateSemanticPrompt(
    analysis: SheetAnalysis,
    contractContext?: string[],
    subBatchInfo?: { subBatchNumber: number; totalSubBatches: number; rowRange?: RowRange }
  ): string {
    if (analysis.detectedType === 'instructions') {
      return `\n⚠️ Sheet "${analysis.name}" contains instructions/metadata, not data. Skip this sheet.\n\n`
    }

    let prompt = `

═══════════════════════════════════════════════════════════════
SHEET STRUCTURE ANALYSIS: "${analysis.name}"
═══════════════════════════════════════════════════════════════

Type: ${analysis.detectedType.toUpperCase()}
Data Rows: ${analysis.dataRowCount}
Expected Entities: ${analysis.estimatedEntities}

COLUMN HEADERS (Row ${analysis.headerRow}):
${analysis.headers.map((h, i) => `  ${i+1}. ${h}`).join('\n')}

KEY COLUMNS FOR THIS TYPE:
${analysis.keyColumns.map(c => `  • ${c}`).join('\n')}

`

    // Add sub-batch information if this is a split sheet
    if (subBatchInfo) {
      const entitiesInSubBatch = subBatchInfo.rowRange
        ? subBatchInfo.rowRange.endRow - subBatchInfo.rowRange.startRow + 1
        : analysis.estimatedEntities

      prompt += `
🔸 SUB-BATCH PROCESSING (Output Token Limit Management):

This is sub-batch ${subBatchInfo.subBatchNumber} of ${subBatchInfo.totalSubBatches}
${subBatchInfo.rowRange ? `Processing rows ${subBatchInfo.rowRange.startRow}-${subBatchInfo.rowRange.endRow}` : ''}
Extract exactly ${entitiesInSubBatch} entities from the data below.

⚠️ IMPORTANT: This sheet was split because it exceeds Claude's 8K output token limit.
You are seeing ONLY a subset of the full sheet. Other sub-batches will process remaining rows.

`
    }

    prompt += `
`

    // Add type-specific extraction rules
    if (analysis.detectedType === 'receivables') {
      prompt += `
🚨 CRITICAL EXTRACTION RULES FOR RECEIVABLES SHEET:

1. Each row represents ONE RECEIVABLE (payment installment)
2. Extract ALL ${analysis.dataRowCount} rows as separate receivables
3. Column "Parcela" = installment number (e.g., "1", "2", "3")
4. Even if project names repeat, each row is a SEPARATE receivable
5. DO NOT create contracts from this sheet - these are installments for existing contracts

⚠️ IMPORTANT: If there are more than 70 entities, you will hit token limits.
In that case:
- First generate exactly 60 entities
- Then add a note in your analysis: "TRUNCATED: Generated 60 of ${analysis.dataRowCount}. Need continuation."
- This will trigger a second request for the remaining entities.

`

      if (contractContext && contractContext.length > 0) {
        prompt += `
⚠️ CONTEXT - EXISTING CONTRACTS FROM PREVIOUS SHEETS:
${contractContext.slice(0, 15).map(c => `  • "${c}"`).join('\n')}
${contractContext.length > 15 ? `  ... and ${contractContext.length - 15} more contracts` : ''}

If you see these project names in this sheet, they are RECEIVABLES (installments),
NOT new contracts!

`
      }
    } else if (analysis.detectedType === 'expenses') {
      prompt += `
🚨 CRITICAL EXTRACTION RULES FOR EXPENSES SHEET:

1. Each row represents ONE EXPENSE entry
2. Extract ALL ${analysis.dataRowCount} rows
3. Do NOT skip any rows, even if data seems repetitive
4. Each expense should have: description, amount, vendor/type, date

`
    } else if (analysis.detectedType === 'contracts') {
      prompt += `
🚨 CRITICAL EXTRACTION RULES FOR CONTRACTS SHEET:

1. Each row represents ONE CONTRACT (project agreement)
2. Extract ALL ${analysis.dataRowCount} rows as separate contracts
3. Each contract should have: client name, project name, value, dates
4. These are NEW contracts, not receivables

`
    }

    prompt += `
═══════════════════════════════════════════════════════════════

`

    return prompt
  }

  /**
   * Validate extraction accuracy against expected counts
   *
   * @param analysis - Sheet analysis with expected counts
   * @param extractedData - Data extracted by Claude
   * @returns Validation result with warnings
   */
  private validateExtraction(
    analysis: SheetAnalysis,
    extractedData: ExtractedData
  ): ValidationResult {
    const expected = analysis.estimatedEntities
    const extracted = (extractedData.data?.contracts?.length || 0) +
                      (extractedData.data?.receivables?.length || 0) +
                      (extractedData.data?.expenses?.length || 0)

    const accuracy = expected > 0 ? extracted / expected : 1

    let status: ValidationResult['status']
    if (accuracy >= 0.95) status = 'perfect'
    else if (accuracy >= 0.80) status = 'good'
    else if (accuracy >= 0.60) status = 'poor'
    else status = 'critical'

    const warnings: string[] = []

    if (accuracy < 0.95) {
      warnings.push(
        `Expected ${expected} entities, extracted ${extracted} (${(accuracy * 100).toFixed(1)}% accuracy)`
      )
    }

    // Check for semantic confusion: contracts in receivables sheet
    if (analysis.detectedType === 'receivables' &&
        extractedData.data?.contracts &&
        extractedData.data.contracts.length > 0) {
      warnings.push(
        `Sheet is RECEIVABLES type but extracted ${extractedData.data.contracts.length} contracts. ` +
        `Semantic confusion detected - these should be receivables!`
      )
    }

    // Check for semantic confusion: receivables in contracts sheet
    if (analysis.detectedType === 'contracts' &&
        extractedData.data?.receivables &&
        extractedData.data.receivables.length > 0) {
      warnings.push(
        `Sheet is CONTRACTS type but extracted ${extractedData.data.receivables.length} receivables. ` +
        `These should probably be contracts!`
      )
    }

    return {
      sheetName: analysis.name,
      expected,
      extracted,
      accuracy,
      status,
      warnings
    }
  }

  /**
   * Log validation results with color-coded status
   *
   * @param validation - Validation result to log
   */
  private logValidationResult(validation: ValidationResult) {
    const statusEmoji = {
      'perfect': '✅',
      'good': '✓',
      'poor': '⚠️',
      'critical': '❌'
    }

    console.log(`${statusEmoji[validation.status]} Sheet "${validation.sheetName}": ${(validation.accuracy * 100).toFixed(1)}% accuracy`)
    console.log(`   Expected: ${validation.expected} entities`)
    console.log(`   Extracted: ${validation.extracted} entities`)

    if (validation.expected !== validation.extracted) {
      const gap = validation.expected - validation.extracted
      console.log(`   Gap: ${gap > 0 ? '+' : ''}${-gap} entities ${gap > 0 ? 'missing' : 'extra'}`)
    }

    if (validation.warnings.length > 0) {
      console.log(`   ⚠️  Warnings:`)
      validation.warnings.forEach(w => console.log(`     - ${w}`))
    }
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
        // Single sheet - process normally with empty row trimming
        const worksheet = workbook.Sheets[sheetNames[0]]
        const beforeCsv = XLSX.utils.sheet_to_csv(worksheet)
        const trimmedWorksheet = this.trimEmptyRows(worksheet)
        fileContent = XLSX.utils.sheet_to_csv(trimmedWorksheet)

        // Log token reduction
        const tokensBefore = this.estimateTokens(beforeCsv)
        const tokensAfter = this.estimateTokens(fileContent)
        const reduction = tokensBefore > 0 ? Math.round((1 - tokensAfter / tokensBefore) * 100) : 0
        console.log(`📊 Token optimization: ${tokensBefore} → ${tokensAfter} tokens (${reduction}% reduction)`)

        excelSheetsInfo.processedSheets.push(sheetNames[0])
      } else {
        // Multiple sheets - use intelligent batching to respect output token limits
        const sheetsData: SheetData[] = []
        let totalTokensBefore = 0
        let totalTokensAfter = 0

        // Step 1: Prepare all sheets with token estimates AND structure analysis
        for (let i = 0; i < sheetNames.length; i++) {
          const sheetName = sheetNames[i]
          const worksheet = workbook.Sheets[sheetName]

          // Measure before trimming
          const beforeCsv = XLSX.utils.sheet_to_csv(worksheet)
          totalTokensBefore += this.estimateTokens(beforeCsv)

          // Trim empty rows to reduce token usage
          const trimmedWorksheet = this.trimEmptyRows(worksheet)

          // NEW PHASE 2: Get initial analysis to determine sheet type
          const preliminaryAnalysis = this.analyzeSheetStructure(sheetName, trimmedWorksheet)

          // NEW PHASE 2: Filter useless columns based on sheet type
          const filteredWorksheet = this.filterUselessColumns(
            trimmedWorksheet,
            preliminaryAnalysis.headers,
            preliminaryAnalysis.detectedType
          )

          // Convert filtered worksheet to CSV
          const sheetCsv = XLSX.utils.sheet_to_csv(filteredWorksheet)

          // Skip empty sheets
          if (sheetCsv.trim()) {
            console.log(`📊 Processing sheet ${i + 1}/${sheetNames.length}: "${sheetName}"`)

            // NEW: Re-analyze sheet structure after filtering for accurate counts
            const analysis = this.analyzeSheetStructure(sheetName, filteredWorksheet)
            console.log(`   Type detected: ${analysis.detectedType.toUpperCase()}`)
            console.log(`   Data rows: ${analysis.dataRowCount}`)
            console.log(`   Expected entities: ${analysis.estimatedEntities}`)

            const inputTokens = this.estimateTokens(sheetCsv)
            totalTokensAfter += inputTokens

            sheetsData.push({
              name: sheetName,
              csvContent: sheetCsv,
              inputTokens,
              estimatedOutputTokens: this.estimateOutputTokens(inputTokens),
              analysis  // NEW: Include analysis in sheet data
            })

            excelSheetsInfo.processedSheets.push(sheetName)
          } else {
            console.log(`⚠️ Skipping empty sheet: "${sheetName}"`)
            excelSheetsInfo.skippedSheets.push(sheetName)
          }
        }

        const totalReduction = totalTokensBefore > 0 ? Math.round((1 - totalTokensAfter / totalTokensBefore) * 100) : 0
        console.log(`📊 Multi-sheet token optimization: ${totalTokensBefore} → ${totalTokensAfter} tokens (${totalReduction}% reduction)`)

        // Step 2: Create batches with SUB-BATCH SPLITTING for large sheets
        // Large sheets (>80 entities) are split into multiple sub-batches to respect 8K output token limit
        const ENTITY_LIMIT_PER_BATCH = 60 // Safe limit to stay under 8K output tokens (~100 tokens per entity)
        const batches: SheetBatch[] = []

        for (const sheet of sheetsData) {
          // Skip instruction sheets
          if (sheet.analysis?.detectedType === 'instructions') {
            continue
          }

          const estimatedEntities = sheet.analysis?.estimatedEntities || 0

          if (estimatedEntities > 80) {
            // LARGE SHEET: Split into sub-batches
            const totalSubBatches = Math.ceil(estimatedEntities / ENTITY_LIMIT_PER_BATCH)
            console.log(`📊 Sheet "${sheet.name}" has ${estimatedEntities} entities - splitting into ${totalSubBatches} sub-batches`)

            // Get the original worksheet for row range extraction
            const worksheet = workbook.Sheets[sheet.name]
            const analysis = sheet.analysis!
            const headerRow = analysis.headerRow
            const firstDataRow = headerRow + 1

            for (let subBatch = 1; subBatch <= totalSubBatches; subBatch++) {
              const startRow = firstDataRow + (subBatch - 1) * ENTITY_LIMIT_PER_BATCH
              const endRow = Math.min(startRow + ENTITY_LIMIT_PER_BATCH - 1, firstDataRow + estimatedEntities - 1)
              const entitiesInSubBatch = endRow - startRow + 1

              // Extract this row range as CSV
              const rowRange: RowRange = { startRow, endRow }
              const subBatchCsv = this.extractRowRangeAsCSV(worksheet, rowRange, sheet.name)
              const subBatchInputTokens = this.estimateTokens(subBatchCsv)

              // Create sub-batch sheet data
              const subBatchSheet: SheetData = {
                name: sheet.name,
                csvContent: subBatchCsv,
                inputTokens: subBatchInputTokens,
                estimatedOutputTokens: this.estimateOutputTokens(subBatchInputTokens),
                analysis: sheet.analysis,
                rowRange,
                subBatchInfo: {
                  subBatchNumber: subBatch,
                  totalSubBatches
                }
              }

              batches.push({
                batchNumber: batches.length + 1,
                sheets: [subBatchSheet],
                totalInputTokens: subBatchInputTokens,
                totalEstimatedOutputTokens: subBatchSheet.estimatedOutputTokens
              })

              console.log(`   Sub-batch ${subBatch}/${totalSubBatches}: rows ${startRow}-${endRow} (${entitiesInSubBatch} entities)`)
            }
          } else {
            // SMALL SHEET: Process as single batch
            batches.push({
              batchNumber: batches.length + 1,
              sheets: [sheet],
              totalInputTokens: sheet.inputTokens,
              totalEstimatedOutputTokens: sheet.estimatedOutputTokens
            })
          }
        }

        console.log(`📦 Created ${batches.length} batch(es) for processing:`)
        batches.forEach(batch => {
          const sheet = batch.sheets[0]
          const subBatchInfo = sheet.subBatchInfo
            ? ` [sub-batch ${sheet.subBatchInfo.subBatchNumber}/${sheet.subBatchInfo.totalSubBatches}]`
            : ''
          const rowRangeInfo = sheet.rowRange
            ? ` rows ${sheet.rowRange.startRow}-${sheet.rowRange.endRow}`
            : ''
          console.log(`   Batch ${batch.batchNumber}: "${sheet.name}"${subBatchInfo}${rowRangeInfo}`)
          console.log(`     Input: ${batch.totalInputTokens} tokens, Est. Output: ${batch.totalEstimatedOutputTokens} tokens`)
        })

        // Step 3: Process each batch and collect results
        // NEW: Track contract context for subsequent batches
        const allResults: ExtractedData[] = []
        let contractContext: string[] = []

        for (const batch of batches) {
          console.log(`\n📦 Processing batch ${batch.batchNumber}/${batches.length}...`)

          // NEW: Build semantic context for each sheet in batch
          let semanticPromptPrefix = ''
          for (const sheet of batch.sheets) {
            if (sheet.analysis) {
              // Pass sub-batch info if this is a split sheet
              const subBatchInfo = sheet.subBatchInfo
                ? {
                    subBatchNumber: sheet.subBatchInfo.subBatchNumber,
                    totalSubBatches: sheet.subBatchInfo.totalSubBatches,
                    rowRange: sheet.rowRange
                  }
                : undefined

              semanticPromptPrefix += this.generateSemanticPrompt(sheet.analysis, contractContext, subBatchInfo)
            }
          }

          // Combine sheets in this batch
          const batchData: string[] = []
          for (const sheet of batch.sheets) {
            batchData.push(`\n=== PLANILHA: ${sheet.name} ===\n`)
            batchData.push(sheet.csvContent)
            batchData.push(`\n=== FIM DA PLANILHA: ${sheet.name} ===\n`)
          }

          const batchContent = batchData.join('\n')
          console.log(`📄 Batch content size: ${batchContent.length} characters`)

          // NEW: Extract data with semantic context
          const batchResult = await this.extractDataWithClaude(
            batchContent,
            undefined, // No base64 for spreadsheets
            false, // Not visual document
            file.type,
            semanticPromptPrefix  // NEW: Pass semantic hints
          )

          allResults.push(batchResult)

          // NEW: Validate extraction accuracy for each sheet in batch
          console.log(`\n📊 Validation Results:`)
          for (const sheet of batch.sheets) {
            if (sheet.analysis && sheet.analysis.detectedType !== 'instructions') {
              const validation = this.validateExtraction(sheet.analysis, batchResult)
              this.logValidationResult(validation)
            }
          }

          // NEW: Extract contract names from this batch for context in next batches
          if (batchResult.data?.contracts && batchResult.data.contracts.length > 0) {
            const newContracts = batchResult.data.contracts
              .map((c: any) => c.projectName || c.clientName)
              .filter(Boolean)
            contractContext = [...contractContext, ...newContracts]
            console.log(`\n📋 Contract context updated: ${contractContext.length} contracts known`)
          }

          // Add delay between batches to avoid rate limits
          if (batch.batchNumber < batches.length) {
            console.log(`⏳ Waiting 10 seconds before next batch...`)
            await new Promise(resolve => setTimeout(resolve, 10000))
          }
        }

        // Step 4: Merge results from all batches
        console.log(`\n🔗 Merging results from ${allResults.length} batch(es)...`)

        const mergedData: ExtractedData = {
          analysis: allResults.map((r, i) => `Batch ${i + 1}: ${r.analysis}`).join('\n\n'),
          data: {
            contracts: allResults.flatMap(r => r.data?.contracts || []),
            receivables: allResults.flatMap(r => r.data?.receivables || []),
            expenses: allResults.flatMap(r => r.data?.expenses || [])
          }
        }

        console.log(`📊 Merged results:`)
        console.log(`   Contracts: ${mergedData.data?.contracts?.length || 0}`)
        console.log(`   Receivables: ${mergedData.data?.receivables?.length || 0}`)
        console.log(`   Expenses: ${mergedData.data?.expenses?.length || 0}`)

        // Update excel sheets info with batch data
        if (excelSheetsInfo) {
          excelSheetsInfo.batchInfo = {
            totalBatches: batches.length,
            sheetsPerBatch: batches.map(b => b.sheets.length)
          }
        }

        // Create entities from merged data
        const results = await this.createEntitiesFromData(mergedData)

        return {
          message: 'Arquivo processado com sucesso!',
          analysis: mergedData.analysis,
          results,
          summary: {
            contractsCreated: results.contracts.created,
            receivablesCreated: results.receivables.created,
            expensesCreated: results.expenses.created,
            contractsFound: mergedData.data?.contracts?.length || 0,
            receivablesFound: mergedData.data?.receivables?.length || 0,
            expensesFound: mergedData.data?.expenses?.length || 0,
            errors: [
              ...results.contracts.errors,
              ...results.receivables.errors,
              ...results.expenses.errors
            ]
          },
          excelSheets: excelSheetsInfo
        }
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
   * NEW: Accepts semantic prompt prefix for sheet-specific context
   */
  private async extractDataWithClaude(
    fileContent: string | undefined,
    fileBase64: string | undefined,
    isVisualDocument: boolean,
    fileType: string,
    semanticPromptPrefix?: string  // NEW: Optional semantic context
  ): Promise<ExtractedData> {
    // Build prompt based on document type
    let prompt = this.buildClaudePrompt(isVisualDocument, fileContent)

    // NEW: Prepend semantic prompt if provided
    if (semanticPromptPrefix) {
      prompt = semanticPromptPrefix + '\n\n' + prompt
    }

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

    // DIAGNOSTIC: Check if Claude stopped due to token limit or other reason
    if (response?.stop_reason) {
      console.log(`   Stop reason: ${response.stop_reason}`)
      if (response.stop_reason === 'max_tokens') {
        console.log(`   ⚠️ WARNING: Hit max_tokens limit! Response was truncated.`)
      }
    }
    if (response?.usage) {
      console.log(`   Tokens used: ${response.usage.output_tokens} output / ${response.usage.input_tokens} input`)
    }

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // DIAGNOSTIC: Check response structure to understand where truncation happens
    const fullText = content.text
    console.log(`   Response length: ${fullText.length} characters`)

    // Check if response mentions the expected count
    const analysisMatch = fullText.match(/"analysis"\s*:\s*"([^"]*?)"/i)
    if (analysisMatch) {
      console.log(`   Analysis: "${analysisMatch[1].substring(0, 100)}..."`)
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.log('❌ No JSON found in response. First 500 chars:', content.text.substring(0, 500))
      throw new Error('No valid JSON found in Claude response')
    }

    // DIAGNOSTIC: Check if JSON ends cleanly or is truncated
    const jsonText = jsonMatch[0]
    const lastChars = jsonText.slice(-50)
    console.log(`   JSON ending: ...${lastChars}`)

    // Check if JSON ends properly (should end with }]} pattern)
    if (!jsonText.trim().endsWith('}')) {
      console.log(`   ⚠️ WARNING: JSON does not end with closing brace - likely truncated!`)
    }

    let claudeResponse: any

    // Multi-layer JSON parsing strategy
    try {
      // Layer 1: Try direct parse
      claudeResponse = JSON.parse(jsonMatch[0])
      console.log('✅ JSON parsed successfully (direct)')
    } catch (directError) {
      console.log('⚠️ Direct JSON parse failed, attempting repair...')

      try {
        // Layer 2: Try with JSON repair
        const repairedJSON = this.repairJSON(jsonMatch[0])
        claudeResponse = JSON.parse(repairedJSON)
        console.log('✅ JSON parsed successfully (after repair)')
      } catch (repairError) {
        console.log('⚠️ Repaired JSON parse failed, attempting incremental parsing...')

        try {
          // Layer 3: Incremental parsing - extract what we can
          claudeResponse = this.parseJSONIncremental(jsonMatch[0])

          // Check if we got ANY data
          const totalEntities =
            (claudeResponse.data?.contracts?.length || 0) +
            (claudeResponse.data?.receivables?.length || 0) +
            (claudeResponse.data?.expenses?.length || 0)

          if (totalEntities === 0) {
            // No data extracted at all
            console.log('❌ Incremental parsing found no valid entities')
            console.log('JSON excerpt (first 1000 chars):', jsonMatch[0].substring(0, 1000))
            console.log('Parse error:', repairError instanceof Error ? repairError.message : String(repairError))
            throw new Error(`Failed to parse JSON response. Original error: ${repairError instanceof Error ? repairError.message : String(repairError)}`)
          }

          console.log('✅ Incremental parsing recovered partial data')
          console.log(`⚠️ Warning: Some data may have been lost due to JSON syntax errors`)
        } catch (incrementalError) {
          // All layers failed
          console.log('❌ All JSON parsing strategies failed')
          console.log('JSON excerpt (first 1000 chars):', jsonMatch[0].substring(0, 1000))
          console.log('Final error:', incrementalError instanceof Error ? incrementalError.message : String(incrementalError))
          throw new Error(`Failed to parse JSON after trying repair and incremental parsing. Error: ${repairError instanceof Error ? repairError.message : String(repairError)}`)
        }
      }
    }

    console.log('📊 Claude found:')
    console.log(`  Contracts: ${claudeResponse.data?.contracts?.length || 0}`)
    console.log(`  Receivables: ${claudeResponse.data?.receivables?.length || 0}`)
    console.log(`  Expenses: ${claudeResponse.data?.expenses?.length || 0}`)

    // DIAGNOSTIC: Check if Claude's analysis mentions a different count than what was extracted
    if (claudeResponse.analysis) {
      const analysisText = claudeResponse.analysis.toLowerCase()

      // Look for numbers in analysis that might indicate Claude knew there were more
      const numberMatches = analysisText.match(/(\d+)\s*(contract|receivable|expense|row|entit|item)/gi) as RegExpMatchArray | null
      if (numberMatches && numberMatches.length > 0) {
        console.log(`   📝 Analysis mentions counts: ${numberMatches.join(', ')}`)

        // Check for discrepancies
        numberMatches.forEach(match => {
          const num = parseInt(match.match(/\d+/)?.[0] || '0')
          if (match.toLowerCase().includes('receivable') &&
              num > (claudeResponse.data?.receivables?.length || 0)) {
            console.log(`   ⚠️ DISCREPANCY: Analysis mentions ${num} receivables but only extracted ${claudeResponse.data?.receivables?.length || 0}`)
          }
        })
      }
    }

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

SHEET NAME SEMANTICS (use these hints to identify data types):
- "Input de Projetos" / "Previsão Projetos" → Extract as CONTRACTS (project data with client, value, dates)
- "Previsão Projetos" / "Acompanhamento de Obra" / "Previsão RT" → Extract RECEIVABLES (payment installments with dates and amounts)
- "Custos" / "Despesas" → Extract as EXPENSES (costs with vendor, description, amounts)
- "Pagamentos" → Extract as RECEIVABLES (payments received)
- Instructions/Summary sheets → Skip (not transaction data)

CRITICAL RULES:
1. Extract EVERY SINGLE ROW from each sheet - if there are 100 rows of receivables, return all 100
2. DO NOT confuse receivables with contracts - receivables are individual payment entries, contracts are project summaries
3. Each sheet can contain ONLY contracts, ONLY receivables, OR ONLY expenses (not mixed)
4. Look at the headers to determine sheet type:
   - "Nome do Projeto", "Valor do Projeto" → CONTRACTS
   - "Parcela", "Valor da Parcela", "Data" (payment date) → RECEIVABLES
   - "Descrição", "Fornecedor", "Tipo" → EXPENSES

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
        // IMPORTANT: Do NOT copy contract category to receivable - they have separate category systems
        const receivable: ReceivableCreateData = {
          contractId,
          expectedDate: receivableData.expectedDate,  // Keep as string (YYYY-MM-DD format)
          amount: Number(receivableData.amount),
          invoiceNumber: receivableData.invoiceNumber || null,
          category: null,  // Receivables have their own category system, don't inherit from contracts
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