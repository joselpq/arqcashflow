/**
 * Audit Logging System
 *
 * Comprehensive audit logging for compliance and change tracking.
 * Combines core audit functionality with middleware helpers.
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================================================
// TYPES
// ============================================================================

export interface AuditContext {
  userId: string
  userEmail: string
  teamId: string
  metadata?: {
    ipAddress?: string
    userAgent?: string
    apiEndpoint?: string
    [key: string]: any
  }
}

export interface EntityChange {
  entityType: 'contract' | 'receivable' | 'expense' | 'recurring_expense' | 'recurring_expense_generation'
  entityId: string
  action: 'created' | 'updated' | 'deleted'
  changes?: Record<string, { from: any; to: any }>
  snapshot?: any
}

export interface AuditLogQuery {
  entityType?: 'contract' | 'receivable' | 'expense'
  entityId?: string
  userId?: string
  teamId?: string
  action?: 'created' | 'updated' | 'deleted'
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// ============================================================================
// CORE AUDIT FUNCTIONS
// ============================================================================

/**
 * Main function to log audit entries
 * Designed to never throw errors that would break main operations
 */
export async function logAuditEntry(
  context: AuditContext,
  change: EntityChange
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        userEmail: context.userEmail,
        teamId: context.teamId,
        entityType: change.entityType,
        entityId: change.entityId,
        action: change.action,
        changes: change.changes || {},
        snapshot: change.snapshot || null,
        metadata: context.metadata || {}
      }
    })
  } catch (error) {
    // Log audit failures but don't break the main operation
    console.error('Audit log failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      context,
      change,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * Helper function specifically for status changes
 * Common pattern across contracts, receivables, and expenses
 */
export async function logStatusChange(
  context: AuditContext,
  entityType: 'contract' | 'receivable' | 'expense' | 'recurring_expense',
  entityId: string,
  fromStatus: string,
  toStatus: string,
  fullEntity?: any
): Promise<void> {
  if (fromStatus !== toStatus) {
    await logAuditEntry(context, {
      entityType,
      entityId,
      action: 'updated',
      changes: {
        status: { from: fromStatus, to: toStatus }
      },
      snapshot: fullEntity
    })
  }
}

/**
 * Helper function to detect changes between old and new data
 * Returns only the fields that actually changed
 *
 * This function is designed to be defensive against null/undefined inputs
 * to prevent audit logging failures from breaking main operations.
 */
export function detectChanges(
  oldData: Record<string, any> | null | undefined,
  newData: Record<string, any> | null | undefined
): Record<string, { from: any; to: any }> {
  const changes: Record<string, { from: any; to: any }> = {}

  // Handle null/undefined inputs gracefully
  if (!newData || typeof newData !== 'object') {
    // If newData is null/undefined but oldData exists, it means data was deleted/cleared
    if (oldData && typeof oldData === 'object') {
      // Record all old fields as being cleared
      for (const [key, oldValue] of Object.entries(oldData)) {
        changes[key] = {
          from: oldValue,
          to: null
        }
      }
    }
    return changes
  }

  if (!oldData || typeof oldData !== 'object') {
    // If oldData is null/undefined but newData exists, all fields are new
    for (const [key, newValue] of Object.entries(newData)) {
      changes[key] = {
        from: null,
        to: newValue
      }
    }
    return changes
  }

  // Check each field in newData for changes
  for (const [key, newValue] of Object.entries(newData)) {
    const oldValue = oldData[key]

    // Skip if values are the same (including handling of null/undefined)
    if (oldValue === newValue) continue

    // Handle date objects specially
    if (oldValue instanceof Date && newValue instanceof Date) {
      if (oldValue.getTime() === newValue.getTime()) continue
    }

    // Handle string date comparisons (common in API updates)
    if (typeof oldValue === 'string' && newValue instanceof Date) {
      if (new Date(oldValue).getTime() === newValue.getTime()) continue
    }

    if (oldValue instanceof Date && typeof newValue === 'string') {
      if (oldValue.getTime() === new Date(newValue).getTime()) continue
    }

    // Record the change
    changes[key] = {
      from: oldValue,
      to: newValue
    }
  }

  return changes
}

/**
 * Helper to create audit context from request and auth data
 * Extracts common metadata from NextRequest
 */
export function createAuditContext(
  user: { id: string; email: string },
  teamId: string,
  request?: Request,
  additionalMetadata?: Record<string, any>
): AuditContext {
  const metadata: Record<string, any> = {
    ...additionalMetadata
  }

  if (request) {
    // Extract IP address (considering common proxy headers)
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const remoteAddr = request.headers.get('remote-addr')

    metadata.ipAddress = forwardedFor?.split(',')[0] || realIP || remoteAddr || 'unknown'
    metadata.userAgent = request.headers.get('user-agent') || 'unknown'

    // Extract API endpoint
    const url = new URL(request.url)
    metadata.apiEndpoint = `${request.method} ${url.pathname}`
  }

  return {
    userId: user.id,
    userEmail: user.email,
    teamId,
    metadata
  }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Retrieve audit logs with filtering and pagination
 */
export async function getAuditLogs(query: AuditLogQuery) {
  const where: any = {}

  // Apply filters
  if (query.entityType) where.entityType = query.entityType
  if (query.entityId) where.entityId = query.entityId
  if (query.userId) where.userId = query.userId
  if (query.teamId) where.teamId = query.teamId
  if (query.action) where.action = query.action

  // Date range filter
  if (query.startDate || query.endDate) {
    where.timestamp = {}
    if (query.startDate) where.timestamp.gte = query.startDate
    if (query.endDate) where.timestamp.lte = query.endDate
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: query.limit || 50,
      skip: query.offset || 0
    })

    return logs
  } catch (error) {
    console.error('Failed to retrieve audit logs:', error)
    return []
  }
}

/**
 * Get audit history for a specific entity
 */
export async function getEntityHistory(
  entityType: 'contract' | 'receivable' | 'expense',
  entityId: string,
  teamId: string
) {
  return getAuditLogs({
    entityType,
    entityId,
    teamId,
    limit: 100
  })
}

/**
 * Get recent activity for a user
 */
export async function getUserActivity(
  userId: string,
  teamId: string,
  limit: number = 20
) {
  return getAuditLogs({
    userId,
    teamId,
    limit
  })
}

/**
 * Get team activity summary
 */
export async function getTeamActivity(
  teamId: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 50
) {
  return getAuditLogs({
    teamId,
    startDate,
    endDate,
    limit
  })
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Wrapper function to add audit logging to any database operation
 * This is designed to be non-intrusive and fail-safe
 */
export async function withAudit<T>(
  operation: () => Promise<T>,
  auditData: {
    context: AuditContext
    change: EntityChange
  }
): Promise<T> {
  // Execute the main operation first
  const result = await operation()

  // Then log the audit entry (failures won't affect the main operation)
  await logAuditEntry(auditData.context, auditData.change)

  return result
}

/**
 * Higher-order function to wrap API route handlers with audit logging
 * This preserves all existing behavior while adding audit capabilities
 */
export function withAuditLogging<T extends any[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Re-throw the original error - audit should never change error behavior
      throw error
    }
  }
}

