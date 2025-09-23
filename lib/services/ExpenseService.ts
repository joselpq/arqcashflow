/**
 * ExpenseService - Business logic for expense management
 *
 * Extracts all expense-related business logic from API routes into a reusable service.
 * Handles both one-time and recurring expenses with comprehensive validation.
 *
 * Features:
 * - Team-scoped expense operations
 * - One-time and recurring expense support
 * - Advanced filtering, sorting, and summaries
 * - Audit logging for all mutations
 * - Business rule validation
 * - Status calculation based on dates and payments
 */

import { Expense, Contract, RecurringExpense } from '@prisma/client'
import { BaseService, ServiceContext, ServiceError, ValidationUtils } from './BaseService'
import { createDateForStorage, getExpenseActualStatus } from '@/lib/date-utils'
import { z } from 'zod'

// Type definitions
export interface ExpenseWithRelations extends Expense {
  contract?: Contract | null
  recurringExpense?: RecurringExpense | null
}

export interface ExpenseFilters {
  contractId?: string
  status?: string
  category?: string
  type?: string
  vendor?: string
  isRecurring?: boolean
  overdue?: boolean
  dueAfter?: string
  dueBefore?: string
  amountMin?: number
  amountMax?: number
}

export interface ExpenseCreateData {
  description: string
  amount: number
  dueDate: string
  category: string
  contractId?: string | null
  vendor?: string | null
  invoiceNumber?: string | null
  type?: 'operational' | 'project' | 'administrative' | null
  isRecurring?: boolean
  notes?: string | null
  receiptUrl?: string | null
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
  paidDate?: string | null
  paidAmount?: number | null
}

export interface ExpenseUpdateData {
  description?: string
  amount?: number
  dueDate?: string
  category?: string
  contractId?: string | null
  vendor?: string | null
  invoiceNumber?: string | null
  type?: 'operational' | 'project' | 'administrative' | null
  notes?: string | null
  receiptUrl?: string | null
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
  paidDate?: string | null
  paidAmount?: number | null
}

export interface ExpenseSummary {
  totalExpenses: number
  totalAmount: number
  totalPaid: number
  totalPending: number
  totalOverdue: number
  byStatus: Record<string, { count: number; amount: number }>
  byCategory: Record<string, { count: number; amount: number }>
  byType: Record<string, { count: number; amount: number }>
  byMonth: Record<string, { count: number; amount: number }>
}

// Validation schema (extracted from API route)
export const ExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  dueDate: z.string().min(1, 'Due date is required'),
  category: z.string().min(1, 'Category is required'),
  contractId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  vendor: z.string().optional().nullable().transform(val => val === '' ? null : val),
  invoiceNumber: z.string().optional().nullable().transform(val => val === '' ? null : val),
  type: z.enum(['operational', 'project', 'administrative']).optional().nullable(),
  isRecurring: z.boolean().default(false),
  notes: z.string().optional().nullable().transform(val => val === '' ? null : val),
  receiptUrl: z.string().optional().nullable().transform(val => val === '' ? null : val),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending'),
  paidDate: z.union([z.string(), z.date()]).nullable().optional(),
  paidAmount: z.number().positive().optional().nullable().transform(val => val === 0 || val === null ? null : val),
})

export class ExpenseService extends BaseService<
  ExpenseWithRelations,
  ExpenseCreateData,
  ExpenseUpdateData,
  ExpenseFilters
