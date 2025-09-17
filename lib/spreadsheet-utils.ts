/**
 * Comprehensive utility functions for processing Brazilian spreadsheet data
 * Handles currency, dates, text parsing, and intelligent column detection
 */

import * as XLSX from 'xlsx'

// Brazilian format parsers
export class BrazilianFormatParser {
  /**
   * Parse Brazilian currency format to number
   * Examples: "R$ 3,500" -> 3500, "R$ 1.234,56" -> 1234.56
   */
  static parseCurrency(value: string | number): number | null {
    if (typeof value === 'number') return value
    if (!value || typeof value !== 'string') return null

    // Remove R$, spaces, and handle Brazilian decimal/thousands separators
    let cleaned = value.replace(/[R$\s]/g, '')

    // Handle Brazilian number format: thousands with dots, decimals with comma
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Format like "1.234,56" - dots are thousands, comma is decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    } else if (cleaned.includes(',')) {
      // Check if comma is likely a decimal separator
      const parts = cleaned.split(',')
      if (parts.length === 2 && parts[1].length <= 2) {
        // Comma is decimal separator (e.g., "3,50")
        cleaned = cleaned.replace(',', '.')
      } else {
        // Comma might be thousands separator (e.g., "3,500")
        // But this is less common in Brazilian format
        cleaned = cleaned.replace(/,/g, '')
      }
    } else if (cleaned.includes('.')) {
      // Only dots - could be thousands or decimal
      const parts = cleaned.split('.')
      if (parts.length === 2 && parts[1].length <= 2 && parseInt(parts[0]) < 1000) {
        // Likely decimal separator (e.g., "3.50")
        // Keep as is
      } else {
        // Likely thousands separator (e.g., "3.500")
        cleaned = cleaned.replace(/\./g, '')
      }
    }

    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? null : parsed
  }

  /**
   * Parse Brazilian date formats to ISO string
   * Examples: "23/Oct/20" -> "2020-10-23", "15/09/2024" -> "2024-09-15"
   */
  static parseDate(value: string | Date): string | null {
    if (!value) return null
    if (value instanceof Date) return value.toISOString().split('T')[0]
    if (typeof value !== 'string') return null

    // Handle DD/MMM/YY format (23/Oct/20)
    const monthMap: { [key: string]: string } = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    }

    // Try DD/MMM/YY format first
    const shortDateMatch = value.match(/(\d{1,2})\/([a-z]{3})\/(\d{2})/i)
    if (shortDateMatch) {
      const [, day, monthAbbr, year] = shortDateMatch
      const month = monthMap[monthAbbr.toLowerCase()]
      if (month) {
        const fullYear = parseInt(year) + (parseInt(year) > 50 ? 1900 : 2000)
        return `${fullYear}-${month}-${day.padStart(2, '0')}`
      }
    }

    // Try DD/MM/YYYY format
    const fullDateMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (fullDateMatch) {
      const [, day, month, year] = fullDateMatch
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // Try ISO format
    const isoMatch = value.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoMatch) {
      const [, year, month, day] = isoMatch
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    return null
  }

  /**
   * Parse project names with client extraction
   * Examples: "LF - Livia Assan" -> {client: "Livia Assan", project: "LF"}
   */
  static parseProjectClient(value: string): { client: string; project: string } {
    if (!value || typeof value !== 'string') {
      return { client: '', project: value || '' }
    }

    // Handle "CODE - Client Name" format
    const codeClientMatch = value.match(/^([A-Z]{1,5})\s*-\s*(.+)$/i)
    if (codeClientMatch) {
      const [, code, clientName] = codeClientMatch
      return {
        client: clientName.trim(),
        project: code.trim()
      }
    }

    // Handle "Client Name - Project" format
    const clientProjectMatch = value.match(/^(.+?)\s*-\s*(.+)$/)
    if (clientProjectMatch) {
      const [, part1, part2] = clientProjectMatch
      // If part1 looks like a code (short, uppercase), it's probably project code
      if (part1.length <= 5 && /^[A-Z0-9]+$/i.test(part1.trim())) {
        return { client: part2.trim(), project: part1.trim() }
      }
      // Otherwise, part1 is probably client name
      return { client: part1.trim(), project: part2.trim() }
    }

    // No clear separation, use as project name
    return { client: '', project: value.trim() }
  }

  /**
   * Clean and normalize text fields
   */
  static cleanText(value: any): string {
    if (!value) return ''
    return String(value).trim().replace(/\s+/g, ' ')
  }
}

