"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LandingPage from './components/LandingPage'
import Link from 'next/link'
import ExportButtons from './components/ExportButtons'
import { formatDateShort } from '@/lib/date-utils'
import Modal from './components/Modal'
import ReceivableForm from './components/forms/ReceivableForm'
import ExpenseForm from './components/forms/ExpenseForm'

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
      entityType: 'receivable' | 'expense'
      entityId: string
      entityData?: any
    }>
  }
  upcoming: {
    receivables: Array<{
      id: string
      client: string
      project: string
      amount: number
      expectedDate: string
      entityType: 'receivable'
      entityId: string
    }>
    expenses: Array<{
      id: string
      description: string
      vendor: string | null
      amount: number
      dueDate: string
      entityType: 'expense'
      entityId: string
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
  return formatDateShort(dateStr)
}

function HealthIndicator({ status, message }: { status: string, message: string }) {
  const colors = {
    good: 'bg-green-50/50 text-green-900 border-green-200/50',
    warning: 'bg-amber-50/50 text-amber-900 border-amber-200/50',
    critical: 'bg-red-50/50 text-red-900 border-red-200/50'
  }

  const indicators = {
    good: '●',
    warning: '●',
    critical: '●'
  }

  const indicatorColors = {
    good: 'text-green-600',
    warning: 'text-amber-600',
    critical: 'text-red-600'
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
    blue: 'bg-white border-neutral-200/60',
    green: 'bg-white border-neutral-200/60',
    red: 'bg-white border-neutral-200/60',
    yellow: 'bg-white border-neutral-200/60'
  }

  const valueColors = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    red: 'text-red-600',
    yellow: 'text-amber-700'
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
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryAttempt, setRetryAttempt] = useState(0)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'receivable' | 'expense' | null>(null)
  const [editingEntity, setEditingEntity] = useState<any>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [contracts, setContracts] = useState([])

  // Fetch contracts for forms
  useEffect(() => {
    if (session) {
      fetchContracts()
    }
  }, [session])

  async function fetchContracts() {
    try {
      const res = await fetch('/api/contracts')
      if (res.ok) {
        const data = await res.json()
        setContracts(data)
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
    }
  }

  useEffect(() => {
    // Only fetch dashboard data if user is authenticated
    if (session) {
      async function checkOnboardingAndFetchDashboard() {
        let retryCount = 0
        const maxRetries = 3
        const retryDelay = 1000 // 1 second

        while (retryCount < maxRetries) {
          try {
            setRetryAttempt(retryCount + 1)
            console.log('🔍 Dashboard: Starting data fetch, attempt', retryCount + 1)

            // Check onboarding status
            const onboardingRes = await fetch('/api/onboarding/status')
            if (onboardingRes.ok) {
              const { onboardingComplete } = await onboardingRes.json()
              if (!onboardingComplete) {
                router.push('/onboarding')
                return
              }
            }

            // Fetch dashboard data with timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

            const response = await fetch('/api/dashboard', {
              signal: controller.signal
            })
            clearTimeout(timeoutId)

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(`API Error ${response.status}: ${errorData.details || errorData.error || 'Unknown error'}`)
            }

            const dashboardData = await response.json()
            console.log('✅ Dashboard: Data loaded successfully')
            setData(dashboardData)
            setError(null) // Clear any previous errors
            break // Success, exit retry loop

          } catch (err) {
            retryCount++
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            console.warn(`⚠️ Dashboard: Attempt ${retryCount} failed:`, errorMessage)

            if (retryCount >= maxRetries) {
              console.error('❌ Dashboard: All retry attempts failed')
              setError(`Failed to load dashboard data after ${maxRetries} attempts: ${errorMessage}`)
            } else {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount))
            }
          }
        }

        setLoading(false)
      }

      checkOnboardingAndFetchDashboard()
    } else if (status === "unauthenticated") {
      // If explicitly not authenticated, stop loading immediately
      setLoading(false)
    }
    // If status is still "loading", don't change loading state
  }, [session, status, router])

  // Modal handlers
  function openModal(type: 'receivable' | 'expense', entity?: any) {
    setModalType(type)
    setEditingEntity(entity)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setModalType(null)
    setEditingEntity(null)
  }

  async function handleReceivableSubmit(receivableData: any) {
    setFormLoading(true)
    try {
      const url = editingEntity ? `/api/receivables/${editingEntity.id}` : '/api/receivables'
      const method = editingEntity ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receivableData)
      })

      if (res.ok) {
        closeModal()
        // Refresh dashboard data
        window.location.reload()
      } else {
        alert('Error saving receivable')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error saving receivable')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleExpenseSubmit(expenseData: any) {
    setFormLoading(true)
    try {
      const url = editingEntity ? `/api/expenses/${editingEntity.id}` : '/api/expenses'
      const method = editingEntity ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      })

      if (res.ok) {
        closeModal()
        // Refresh dashboard data
        window.location.reload()
      } else {
        alert('Error saving expense')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error saving expense')
    } finally {
      setFormLoading(false)
    }
  }

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  // Show landing page if not authenticated
  if (!session) {
    return <LandingPage />
  }

  // Show loading state while fetching dashboard data
  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⏳</div>
            <p>Carregando dados...</p>
            {retryAttempt > 1 && (
              <p className="text-sm text-gray-500 mt-2">
                Tentativa {retryAttempt} de 3...
              </p>
            )}
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
            <p className="text-lg text-red-600 mb-4">Erro ao carregar dados do dashboard</p>
            <p className="text-sm text-gray-600 mb-6">
              {error?.includes('attempts') ?
                'Falha ao conectar com o servidor após múltiplas tentativas.' :
                'Houve um problema ao buscar os dados.'
              }
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Tentar Novamente
            </button>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left max-w-2xl mx-auto">
                <summary className="cursor-pointer text-sm text-gray-500">Detalhes do erro (desenvolvimento)</summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                  {error}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    )
  }

  const profitTrend = data.metrics.thisMonthProfit > 0 ? 'up' :
                     data.metrics.thisMonthProfit < 0 ? 'down' : 'neutral'

  return (
    <div className="min-h-screen bg-neutral-50">
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
                    <button
                      onClick={() => openModal(item.entityType, item.entityData)}
                      className="mt-2 sm:mt-0 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      Resolver
                    </button>
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
            <Link href="/projetos?tab=contratos" className="group bg-white p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors">
              <h3 className="font-medium text-neutral-900 mb-1">Novo Contrato</h3>
              <p className="text-sm text-neutral-500">Adicionar projeto</p>
            </Link>
            <Link href="/projetos?tab=recebiveis" className="group bg-white p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors">
              <h3 className="font-medium text-neutral-900 mb-1">Marcar Recebimento</h3>
              <p className="text-sm text-neutral-500">Registrar pagamento</p>
            </Link>
            <Link href="/projetos?tab=despesas" className="group bg-white p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors">
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

      {/* Modals */}
      {modalType === 'receivable' && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={editingEntity ? 'Editar Recebível' : 'Adicionar Recebível'}
          size="lg"
        >
          <ReceivableForm
            receivable={editingEntity}
            contracts={contracts}
            onSubmit={handleReceivableSubmit}
            onCancel={closeModal}
            loading={formLoading}
          />
        </Modal>
      )}

      {modalType === 'expense' && (
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={editingEntity ? 'Editar Despesa' : 'Adicionar Despesa'}
          size="lg"
        >
          <ExpenseForm
            expense={editingEntity}
            contracts={contracts}
            onSubmit={handleExpenseSubmit}
            onCancel={closeModal}
            loading={formLoading}
          />
        </Modal>
      )}
    </div>
  )
}