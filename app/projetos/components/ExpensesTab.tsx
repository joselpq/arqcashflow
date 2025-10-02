'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatDateForInput, formatDateFull as formatDateForDisplay, getTodayDateString, getExpenseActualStatus } from '@/lib/date-utils'
import Modal from '../../components/Modal'
import EnhancedExpenseForm from '../../components/forms/EnhancedExpenseForm'
import RecurringExpenseActionModal from '../../components/RecurringExpenseActionModal'
import DateRangePicker, { DateRange } from '../../components/DateRangePicker'

export default function ExpensesTab() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [expenses, setExpenses] = useState<any[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([])
  // Removed recurringExpenses state - now handled through regular expenses filter
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  // Removed viewMode - now using filters.recurrenceType

  // Recurring expense action modal state
  const [recurringActionModal, setRecurringActionModal] = useState<{
    isOpen: boolean
    expense: any
    action: 'edit' | 'delete'
  }>({
    isOpen: false,
    expense: null,
    action: 'edit'
  })
  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false)
  const [expenseToMark, setExpenseToMark] = useState<any>(null)
  const [markPaidData, setMarkPaidData] = useState({
    paidDate: '',
    paidAmount: ''
  })
  // Removed recurring modal state - now handled in unified form

  const [filters, setFilters] = useState({
    contractId: 'all',
    status: 'pending',
    category: 'all',
    recurrenceType: 'all', // 'all', 'regular', 'recurring'
    sortBy: 'dueDate',
    sortOrder: 'asc',
    startDate: '',
    endDate: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null)

  const expenseCategories = [
    'Salários', 'Escritório', 'Software', 'Marketing', 'Transporte', 'Equipamentos', 'Impostos', 'Outros'
  ]

  const recurrenceTypes = [
    { value: 'all', label: 'Todas' },
    { value: 'regular', label: 'Não Recorrentes' },
    { value: 'recurring', label: 'Recorrentes' },
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
    // Always use fetchExpenses - it handles filtering internally
    fetchExpenses()
    fetchContracts()
  }, [filters])

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
      // Prepare filters for API call
      const apiFilters: any = { ...filters }

      // Handle recurrence type filter
      if (filters.recurrenceType === 'regular') {
        apiFilters.isRecurring = 'false'
      } else if (filters.recurrenceType === 'recurring') {
        apiFilters.isRecurring = 'true'
      }
      // Remove recurrenceType as it's not an API filter
      delete apiFilters.recurrenceType

      // Add date range filters
      if (filters.startDate) {
        apiFilters.startDate = filters.startDate
      }
      if (filters.endDate) {
        apiFilters.endDate = filters.endDate
      }

      const params = new URLSearchParams(apiFilters)
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

  // Removed fetchRecurringExpenses - now handled through regular fetchExpenses with filter

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
    // Check if this is a recurring expense
    if (expense.recurringExpenseId) {
      setRecurringActionModal({
        isOpen: true,
        expense: expense,
        action: 'edit'
      })
      return
    }

    // Regular expense edit
    setEditingExpense(expense)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingExpense(null)
  }

  async function handleFormSubmit(expenseData: any, isRecurring: boolean) {
    setFormLoading(true)
    try {
      if (isRecurring && !editingExpense) {
        // Handle recurring expense creation
        const response = await fetch('/api/recurring-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        })

        if (response.ok) {
          alert('Despesa recorrente criada com sucesso!')
          closeModal()
          // Switch filter to show recurring expenses
          setFilters({ ...filters, recurrenceType: 'recurring' })
        } else {
          const error = await response.json()
          alert(`Erro: ${error.error}`)
        }
      } else if (editingExpense && editingExpense.recurringExpenseId && editingExpense.recurringEditScope) {
        // Handle recurring expense edit
        const response = await fetch(`/api/expenses/${editingExpense.id}/recurring-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'edit',
            scope: editingExpense.recurringEditScope,
            updatedData: {
              description: expenseData.description,
              amount: typeof expenseData.amount === 'string' ? parseFloat(expenseData.amount) : expenseData.amount,
              category: expenseData.category,
              vendor: expenseData.vendor,
              notes: expenseData.notes,
            }
          }),
        })

        if (response.ok) {
          const result = await response.json()
          alert(`${result.result.updated} despesa(s) atualizada(s) com sucesso!`)
          closeModal()
          await fetchExpenses()
        } else {
          const error = await response.json()
          alert(`Erro: ${error.error}`)
        }
      } else {
        // Handle regular expense
        const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses'
        const method = editingExpense ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData)
        })

        if (res.ok) {
          closeModal()
          await fetchExpenses()
        } else {
          alert('Erro ao salvar despesa')
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao salvar despesa')
    } finally {
      setFormLoading(false)
    }
  }

  // Handle recurring expense actions
  async function handleRecurringAction(scope: 'this' | 'future' | 'all') {
    const { expense, action } = recurringActionModal

    try {
      if (action === 'edit') {
        await handleRecurringEdit(expense, scope)
      } else {
        await handleRecurringDelete(expense, scope)
      }
    } catch (error) {
      console.error(`Error performing recurring ${action}:`, error)
      alert(`Erro ao ${action === 'edit' ? 'editar' : 'excluir'} despesa recorrente`)
    }
  }

  async function handleRecurringEdit(expense: any, scope: 'this' | 'future' | 'all') {
    // For the projetos page, we'll open the edit modal with the enhanced form
    // The EnhancedExpenseForm will handle the recurring logic
    setEditingExpense({ ...expense, recurringEditScope: scope })
    setIsModalOpen(true)
  }

  async function handleRecurringDelete(expense: any, scope: 'this' | 'future' | 'all') {
    const response = await fetch(`/api/expenses/${expense.id}/recurring-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        scope: scope
      })
    })

    if (response.ok) {
      const result = await response.json()
      await fetchExpenses()
      alert(`${result.result.deleted} despesa(s) excluída(s) com sucesso!`)
    } else {
      throw new Error('Failed to delete recurring expense')
    }
  }

  // Removed unused recurring form functions - now handled in EnhancedExpenseForm

  async function deleteExpense(expense: any) {
    // Check if this is a recurring expense
    if (expense.recurringExpenseId) {
      setRecurringActionModal({
        isOpen: true,
        expense: expense,
        action: 'delete'
      })
      return
    }

    // Regular expense delete
    if (!confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
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

  // Removed unused recurring management functions

  return (
    <div>
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-neutral-900">Despesas</h2>
        <button
          onClick={openAddModal}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Despesa
        </button>
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

      {/* Date Range Filter */}
      <div className="mb-4 p-4 bg-white border-2 border-neutral-300 rounded-lg">
        <h3 className="text-sm font-medium text-neutral-900 mb-3">📅 Filtrar por período</h3>
        <DateRangePicker
          selectedRange={selectedDateRange}
          onRangeChange={(range) => {
            setSelectedDateRange(range)
            setFilters({
              ...filters,
              startDate: range?.startDate || '',
              endDate: range?.endDate || ''
            })
          }}
        />
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
            value={filters.recurrenceType}
            onChange={(e) => setFilters({ ...filters, recurrenceType: e.target.value })}
          >
            {recurrenceTypes.map(type => (
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

        {(filters.contractId !== 'all' || filters.status !== 'pending' || filters.category !== 'all' || filters.recurrenceType !== 'all' || selectedDateRange || searchQuery) && (
          <button
            onClick={() => {
              setFilters({ contractId: 'all', status: 'pending', category: 'all', recurrenceType: 'all', sortBy: 'dueDate', sortOrder: 'asc', startDate: '', endDate: '' })
              setSearchQuery('')
              setSelectedDateRange(null)
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
      ) : filteredExpenses.length === 0 ? (
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
                        {expense.isRecurring && (
                          <div className="text-xs text-blue-600">
                            🔄 Recorrente
                          </div>
                        )}
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
                          onClick={() => deleteExpense(expense)}
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
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingExpense ? 'Editar Despesa' : 'Adicionar Despesa'}
        size="lg"
      >
        <EnhancedExpenseForm
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

      {/* Recurring Expense Action Modal */}
      <RecurringExpenseActionModal
        isOpen={recurringActionModal.isOpen}
        onClose={() => setRecurringActionModal({ ...recurringActionModal, isOpen: false })}
        expense={recurringActionModal.expense}
        action={recurringActionModal.action}
        onActionConfirm={handleRecurringAction}
      />
    </div>
  )
}