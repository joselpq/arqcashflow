/**
 * Context-Aware Validation System
 *
 * Provides flexible validation based on the execution context.
 * Different contexts require different levels of validation strictness.
 *
 * Phase 2: Context-Aware Validation Flexibility Implementation
 */

import { z } from 'zod'

/**
 * Validation Context Levels
 *
 * Each level represents a different use case with specific validation requirements
 */
export enum ValidationLevel {
  /**
   * STRICT: Database operations requiring data integrity
   * - All fields validated
   * - Type checking enforced
   * - Business rules applied
   * - No optional bypasses
   */
  STRICT = 'strict',

  /**
   * BALANCED: API boundaries with user input
   * - Required fields validated
   * - Type coercion allowed
   * - Business rules applied
   * - Some flexibility for edge cases
   */
  BALANCED = 'balanced',

  /**
   * FLEXIBLE: Event notifications and internal operations
   * - Minimal required fields
   * - Type coercion allowed
   * - Critical business rules only
   * - Developer productivity focused
   */
  FLEXIBLE = 'flexible',

  /**
   * MINIMAL: Testing and development contexts
   * - Only critical fields validated
   * - Maximum type coercion
   * - Business rules can be bypassed
   * - Rapid iteration support
   */
  MINIMAL = 'minimal'
}

/**
 * Validation Context Configuration
 */
export interface ValidationContext {
  level: ValidationLevel
  source: 'database' | 'api' | 'event' | 'test' | 'development'
  skipBusinessRules?: boolean
  allowPartialData?: boolean
  coerceTypes?: boolean
  customRules?: Array<(data: any) => boolean | string>
}

/**
 * Default contexts for common use cases
 */
export const DEFAULT_CONTEXTS: Record<string, ValidationContext> = {
  database: {
    level: ValidationLevel.STRICT,
    source: 'database',
    skipBusinessRules: false,
    allowPartialData: false,
    coerceTypes: false
  },
  api: {
    level: ValidationLevel.BALANCED,
    source: 'api',
    skipBusinessRules: false,
    allowPartialData: false,
    coerceTypes: true
  },
  event: {
    level: ValidationLevel.FLEXIBLE,
    source: 'event',
    skipBusinessRules: false,
    allowPartialData: true,
    coerceTypes: true
  },
  test: {
    level: ValidationLevel.MINIMAL,
    source: 'test',
    skipBusinessRules: true,
    allowPartialData: true,
    coerceTypes: true
  },
  development: {
    level: ValidationLevel.MINIMAL,
    source: 'development',
    skipBusinessRules: true,
    allowPartialData: true,
    coerceTypes: true
  }
}

/**
 * Context-aware schema wrapper
 *
 * Wraps a Zod schema and applies context-specific validation rules
 */
export class ContextAwareSchema<T extends z.ZodType> {
  constructor(
    private schema: T,
    private defaultContext: ValidationContext = DEFAULT_CONTEXTS.api
  ) {}

  /**
   * Parse data with context-aware validation
   */
  parse(data: any, context?: ValidationContext): z.infer<T> {
    const ctx = context || this.defaultContext
    const adjustedSchema = this.adjustSchemaForContext(this.schema, ctx)

    try {
      const result = adjustedSchema.parse(data)

      // Apply custom rules if not skipped
      if (!ctx.skipBusinessRules && ctx.customRules) {
        for (const rule of ctx.customRules) {
          const ruleResult = rule(result)
          if (ruleResult !== true) {
            throw new Error(typeof ruleResult === 'string' ? ruleResult : 'Custom validation failed')
          }
        }
      }

      return result
    } catch (error) {
      if (ctx.level === ValidationLevel.MINIMAL) {
        // In minimal mode, log warning but don't throw
        console.warn('[Validation] Minimal mode - validation warning:', error)
        return data as z.infer<T>
      }
      throw error
    }
  }

  /**
   * Safe parse with context (returns result object instead of throwing)
   */
  safeParse(data: any, context?: ValidationContext): z.SafeParseReturnType<any, z.infer<T>> {
    const ctx = context || this.defaultContext
    const adjustedSchema = this.adjustSchemaForContext(this.schema, ctx)

    const result = adjustedSchema.safeParse(data)

    if (result.success && !ctx.skipBusinessRules && ctx.customRules) {
      for (const rule of ctx.customRules) {
        const ruleResult = rule(result.data)
        if (ruleResult !== true) {
          return {
            success: false,
            error: new z.ZodError([{
              code: z.ZodIssueCode.custom,
              message: typeof ruleResult === 'string' ? ruleResult : 'Custom validation failed',
              path: []
            }])
          }
        }
      }
    }

    return result
  }

