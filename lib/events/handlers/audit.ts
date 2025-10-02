/**
 * Audit and Logging Event Handlers
 *
 * Handles audit trail, compliance logging, security monitoring,
 * and system health tracking for all events.
 */

import type { EventBus, EventPayload, EventHandler, EventContext } from '../types'
import { EventTypes } from '../types'
import { prisma } from '@/lib/prisma'

/**
 * Helper function to get user email from userId
 */
async function getUserEmail(userId: string | undefined): Promise<string> {
  if (!userId) return 'system@arqcashflow.com'

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    })
    return user?.email || 'unknown@arqcashflow.com'
  } catch (error) {
    console.warn(`[Audit] Failed to fetch user email for userId ${userId}:`, error)
    return 'unknown@arqcashflow.com'
  }
}

/**
 * Audit Trail Handlers
 */
class AuditTrailHandlers {
  /**
   * Log all financial events for compliance
   */
  static onFinancialAudit: EventHandler = async (event, context) => {
    if (!event.type.match(/^(contract|receivable|expense|recurring)\./)) return

    console.log(`[Audit] Logging financial event: ${event.type} - ${event.id}`)

    try {
      const userEmail = await getUserEmail(context.userId)

      await prisma.auditLog.create({
        data: {
          id: `audit_${event.id}`,
          teamId: context.teamId,
          userId: context.userId || 'system',
          userEmail,
          entityType: event.type.split('.')[0], // contract, receivable, expense
          entityId: AuditTrailHandlers.extractEntityId(event),
          action: event.type.split('.')[1], // created, updated, paid, etc.
          timestamp: context.timestamp,
          changes: (event.payload as any) || {},
          metadata: {
            eventId: event.id,
            eventType: event.type,
            source: event.source,
            payload: event.payload as any,
            userAgent: event.metadata?.userAgent,
            ipAddress: event.metadata?.ipAddress,
          } as any,
        },
      })

      console.log(`[Audit] Financial event logged successfully: ${event.id}`)

    } catch (error) {
      console.error(`[Audit] Failed to log financial event:`, error)

      // Emit system error for audit failure (critical)
      try {
        await AuditTrailHandlers.logAuditFailure(event, context, error as Error)
      } catch (nestedError) {
        console.error(`[Audit] Failed to log audit failure:`, nestedError)
      }
    }
  }

  /**
   * Log user authentication and authorization events
   */
  static onAuthAudit: EventHandler = async (event, context) => {
    if (!event.type.match(/^(user\.|team\.|auth\.)/)) return

    console.log(`[Audit] Logging auth event: ${event.type} - ${event.id}`)

    try {
      const userEmail = await getUserEmail(context.userId)

      await prisma.auditLog.create({
        data: {
          id: `audit_${event.id}`,
          teamId: context.teamId,
          userId: context.userId || 'system',
          userEmail,
          entityType: 'authentication',
          entityId: context.userId || 'unknown',
          action: event.type,
          timestamp: context.timestamp,
          changes: (event.payload as any) || {},
          metadata: {
            eventId: event.id,
            eventType: event.type,
            source: event.source,
            securityLevel: 'high',
            payload: {
              // Don't log sensitive auth data
              ...event.payload,
              password: undefined,
              token: undefined,
              secret: undefined,
            },
          },
        },
      })

    } catch (error) {
      console.error(`[Audit] Failed to log auth event:`, error)
    }
  }

  /**
   * Log all AI processing events for transparency
   */
  static onAIAudit: EventHandler = async (event, context) => {
    if (!event.type.match(/^(document\.|ai\.)/)) return

    console.log(`[Audit] Logging AI event: ${event.type} - ${event.id}`)

    try {
      const userEmail = await getUserEmail(context.userId)

      await prisma.auditLog.create({
        data: {
          id: `audit_${event.id}`,
          teamId: context.teamId,
          userId: context.userId || 'system',
          userEmail,
          entityType: 'ai_processing',
          entityId: event.payload?.documentId || event.id,
          action: event.type,
          timestamp: context.timestamp,
          changes: (event.payload as any) || {},
          metadata: {
            eventId: event.id,
            eventType: event.type,
            source: event.source,
            aiProcessing: true,
            confidence: event.payload?.confidence,
            processingTime: event.payload?.processingTime,
          },
        },
      })

    } catch (error) {
      console.error(`[Audit] Failed to log AI event:`, error)
    }
  }

