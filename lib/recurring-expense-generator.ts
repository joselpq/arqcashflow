import { prisma } from './prisma'
import { createDateForStorage } from './date-utils'
import { addDays, addWeeks, addMonths, addYears, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'

export interface RecurringExpense {
  id: string
  description: string
  amount: number
  category: string
  vendor?: string | null
  frequency: string
  interval: number
  dayOfMonth?: number | null
  startDate: Date
  endDate?: Date | null
  isActive: boolean
  lastGenerated?: Date | null
  nextDue: Date
  notes?: string | null
  teamId: string
  createdBy: string
  contractId?: string | null
  type?: string | null
  maxOccurrences?: number | null
  generatedCount: number
  lastError?: string | null
  invoiceNumber?: string | null
}

export interface GenerationOptions {
  lookAheadMonths?: number // How many months ahead to generate (default: 3)
  maxBatchSize?: number     // Maximum expenses to generate per run (default: 50)
  teamId?: string          // Generate only for specific team
}

export interface GenerationResult {
  success: boolean
  generated: number
  errors: string[]
  skipped: number
  details: {
    recurringExpenseId: string
    generated: number
    error?: string
  }[]
}

// Brazilian business calendar utilities
const BRAZILIAN_HOLIDAYS_2024_2025 = [
  '2024-01-01', // New Year
  '2024-04-21', // Tiradentes
  '2024-05-01', // Labor Day
  '2024-09-07', // Independence Day
  '2024-10-12', // Our Lady of Aparecida
  '2024-11-02', // All Souls Day
  '2024-11-15', // Proclamation of the Republic
  '2024-12-25', // Christmas
  '2025-01-01', // New Year
  '2025-04-21', // Tiradentes
  '2025-05-01', // Labor Day
  '2025-09-07', // Independence Day
  '2025-10-12', // Our Lady of Aparecida
  '2025-11-02', // All Souls Day
  '2025-11-15', // Proclamation of the Republic
  '2025-12-25', // Christmas
]

function isBrazilianHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0]
  return BRAZILIAN_HOLIDAYS_2024_2025.includes(dateStr)
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

function getNextBusinessDay(date: Date): Date {
  let nextDay = new Date(date)

  while (isWeekend(nextDay) || isBrazilianHoliday(nextDay)) {
    nextDay = addDays(nextDay, 1)
  }

  return nextDay
}

// Handle month-end scenarios for Brazilian business practices
function adjustForMonthEnd(date: Date, dayOfMonth: number): Date {
  const year = date.getFullYear()
  const month = date.getMonth()
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()

  // If requested day doesn't exist in this month (e.g., Feb 30), use last day
  const targetDay = Math.min(dayOfMonth, lastDayOfMonth)

  const adjustedDate = new Date(year, month, targetDay)

  // For business expenses, move to next business day if needed
  return getNextBusinessDay(adjustedDate)
}

function calculateNextDueDate(
  currentDate: Date,
  frequency: string,
  interval: number,
  dayOfMonth?: number | null
): Date {
  let nextDate: Date

  switch (frequency) {
    case 'weekly':
      nextDate = addWeeks(currentDate, interval)
      break

    case 'monthly':
      if (dayOfMonth) {
        // Calculate next occurrence of the specific day of month
        nextDate = addMonths(currentDate, interval)
        nextDate = adjustForMonthEnd(nextDate, dayOfMonth)
      } else {
        // Use the same day of month as current date
        nextDate = addMonths(currentDate, interval)
      }
      break

    case 'quarterly':
      nextDate = addMonths(currentDate, 3 * interval)
      if (dayOfMonth) {
        nextDate = adjustForMonthEnd(nextDate, dayOfMonth)
      }
      break

    case 'annual':
      nextDate = addYears(currentDate, interval)
      if (dayOfMonth) {
        nextDate = adjustForMonthEnd(nextDate, dayOfMonth)
      }
      break

    default:
      throw new Error(`Unsupported frequency: ${frequency}`)
  }

  return nextDate
}

function shouldGenerateExpense(
  recurringExpense: RecurringExpense,
  targetDate: Date
): boolean {
  // Check if still active
  if (!recurringExpense.isActive) {
    return false
  }

  // Check if we've exceeded max occurrences
  if (recurringExpense.maxOccurrences &&
      recurringExpense.generatedCount >= recurringExpense.maxOccurrences) {
    return false
  }

  // Check if past end date
  if (recurringExpense.endDate && isAfter(targetDate, recurringExpense.endDate)) {
    return false
  }

  // Check if before start date
  if (isBefore(targetDate, recurringExpense.startDate)) {
    return false
  }

  return true
}

