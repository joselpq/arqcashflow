import { NextRequest, NextResponse } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { BusinessMetricsService } from '@/lib/services/BusinessMetricsService'

export async function GET(request: NextRequest) {
  return withTeamContext(async (context) => {
    console.log('🔍 Dashboard API: Starting data fetch')
    console.log('✅ Dashboard API: Auth successful, teamId:', context.teamId)

    // Initialize BusinessMetricsService
    const metricsService = new BusinessMetricsService(context)

    console.log('📊 Dashboard API: Fetching metrics via BusinessMetricsService...')

    // Fetch all metrics using service methods
    const [monthMetrics, pendingAmounts, overdueAnalysis, cashFlowHealth, upcomingItems, monthlyTrend] =
      await Promise.all([
        metricsService.getMonthMetrics(),
        metricsService.getPendingAmounts(90),
        metricsService.getOverdueAnalysis(),
        metricsService.getCashFlowHealth(),
        metricsService.getUpcomingItems(7),
        metricsService.getMonthlyTrend(6)
      ])

    // Get counts for expense reinforcement banner
    const [expenseCount, allReceivables] = await Promise.all([
      context.teamScopedPrisma.expense.count(),
      context.teamScopedPrisma.receivable.findMany({
        select: { amount: true }
      })
    ])

    // Calculate total receivables amount manually
    const totalReceivablesAmount = allReceivables.reduce((sum, r) => sum + r.amount, 0)

    console.log('✅ Dashboard API: All metrics fetched successfully')

    // Build dashboard response using service results
    const dashboardData = {
      // Key metrics
      metrics: {
        thisMonthRevenue: monthMetrics.thisMonthRevenue,
        thisMonthExpenses: monthMetrics.thisMonthExpenses,
        thisMonthProfit: monthMetrics.thisMonthProfit,
        totalProfit: monthMetrics.totalProfit,
        pendingReceivables: pendingAmounts.pendingReceivables,
        pendingExpenses: pendingAmounts.pendingExpenses,
        activeContracts: monthMetrics.activeContracts,
        totalContracts: monthMetrics.totalContracts,
        overdueReceivablesAmount: overdueAnalysis.overdueReceivablesAmount,
        overdueExpensesAmount: overdueAnalysis.overdueExpensesAmount,
        totalExpenses: expenseCount,
        totalReceivablesAmount: totalReceivablesAmount
      },

      // Health status
      cashFlowHealth: {
        status: cashFlowHealth.status,
        message: cashFlowHealth.message
      },

      // Critical alerts
      alerts: {
        overdueReceivables: overdueAnalysis.overdueReceivables,
        overdueExpenses: overdueAnalysis.overdueExpenses,
        overdueItems: overdueAnalysis.overdueItems
      },

      // Upcoming items
      upcoming: {
        receivables: upcomingItems.receivables,
        expenses: upcomingItems.expenses
      },

      // Chart data
      monthlyTrend: monthlyTrend
    }

    console.log('🎉 Dashboard API: Data processing complete')
    return dashboardData
  })
}