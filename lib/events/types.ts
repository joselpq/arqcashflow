/**
 * Event System Types
 *
 * Defines all event types, payloads, and schemas for the ArqCashflow event system.
 * Uses unified validation layer for type safety and team context for security.
 */

import { z } from 'zod'
import { BaseFieldSchemas, EnumSchemas } from '@/lib/validation'

/**
 * Base Event Schema
 * All events must extend this base structure
 */
export const BaseEventSchema = z.object({
  id: BaseFieldSchemas.id,
  type: z.string().min(1),
  timestamp: z.date(),
  teamId: BaseFieldSchemas.teamId,
  userId: BaseFieldSchemas.userId.optional(),
  source: z.enum(['api', 'service', 'ui', 'ai', 'system']),
  metadata: z.record(z.unknown()).optional(),
})

/**
 * Event Types Enumeration
 * Centralized definition of all possible event types
 */
export const EventTypes = {
  // Contract Events
  CONTRACT_CREATED: 'contract.created',
  CONTRACT_UPDATED: 'contract.updated',
  CONTRACT_COMPLETED: 'contract.completed',
  CONTRACT_CANCELLED: 'contract.cancelled',

  // Receivable Events
  RECEIVABLE_CREATED: 'receivable.created',
  RECEIVABLE_UPDATED: 'receivable.updated',
  RECEIVABLE_PAYMENT_RECEIVED: 'receivable.payment_received',
  RECEIVABLE_OVERDUE: 'receivable.overdue',
  RECEIVABLE_CANCELLED: 'receivable.cancelled',

  // Expense Events
  EXPENSE_CREATED: 'expense.created',
  EXPENSE_UPDATED: 'expense.updated',
  EXPENSE_APPROVED: 'expense.approved',
  EXPENSE_PAID: 'expense.paid',
  EXPENSE_CANCELLED: 'expense.cancelled',

  // Recurring Expense Events
  RECURRING_CREATED: 'recurring.created',
  RECURRING_UPDATED: 'recurring.updated',
  RECURRING_GENERATED: 'recurring.generated',
  RECURRING_CANCELLED: 'recurring.cancelled',

  // AI Processing Events
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_PROCESSED: 'document.processed',
  AI_ANALYSIS_COMPLETE: 'ai.analysis_complete',
  AI_SUGGESTION_GENERATED: 'ai.suggestion_generated',
  AI_WORKFLOW_TRIGGERED: 'ai.workflow_triggered',

  // System Events
  USER_ONBOARDED: 'user.onboarded',
  TEAM_CREATED: 'team.created',
  AUDIT_LOGGED: 'audit.logged',
  VALIDATION_FAILED: 'validation.failed',
  SERVICE_ERROR: 'service.error',
  INTEGRATION_CONNECTED: 'integration.connected',

  // Batch Operation Events
  BULK_OPERATION_STARTED: 'bulk.operation_started',
  BULK_OPERATION_COMPLETED: 'bulk.operation_completed',
  BULK_OPERATION_FAILED: 'bulk.operation_failed',
} as const

export type EventType = typeof EventTypes[keyof typeof EventTypes]

/**
 * Financial Entity Event Payloads
 * Specific payload structures for business operations
 */

// Contract Events
export const ContractEventPayload = BaseEventSchema.extend({
  type: z.enum([
    EventTypes.CONTRACT_CREATED,
    EventTypes.CONTRACT_UPDATED,
    EventTypes.CONTRACT_COMPLETED,
    EventTypes.CONTRACT_CANCELLED,
  ]),
  payload: z.object({
    contractId: z.string(),
    clientName: z.string(),
    projectName: z.string(),
    totalValue: BaseFieldSchemas.amount,
    status: EnumSchemas.contractStatus,
    previousData: z.record(z.unknown()).optional(), // For update events
  }),
})

// Receivable Events
export const ReceivableEventPayload = BaseEventSchema.extend({
  type: z.enum([
    EventTypes.RECEIVABLE_CREATED,
    EventTypes.RECEIVABLE_UPDATED,
    EventTypes.RECEIVABLE_PAYMENT_RECEIVED,
    EventTypes.RECEIVABLE_OVERDUE,
    EventTypes.RECEIVABLE_CANCELLED,
  ]),
  payload: z.object({
    receivableId: z.string(),
    contractId: z.string().optional(),
    description: z.string(),
    amount: BaseFieldSchemas.amount,
    dueDate: BaseFieldSchemas.dateString,
    status: EnumSchemas.paymentStatus,
    paymentAmount: BaseFieldSchemas.amount.optional(),
    paymentDate: BaseFieldSchemas.dateString.optional(),
    previousData: z.record(z.unknown()).optional(),
  }),
})

// Expense Events
export const ExpenseEventPayload = BaseEventSchema.extend({
  type: z.enum([
    EventTypes.EXPENSE_CREATED,
    EventTypes.EXPENSE_UPDATED,
    EventTypes.EXPENSE_APPROVED,
    EventTypes.EXPENSE_PAID,
    EventTypes.EXPENSE_CANCELLED,
  ]),
  payload: z.object({
    expenseId: z.string(),
    contractId: z.string().optional(),
    description: z.string(),
    amount: BaseFieldSchemas.amount,
    dueDate: BaseFieldSchemas.dateString,
    status: EnumSchemas.paymentStatus,
    vendor: z.string().optional(),
    category: z.string().optional(),
    previousData: z.record(z.unknown()).optional(),
  }),
})

