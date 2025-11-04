/**
 * Financial Entity Validation Schemas
 *
 * Centralized validation schemas for all financial entities (contracts, receivables, expenses).
 * Built on top of base schemas to ensure consistency and reusability.
 *
 * Phase 1 Update: Added profession-aware validation for multi-profession support.
 * - ContractSchemas.create(profession) - validates based on profession
 * - Medical professions can have optional totalValue and signedDate
 * - Architecture professions require these fields (backward compatible)
 */

import { z } from 'zod'
import { BaseFieldSchemas, EnumSchemas, RefinedFieldSchemas } from './schemas'

/**
 * Base schema for all financial entities
 * Contains common fields shared by contracts, receivables, and expenses
 */
export const BaseFinancialSchema = z.object({
  amount: BaseFieldSchemas.amount,
  description: BaseFieldSchemas.description,
  notes: BaseFieldSchemas.notes,
  teamId: BaseFieldSchemas.teamId,
  createdBy: BaseFieldSchemas.userId,
})

/**
 * Contract validation schemas
 * Phase 1: Profession-aware validation functions
 */
export const ContractSchemas = {
  /**
   * Contract creation schema - profession-aware
   * @param profession - Profession identifier (e.g., 'medicina', 'arquitetura')
   * @returns Zod schema appropriate for the profession
   */
  create: (profession?: string | null) => {
    const baseSchema = z.object({
      clientName: BaseFieldSchemas.name,
      projectName: BaseFieldSchemas.name,
      description: BaseFieldSchemas.description,
      status: EnumSchemas.contractStatus.optional().default('draft'),
      category: BaseFieldSchemas.optionalCategory,
      notes: BaseFieldSchemas.notes,
    })

    // Medical profession: totalValue and signedDate are optional
    if (profession === 'medicina') {
      return baseSchema.extend({
        totalValue: BaseFieldSchemas.amount.optional(),
        signedDate: RefinedFieldSchemas.signedDate.optional(),
      })
    }

    // Default (architecture): totalValue and signedDate are required
    return baseSchema.extend({
      totalValue: BaseFieldSchemas.amount,
      signedDate: RefinedFieldSchemas.signedDate,
    })
  },

  /**
   * Contract update schema - profession-aware
   * @param profession - Profession identifier (e.g., 'medicina', 'arquitetura')
   * @returns Zod schema appropriate for the profession
   */
  update: (profession?: string | null) => {
    // All fields optional for updates regardless of profession
    return z.object({
      clientName: BaseFieldSchemas.name.optional(),
      projectName: BaseFieldSchemas.name.optional(),
      description: BaseFieldSchemas.description,
      totalValue: BaseFieldSchemas.amount.optional(),
      signedDate: RefinedFieldSchemas.signedDate.optional(),
      status: EnumSchemas.contractStatus.optional(),
      category: BaseFieldSchemas.optionalCategory,
      notes: BaseFieldSchemas.notes,
    })
  },

  // Contract filters for querying
  filters: z.object({
    status: EnumSchemas.contractStatus.optional(),
    category: BaseFieldSchemas.shortName.optional(),
    clientName: BaseFieldSchemas.name.optional(),
    projectName: BaseFieldSchemas.name.optional(),
    signedAfter: BaseFieldSchemas.dateString.optional(),
    signedBefore: BaseFieldSchemas.dateString.optional(),
    sortBy: z.enum(['clientName', 'projectName', 'totalValue', 'signedDate', 'createdAt']).optional().default('createdAt'),
    sortOrder: EnumSchemas.sortOrder.optional(),
  }),

  // Contract deletion options
  deleteOptions: z.object({
    mode: z.enum(['contract-only', 'contract-and-receivables']).describe('Deletion mode: unlink receivables or delete everything')
  }),

  // Contract deletion info response
  deletionInfo: z.object({
    canDelete: z.boolean().describe('Whether the contract can be deleted'),
    hasReceivables: z.boolean().describe('Whether the contract has associated receivables'),
    receivablesCount: z.number().min(0).describe('Number of associated receivables'),
    receivables: z.array(z.object({
      id: BaseFieldSchemas.id,
      title: BaseFieldSchemas.name,
      amount: BaseFieldSchemas.amount,
      expectedDate: z.date().describe('Expected date for the receivable')
    })).describe('List of receivables that would be affected')
  }),
}

/**
 * Receivable validation schemas
 */
