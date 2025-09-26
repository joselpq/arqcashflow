/**
 * Event Validation Middleware
 *
 * Validates event structure, payload data, and business rules
 * using the unified validation layer.
 */

import type { EventPayload, EventContext, EventMiddleware } from '../types'
import { EventSchemas } from '../types'
import { ValidationError, validateSchema } from '@/lib/validation'

/**
 * Validation Middleware Components
 */
export class ValidationMiddleware {
  /**
   * Validate basic event structure
   */
  static validateEventStructure: EventMiddleware = async (event, context, next) => {
    try {
      // Ensure required fields exist
      if (!event.id || !event.type || !event.timestamp || !event.teamId || !event.source) {
        throw new Error('Missing required event fields: id, type, timestamp, teamId, source')
      }

      // Validate ID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(event.id)) {
        throw new Error('Invalid event ID format (must be UUID)')
      }

      // Validate timestamp
      if (!(event.timestamp instanceof Date) || isNaN(event.timestamp.getTime())) {
        throw new Error('Invalid event timestamp')
      }

      // Validate team ID matches context
      if (event.teamId !== context.teamId) {
        throw new Error('Event teamId does not match context teamId')
      }

      await next()

    } catch (error) {
      console.error(`[Validation] Event structure validation failed:`, error)
      throw new Error(`Event validation failed: ${error}`)
    }
  }

  /**
   * Validate event payload using appropriate schema
   */
  static validateEventPayload: EventMiddleware = async (event, context, next) => {
    try {
      // Determine which schema to use based on event type
      const schema = ValidationMiddleware.getSchemaForEventType(event.type)

      // Validate using unified validation layer
      if (schema) {
        validateSchema(schema)(event)
      }

      await next()

    } catch (error) {
      console.error(`[Validation] Event payload validation failed:`, error)
      throw new Error(`Payload validation failed: ${error}`)
    }
  }

  /**
   * Sanitize event data to prevent injection attacks
   */
  static sanitizeEventData: EventMiddleware = async (event, context, next) => {
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
   * Validate business rules for event
   */
  static validateBusinessRules: EventMiddleware = async (event, context, next) => {
    try {
      // Apply business rule validation based on event type
      await ValidationMiddleware.applyBusinessRules(event, context)

      await next()

    } catch (error) {
      console.error(`[Validation] Business rule validation failed:`, error)
      throw new Error(`Business rule validation failed: ${error}`)
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