import { NextRequest, NextResponse } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { isDateBefore, isDateInRange } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  return withTeamContext(async ({ teamScopedPrisma, teamId }) => {
    console.log('🔍 Dashboard API: Starting data fetch')
    console.log('✅ Dashboard API: Auth successful, teamId:', teamId)

    // Get current month dates
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const today = new Date()

    console.log('📊 Dashboard API: Fetching contracts...')
    // Get contracts data - teamId automatically filtered
    const contracts = await teamScopedPrisma.contract.findMany({
      include: { receivables: true }
    })
    console.log('✅ Dashboard API: Contracts fetched:', contracts.length)

    console.log('💰 Dashboard API: Fetching receivables...')
    // Get receivables data - teamId automatically filtered
    const receivables = await teamScopedPrisma.receivable.findMany({
      include: { contract: true }
    })
    console.log('✅ Dashboard API: Receivables fetched:', receivables.length)

    console.log('💸 Dashboard API: Fetching expenses...')
    // Get expenses data - teamId automatically filtered
    const expenses = await teamScopedPrisma.expense.findMany({
      include: { contract: true }
    })
    console.log('✅ Dashboard API: Expenses fetched:', expenses.length)

    // Calculate key metrics
    const totalContracts = contracts.length
    const activeContracts = contracts.filter(c => c.status === 'active').length

    // Revenue calculations (actual received money)
    const thisMonthReceived = receivables
      .filter(r => r.status === 'received' && r.receivedDate &&
        isDateInRange(r.receivedDate, currentMonthStart, currentMonthEnd))
      .reduce((sum, r) => sum + (r.receivedAmount || r.amount), 0)

    const totalReceived = receivables
      .filter(r => r.status === 'received')
      .reduce((sum, r) => sum + (r.receivedAmount || r.amount), 0)

    // Expense calculations (actual paid money)
    const thisMonthExpenses = expenses
      .filter(e => e.status === 'paid' && e.paidDate &&
        isDateInRange(e.paidDate, currentMonthStart, currentMonthEnd))
      .reduce((sum, e) => sum + (e.paidAmount || e.amount), 0)

    const totalExpenses = expenses
      .filter(e => e.status === 'paid')
      .reduce((sum, e) => sum + (e.paidAmount || e.amount), 0)

    // Profit calculations
    const thisMonthProfit = thisMonthReceived - thisMonthExpenses
    const totalProfit = totalReceived - totalExpenses

    // Outstanding amounts
    const pendingReceivables = receivables
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0)

    const pendingExpenses = expenses
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0)

    // Overdue items (critical alerts)
    const overdueReceivables = receivables.filter(r =>
      r.status === 'pending' && isDateBefore(r.expectedDate, today)
    )

    const overdueExpenses = expenses.filter(e =>
      e.status === 'pending' && isDateBefore(e.dueDate, today)
    )

    // Upcoming items (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    const upcomingReceivables = receivables.filter(r =>
      r.status === 'pending' &&
      !isDateBefore(r.expectedDate, today) &&
      isDateInRange(r.expectedDate, today, nextWeek)
    ).sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime())

    const upcomingExpenses = expenses.filter(e =>
      e.status === 'pending' &&
      !isDateBefore(e.dueDate, today) &&
      isDateInRange(e.dueDate, today, nextWeek)
    ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    // Cash flow health assessment
    let cashFlowHealth = 'good'
    let healthMessage = 'Fluxo de caixa saudável'

    if (overdueReceivables.length > 0 || overdueExpenses.length > 0) {
      cashFlowHealth = 'critical'
      healthMessage = `${overdueReceivables.length + overdueExpenses.length} itens em atraso precisam de atenção`
    } else if (thisMonthProfit < 0) {
      cashFlowHealth = 'warning'
      healthMessage = 'Despesas superiores à receita este mês'
    } else if (pendingExpenses > pendingReceivables) {
      cashFlowHealth = 'warning'
      healthMessage = 'Mais dinheiro a pagar do que a receber'
    }

    // Monthly trend data for last 6 months
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59)

      const monthReceived = receivables
        .filter(r => r.status === 'received' && r.receivedDate &&
          isDateInRange(r.receivedDate, monthStart, monthEnd))
        .reduce((sum, r) => sum + (r.receivedAmount || r.amount), 0)

      const monthExpenses = expenses
        .filter(e => e.status === 'paid' && e.paidDate &&
          isDateInRange(e.paidDate, monthStart, monthEnd))
        .reduce((sum, e) => sum + (e.paidAmount || e.amount), 0)

      monthlyData.push({
        month: monthDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        revenue: monthReceived,
        expenses: monthExpenses,
        profit: monthReceived - monthExpenses
      })
    }

    const dashboardData = {
      // Key metrics
      metrics: {
        thisMonthRevenue: thisMonthReceived,
        thisMonthExpenses: thisMonthExpenses,
        thisMonthProfit: thisMonthProfit,
        totalProfit: totalProfit,
        pendingReceivables: pendingReceivables,
        pendingExpenses: pendingExpenses,
        activeContracts: activeContracts,
        totalContracts: totalContracts
      },

      // Health status
      cashFlowHealth: {
        status: cashFlowHealth,
        message: healthMessage
      },

      // Critical alerts
      alerts: {
        overdueReceivables: overdueReceivables.length,
        overdueExpenses: overdueExpenses.length,
        overdueItems: [...overdueReceivables.map(r => ({
          type: 'receivable' as const,
          id: r.id,
          description: `Receber R$${r.amount.toLocaleString('pt-BR')} de ${r.contract?.clientName || r.clientName || 'Cliente'}`,
          dueDate: r.expectedDate,
          amount: r.amount,
          entityType: 'receivable' as const,
          entityId: r.id,
          entityData: r
        })), ...overdueExpenses.map(e => ({
          type: 'expense' as const,
          id: e.id,
          description: `Pagar R$${e.amount.toLocaleString('pt-BR')} - ${e.description}`,
          dueDate: e.dueDate,
          amount: e.amount,
          entityType: 'expense' as const,
          entityId: e.id,
          entityData: e
        }))]
      },

      // Upcoming items
      upcoming: {
        receivables: upcomingReceivables.slice(0, 5).map(r => ({
          id: r.id,
          client: r.contract?.clientName || r.clientName || 'Cliente',
          project: r.contract?.projectName || r.description || 'Recebível',
          amount: r.amount,
          expectedDate: r.expectedDate,
          entityType: 'receivable' as const,
          entityId: r.id
        })),
        expenses: upcomingExpenses.slice(0, 5).map(e => ({
          id: e.id,
          description: e.description,
          vendor: e.vendor,
          amount: e.amount,
          dueDate: e.dueDate,
          entityType: 'expense' as const,
          entityId: e.id
        }))
      },

      // Chart data
      monthlyTrend: monthlyData
    }

    console.log('🎉 Dashboard API: Data processing complete')
    return dashboardData
  })
}