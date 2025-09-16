"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ExportButtons from './components/ExportButtons'

interface DashboardData {
  metrics: {
    thisMonthRevenue: number
    thisMonthExpenses: number
    thisMonthProfit: number
    totalProfit: number
    pendingReceivables: number
    pendingExpenses: number
    activeContracts: number
    totalContracts: number
  }
  cashFlowHealth: {
    status: 'good' | 'warning' | 'critical'
    message: string
  }
  alerts: {
    overdueReceivables: number
    overdueExpenses: number
    overdueItems: Array<{
      type: 'receivable' | 'expense'
      id: string
      description: string
      dueDate: string
      amount: number
      editUrl: string
    }>
  }
  upcoming: {
    receivables: Array<{
      id: string
      client: string
      project: string
      amount: number
      expectedDate: string
      editUrl: string
    }>
    expenses: Array<{
      id: string
      description: string
      vendor: string | null
      amount: number
      dueDate: string
      editUrl: string
    }>
  }
  monthlyTrend: Array<{
    month: string
    revenue: number
    expenses: number
    profit: number
  }>
}

function formatCurrency(amount: number): string {
  return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  })
}

function HealthIndicator({ status, message }: { status: string, message: string }) {
  const colors = {
    good: 'bg-green-50 text-green-900 border-green-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    critical: 'bg-red-50 text-red-900 border-red-200'
  }

  const indicators = {
    good: '●',
    warning: '●',
    critical: '●'
  }

  const indicatorColors = {
    good: 'text-green-500',
    warning: 'text-amber-500',
    critical: 'text-red-500'
  }

  return (
    <div className={`p-6 rounded-lg border ${colors[status as keyof typeof colors] || colors.good}`}>
      <div className="flex items-center space-x-3">
        <div className={`text-lg ${indicatorColors[status as keyof typeof indicatorColors] || indicatorColors.good}`}>
          {indicators[status as keyof typeof indicators] || indicators.good}
        </div>
        <div>
          <span className="font-medium text-base">{message}</span>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, subtitle, trend, color = 'blue' }: {
  title: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'green' | 'red' | 'yellow'
}) {
  const colorClasses = {
    blue: 'bg-white border-neutral-200',
    green: 'bg-white border-neutral-200',
    red: 'bg-white border-neutral-200',
    yellow: 'bg-white border-neutral-200'
  }

  const valueColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    yellow: 'text-amber-600'
  }

  const trendIndicators = {
    up: '↗',
    down: '↘',
    neutral: '→'
  }

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]} hover:shadow-sm transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-500 mb-1">{title}</p>
          <p className={`text-2xl font-semibold ${valueColors[color]} mb-1`}>{value}</p>
          {subtitle && <p className="text-xs text-neutral-400">{subtitle}</p>}
        </div>
        {trend && (
          <div className={`text-sm ${valueColors[color]} opacity-70`}>
            {trendIndicators[trend]}
          </div>
        )}
      </div>
    </div>
  )
}

