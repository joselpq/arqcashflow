/**
 * DataTransformer - Data Transformation and Post-Processing
 *
 * Responsibilities:
 * - Transform raw CSV values to typed entities
 * - Currency parsing (Brazilian and US formats)
 * - Date normalization to ISO-8601
 * - Status/enum mapping (Portuguese → English)
 * - Post-processing with inference and validation
 * - CSV parsing utilities
 *
 * This component implements deterministic, rule-based transformation
 * without AI, enabling fast Phase 3 extraction (<1s).
 *
 * Architecture: Single Responsibility Principle
 * - Focused on value transformation and data cleaning
 * - No external dependencies (pure logic)
 * - Clear separation from AI analysis and database operations
 *
 * Extracted from SetupAssistantServiceV2.ts (lines 553-1038)
 * Part of ADR-026: SetupAssistant Service Decomposition
 */

import type { ExtractionResult } from '../../SetupAssistantService'

/**
 * Column mapping configuration
 */
export interface ColumnMapping {
  [csvColumn: string]: {
    field: string
    transform: 'date' | 'currency' | 'status' | 'text' | 'number' | 'enum'
    enumValues?: string[]
  }
}

/**
 * DataTransformer - Value transformation and post-processing
 *
 * Key Methods:
 * - transformValue(): Transform single value based on type
 * - extractEntity(): Extract entity from row using column mapping
 * - postProcessEntities(): Apply inference and validation rules
 * - parseCSV(): Parse CSV string to rows
 * - normalizeDate(): Normalize dates to ISO-8601 format
 *
 * Transformation Types:
 * - currency: Handles R$ 1.500,50, 1500.5, etc.
 * - date: Converts DD/MM/YYYY, DD-MMM-YY, etc. to YYYY-MM-DD
 * - status: Maps Portuguese terms (Pendente, Pago) to English enums
 * - number: Parses numeric values with locale awareness
 * - text: Returns cleaned string
 *
 * Example Usage:
 * ```typescript
 * const transformer = new DataTransformer()
 * const entity = transformer.extractEntity(row, columnMapping)
 * const result = transformer.postProcessEntities(extractedData)
 * ```
 */
export class DataTransformer {
  /**
   * Transform a value based on its type
   * Returns null for empty/invalid values
   */
  transformValue(
    value: string | null | undefined,
    transform: ColumnMapping[string]['transform'],
    enumValues?: string[]
  ): any {
    if (!value || value.trim() === '') return null

    const cleaned = value.trim()

    switch (transform) {
      case 'currency':
        return this.transformCurrency(cleaned)

      case 'date':
        return this.normalizeDate(cleaned)

      case 'status':
      case 'enum':
        return this.transformStatus(cleaned, enumValues)

      case 'number':
        return this.transformNumber(cleaned)

      case 'text':
      default:
        return cleaned
    }
  }

  /**
   * Transform currency value to number
   * Handles Brazilian (R$ 1.500,50) and US (1,500.50) formats
   * @private
   */
  private transformCurrency(cleaned: string): number | null {
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
  }

  /**
   * Transform status/enum value
   * Maps Portuguese terms to English enums
   * @private
   */
  private transformStatus(cleaned: string, enumValues?: string[]): string {
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
  }

  /**
   * Transform number value
   * @private
   */
  private transformNumber(cleaned: string): number | null {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.')
    const numValue = parseFloat(normalized)
    // CRITICAL: Check for NaN and return null instead
    return isNaN(numValue) ? null : numValue
  }

  /**
   * Extract entity from row using column mapping
   * Handles duplicate field mappings by prioritizing first non-null value
   */
  extractEntity(
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

  /**
   * Parse CSV string to array of row objects
   */
  parseCSV(csv: string): Record<string, string>[] {
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

  /**
   * Parse single CSV line with quote handling
   * RFC 4180 compliant
   * @private
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

  /**
   * Post-process extracted entities with inference and validation
   * Bridges the gap between extraction (optional fields) and validation (required fields)
   */
  postProcessEntities(data: ExtractionResult): ExtractionResult {
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
  normalizeDate(dateInput: string | Date): string {
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
}
