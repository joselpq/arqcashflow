import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const { teamId } = await requireAuth()

    // Get current month dates
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const today = new Date()

    // Get contracts data
    const contracts = await prisma.contract.findMany({
      where: { teamId },
      include: { receivables: true }
    })

    // Get receivables data
    const receivables = await prisma.receivable.findMany({
      where: {
        contract: { teamId }
      },
      include: { contract: true }
    })

    // Get expenses data
    const expenses = await prisma.expense.findMany({
      where: { teamId },
      include: { contract: true }
    })

    // Calculate key metrics
    const totalContracts = contracts.length
    const activeContracts = contracts.filter(c => c.status === 'active').length

    // Revenue calculations (actual received money)
    const thisMonthReceived = receivables
      .filter(r => r.status === 'received' && r.receivedDate &&
        new Date(r.receivedDate) >= currentMonthStart &&
        new Date(r.receivedDate) <= currentMonthEnd)
      .reduce((sum, r) => sum + (r.receivedAmount || r.amount), 0)

    const totalReceived = receivables
      .filter(r => r.status === 'received')
      .reduce((sum, r) => sum + (r.receivedAmount || r.amount), 0)

    // Expense calculations (actual paid money)
    const thisMonthExpenses = expenses
      .filter(e => e.status === 'paid' && e.paidDate &&
        new Date(e.paidDate) >= currentMonthStart &&
        new Date(e.paidDate) <= currentMonthEnd)
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
      r.status === 'pending' && new Date(r.expectedDate) < today
    )

    const overdueExpenses = expenses.filter(e =>
      e.status === 'pending' && new Date(e.dueDate) < today
    )

    // Upcoming items (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)

    const upcomingReceivables = receivables.filter(r =>
      r.status === 'pending' &&
      new Date(r.expectedDate) >= today &&
      new Date(r.expectedDate) <= nextWeek
    ).sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime())

    const upcomingExpenses = expenses.filter(e =>
      e.status === 'pending' &&
      new Date(e.dueDate) >= today &&
      new Date(e.dueDate) <= nextWeek
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
          new Date(r.receivedDate) >= monthStart &&
          new Date(r.receivedDate) <= monthEnd)
        .reduce((sum, r) => sum + (r.receivedAmount || r.amount), 0)

      const monthExpenses = expenses
        .filter(e => e.status === 'paid' && e.paidDate &&
          new Date(e.paidDate) >= monthStart &&
          new Date(e.paidDate) <= monthEnd)
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
          type: 'receivable',
          id: r.id,
          description: `Receber R$${r.amount.toLocaleString('pt-BR')} de ${r.contract.clientName}`,
          dueDate: r.expectedDate,
          amount: r.amount,
          editUrl: `/receivables?edit=${r.id}`
        })), ...overdueExpenses.map(e => ({
          type: 'expense',
          id: e.id,
          description: `Pagar R$${e.amount.toLocaleString('pt-BR')} - ${e.description}`,
          dueDate: e.dueDate,
          amount: e.amount,
          editUrl: `/expenses?edit=${e.id}`
        }))]
      },

      // Upcoming items
      upcoming: {
        receivables: upcomingReceivables.slice(0, 5).map(r => ({
          id: r.id,
          client: r.contract.clientName,
          project: r.contract.projectName,
          amount: r.amount,
          expectedDate: r.expectedDate,
          editUrl: `/receivables?edit=${r.id}`
        })),
        expenses: upcomingExpenses.slice(0, 5).map(e => ({
          id: e.id,
          description: e.description,
          vendor: e.vendor,
          amount: e.amount,
          dueDate: e.dueDate,
          editUrl: `/expenses?edit=${e.id}`
        }))
      },

      // Chart data
      monthlyTrend: monthlyData
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Dashboard data error:', error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}