  /**
   * Extract entity ID from event payload
   */
  private static extractEntityId(event: EventPayload): string {
    const payload = event.payload as any
    return payload?.contractId ||
           payload?.receivableId ||
           payload?.expenseId ||
           payload?.documentId ||
           payload?.entityId ||
           event.id
  }

  /**
   * Log audit failures (critical system issue)
   */
  private static async logAuditFailure(event: EventPayload, context: EventContext, error: Error): Promise<void> {
    try {
      // Use raw database insert to avoid event system recursion
      await prisma.$executeRaw`
        INSERT INTO audit_log (id, team_id, user_id, entity_type, entity_id, action, timestamp, metadata)
        VALUES (${`audit_failure_${event.id}`}, ${context.teamId}, ${context.userId}, 'system_error', ${event.id}, 'audit_failure', ${context.timestamp}, ${JSON.stringify({
          originalEventType: event.type,
          originalEventId: event.id,
          errorMessage: error.message,
          stackTrace: error.stack,
          severity: 'critical',
        })})
      `
    } catch (nestedError) {
      // Last resort: console log only
      console.error(`[Audit] CRITICAL: Complete audit failure for event ${event.id}:`, {
        originalError: error.message,
        nestedError: (nestedError as Error).message,
        eventType: event.type,
        teamId: context.teamId,
      })
    }
  }
}

/**
 * Security Monitoring Handlers
 */
