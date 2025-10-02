/**
 * Event System - Main Export
 *
 * Central export for the ArqCashflow Event System Foundation.
 * Provides a clean, type-safe API for event-driven architecture.
 */

// Core Event System
export {
  ArqEventBus,
  getEventBus,
  createEventBus,
  createTeamEventBus,
} from './bus'

export {
  EventTypes,
  BaseEventSchema,
  ContractEventPayload,
  ReceivableEventPayload,
  ExpenseEventPayload,
  AIEventPayload,
  SystemEventPayload,
  BulkOperationEventPayload,
  EventSchemas,
  isContractEvent,
  isReceivableEvent,
  isExpenseEvent,
  isAIEvent,
  isSystemEvent,
  isBulkEvent,
} from './types'

// Type Exports
export type {
  EventBus,
  EventPayload,
  EventHandler,
  EventType,
  EventContext,
} from './types'

// Event Handlers
export {
  BusinessEventHandlers,
  AIEventHandlers,
  AuditEventHandlers,
  registerDefaultHandlers,
  verifyHandlerHealth,
} from './handlers'

// Middleware
export {
  ValidationMiddleware,
  TeamContextMiddleware,
  createMiddlewareChain,
  createDefaultMiddlewareChain,
  createSecureMiddlewareChain,
  withMiddleware,
} from './middleware'

export type { EventMiddleware } from './middleware'

/**
 * Event System Initialization
 */
import { getEventBus } from './bus'
import { registerDefaultHandlers } from './handlers'

let isInitialized = false

/**
 * Initialize the event system
 * Call this once during application startup
 */
export function initializeEventSystem(): void {
  if (isInitialized) {
    console.log('[Events] Event system already initialized')
    return
  }

  try {
    // Get the global event bus
    const eventBus = getEventBus()

    // Register all default handlers
    registerDefaultHandlers()

    isInitialized = true
    console.log('[Events] Event system initialized successfully')

  } catch (error) {
    console.error('[Events] Failed to initialize event system:', error)
    throw new Error(`Event system initialization failed: ${error}`)
  }
}

/**
 * Check if event system is initialized
 */
export function isEventSystemInitialized(): boolean {
  return isInitialized
}

/**
 * Service Integration Utilities
 * Helper functions to integrate events with the existing service layer
 */

import { createTeamEventBus } from './bus'
import { EventTypes } from './types'

export class ServiceEventIntegration {
  /**
   * Create event emitters for service layer integration
   */
  static createServiceEventEmitter(teamId: string, userId?: string) {
    const teamEventBus = createTeamEventBus(teamId, userId)

    return {
      // Contract events
      emitContractCreated: (contractId: string, data: any) =>
        teamEventBus.emit({
          type: EventTypes.CONTRACT_CREATED,
          source: 'service',
          payload: {
            contractId,
            clientName: data.clientName,
            projectName: data.projectName,
            totalValue: data.totalValue,
            status: data.status,
          },
        }),

      emitContractUpdated: (contractId: string, data: any, previousData?: any) =>
        teamEventBus.emit({
          type: EventTypes.CONTRACT_UPDATED,
          source: 'service',
          payload: {
            contractId,
            clientName: data.clientName,
            projectName: data.projectName,
            totalValue: data.totalValue,
            status: data.status,
            previousData,
          },
        }),

      emitContractCompleted: (contractId: string, data: any) =>
        teamEventBus.emit({
          type: EventTypes.CONTRACT_COMPLETED,
          source: 'service',
          payload: {
            contractId,
            clientName: data.clientName,
            projectName: data.projectName,
            totalValue: data.totalValue,
            status: 'completed',
          },
        }),

      // Receivable events
      emitReceivableCreated: (receivableId: string, data: any) =>
        teamEventBus.emit({
          type: EventTypes.RECEIVABLE_CREATED,
          source: 'service',
          payload: {
            receivableId,
            contractId: data.contractId,
            description: data.description,
            amount: data.amount,
            dueDate: data.dueDate,
            status: data.status,
          },
        }),

      emitPaymentReceived: (receivableId: string, paymentData: any) =>
        teamEventBus.emit({
          type: EventTypes.RECEIVABLE_PAYMENT_RECEIVED,
          source: 'service',
          payload: {
            receivableId,
            contractId: paymentData.contractId,
            description: paymentData.description,
            amount: paymentData.amount,
            dueDate: paymentData.dueDate,
            status: 'paid',
            paymentAmount: paymentData.paymentAmount,
            paymentDate: paymentData.paymentDate,
          },
        }),

      emitReceivableOverdue: (receivableId: string, data: any) =>
        teamEventBus.emit({
          type: EventTypes.RECEIVABLE_OVERDUE,
          source: 'service',
          payload: {
            receivableId,
            contractId: data.contractId,
            description: data.description,
            amount: data.amount,
            dueDate: data.dueDate,
            status: 'overdue',
          },
        }),

      // Expense events
      emitExpenseCreated: (expenseId: string, data: any) =>
        teamEventBus.emit({
          type: EventTypes.EXPENSE_CREATED,
          source: 'service',
          payload: {
            expenseId,
            contractId: data.contractId,
            description: data.description,
            amount: data.amount,
            dueDate: data.dueDate,
            status: data.status,
            vendor: data.vendor,
            category: data.category,
          },
        }),

      emitExpenseApproved: (expenseId: string, data: any) =>
        teamEventBus.emit({
          type: EventTypes.EXPENSE_APPROVED,
          source: 'service',
          payload: {
            expenseId,
            contractId: data.contractId,
            description: data.description,
            amount: data.amount,
            dueDate: data.dueDate,
            status: 'paid' as const,
            vendor: data.vendor,
            category: data.category,
          },
        } as any),

      emitExpensePaid: (expenseId: string, data: any) =>
        teamEventBus.emit({
          type: EventTypes.EXPENSE_PAID,
          source: 'service',
          payload: {
            expenseId,
            contractId: data.contractId,
            description: data.description,
            amount: data.amount,
            dueDate: data.dueDate,
            status: 'paid',
            vendor: data.vendor,
            category: data.category,
          },
        }),

      // Bulk operation events
      emitBulkOperationStarted: (operationId: string, data: any) =>
        teamEventBus.emit({
          type: EventTypes.BULK_OPERATION_STARTED,
          source: 'service',
          payload: {
            operationId,
            operationType: data.operationType,
            entityType: data.entityType,
            itemCount: data.itemCount,
          },
        }),

      emitBulkOperationCompleted: (operationId: string, data: any) =>
        teamEventBus.emit({
          type: EventTypes.BULK_OPERATION_COMPLETED,
          source: 'service',
          payload: {
            operationId,
            operationType: data.operationType,
            entityType: data.entityType,
            itemCount: data.itemCount,
            successCount: data.successCount,
            errorCount: data.errorCount,
            errors: data.errors,
          },
        }),

      // AI events
      emitDocumentUploaded: (documentId: string, data: any) =>
        teamEventBus.emit({
          type: EventTypes.DOCUMENT_UPLOADED,
          source: 'service',
          payload: {
            documentId,
            fileName: data.fileName,
            fileSize: data.fileSize,
          },
        }),

      emitAIAnalysisComplete: (data: any) =>
        teamEventBus.emit({
          type: EventTypes.AI_ANALYSIS_COMPLETE,
          source: 'ai',
          payload: {
            documentId: data.documentId,
            processingTime: data.processingTime,
            analysisResult: data.analysisResult,
            confidence: data.confidence,
          },
        }),

      // System events
      emitSystemError: (error: Error, context?: any) =>
        teamEventBus.emit({
          type: EventTypes.SERVICE_ERROR,
          source: 'system',
          payload: {
            entityType: context?.entityType || 'unknown',
            entityId: context?.entityId || 'unknown',
            errorMessage: error.message,
            stackTrace: error.stack,
          },
          metadata: context,
        }),
    }
  }
}