export const ReceivableSchemas = {
  // Full receivable creation schema
  create: z.object({
    contractId: BaseFieldSchemas.contractId,
    expectedDate: BaseFieldSchemas.dateString,
    amount: BaseFieldSchemas.amount,
    status: EnumSchemas.paymentStatus.optional().default('pending'),
    receivedDate: BaseFieldSchemas.optionalDateString,
    receivedAmount: BaseFieldSchemas.amount.optional().nullable(),
    invoiceNumber: BaseFieldSchemas.invoiceNumber,
    category: BaseFieldSchemas.optionalCategory,
    notes: BaseFieldSchemas.notes,
    clientName: BaseFieldSchemas.clientName,
    description: BaseFieldSchemas.description,
  }),

  // Receivable update schema
  update: z.object({
    contractId: BaseFieldSchemas.contractId,
    expectedDate: BaseFieldSchemas.dateString.optional(),
    amount: BaseFieldSchemas.amount.optional(),
    status: EnumSchemas.paymentStatus.optional(),
    receivedDate: BaseFieldSchemas.optionalDateString,
    receivedAmount: BaseFieldSchemas.amount.optional().nullable(),
    invoiceNumber: BaseFieldSchemas.invoiceNumber,
    category: BaseFieldSchemas.optionalCategory,
    notes: BaseFieldSchemas.notes,
    clientName: BaseFieldSchemas.clientName,
    description: BaseFieldSchemas.description,
  }),

  // Receivable payment update (when marking as paid)
  payment: z.object({
    receivedDate: BaseFieldSchemas.dateString,
    receivedAmount: BaseFieldSchemas.amount,
    status: z.literal('paid'),
    notes: BaseFieldSchemas.notes,
  }),

  // Receivable filters for querying
  filters: z.object({
    status: EnumSchemas.paymentStatus.optional(),
    category: BaseFieldSchemas.shortName.optional(),
    contractId: BaseFieldSchemas.contractId,
    clientName: BaseFieldSchemas.name.optional(),
    expectedAfter: BaseFieldSchemas.dateString.optional(),
    expectedBefore: BaseFieldSchemas.dateString.optional(),
    sortBy: z.enum(['expectedDate', 'amount', 'clientName', 'createdAt', 'status']).optional().default('expectedDate'),
    sortOrder: EnumSchemas.sortOrder.optional(),
  }),
}

/**
 * Expense validation schemas
 */
export const ExpenseSchemas = {
  // Full expense creation schema
  create: z.object({
    description: BaseFieldSchemas.shortName, // Required for expenses
    amount: BaseFieldSchemas.amount,
    dueDate: BaseFieldSchemas.dateString,
    category: BaseFieldSchemas.category, // Required for expenses
    contractId: BaseFieldSchemas.contractId,
    vendor: BaseFieldSchemas.vendorName,
    invoiceNumber: BaseFieldSchemas.invoiceNumber,
    type: EnumSchemas.expenseType.optional().nullable(),
    isRecurring: BaseFieldSchemas.optionalBoolean,
    notes: BaseFieldSchemas.notes,
    receiptUrl: BaseFieldSchemas.url,
    status: EnumSchemas.paymentStatus.optional().default('pending'),
    paidDate: BaseFieldSchemas.optionalDateString,
    paidAmount: BaseFieldSchemas.amount.optional().nullable(),
    recurringExpenseId: BaseFieldSchemas.id.optional().nullable(),
  }),

  // Expense update schema
  update: z.object({
    description: BaseFieldSchemas.shortName.optional(),
    amount: BaseFieldSchemas.amount.optional(),
    dueDate: BaseFieldSchemas.dateString.optional(),
    category: BaseFieldSchemas.category.optional(),
    contractId: BaseFieldSchemas.contractId,
    vendor: BaseFieldSchemas.vendorName,
    invoiceNumber: BaseFieldSchemas.invoiceNumber,
    type: EnumSchemas.expenseType.optional().nullable(),
    isRecurring: BaseFieldSchemas.optionalBoolean,
    notes: BaseFieldSchemas.notes,
    receiptUrl: BaseFieldSchemas.url,
    status: EnumSchemas.paymentStatus.optional(),
    paidDate: BaseFieldSchemas.optionalDateString,
    paidAmount: BaseFieldSchemas.amount.optional().nullable(),
  }),

  // Expense filters for querying
  filters: z.object({
    status: EnumSchemas.paymentStatus.optional(),
    category: BaseFieldSchemas.shortName.optional(),
    type: EnumSchemas.expenseType.optional(),
    contractId: BaseFieldSchemas.contractId,
    vendor: BaseFieldSchemas.shortName.optional(),
    dueBefore: BaseFieldSchemas.dateString.optional(),
    dueAfter: BaseFieldSchemas.dateString.optional(),
    isRecurring: BaseFieldSchemas.boolean.optional(),
    sortBy: z.enum(['dueDate', 'amount', 'vendor', 'category', 'createdAt', 'status']).optional().default('dueDate'),
    sortOrder: EnumSchemas.sortOrder.optional(),
  }),
}

