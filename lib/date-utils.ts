/**
 * Date utility functions to handle timezone-safe date operations
 * Ensures consistent date handling across the application
 */

/**
 * Safely compares if a date is before another date, ignoring time and timezone
 */
export function isDateBefore(dateStr: string | Date, compareDate: Date): boolean {
  const date = new Date(dateStr)
  const compareDateOnly = new Date(compareDate.getFullYear(), compareDate.getMonth(), compareDate.getDate())
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return dateOnly < compareDateOnly
}

/**
 * Safely checks if a date is within a range, ignoring time and timezone
 */
export function isDateInRange(dateStr: string | Date, startDate: Date, endDate: Date): boolean {
  const date = new Date(dateStr)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const endOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  return dateOnly >= startOnly && dateOnly <= endOnly
}

/**
 * Formats a date string for display, avoiding timezone conversion issues
 * Returns format like "01/12" (day/month)
 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return ''

  // Handle ISO date strings to avoid timezone conversion issues
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    // Extract date part from ISO string and format manually to avoid timezone conversion
    const datePart = dateStr.split('T')[0]
    const [year, month, day] = datePart.split('-')
    return `${day}/${month}`
  }

  // For regular date strings, try to parse safely
  const d = new Date(dateStr + 'T00:00:00') // Add time to avoid timezone issues
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  })
}

/**
 * Formats a date string for full display, avoiding timezone conversion issues
 * Returns format like "01/12/2024" (day/month/year)
 */
export function formatDateFull(dateStr: string | Date): string {
  if (!dateStr) return ''

  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    // Extract date part from ISO string and format manually to avoid timezone conversion
    const datePart = dateStr.split('T')[0]
    const [year, month, day] = datePart.split('-')
    return `${day}/${month}/${year}`
  }

  const d = new Date(dateStr)
  // Use date-fns format for consistency with other parts of the app
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
}

/**
 * Formats a date for input fields, avoiding timezone conversion issues
 * Returns format like "2024-12-01" (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | Date): string {
  if (!date) return ''

  if (typeof date === 'string' && date.includes('T')) {
    // Extract date part from ISO string to avoid timezone conversion
    return date.split('T')[0]
  }

  const d = new Date(date)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

/**
 * Get today's date in YYYY-MM-DD format for date inputs
 * Uses local timezone to ensure correct date regardless of server timezone
 */
export function getTodayDateString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Creates a date for database storage, preserving the local date
 * Avoids timezone shifts by parsing the date components directly
 */
export function createDateForStorage(dateStr: string): Date {
  console.log('🔧 createDateForStorage called with:', dateStr)

  if (!dateStr || dateStr.trim() === '') {
    console.log('❌ Empty date string provided')
    throw new Error('Date string cannot be empty')
  }

  try {
    // Parse the date string (YYYY-MM-DD format)
    const parts = dateStr.split('-')
    if (parts.length !== 3) {
      throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD format`)
    }

    const [year, month, day] = parts.map(Number)

    // Basic validation
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      throw new Error(`Invalid date components in: ${dateStr}`)
    }

    // Create a date in local timezone at noon to avoid DST issues
    const date = new Date(year, month - 1, day, 12, 0, 0, 0)

    console.log('✅ createDateForStorage success:', date)
    return date
  } catch (error) {
    console.error('❌ createDateForStorage error:', error)
    throw error
  }
}

/**
 * Checks if a receivable is overdue based on expected date and status
 * Standardizes overdue calculation across the application
 */
export function isReceivableOverdue(receivable: {
  status: string
  expectedDate: string | Date
  receivedDate?: string | Date | null
}): boolean {
  // Only pending receivables can be overdue
  if (receivable.status !== 'pending' || receivable.receivedDate) {
    return false
  }

  const expectedDate = new Date(receivable.expectedDate)
  expectedDate.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return expectedDate < today
}

/**
 * Checks if an expense is overdue based on due date and status
 * Standardizes overdue calculation across the application
 */
export function isExpenseOverdue(expense: {
  status: string
  dueDate: string | Date
  paidDate?: string | Date | null
}): boolean {
  // Only pending expenses can be overdue
  if (expense.status !== 'pending' || expense.paidDate) {
    return false
  }

  const dueDate = new Date(expense.dueDate)
  dueDate.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return dueDate < today
}

/**
 * Gets the actual status of a receivable, including overdue calculation
 * Returns 'overdue' if the receivable is past due, otherwise returns original status
 */
export function getReceivableActualStatus(receivable: {
  status: string
  expectedDate: string | Date
  receivedDate?: string | Date | null
}): string {
  if (isReceivableOverdue(receivable)) {
    return 'overdue'
  }
  return receivable.status
}

/**
 * Gets the actual status of an expense, including overdue calculation
 * Returns 'overdue' if the expense is past due, otherwise returns original status
 */
export function getExpenseActualStatus(expense: {
  status: string
  dueDate: string | Date
  paidDate?: string | Date | null
}): string {
  if (isExpenseOverdue(expense)) {
    return 'overdue'
  }
  return expense.status
}