async function generateExpenseForDate(
  recurringExpense: RecurringExpense,
  dueDate: Date,
  markAsPaid = false
): Promise<{ success: boolean; expenseId?: string; error?: string }> {
  try {
    // Check if expense already exists for this date
    const existingExpense = await prisma.expense.findFirst({
      where: {
        recurringExpenseId: recurringExpense.id,
        dueDate: {
          gte: startOfDay(dueDate),
          lte: endOfDay(dueDate),
        },
      },
    })

    if (existingExpense) {
      return { success: false, error: 'Expense already exists for this date' }
    }

    // Generate expense description with date context
    const dateStr = dueDate.toLocaleDateString('pt-BR')
    const description = `${recurringExpense.description} (${dateStr})`

    // Create the expense
    const expense = await prisma.expense.create({
      data: {
        description,
        amount: recurringExpense.amount,
        dueDate: dueDate,
        category: recurringExpense.category,
        status: markAsPaid ? 'paid' : 'pending',
        paidDate: markAsPaid ? dueDate : null,
        paidAmount: markAsPaid ? recurringExpense.amount : null,
        vendor: recurringExpense.vendor,
        invoiceNumber: recurringExpense.invoiceNumber ?
          `${recurringExpense.invoiceNumber}-${dueDate.getMonth() + 1}${dueDate.getFullYear()}` :
          null,
        type: recurringExpense.type,
        isRecurring: true,
        notes: markAsPaid ?
          `Gerado automaticamente de: ${recurringExpense.description} (marcado como pago automaticamente)` :
          `Gerado automaticamente de: ${recurringExpense.description}`,
        teamId: recurringExpense.teamId,
        contractId: recurringExpense.contractId,
        recurringExpenseId: recurringExpense.id,
        generatedDate: new Date(),
      },
    })

    return { success: true, expenseId: expense.id }

  } catch (error) {
    console.error('Error generating expense:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function generateRecurringExpenses(
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const {
    lookAheadMonths = 3,
    maxBatchSize = 50,
    teamId
  } = options

  const result: GenerationResult = {
    success: true,
    generated: 0,
    errors: [],
    skipped: 0,
    details: []
  }

  try {
    // Calculate target date range
    const now = new Date()
    const endDate = addMonths(now, lookAheadMonths)

    // Get active recurring expenses
    const whereClause: any = {
      isActive: true,
      nextDue: {
        lte: endDate
      }
    }

    if (teamId) {
      whereClause.teamId = teamId
    }

    const recurringExpenses = await prisma.recurringExpense.findMany({
      where: whereClause,
      orderBy: {
        nextDue: 'asc'
      },
      take: maxBatchSize
    })

    console.log(`Processing ${recurringExpenses.length} recurring expenses...`)

    for (const recurringExpense of recurringExpenses) {
      const detail = {
        recurringExpenseId: recurringExpense.id,
        generated: 0,
        error: undefined as string | undefined
      }

      try {
        let currentDue = new Date(recurringExpense.nextDue)
        let generated = 0

        // Generate expenses up to the end date
        while (currentDue <= endDate && generated < 10) { // Safety limit per recurring expense
          if (shouldGenerateExpense(recurringExpense, currentDue)) {
            const expenseResult = await generateExpenseForDate(recurringExpense, currentDue, false)

            if (expenseResult.success) {
              generated++
              result.generated++
            } else {
              if (expenseResult.error !== 'Expense already exists for this date') {
                detail.error = expenseResult.error
                result.errors.push(`${recurringExpense.description}: ${expenseResult.error}`)
              } else {
                result.skipped++
              }
            }
          }

          // Calculate next due date
          currentDue = calculateNextDueDate(
            currentDue,
            recurringExpense.frequency,
            recurringExpense.interval,
            recurringExpense.dayOfMonth
          )
        }

        detail.generated = generated

        // Update the recurring expense with new nextDue and generatedCount
        if (generated > 0) {
          await prisma.recurringExpense.update({
            where: { id: recurringExpense.id },
            data: {
              nextDue: currentDue,
              lastGenerated: now,
              generatedCount: recurringExpense.generatedCount + generated,
              lastError: null, // Clear any previous error
            },
          })
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        detail.error = errorMsg
        result.errors.push(`${recurringExpense.description}: ${errorMsg}`)
        result.success = false

        // Update recurring expense with error
        await prisma.recurringExpense.update({
          where: { id: recurringExpense.id },
          data: {
            lastError: errorMsg,
          },
        })
      }

      result.details.push(detail)
    }

    console.log(`Generation complete: ${result.generated} expenses generated, ${result.skipped} skipped, ${result.errors.length} errors`)

  } catch (error) {
    console.error('Fatal error in generateRecurringExpenses:', error)
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown fatal error')
  }

  return result
}

export async function generateInitialRecurringExpenses(
  recurringExpenseId: string,
  teamId: string
): Promise<GenerationResult> {
  const result: GenerationResult = {
    success: true,
    generated: 0,
    errors: [],
    skipped: 0,
    details: []
  }

  try {
    const recurringExpense = await prisma.recurringExpense.findFirst({
      where: {
        id: recurringExpenseId,
        teamId, // Ensure team isolation
      },
    })

    if (!recurringExpense) {
      result.success = false
      result.errors.push('Recurring expense not found')
      return result
    }

    const now = new Date()
    const startDate = new Date(recurringExpense.startDate)
    let currentDate = new Date(startDate)
    let generated = 0

    // Generate all expenses from start date up to current month
    while (currentDate <= now && generated < 50) { // Safety limit
      if (shouldGenerateExpense(recurringExpense, currentDate)) {
        // Determine if this expense should be marked as paid (past months)
        const isPastExpense = currentDate < now &&
          (now.getFullYear() > currentDate.getFullYear() ||
           (now.getFullYear() === currentDate.getFullYear() && now.getMonth() > currentDate.getMonth()))

        const expenseResult = await generateExpenseForDate(recurringExpense, currentDate, isPastExpense)

        if (expenseResult.success) {
          generated++
          result.generated++
        } else {
          if (expenseResult.error !== 'Expense already exists for this date') {
            result.errors.push(`${recurringExpense.description} (${currentDate.toDateString()}): ${expenseResult.error}`)
          } else {
            result.skipped++
          }
        }
      }

      // Calculate next occurrence
      currentDate = calculateNextDueDate(
        currentDate,
        recurringExpense.frequency,
        recurringExpense.interval,
        recurringExpense.dayOfMonth
      )
    }

    // Update recurring expense with correct nextDue and generatedCount
    if (generated > 0) {
      const nextDue = calculateNextDueDate(
        new Date(recurringExpense.startDate),
        recurringExpense.frequency,
        recurringExpense.interval,
        recurringExpense.dayOfMonth
      )

      // Find the next due date after current month
      let futureNextDue = nextDue
      while (futureNextDue <= now) {
        futureNextDue = calculateNextDueDate(
          futureNextDue,
          recurringExpense.frequency,
          recurringExpense.interval,
          recurringExpense.dayOfMonth
        )
      }

      await prisma.recurringExpense.update({
        where: { id: recurringExpenseId },
        data: {
          nextDue: futureNextDue,
          lastGenerated: now,
          generatedCount: recurringExpense.generatedCount + generated,
          lastError: null,
        },
      })
    }

    result.details.push({
      recurringExpenseId,
      generated: result.generated,
      error: result.errors[0]
    })

  } catch (error) {
    console.error('Error generating initial recurring expenses:', error)
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

export async function generateForSpecificRecurringExpense(
  recurringExpenseId: string,
  teamId: string
): Promise<GenerationResult> {
  const result: GenerationResult = {
    success: true,
    generated: 0,
    errors: [],
    skipped: 0,
    details: []
  }

  try {
    const recurringExpense = await prisma.recurringExpense.findFirst({
      where: {
        id: recurringExpenseId,
        teamId, // Ensure team isolation
      },
    })

    if (!recurringExpense) {
      result.success = false
      result.errors.push('Recurring expense not found')
      return result
    }

    // Generate next expense
    const nextDue = new Date(recurringExpense.nextDue)

    if (shouldGenerateExpense(recurringExpense, nextDue)) {
      const expenseResult = await generateExpenseForDate(recurringExpense, nextDue, false)

      if (expenseResult.success) {
        result.generated = 1

        // Calculate next due date and update
        const newNextDue = calculateNextDueDate(
          nextDue,
          recurringExpense.frequency,
          recurringExpense.interval,
          recurringExpense.dayOfMonth
        )

        await prisma.recurringExpense.update({
          where: { id: recurringExpenseId },
          data: {
            nextDue: newNextDue,
            lastGenerated: new Date(),
            generatedCount: recurringExpense.generatedCount + 1,
            lastError: null,
          },
        })
      } else {
        result.success = false
        result.errors.push(expenseResult.error || 'Unknown error')
      }
    } else {
      result.skipped = 1
      result.errors.push('Cannot generate expense at this time')
    }

    result.details.push({
      recurringExpenseId,
      generated: result.generated,
      error: result.errors[0]
    })

  } catch (error) {
    console.error('Error generating specific recurring expense:', error)
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}