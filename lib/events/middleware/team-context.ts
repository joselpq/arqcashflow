/**
 * Team Context Event Middleware
 *
 * Enforces team-based isolation, validates team access,
 * and maintains security boundaries for all events.
 */

import type { EventPayload, EventContext, EventMiddleware } from '../types'
import { prisma } from '@/lib/prisma'

/**
 * Team Context Middleware Components
 */
export class TeamContextMiddleware {
  /**
   * Enforce team isolation - ensure event belongs to correct team
   */
  static enforceTeamIsolation: EventMiddleware = async (event, context, next) => {
    try {
      // Verify event teamId matches context teamId
      if (event.teamId !== context.teamId) {
        throw new TeamContextError(
          `Team isolation violation: event teamId (${event.teamId}) does not match context teamId (${context.teamId})`,
          'TEAM_MISMATCH'
        )
      }

      // For financial events, verify referenced entities belong to the team
      if (event.type.match(/^(contract|receivable|expense|recurring)\./)) {
        await TeamContextMiddleware.validateFinancialEntityTeam(event, context)
      }

      await next()

    } catch (error) {
      console.error(`[TeamContext] Team isolation enforcement failed:`, error)
      throw error
    }
  }

  /**
   * Validate team access permissions
   */
  static validateTeamAccess: EventMiddleware = async (event, context, next) => {
    try {
      // Verify user has access to the team
      if (context.userId) {
        const hasAccess = await TeamContextMiddleware.userHasTeamAccess(context.userId, context.teamId)
        if (!hasAccess) {
          throw new TeamContextError(
            `Access denied: user ${context.userId} does not have access to team ${context.teamId}`,
            'ACCESS_DENIED'
          )
        }
      }

      // Validate operation permissions based on event type
      await TeamContextMiddleware.validateOperationPermissions(event, context)

      await next()

    } catch (error) {
      console.error(`[TeamContext] Team access validation failed:`, error)
      throw error
    }
  }

  /**
   * Audit team access for security monitoring
   */
  static auditTeamAccess: EventMiddleware = async (event, context, next) => {
    try {
      // Log team access patterns for security analysis
      await TeamContextMiddleware.logTeamAccess(event, context)

      await next()

    } catch (error) {
      console.error(`[TeamContext] Team access audit failed:`, error)
      // Don't block processing for audit failures, just log
      await next()
    }
  }

  /**
   * Rate limiting per team to prevent abuse
   */
  static enforceTeamRateLimit: EventMiddleware = async (event, context, next) => {
    try {
      const rateLimitExceeded = await TeamContextMiddleware.checkTeamRateLimit(context.teamId, event.type)

      if (rateLimitExceeded) {
        throw new TeamContextError(
          `Rate limit exceeded for team ${context.teamId} on event type ${event.type}`,
          'RATE_LIMIT_EXCEEDED'
        )
      }

      await next()

    } catch (error) {
      console.error(`[TeamContext] Team rate limiting failed:`, error)
      throw error
    }
  }

  /**
   * Validate that financial entities belong to the correct team
   */
  private static async validateFinancialEntityTeam(event: EventPayload, context: EventContext): Promise<void> {
    const payload = event.payload as any

    // Check contract team ownership
    if (payload.contractId) {
      const contract = await prisma.contract.findUnique({
        where: { id: payload.contractId },
        select: { teamId: true }
      })

      if (!contract || contract.teamId !== context.teamId) {
        throw new TeamContextError(
          `Contract ${payload.contractId} does not belong to team ${context.teamId}`,
          'ENTITY_TEAM_MISMATCH'
        )
      }
    }

    // Check receivable team ownership
    if (payload.receivableId) {
      const receivable = await prisma.receivable.findUnique({
        where: { id: payload.receivableId },
        select: { teamId: true }
      })

      if (!receivable || receivable.teamId !== context.teamId) {
        throw new TeamContextError(
          `Receivable ${payload.receivableId} does not belong to team ${context.teamId}`,
          'ENTITY_TEAM_MISMATCH'
        )
      }
    }

    // Check expense team ownership
    if (payload.expenseId) {
      const expense = await prisma.expense.findUnique({
        where: { id: payload.expenseId },
        select: { teamId: true }
      })

      if (!expense || expense.teamId !== context.teamId) {
        throw new TeamContextError(
          `Expense ${payload.expenseId} does not belong to team ${context.teamId}`,
          'ENTITY_TEAM_MISMATCH'
        )
      }
    }
  }