/**
 * Helper to create audit context from API request context
 * Standardizes the extraction of audit information from API calls
 */
export function createAuditContextFromAPI(
  user: { id: string; email: string },
  teamId: string,
  request: NextRequest,
  additionalMetadata?: Record<string, any>
): AuditContext {
  return createAuditContext(user, teamId, request, {
    timestamp: new Date().toISOString(),
    ...additionalMetadata
  })
}

/**
 * Audit logging for CREATE operations
 * Logs entity creation with full snapshot
 */
export async function auditCreate(
  context: AuditContext,
  entityType: 'contract' | 'receivable' | 'expense' | 'recurring_expense' | 'recurring_expense_generation',
  entityId: string,
  entityData: any
): Promise<void> {
  await logAuditEntry(context, {
    entityType,
    entityId,
    action: 'created',
    snapshot: entityData
  })
}

/**
 * Audit logging for UPDATE operations
 * Detects and logs only the fields that changed
 */
export async function auditUpdate(
  context: AuditContext,
  entityType: 'contract' | 'receivable' | 'expense' | 'recurring_expense' | 'recurring_expense_generation',
  entityId: string,
  oldData: any,
  newData: any,
  fullEntityAfterUpdate?: any
): Promise<void> {
  const changes = detectChanges(oldData, newData)

  // Only log if there were actual changes
  if (Object.keys(changes).length > 0) {
    await logAuditEntry(context, {
      entityType,
      entityId,
      action: 'updated',
      changes,
      snapshot: fullEntityAfterUpdate
    })
  }
}