// Column mapping and detection
export class ColumnMapper {
  /**
   * Map common Brazilian column headers to standard field names
   */
  static readonly COLUMN_MAPPINGS: { [key: string]: string[] } = {
    // Contract fields - FIXED with more specific mappings
    clientName: ['cliente', 'client', 'nome cliente', 'nome do cliente'],
    projectName: ['projeto', 'project', 'nome projeto', 'nome do projeto'],
    totalValue: ['valor total', 'valor do projeto', 'value', 'total'], // Removed generic 'valor'
    signedDate: ['data inicio', 'data início', 'data assinatura', 'data contrato', 'date'], // Removed generic 'data'
    category: ['categoria', 'category', 'tipo', 'type'],
    description: ['descrição', 'description', 'observações', 'obs'],
    status: ['status', 'situação', 'situacao'],

    // Receivable fields - FIXED with more specific mappings
    expectedDate: ['data esperada', 'data recebimento', 'data vencimento', 'vencimento', 'due date'],
    amount: ['valor a receber', 'valor', 'amount', 'quantia'], // More specific for receivables
    invoiceNumber: ['nota fiscal', 'invoice', 'nf', 'numero nota'],

    // Expense fields
    dueDate: ['data vencimento', 'vencimento', 'data pagamento', 'due date'],
    vendor: ['fornecedor', 'vendor', 'supplier', 'pagamento para'],

    // Common fields
    notes: ['observações', 'obs', 'notes', 'nota', 'comentários']
  }

  /**
   * Detect column types based on header names - FIXED for better precision
   */
  static detectColumns(headers: string[]): { [key: string]: number } {
    const columnMap: { [key: string]: number } = {}
    const matchScores: { [key: string]: { score: number; index: number } } = {}

    headers.forEach((header, index) => {
      if (!header) return

      const normalizedHeader = header.toLowerCase().trim()

      // Find best match for each field with scoring
      for (const [fieldName, variations] of Object.entries(this.COLUMN_MAPPINGS)) {
        let bestScore = 0
        let bestVariation = ''

        for (const variation of variations) {
          let score = 0

          // Exact match gets highest score
          if (normalizedHeader === variation) {
            score = 1000
          }
          // Header contains variation
          else if (normalizedHeader.includes(variation)) {
            score = variation.length * 10 // Longer matches score higher
          }
          // Variation contains header (less preferred)
          else if (variation.includes(normalizedHeader) && normalizedHeader.length >= 3) {
            score = normalizedHeader.length * 5
          }

          if (score > bestScore) {
            bestScore = score
            bestVariation = variation
          }
        }

        // Only consider meaningful matches
        if (bestScore > 0) {
          if (!matchScores[fieldName] || bestScore > matchScores[fieldName].score) {
            matchScores[fieldName] = { score: bestScore, index }
          }
        }
      }
    })

    // Convert scores to final column mapping
    Object.entries(matchScores).forEach(([fieldName, { index }]) => {
      columnMap[fieldName] = index
    })

    return columnMap
  }

