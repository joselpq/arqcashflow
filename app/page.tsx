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
    good: 'bg-success-light text-success border-success/20 shadow-sm',
    warning: 'bg-warning-light text-warning border-warning/20 shadow-sm',
    critical: 'bg-danger-light text-danger border-danger/20 shadow-sm'
  }

  const icons = {
    good: '✅',
    warning: '⚠️',
    critical: '🚨'
  }

  return (
    <div className={`p-6 rounded-xl border ${colors[status as keyof typeof colors] || colors.good}`}>
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{icons[status as keyof typeof icons] || icons.good}</div>
        <div>
          <span className="font-semibold text-lg">{message}</span>
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
    blue: 'bg-white border-primary/20 hover:border-primary/30 hover:shadow-md',
    green: 'bg-white border-success/20 hover:border-success/30 hover:shadow-md',
    red: 'bg-white border-danger/20 hover:border-danger/30 hover:shadow-md',
    yellow: 'bg-white border-warning/20 hover:border-warning/30 hover:shadow-md'
  }

  const valueColors = {
    blue: 'text-primary',
    green: 'text-success',
    red: 'text-danger',
    yellow: 'text-warning'
  }

  return (
    <div className={`p-6 rounded-xl border shadow-sm transition-all duration-200 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600 mb-2">{title}</p>
          <p className={`text-3xl font-bold tracking-tight ${valueColors[color]}`}>{value}</p>
          {subtitle && <p className="text-sm text-neutral-500 mt-2">{subtitle}</p>}
        </div>
        {trend && (
          <div className="ml-4 text-3xl opacity-60">
            {trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️'}
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
    <div className="space-y-4">
      {data.map((month, index) => (
        <div key={index} className="space-y-2">
          <div className="text-sm font-medium">{month.month}</div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-16 text-xs">Receita</div>
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full"
                  style={{ width: `${month.revenue * scale}%` }}
                ></div>
              </div>
              <div className="text-xs w-20 text-right">{formatCurrency(month.revenue)}</div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-16 text-xs">Despesas</div>
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-500 h-3 rounded-full"
                  style={{ width: `${month.expenses * scale}%` }}
                ></div>
              </div>
              <div className="text-xs w-20 text-right">{formatCurrency(month.expenses)}</div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-16 text-xs font-bold">Lucro</div>
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${month.profit >= 0 ? 'bg-blue-500' : 'bg-red-300'}`}
                  style={{ width: `${Math.abs(month.profit) * scale}%` }}
                ></div>
              </div>
              <div className={`text-xs w-20 text-right font-bold ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 tracking-tight">Dashboard</h1>
            <p className="text-neutral-600 mt-2">Visão geral do seu fluxo de caixa</p>
          </div>
          <div className="text-sm text-neutral-500 mt-4 sm:mt-0 bg-white px-3 py-2 rounded-lg border border-neutral-200">
            <span className="text-neutral-400">📅</span> Atualizado em {new Date().toLocaleString('pt-BR')}
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
          <div className="mb-8">
            <div className="bg-danger-light border border-danger/20 rounded-xl p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-danger/10 rounded-full flex items-center justify-center">
                  <span className="text-xl">🚨</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-danger">
                    Itens em Atraso
                  </h2>
                  <p className="text-sm text-danger/80">{data.alerts.overdueItems.length} itens precisam de atenção</p>
                </div>
              </div>
              <div className="space-y-3">
                {data.alerts.overdueItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-white rounded border">
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-gray-600">
                        Venceu em {formatDate(item.dueDate)}
                      </p>
                    </div>
                    <Link
                      href={item.editUrl}
                      className="mt-2 sm:mt-0 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
                    >
                      Resolver
                    </Link>
                  </div>
                ))}
                {data.alerts.overdueItems.length > 5 && (
                  <p className="text-sm text-gray-600 text-center">
                    ... e mais {data.alerts.overdueItems.length - 5} itens
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Upcoming Receivables */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Próximos Recebimentos</h2>
                <p className="text-sm text-neutral-500">Valores esperados nos próximos dias</p>
              </div>
            </div>
            {data.upcoming.receivables.length > 0 ? (
              <div className="space-y-3">
                {data.upcoming.receivables.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <div>
                      <p className="font-medium">{item.client}</p>
                      <p className="text-sm text-gray-600">{item.project}</p>
                      <p className="text-sm text-green-600">{formatDate(item.expectedDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">{formatCurrency(item.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum recebimento próximo</p>
            )}
          </div>

          {/* Upcoming Expenses */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                <span className="text-xl">💸</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Próximas Despesas</h2>
                <p className="text-sm text-neutral-500">Pagamentos programados</p>
              </div>
            </div>
            {data.upcoming.expenses.length > 0 ? (
              <div className="space-y-3">
                {data.upcoming.expenses.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                    <div>
                      <p className="font-medium">{item.description}</p>
                      {item.vendor && <p className="text-sm text-gray-600">{item.vendor}</p>}
                      <p className="text-sm text-yellow-600">{formatDate(item.dueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-700">{formatCurrency(item.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhuma despesa próxima</p>
            )}
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Tendência dos Últimos 6 Meses</h2>
              <p className="text-sm text-neutral-500">Evolução do fluxo de caixa</p>
            </div>
          </div>
          <SimpleChart data={data.monthlyTrend} />
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-primary-light to-primary/5 border border-primary/20 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-xl">🚀</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Ações Rápidas</h2>
              <p className="text-sm text-primary/80">Acesse funcionalidades principais</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/contracts" className="group bg-white p-6 rounded-xl border border-neutral-200 hover:border-primary/30 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">Novo Contrato</h3>
              <p className="text-sm text-neutral-500">Adicionar projeto</p>
            </Link>
            <Link href="/receivables" className="group bg-white p-6 rounded-xl border border-neutral-200 hover:border-success/30 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-success/20 transition-colors">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">Marcar Recebimento</h3>
              <p className="text-sm text-neutral-500">Registrar pagamento</p>
            </Link>
            <Link href="/expenses" className="group bg-white p-6 rounded-xl border border-neutral-200 hover:border-warning/30 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-warning/20 transition-colors">
                <span className="text-2xl">💸</span>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">Nova Despesa</h3>
              <p className="text-sm text-neutral-500">Adicionar custo</p>
            </Link>
            <div className="bg-white p-6 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">Exportar Dados</h3>
              <ExportButtons />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}