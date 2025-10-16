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
import { isDateBefore, isDateInRange } from '@/lib/utils/date'

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

  // ===== PHASE 2: REMAINING EXISTING METRICS =====

  /**
   * Assess overall cash flow health status
   * Analyzes overdue items and monthly profit to determine health status
   *
   * Logic:
   * - CRITICAL: Any overdue receivables or expenses
   * - WARNING: Negative profit this month OR more pending expenses than receivables
   * - GOOD: Otherwise
   *
   * @returns CashFlowHealth with status and localized message
   */
  async getCashFlowHealth(): Promise<CashFlowHealth> {
    // Get overdue analysis
    const overdueAnalysis = await this.getOverdueAnalysis()

    // Get month metrics for profit check
    const monthMetrics = await this.getMonthMetrics()

    // Get pending amounts for balance check
    const pendingAmounts = await this.getPendingAmounts(90)

    // Determine health status
    let status: 'good' | 'warning' | 'critical' = 'good'
    let message = 'Fluxo de caixa saudável'

    if (overdueAnalysis.overdueReceivables > 0 || overdueAnalysis.overdueExpenses > 0) {
      status = 'critical'
      const totalOverdue = overdueAnalysis.overdueReceivables + overdueAnalysis.overdueExpenses
      message = `${totalOverdue} itens em atraso precisam de atenção`
    } else if (monthMetrics.thisMonthProfit < 0) {
      status = 'warning'
      message = 'Despesas superiores à receita este mês'
    } else if (pendingAmounts.pendingExpenses > pendingAmounts.pendingReceivables) {
      status = 'warning'
      message = 'Mais dinheiro a pagar do que a receber'
    }

    return { status, message }
  }

  /**
   * Get upcoming receivables and expenses within next N days
   * Returns sorted lists (earliest first) limited to top 5 of each
   *
   * @param days - Time window in days (default: 7)
   * @returns UpcomingItems with receivables and expenses lists
   */
  async getUpcomingItems(days: number = 7): Promise<UpcomingItems> {
    const today = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)

    // Fetch receivables and expenses with contract relations
    const receivables = await this.context.teamScopedPrisma.receivable.findMany({
      include: { contract: true }
    })
    const expenses = await this.context.teamScopedPrisma.expense.findMany()

    // Filter upcoming receivables (not overdue, within time window)
    const upcomingReceivables = receivables
      .filter(r =>
        r.status === 'pending' &&
        !isDateBefore(r.expectedDate, today) &&
        isDateInRange(r.expectedDate, today, endDate)
      )
      .sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime())
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        client: r.contract?.clientName || r.clientName || 'Cliente',
        project: r.contract?.projectName || r.description || 'Recebível',
        amount: r.amount,
        expectedDate: r.expectedDate.toISOString(),
        entityType: 'receivable' as const,
        entityId: r.id
      }))

    // Filter upcoming expenses (not overdue, within time window)
    const upcomingExpenses = expenses
      .filter(e =>
        e.status === 'pending' &&
        !isDateBefore(e.dueDate, today) &&
        isDateInRange(e.dueDate, today, endDate)
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        description: e.description,
        vendor: e.vendor,
        amount: e.amount,
        dueDate: e.dueDate.toISOString(),
        entityType: 'expense' as const,
        entityId: e.id
      }))

    return {
      receivables: upcomingReceivables,
      expenses: upcomingExpenses,
      days
    }
  }

  /**
   * Get monthly trend data for last N months
   * Calculates revenue, expenses, and profit for each month
   *
   * @param months - Number of months to include (default: 6)
   * @returns Array of MonthlyTrendData ordered from oldest to newest
   */
  async getMonthlyTrend(months: number = 6): Promise<MonthlyTrendData[]> {
    const now = new Date()

    // Fetch all receivables and expenses
    const receivables = await this.context.teamScopedPrisma.receivable.findMany()
    const expenses = await this.context.teamScopedPrisma.expense.findMany()

    // Build monthly data array
    const monthlyData: MonthlyTrendData[] = []

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59)

      // Calculate revenue for this month (received in this month)
      const monthRevenue = receivables
        .filter(r => r.status === 'received' && r.receivedDate &&
          isDateInRange(r.receivedDate, monthStart, monthEnd))
        .reduce((sum, r) => sum + (r.receivedAmount || r.amount), 0)

      // Calculate expenses for this month (paid in this month)
      const monthExpenses = expenses
        .filter(e => e.status === 'paid' && e.paidDate &&
          isDateInRange(e.paidDate, monthStart, monthEnd))
        .reduce((sum, e) => sum + (e.paidAmount || e.amount), 0)

      monthlyData.push({
        month: monthDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses
      })
    }

    return monthlyData
  }

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