  /**
   * Suggest data type based on column content
   */
  static inferDataType(columnData: any[]): 'currency' | 'date' | 'text' | 'number' {
    const sampleSize = Math.min(5, columnData.length)
    const samples = columnData.slice(0, sampleSize).filter(Boolean)

    if (samples.length === 0) return 'text'

    // Check for currency patterns
    const currencyPattern = /R\$|[0-9,\.]+/
    if (samples.every(val => currencyPattern.test(String(val)))) {
      return 'currency'
    }

    // Check for date patterns
    const datePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\/[a-z]{3}\/\d{2,4}/i
    if (samples.every(val => datePattern.test(String(val)))) {
      return 'date'
    }

    // Check for pure numbers
    if (samples.every(val => !isNaN(Number(val)) && !String(val).includes('/'))) {
      return 'number'
    }

    return 'text'
  }
}

// Main spreadsheet processor
export class SpreadsheetProcessor {
  /**
   * Process Excel or CSV file into structured data
   */
  static async processFile(buffer: Buffer, filename: string): Promise<{
    sheets: ProcessedSheet[]
    metadata: FileMetadata
    errors: string[]
  }> {
    const errors: string[] = []
    let workbook: XLSX.WorkBook

    try {
      if (filename.endsWith('.csv')) {
        // Parse CSV
        const csvContent = buffer.toString('utf-8')
        workbook = XLSX.read(csvContent, { type: 'string' })
      } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
        // Parse Excel
        workbook = XLSX.read(buffer, { type: 'buffer' })
      } else {
        throw new Error(`Unsupported file type: ${filename}. Supported types: .csv, .xlsx, .xls`)
      }
    } catch (error) {
      errors.push(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        sheets: [],
        metadata: { filename, sheetCount: 0, totalRows: 0 },
        errors
      }
    }

    const sheets: ProcessedSheet[] = []

