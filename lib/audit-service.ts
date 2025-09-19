import { prisma } from '@/lib/prisma'

// Types for audit context and changes
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
  entityType: 'contract' | 'receivable' | 'expense'
  entityId: string
  action: 'created' | 'updated' | 'deleted'
  changes?: Record<string, { from: any; to: any }>
  snapshot?: any
}

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
  entityType: 'contract' | 'receivable' | 'expense',
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
 */
export function detectChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>
): Record<string, { from: any; to: any }> {
  const changes: Record<string, { from: any; to: any }> = {}

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

/**
 * Query functions for retrieving audit logs
 */

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