  /**
   * Adjust schema based on context level
   */
  private adjustSchemaForContext(schema: z.ZodType, context: ValidationContext): z.ZodType {
    switch (context.level) {
      case ValidationLevel.STRICT:
        // No adjustments - use schema as-is
        return schema

      case ValidationLevel.BALANCED:
        // Allow type coercion
        if (context.coerceTypes) {
          return this.addTypeCoercion(schema)
        }
        return schema

      case ValidationLevel.FLEXIBLE:
        // Make more fields optional, allow coercion
        let flexibleSchema = schema
        if (context.allowPartialData) {
          flexibleSchema = this.makePartial(flexibleSchema)
        }
        if (context.coerceTypes) {
          flexibleSchema = this.addTypeCoercion(flexibleSchema)
        }
        return flexibleSchema

      case ValidationLevel.MINIMAL:
        // Maximum flexibility
        let minimalSchema = schema
        if (context.allowPartialData) {
          minimalSchema = this.makePartial(minimalSchema)
        }
        if (context.coerceTypes) {
          minimalSchema = this.addTypeCoercion(minimalSchema)
        }
        // Make schema more permissive
        return minimalSchema.optional().nullable().catch(undefined) as any

      default:
        return schema
    }
  }

  /**
   * Make schema partial (all fields optional)
   */
  private makePartial(schema: z.ZodType): z.ZodType {
    if (schema instanceof z.ZodObject) {
      return schema.partial()
    }
    return schema
  }

  /**
   * Add type coercion to schema
   */
  private addTypeCoercion(schema: z.ZodType): z.ZodType {
    // Helper to check if a schema is a number-based type
    const isNumberType = (s: any): boolean => {
      // Direct ZodNumber
      if (s instanceof z.ZodNumber || s._def?.typeName === 'ZodNumber') {
        return true
      }

      // ZodEffects wrapping ZodNumber (like refined number schemas)
      if (s._def?.typeName === 'ZodEffects' && s._def?.schema) {
        return s._def.schema._def?.typeName === 'ZodNumber'
      }

      // Check for number-related checks
      if (s._def?.checks && s._def.checks.some((check: any) => check.kind === 'min' || check.kind === 'max')) {
        return true
      }

      return false
    }

    // Helper to check if a schema is a date type
    const isDateType = (s: any): boolean => {
      return s instanceof z.ZodDate || s._def?.typeName === 'ZodDate'
    }

    // Helper to check if a schema is a string type
    const isStringType = (s: any): boolean => {
      return s instanceof z.ZodString || s._def?.typeName === 'ZodString'
    }

    // Handle object schemas recursively
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape
      const coercedShape: any = {}

      for (const [key, value] of Object.entries(shape)) {
        if (isNumberType(value)) {
          // For number fields, use coerce.number() but preserve refinements
          coercedShape[key] = z.preprocess(
            (val) => {
              if (typeof val === 'string') {
                const parsed = parseFloat(val)
                return isNaN(parsed) ? val : parsed
              }
              return val
            },
            value as z.ZodNumber
          )
        } else if (isDateType(value)) {
          coercedShape[key] = z.preprocess(
            (val) => {
              if (typeof val === 'string') {
                const parsed = new Date(val)
                return isNaN(parsed.getTime()) ? val : parsed
              }
              return val
            },
            value as z.ZodDate
          )
        } else if (isStringType(value)) {
          // Keep strings as-is but trim them
          coercedShape[key] = z.preprocess(
            (val) => typeof val === 'string' ? val.trim() : val,
            value as z.ZodString
          )
        } else if (value instanceof z.ZodOptional) {
          // Handle optional fields
          const innerType = (value as any)._def.innerType
          if (isNumberType(innerType)) {
            coercedShape[key] = z.preprocess(
              (val) => {
                if (val === undefined || val === null) return undefined
                if (typeof val === 'string') {
                  const parsed = parseFloat(val)
                  return isNaN(parsed) ? val : parsed
                }
                return val
              },
              value
            )
          } else if (isDateType(innerType)) {
            coercedShape[key] = z.preprocess(
              (val) => {
                if (val === undefined || val === null) return undefined
                if (typeof val === 'string') {
                  const parsed = new Date(val)
                  return isNaN(parsed.getTime()) ? val : parsed
                }
                return val
              },
              value
            )
          } else {
            coercedShape[key] = value
          }
        } else if (value instanceof z.ZodDefault) {
          // Handle defaults
          const innerType = (value as any)._def.innerType
          if (isNumberType(innerType)) {
            coercedShape[key] = z.preprocess(
              (val) => {
                if (typeof val === 'string') {
                  const parsed = parseFloat(val)
                  return isNaN(parsed) ? val : parsed
                }
                return val
              },
              value
            )
          } else {
            coercedShape[key] = value
          }
        } else {
          coercedShape[key] = value
        }
      }

      return z.object(coercedShape)
    }

