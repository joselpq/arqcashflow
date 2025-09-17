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
 * Creates a date for database storage, ensuring it's stored as date-only
 */
export function createDateForStorage(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z')
}