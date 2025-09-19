'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Modal from '../../components/Modal'
import ExpenseForm from '../../components/forms/ExpenseForm'

// Helper function for date display
function formatDateForDisplay(date: string | Date): string {
  if (!date) return ''
  if (typeof date === 'string' && date.includes('T')) {
    const datePart = date.split('T')[0]
    const [year, month, day] = datePart.split('-')
    return `${day}/${month}/${year}`
  }
  const d = new Date(date)
  return format(d, 'dd/MM/yyyy')
}

export default function ExpensesTab() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [expenses, setExpenses] = useState([])
  const [filteredExpenses, setFilteredExpenses] = useState([])
  const [contracts, setContracts] = useState([])
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, overdue: 0, count: 0 })
  const [loading, setLoading] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

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
    'materiais', 'mão-de-obra', 'equipamentos', 'transporte', 'escritório', 'software',
    'utilidades', 'aluguel', 'seguro', 'marketing', 'serviços-profissionais', 'outros'
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

  useEffect(() => {
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
      setSummary(data.summary || { total: 0, paid: 0, pending: 0, overdue: 0, count: 0 })
    } catch (error) {
      console.error('Falha ao buscar despesas:', error)
      setExpenses([])
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
        await fetchExpenses()
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

  async function markAsPaid(expense: any) {
    if (!confirm('Mark this expense as paid?')) {
      return
    }

    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expense,
          status: 'paid',
          paidDate: new Date().toISOString().split('T')[0],
          paidAmount: expense.amount
        })
      })

      if (res.ok) {
        await fetchExpenses()
      } else {
        alert('Failed to update expense')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update expense')
    }
  }

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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border-2 border-neutral-300 p-4 rounded-lg">
          <p className="text-sm font-medium text-neutral-900">Total</p>
          <p className="text-xl font-bold text-neutral-900">R$ {summary.total.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white border-2 border-neutral-300 p-4 rounded-lg">
          <p className="text-sm font-medium text-neutral-900">Pendente</p>
          <p className="text-xl font-bold text-yellow-700">R$ {summary.pending.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white border-2 border-neutral-300 p-4 rounded-lg">
          <p className="text-sm font-medium text-neutral-900">Pago</p>
          <p className="text-xl font-bold text-green-700">R$ {summary.paid.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white border-2 border-neutral-300 p-4 rounded-lg">
          <p className="text-sm font-medium text-neutral-900">Atrasado</p>
          <p className="text-xl font-bold text-red-700">R$ {summary.overdue.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white border-2 border-neutral-300 p-4 rounded-lg">
          <p className="text-sm font-medium text-neutral-900">Qtd</p>
          <p className="text-xl font-bold text-neutral-900">{summary.count}</p>
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

      {/* Expenses List */}
      {loading ? (
        <p>Carregando...</p>
      ) : filteredExpenses.length === 0 ? (
        <p className="text-neutral-900 font-medium">
          {searchQuery ? `Nenhuma despesa encontrada para "${searchQuery}"` : 'Nenhuma despesa ainda'}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredExpenses.map((expense: any) => (
            <div key={expense.id} className="bg-white border-2 border-neutral-300 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-neutral-900 mb-1">{expense.description}</h3>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          expense.status === 'paid' ? 'bg-green-500' :
                          expense.status === 'pending' ? 'bg-yellow-500' :
                          expense.status === 'overdue' ? 'bg-red-500' :
                          'bg-neutral-500'
                        }`}></div>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          statusOptions.find(s => s.value === expense.status)?.color || 'bg-neutral-100 text-neutral-900'
                        }`}>
                          {statusOptions.find(s => s.value === expense.status)?.label || expense.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-neutral-900">R$ {expense.amount.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                  {expense.paidDate && (
                    <p className="text-sm text-green-700 mb-2">
                      Pago em: {formatDateForDisplay(expense.paidDate)}
                      {expense.paidAmount && expense.paidAmount !== expense.amount &&
                        ` - R$ ${expense.paidAmount.toLocaleString('pt-BR')}`}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
                    <span>📅 {formatDateForDisplay(expense.dueDate)}</span>
                    <span>🏷️ {expense.category}</span>
                    <span>📋 {expenseTypes.find(t => t.value === expense.type)?.label || expense.type}</span>
                    {expense.vendor && (
                      <span>🏢 {expense.vendor}</span>
                    )}
                  </div>
                  {expense.contract && (
                    <p className="text-sm text-neutral-900">
                      Projeto: {expense.contract.clientName} - {expense.contract.projectName}
                    </p>
                  )}
                  {expense.vendor && (
                    <p className="text-sm text-neutral-900">Fornecedor: {expense.vendor}</p>
                  )}
                  {expense.invoiceNumber && (
                    <p className="text-sm text-neutral-900">Fatura: {expense.invoiceNumber}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {(expense.status === 'pending' || expense.status === 'overdue') && (
                    <button
                      onClick={() => markAsPaid(expense)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 font-medium transition-colors"
                    >
                      Marcar como Pago
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(expense)}
                    className="bg-blue-700 text-white px-3 py-1 rounded text-sm hover:bg-blue-800 font-medium transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteExpense(expense.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 font-medium transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
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
          contracts={contracts}
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
          loading={formLoading}
        />
      </Modal>
    </div>
  )
}