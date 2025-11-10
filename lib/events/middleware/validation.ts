/**
 * Event Validation Middleware
 *
 * Validates event structure, payload data, and business rules
 * using simplified flexible validation (ADR-021 Phase 1).
 */

import type { EventPayload, EventContext } from '../types'

type EventMiddleware = (event: EventPayload, context: EventContext, next: () => Promise<void>) => Promise<void>
import { EventSchemas } from '../types'
import { ValidationError, validateSchema } from '@/lib/validation'

/**
 * Validation Middleware Components (Simplified - ADR-021 Phase 1)
 */
export class ValidationMiddleware {
  /**
   * Validate basic event structure (flexible mode - events may have incomplete data)
   */
  static validateEventStructure: EventMiddleware = async (event: EventPayload, context: EventContext, next: () => Promise<void>) => {
    try {
      // Check core fields but allow some flexibility
      if (!event.type || !event.source) {
        throw new Error('Missing required event fields: type, source')
      }

      // Warn about missing fields but don't fail
      if (!event.id) {
        console.warn('[Validation] Missing event ID, generating one')
        event.id = crypto.randomUUID()
      }
      if (!event.timestamp) {
        console.warn('[Validation] Missing timestamp, using current time')
        event.timestamp = new Date()
      }
      if (!event.teamId) {
        console.warn('[Validation] Missing teamId, using context')
        event.teamId = context.teamId
      }

      await next()

    } catch (error) {
      console.warn(`[Validation] Event structure validation warning:`, error)
      // Don't throw - events are internal, be flexible
      await next()
    }
  }

  /**
   * Validate event payload using appropriate schema (flexible with partial data)
   */
  static validateEventPayload: EventMiddleware = async (event: EventPayload, context: EventContext, next: () => Promise<void>) => {
    try {
      // Determine which schema to use based on event type
      const schema = ValidationMiddleware.getSchemaForEventType(event.type)

      // Validate using partial schema (flexible for events)
      if (schema) {
        try {
          schema.partial().parse(event)
        } catch (error) {
          // Log warning but continue - events are internal
          console.warn('[Validation] Event payload validation warning:', error)
        }
      }

      await next()

    } catch (error) {
      console.error(`[Validation] Event payload validation failed:`, error)
      // Don't throw - log and continue
      await next()
    }
  }

  /**
   * Sanitize event data to prevent injection attacks
   */
  static sanitizeEventData: EventMiddleware = async (event: EventPayload, context: EventContext, next: () => Promise<void>) => {
    try {
      // Sanitize string fields in payload
      if (event.payload && typeof event.payload === 'object') {
        ValidationMiddleware.sanitizeObject(event.payload)
      }

      // Sanitize metadata
      if (event.metadata && typeof event.metadata === 'object') {
        ValidationMiddleware.sanitizeObject(event.metadata)
      }

      await next()

    } catch (error) {
      console.error(`[Validation] Event data sanitization failed:`, error)
      throw new Error(`Data sanitization failed: ${error}`)
    }
  }

  /**
   * Validate business rules for event (simplified - warnings only, no blocking)
   */
  static validateBusinessRules: EventMiddleware = async (event: EventPayload, context: EventContext, next: () => Promise<void>) => {
    try {
      // Apply business rule validation based on event type (warnings only)
      await ValidationMiddleware.applyBusinessRules(event, context)
      await next()

    } catch (error) {
      // Log warning but don't block - events are internal
      console.warn('[Validation] Business rule warning:', error)
      await next()
    }
  }

  /**
   * Get appropriate validation schema for event type
   */
  private static getSchemaForEventType(eventType: string): any {
    const [category] = eventType.split('.')

    switch (category) {
      case 'contract':
        return EventSchemas.contract
      case 'receivable':
        return EventSchemas.receivable
      case 'expense':
      case 'recurring':
        return EventSchemas.expense
      case 'document':
      case 'ai':
        return EventSchemas.ai
      case 'bulk':
        return EventSchemas.bulk
      case 'user':
      case 'team':
      case 'audit':
      case 'validation':
      case 'service':
      case 'integration':
        return EventSchemas.system
      default:
        // No specific schema validation for unknown event types
        return null
    }
  }

  /**
   * Sanitize object properties recursively
   */
  private static sanitizeObject(obj: any): void {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remove potential HTML/script tags
        obj[key] = value
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim()
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        ValidationMiddleware.sanitizeObject(value)
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (item && typeof item === 'object') {
            ValidationMiddleware.sanitizeObject(item)
          }
        })
      }
    }
  }

  /**
   * Apply business rule validation
   */
  private static async applyBusinessRules(event: EventPayload, context: EventContext): Promise<void> {
    const eventType = event.type
    const payload = event.payload as any

    // Contract business rules
    if (eventType.startsWith('contract.')) {
      if (eventType === 'contract.created' && payload.totalValue < 0) {
        throw new Error('Contract total value cannot be negative')
      }

      if (eventType === 'contract.updated' && payload.status === 'completed' && !payload.completedDate) {
        throw new Error('Completed contracts must have a completion date')
      }
    }

    // Receivable business rules
    if (eventType.startsWith('receivable.')) {
      if (eventType === 'receivable.payment_received') {
        if (!payload.paymentAmount || payload.paymentAmount <= 0) {
          throw new Error('Payment amount must be positive')
        }

        if (payload.paymentAmount > payload.amount) {
          throw new Error('Payment amount cannot exceed receivable amount')
        }
      }
    }

    // Expense business rules
    if (eventType.startsWith('expense.')) {
      if (eventType === 'expense.created' && payload.amount <= 0) {
        throw new Error('Expense amount must be positive')
      }

      if (eventType === 'expense.approved' && payload.amount > 100000) {
        // High-value expenses require additional validation
        if (!payload.approverUserId || !payload.approvalReason) {
          throw new Error('High-value expenses require approver ID and reason')
        }
      }
    }

    // AI event business rules
    if (eventType.startsWith('document.') || eventType.startsWith('ai.')) {
      if (eventType === 'document.uploaded' && payload.fileSize > 50 * 1024 * 1024) {
        throw new Error('Document size exceeds maximum limit (50MB)')
      }
    }

    // Bulk operation business rules
    if (eventType.startsWith('bulk.')) {
      if (payload.itemCount > 1000) {
        throw new Error('Bulk operations limited to 1000 items per batch')
      }
    }
  }
}

/**
 * Validation Error Types
 */
export class EventValidationError extends Error {
  constructor(
    message: string,
    public eventType: string,
    public validationErrors: any[] = []
  ) {
    super(message)
    this.name = 'EventValidationError'
  }
}

/**
 * Validation Result Interface
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validation Utilities
 */
export const ValidationUtils = {
  /**
   * Validate event synchronously
   */
  validateEvent(event: EventPayload): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      // Basic structure validation
      if (!event.id || !event.type || !event.timestamp) {
        result.errors.push('Missing required event fields')
        result.isValid = false
      }

      // Additional validations...
      return result

    } catch (error) {
      result.errors.push(`Validation error: ${error}`)
      result.isValid = false
      return result
    }
  },

  /**
   * Create validation middleware with custom rules
   */
  createCustomValidation(rules: (event: EventPayload, context: EventContext) => Promise<void>): EventMiddleware {
    return async (event, context, next) => {
      try {
        await rules(event, context)
        await next()
      } catch (error) {
        throw new EventValidationError(`Custom validation failed: ${error}`, event.type)
      }
    }
  }
}