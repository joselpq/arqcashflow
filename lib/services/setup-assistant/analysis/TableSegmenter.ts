/**
 * TableSegmenter - ADR-025 Mixed Entity Sheet Support
 *
 * Responsibilities:
 * - Detect table boundaries (vertical and horizontal blank regions)
 * - Segment mixed sheets into discrete tables
 * - Calculate confidence scores for detected tables
 * - Extract table regions as virtual sheets
 * - Header detection within regions
 *
 * This component implements the core ADR-025 logic for detecting and
 * segmenting sheets that contain multiple entity types separated by
 * blank rows/columns.
 *
 * Architecture: Single Responsibility Principle
 * - Focused on table boundary detection and segmentation
 * - Self-contained with no external dependencies
 * - Reusable for any table detection scenario
 */

import { SheetData, VirtualSheet } from '../types'

/**
 * Represents a detected boundary (blank row or column sequence)
 */
export interface TableBoundary {
  type: 'vertical' | 'horizontal'
  position: number      // Row or column index where boundary starts
  confidence: number    // 0.0-1.0, based on blank sequence length
  blankLength: number   // Number of consecutive blank rows/columns
}

/**
 * Represents a detected table region within a sheet
 */
export interface DetectedTable {
  rowRange: [number, number]    // [startRow, endRow] inclusive
  colRange: [number, number]    // [startCol, endCol] inclusive
  headerRow?: number            // Absolute row index of detected header
  sampleRows: string[][]        // First 20 rows for AI analysis
  confidence: number            // 0.0-1.0, based on data quality
}

/**
 * TableSegmenter - Boundary detection and table segmentation
 *
 * Key Methods:
 * - detectBlankRows(): Find vertical boundaries (blank row sequences)
 * - detectBlankColumns(): Find horizontal boundaries (blank column sequences)
 * - segmentTablesWithHeaders(): Complete segmentation pipeline
 * - extractTableAsSheet(): Convert table region to virtual sheet
 *
 * Confidence Scoring:
 * - Boundaries: Based on blank sequence length (2+ rows = high confidence)
 * - Tables: Based on header presence, data rows, column count
 *
 * Example Usage:
 * ```typescript
 * const segmenter = new TableSegmenter()
 * const tables = segmenter.segmentTablesWithHeaders(sheet)
 * const virtualSheets = tables.map((table, i) =>
 *   segmenter.extractTableAsSheet(sheet, table, i)
 * )
 * ```
 */
export class TableSegmenter {

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
  detectBlankRows(rows: string[][]): TableBoundary[] {
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
  detectBlankColumns(rows: string[][]): TableBoundary[] {
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
   * Score a row as potential header based on text patterns
   * Used for header detection within table regions
   *
   * Scoring Rules:
   * - Text cells: +1 point each
   * - Keywords (Nome, Data, Valor, Descrição, etc): +3 points
   * - Consistent pattern: +2 points
   *
   * Returns: Score (higher = more likely to be header)
   */
  private scoreAsHeaderRow(cells: string[]): number {
    let score = 0
    const textCellCount = cells.filter(c => {
      const val = String(c).trim()
      return val !== '' && isNaN(Number(val))
    }).length

    // Text cells indicate header
    score += textCellCount

    // Common header keywords (Brazilian Portuguese)
    const headerKeywords = ['nome', 'data', 'valor', 'descrição', 'status',
      'cliente', 'projeto', 'categoria', 'observ', 'tipo']
    const keywordCount = cells.filter(c => {
      const val = String(c).toLowerCase()
      return headerKeywords.some(kw => val.includes(kw))
    }).length

    score += keywordCount * 3

    // Consistency: if most cells are text, likely header
    if (textCellCount / cells.length > 0.6) {
      score += 2
    }

    return score
  }

  /**
   * Detect header row within a region using scoring heuristic
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
  segmentTablesWithHeaders(sheet: SheetData): DetectedTable[] {
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
  extractTableAsSheet(
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

  /**
   * Parse CSV line with quote handling
   * RFC 4180 compliant
   */
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
}
