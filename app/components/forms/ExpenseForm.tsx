'use client'

import { useState, useEffect } from 'react'
import { formatDateForInput, getTodayDateString } from '@/lib/date-utils'

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
    dueDate: getTodayDateString(),
    category: 'Salários',
    contractId: '',
    vendor: '',
    invoiceNumber: '',
    notes: '',
    status: 'pending',
    paidDate: '',
    paidAmount: '',
  })

  const expenseCategories = [
    'Salários', 'Escritório', 'Software', 'Marketing', 'Transporte', 'Equipamentos', 'Impostos', 'Outros'
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
        category: expense.category || 'Salários',
        contractId: expense.contractId || '',
        vendor: expense.vendor || '',
        invoiceNumber: expense.invoiceNumber || '',
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
        dueDate: getTodayDateString(),
        category: 'Salários',
        contractId: '',
        vendor: '',
        invoiceNumber: '',
            notes: '',
        status: 'pending',
        paidDate: '',
        paidAmount: '',
      })
    }
  }, [expense])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // 🔍 DEBUG: Track value conversion at expense form level
    console.log('💸 EXPENSE FORM DEBUG - Value tracking:')
    console.log('  - Raw input value (string):', `"${formData.amount}"`)
    console.log('  - Input value type:', typeof formData.amount)
    console.log('  - Input value length:', formData.amount.length)

    const amount = parseFloat(formData.amount)
    console.log('  - parseFloat result:', amount)
    console.log('  - parseFloat result type:', typeof amount)
    console.log('  - Is number exact?:', amount.toString() === formData.amount)
    console.log('  - Precision test:', amount === Math.round(amount * 100) / 100)

    if (isNaN(amount)) {
      alert('Amount must be a valid number')
      return
    }

    let paidAmount = null
    if (formData.paidAmount) {
      console.log('  - Raw paidAmount (string):', `"${formData.paidAmount}"`)
      paidAmount = parseFloat(formData.paidAmount)
      console.log('  - parseFloat paidAmount result:', paidAmount)
      if (isNaN(paidAmount)) {
        alert('Por favor, insira um valor pago válido')
        return
      }
    }

    const submissionData = {
      ...formData,
      amount,
      paidAmount,
      contractId: formData.contractId || null // Send null if empty string
    }

    console.log('  - Final submission data:', submissionData)
    console.log('  - Final amount in submission:', submissionData.amount)
    console.log('  - Final paidAmount in submission:', submissionData.paidAmount)

    await onSubmit(submissionData)
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
          required
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
          value={formData.amount}
          onChange={(e) => {
            console.log('💸 EXPENSE FIELD DEBUG - Amount onChange:')
            console.log('  - Input event value:', e.target.value)
            console.log('  - Input event value type:', typeof e.target.value)
            console.log('  - Current formData.amount:', formData.amount)
            setFormData({ ...formData, amount: e.target.value })
          }}
          onBlur={(e) => {
            console.log('💸 EXPENSE FIELD DEBUG - Amount onBlur:')
            console.log('  - Blur event value:', e.target.value)
            console.log('  - Blur event value type:', typeof e.target.value)
            console.log('  - Current formData.amount after blur:', formData.amount)
          }}
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
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-neutral-900">Registrar Pagamento</h4>
            {(expense.status === 'pending' || expense.status === 'overdue') && (
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    paidDate: getTodayDateString(),
                    paidAmount: formData.amount,
                    status: 'paid'
                  })
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                  formData.amount ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                }`}
                disabled={loading || !formData.amount}
                title={formData.amount ? "Preencher com data de hoje e valor esperado" : "Preencha o valor primeiro"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Marcar como pago
              </button>
            )}
          </div>

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