  /**
   * Check if user has access to team
   */
  private static async userHasTeamAccess(userId: string, teamId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { teamId: true }
      })

      return user?.teamId === teamId
    } catch (error) {
      console.error('Error checking user team access:', error)
      return false
    }
  }

  /**
   * Validate operation permissions based on event type
   */
  private static async validateOperationPermissions(event: EventPayload, context: EventContext): Promise<void> {
    // For now, basic team membership grants all permissions
    // Future: Implement role-based access control (RBAC)

    const eventType = event.type
    const payload = event.payload as any

    // High-value operations require additional validation
    if (eventType === 'expense.approved' && payload.amount > 50000) {
      // Future: Check if user has "approver" role
    }

    if (eventType.startsWith('bulk.')) {
      // Future: Check if user has "bulk_operations" permission
    }

    // AI operations might have specific permissions
    if (eventType.startsWith('ai.') || eventType.startsWith('document.')) {
      // Future: Check if team has AI features enabled
    }
  }

  /**
   * Log team access patterns for security monitoring
   */
  private static async logTeamAccess(event: EventPayload, context: EventContext): Promise<void> {
    try {
      // Create audit log entry for team access
      await prisma.auditLog.create({
        data: {
          id: `team_access_${event.id}`,
          teamId: context.teamId,
          userId: context.userId,
          entityType: 'team_access',
          entityId: context.teamId,
          action: 'event_access',
          timestamp: context.timestamp,
          metadata: {
            eventType: event.type,
            eventId: event.id,
            source: event.source,
            accessType: 'team_context_middleware',
          },
        },
      })
    } catch (error) {
      console.error('Failed to log team access:', error)
      // Don't throw - audit logging failure shouldn't block event processing
    }
  }

  /**
   * Check team rate limits to prevent abuse
   */
  private static async checkTeamRateLimit(teamId: string, eventType: string): Promise<boolean> {
    try {
      const windowStart = new Date(Date.now() - 60 * 1000) // 1 minute window

      // Count events in the last minute
      const eventCount = await prisma.event.count({
        where: {
          teamId,
          type: eventType,
          timestamp: {
            gte: windowStart,
          },
        },
      })

      // Define rate limits per event type
      const rateLimits: Record<string, number> = {
        // Financial operations
        'contract.created': 100,
        'receivable.created': 200,
        'expense.created': 200,

        // Bulk operations (stricter limits)
        'bulk.operation_started': 10,

        // AI operations (moderate limits)
        'document.uploaded': 50,

        // Default limit for other events
        default: 300,
      }

      const limit = rateLimits[eventType] || rateLimits.default

      return eventCount >= limit

    } catch (error) {
      console.error('Error checking team rate limit:', error)
      // On error, allow the operation (fail open)
      return false
    }
  }
}

/**
 * Team Context Error Types
 */
export class TeamContextError extends Error {
  constructor(
    message: string,
    public code: string,
    public teamId?: string,
    public userId?: string
  ) {
    super(message)
    this.name = 'TeamContextError'
  }
}

/**
 * Team Context Validation Result
 */
export interface TeamContextValidationResult {
  isValid: boolean
  teamId: string
  userId?: string
  errors: string[]
  permissions: string[]
}

/**
 * Team Context Utilities
 */
export const TeamContextUtils = {
  /**
   * Create team-scoped event context
   */
  createTeamContext(teamId: string, userId?: string): EventContext {
    return {
      teamId,
      userId,
      timestamp: new Date(),
      source: 'service',
    }
  },

  /**
   * Validate team context synchronously
   */
  validateTeamContext(event: EventPayload, context: EventContext): TeamContextValidationResult {
    const result: TeamContextValidationResult = {
      isValid: true,
      teamId: context.teamId,
      userId: context.userId,
      errors: [],
      permissions: []
    }

    // Basic validation
    if (event.teamId !== context.teamId) {
      result.errors.push('Team ID mismatch')
      result.isValid = false
    }

    if (!context.teamId) {
      result.errors.push('Missing team ID in context')
      result.isValid = false
    }

    return result
  },

  /**
   * Create middleware for specific team permissions
   */
  createPermissionMiddleware(requiredPermission: string): EventMiddleware {
    return async (event, context, next) => {
      // Future: Check if user has required permission
      // For now, just log the permission check
      console.log(`[TeamContext] Checking permission: ${requiredPermission}`)
      await next()
    }
  },

  /**
   * Get team statistics for monitoring
   */
  async getTeamEventStats(teamId: string, timeframe: 'hour' | 'day' | 'week' = 'hour'): Promise<{
    totalEvents: number
    eventsByType: Record<string, number>
    uniqueUsers: number
  }> {
    try {
      const windowStart = new Date()
      switch (timeframe) {
        case 'hour':
          windowStart.setHours(windowStart.getHours() - 1)
          break
        case 'day':
          windowStart.setDate(windowStart.getDate() - 1)
          break
        case 'week':
          windowStart.setDate(windowStart.getDate() - 7)
          break
      }

      const [totalEvents, eventsByType, uniqueUsers] = await Promise.all([
        prisma.event.count({
          where: {
            teamId,
            timestamp: { gte: windowStart },
          },
        }),
        prisma.event.groupBy({
          by: ['type'],
          where: {
            teamId,
            timestamp: { gte: windowStart },
          },
          _count: { type: true },
        }),
        prisma.event.findMany({
          where: {
            teamId,
            timestamp: { gte: windowStart },
            userId: { not: null },
          },
          distinct: ['userId'],
          select: { userId: true },
        }),
      ])

      return {
        totalEvents,
        eventsByType: Object.fromEntries(
          eventsByType.map(item => [item.type, item._count.type])
        ),
        uniqueUsers: uniqueUsers.length,
      }
    } catch (error) {
      console.error('Error getting team event stats:', error)
      return { totalEvents: 0, eventsByType: {}, uniqueUsers: 0 }
    }
  }
}