> {
  constructor(context: ServiceContext) {
    super(context, 'expense', [
      'dueDate', 'createdAt', 'amount', 'status', 'paidDate', 'description', 'vendor'
    ])
  }

  /**
   * Validate business rules for expense operations
   */
  async validateBusinessRules(data: ExpenseCreateData | ExpenseUpdateData): Promise<void> {
    // Validate using Zod schema
    if ('description' in data && 'amount' in data) {
      // This is create data - validate required fields
      ExpenseSchema.parse(data)
    }

    // Business rule: Amount must be positive
    if (data.amount !== undefined) {
      ValidationUtils.validatePositiveNumber(data.amount, 'Amount')
    }

    // Business rule: Paid amount cannot exceed total amount
    if (data.paidAmount !== undefined && data.amount !== undefined) {
      if (data.paidAmount > data.amount) {
        throw new ServiceError(
          'Paid amount cannot exceed total amount',
          'INVALID_PAID_AMOUNT',
          400
        )
      }
    }

    // Business rule: If contractId is provided, verify it exists and belongs to team
    if (data.contractId) {
      const contract = await this.context.teamScopedPrisma.contract.findFirst({
        where: { id: data.contractId }
      })

      if (!contract) {
        throw new ServiceError(
          'Contract not found or access denied',
          'CONTRACT_NOT_FOUND',
          404
        )
      }
    }

    // Business rule: Paid date required if status is 'paid'
    if (data.status === 'paid' && !data.paidDate) {
      throw new ServiceError(
        'Paid date is required when status is paid',
        'PAID_DATE_REQUIRED',
        400
      )
    }

    // Business rule: Paid amount required if status is 'paid'
    if (data.status === 'paid' && !data.paidAmount) {
      throw new ServiceError(
        'Paid amount is required when status is paid',
        'PAID_AMOUNT_REQUIRED',
        400
      )
    }

    // Business rule: Due date cannot be too far in the past (more than 5 years)
    if (data.dueDate) {
      const dueDate = new Date(data.dueDate)
      const fiveYearsAgo = new Date()
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

      if (dueDate < fiveYearsAgo) {
        throw new ServiceError(
          'Due date cannot be more than 5 years in the past',
          'INVALID_DUE_DATE',
          400
        )
      }
    }
  }

  /**
   * Build advanced filters for expense queries
   */
  protected buildFilters(filters: ExpenseFilters): any {
    const where = super.buildFilters(filters)

    // Date range filtering
    if (filters.dueAfter || filters.dueBefore) {
      where.dueDate = {}
      if (filters.dueAfter) {
        where.dueDate.gte = new Date(filters.dueAfter)
      }
      if (filters.dueBefore) {
        where.dueDate.lte = new Date(filters.dueBefore)
      }
    }

    // Amount range filtering
    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      where.amount = {}
      if (filters.amountMin !== undefined) {
        where.amount.gte = filters.amountMin
      }
      if (filters.amountMax !== undefined) {
        where.amount.lte = filters.amountMax
      }
    }

    // Overdue filtering - remove the 'overdue' field from where clause first
    if (filters.overdue !== undefined) {
      const { overdue, ...whereWithoutOverdue } = where
      const today = new Date()

      if (filters.overdue) {
        return {
          ...whereWithoutOverdue,
          dueDate: { lt: today },
          status: { not: 'paid' }
        }
      } else {
        return {
          ...whereWithoutOverdue,
          OR: [
            { dueDate: { gte: today } },
            { status: 'paid' }
          ]
        }
      }
    }

    // Recurring filter
    if (filters.isRecurring !== undefined) {
      where.isRecurring = filters.isRecurring
    }

    // Vendor filtering (partial match)
    if (filters.vendor) {
      where.vendor = {
        contains: filters.vendor,
        mode: 'insensitive'
      }
    }

    return where
  }

  /**
   * Create a new expense with validation and date processing
   */
  async create(data: ExpenseCreateData): Promise<ExpenseWithRelations> {
    await this.validateBusinessRules(data)

    // Process dates
    const processedData = {
      ...data,
      dueDate: createDateForStorage(data.dueDate),
      paidDate: data.paidDate ? createDateForStorage(data.paidDate) : null,
      // Normalize empty strings to null
      vendor: ValidationUtils.normalizeEmptyString(data.vendor),
      invoiceNumber: ValidationUtils.normalizeEmptyString(data.invoiceNumber),
      notes: ValidationUtils.normalizeEmptyString(data.notes),
      receiptUrl: ValidationUtils.normalizeEmptyString(data.receiptUrl)
    }

    return await super.create(processedData, {
      contract: true,
      recurringExpense: true
    })
  }

  /**
   * Update an expense with validation
   */
  async update(id: string, data: ExpenseUpdateData): Promise<ExpenseWithRelations | null> {
    if (!ValidationUtils.isValidUUID(id)) {
      throw new ServiceError('Invalid expense ID', 'INVALID_ID', 400)
    }

    await this.validateBusinessRules(data)

    // Process dates if provided
    const processedData = {
      ...data,
      ...(data.dueDate && {
        dueDate: createDateForStorage(data.dueDate)
      }),
      ...(data.paidDate && {
        paidDate: createDateForStorage(data.paidDate)
      }),
      // Normalize empty strings to null
      ...(data.vendor !== undefined && {
        vendor: ValidationUtils.normalizeEmptyString(data.vendor)
      }),
      ...(data.invoiceNumber !== undefined && {
        invoiceNumber: ValidationUtils.normalizeEmptyString(data.invoiceNumber)
      }),
      ...(data.notes !== undefined && {
        notes: ValidationUtils.normalizeEmptyString(data.notes)
      }),
      ...(data.receiptUrl !== undefined && {
        receiptUrl: ValidationUtils.normalizeEmptyString(data.receiptUrl)
      })
    }

    return await super.update(id, processedData, {
      contract: true,
      recurringExpense: true
    })
  }

  /**
   * Get expenses with relations
   */
  async findMany(filters: ExpenseFilters = {}, options: any = {}): Promise<ExpenseWithRelations[]> {
    return await super.findMany(filters, options, {
      contract: true,
      recurringExpense: true
    })
  }

  /**
   * Get a single expense by ID with relations
   */
  async findById(id: string): Promise<ExpenseWithRelations | null> {
    if (!ValidationUtils.isValidUUID(id)) {
      throw new ServiceError('Invalid expense ID', 'INVALID_ID', 400)
    }

    return await super.findById(id, {
      contract: true,
      recurringExpense: true
    })
  }

  /**
   * Get expenses with calculated actual status
   */
  async findManyWithStatus(filters: ExpenseFilters = {}, options: any = {}): Promise<Array<ExpenseWithRelations & { actualStatus: string }>> {
    const expenses = await this.findMany(filters, options)

    return expenses.map(expense => ({
      ...expense,
      actualStatus: getExpenseActualStatus(expense)
    }))
  }

  /**
   * Get expense summary statistics
   */
  async getSummary(filters: ExpenseFilters = {}): Promise<ExpenseSummary> {
    const expenses = await this.findManyWithStatus(filters)

    const summary: ExpenseSummary = {
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
      totalPaid: expenses.reduce((sum, e) => sum + (e.paidAmount || 0), 0),
      totalPending: 0,
      totalOverdue: 0,
      byStatus: {},
      byCategory: {},
      byType: {},
      byMonth: {}
    }

    // Calculate detailed breakdowns
    expenses.forEach(expense => {
      const status = expense.actualStatus
      const category = expense.category || 'uncategorized'
      const type = expense.type || 'unspecified'
      const month = expense.dueDate.toISOString().substring(0, 7) // YYYY-MM

      // Status breakdown
      if (!summary.byStatus[status]) {
        summary.byStatus[status] = { count: 0, amount: 0 }
      }
      summary.byStatus[status].count++
      summary.byStatus[status].amount += expense.amount

      // Count pending and overdue totals
      if (status === 'pending') {
        summary.totalPending += expense.amount
      } else if (status === 'overdue') {
        summary.totalOverdue += expense.amount
      }

      // Category breakdown
      if (!summary.byCategory[category]) {
        summary.byCategory[category] = { count: 0, amount: 0 }
      }
      summary.byCategory[category].count++
      summary.byCategory[category].amount += expense.amount

      // Type breakdown
      if (!summary.byType[type]) {
        summary.byType[type] = { count: 0, amount: 0 }
      }
      summary.byType[type].count++
      summary.byType[type].amount += expense.amount

      // Monthly breakdown
      if (!summary.byMonth[month]) {
        summary.byMonth[month] = { count: 0, amount: 0 }
      }
      summary.byMonth[month].count++
      summary.byMonth[month].amount += expense.amount
    })

    return summary
  }

  /**
   * Get overdue expenses
   */
  async findOverdue(options: any = {}): Promise<ExpenseWithRelations[]> {
    return await this.findMany({ overdue: true }, options)
  }

  /**
   * Get expenses by contract
   */
  async findByContract(contractId: string, options: any = {}): Promise<ExpenseWithRelations[]> {
    return await this.findMany({ contractId }, options)
  }

  /**
   * Get operational expenses (not linked to contracts)
   */
  async findOperational(options: any = {}): Promise<ExpenseWithRelations[]> {
    return await this.findMany({ type: 'operational' }, options)
  }

  /**
   * Get recurring expenses
   */
  async findRecurring(options: any = {}): Promise<ExpenseWithRelations[]> {
    return await this.findMany({ isRecurring: true }, options)
  }

  /**
   * Mark expense as paid
   */
  async markAsPaid(id: string, paidAmount: number, paidDate?: string): Promise<ExpenseWithRelations | null> {
    const expense = await this.findById(id)
    if (!expense) {
      throw new ServiceError('Expense not found', 'NOT_FOUND', 404)
    }

    if (paidAmount > expense.amount) {
      throw new ServiceError('Paid amount cannot exceed total amount', 'INVALID_AMOUNT', 400)
    }

    return await this.update(id, {
      status: 'paid',
      paidAmount,
      paidDate: paidDate || new Date().toISOString()
    })
  }

  /**
   * Search expenses by text
   */
  async search(query: string, options: any = {}): Promise<ExpenseWithRelations[]> {
    const expenses = await this.context.teamScopedPrisma.expense.findMany({
      where: {
        OR: [
          { description: { contains: query, mode: 'insensitive' } },
          { vendor: { contains: query, mode: 'insensitive' } },
          { invoiceNumber: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } },
          { contract: { clientName: { contains: query, mode: 'insensitive' } } },
          { contract: { projectName: { contains: query, mode: 'insensitive' } } }
        ]
      },
      include: {
        contract: true,
        recurringExpense: true
      },
      orderBy: this.buildSort(options)
    })

    return expenses
  }

  /**
   * Get expenses by vendor
   */
  async findByVendor(vendor: string, options: any = {}): Promise<ExpenseWithRelations[]> {
    return await this.findMany({ vendor }, options)
  }

  /**
   * Get expenses by category
   */
  async findByCategory(category: string, options: any = {}): Promise<ExpenseWithRelations[]> {
    return await this.findMany({ category }, options)
  }

  /**
   * Get expenses in date range
   */
  async findInDateRange(startDate: string, endDate: string, options: any = {}): Promise<ExpenseWithRelations[]> {
    return await this.findMany({
      dueAfter: startDate,
      dueBefore: endDate
    }, options)
  }

  /**
   * Get cash flow projection for expenses
   */
  async getCashFlowProjection(months: number = 12): Promise<Array<{ month: string; projected: number; actual: number }>> {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + months)

    const expenses = await this.findInDateRange(
      startDate.toISOString(),
      endDate.toISOString()
    )

    const projection: { [key: string]: { projected: number; actual: number } } = {}

    expenses.forEach(expense => {
      const month = expense.dueDate.toISOString().substring(0, 7)

      if (!projection[month]) {
        projection[month] = { projected: 0, actual: 0 }
      }

      projection[month].projected += expense.amount
      if (expense.status === 'paid') {
        projection[month].actual += expense.paidAmount || expense.amount
      }
    })

    return Object.entries(projection).map(([month, data]) => ({
      month,
      ...data
    })).sort((a, b) => a.month.localeCompare(b.month))
  }
}