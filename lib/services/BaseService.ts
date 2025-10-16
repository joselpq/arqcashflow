/**
 * BaseService - Foundation for all business logic services
 *
 * Provides common patterns for CRUD operations, validation, and audit logging
 * while leveraging the team context middleware for security and consistency.
 *
 * Design Principles:
 * - Team isolation by default
 * - Audit logging for all mutations
 * - Consistent error handling
 * - Type-safe operations
 * - Testable business logic
 */

import { User, Team } from '@prisma/client'
import { TeamScopedPrismaClient } from '@/lib/middleware/team-context'
import { createAuditContextFromAPI, auditCreate, auditUpdate, auditDelete, safeAudit } from '@/lib/utils/audit'
import { NextRequest } from 'next/server'

export interface ServiceContext {
  user: User & { team: Team }
  teamId: string
  teamScopedPrisma: TeamScopedPrismaClient
  request?: NextRequest // Optional for API operations
}

export interface QueryOptions {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface BaseFilters {
  status?: string
  category?: string
  contractId?: string
  [key: string]: any
}

export interface BulkOptions {
  skipValidation?: boolean
  continueOnError?: boolean
}

export interface BulkItemResult<T> {
  success: boolean
  data?: T
  error?: string
  index: number
}

export interface BulkOperationResult<T> {
  success: boolean
  totalItems: number
  successCount: number
  failureCount: number
  results: BulkItemResult<T>[]
  errors: string[]
}

export interface BulkUpdateItem<T> {
  id: string
  data: T
}

export abstract class BaseService<TEntity, TCreateData, TUpdateData, TFilters extends BaseFilters = BaseFilters> {
  protected context: ServiceContext
  protected entityName: string
  protected validSortFields: string[]

  constructor(context: ServiceContext, entityName: string, validSortFields: string[] = ['createdAt']) {
    this.context = context
    this.entityName = entityName
    this.validSortFields = validSortFields
  }

