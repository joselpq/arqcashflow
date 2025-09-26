/**
 * Unified Validation Layer - Main Export
 *
 * Central export for all validation schemas and utilities.
 * This provides a single import point for all validation needs across the application.
 */

// Base schemas and utilities
export {
  BaseFieldSchemas,
  EnumSchemas,
  RefinedFieldSchemas,
  ValidationUtils,
} from './schemas'

// Financial entity schemas
export {
  BaseFinancialSchema,
  ContractSchemas,
  ReceivableSchemas,
  ExpenseSchemas,
  RecurringExpenseSchemas,
  BusinessRuleValidation,
  // Individual schemas for backward compatibility
  ContractSchema,
  ContractUpdateSchema,
  ReceivableSchema,
  ReceivableUpdateSchema,
  ExpenseSchema,
  ExpenseUpdateSchema,
  RecurringExpenseSchema,
  RecurringExpenseUpdateSchema,
} from './financial'

// API-specific schemas
export {
  AuthSchemas,
  AISchemas,
  QuerySchemas,
  ResponseSchemas,
  FileSchemas,
  ExportSchemas,
  IntegrationSchemas,
  MiddlewareSchemas,
} from './api'

// Context-aware validation system
export {
  ValidationLevel,
  ValidationContext,
  DEFAULT_CONTEXTS,
  ContextAwareSchema,
  ValidationContextDetector,
  validateWithContext,
  createContextValidator,
  validationMiddleware,
} from './context'

// Re-export Zod for convenience
export { z } from 'zod'

/**
 * Validation error handling utilities
 */
export const ValidationError = {
  /**
   * Format Zod validation errors for API responses
   */
  formatZodError: (error: any) => {
    if (error.errors) {
      return {
        category: 'validation' as const,
        message: 'Validation failed',
        validation: error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      }
    }
    return {
      category: 'validation' as const,
      message: error.message || 'Validation failed',
    }
  },

  /**
   * Check if an error is a Zod validation error
   */
  isZodError: (error: any) => {
    return error.name === 'ZodError' || (error.errors && Array.isArray(error.errors))
  },

  /**
   * Create a standardized validation error
   */
  create: (field: string, message: string, code?: string) => {
    return {
      category: 'validation' as const,
      message: 'Validation failed',
      validation: [{ field, message, code }],
    }
  },
}

/**
 * Schema validation middleware helper
 */
export const validateSchema = <T>(schema: any) => {
  return (data: unknown): T => {
    const result = schema.safeParse(data)
    if (!result.success) {
      throw new Error(`Validation failed: ${JSON.stringify(ValidationError.formatZodError(result.error))}`)
    }
    return result.data
  }
}

/**
 * Async schema validation helper
 */
export const validateSchemaAsync = async <T>(schema: any, data: unknown): Promise<T> => {
  const result = await schema.safeParseAsync(data)
  if (!result.success) {
    throw new Error(`Validation failed: ${JSON.stringify(ValidationError.formatZodError(result.error))}`)
  }
  return result.data
}

/**
 * Common validation patterns used across the application
 */
export const CommonPatterns = {
  // UUID validation
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // Date validation (YYYY-MM-DD)
  dateFormat: /^\d{4}-\d{2}-\d{2}$/,

  // Currency amount (up to 2 decimal places)
  currencyAmount: /^\d+(\.\d{1,2})?$/,

  // Email validation (basic)
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Phone number (flexible international format)
  phone: /^[\+]?[1-9][\d]{0,15}$/,

  // Invoice/reference number
  invoiceNumber: /^[A-Za-z0-9\-_]+$/,
}

/**
 * Type utilities for schema inference
 */
export type InferSchema<T> = T extends any ? (T extends { _output: infer U } ? U : never) : never

// Type exports for commonly used schemas
export type ContractCreateData = InferSchema<typeof ContractSchema>
export type ContractUpdateData = InferSchema<typeof ContractUpdateSchema>
export type ReceivableCreateData = InferSchema<typeof ReceivableSchema>
export type ReceivableUpdateData = InferSchema<typeof ReceivableUpdateSchema>
export type ExpenseCreateData = InferSchema<typeof ExpenseSchema>
export type ExpenseUpdateData = InferSchema<typeof ExpenseUpdateSchema>