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
import { createAuditContextFromAPI, auditCreate, auditUpdate, auditDelete, safeAudit } from '@/lib/audit-middleware'
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
      await auditCreate(auditContext, this.entityName, entity.id, entity)
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
      await auditUpdate(auditContext, this.entityName, id, beforeState, data, entity)
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
      await auditDelete(auditContext, this.entityName, id, beforeState)
    })

    return true
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