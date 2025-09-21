'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatDateForInput, formatDateFull as formatDateForDisplay, getTodayDateString, getExpenseActualStatus } from '@/lib/date-utils'
import Modal from '../../components/Modal'
import ExpenseForm from '../../components/forms/ExpenseForm'

export default function ExpensesTab() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [expenses, setExpenses] = useState([])
  const [filteredExpenses, setFilteredExpenses] = useState([])
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [viewMode, setViewMode] = useState('regular') // 'regular', 'recurring'
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false)
  const [expenseToMark, setExpenseToMark] = useState<any>(null)
  const [markPaidData, setMarkPaidData] = useState({
    paidDate: '',
    paidAmount: ''
  })
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false)
  const [recurringFormData, setRecurringFormData] = useState({
    description: '',
    amount: '',
    dueDate: '',
    category: 'Salários',
    contractId: '',
    vendor: '',
    invoiceNumber: '',
    type: 'operational',
    notes: '',
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: '',
    endDate: '',
    maxOccurrences: '',
  })

  const [filters, setFilters] = useState({
    contractId: 'all',
    status: 'pending',
    category: 'all',
    type: 'all',
    sortBy: 'dueDate',
    sortOrder: 'asc',
  })
  const [searchQuery, setSearchQuery] = useState('')

  const expenseCategories = [
    'Salários', 'Escritório', 'Software', 'Marketing', 'Transporte', 'Equipamentos', 'Impostos', 'Outros'
  ]

  const expenseTypes = [
    { value: 'operational', label: 'Operacional' },
    { value: 'project', label: 'Projeto' },
    { value: 'administrative', label: 'Administrativo' },
  ]

  const statusOptions = [
    { value: 'pending', label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'paid', label: 'Pago', color: 'bg-green-100 text-green-800' },
    { value: 'overdue', label: 'Atrasado', color: 'bg-red-100 text-red-800' },
    { value: 'cancelled', label: 'Cancelado', color: 'bg-neutral-100 text-neutral-900' },
  ]

  const frequencyOptions = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'annual', label: 'Anual' },
  ]

  useEffect(() => {
    if (viewMode === 'regular') {
      fetchExpenses()
    } else {
      fetchRecurringExpenses()
    }
    fetchContracts()
  }, [filters, viewMode])

  useEffect(() => {
    if (editId && expenses.length > 0) {
      const expenseToEdit = expenses.find((e: any) => e.id === editId)
      if (expenseToEdit) {
        openEditModal(expenseToEdit)
      }
    }
  }, [editId, expenses])

  // Client-side search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredExpenses(expenses)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = expenses.filter((expense: any) =>
        expense.description?.toLowerCase().includes(query) ||
        expense.vendor?.toLowerCase().includes(query) ||
        expense.category?.toLowerCase().includes(query) ||
        expense.invoiceNumber?.toLowerCase().includes(query) ||
        expense.contract?.clientName?.toLowerCase().includes(query) ||
        expense.contract?.projectName?.toLowerCase().includes(query) ||
        expense.notes?.toLowerCase().includes(query)
      )
      setFilteredExpenses(filtered)
    }
  }, [expenses, searchQuery])

  async function fetchExpenses() {
    setLoading(true)
    try {
      const params = new URLSearchParams(filters)

      const res = await fetch(`/api/expenses?${params.toString()}`)
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error(`Failed to fetch expenses: ${res.status}`)
      }
      const data = await res.json()
      setExpenses(data.expenses || [])
    } catch (error) {
      console.error('Falha ao buscar despesas:', error)
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchRecurringExpenses() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        category: filters.category,
        contractId: filters.contractId,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })
      const response = await fetch(`/api/recurring-expenses?${params}`)

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error(`Failed to fetch recurring expenses: ${response.status}`)
      }

      const data = await response.json()
      setRecurringExpenses(data.recurringExpenses || [])
    } catch (error) {
      console.error('Error fetching recurring expenses:', error)
      setRecurringExpenses([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchContracts() {
    try {
      const res = await fetch('/api/contracts')
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error(`Failed to fetch contracts: ${res.status}`)
      }
      const data = await res.json()
      setContracts(data)
    } catch (error) {
      console.error('Falha ao buscar contratos:', error)
      setContracts([])
    }
  }

  function openAddModal() {
    setEditingExpense(null)
    setIsModalOpen(true)
  }

  function openEditModal(expense: any) {
    setEditingExpense(expense)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingExpense(null)
  }

  async function handleFormSubmit(expenseData: any) {
    setFormLoading(true)
    try {
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses'
      const method = editingExpense ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      })

      if (res.ok) {
        closeModal()
        if (viewMode === 'regular') {
          await fetchExpenses()
        } else {
          await fetchRecurringExpenses()
        }
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

  async function handleRecurringFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    try {
      // Validate and prepare form data
      const amount = parseFloat(recurringFormData.amount)
      if (isNaN(amount) || amount <= 0) {
        alert('Por favor, insira um valor válido maior que zero')
        return
      }

      // Validate recurring data
      const interval = parseInt(recurringFormData.interval.toString())
      if (isNaN(interval) || interval < 1) {
        alert('Por favor, insira um intervalo válido (1 ou maior)')
        return
      }

      const dayOfMonth = recurringFormData.dayOfMonth ? parseInt(recurringFormData.dayOfMonth) : null
      if (dayOfMonth && (dayOfMonth < 1 || dayOfMonth > 31)) {
        alert('Por favor, insira um dia do mês válido (1-31)')
        return
      }

      const maxOccurrences = recurringFormData.maxOccurrences ? parseInt(recurringFormData.maxOccurrences) : null
      if (maxOccurrences && maxOccurrences < 1) {
        alert('Por favor, insira um número de ocorrências válido')
        return
      }

      // Prepare recurring expense data
      const recurringExpenseData = {
        description: recurringFormData.description,
        amount: amount,
        category: recurringFormData.category,
        frequency: recurringFormData.frequency,
        interval: interval,
        dayOfMonth: dayOfMonth,
        startDate: recurringFormData.dueDate,
        endDate: recurringFormData.endDate || null,
        maxOccurrences: maxOccurrences,
        contractId: recurringFormData.contractId || null,
        vendor: recurringFormData.vendor || null,
        invoiceNumber: recurringFormData.invoiceNumber || null,
        type: recurringFormData.type,
        notes: recurringFormData.notes || null,
      }

      const response = await fetch('/api/recurring-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recurringExpenseData),
      })

      if (response.ok) {
        alert('Despesa recorrente criada com sucesso!')
        setIsRecurringModalOpen(false)
        resetRecurringForm()
        fetchRecurringExpenses()
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving recurring expense:', error)
      alert('Erro ao salvar despesa recorrente')
    } finally {
      setFormLoading(false)
    }
  }

  function resetRecurringForm() {
    setRecurringFormData({
      description: '',
      amount: '',
      dueDate: '',
      category: 'Salários',
      contractId: '',
      vendor: '',
      invoiceNumber: '',
      type: 'operational',
      notes: '',
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: '',
      endDate: '',
      maxOccurrences: '',
    })
  }

  async function deleteExpense(id: string) {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await fetchExpenses()
      } else {
        alert('Failed to delete expense')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete expense')
    }
  }

  function openMarkPaidModal(expense: any) {
    setExpenseToMark(expense)
    setMarkPaidData({
      paidDate: getTodayDateString(),
      paidAmount: expense.amount.toString()
    })
    setIsMarkPaidModalOpen(true)
  }

  function closeMarkPaidModal() {
    setIsMarkPaidModalOpen(false)
    setExpenseToMark(null)
    setMarkPaidData({
      paidDate: '',
      paidAmount: ''
    })
  }

  async function confirmMarkAsPaid() {
    if (!expenseToMark) return

    try {
      const res = await fetch(`/api/expenses/${expenseToMark.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paidDate: markPaidData.paidDate,
          paidAmount: parseFloat(markPaidData.paidAmount)
        })
      })

      if (res.ok) {
        closeMarkPaidModal()
        await fetchExpenses()
      } else {
        const errorData = await res.json()
        console.error('API error:', errorData)
        alert('Failed to update expense')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update expense')
    }
  }

  // Recurring expense functions
  async function toggleRecurringActive(recurring: any) {
    try {
      const response = await fetch(`/api/recurring-expenses/${recurring.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !recurring.isActive,
        }),
      })

      if (response.ok) {
        fetchRecurringExpenses()
        alert(recurring.isActive ? 'Despesa recorrente pausada!' : 'Despesa recorrente ativada!')
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Error toggling active status:', error)
      alert('Erro ao alterar status')
    }
  }

  async function generateNext(recurring: any) {
    try {
      const response = await fetch(`/api/recurring-expenses/${recurring.id}/generate`, {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()
        fetchRecurringExpenses()
        alert(result.message)
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Error generating expense:', error)
      alert('Erro ao gerar despesa')
    }
  }

  async function deleteRecurring(recurring: any) {
    if (!confirm(`Excluir despesa recorrente "${recurring.description}"? Isso não afetará as despesas já geradas.`)) return

    try {
      const response = await fetch(`/api/recurring-expenses/${recurring.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchRecurringExpenses()
        alert('Despesa recorrente excluída!')
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting recurring expense:', error)
      alert('Erro ao excluir despesa recorrente')
    }
  }

  function getFrequencyDisplay(frequency: string, interval: number) {
    const base = frequencyOptions.find(f => f.value === frequency)?.label || frequency
    if (interval === 1) return base
    return `A cada ${interval} ${frequency === 'weekly' ? 'semanas' :
                                   frequency === 'monthly' ? 'meses' :
                                   frequency === 'quarterly' ? 'trimestres' : 'anos'}`
  }

  function getRecurringStatusDisplay(recurring: any) {
    if (!recurring.isActive) {
      return { label: 'Pausada', color: 'bg-gray-100 text-gray-800' }
    }

    if (recurring.lastError) {
      return { label: 'Erro', color: 'bg-red-100 text-red-800' }
    }

    if (recurring.maxOccurrences && recurring.generatedCount >= recurring.maxOccurrences) {
      return { label: 'Concluída', color: 'bg-green-100 text-green-800' }
    }

    const nextDue = new Date(recurring.nextDue)
    const today = new Date()
    if (nextDue <= today) {
      return { label: 'Pronta', color: 'bg-blue-100 text-blue-800' }
    }

    return { label: 'Ativa', color: 'bg-green-100 text-green-800' }
  }

  return (
    <div>
      {/* Header with View Mode Toggle and Add Button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-neutral-900">Despesas</h2>

          {/* View Mode Toggle */}
          <div className="flex bg-neutral-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('regular')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'regular'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Regulares
            </button>
            <button
              onClick={() => setViewMode('recurring')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'recurring'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              🔄 Recorrentes
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          {viewMode === 'regular' && (
            <button
              onClick={openAddModal}
              className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar Despesa
            </button>
          )}
          {viewMode === 'regular' && (
            <button
              onClick={() => setIsRecurringModalOpen(true)}
              className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 font-medium transition-colors flex items-center gap-2"
            >
              🔄
              Criar Recorrente
            </button>
          )}
        </div>
      </div>


      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar despesas, fornecedores, categorias, projetos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-neutral-300 rounded-lg bg-white text-neutral-900 placeholder-neutral-500 focus:border-blue-600 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filters - Horizontal Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">Projeto:</label>
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none min-w-[180px]"
            value={filters.contractId}
            onChange={(e) => setFilters({ ...filters, contractId: e.target.value })}
          >
            <option value="all">Todos os projetos</option>
            {contracts.map((contract: any) => (
              <option key={contract.id} value={contract.id}>
                {contract.clientName} - {contract.projectName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">Status:</label>
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">Todos</option>
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">Categoria:</label>
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="all">Todas</option>
            {expenseCategories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">Tipo:</label>
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="all">Todos</option>
            {expenseTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">Ordenar:</label>
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          >
            <option value="dueDate">Vencimento</option>
            <option value="amount">Valor</option>
            <option value="status">Status</option>
            <option value="category">Categoria</option>
            <option value="vendor">Fornecedor</option>
            <option value="createdAt">Data Criação</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.sortOrder}
            onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
          >
            <option value="desc">↓ Desc</option>
            <option value="asc">↑ Asc</option>
          </select>
        </div>

        {(filters.contractId !== 'all' || filters.status !== 'pending' || filters.category !== 'all' || filters.type !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setFilters({ contractId: 'all', status: 'pending', category: 'all', type: 'all', sortBy: 'dueDate', sortOrder: 'asc' })
              setSearchQuery('')
            }}
            className="ml-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Expenses Table */}
      {loading ? (
        <p>Carregando...</p>
      ) : viewMode === 'regular' ? (
        filteredExpenses.length === 0 ? (
          <p className="text-neutral-900 font-medium">
            {searchQuery ? `Nenhuma despesa encontrada para "${searchQuery}"` : 'Nenhuma despesa ainda'}
          </p>
        ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Fornecedor
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {filteredExpenses.map((expense: any) => {
                  const isOverdue = expense.status === 'overdue'
                  return (
                  <tr key={expense.id} className={`group hover:bg-neutral-50 transition-colors ${
                    isOverdue ? 'bg-red-50 border-l-4 border-l-red-500' : ''
                  }`}>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-semibold text-neutral-900">{expense.description}</div>
                        <div className="text-sm text-neutral-600">
                          {expenseTypes.find(t => t.value === expense.type)?.label || expense.type}
                        </div>
                        {expense.contract && (
                          <div className="text-xs text-neutral-500">
                            {expense.contract.clientName} - {expense.contract.projectName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-bold text-lg text-neutral-900">
                        R$ {expense.amount.toLocaleString('pt-BR')}
                      </div>
                      {expense.paidDate && expense.paidAmount && expense.paidAmount !== expense.amount && (
                        <div className="text-sm text-green-600">
                          Pago: R$ {expense.paidAmount.toLocaleString('pt-BR')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          expense.status === 'paid' ? 'bg-green-500' :
                          expense.status === 'pending' ? 'bg-yellow-500' :
                          expense.status === 'overdue' ? 'bg-red-500 animate-pulse' :
                          'bg-neutral-500'
                        }`}></div>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          statusOptions.find(s => s.value === expense.status)?.color || 'bg-neutral-100 text-neutral-900'
                        }`}>
                          {statusOptions.find(s => s.value === expense.status)?.label || expense.status}
                        </span>
                      </div>
                      {expense.paidDate && (
                        <div className="text-xs text-green-600 mt-1">
                          Pago: {formatDateForDisplay(expense.paidDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-900">
                      {formatDateForDisplay(expense.dueDate)}
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-900">
                      {expense.category}
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-900">
                      <div>{expense.vendor || '-'}</div>
                      {expense.invoiceNumber && (
                        <div className="text-xs text-neutral-500">#{expense.invoiceNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {(expense.status === 'pending' || expense.status === 'overdue') && (
                          <button
                            onClick={() => openMarkPaidModal(expense)}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 font-medium transition-colors"
                            title="Marcar como pago"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(expense)}
                          className="bg-blue-700 text-white px-2 py-1 rounded text-xs hover:bg-blue-800 font-medium transition-colors"
                          title="Editar despesa"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 font-medium transition-colors"
                          title="Excluir despesa"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        )
      ) : (
        /* Recurring Expenses View */
        recurringExpenses.length === 0 ? (
          <div className="text-center text-neutral-600 py-12">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-medium mb-2">Nenhuma despesa recorrente encontrada</h3>
            <p className="text-neutral-500 mb-4">
              Comece criando uma despesa recorrente usando o botão "Adicionar Despesa".
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recurringExpenses.map((recurring: any) => {
              const statusDisplay = getRecurringStatusDisplay(recurring)
              return (
                <div key={recurring.id} className="bg-white border-2 border-neutral-300 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg text-neutral-900">{recurring.description}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${statusDisplay.color}`}>
                          {statusDisplay.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm text-neutral-900 font-medium">
                        <div>
                          <strong>Valor:</strong> R$ {recurring.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div>
                          <strong>Próximo:</strong> {formatDateForDisplay(recurring.nextDue)}
                        </div>
                        <div>
                          <strong>Frequência:</strong> {getFrequencyDisplay(recurring.frequency, recurring.interval)}
                        </div>
                        <div>
                          <strong>Categoria:</strong> {recurring.category}
                        </div>
                        <div>
                          <strong>Geradas:</strong> {recurring.generatedCount}
                          {recurring.maxOccurrences && ` / ${recurring.maxOccurrences}`}
                        </div>
                        {recurring.dayOfMonth && (
                          <div>
                            <strong>Dia:</strong> {recurring.dayOfMonth}
                          </div>
                        )}
                      </div>

                      {recurring.contract && (
                        <div className="text-sm text-blue-700 mt-1 font-medium">
                          <strong>Projeto:</strong> {recurring.contract.clientName} - {recurring.contract.projectName}
                        </div>
                      )}

                      {recurring.vendor && (
                        <div className="text-sm text-neutral-600 mt-1">
                          <strong>Fornecedor:</strong> {recurring.vendor}
                        </div>
                      )}

                      {recurring.lastError && (
                        <div className="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded">
                          <strong>⚠️ Erro:</strong> {recurring.lastError}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 ml-4">
                      {recurring.isActive ? (
                        <>
                          <button
                            onClick={() => generateNext(recurring)}
                            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                          >
                            Gerar Agora
                          </button>
                          <button
                            onClick={() => toggleRecurringActive(recurring)}
                            className="text-xs bg-yellow-600 text-white px-3 py-1 rounded-lg hover:bg-yellow-700 font-medium transition-colors"
                          >
                            Pausar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => toggleRecurringActive(recurring)}
                          className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 font-medium transition-colors"
                        >
                          Ativar
                        </button>
                      )}
                      <button
                        onClick={() => deleteRecurring(recurring)}
                        className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 font-medium transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingExpense ? 'Editar Despesa' : 'Adicionar Despesa'}
        size="lg"
      >
        <ExpenseForm
          expense={editingExpense}
          contracts={contracts}
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
          loading={formLoading}
        />
      </Modal>

      {/* Mark as Paid Modal */}
      <Modal
        isOpen={isMarkPaidModalOpen}
        onClose={closeMarkPaidModal}
        title="Marcar como Pago"
        size="md"
      >
        <div className="space-y-4">
          {expenseToMark && (
            <div className="bg-neutral-50 p-4 rounded-lg">
              <h3 className="font-semibold text-neutral-900">
                {expenseToMark.description}
              </h3>
              <p className="text-sm text-neutral-600">
                Valor esperado: R$ {expenseToMark.amount.toLocaleString('pt-BR')}
              </p>
              {expenseToMark.contract && (
                <p className="text-sm text-neutral-600">
                  Projeto: {expenseToMark.contract.projectName} - {expenseToMark.contract.clientName}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block mb-2 font-medium text-neutral-900">Data de Pagamento *</label>
            <input
              type="date"
              required
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
              value={markPaidData.paidDate}
              onChange={(e) => setMarkPaidData({ ...markPaidData, paidDate: e.target.value })}
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-neutral-900">Valor Pago *</label>
            <input
              type="number"
              required
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
              value={markPaidData.paidAmount}
              onChange={(e) => setMarkPaidData({ ...markPaidData, paidAmount: e.target.value })}
              placeholder="0,00"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={confirmMarkAsPaid}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Confirmar Pagamento
            </button>
            <button
              onClick={closeMarkPaidModal}
              className="bg-neutral-600 text-white px-6 py-2 rounded-lg hover:bg-neutral-700 font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* Recurring Expense Modal */}
      <Modal
        isOpen={isRecurringModalOpen}
        onClose={() => {
          setIsRecurringModalOpen(false)
          resetRecurringForm()
        }}
        title="Criar Despesa Recorrente"
        size="lg"
      >
        <form onSubmit={handleRecurringFormSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-900">Descrição *</label>
            <input
              type="text"
              value={recurringFormData.description}
              onChange={(e) => setRecurringFormData({ ...recurringFormData, description: e.target.value })}
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-900">Valor *</label>
            <input
              type="number"
              value={recurringFormData.amount}
              onChange={(e) => setRecurringFormData({ ...recurringFormData, amount: e.target.value })}
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-900">Data de Início *</label>
            <input
              type="date"
              value={recurringFormData.dueDate}
              onChange={(e) => setRecurringFormData({ ...recurringFormData, dueDate: e.target.value })}
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-900">Categoria *</label>
            <select
              value={recurringFormData.category}
              onChange={(e) => setRecurringFormData({ ...recurringFormData, category: e.target.value })}
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
              required
            >
              {expenseCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-blue-900">Frequência</label>
              <select
                value={recurringFormData.frequency}
                onChange={(e) => setRecurringFormData({ ...recurringFormData, frequency: e.target.value })}
                className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-blue-900"
              >
                {frequencyOptions.map(freq => (
                  <option key={freq.value} value={freq.value}>{freq.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-blue-900">Repetir a cada</label>
              <input
                type="number"
                min="1"
                max="12"
                value={recurringFormData.interval}
                onChange={(e) => setRecurringFormData({ ...recurringFormData, interval: parseInt(e.target.value) || 1 })}
                className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-blue-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-blue-900">
                Dia do mês (opcional)
                <span className="text-xs text-blue-600 block">Para mensal/trimestral (1-31)</span>
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={recurringFormData.dayOfMonth}
                onChange={(e) => setRecurringFormData({ ...recurringFormData, dayOfMonth: e.target.value })}
                className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-blue-900"
                placeholder="Deixe vazio para usar dia atual"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-blue-900">
                Máximo de ocorrências (opcional)
                <span className="text-xs text-blue-600 block">Deixe vazio para repetir indefinidamente</span>
              </label>
              <input
                type="number"
                min="1"
                value={recurringFormData.maxOccurrences}
                onChange={(e) => setRecurringFormData({ ...recurringFormData, maxOccurrences: e.target.value })}
                className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-blue-900"
                placeholder="Ex: 12 para um ano"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-900">Projeto</label>
            <select
              value={recurringFormData.contractId}
              onChange={(e) => setRecurringFormData({ ...recurringFormData, contractId: e.target.value })}
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
            >
              <option value="">Nenhum projeto específico</option>
              {contracts.map(contract => (
                <option key={contract.id} value={contract.id}>
                  {contract.clientName} - {contract.projectName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-900">Fornecedor</label>
            <input
              type="text"
              value={recurringFormData.vendor}
              onChange={(e) => setRecurringFormData({ ...recurringFormData, vendor: e.target.value })}
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={formLoading}
              className="bg-green-700 text-white px-6 py-2 rounded-lg hover:bg-green-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formLoading ? 'Criando...' : '🔄 Criar Despesa Recorrente'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRecurringModalOpen(false)
                resetRecurringForm()
              }}
              disabled={formLoading}
              className="bg-neutral-600 text-white px-6 py-2 rounded-lg hover:bg-neutral-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}