    for (const sheetName of workbook.SheetNames) {
      try {
        const worksheet = workbook.Sheets[sheetName]
        if (!worksheet) {
          errors.push(`Sheet "${sheetName}" is empty or corrupted`)
          continue
        }
        const processedSheet = this.processWorksheet(worksheet, sheetName)
        sheets.push(processedSheet)
      } catch (error) {
        errors.push(`Failed to process sheet "${sheetName}": ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      sheets,
      metadata: {
        filename,
        sheetCount: sheets.length,
        totalRows: sheets.reduce((sum, sheet) => sum + sheet.data.length, 0)
      },
      errors
    }
  }

  /**
   * Process individual worksheet
   */
  private static processWorksheet(worksheet: XLSX.WorkSheet, sheetName: string): ProcessedSheet {
    // Convert to array of arrays
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false })

    // Find header row (first non-empty row with multiple columns)
    let headerRowIndex = 0
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const nonEmptyColumns = row.filter(cell => cell && String(cell).trim()).length
      if (nonEmptyColumns >= 3) { // At least 3 columns with data
        headerRowIndex = i
        break
      }
    }

    const headers = rawData[headerRowIndex] || []
    const dataRows = rawData.slice(headerRowIndex + 1)

    // Clean headers
    const cleanHeaders = headers.map(h => BrazilianFormatParser.cleanText(h))

    // Detect column mappings
    const columnMap = ColumnMapper.detectColumns(cleanHeaders)

    // Process data rows
    const processedData = dataRows
      .filter(row => row && row.some(cell => cell && String(cell).trim())) // Filter empty rows
      .map((row, index) => this.processDataRow(row, cleanHeaders, columnMap, headerRowIndex + index + 1))

    // Detect sections (contracts, receivables, expenses)
    const sections = this.detectSections(processedData, cleanHeaders)

    return {
      name: sheetName,
      headers: cleanHeaders,
      columnMap,
      data: processedData,
      sections,
      metadata: {
        headerRow: headerRowIndex,
        totalRows: dataRows.length,
        nonEmptyRows: processedData.length
      }
    }
  }

  /**
   * Process individual data row
   */
  private static processDataRow(
    row: any[],
    headers: string[],
    columnMap: { [key: string]: number },
    rowNumber: number
  ): ProcessedRow {
    const processedRow: ProcessedRow = {
      rowNumber,
      raw: [...row],
      parsed: {},
      detectedType: 'unknown'
    }

    // Parse each mapped column
    for (const [fieldName, columnIndex] of Object.entries(columnMap)) {
      const rawValue = row[columnIndex]
      if (rawValue == null || rawValue === '') continue

      switch (fieldName) {
        case 'totalValue':
        case 'amount':
          processedRow.parsed[fieldName] = BrazilianFormatParser.parseCurrency(rawValue)
          break

        case 'signedDate':
        case 'expectedDate':
        case 'dueDate':
          processedRow.parsed[fieldName] = BrazilianFormatParser.parseDate(rawValue)
          break

        case 'projectName':
          const { client, project } = BrazilianFormatParser.parseProjectClient(rawValue)
          processedRow.parsed.projectName = project
          if (client && !processedRow.parsed.clientName) {
            processedRow.parsed.clientName = client
          }
          break

        default:
          processedRow.parsed[fieldName] = BrazilianFormatParser.cleanText(rawValue)
      }
    }

    // Detect row type based on available fields
    processedRow.detectedType = this.detectRowType(processedRow.parsed)

    return processedRow
  }

  /**
   * Detect if row represents contract, receivable, or expense - FIXED logic
   */
  private static detectRowType(parsed: { [key: string]: any }): 'contract' | 'receivable' | 'expense' | 'unknown' {
    // Contract: has project name (client optional) and total value and signed date
    if (parsed.projectName && parsed.totalValue && parsed.signedDate) {
      return 'contract'
    }

    // Receivable: has expected date and amount
    if (parsed.expectedDate && parsed.amount) {
      return 'receivable'
    }

    // Expense: has due date, amount, and description or vendor
    if (parsed.dueDate && parsed.amount && (parsed.description || parsed.vendor)) {
      return 'expense'
    }

    // Fallback: if we have client/project and value but missing date, still might be a contract
    if ((parsed.clientName || parsed.projectName) && parsed.totalValue) {
      return 'contract'
    }

    return 'unknown'
  }

  /**
   * Detect logical sections in the data
   */
  private static detectSections(data: ProcessedRow[], headers: string[]): DataSection[] {
    const sections: DataSection[] = []

    // Group by detected type
    const typeGroups: { [key: string]: ProcessedRow[] } = {}
    data.forEach(row => {
      const type = row.detectedType
      if (!typeGroups[type]) typeGroups[type] = []
      typeGroups[type].push(row)
    })

    // Create sections for each type
    for (const [type, rows] of Object.entries(typeGroups)) {
      if (type !== 'unknown' && rows.length > 0) {
        sections.push({
          type: type as 'contract' | 'receivable' | 'expense',
          startRow: Math.min(...rows.map(r => r.rowNumber)),
          endRow: Math.max(...rows.map(r => r.rowNumber)),
          rowCount: rows.length,
          confidence: this.calculateSectionConfidence(rows, type)
        })
      }
    }

    return sections
  }

  /**
   * Calculate confidence score for section detection
   */
  private static calculateSectionConfidence(rows: ProcessedRow[], expectedType: string): number {
    if (rows.length === 0) return 0

    const correctlyTyped = rows.filter(row => row.detectedType === expectedType).length
    return correctlyTyped / rows.length
  }
}

// Type definitions
export interface ProcessedRow {
  rowNumber: number
  raw: any[]
  parsed: { [key: string]: any }
  detectedType: 'contract' | 'receivable' | 'expense' | 'unknown'
}

export interface DataSection {
  type: 'contract' | 'receivable' | 'expense'
  startRow: number
  endRow: number
  rowCount: number
  confidence: number
}

export interface ProcessedSheet {
  name: string
  headers: string[]
  columnMap: { [key: string]: number }
  data: ProcessedRow[]
  sections: DataSection[]
  metadata: {
    headerRow: number
    totalRows: number
    nonEmptyRows: number
  }
}

export interface FileMetadata {
  filename: string
  sheetCount: number
  totalRows: number
}