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

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-6">
        <div>
          <label className="block text-sm font-semibold text-neutral-900 mb-2">Projeto</label>
          <select
            className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
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

        <div>
          <label className="block text-sm font-semibold text-neutral-900 mb-2">Status</label>
          <select
            className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
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

        <div>
          <label className="block text-sm font-semibold text-neutral-900 mb-2">Categoria</label>
          <select
            className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
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

        <div>
          <label className="block text-sm font-semibold text-neutral-900 mb-2">Tipo</label>
          <select
            className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
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

        <div>
          <label className="block text-sm font-semibold text-neutral-900 mb-2">Ordenar Por</label>
          <select
            className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          >
            <option value="dueDate">Data de Vencimento</option>
            <option value="amount">Valor</option>
            <option value="status">Status</option>
            <option value="category">Categoria</option>
            <option value="vendor">Fornecedor</option>
            <option value="createdAt">Data de Criação</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-900 mb-2">Ordem</label>
          <select
            className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.sortOrder}
            onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
          >
            <option value="asc">Crescente</option>
            <option value="desc">Decrescente</option>
          </select>
        </div>
      </div>

      {/* Expenses List */}
      {loading ? (
        <p>Carregando...</p>
      ) : expenses.length === 0 ? (
        <p className="text-neutral-900 font-medium">Nenhuma despesa ainda</p>
      ) : (
        <div className="space-y-4">
          {expenses.map((expense: any) => (
            <div key={expense.id} className="bg-white border-2 border-neutral-300 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-lg text-neutral-900">{expense.description}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      statusOptions.find(s => s.value === expense.status)?.color || 'bg-neutral-100 text-neutral-900'
                    }`}>
                      {statusOptions.find(s => s.value === expense.status)?.label || expense.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-neutral-900">Valor: R$ {expense.amount.toLocaleString('pt-BR')}</p>
                  <p className="text-sm text-neutral-900">Vencimento: {formatDateForDisplay(expense.dueDate)}</p>
                  {expense.paidDate && (
                    <p className="text-sm text-green-700">
                      Pago em: {formatDateForDisplay(expense.paidDate)}
                      {expense.paidAmount && expense.paidAmount !== expense.amount &&
                        ` - R$ ${expense.paidAmount.toLocaleString('pt-BR')}`}
                    </p>
                  )}
                  <p className="text-sm text-neutral-900">Categoria: {expense.category}</p>
                  <p className="text-sm text-neutral-900">
                    Tipo: {expenseTypes.find(t => t.value === expense.type)?.label || expense.type}
                  </p>
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