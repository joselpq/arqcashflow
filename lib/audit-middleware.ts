import { NextRequest } from 'next/server'
import {
  logAuditEntry,
  createAuditContext,
  detectChanges,
  AuditContext,
  EntityChange
} from '@/lib/audit-service'

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