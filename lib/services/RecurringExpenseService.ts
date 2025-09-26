/**
 * RecurringExpenseService - Business logic for recurring expense management
 *
 * Extracts all recurring expense-related business logic from API routes into a reusable service.
 * Handles recurring expense templates, generation, and bulk operations.
 *
 * Features:
 * - Team-scoped recurring expense operations
 * - Recurring expense creation and management
 * - Schedule calculation and validation
 * - Advanced filtering and summaries
 * - Audit logging for all mutations
 * - Business rule validation
 */

import { RecurringExpense, Contract, User, Expense } from '@prisma/client'
import { BaseService, ServiceContext, ServiceError, ValidationUtils } from './BaseService'
import { RecurringExpenseSchemas, BusinessRuleValidation } from '@/lib/validation/financial'
import { createDateForStorage } from '@/lib/date-utils'
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit-middleware'
import { z } from 'zod'
import { addMonths, addWeeks, addYears, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns'

// Type definitions
export interface RecurringExpenseWithRelations extends RecurringExpense {
  contract?: Contract | null
  user?: User | null
  expenses?: Array<{
    id: string
    dueDate: Date
    status: string
    amount: number
    description: string
  }>
}

export interface RecurringExpenseFilters {
  contractId?: string
  category?: string
  frequency?: string
  vendor?: string
  isActive?: boolean
  startAfter?: string
  startBefore?: string
  endAfter?: string
  endBefore?: string
}

export interface RecurringExpenseCreateData {
  description: string
  amount: number
  category: string
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annual'
  interval: number
  dayOfMonth?: number | null
  startDate: string
  endDate?: string | null
  maxOccurrences?: number | null
  contractId?: string | null
  vendor?: string | null
  invoiceNumber?: string | null
  type?: 'operational' | 'project' | 'administrative' | null
  notes?: string | null
  isActive?: boolean
}

export interface RecurringExpenseUpdateData {
  description?: string
  amount?: number
  category?: string
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'annual'
  interval?: number
  dayOfMonth?: number | null
  startDate?: string
  endDate?: string | null
  maxOccurrences?: number | null
  contractId?: string | null
  vendor?: string | null
  invoiceNumber?: string | null
  type?: 'operational' | 'project' | 'administrative' | null
  notes?: string | null
  isActive?: boolean
}

export interface RecurringExpenseSummary {
  totalActive: number
  totalInactive: number
  totalAmount: number
  byFrequency: Record<string, { count: number; amount: number }>
  byCategory: Record<string, { count: number; amount: number }>
  byType: Record<string, { count: number; amount: number }>
}

export interface SeriesGenerationOptions {
  maxYears?: number // Maximum years to generate (default: 2)
  maxInstances?: number // Maximum instances to generate (default: 100)
  generatePast?: boolean // Whether to generate past expenses (default: true)
}

export interface SeriesUpdateScope {
  scope: 'single' | 'future' | 'all'
  targetExpenseId?: string // Required for 'single' scope
}

export interface SeriesGenerationResult {
  recurringExpenseId: string
  generatedCount: number
  expenses: Expense[]
  errors?: string[]
}

/**
 * RecurringExpenseService - Centralized business logic for recurring expense operations
 */
export class RecurringExpenseService extends BaseService {
  constructor(context: ServiceContext) {
    super(context)
  }

  /**
   * Find recurring expense by ID with optional relations
   */
  async findById(
    id: string,
    options: {
      includeContract?: boolean
      includeUser?: boolean
      includeExpenses?: boolean
      expensesLimit?: number
    } = {}
  ): Promise<RecurringExpenseWithRelations | null> {
    const include: any = {}

    if (options.includeContract) {
      include.contract = {
        select: {
          id: true,
          clientName: true,
          projectName: true
        }
      }
    }

    if (options.includeUser) {
      include.user = {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }

    if (options.includeExpenses) {
      include.expenses = {
        select: {
          id: true,
          dueDate: true,
          status: true,
          amount: true,
          description: true
        },
        orderBy: { dueDate: 'desc' },
        ...(options.expensesLimit && { take: options.expensesLimit })
      }
    }

    const recurringExpense = await this.context.teamScopedPrisma.recurringExpense.findUnique({
      where: { id },
      include
    })

    return recurringExpense as RecurringExpenseWithRelations
  }

  /**
   * Create new recurring expense with validation
   */
  async create(data: RecurringExpenseCreateData): Promise<RecurringExpenseWithRelations> {
    // Validate input data
    const validatedData = RecurringExpenseSchemas.create.parse(data)

    // Business rule validation
    if (validatedData.endDate) {
      const isValidDateRange = BusinessRuleValidation.validateRecurringDateRange(
        validatedData.startDate,
        validatedData.endDate
      )
      if (!isValidDateRange) {
        throw new ServiceError('End date must be after start date', 'INVALID_DATE_RANGE')
      }
    }

    // Calculate nextDue date
    const nextDue = this.calculateNextDue(
      createDateForStorage(validatedData.startDate),
      validatedData.frequency,
      validatedData.interval,
      validatedData.dayOfMonth || undefined
    )

    // Prepare creation data
    const createData = {
      ...validatedData,
      startDate: createDateForStorage(validatedData.startDate),
      endDate: validatedData.endDate ? createDateForStorage(validatedData.endDate) : null,
      nextDue,
      isActive: validatedData.isActive ?? true,
      generatedCount: 0,
      lastGenerated: null,
      createdBy: this.context.user.id
    }

    // Create the recurring expense
    const recurringExpense = await this.context.teamScopedPrisma.recurringExpense.create({
      data: createData,
      include: {
        contract: {
          select: {
            id: true,
            clientName: true,
            projectName: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Audit logging
    await this.logAudit(async () => {
      const auditContext = this.createAuditContext('recurring_expense_creation')
      await auditCreate(auditContext, 'recurring_expense', recurringExpense.id, recurringExpense)
    })

    // Generate full series of expenses
    const seriesResult = await this.generateFullSeries(recurringExpense.id)

    // Return recurring expense with generated expenses
    const recurringExpenseWithSeries = await this.findById(recurringExpense.id, {
      includeContract: true,
      includeUser: true,
      includeExpenses: true,
      expensesLimit: 10
    })

    return recurringExpenseWithSeries as RecurringExpenseWithRelations
  }

  /**
   * Update recurring expense with validation
   */
  async update(id: string, data: RecurringExpenseUpdateData): Promise<RecurringExpenseWithRelations | null> {
    // Get existing recurring expense
    const existing = await this.findById(id)
    if (!existing) {
      return null
    }

    // Validate input data
    const validatedData = RecurringExpenseSchemas.update.parse(data)

    // Business rule validation for date range if dates are being updated
    if (validatedData.endDate !== undefined || validatedData.startDate) {
      const startDate = validatedData.startDate || existing.startDate.toISOString()
      const endDate = validatedData.endDate

      if (endDate) {
        const isValidDateRange = BusinessRuleValidation.validateRecurringDateRange(startDate, endDate)
        if (!isValidDateRange) {
          throw new ServiceError('End date must be after start date', 'INVALID_DATE_RANGE')
        }
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData }

    // Convert dates to storage format
    if (validatedData.startDate) {
      updateData.startDate = createDateForStorage(validatedData.startDate)
    }
    if (validatedData.endDate !== undefined) {
      updateData.endDate = validatedData.endDate ? createDateForStorage(validatedData.endDate) : null
    }

    // Recalculate nextDue if schedule parameters changed
    if (
      validatedData.frequency ||
      validatedData.interval !== undefined ||
      validatedData.dayOfMonth !== undefined ||
      validatedData.startDate
    ) {
      const frequency = validatedData.frequency || existing.frequency
      const interval = validatedData.interval !== undefined ? validatedData.interval : existing.interval
      const dayOfMonth = validatedData.dayOfMonth !== undefined ? validatedData.dayOfMonth : existing.dayOfMonth
      const startDate = updateData.startDate || existing.startDate

      updateData.nextDue = this.calculateNextDue(startDate, frequency, interval, dayOfMonth || undefined)
    }

    // Update the recurring expense
    const updatedRecurringExpense = await this.context.teamScopedPrisma.recurringExpense.update({
      where: { id },
      data: updateData,
      include: {
        contract: {
          select: {
            id: true,
            clientName: true,
            projectName: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        expenses: {
          select: {
            id: true,
            dueDate: true,
            status: true,
            amount: true,
            description: true
          },
          orderBy: { dueDate: 'desc' },
          take: 5
        }
      }
    })

    // Audit logging
    await this.logAudit(async () => {
      const auditContext = this.createAuditContext('recurring_expense_update')
      await auditUpdate(auditContext, 'recurring_expense', id, validatedData, updatedRecurringExpense)
    })

    return updatedRecurringExpense as RecurringExpenseWithRelations
  }

  /**
   * Delete recurring expense
   */
  async delete(id: string): Promise<boolean> {
    // Get existing recurring expense for audit
    const existing = await this.findById(id)
    if (!existing) {
      return false
    }

    // Delete the recurring expense (generated expenses will remain)
    await this.context.teamScopedPrisma.recurringExpense.delete({
      where: { id }
    })

    // Audit logging
    await this.logAudit(async () => {
      const auditContext = this.createAuditContext('recurring_expense_deletion')
      await auditDelete(auditContext, 'recurring_expense', id, existing)
    })

    return true
  }

  /**
   * Calculate next due date based on frequency and interval
   */
  private calculateNextDue(startDate: Date, frequency: string, interval: number, dayOfMonth?: number): Date {
    const next = new Date(startDate)

    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + (7 * interval))
        break
      case 'monthly':
        if (dayOfMonth) {
          next.setDate(dayOfMonth)
          if (next <= startDate) {
            next.setMonth(next.getMonth() + interval)
          }
        } else {
          next.setMonth(next.getMonth() + interval)
        }
        break
      case 'quarterly':
        next.setMonth(next.getMonth() + (3 * interval))
        if (dayOfMonth) {
          next.setDate(dayOfMonth)
        }
        break
      case 'annual':
        next.setFullYear(next.getFullYear() + interval)
        if (dayOfMonth) {
          next.setDate(dayOfMonth)
        }
        break
    }

    return next
  }

  /**
   * Find all recurring expenses with filtering and sorting
   */
  async findMany(
    filters: RecurringExpenseFilters = {},
    options: {
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      limit?: number
      offset?: number
      includeContract?: boolean
      includeUser?: boolean
      includeExpenses?: boolean
    } = {}
  ): Promise<RecurringExpenseWithRelations[]> {
    // Build where clause from filters
    const where: any = {}

    if (filters.contractId) where.contractId = filters.contractId
    if (filters.category) where.category = filters.category
    if (filters.frequency) where.frequency = filters.frequency
    if (filters.vendor) where.vendor = { contains: filters.vendor, mode: 'insensitive' }
    if (filters.isActive !== undefined) where.isActive = filters.isActive

    if (filters.startAfter) {
      where.startDate = { ...where.startDate, gte: createDateForStorage(filters.startAfter) }
    }
    if (filters.startBefore) {
      where.startDate = { ...where.startDate, lte: createDateForStorage(filters.startBefore) }
    }
    if (filters.endAfter && filters.endBefore) {
      where.endDate = {
        gte: createDateForStorage(filters.endAfter),
        lte: createDateForStorage(filters.endBefore)
      }
    } else if (filters.endAfter) {
      where.endDate = { gte: createDateForStorage(filters.endAfter) }
    } else if (filters.endBefore) {
      where.endDate = { lte: createDateForStorage(filters.endBefore) }
    }

    // Build include clause
    const include: any = {}
    if (options.includeContract) {
      include.contract = {
        select: { id: true, clientName: true, projectName: true }
      }
    }
    if (options.includeUser) {
      include.user = {
        select: { id: true, name: true, email: true }
      }
    }
    if (options.includeExpenses) {
      include.expenses = {
        select: {
          id: true, dueDate: true, status: true, amount: true, description: true
        },
        orderBy: { dueDate: 'desc' },
        take: 3
      }
    }

    // Build orderBy clause
    const orderBy: any = {}
    const sortBy = options.sortBy || 'createdAt'
    const sortOrder = options.sortOrder || 'desc'
    orderBy[sortBy] = sortOrder

    const recurringExpenses = await this.context.teamScopedPrisma.recurringExpense.findMany({
      where,
      include,
      orderBy,
      ...(options.limit && { take: options.limit }),
      ...(options.offset && { skip: options.offset })
    })

    return recurringExpenses as RecurringExpenseWithRelations[]
  }

  /**
   * Get summary statistics for recurring expenses
   */
  async getSummary(filters: RecurringExpenseFilters = {}): Promise<RecurringExpenseSummary> {
    const recurringExpenses = await this.findMany(filters)

    const summary: RecurringExpenseSummary = {
      totalActive: 0,
      totalInactive: 0,
      totalAmount: 0,
      byFrequency: {},
      byCategory: {},
      byType: {}
    }

    for (const re of recurringExpenses) {
      // Count active/inactive
      if (re.isActive) {
        summary.totalActive++
        summary.totalAmount += re.amount
      } else {
        summary.totalInactive++
      }

      // Group by frequency
      const freq = re.frequency
      if (!summary.byFrequency[freq]) {
        summary.byFrequency[freq] = { count: 0, amount: 0 }
      }
      summary.byFrequency[freq].count++
      if (re.isActive) summary.byFrequency[freq].amount += re.amount

      // Group by category
      const cat = re.category
      if (!summary.byCategory[cat]) {
        summary.byCategory[cat] = { count: 0, amount: 0 }
      }
      summary.byCategory[cat].count++
      if (re.isActive) summary.byCategory[cat].amount += re.amount

      // Group by type
      const type = re.type || 'none'
      if (!summary.byType[type]) {
        summary.byType[type] = { count: 0, amount: 0 }
      }
      summary.byType[type].count++
      if (re.isActive) summary.byType[type].amount += re.amount
    }

    return summary
  }

  /**
   * Generate full series of expenses for a recurring expense
   */
  async generateFullSeries(
    recurringExpenseId: string,
    options: SeriesGenerationOptions = {}
  ): Promise<SeriesGenerationResult> {
    const {
      maxYears = 2,
      maxInstances = 100,
      generatePast = true
    } = options

    const result: SeriesGenerationResult = {
      recurringExpenseId,
      generatedCount: 0,
      expenses: [],
      errors: []
    }

    try {
      // Get the recurring expense
      const recurringExpense = await this.findById(recurringExpenseId)
      if (!recurringExpense) {
        throw new ServiceError('Recurring expense not found', 'NOT_FOUND')
      }

      const now = new Date()
      const startDate = new Date(recurringExpense.startDate)
      const maxEndDate = addYears(now, maxYears)

      // Determine the actual end date
      let endDate = maxEndDate
      if (recurringExpense.endDate && isBefore(recurringExpense.endDate, maxEndDate)) {
        endDate = recurringExpense.endDate
      }

      // Generate expenses
      let currentDate = new Date(startDate)
      let instanceCount = 0

      while (
        !isAfter(currentDate, endDate) &&
        instanceCount < maxInstances &&
        (!recurringExpense.maxOccurrences || instanceCount < recurringExpense.maxOccurrences)
      ) {
        // Skip past expenses if generatePast is false
        if (!generatePast && isBefore(currentDate, now)) {
          currentDate = this.calculateNextDue(
            currentDate,
            recurringExpense.frequency,
            recurringExpense.interval,
            recurringExpense.dayOfMonth || undefined
          )
          continue
        }

        // Check if expense already exists for this date
        const existingExpense = await this.context.teamScopedPrisma.expense.findFirst({
          where: {
            recurringExpenseId: recurringExpense.id,
            dueDate: {
              gte: startOfDay(currentDate),
              lte: endOfDay(currentDate)
            }
          }
        })

        if (!existingExpense) {
          // Generate expense description with date context
          const dateStr = currentDate.toLocaleDateString('pt-BR')
          const description = `${recurringExpense.description} (${dateStr})`

          // Determine if past expense should be marked as paid
          const isPastExpense = isBefore(currentDate, now)

          // Create the expense
          const expense = await this.context.teamScopedPrisma.expense.create({
            data: {
              description,
              amount: recurringExpense.amount,
              dueDate: currentDate,
              category: recurringExpense.category,
              status: isPastExpense && generatePast ? 'paid' : 'pending',
              paidDate: isPastExpense && generatePast ? currentDate : null,
              paidAmount: isPastExpense && generatePast ? recurringExpense.amount : null,
              vendor: recurringExpense.vendor,
              invoiceNumber: recurringExpense.invoiceNumber ?
                `${recurringExpense.invoiceNumber}-${currentDate.getMonth() + 1}${currentDate.getFullYear()}` :
                null,
              type: recurringExpense.type,
              isRecurring: true,
              notes: isPastExpense && generatePast ?
                `Generated from recurring expense: ${recurringExpense.description} (auto-marked as paid)` :
                `Generated from recurring expense: ${recurringExpense.description}`,
              recurringExpenseId: recurringExpense.id,
              contractId: recurringExpense.contractId,
              teamId: this.context.teamId
            }
          })

          result.expenses.push(expense)
          result.generatedCount++
        }

        instanceCount++

        // Calculate next date
        currentDate = this.calculateNextDue(
          currentDate,
          recurringExpense.frequency,
          recurringExpense.interval,
          recurringExpense.dayOfMonth || undefined
        )
      }

      // Update recurring expense with generation info
      await this.context.teamScopedPrisma.recurringExpense.update({
        where: { id: recurringExpenseId },
        data: {
          generatedCount: result.generatedCount,
          lastGenerated: now,
          nextDue: currentDate // Next due after all generated
        }
      })

    } catch (error) {
      console.error('Error generating full series:', error)
      result.errors?.push(error instanceof Error ? error.message : 'Unknown error')
      throw error
    }

    return result
  }

  /**
   * Update series of expenses with different scopes
   */
  async updateExpenseSeries(
    recurringExpenseId: string,
    data: RecurringExpenseUpdateData,
    updateScope: SeriesUpdateScope
  ): Promise<{ updatedCount: number }> {
    // Get the recurring expense
    const recurringExpense = await this.findById(recurringExpenseId)
    if (!recurringExpense) {
      throw new ServiceError('Recurring expense not found', 'NOT_FOUND')
    }

    let updatedCount = 0
    const now = new Date()

    // Build the where clause based on scope
    const whereClause: any = {
      recurringExpenseId,
      teamId: this.context.teamId
    }

    switch (updateScope.scope) {
      case 'single':
        if (!updateScope.targetExpenseId) {
          throw new ServiceError('Target expense ID required for single update', 'INVALID_REQUEST')
        }
        whereClause.id = updateScope.targetExpenseId
        break

      case 'future':
        whereClause.dueDate = { gte: now }
        whereClause.status = 'pending' // Only update unpaid future expenses
        break

      case 'all':
        // No additional filters - update all expenses in the series
        break
    }

    // Prepare update data for expenses
    const expenseUpdateData: any = {}
    if (data.amount !== undefined) expenseUpdateData.amount = data.amount
    if (data.description !== undefined) expenseUpdateData.description = data.description
    if (data.category !== undefined) expenseUpdateData.category = data.category
    if (data.vendor !== undefined) expenseUpdateData.vendor = data.vendor
    if (data.type !== undefined) expenseUpdateData.type = data.type
    if (data.notes !== undefined) expenseUpdateData.notes = data.notes

    // Update the expenses
    const updateResult = await this.context.teamScopedPrisma.expense.updateMany({
      where: whereClause,
      data: expenseUpdateData
    })

    updatedCount = updateResult.count

    // If updating all or future, also update the recurring expense template
    if (updateScope.scope !== 'single') {
      await this.update(recurringExpenseId, data)
    }

    // Audit logging
    await this.logAudit(async () => {
      const auditContext = this.createAuditContext('expense_series_update')
      await auditUpdate(auditContext, 'expense_series', recurringExpenseId, {
        scope: updateScope.scope,
        updatedCount,
        ...data
      }, null)
    })

    return { updatedCount }
  }

  /**
   * Delete series of expenses with different scopes
   */
  async deleteExpenseSeries(
    recurringExpenseId: string,
    deleteScope: SeriesUpdateScope
  ): Promise<{ deletedCount: number }> {
    // Get the recurring expense
    const recurringExpense = await this.findById(recurringExpenseId)
    if (!recurringExpense) {
      throw new ServiceError('Recurring expense not found', 'NOT_FOUND')
    }

    let deletedCount = 0
    const now = new Date()

    // Build the where clause based on scope
    const whereClause: any = {
      recurringExpenseId,
      teamId: this.context.teamId
    }

    switch (deleteScope.scope) {
      case 'single':
        if (!deleteScope.targetExpenseId) {
          throw new ServiceError('Target expense ID required for single deletion', 'INVALID_REQUEST')
        }
        whereClause.id = deleteScope.targetExpenseId
        break

      case 'future':
        whereClause.dueDate = { gte: now }
        whereClause.status = 'pending' // Only delete unpaid future expenses
        break

      case 'all':
        // Delete all expenses in the series
        break
    }

    // Delete the expenses
    const deleteResult = await this.context.teamScopedPrisma.expense.deleteMany({
      where: whereClause
    })

    deletedCount = deleteResult.count

    // If deleting all, also delete the recurring expense template
    if (deleteScope.scope === 'all') {
      await this.delete(recurringExpenseId)
    } else if (deleteScope.scope === 'future') {
      // If deleting future, mark recurring expense as inactive
      await this.update(recurringExpenseId, { isActive: false })
    }

    // Audit logging
    await this.logAudit(async () => {
      const auditContext = this.createAuditContext('expense_series_deletion')
      await auditDelete(auditContext, 'expense_series', recurringExpenseId, {
        scope: deleteScope.scope,
        deletedCount
      })
    })

    return { deletedCount }
  }

  /**
   * Regenerate series when frequency/interval changes
   */
  async regenerateSeries(
    recurringExpenseId: string,
    preservePaidExpenses = true
  ): Promise<SeriesGenerationResult> {
    // Get the recurring expense
    const recurringExpense = await this.findById(recurringExpenseId)
    if (!recurringExpense) {
      throw new ServiceError('Recurring expense not found', 'NOT_FOUND')
    }

    // Delete future unpaid expenses
    const deleteScope: SeriesUpdateScope = {
      scope: preservePaidExpenses ? 'future' : 'all'
    }

    await this.deleteExpenseSeries(recurringExpenseId, deleteScope)

    // Generate new series
    const result = await this.generateFullSeries(recurringExpenseId, {
      generatePast: !preservePaidExpenses
    })

    return result
  }
}