  /**
   * Build query filters with automatic team scoping
   */
  protected buildFilters(filters: TFilters): any {
    const where: any = {}

    // Apply entity-specific filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        where[key] = value
      }
    })

    return where
  }

  /**
   * Build sort configuration with validation
   */
  protected buildSort(options: QueryOptions): any {
    const { sortBy = 'createdAt', sortOrder = 'desc' } = options

    if (!this.validSortFields.includes(sortBy)) {
      return { createdAt: 'desc' }
    }

    return { [sortBy]: sortOrder }
  }

  /**
   * Create audit context for operations
   */
  protected createAuditContext(action: string, source: string = 'service') {
    if (!this.context.request) {
      // For non-API operations (AI, background tasks, etc.)
      return {
        userId: this.context.user.id,
        userEmail: this.context.user.email,
        teamId: this.context.teamId,
        action,
        source,
        timestamp: new Date(),
        metadata: {}
      }
    }

    return createAuditContextFromAPI(this.context.user, this.context.teamId, this.context.request, {
      action,
      source
    })
  }

  /**
   * Safe audit logging with error handling
   */
  protected async logAudit(operation: () => Promise<void>) {
    await safeAudit(operation)
  }

  /**
   * Get entity by ID with team scoping
   */
  async findById(id: string, include?: any): Promise<TEntity | null> {
    const model = (this.context.teamScopedPrisma as any)[this.entityName]
    if (!model) {
      throw new ServiceError(`Model ${this.entityName} not found`, 'MODEL_NOT_FOUND', 500)
    }

    const entity = await model.findFirst({
      where: { id },
      include
    })

    return entity
  }

  /**
   * Get all entities with filtering and sorting
   */
  async findMany(filters: TFilters, options: QueryOptions = {}, include?: any): Promise<TEntity[]> {
    const where = this.buildFilters(filters)
    const orderBy = this.buildSort(options)

    const model = (this.context.teamScopedPrisma as any)[this.entityName]
    if (!model) {
      throw new ServiceError(`Model ${this.entityName} not found`, 'MODEL_NOT_FOUND', 500)
    }

    const entities = await model.findMany({
      where,
      orderBy,
      include,
      take: options.limit,
      skip: options.offset
    })

    return entities
  }

  /**
   * Count entities with filtering
   */
  async count(filters: TFilters): Promise<number> {
    const where = this.buildFilters(filters)

    const model = (this.context.teamScopedPrisma as any)[this.entityName]
    if (!model) {
      throw new ServiceError(`Model ${this.entityName} not found`, 'MODEL_NOT_FOUND', 500)
    }

    return await model.count({
      where
    })
  }

  /**
   * Create entity with audit logging
   */
  async create(data: TCreateData, include?: any): Promise<TEntity> {
    const model = (this.context.teamScopedPrisma as any)[this.entityName]
    if (!model) {
      throw new ServiceError(`Model ${this.entityName} not found`, 'MODEL_NOT_FOUND', 500)
    }

    const entity = await model.create({
      data,
      include
    })

    // Log audit entry
    await this.logAudit(async () => {
      const auditContext = this.createAuditContext(`${this.entityName}_creation`)
      await auditCreate(auditContext, this.entityName as any, entity.id, entity)
    })

    return entity
  }

  /**
   * Update entity with audit logging
   */
  async update(id: string, data: TUpdateData, include?: any): Promise<TEntity | null> {
    // Get the entity before update for audit
    const beforeState = await this.findById(id)
    if (!beforeState) {
      return null
    }

    const model = (this.context.teamScopedPrisma as any)[this.entityName]
    if (!model) {
      throw new ServiceError(`Model ${this.entityName} not found`, 'MODEL_NOT_FOUND', 500)
    }

    const entity = await model.update({
      where: { id },
      data,
      include
    })

    // Log audit entry
    await this.logAudit(async () => {
      const auditContext = this.createAuditContext(`${this.entityName}_update`)
      await auditUpdate(auditContext, this.entityName as any, id, beforeState, data, entity)
    })

    return entity
  }

  /**
   * Delete entity with audit logging
   */
  async delete(id: string): Promise<boolean> {
    // Get the entity before deletion for audit
    const beforeState = await this.findById(id)
    if (!beforeState) {
      return false
    }

    const model = (this.context.teamScopedPrisma as any)[this.entityName]
    if (!model) {
      throw new ServiceError(`Model ${this.entityName} not found`, 'MODEL_NOT_FOUND', 500)
    }

    await model.delete({
      where: { id }
    })

    // Log audit entry
    await this.logAudit(async () => {
      const auditContext = this.createAuditContext(`${this.entityName}_deletion`)
      await auditDelete(auditContext, this.entityName as any, id, beforeState)
    })

    return true
  }

  /**
   * Bulk create entities with atomic transaction and audit logging
   */
  async bulkCreate(items: TCreateData[], options: BulkOptions = {}): Promise<BulkOperationResult<TEntity>> {
    const result: BulkOperationResult<TEntity> = {
      success: false,
      totalItems: items.length,
      successCount: 0,
      failureCount: 0,
      results: [],
      errors: []
    }

    if (items.length === 0) {
      result.success = true
      return result
    }

    const model = (this.context.teamScopedPrisma as any)[this.entityName]
    if (!model) {
      throw new ServiceError(`Model ${this.entityName} not found`, 'MODEL_NOT_FOUND', 500)
    }

    // Use transaction for atomicity with 15s timeout for large bulk operations
    await this.context.teamScopedPrisma.raw.$transaction(async (tx) => {
      const txModel = (tx as any)[this.entityName]

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const itemResult: BulkItemResult<TEntity> = {
          success: false,
          index: i
        }

        try {
          // Validate business rules if not skipped
          if (!options.skipValidation) {
            await this.validateBusinessRules(item)
          }

          // Create entity (add teamId manually since we're in transaction)
          // Transform date fields to proper format
          const transformedData = this.transformDatesForPrisma({ ...item, teamId: this.context.teamId })
          const entity = await txModel.create({
            data: transformedData
          })

          itemResult.success = true
          itemResult.data = entity
          result.successCount++

          // Log audit entry (outside transaction for performance)
          setImmediate(async () => {
            await this.logAudit(async () => {
              const auditContext = this.createAuditContext(`${this.entityName}_bulk_creation`)
              await auditCreate(auditContext, this.entityName as any, entity.id, entity)
            })
          })

        } catch (error) {
          itemResult.error = error instanceof Error ? error.message : 'Unknown error'
          result.failureCount++
          result.errors.push(`Item ${i}: ${itemResult.error}`)

          if (!options.continueOnError) {
            throw error // This will rollback the entire transaction
          }
        }

        result.results.push(itemResult)
      }
    }, { timeout: 15000 }) // 15 second timeout for large bulk operations

    result.success = result.failureCount === 0
    return result
  }

  /**
   * Bulk update entities by IDs with atomic transaction and audit logging
   */
  async bulkUpdate(updates: BulkUpdateItem<TUpdateData>[], options: BulkOptions = {}): Promise<BulkOperationResult<TEntity>> {
    const result: BulkOperationResult<TEntity> = {
      success: false,
      totalItems: updates.length,
      successCount: 0,
      failureCount: 0,
      results: [],
      errors: []
    }

    if (updates.length === 0) {
      result.success = true
      return result
    }

    const model = (this.context.teamScopedPrisma as any)[this.entityName]
    if (!model) {
      throw new ServiceError(`Model ${this.entityName} not found`, 'MODEL_NOT_FOUND', 500)
    }

    // Use transaction for atomicity with 15s timeout for large bulk operations
    await this.context.teamScopedPrisma.raw.$transaction(async (tx) => {
      const txModel = (tx as any)[this.entityName]

      for (let i = 0; i < updates.length; i++) {
        const { id, data } = updates[i]
        const itemResult: BulkItemResult<TEntity> = {
          success: false,
          index: i
        }

        try {
          // Get before state for audit (ensure team isolation)
          const beforeState = await txModel.findFirst({
            where: { id, teamId: this.context.teamId }
          })

          if (!beforeState) {
            throw new ServiceError(`Entity with ID ${id} not found`, 'NOT_FOUND')
          }

          // Validate business rules if not skipped
          if (!options.skipValidation) {
            await this.validateBusinessRules(data)
          }

          // Update entity (ensure team isolation)
          // Transform date fields to proper format
          const transformedData = this.transformDatesForPrisma(data)
          const entity = await txModel.update({
            where: { id, teamId: this.context.teamId },
            data: transformedData
          })

          itemResult.success = true
          itemResult.data = entity
          result.successCount++

          // Log audit entry (outside transaction for performance)
          setImmediate(async () => {
            await this.logAudit(async () => {
              const auditContext = this.createAuditContext(`${this.entityName}_bulk_update`)
              await auditUpdate(auditContext, this.entityName as any, id, beforeState, data, entity)
            })
          })

        } catch (error) {
          itemResult.error = error instanceof Error ? error.message : 'Unknown error'
          result.failureCount++
          result.errors.push(`Item ${i} (ID: ${id}): ${itemResult.error}`)

          if (!options.continueOnError) {
            throw error // This will rollback the entire transaction
          }
        }

        result.results.push(itemResult)
      }
    }, { timeout: 15000 }) // 15 second timeout for large bulk operations

    result.success = result.failureCount === 0
    return result
  }

  /**
   * Bulk delete entities by IDs with atomic transaction and audit logging
   */
  async bulkDelete(ids: string[], options: BulkOptions = {}): Promise<BulkOperationResult<boolean>> {
    const result: BulkOperationResult<boolean> = {
      success: false,
      totalItems: ids.length,
      successCount: 0,
      failureCount: 0,
      results: [],
      errors: []
    }

    if (ids.length === 0) {
      result.success = true
      return result
    }

    const model = (this.context.teamScopedPrisma as any)[this.entityName]
    if (!model) {
      throw new ServiceError(`Model ${this.entityName} not found`, 'MODEL_NOT_FOUND', 500)
    }

    // Use transaction for atomicity with 15s timeout for large bulk operations
    await this.context.teamScopedPrisma.raw.$transaction(async (tx) => {
      const txModel = (tx as any)[this.entityName]

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        const itemResult: BulkItemResult<boolean> = {
          success: false,
          index: i
        }

        try {
          // Get before state for audit (ensure team isolation)
          const beforeState = await txModel.findFirst({
            where: { id, teamId: this.context.teamId }
          })

          if (!beforeState) {
            if (options.continueOnError) {
              itemResult.error = `Entity with ID ${id} not found`
              result.failureCount++
              result.errors.push(`Item ${i} (ID: ${id}): ${itemResult.error}`)
              result.results.push(itemResult)
              continue
            } else {
              throw new ServiceError(`Entity with ID ${id} not found`, 'NOT_FOUND')
            }
          }

          // Delete entity (ensure team isolation)
          await txModel.delete({
            where: { id, teamId: this.context.teamId }
          })

          itemResult.success = true
          itemResult.data = true
          result.successCount++

          // Log audit entry (outside transaction for performance)
          setImmediate(async () => {
            await this.logAudit(async () => {
              const auditContext = this.createAuditContext(`${this.entityName}_bulk_deletion`)
              await auditDelete(auditContext, this.entityName as any, id, beforeState)
            })
          })

        } catch (error) {
          itemResult.error = error instanceof Error ? error.message : 'Unknown error'
          result.failureCount++
          result.errors.push(`Item ${i} (ID: ${id}): ${itemResult.error}`)

          if (!options.continueOnError) {
            throw error // This will rollback the entire transaction
          }
        }

        result.results.push(itemResult)
      }
    }, { timeout: 15000 }) // 15 second timeout for large bulk operations

    result.success = result.failureCount === 0
    return result
  }

  /**
   * Transform date fields from string to proper Date format for Prisma
   */
  protected transformDatesForPrisma(data: any): any {
    const transformed = { ...data }

    // Common date fields that need transformation
    const dateFields = ['signedDate', 'dueDate', 'receivedDate', 'paidDate', 'expectedDate']

    dateFields.forEach(field => {
      if (transformed[field] && typeof transformed[field] === 'string') {
        // Convert YYYY-MM-DD to ISO-8601 DateTime
        const dateStr = transformed[field]
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          transformed[field] = new Date(dateStr + 'T15:00:00.000Z')
        }
      }
    })

    return transformed
  }

  /**
   * Abstract method for entity-specific business logic
   */
  abstract validateBusinessRules(data: TCreateData | TUpdateData): Promise<void>
}

/**
 * Service factory for creating service instances with context
 * Note: Import services individually to avoid circular dependencies
 */
export class ServiceFactory {
  static createContractService(context: ServiceContext) {
    const { ContractService } = require('./ContractService')
    return new ContractService(context)
  }

  static createReceivableService(context: ServiceContext) {
    const { ReceivableService } = require('./ReceivableService')
    return new ReceivableService(context)
  }

  static createExpenseService(context: ServiceContext) {
    const { ExpenseService } = require('./ExpenseService')
    return new ExpenseService(context)
  }
}

/**
 * Type-safe error class for service operations
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}

/**
 * Common validation utilities
 */
export class ValidationUtils {
  static isValidUUID(id: string): boolean {
    // Support both UUID and CUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const cuidRegex = /^c[a-z0-9]{24}$/
    return uuidRegex.test(id) || cuidRegex.test(id)
  }

  static normalizeEmptyString(value: string | null | undefined): string | null {
    if (value === '' || value === undefined) return null
    return value
  }

  static validatePositiveNumber(value: number, fieldName: string): void {
    if (value <= 0) {
      throw new ServiceError(`${fieldName} must be positive`, 'INVALID_AMOUNT')
    }
  }
}