    // Handle primitive types
    if (isNumberType(schema)) {
      return z.preprocess(
        (val) => {
          if (typeof val === 'string') {
            const parsed = parseFloat(val)
            return isNaN(parsed) ? val : parsed
          }
          return val
        },
        schema as z.ZodNumber
      )
    }
    if (schema instanceof z.ZodBoolean) {
      return z.coerce.boolean()
    }
    if (isDateType(schema)) {
      return z.coerce.date()
    }

    return schema
  }
}

/**
 * Context detection utilities
 */
export class ValidationContextDetector {
  /**
   * Auto-detect context from environment
   */
  static detectContext(): ValidationContext {
    // Check if in test environment
    if (process.env.NODE_ENV === 'test') {
      return DEFAULT_CONTEXTS.test
    }

    // Check if in development
    if (process.env.NODE_ENV === 'development') {
      // Use flexible validation in development for better DX
      return {
        ...DEFAULT_CONTEXTS.development,
        level: ValidationLevel.FLEXIBLE
      }
    }

    // Default to API context in production
    return DEFAULT_CONTEXTS.api
  }

  /**
   * Detect context from request source
   */
  static detectFromSource(source: string): ValidationContext {
    if (source.includes('event')) {
      return DEFAULT_CONTEXTS.event
    }
    if (source.includes('test')) {
      return DEFAULT_CONTEXTS.test
    }
    if (source.includes('api')) {
      return DEFAULT_CONTEXTS.api
    }
    if (source.includes('db') || source.includes('database')) {
      return DEFAULT_CONTEXTS.database
    }
    return DEFAULT_CONTEXTS.api
  }
}

/**
 * Validation helper with context support
 */
export function validateWithContext<T extends z.ZodType>(
  schema: T,
  data: any,
  context?: ValidationContext
): z.infer<T> {
  const contextAwareSchema = new ContextAwareSchema(schema, context)
  return contextAwareSchema.parse(data, context)
}

/**
 * Create a context-aware validator function
 */
export function createContextValidator<T extends z.ZodType>(
  schema: T,
  defaultContext?: ValidationContext
) {
  const contextAwareSchema = new ContextAwareSchema(schema, defaultContext)

  return {
    strict: (data: any) => contextAwareSchema.parse(data, DEFAULT_CONTEXTS.database),
    balanced: (data: any) => contextAwareSchema.parse(data, DEFAULT_CONTEXTS.api),
    flexible: (data: any) => contextAwareSchema.parse(data, DEFAULT_CONTEXTS.event),
    minimal: (data: any) => contextAwareSchema.parse(data, DEFAULT_CONTEXTS.test),
    withContext: (data: any, ctx: ValidationContext) => contextAwareSchema.parse(data, ctx)
  }
}

/**
 * Context-aware validation middleware for Express/Next.js
 */
export function validationMiddleware(
  schema: z.ZodType,
  contextOrLevel: ValidationContext | ValidationLevel = ValidationLevel.BALANCED
) {
  return async (req: any, res: any, next: any) => {
    const context = typeof contextOrLevel === 'string'
      ? { ...DEFAULT_CONTEXTS.api, level: contextOrLevel }
      : contextOrLevel

    try {
      const validated = validateWithContext(schema, req.body, context)
      req.validatedData = validated
      next()
    } catch (error) {
      if (context.level === ValidationLevel.MINIMAL) {
        // In minimal mode, just log and continue
        console.warn('[Validation Middleware] Validation warning:', error)
        req.validatedData = req.body
        next()
      } else {
        next(error)
      }
    }
  }
}