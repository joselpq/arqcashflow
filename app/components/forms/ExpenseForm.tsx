'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

// Helper functions for date conversion with UTC handling
function formatDateForInput(date: string | Date): string {
  if (!date) return ''
  if (typeof date === 'string' && date.includes('T')) {
    return date.split('T')[0]
  }
  const d = new Date(date)
  return format(d, 'yyyy-MM-dd')
}

interface ExpenseFormProps {
  expense?: any
  contracts: any[]
  onSubmit: (expenseData: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function ExpenseForm({ expense, contracts, onSubmit, onCancel, loading = false }: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    dueDate: '',
    category: 'materiais',
    contractId: '',
    vendor: '',
    invoiceNumber: '',
    type: 'operational',
    notes: '',
    status: 'pending',
    paidDate: '',
    paidAmount: '',
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
    { value: 'pending', label: 'Pendente' },
    { value: 'paid', label: 'Pago' },
    { value: 'overdue', label: 'Atrasado' },
    { value: 'cancelled', label: 'Cancelado' },
  ]

  // Initialize form data when expense changes
  useEffect(() => {
    if (expense) {
      setFormData({
        description: expense.description || '',
        amount: expense.amount ? expense.amount.toString() : '',
        dueDate: expense.dueDate ? formatDateForInput(expense.dueDate) : '',
        category: expense.category || 'materiais',
        contractId: expense.contractId || '',
        vendor: expense.vendor || '',
        invoiceNumber: expense.invoiceNumber || '',
        type: expense.type || 'operational',
        notes: expense.notes || '',
        status: expense.status || 'pending',
        paidDate: expense.paidDate ? formatDateForInput(expense.paidDate) : '',
        paidAmount: expense.paidAmount ? expense.paidAmount.toString() : '',
      })
    } else {
      // Reset form for new expense
      setFormData({
        description: '',
        amount: '',
        dueDate: '',
        category: 'materiais',
        contractId: '',
        vendor: '',
        invoiceNumber: '',
        type: 'operational',
        notes: '',
        status: 'pending',
        paidDate: '',
        paidAmount: '',
      })
    }
  }, [expense])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const amount = parseFloat(formData.amount)
    if (isNaN(amount)) {
      alert('Amount must be a valid number')
      return
    }

    let paidAmount = null
    if (formData.paidAmount) {
      paidAmount = parseFloat(formData.paidAmount)
      if (isNaN(paidAmount)) {
        alert('Paid amount must be a valid number')
        return
      }
    }

    await onSubmit({
      ...formData,
      amount,
      paidAmount,
      contractId: formData.contractId || null // Send null if empty string
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-2 font-medium text-neutral-900">Descrição *</label>
        <input
          type="text"
          required
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block mb-2 font-medium text-neutral-900">Valor *</label>
        <input
          type="number"
          step="0.01"
          required
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block mb-2 font-medium text-neutral-900">Data de Vencimento *</label>
        <input
          type="date"
          required
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block mb-2 font-medium text-neutral-900">Categoria *</label>
        <select
          required
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          disabled={loading}
        >
          {expenseCategories.map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2 font-medium text-neutral-900">Tipo *</label>
        <select
          required
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          disabled={loading}
        >
          {expenseTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2 font-medium text-neutral-900">Projeto (Opcional)</label>
        <select
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
          value={formData.contractId}
          onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
          disabled={loading}
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
        <label className="block mb-2 font-medium text-neutral-900">Fornecedor</label>
        <input
          type="text"
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
          value={formData.vendor}
          onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block mb-2 font-medium text-neutral-900">Número da Fatura</label>
        <input
          type="text"
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
          value={formData.invoiceNumber}
          onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block mb-2 font-medium text-neutral-900">Observações</label>
        <textarea
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          disabled={loading}
        />
      </div>

      {/* Payment recording section for editing existing expenses */}
      {expense && (
        <div className="border-t border-neutral-200 pt-4">
          <h4 className="font-medium text-neutral-900 mb-3">Registrar Pagamento</h4>

          <div>
            <label className="block mb-2 font-medium text-neutral-900">Status</label>
            <select
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              disabled={loading}
            >
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium text-neutral-900">Data de Pagamento</label>
            <input
              type="date"
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
              value={formData.paidDate}
              onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-neutral-900">Valor Pago</label>
            <input
              type="number"
              step="0.01"
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
              value={formData.paidAmount}
              onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
              disabled={loading}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : (expense ? 'Atualizar' : 'Adicionar')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="bg-neutral-600 text-white px-6 py-2 rounded-lg hover:bg-neutral-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}