/**
 * Event System Health Monitor
 */
export class EventSystemHealth {
  /**
   * Comprehensive health check of the event system
   */
  static async performHealthCheck(): Promise<{
    overall: boolean
    bus: boolean
    handlers: boolean
    database: boolean
    details: any
  }> {
    try {
      const [handlerHealth, busHealth] = await Promise.all([
        import('./handlers').then(h => h.verifyHandlerHealth()),
        EventSystemHealth.checkEventBusHealth(),
      ])

      const dbHealth = await EventSystemHealth.checkDatabaseHealth()

      return {
        overall: handlerHealth.overall && busHealth && dbHealth,
        bus: busHealth,
        handlers: handlerHealth.overall,
        database: dbHealth,
        details: {
          handlers: handlerHealth,
          bus: { healthy: busHealth },
          database: { healthy: dbHealth },
          initialized: isInitialized,
        },
      }
    } catch (error) {
      console.error('[Events] Health check failed:', error)
      return {
        overall: false,
        bus: false,
        handlers: false,
        database: false,
        details: { error: (error as Error).message },
      }
    }
  }

  /**
   * Check event bus health
   */
  private static async checkEventBusHealth(): Promise<boolean> {
    try {
      const eventBus = getEventBus()
      // Basic health check - verify bus instance exists and can get stats
      const stats = await eventBus.getEventStats('test-team-id')
      return true
    } catch (error) {
      console.error('Event bus health check failed:', error)
      return false
    }
  }

  /**
   * Check database connectivity for event persistence
   */
  private static async checkDatabaseHealth(): Promise<boolean> {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.event.findFirst({ take: 1 })
      return true
    } catch (error) {
      console.error('Event database health check failed:', error)
      return false
    }
  }
}

/**
 * Development and Testing Utilities
 */
export class EventSystemUtils {
  /**
   * Create a test event for development/testing
   */
  static createTestEvent(
    type: string,
    teamId: string,
    payload: any = {},
    userId?: string
  ) {
    return {
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      teamId,
      userId,
      source: 'service' as const,
      payload,
      metadata: { test: true },
    }
  }

  /**
   * Wait for event to be processed (useful for testing)
   */
  static async waitForEventProcessing(eventId: string, timeout = 5000): Promise<boolean> {
    const start = Date.now()

    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        try {
          const { prisma } = await import('@/lib/prisma')
          const event = await prisma.event.findUnique({
            where: { id: eventId },
          })

          if (event || Date.now() - start > timeout) {
            clearInterval(checkInterval)
            resolve(!!event)
          }
        } catch (error) {
          clearInterval(checkInterval)
          resolve(false)
        }
      }, 100)
    })
  }
}

// Auto-initialize in production environments
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Only auto-initialize on server-side and not during tests
  setTimeout(() => {
    try {
      initializeEventSystem()
    } catch (error) {
      console.error('[Events] Auto-initialization failed:', error)
    }
  }, 1000) // Delay to ensure database is ready
}