// AI Processing Events
export const AIEventPayload = BaseEventSchema.extend({
  type: z.enum([
    EventTypes.DOCUMENT_UPLOADED,
    EventTypes.DOCUMENT_PROCESSED,
    EventTypes.AI_ANALYSIS_COMPLETE,
    EventTypes.AI_SUGGESTION_GENERATED,
    EventTypes.AI_WORKFLOW_TRIGGERED,
  ]),
  payload: z.object({
    documentId: z.string().optional(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    processingTime: z.number().optional(),
    suggestions: z.array(z.record(z.unknown())).optional(),
    analysisResult: z.record(z.unknown()).optional(),
    confidence: z.number().min(0).max(1).optional(),
  }),
})

// System Events
export const SystemEventPayload = BaseEventSchema.extend({
  type: z.enum([
    EventTypes.USER_ONBOARDED,
    EventTypes.TEAM_CREATED,
    EventTypes.AUDIT_LOGGED,
    EventTypes.VALIDATION_FAILED,
    EventTypes.SERVICE_ERROR,
    EventTypes.INTEGRATION_CONNECTED,
  ]),
  payload: z.object({
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    errorMessage: z.string().optional(),
    stackTrace: z.string().optional(),
    integration: z.string().optional(),
    auditData: z.record(z.unknown()).optional(),
  }),
})

// Bulk Operation Events
export const BulkOperationEventPayload = BaseEventSchema.extend({
  type: z.enum([
    EventTypes.BULK_OPERATION_STARTED,
    EventTypes.BULK_OPERATION_COMPLETED,
    EventTypes.BULK_OPERATION_FAILED,
  ]),
  payload: z.object({
    operationId: z.string(),
    operationType: z.enum(['create', 'update', 'delete']),
    entityType: z.enum(['contract', 'receivable', 'expense', 'recurring']),
    itemCount: z.number().min(0),
    successCount: z.number().min(0).optional(),
    errorCount: z.number().min(0).optional(),
    errors: z.array(z.string()).optional(),
  }),
})

/**
 * Union of all event payload types
 */
export type EventPayload =
  | z.infer<typeof ContractEventPayload>
  | z.infer<typeof ReceivableEventPayload>
  | z.infer<typeof ExpenseEventPayload>
  | z.infer<typeof AIEventPayload>
  | z.infer<typeof SystemEventPayload>
  | z.infer<typeof BulkOperationEventPayload>

/**
 * Event Handler Function Type
 * All event handlers must conform to this signature
 */
export type EventHandler<T extends EventPayload = EventPayload> = (
  event: T,
  context: EventContext
) => Promise<void>

/**
 * Event Bus Interface
 * Defines the contract for event emission and subscription
 */
export interface EventBus {
  // Event emission
  emit<T extends EventPayload>(event: T): Promise<void>

  // Event subscription
  on<T extends EventPayload>(eventType: EventType, handler: EventHandler<T>): void
  on<T extends EventPayload>(eventPattern: string, handler: EventHandler<T>): void // For wildcard patterns like 'contract.*'

  // Event unsubscription
  off(eventType: EventType, handler: EventHandler): void
  off(eventPattern: string, handler: EventHandler): void

  // Utility methods
  once<T extends EventPayload>(eventType: EventType, handler: EventHandler<T>): void
  removeAllListeners(eventType?: EventType): void

  // Event persistence (for reliability)
  getEventHistory(teamId: string, options?: {
    eventType?: EventType
    limit?: number
    since?: Date
  }): Promise<EventPayload[]>
}

/**
 * Event Context Interface
 * Provides team isolation and user context for event operations
 */
export interface EventContext {
  teamId: string
  userId?: string
  timestamp: Date
  source: 'api' | 'service' | 'ui' | 'ai' | 'system'
  metadata?: Record<string, unknown>
}

/**
 * Event Validation Schemas
 * For runtime validation of event payloads
 */
export const EventSchemas = {
  contract: ContractEventPayload,
  receivable: ReceivableEventPayload,
  expense: ExpenseEventPayload,
  ai: AIEventPayload,
  system: SystemEventPayload,
  bulk: BulkOperationEventPayload,
  base: BaseEventSchema,
} as const

/**
 * Event Type Guards
 * Helper functions to determine event types at runtime
 */
export const isContractEvent = (event: EventPayload): event is z.infer<typeof ContractEventPayload> => {
  return event.type.startsWith('contract.')
}

export const isReceivableEvent = (event: EventPayload): event is z.infer<typeof ReceivableEventPayload> => {
  return event.type.startsWith('receivable.')
}

export const isExpenseEvent = (event: EventPayload): event is z.infer<typeof ExpenseEventPayload> => {
  return event.type.startsWith('expense.')
}

export const isAIEvent = (event: EventPayload): event is z.infer<typeof AIEventPayload> => {
  return event.type.startsWith('document.') || event.type.startsWith('ai.')
}

export const isSystemEvent = (event: EventPayload): event is z.infer<typeof SystemEventPayload> => {
  return ['user.', 'team.', 'audit.', 'validation.', 'service.', 'integration.'].some(prefix =>
    event.type.startsWith(prefix)
  )
}

export const isBulkEvent = (event: EventPayload): event is z.infer<typeof BulkOperationEventPayload> => {
  return event.type.startsWith('bulk.')
}