/**
 * Audit logging for DELETE operations
 * Logs deletion with final snapshot before deletion
 */
export async function auditDelete(
  context: AuditContext,
  entityType: 'contract' | 'receivable' | 'expense' | 'recurring_expense' | 'recurring_expense_generation',
  entityId: string,
  finalSnapshot: any
): Promise<void> {
  await logAuditEntry(context, {
    entityType,
    entityId,
    action: 'deleted',
    snapshot: finalSnapshot
  })
}

/**
 * Feature flag helper for gradual rollout
 * Allows enabling/disabling audit logging via environment variable
 */
export function isAuditEnabled(): boolean {
  // Default to enabled, but allow disabling via env var for rollback
  return process.env.AUDIT_ENABLED !== 'false'
}

/**
 * Safe audit execution wrapper
 * Ensures audit failures never break main operations
 */
export async function safeAudit(auditOperation: () => Promise<void>): Promise<void> {
  if (!isAuditEnabled()) {
    return
  }

  try {
    await auditOperation()
  } catch (error) {
    // Log the audit failure but don't throw
    console.error('Audit operation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}

/**
 * Batch audit logging for multiple operations
 * Useful for bulk operations or complex transactions
 */
export async function auditBatch(
  context: AuditContext,
  operations: EntityChange[]
): Promise<void> {
  await safeAudit(async () => {
    // Log all operations sequentially to maintain order
    for (const operation of operations) {
      await logAuditEntry(context, operation)
    }
  })
}

/**
 * Helper for extracting entity data before operations
 * Standardizes the process of capturing "before" state
 */
export async function captureEntityState(
  entityType: 'contract' | 'receivable' | 'expense',
  entityId: string,
  prisma: any
): Promise<any> {
  try {
    switch (entityType) {
      case 'contract':
        return await prisma.contract.findUnique({
          where: { id: entityId },
          include: { receivables: true }
        })
      case 'receivable':
        return await prisma.receivable.findUnique({
          where: { id: entityId },
          include: { contract: true }
        })
      case 'expense':
        return await prisma.expense.findUnique({
          where: { id: entityId },
          include: { contract: true }
        })
      default:
        return null
    }
  } catch (error) {
    console.error(`Failed to capture ${entityType} state:`, error)
    return null
  }
}

/**
 * Type-safe wrapper for audit operations that preserves original function signatures
 * This allows us to add audit to existing functions without changing their interfaces
 */
export function auditWrapper<TArgs extends any[], TReturn>(
  originalFunction: (...args: TArgs) => Promise<TReturn>,
  auditOptions: {
    context: AuditContext
    entityType: 'contract' | 'receivable' | 'expense'
    operation: 'create' | 'update' | 'delete'
    getEntityId: (...args: TArgs) => string
    getEntityData?: (...args: TArgs) => any
  }
) {
  return async (...args: TArgs): Promise<TReturn> => {
    const entityId = auditOptions.getEntityId(...args)
    let beforeState: any = null

    // Capture before state for updates and deletes
    if (auditOptions.operation === 'update' || auditOptions.operation === 'delete') {
      beforeState = await captureEntityState(auditOptions.entityType, entityId, args[0])
    }

    // Execute the original operation
    const result = await originalFunction(...args)

    // Log the audit entry
    await safeAudit(async () => {
      switch (auditOptions.operation) {
        case 'create':
          await auditCreate(
            auditOptions.context,
            auditOptions.entityType,
            entityId,
            auditOptions.getEntityData ? auditOptions.getEntityData(...args) : result
          )
          break
        case 'update':
          if (beforeState) {
            await auditUpdate(
              auditOptions.context,
              auditOptions.entityType,
              entityId,
              beforeState,
              auditOptions.getEntityData ? auditOptions.getEntityData(...args) : result,
              result
            )
          }
          break
        case 'delete':
          if (beforeState) {
            await auditDelete(
              auditOptions.context,
              auditOptions.entityType,
              entityId,
              beforeState
            )
          }
          break
      }
    })

    return result
  }
}
