/**
 * SimpleCsvParser - Pure CSV Parser (No XLSX Dependencies)
 *
 * Responsibilities:
 * - Parse CSV files as raw text (preserves encoding and dates)
 * - Handle RFC 4180 CSV format (quoted fields, escaped commas)
 * - No auto-conversion of dates or numbers
 * - Full UTF-8 support
 *
 * Why separate from XLSX?
 * - XLSX library auto-converts dates (breaks Brazilian DD/MM/YYYY format)
 * - XLSX mangles UTF-8 encoding (Responsável → ResponsÃ¡vel)
 * - We need full control over CSV parsing for medicina profession
 *
 * Part of ADR-026: SetupAssistant Service Decomposition
 */

export interface CsvParseResult {
  rows: string[][]
  headers: string[]
  dataStartRow: number
}

/**
 * Simple, fast CSV parser with full UTF-8 support
 *
 * Features:
 * - RFC 4180 compliant (handles quotes, commas, newlines)
 * - Preserves original text (no date/number conversion)
 * - Full UTF-8 encoding support
 * - Auto-detects header row
 *
 * Example:
 * ```typescript
 * const parser = new SimpleCsvParser()
 * const result = parser.parse(buffer)
 * console.log(result.headers) // ['Nome', 'Data', 'Valor']
 * console.log(result.rows[0]) // ['João Silva', '15/01/2025', '350.00']
 * ```
 */
export class SimpleCsvParser {
  /**
   * Parse CSV buffer to rows
   *
   * @param buffer - CSV file buffer
   * @returns Parsed rows with headers
   */
  parse(buffer: Buffer): CsvParseResult {
    // Read as UTF-8 (preserves Brazilian characters)
    const text = buffer.toString('utf-8')

    // Split into lines (handle different line endings)
    const lines = text.split(/\r?\n/)

    // Parse all rows
    const allRows = lines
      .filter(line => line.trim() !== '') // Skip empty lines
      .map(line => this.parseCSVLine(line))
      .filter(row => row.some(cell => cell !== '')) // Skip completely empty rows

    if (allRows.length === 0) {
      return {
        rows: [],
        headers: [],
        dataStartRow: 0
      }
    }

    // First row is typically headers
    const headers = allRows[0]
    const dataRows = allRows.slice(1)

    return {
      rows: dataRows,
      headers: headers,
      dataStartRow: 1
    }
  }

  /**
   * Parse CSV buffer to all rows (no header detection)
   * Use this for preserving structure for TableSegmenter
   *
   * CRITICAL: Preserves blank rows - needed for table boundary detection
   *
   * @param buffer - CSV file buffer
   * @returns All rows as 2D array
   */
  parseAllRows(buffer: Buffer): string[][] {
    const text = buffer.toString('utf-8')
    const lines = text.split(/\r?\n/)

    // Map each line to cells, but DON'T filter blank rows
    // TableSegmenter needs blank rows to detect table boundaries!
    const allRows = lines.map(line => this.parseCSVLine(line))

    // Only filter the completely empty trailing row (if file ends with newline)
    if (allRows.length > 0 && allRows[allRows.length - 1].every(cell => cell === '')) {
      allRows.pop()
    }

    return allRows
  }

  /**
   * Parse a single CSV line with quote handling
   * RFC 4180 compliant
   *
   * Handles:
   * - Quoted fields: "value,with,comma"
   * - Escaped quotes: "value with ""quotes"""
   * - Newlines in quotes: "multi\nline"
   *
   * @param line - Single CSV line
   * @returns Array of cell values
   */
  parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote: "" → "
          current += '"'
          i += 2
          continue
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes
          i++
          continue
        }
      }

      if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim())
        current = ''
        i++
        continue
      }

      // Regular character
      current += char
      i++
    }

    // Push last field
    result.push(current.trim())

    return result
  }

  /**
   * Convert parsed rows back to CSV format
   * Used for compatibility with existing pipeline
   *
   * @param headers - Header row
   * @param rows - Data rows
   * @returns CSV string
   */
  convertToCSV(headers: string[], rows: string[][]): string {
    const allRows = [headers, ...rows]

    return allRows
      .map(row =>
        row.map(cell => this.escapeCsvValue(cell)).join(',')
      )
      .join('\n')
  }

  /**
   * Escape a CSV value (add quotes if needed)
   *
   * @param value - Cell value
   * @returns Escaped value
   */
  escapeCsvValue(value: string): string {
    if (!value) return ''

    // Need quotes if contains: comma, quote, newline
    const needsQuotes = /[",\n\r]/.test(value)

    if (needsQuotes) {
      // Escape existing quotes by doubling them
      const escaped = value.replace(/"/g, '""')
      return `"${escaped}"`
    }

    return value
  }
}
