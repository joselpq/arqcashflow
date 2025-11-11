/**
 * ExcelParser - Excel File Parsing and Sheet Data Extraction
 *
 * Responsibilities:
 * - Parse XLSX workbook from buffer
 * - Parse CSV files with dedicated parser (no XLSX auto-conversion)
 * - Extract sheet data with normalized formats (dates, numbers)
 * - Convert sheets to CSV format
 * - Header detection for legacy mode
 *
 * Extracted from SetupAssistantServiceV2.ts (lines 234-388)
 * Part of ADR-026: SetupAssistant Service Decomposition
 */

import * as XLSX from 'xlsx'
import { ServiceError } from '../../BaseService'
import type { SheetData, FileType } from '../../SetupAssistantService'
import { SimpleCsvParser } from './SimpleCsvParser'

/**
 * Options for sheet extraction
 */
export interface SheetExtractionOptions {
  /**
   * Whether to support mixed entity sheets (ADR-025)
   * - true: Preserve all rows for boundary detection
   * - false: Detect and skip to header row (legacy mode)
   */
  supportMixedSheets: boolean

  /**
   * Whether to detect headers in legacy mode
   * Only used when supportMixedSheets is false
   */
  detectHeaders: boolean
}

/**
 * Excel parser with normalized data extraction
 *
 * Features:
 * - Reads Excel cell metadata directly (preserves types)
 * - CSV files: Dedicated parser (no auto-conversion, preserves UTF-8)
 * - XLSX files: Cell metadata reading (preserves dates/numbers)
 * - Intelligent header detection
 */
export class ExcelParser {
  private csvParser: SimpleCsvParser

  constructor() {
    this.csvParser = new SimpleCsvParser()
  }
  /**
   * Parse Excel workbook from buffer
   *
   * @param fileBuffer - Excel file buffer
   * @returns Parsed workbook
   * @throws ServiceError if parsing fails
   */
  parseWorkbook(fileBuffer: Buffer): XLSX.WorkBook {
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
   * Extract sheets with NORMALIZED data
   *
   * Routes to appropriate parser based on file type:
   * - CSV: SimpleCsvParser (preserves text, no auto-conversion)
   * - XLSX: Excel cell metadata reading (preserves types)
   *
   * @param workbook - Parsed Excel workbook
   * @param options - Extraction options
   * @param fileType - File type for routing
   * @param fileBuffer - Original file buffer (needed for CSV parsing)
   * @returns Array of sheet data with CSV format
   */
  extractSheetsData(
    workbook: XLSX.WorkBook,
    options: SheetExtractionOptions,
    fileType?: FileType,
    fileBuffer?: Buffer
  ): SheetData[] {
    // Route CSV files to dedicated CSV parser (better coverage)
    if (fileType === 'csv' && fileBuffer) {
      return this.extractCsvData(fileBuffer, options)
    }

    // XLSX files use Excel cell metadata reading
    return this.extractXlsxData(workbook, options)
  }

  /**
   * Extract CSV data using dedicated CSV parser
   * Preserves original text (no date/number auto-conversion)
   * Full UTF-8 support (fixes encoding issues)
   *
   * Logic copied from extractXlsxData() - only difference is parsing method
   *
   * @param fileBuffer - CSV file buffer
   * @param options - Extraction options
   * @returns Array of sheet data
   */
  private extractCsvData(
    fileBuffer: Buffer,
    options: SheetExtractionOptions
  ): SheetData[] {
    const sheetsData: SheetData[] = []

    // Step 1: Parse CSV to array of arrays (same as XLSX.utils.sheet_to_json)
    // This preserves UTF-8 and keeps dates as text strings
    const rawData = this.csvParser.parseAllRows(fileBuffer)

    if (rawData.length === 0) {
      return []
    }

    // Step 2: Determine start row (same logic as XLSX)
    let startRowIndex = 0

    if (!options.supportMixedSheets && options.detectHeaders) {
      // Legacy behavior: detect and use first header row
      const headerDetection = this.detectHeaderRow(rawData)

      if (headerDetection.found) {
        console.log(`   🔍 Detected headers in row ${headerDetection.rowIndex + 1} (score: ${headerDetection.score})`)
        startRowIndex = headerDetection.rowIndex
      } else {
        console.log(`   ⚠️  No headers detected in CSV, skipping`)
        return []
      }
    } else if (options.supportMixedSheets) {
      // Mixed sheet mode: include ALL rows from the start
      console.log(`   🔍 Mixed sheet mode: preserving all ${rawData.length} rows for boundary detection`)
    }

    // Step 3: Extract rows from start point
    const allRows = rawData.slice(startRowIndex)

    if (allRows.length === 0) {
      return []
    }

    // Step 4: Convert to CSV format (same as XLSX path)
    const csv = this.convertToCSV(allRows)

    if (csv.trim() === '') {
      return []
    }

    sheetsData.push({
      name: 'Sheet1',
      csv: csv
    })

    return sheetsData
  }

  /**
   * Extract XLSX data using Excel cell metadata
   * (Original implementation - preserves dates, numbers, etc.)
   *
   * @param workbook - Parsed Excel workbook
   * @param options - Extraction options
   * @returns Array of sheet data
   */
  private extractXlsxData(
    workbook: XLSX.WorkBook,
    options: SheetExtractionOptions
  ): SheetData[] {
    const sheetsData: SheetData[] = []

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]

      // Step 1: Get raw data as array of arrays (with Excel date formatting)
      const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, {
        header: 1,              // Return array of arrays (not objects)
        raw: false,             // Format dates/numbers as strings
        dateNF: 'yyyy-mm-dd',   // Standardize date format to ISO
        defval: ''              // Empty cells become empty strings
      })

