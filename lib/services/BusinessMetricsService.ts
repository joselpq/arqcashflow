/**
 * BusinessMetricsService - Centralized business intelligence and metrics calculation
 *
 * Provides reusable financial metrics calculations for dashboard, AI agents, and reports.
 * Extracts metric logic from inline API route calculations into a single source of truth.
 *
 * Design Principles:
 * - Single source of truth for all business metrics
 * - Reusable across dashboard, AI agents, exports
 * - Team-scoped security by default
 * - Testable business intelligence logic
 * - No caching in Phase 1 (add later if needed)
 *
 * Implementation Status:
 * - Phase 1 (CURRENT): Extract existing metrics from dashboard API
 * - Phase 2 (NEXT): Complete extraction + refactor dashboard API
 * - Phase 3 (FUTURE): Add new advanced metrics (aging, profitability, forecasting)
 */

import { ServiceContext, ServiceError } from './BaseService'
import { isDateBefore, isDateInRange } from '@/lib/date-utils'

// ===== TYPE DEFINITIONS =====

/**
 * Month-level financial metrics
 */
export interface MonthMetrics {
  thisMonthRevenue: number        // Sum of received receivables this month
  thisMonthExpenses: number        // Sum of paid expenses this month
  thisMonthProfit: number          // Revenue - Expenses for this month
  totalProfit: number              // All-time profit (total received - total paid)
  activeContracts: number          // Count of contracts with status='active'
  totalContracts: number           // Total count of all contracts
}

/**
 * Pending amounts within specified time horizon
 */
export interface PendingAmounts {
  pendingReceivables: number       // Sum of unpaid receivables (due within N days)
  pendingExpenses: number          // Sum of unpaid expenses (due within N days)
  horizon: number                  // Number of days used for calculation
}

/**
 * Overdue analysis with amounts and item details
 */
export interface OverdueAnalysis {
  overdueReceivablesAmount: number // Total overdue receivables
  overdueExpensesAmount: number    // Total overdue expenses
  overdueReceivables: number       // Count of overdue receivables
  overdueExpenses: number          // Count of overdue expenses
  overdueItems: OverdueItem[]      // List of overdue items with details
}

/**
 * Individual overdue item details
 */
export interface OverdueItem {
  type: 'receivable' | 'expense'
  id: string
  description: string
  dueDate: string
  amount: number
  entityType: 'receivable' | 'expense'
  entityId: string
  entityData?: any
}

/**
 * Cash flow health assessment
 */
export interface CashFlowHealth {
  status: 'good' | 'warning' | 'critical'
  message: string
}

/**
 * Upcoming items within specified time window
 */
export interface UpcomingItems {
  receivables: UpcomingReceivable[]
  expenses: UpcomingExpense[]
  days: number                     // Time window (e.g., 7 days)
}

export interface UpcomingReceivable {
  id: string
  client: string
  project: string
  amount: number
  expectedDate: string
  entityType: 'receivable'
  entityId: string
}

export interface UpcomingExpense {
  id: string
  description: string
  vendor: string | null
  amount: number
  dueDate: string
  entityType: 'expense'
  entityId: string
}

/**
 * Monthly trend data point
 */
export interface MonthlyTrendData {
  month: string                    // e.g., "jan 2025"
  revenue: number
  expenses: number
  profit: number
}

// ===== SERVICE CLASS =====

export class BusinessMetricsService {
  protected context: ServiceContext

  constructor(context: ServiceContext) {
    this.context = context
  }

  // ===== PHASE 1: EXISTING METRICS (Extracted from /api/dashboard/route.ts) =====

  /**
   * Get month-level financial metrics
   * Calculates revenue, expenses, profit for current month and all-time
   *
   * @returns MonthMetrics with this month and total profit figures
   */
  async getMonthMetrics(): Promise<MonthMetrics> {
    // Get current month date boundaries
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Fetch all contracts (for count)
    const contracts = await this.context.teamScopedPrisma.contract.findMany()

    // Fetch all receivables (for revenue calculations)
    const receivables = await this.context.teamScopedPrisma.receivable.findMany()

    // Fetch all expenses (for expense calculations)
    const expenses = await this.context.teamScopedPrisma.expense.findMany()

    // Calculate metrics
    const totalContracts = contracts.length
    const activeContracts = contracts.filter(c => c.status === 'active').length

    // This month's revenue (received this month)
    const thisMonthReceived = receivables
      .filter(r => r.status === 'received' && r.receivedDate &&
        isDateInRange(r.receivedDate, currentMonthStart, currentMonthEnd))
      .reduce((sum, r) => sum + (r.receivedAmount || r.amount), 0)

    // Total revenue (all-time received)
    const totalReceived = receivables
      .filter(r => r.status === 'received')
      .reduce((sum, r) => sum + (r.receivedAmount || r.amount), 0)

    // This month's expenses (paid this month)
    const thisMonthExpenses = expenses
      .filter(e => e.status === 'paid' && e.paidDate &&
        isDateInRange(e.paidDate, currentMonthStart, currentMonthEnd))
      .reduce((sum, e) => sum + (e.paidAmount || e.amount), 0)

    // Total expenses (all-time paid)
    const totalExpenses = expenses
      .filter(e => e.status === 'paid')
      .reduce((sum, e) => sum + (e.paidAmount || e.amount), 0)

    // Calculate profits
    const thisMonthProfit = thisMonthReceived - thisMonthExpenses
    const totalProfit = totalReceived - totalExpenses

    return {
      thisMonthRevenue: thisMonthReceived,
      thisMonthExpenses,
      thisMonthProfit,
      totalProfit,
      activeContracts,
      totalContracts
    }
  }

