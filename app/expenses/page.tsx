'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatDateForInput, formatDateFull as formatDateForDisplay } from '@/lib/date-utils'
import Modal from '../components/Modal'
import ExpenseForm from '../components/forms/ExpenseForm'
import RecurringExpenseActionModal from '../components/RecurringExpenseActionModal'

function ExpensesPageContent() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [expenses, setExpenses] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([])
  const [uniqueStatuses] = useState(['pending', 'paid', 'overdue', 'cancelled'])
  const [filters, setFilters] = useState({
    contractId: 'all',
    status: 'pending',
    category: 'all',
    type: 'all',
    isRecurring: 'all',
    sortBy: 'dueDate',
    sortOrder: 'asc',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredExpenses, setFilteredExpenses] = useState([])
  const [recurringActionModal, setRecurringActionModal] = useState<{
    isOpen: boolean
    expense: any
    action: 'edit' | 'delete'
  }>({
    isOpen: false,
    expense: null,
    action: 'edit'
  })

  const expenseCategories = [
    'Salários', 'Escritório', 'Software', 'Marketing', 'Transporte', 'Equipamentos', 'Impostos', 'Outros'
  ]

  const expenseTypes = [
    { value: 'operational', label: 'Operacional' },
    { value: 'project', label: 'Projeto' },
    { value: 'administrative', label: 'Administrativo' },
  ]

  useEffect(() => {
    fetchContracts()
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [filters])

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
        expense.notes?.toLowerCase().includes(query)
      )
      setFilteredExpenses(filtered)
    }
  }, [expenses, searchQuery])

  // Handle auto-edit when URL parameter is present
  useEffect(() => {
    if (editId && expenses.length > 0) {
      const expenseToEdit = expenses.find((e: any) => e.id === editId)
      if (expenseToEdit) {
        openEditModal(expenseToEdit)
      }
    }
  }, [editId, expenses])

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

  async function fetchExpenses() {
    try {
      const params = new URLSearchParams()
      if (filters.contractId !== 'all') params.set('contractId', filters.contractId)
      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.category !== 'all') params.set('category', filters.category)
      if (filters.type !== 'all') params.set('type', filters.type)
      if (filters.isRecurring !== 'all') params.set('isRecurring', filters.isRecurring)
      params.set('sortBy', filters.sortBy)
      params.set('sortOrder', filters.sortOrder)

      const res = await fetch(`/api/expenses?${params.toString()}`)

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error(`Failed to fetch expenses: ${res.status}`)
      }

      const data = await res.json()
      const expensesData = data.expenses || []
      setExpenses(expensesData)

      // Extract unique categories for filter dropdown
      const categories = [...new Set(expensesData.map((e: any) => e.category).filter(Boolean))] as string[]
      setUniqueCategories(categories)
    } catch (error) {
      console.error('Falha ao buscar despesas:', error)
      setExpenses([])
    } finally {
      setLoading(false)
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

    setEditingExpense(expense)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingExpense(null)
  }

  async function handleFormSubmit(expenseData: any) {
    try {
      // If creating a recurring expense, use the recurring-expenses endpoint
      if (expenseData.isRecurring && expenseData.recurringData && !editingExpense) {
        const recurringPayload = {
          description: expenseData.description,
          amount: expenseData.amount,
          category: expenseData.category,
          frequency: expenseData.recurringData.frequency,
          interval: expenseData.recurringData.interval,
          startDate: expenseData.dueDate, // Use dueDate as startDate for recurring
          endDate: expenseData.recurringData.endDate || null,
          maxOccurrences: expenseData.recurringData.maxOccurrences || null,
          contractId: expenseData.contractId || null,
          vendor: expenseData.vendor || null,
          invoiceNumber: expenseData.invoiceNumber || null,
          type: expenseData.type || 'operational',
          notes: expenseData.notes || null,
          isActive: true
        }

        const res = await fetch('/api/recurring-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recurringPayload),
        })

        if (res.ok) {
          closeModal()
          fetchExpenses()
        } else {
          const error = await res.json()
          alert('Erro ao criar despesa recorrente: ' + JSON.stringify(error))
        }
      } else if (editingExpense && editingExpense._recurringScope && editingExpense.recurringExpenseId) {
        // Editing a recurring expense with scope
        const scope = editingExpense._recurringScope
        const updatedData = {
          description: expenseData.description,
          amount: expenseData.amount,
          category: expenseData.category,
          vendor: expenseData.vendor || undefined,
          notes: expenseData.notes || undefined,
        }

        const res = await fetch(`/api/expenses/${editingExpense.id}/recurring-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'edit',
            scope: scope,
            updatedData: updatedData
          })
        })

        if (res.ok) {
          const result = await res.json()
          alert(`${result.result.updated} despesa(s) atualizada(s) com sucesso!`)
          closeModal()
          fetchExpenses()
        } else {
          const error = await res.json()
          alert('Erro ao editar despesa recorrente: ' + (error.message || JSON.stringify(error)))
        }
      } else {
        // Regular expense creation/update
        const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses'
        const method = editingExpense ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        })

        if (res.ok) {
          closeModal()
          fetchExpenses()
        } else {
          const error = await res.json()
          alert('Erro: ' + JSON.stringify(error))
        }
      }
    } catch (error) {
      console.error('Error submitting expense:', error)
      alert(editingExpense ? 'Falha ao atualizar despesa' : 'Falha ao criar despesa')
    }
  }

  async function deleteExpense(id: string, expense: any) {
    // Check if this is a recurring expense
    if (expense.recurringExpenseId) {
      setRecurringActionModal({
        isOpen: true,
        expense: expense,
        action: 'delete'
      })
      return
    }

    if (!confirm(`Tem certeza que deseja excluir a despesa "${expense.description}"?`)) return

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchExpenses()
      } else {
        alert('Falha ao excluir despesa')
      }
    } catch (error) {
      alert('Falha ao excluir despesa')
    }
  }

  async function handleRecurringAction(scope: 'this' | 'future' | 'all') {
    const { expense, action } = recurringActionModal

    if (!expense) return

    try {
      if (action === 'delete') {
        // Delete with scope using recurring-action endpoint
        const res = await fetch(`/api/expenses/${expense.id}/recurring-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            scope: scope
          })
        })

        if (res.ok) {
          const result = await res.json()
          alert(`${result.result.deleted} despesa(s) excluída(s) com sucesso!`)
          fetchExpenses()
        } else {
          const error = await res.json()
          alert('Falha ao excluir despesa recorrente: ' + (error.message || JSON.stringify(error)))
        }
      } else if (action === 'edit') {
        // For edit, we need to open the edit modal with the expense and store the scope
        setEditingExpense({ ...expense, _recurringScope: scope })
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error('Error handling recurring action:', error)
      alert(`Erro ao ${action === 'delete' ? 'excluir' : 'editar'} despesa recorrente`)
    }
  }

  async function markAsPaid(expense: any) {
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paidDate: new Date().toISOString(),
          paidAmount: expense.amount,
        }),
      })

      if (res.ok) {
        fetchExpenses()
      }
    } catch (error) {
      console.error('Error marking as paid:', error)
      alert('Erro ao marcar como paga')
    }
  }

  function getStatusDisplay(expense: any) {
    const status = expense.status
    const statusOptions = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      paid: { label: 'Pago', color: 'bg-green-100 text-green-800' },
      overdue: { label: 'Atrasado', color: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Cancelado', color: 'bg-neutral-100 text-neutral-900' },
    }
    return statusOptions[status as keyof typeof statusOptions] || { label: status, color: 'bg-neutral-100 text-neutral-900' }
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 sm:px-6 lg:px-8 py-6">
      {/* Filters - Horizontal Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-white rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">Status:</label>
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">Todos</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>
                {status === 'pending' ? 'Pendente' : status === 'paid' ? 'Pago' : status === 'overdue' ? 'Atrasado' : 'Cancelado'}
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
              <option key={category} value={category}>{category}</option>
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
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">Recorrente:</label>
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.isRecurring}
            onChange={(e) => setFilters({ ...filters, isRecurring: e.target.value })}
          >
            <option value="all">Todos</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">Ordenar:</label>
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          >
            <option value="dueDate">Data de Vencimento</option>
            <option value="amount">Valor</option>
            <option value="description">Descrição</option>
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

        {(filters.status !== 'pending' || filters.category !== 'all' || filters.type !== 'all' || filters.isRecurring !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setFilters({ contractId: 'all', status: 'pending', category: 'all', type: 'all', isRecurring: 'all', sortBy: 'dueDate', sortOrder: 'asc' })
              setSearchQuery('')
            }}
            className="ml-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Search and Add Button */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar despesas, fornecedores, descrições..."
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
        <button
          onClick={openAddModal}
          className="bg-blue-700 text-white px-4 py-3 rounded-lg hover:bg-blue-800 font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Despesa
        </button>
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {filteredExpenses.map((expense: any) => {
                  const statusDisplay = getStatusDisplay(expense)
                  return (
                    <tr key={expense.id} className="group hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-semibold text-neutral-900 flex items-center gap-2">
                            {expense.recurringExpenseId && <span title="Despesa recorrente">🔄</span>}
                            {expense.description}
                          </div>
                          {expense.vendor && <div className="text-sm text-neutral-600">{expense.vendor}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-bold text-lg text-neutral-900">
                          R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusDisplay.color}`}>
                          {statusDisplay.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-900">
                        {formatDateForDisplay(expense.dueDate)}
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-900">
                        {expense.category || '-'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {expense.status === 'pending' && (
                            <button
                              onClick={() => markAsPaid(expense)}
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
                            onClick={() => deleteExpense(expense.id, expense)}
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
        <ExpenseForm
          expense={editingExpense}
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
          contracts={contracts}
        />
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

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8">Carregando...</div>}>
      <ExpensesPageContent />
    </Suspense>
  )
}