class SecurityMonitoringHandlers {
  /**
   * Monitor for suspicious activity patterns
   */
  static onSecurityMonitoring: EventHandler = async (event, context) => {
    console.log(`[Security] Monitoring event: ${event.type}`)

    try {
      // Monitor for unusual patterns
      await SecurityMonitoringHandlers.checkSuspiciousPatterns(event, context)

      // Monitor for bulk operations
      if (event.type.startsWith('bulk.')) {
        await SecurityMonitoringHandlers.monitorBulkOperations(event, context)
      }

      // Monitor for high-value transactions
      if (SecurityMonitoringHandlers.isHighValueEvent(event)) {
        await SecurityMonitoringHandlers.flagHighValueTransaction(event, context)
      }

    } catch (error) {
      console.error(`[Security] Security monitoring failed:`, error)
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  private static async checkSuspiciousPatterns(event: EventPayload, context: EventContext): Promise<void> {
    // Future: Implement anomaly detection
    // - Too many events in short time period
    // - Unusual access patterns
    // - High-value transactions outside normal hours
    // - Failed authentication attempts
  }

  /**
   * Monitor bulk operations for security
   */
  private static async monitorBulkOperations(event: EventPayload, context: EventContext): Promise<void> {
    const payload = event.payload as any

    if (payload?.itemCount > 100) {
      console.log(`[Security] Large bulk operation detected: ${payload.itemCount} items`)

      // Log high-volume operation
      const userEmail = await getUserEmail(context.userId)

      await prisma.auditLog.create({
        data: {
          id: `security_${event.id}`,
          teamId: context.teamId,
          userId: context.userId || 'system',
          userEmail,
          entityType: 'security_alert',
          entityId: event.id,
          action: 'bulk_operation_alert',
          timestamp: context.timestamp,
          changes: { alertType: 'bulk_operation', itemCount: payload.itemCount },
          metadata: {
            alertType: 'high_volume_operation',
            itemCount: payload.itemCount,
            operationType: payload.operationType,
            severity: 'medium',
          },
        },
      })
    }
  }

  /**
   * Check if event involves high-value transaction
   */
  private static isHighValueEvent(event: EventPayload): boolean {
    const payload = event.payload as any
    const amount = payload?.amount || payload?.totalValue
    return typeof amount === 'number' && amount > 50000 // High-value threshold
  }

  /**
   * Flag high-value transactions for review
   */
  private static async flagHighValueTransaction(event: EventPayload, context: EventContext): Promise<void> {
    const payload = event.payload as any
    const amount = payload?.amount || payload?.totalValue

    console.log(`[Security] High-value transaction detected: $${amount}`)

    const userEmail = await getUserEmail(context.userId)

    await prisma.auditLog.create({
      data: {
        id: `security_${event.id}`,
        teamId: context.teamId,
        userId: context.userId || 'system',
        userEmail,
        entityType: 'security_alert',
        entityId: event.id,
        action: 'high_value_transaction',
        timestamp: context.timestamp,
        changes: { amount, threshold: 50000, eventType: event.type },
        metadata: {
          alertType: 'high_value_transaction',
          amount,
          threshold: 50000,
          eventType: event.type,
          severity: 'high',
        },
      },
    })
  }
}

/**
 * Performance Monitoring Handlers
 */
class PerformanceMonitoringHandlers {
  /**
   * Track system performance metrics
   */
  static onPerformanceMonitoring: EventHandler = async (event, context) => {
    try {
      // Track event processing performance
      const processingTime = Date.now() - event.timestamp.getTime()

      if (processingTime > 5000) { // Slow event processing (>5s)
        console.log(`[Performance] Slow event processing detected: ${processingTime}ms for ${event.type}`)

        const userEmail = await getUserEmail(context.userId)

        await prisma.auditLog.create({
          data: {
            id: `perf_${event.id}`,
            teamId: context.teamId,
            userId: context.userId || 'system',
            userEmail,
            entityType: 'performance_alert',
            entityId: event.id,
            action: 'slow_processing',
            timestamp: context.timestamp,
            changes: { processingTime, threshold: 5000 },
            metadata: {
              alertType: 'slow_event_processing',
              processingTime,
              threshold: 5000,
              eventType: event.type,
              severity: 'medium',
            },
          },
        })
      }

    } catch (error) {
      console.error(`[Performance] Performance monitoring failed:`, error)
    }
  }
}

/**
 * Compliance Handlers
 */
class ComplianceHandlers {
  /**
   * Ensure regulatory compliance for financial events
   */
  static onComplianceCheck: EventHandler = async (event, context) => {
    if (!event.type.match(/^(contract|receivable|expense)\.(created|updated|paid)$/)) return

    console.log(`[Compliance] Checking compliance for: ${event.type}`)

    try {
      // Future: Implement compliance checks
      // - Tax reporting requirements
      // - Financial audit trail requirements
      // - Data retention policies
      // - Privacy compliance (LGPD/GDPR)

    } catch (error) {
      console.error(`[Compliance] Compliance check failed:`, error)
    }
  }
}

/**
 * Audit Event Handlers Registry
 */
export const AuditEventHandlers = {
  /**
   * Register all audit handlers with an event bus
   */
  registerAll(eventBus: EventBus) {
    // Audit trail handlers
    eventBus.on('contract.*', AuditTrailHandlers.onFinancialAudit)
    eventBus.on('receivable.*', AuditTrailHandlers.onFinancialAudit)
    eventBus.on('expense.*', AuditTrailHandlers.onFinancialAudit)
    eventBus.on('recurring.*', AuditTrailHandlers.onFinancialAudit)

    eventBus.on('user.*', AuditTrailHandlers.onAuthAudit)
    eventBus.on('team.*', AuditTrailHandlers.onAuthAudit)

    eventBus.on('document.*', AuditTrailHandlers.onAIAudit)
    eventBus.on('ai.*', AuditTrailHandlers.onAIAudit)

    // Security monitoring
    eventBus.on('*', SecurityMonitoringHandlers.onSecurityMonitoring)

    // Performance monitoring
    eventBus.on('*', PerformanceMonitoringHandlers.onPerformanceMonitoring)

    // Compliance checks
    eventBus.on('contract.*', ComplianceHandlers.onComplianceCheck)
    eventBus.on('receivable.*', ComplianceHandlers.onComplianceCheck)
    eventBus.on('expense.*', ComplianceHandlers.onComplianceCheck)

    console.log('[Audit] All audit event handlers registered')
  },

  /**
   * Health check for audit handlers
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Verify database connectivity for audit logging
      await prisma.auditLog.findFirst({ take: 1 })
      return true
    } catch (error) {
      console.error('[Audit] Health check failed:', error)
      return false
    }
  },

  // Direct access to handler classes for testing
  AuditTrailHandlers,
  SecurityMonitoringHandlers,
  PerformanceMonitoringHandlers,
  ComplianceHandlers,
}