  /**
   * Get pending amounts within specified time horizon
   * Filters receivables and expenses by expected/due date within N days
   *
   * @param days - Time horizon in days (default: 90)
   * @returns PendingAmounts with sums of unpaid items within horizon
   */
  async getPendingAmounts(days: number = 90): Promise<PendingAmounts> {
    const today = new Date()
    const horizonDate = new Date()
    horizonDate.setDate(horizonDate.getDate() + days)

    // Fetch receivables and expenses
    const receivables = await this.context.teamScopedPrisma.receivable.findMany()
    const expenses = await this.context.teamScopedPrisma.expense.findMany()

    // Calculate pending amounts within horizon
    const pendingReceivables = receivables
      .filter(r => r.status === 'pending' && isDateInRange(r.expectedDate, today, horizonDate))
      .reduce((sum, r) => sum + r.amount, 0)

    const pendingExpenses = expenses
      .filter(e => e.status === 'pending' && isDateInRange(e.dueDate, today, horizonDate))
      .reduce((sum, e) => sum + e.amount, 0)

    return {
      pendingReceivables,
      pendingExpenses,
      horizon: days
    }
  }

  /**
   * Get overdue analysis with amounts, counts, and item details
   * Identifies receivables and expenses past their due date
   *
   * @returns OverdueAnalysis with totals and detailed list of overdue items
   */
  async getOverdueAnalysis(): Promise<OverdueAnalysis> {
    const today = new Date()

    // Fetch receivables and expenses
    const receivables = await this.context.teamScopedPrisma.receivable.findMany({
      include: { contract: true }
    })
    const expenses = await this.context.teamScopedPrisma.expense.findMany()

    // Filter overdue items
    const overdueReceivables = receivables.filter(r =>
      r.status === 'pending' && isDateBefore(r.expectedDate, today)
    )

    const overdueExpenses = expenses.filter(e =>
      e.status === 'pending' && isDateBefore(e.dueDate, today)
    )

    // Calculate totals
    const overdueReceivablesAmount = overdueReceivables.reduce((sum, r) => sum + r.amount, 0)
    const overdueExpensesAmount = overdueExpenses.reduce((sum, e) => sum + e.amount, 0)

    // Build overdue items list
    const overdueItems: OverdueItem[] = [
      ...overdueReceivables.map(r => ({
        type: 'receivable' as const,
        id: r.id,
        description: `Receber R$${r.amount.toLocaleString('pt-BR')} de ${r.contract?.clientName || r.clientName || 'Cliente'}`,
        dueDate: r.expectedDate,
        amount: r.amount,
        entityType: 'receivable' as const,
        entityId: r.id,
        entityData: r
      })),
      ...overdueExpenses.map(e => ({
        type: 'expense' as const,
        id: e.id,
        description: `Pagar R$${e.amount.toLocaleString('pt-BR')} - ${e.description}`,
        dueDate: e.dueDate,
        amount: e.amount,
        entityType: 'expense' as const,
        entityId: e.id,
        entityData: e
      }))
    ]

    return {
      overdueReceivablesAmount,
      overdueExpensesAmount,
      overdueReceivables: overdueReceivables.length,
      overdueExpenses: overdueExpenses.length,
      overdueItems
    }
  }

  // ===== PHASE 2: REMAINING EXISTING METRICS (To be implemented next session) =====

  /**
   * TODO (Phase 2): Extract getCashFlowHealth()
   * Assess overall cash flow status based on overdue items and monthly profit
   */
  // async getCashFlowHealth(): Promise<CashFlowHealth>

  /**
   * TODO (Phase 2): Extract getUpcomingItems()
   * Get receivables and expenses due within next N days (default: 7)
   */
  // async getUpcomingItems(days: number = 7): Promise<UpcomingItems>

  /**
   * TODO (Phase 2): Extract getMonthlyTrend()
   * Get last N months of revenue/expenses/profit trend data
   */
  // async getMonthlyTrend(months: number = 6): Promise<MonthlyTrendData[]>

  // ===== PHASE 3: NEW ADVANCED METRICS (Future implementation) =====

  /**
   * TODO (Phase 3): Implement calculateCashFlowForecast()
   * Project cash flow for next 30/60/90 days with gap identification
   */
  // async calculateCashFlowForecast(days: 30 | 60 | 90): Promise<CashFlowForecast>

  /**
   * TODO (Phase 3): Implement getReceivablesAging()
   * Aging buckets (0-30, 31-60, 61-90, 90+) with DSO calculation
   */
  // async getReceivablesAging(): Promise<ReceivablesAging>

  /**
   * TODO (Phase 3): Implement getProjectProfitability()
   * Revenue vs expenses per contract with profit margin %
   */
  // async getProjectProfitability(contractId?: string): Promise<ProjectProfitability[]>

  /**
   * TODO (Phase 3): Implement getExpenseBreakdown()
   * Total by category with percentage breakdown
   */
  // async getExpenseBreakdown(period: 'month' | 'quarter' | 'year'): Promise<ExpenseBreakdown>

  /**
   * TODO (Phase 3): Implement getClientRevenueRanking()
   * Top clients by revenue with concentration risk assessment
   */
  // async getClientRevenueRanking(limit: number = 10): Promise<ClientRevenue[]>
}