function SimpleChart({ data }: { data: DashboardData['monthlyTrend'] }) {
  const maxValue = Math.max(...data.flatMap(d => [d.revenue, d.expenses]))
  const scale = 100 / (maxValue || 1)

  return (
    <div className="space-y-6">
      {data.map((month, index) => (
        <div key={index} className="space-y-3">
          <div className="text-sm font-medium text-neutral-900">{month.month}</div>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-16 text-sm text-neutral-700">Receita</div>
              <div className="flex-1 bg-neutral-200 rounded-full h-4">
                <div
                  className="bg-green-600 h-4 rounded-full"
                  style={{ width: `${month.revenue * scale}%` }}
                ></div>
              </div>
              <div className="text-sm w-24 text-right text-neutral-900 font-medium">{formatCurrency(month.revenue)}</div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-16 text-sm text-neutral-700">Despesas</div>
              <div className="flex-1 bg-neutral-200 rounded-full h-4">
                <div
                  className="bg-red-500 h-4 rounded-full"
                  style={{ width: `${month.expenses * scale}%` }}
                ></div>
              </div>
              <div className="text-sm w-24 text-right text-neutral-900 font-medium">{formatCurrency(month.expenses)}</div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-16 text-sm text-neutral-700 font-medium">Lucro</div>
              <div className="flex-1 bg-neutral-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full ${month.profit >= 0 ? 'bg-blue-600' : 'bg-red-400'}`}
                  style={{ width: `${Math.abs(month.profit) * scale}%` }}
                ></div>
              </div>
              <div className={`text-sm w-24 text-right font-medium ${month.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {formatCurrency(month.profit)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/dashboard')
        if (!response.ok) throw new Error('Failed to fetch dashboard data')
        const dashboardData = await response.json()
        setData(dashboardData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⏳</div>
            <p>Carregando dados...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
          <div className="text-center py-20">
            <div className="text-4xl mb-4">❌</div>
            <p>Erro ao carregar dados: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  const profitTrend = data.metrics.thisMonthProfit > 0 ? 'up' :
                     data.metrics.thisMonthProfit < 0 ? 'down' : 'neutral'

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12">
          <div>
            <h1 className="text-3xl font-light text-neutral-900 tracking-wide">Dashboard</h1>
            <p className="text-neutral-500 mt-1 text-sm">Visão geral do fluxo de caixa</p>
          </div>
          <div className="text-xs text-neutral-400 mt-4 sm:mt-0">
            Atualizado em {new Date().toLocaleString('pt-BR')}
          </div>
        </div>

        {/* Health Status */}
        <div className="mb-8">
          <HealthIndicator
            status={data.cashFlowHealth.status}
            message={data.cashFlowHealth.message}
          />
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Receita Este Mês"
            value={formatCurrency(data.metrics.thisMonthRevenue)}
            color="green"
          />
          <MetricCard
            title="Despesas Este Mês"
            value={formatCurrency(data.metrics.thisMonthExpenses)}
            color="red"
          />
          <MetricCard
            title="Lucro Este Mês"
            value={formatCurrency(data.metrics.thisMonthProfit)}
            trend={profitTrend}
            color={data.metrics.thisMonthProfit >= 0 ? 'blue' : 'red'}
          />
          <MetricCard
            title="Contratos Ativos"
            value={`${data.metrics.activeContracts}/${data.metrics.totalContracts}`}
            subtitle="contratos"
            color="blue"
          />
        </div>

        {/* Outstanding Amounts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <MetricCard
            title="A Receber (Pendente)"
            value={formatCurrency(data.metrics.pendingReceivables)}
            subtitle="dinheiro esperado"
            color="green"
          />
          <MetricCard
            title="A Pagar (Pendente)"
            value={formatCurrency(data.metrics.pendingExpenses)}
            subtitle="contas a pagar"
            color="yellow"
          />
        </div>

        {/* Critical Alerts */}
        {data.alerts.overdueItems.length > 0 && (
          <div className="mb-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-red-900 mb-1">
                  Itens em Atraso
                </h2>
                <p className="text-sm text-red-700">{data.alerts.overdueItems.length} itens precisam de atenção</p>
              </div>
              <div className="space-y-3">
                {data.alerts.overdueItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded border">
                    <div>
                      <p className="font-medium text-neutral-900">{item.description}</p>
                      <p className="text-sm text-neutral-600">
                        Venceu em {formatDate(item.dueDate)}
                      </p>
                    </div>
                    <Link
                      href={item.editUrl}
                      className="mt-2 sm:mt-0 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Resolver
                    </Link>
                  </div>
                ))}
                {data.alerts.overdueItems.length > 5 && (
                  <p className="text-sm text-neutral-600 text-center">
                    ... e mais {data.alerts.overdueItems.length - 5} itens
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Upcoming Receivables */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-neutral-900 mb-1">Próximos Recebimentos</h2>
              <p className="text-sm text-neutral-500">Valores esperados</p>
            </div>
            {data.upcoming.receivables.length > 0 ? (
              <div className="space-y-3">
                {data.upcoming.receivables.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-4 bg-neutral-50 border border-neutral-200 rounded">
                    <div>
                      <p className="font-medium text-neutral-900">{item.client}</p>
                      <p className="text-sm text-neutral-600">{item.project}</p>
                      <p className="text-sm text-green-700">{formatDate(item.expectedDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-700">{formatCurrency(item.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-4">Nenhum recebimento próximo</p>
            )}
          </div>

          {/* Upcoming Expenses */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-neutral-900 mb-1">Próximas Despesas</h2>
              <p className="text-sm text-neutral-500">Pagamentos programados</p>
            </div>
            {data.upcoming.expenses.length > 0 ? (
              <div className="space-y-3">
                {data.upcoming.expenses.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-4 bg-neutral-50 border border-neutral-200 rounded">
                    <div>
                      <p className="font-medium text-neutral-900">{item.description}</p>
                      {item.vendor && <p className="text-sm text-neutral-600">{item.vendor}</p>}
                      <p className="text-sm text-amber-700">{formatDate(item.dueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-amber-700">{formatCurrency(item.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-center py-4">Nenhuma despesa próxima</p>
            )}
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6 mb-12">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-neutral-900 mb-1">Tendência dos Últimos 6 Meses</h2>
            <p className="text-sm text-neutral-500">Evolução do fluxo de caixa</p>
          </div>
          <SimpleChart data={data.monthlyTrend} />
        </div>

        {/* Quick Actions */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-neutral-900 mb-1">Ações Rápidas</h2>
            <p className="text-sm text-neutral-500">Acesse funcionalidades principais</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/contracts" className="group bg-white p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors">
              <h3 className="font-medium text-neutral-900 mb-1">Novo Contrato</h3>
              <p className="text-sm text-neutral-500">Adicionar projeto</p>
            </Link>
            <Link href="/receivables" className="group bg-white p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors">
              <h3 className="font-medium text-neutral-900 mb-1">Marcar Recebimento</h3>
              <p className="text-sm text-neutral-500">Registrar pagamento</p>
            </Link>
            <Link href="/expenses" className="group bg-white p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors">
              <h3 className="font-medium text-neutral-900 mb-1">Nova Despesa</h3>
              <p className="text-sm text-neutral-500">Adicionar custo</p>
            </Link>
            <div className="bg-white p-4 rounded-lg border border-neutral-200">
              <h3 className="font-medium text-neutral-900 mb-2">Exportar Dados</h3>
              <ExportButtons />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}