/**
 * Base Validation Schemas
 *
 * Shared field schemas and validation patterns used across the application.
 * This ensures consistency in validation rules and reduces duplication.
 */

import { z } from 'zod'

/**
 * Common field validation schemas that can be reused across different entities
 */
export const BaseFieldSchemas = {
  // Identity and references
  id: z.string()
    .length(25, 'Invalid ID format')
    .regex(/^c[a-z0-9]{24}$/, 'Invalid CUID format'),
  teamId: z.string()
    .length(25, 'Invalid team ID format')
    .regex(/^c[a-z0-9]{24}$/, 'Invalid CUID team ID format'),
  userId: z.string()
    .length(25, 'Invalid user ID format')
    .regex(/^c[a-z0-9]{24}$/, 'Invalid CUID user ID format'),
  contractId: z.string()
    .length(25, 'Invalid contract ID format')
    .regex(/^c[a-z0-9]{24}$/, 'Invalid CUID contract ID format')
    .optional().nullable()
    .transform(val => val === '' ? null : val),

  // Financial fields
  amount: z.number()
    .positive('Amount must be positive')
    .max(999999999, 'Amount is too large')
    .refine(val => Number.isFinite(val) && Math.abs(val * 100 - Math.round(val * 100)) < 1e-10, {
      message: 'Amount cannot have more than 2 decimal places'
    }),

  currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL'),

  // Text fields
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .trim(),

  shortName: z.string()
    .min(1, 'Name is required')
    .max(50, 'Name is too long')
    .trim(),

  longName: z.string()
    .min(1, 'Name is required')
    .max(200, 'Name is too long')
    .trim(),

  description: z.string()
    .max(500, 'Description is too long')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  notes: z.string()
    .max(1000, 'Notes are too long')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category is too long')
    .trim(),

  optionalCategory: z.string()
    .max(50, 'Category is too long')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  // Date fields - accept both string (YYYY-MM-DD) and Date objects
  dateString: z.union([
    z.string().min(1, 'Date is required').regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format (expected YYYY-MM-DD)'),
    z.date()
  ]).transform(val => {
    if (val instanceof Date) {
      return val.toISOString().split('T')[0] // Convert Date to YYYY-MM-DD string
    }
    return val
  }),

  optionalDateString: z.union([
    z.string(),
    z.date(),
    z.null(),
    z.undefined()
  ]).optional().nullable().transform(val => {
      if (val === '' || val === null || val === undefined) return null
      if (val instanceof Date) {
        return val.toISOString().split('T')[0]
      }
      return val
    }),

  // Email
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email is too long')
    .toLowerCase()
    .trim(),

  // Password
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password is too long'),

  // Boolean fields
  boolean: z.boolean(),
  optionalBoolean: z.boolean().optional().default(false),

  // Numbers
  positiveInteger: z.number()
    .int('Must be a whole number')
    .positive('Must be positive'),

  nonNegativeInteger: z.number()
    .int('Must be a whole number')
    .min(0, 'Must be non-negative'),

  percentage: z.number()
    .min(0, 'Percentage cannot be negative')
    .max(100, 'Percentage cannot exceed 100'),

  // Optional fields with empty string transformation
  optionalString: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  // Invoice/Document numbers
  invoiceNumber: z.string()
    .max(100, 'Invoice number is too long')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  // Vendor/Client info
  vendorName: z.string()
    .max(100, 'Vendor name is too long')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  clientName: z.string()
    .max(100, 'Client name is too long')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  // URLs
  url: z.string()
    .url('Invalid URL format')
    .max(500, 'URL is too long')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
}

/**
 * Common enum schemas
 */
export const EnumSchemas = {
  // Contract statuses
  contractStatus: z.enum(['draft', 'active', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Status must be draft, active, completed, or cancelled' })
  }),

  // Payment/Receivable statuses
  paymentStatus: z.enum(['pending', 'paid', 'overdue', 'cancelled'], {
    errorMap: () => ({ message: 'Status must be pending, paid, overdue, or cancelled' })
  }),

  // Expense types
  expenseType: z.enum(['operational', 'project', 'administrative'], {
    errorMap: () => ({ message: 'Type must be operational, project, or administrative' })
  }),

  // Recurring frequencies
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annual'], {
    errorMap: () => ({ message: 'Frequency must be weekly, monthly, quarterly, or annual' })
  }),

  // Sort orders
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // AI assistant roles
  aiRole: z.enum(['user', 'assistant']),

  // Recurring action scopes
  recurringActionScope: z.enum(['this', 'future', 'all']),

  // Recurring actions
  recurringAction: z.enum(['edit', 'delete']),
}

/**
 * Common validation utilities
 */
export const ValidationUtils = {
  /**
   * Validates that a date is not in the future
   */
  notInFuture: (date: string | Date) => {
    const inputDate = date instanceof Date ? date : new Date(date)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    return inputDate <= today
  },

  /**
   * Validates that a date is not too far in the past
   */
  notTooOld: (date: string | Date, maxYearsAgo: number = 10) => {
    const inputDate = date instanceof Date ? date : new Date(date)
    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - maxYearsAgo)
    return inputDate >= cutoff
  },

  /**
   * Validates that an amount has at most 2 decimal places
   */
  maxDecimalPlaces: (amount: number, places: number = 2) => {
    const factor = Math.pow(10, places)
    return Math.abs(amount * factor - Math.round(amount * factor)) < 1e-10
  },

  /**
   * Validates that a string contains no HTML/script tags (basic XSS protection)
   */
  noHtmlTags: (str: string) => {
    return !/<[^>]*>/g.test(str)
  },
}

/**
 * Refined field schemas with additional validation logic
 */
export const RefinedFieldSchemas = {
  // Date that cannot be in the future
  pastOrPresentDate: BaseFieldSchemas.dateString
    .refine(ValidationUtils.notInFuture, {
      message: 'Date cannot be in the future'
    }),

  // Date that cannot be too old
  recentDate: BaseFieldSchemas.dateString
    .refine(date => ValidationUtils.notTooOld(date, 5), {
      message: 'Date cannot be more than 5 years old'
    }),

  // Signed date (allow future dates for scheduled contracts/appointments, not too old for historical data)
  signedDate: BaseFieldSchemas.dateString
    .refine(date => ValidationUtils.notTooOld(date, 10), {
      message: 'Signed date cannot be more than 10 years old'
    }),

  // Safe string (no HTML tags)
  safeString: z.string()
    .refine(ValidationUtils.noHtmlTags, {
      message: 'HTML tags are not allowed'
    }),

  // Safe description
  safeDescription: BaseFieldSchemas.description
    .refine(val => !val || ValidationUtils.noHtmlTags(val), {
      message: 'HTML tags are not allowed in description'
    }),
}