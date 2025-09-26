/**
 * Business Logic Event Handlers
 *
 * Handles business-specific events like automated workflows,
 * validation, notifications, and cross-entity relationships.
 */

import type { EventBus, EventPayload, EventHandler, EventContext } from '../types'
import { EventTypes, isContractEvent, isReceivableEvent, isExpenseEvent } from '../types'
import { prisma } from '@/lib/prisma'

/**
 * Contract Event Handlers
 */
class ContractHandlers {
  /**
   * When contract is created, generate initial receivables if applicable
   */
  static onContractCreated: EventHandler = async (event, context) => {
    if (!isContractEvent(event) || event.type !== EventTypes.CONTRACT_CREATED) return

    console.log(`[Business] Processing contract creation: ${event.payload.contractId}`)

    try {
      // If contract has installments, this could trigger receivable generation
      // For now, we log the business event for future automation
      console.log(`[Business] Contract created - Client: ${event.payload.clientName}, Value: ${event.payload.totalValue}`)

      // Future: Automatically create receivables based on contract terms
      // Future: Send welcome email to client
      // Future: Create project folder structure

    } catch (error) {
      console.error(`[Business] Failed to process contract creation:`, error)
    }
  }

  /**
   * When contract is completed, trigger final reconciliation
   */
  static onContractCompleted: EventHandler = async (event, context) => {
    if (!isContractEvent(event) || event.type !== EventTypes.CONTRACT_COMPLETED) return

    console.log(`[Business] Processing contract completion: ${event.payload.contractId}`)

    try {
      // Future: Verify all receivables are paid
      // Future: Generate project completion report
      // Future: Archive project documents

    } catch (error) {
      console.error(`[Business] Failed to process contract completion:`, error)
    }
  }
}

/**
 * Receivable Event Handlers
 */
class ReceivableHandlers {
  /**
   * When payment is received, update related contract status
   */
  static onPaymentReceived: EventHandler = async (event, context) => {
    if (!isReceivableEvent(event) || event.type !== EventTypes.RECEIVABLE_PAYMENT_RECEIVED) return

    console.log(`[Business] Processing payment received: ${event.payload.receivableId}`)

    try {
      // Future: Check if all receivables for contract are paid
      // Future: Update contract status to "paid" if applicable
      // Future: Send payment confirmation

    } catch (error) {
      console.error(`[Business] Failed to process payment received:`, error)
    }
  }

  /**
   * When receivable becomes overdue, trigger notifications
   */
  static onReceivableOverdue: EventHandler = async (event, context) => {
    if (!isReceivableEvent(event) || event.type !== EventTypes.RECEIVABLE_OVERDUE) return

    console.log(`[Business] Processing overdue receivable: ${event.payload.receivableId}`)

    try {
      // Future: Send overdue notification
      // Future: Escalate to collections process
      // Future: Update contract health score

    } catch (error) {
      console.error(`[Business] Failed to process overdue receivable:`, error)
    }
  }
}

/**
 * Expense Event Handlers
 */
class ExpenseHandlers {
  /**
   * When expense is created, validate against budget
   */
  static onExpenseCreated: EventHandler = async (event, context) => {
    if (!isExpenseEvent(event) || event.type !== EventTypes.EXPENSE_CREATED) return

    console.log(`[Business] Processing expense creation: ${event.payload.expenseId}`)

    try {
      // Future: Check budget availability
      // Future: Require approval if over threshold
      // Future: Update contract profit margins

    } catch (error) {
      console.error(`[Business] Failed to process expense creation:`, error)
    }
  }

  /**
   * When expense is approved, trigger payment workflow
   */
  static onExpenseApproved: EventHandler = async (event, context) => {
    if (!isExpenseEvent(event) || event.type !== EventTypes.EXPENSE_APPROVED) return

    console.log(`[Business] Processing expense approval: ${event.payload.expenseId}`)

    try {
      // Future: Add to payment queue
      // Future: Generate payment authorization
      // Future: Notify vendor of approval

    } catch (error) {
      console.error(`[Business] Failed to process expense approval:`, error)
    }
  }
}

/**
 * Cross-Entity Business Logic Handlers
 */
class BusinessWorkflowHandlers {
  /**
   * Monitor all financial events for health scoring
   */
  static onAnyFinancialEvent: EventHandler = async (event, context) => {
    if (!event.type.match(/^(contract|receivable|expense)\./)) return

    console.log(`[Business] Updating health metrics for team: ${context.teamId}`)

    try {
      // Future: Update team financial health metrics
      // Future: Trigger alerts if thresholds exceeded
      // Future: Generate automated insights

    } catch (error) {
      console.error(`[Business] Failed to update health metrics:`, error)
    }
  }

  /**
   * Detect potential cash flow issues
   */
  static onCashFlowAnalysis: EventHandler = async (event, context) => {
    // Trigger on receivable overdue or large expense approval
    if (!(
      (isReceivableEvent(event) && event.type === EventTypes.RECEIVABLE_OVERDUE) ||
      (isExpenseEvent(event) && event.type === EventTypes.EXPENSE_APPROVED && event.payload.amount > 10000)
    )) return

    console.log(`[Business] Analyzing cash flow impact for team: ${context.teamId}`)

    try {
      // Future: Calculate projected cash flow
      // Future: Identify potential shortfalls
      // Future: Suggest mitigation strategies

    } catch (error) {
      console.error(`[Business] Failed to analyze cash flow:`, error)
    }
  }
}

/**
 * Business Event Handlers Registry
 */
export const BusinessEventHandlers = {
  /**
   * Register all business handlers with an event bus
   */
  registerAll(eventBus: EventBus) {
    // Contract handlers
    eventBus.on(EventTypes.CONTRACT_CREATED, ContractHandlers.onContractCreated)
    eventBus.on(EventTypes.CONTRACT_COMPLETED, ContractHandlers.onContractCompleted)

    // Receivable handlers
    eventBus.on(EventTypes.RECEIVABLE_PAYMENT_RECEIVED, ReceivableHandlers.onPaymentReceived)
    eventBus.on(EventTypes.RECEIVABLE_OVERDUE, ReceivableHandlers.onReceivableOverdue)

    // Expense handlers
    eventBus.on(EventTypes.EXPENSE_CREATED, ExpenseHandlers.onExpenseCreated)
    eventBus.on(EventTypes.EXPENSE_APPROVED, ExpenseHandlers.onExpenseApproved)

    // Cross-entity workflow handlers
    eventBus.on('*', BusinessWorkflowHandlers.onAnyFinancialEvent)
    eventBus.on(EventTypes.RECEIVABLE_OVERDUE, BusinessWorkflowHandlers.onCashFlowAnalysis)
    eventBus.on(EventTypes.EXPENSE_APPROVED, BusinessWorkflowHandlers.onCashFlowAnalysis)

    console.log('[Business] All business event handlers registered')
  },

  /**
   * Health check for business handlers
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Verify database connectivity and required tables
      await prisma.contract.findFirst({ take: 1 })
      await prisma.receivable.findFirst({ take: 1 })
      await prisma.expense.findFirst({ take: 1 })

      return true
    } catch (error) {
      console.error('[Business] Health check failed:', error)
      return false
    }
  },

  // Direct access to handler classes for testing
  ContractHandlers,
  ReceivableHandlers,
  ExpenseHandlers,
  BusinessWorkflowHandlers,
}