/**
 * Recurring expense validation schemas
 */
export const RecurringExpenseSchemas = {
  // Recurring expense creation
  create: z.object({
    description: BaseFieldSchemas.shortName,
    amount: BaseFieldSchemas.amount,
    category: BaseFieldSchemas.category,
    frequency: EnumSchemas.frequency,
    interval: z.number().min(1).max(12, 'Interval must be between 1 and 12'),
    dayOfMonth: z.number().min(1).max(31).optional().nullable(),
    startDate: BaseFieldSchemas.dateString,
    endDate: BaseFieldSchemas.optionalDateString,
    vendor: BaseFieldSchemas.vendorName,
    notes: BaseFieldSchemas.notes,
    isActive: BaseFieldSchemas.optionalBoolean,
  }),

  // Recurring expense update
  update: z.object({
    description: BaseFieldSchemas.shortName.optional(),
    amount: BaseFieldSchemas.amount.optional(),
    category: BaseFieldSchemas.category.optional(),
    frequency: EnumSchemas.frequency.optional(),
    interval: z.number().min(1).max(12, 'Interval must be between 1 and 12').optional(),
    dayOfMonth: z.number().min(1).max(31).optional().nullable(),
    startDate: BaseFieldSchemas.dateString.optional(),
    endDate: BaseFieldSchemas.optionalDateString,
    vendor: BaseFieldSchemas.vendorName,
    notes: BaseFieldSchemas.notes,
    isActive: BaseFieldSchemas.optionalBoolean,
  }),

  // Recurring action on expenses
  action: z.object({
    action: EnumSchemas.recurringAction,
    scope: EnumSchemas.recurringActionScope,
    updatedData: z.object({
      description: BaseFieldSchemas.shortName.optional(),
      amount: BaseFieldSchemas.amount.optional(),
      category: BaseFieldSchemas.category.optional(),
      vendor: BaseFieldSchemas.vendorName,
      notes: BaseFieldSchemas.notes,
    }).optional()
  }),
}

/**
 * Business rule validation functions
 */
export const BusinessRuleValidation = {
  /**
   * Validate that received amount doesn't exceed expected amount for receivables
   */
  validateReceivedAmount: (expectedAmount: number, receivedAmount: number) => {
    return receivedAmount <= expectedAmount * 1.1 // Allow 10% tolerance for fees/interest
  },

  /**
   * Validate that a contract's total value matches its receivables
   */
  validateContractReceivables: (contractTotal: number, receivablesTotal: number) => {
    return Math.abs(contractTotal - receivablesTotal) < 0.01 // Allow for rounding differences
  },

  /**
   * Validate that expense due date is reasonable (not too far in the future)
   */
  validateExpenseDueDate: (dueDate: string) => {
    const due = new Date(dueDate)
    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() + 2) // Max 2 years in future
    return due <= maxDate
  },

  /**
   * Validate recurring expense end date is after start date
   */
  validateRecurringDateRange: (startDate: string, endDate?: string | null) => {
    if (!endDate) return true
    return new Date(endDate) > new Date(startDate)
  },
}

/**
 * Export individual schemas for backward compatibility
 * Note: ContractSchema and ContractUpdateSchema now default to architecture profession
 */
export const ContractSchema = ContractSchemas.create() // Default to architecture
export const ContractUpdateSchema = ContractSchemas.update() // Default to architecture
export const ReceivableSchema = ReceivableSchemas.create
export const ReceivableUpdateSchema = ReceivableSchemas.update
export const ExpenseSchema = ExpenseSchemas.create
export const ExpenseUpdateSchema = ExpenseSchemas.update
export const RecurringExpenseSchema = RecurringExpenseSchemas.create
export const RecurringExpenseUpdateSchema = RecurringExpenseSchemas.update

// Export deletion-related schemas
export const ContractDeleteOptionsSchema = ContractSchemas.deleteOptions
export const ContractDeletionInfoSchema = ContractSchemas.deletionInfo

/**
 * Type exports for deletion interfaces
 */
export type DeleteOptions = z.infer<typeof ContractDeleteOptionsSchema>
export type DeletionInfo = z.infer<typeof ContractDeletionInfoSchema>