      if (rawData.length === 0) continue

      // Step 2: Determine start row based on mixed sheet support
      let startRowIndex = 0

      if (!options.supportMixedSheets && options.detectHeaders) {
        // Legacy behavior: detect and use first header row
        const headerDetection = this.detectHeaderRow(rawData)

        if (headerDetection.found) {
          console.log(`   🔍 Detected headers in row ${headerDetection.rowIndex + 1} (score: ${headerDetection.score})`)
          startRowIndex = headerDetection.rowIndex
        } else {
          console.log(`   ⚠️  No headers detected in "${sheetName}", skipping`)
          continue
        }
      } else if (options.supportMixedSheets) {
        // Mixed sheet mode: include ALL rows from the start
        console.log(`   🔍 Mixed sheet mode: preserving all ${rawData.length} rows for boundary detection`)
      }

      // Step 3: Extract ALL rows from start point
      const allRows = rawData.slice(startRowIndex)

      // CRITICAL: DO NOT filter empty rows here!
      // We need to preserve blank rows for mixed sheet boundary detection (ADR-025)
      // Empty rows will be handled during table segmentation
      if (allRows.length === 0) continue

      // Step 4: Convert to CSV format
      const csv = this.convertToCSV(allRows)

      if (csv.trim() === '') continue

      sheetsData.push({
        name: sheetName,
        csv: csv
      })
    }

    return sheetsData
  }

  /**
   * Detect header row in raw data
   *
   * Scans first 5 rows for likely header row based on:
   * - Text content (not numbers)
   * - Common header keywords
   * - Consistent non-empty cells
   *
   * @param rawData - Raw Excel data (array of arrays)
   * @returns Header detection result
   */
  private detectHeaderRow(rawData: any[][]): {
    found: boolean
    rowIndex: number
    score: number
  } {
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

    return {
      found: headerRowIndex !== -1,
      rowIndex: headerRowIndex,
      score: bestScore
    }
  }

  /**
   * Score a row based on how likely it is to be a header row
   *
   * Scoring criteria:
   * - +1 per text cell (up to 5)
   * - +3 if contains common header keywords
   * - +2 if >50% cells are filled
   *
   * @param cells - Array of cell values as strings
   * @returns Score (higher = more likely to be header)
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

  /**
   * Convert rows to CSV format
   *
   * Features:
   * - Escapes values with commas, quotes, newlines
   * - Each row determines its own column count
   * - Preserves empty cells
   *
   * @param rows - Array of row arrays
   * @returns CSV string
   */
  private convertToCSV(rows: any[][]): string {
    const csvRows = rows.map(row => {
      if (!row) return ''

      // Determine max columns in this row
      const maxCols = row.length
      const cells: string[] = []

      for (let i = 0; i < maxCols; i++) {
        cells.push(this.escapeCsvValue(row[i]))
      }

      return cells.join(',')
    })

    return csvRows.join('\n')
  }

  /**
   * Escape CSV value
   *
   * Wraps value in quotes if it contains:
   * - Commas
   * - Quotes (doubled)
   * - Newlines
   *
   * @param value - Value to escape
   * @returns Escaped CSV value
   */
  private escapeCsvValue(value: any): string {
    const str = String(value || '')

    // Escape values containing commas, quotes, or newlines
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }

    return str
  }
}
