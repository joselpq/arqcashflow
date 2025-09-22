'use client'

import { useState, useEffect } from 'react'
import { formatDateForInput, getTodayDateString } from '@/lib/date-utils'

interface EnhancedExpenseFormProps {
  expense?: any
  contracts: any[]
  onSubmit: (expenseData: any, isRecurring: boolean) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function EnhancedExpenseForm({ expense, contracts, onSubmit, onCancel, loading = false }: EnhancedExpenseFormProps) {
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

  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringData, setRecurringData] = useState({
    frequency: 'monthly',
    interval: 1,
    endDate: '',
    maxOccurrences: '',
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

  const frequencyOptions = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'annual', label: 'Anual' },
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
      // Disable recurring for editing
      setIsRecurring(false)
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
      setIsRecurring(false)
      setRecurringData({
        frequency: 'monthly',
        interval: 1,
        endDate: '',
        maxOccurrences: '',
      })
    }
  }, [expense])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const amount = parseFloat(formData.amount)
    if (isNaN(amount)) {
      alert('Por favor, insira um valor válido')
      return
    }

    let paidAmount = null
    if (formData.paidAmount) {
      paidAmount = parseFloat(formData.paidAmount)
      if (isNaN(paidAmount)) {
        alert('Por favor, insira um valor pago válido')
        return
      }
    }

    // If recurring, validate recurring data
    if (isRecurring && !expense) {
      const interval = parseInt(recurringData.interval.toString())
      if (isNaN(interval) || interval < 1) {
        alert('Por favor, insira um intervalo válido (1 ou maior)')
        return
      }

      // Auto-calculate dayOfMonth from startDate
      const startDate = new Date(formData.dueDate)
      const dayOfMonth = startDate.getDate()

      const maxOccurrences = recurringData.maxOccurrences ? parseInt(recurringData.maxOccurrences) : null
      if (maxOccurrences && maxOccurrences < 1) {
        alert('Por favor, insira um número de ocorrências válido')
        return
      }

      // Prepare recurring expense data
      const recurringExpenseData = {
        description: formData.description,
        amount: amount,
        category: formData.category,
        frequency: recurringData.frequency,
        interval: interval,
        dayOfMonth: dayOfMonth,
        startDate: formData.dueDate,
        endDate: recurringData.endDate || null,
        maxOccurrences: maxOccurrences,
        contractId: formData.contractId || null,
        vendor: formData.vendor || null,
        invoiceNumber: formData.invoiceNumber || null,
        type: 'operational',
        notes: formData.notes || null,
      }

      await onSubmit(recurringExpenseData, true)
    } else {
      // Regular expense data - prepare object separately to avoid timing issues
      const expenseData = {
        ...formData,
        amount,
        paidAmount,
        contractId: formData.contractId || null
      }

      await onSubmit(expenseData, false)
    }
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
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          disabled={loading}
        />
      </div>

      {/* Recurring Checkbox - Only for new expenses */}
      {!expense && (
        <div className="border-t border-neutral-200 pt-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-white border-2 border-neutral-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="isRecurring" className="ml-2 text-sm font-medium text-neutral-900">
              🔄 Repetir esta despesa automaticamente
            </label>
          </div>
        </div>
      )}

      {/* Dynamic Fields Based on Recurring Status */}
      {isRecurring && !expense ? (
        <>
          <div>
            <label className="block mb-2 font-medium text-neutral-900">Data de Início *</label>
            <input
              type="date"
              required
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-blue-900">Frequência</label>
              <select
                value={recurringData.frequency}
                onChange={(e) => setRecurringData({ ...recurringData, frequency: e.target.value })}
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
                value={recurringData.interval}
                onChange={(e) => setRecurringData({ ...recurringData, interval: parseInt(e.target.value) || 1 })}
                className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-blue-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* dayOfMonth is now auto-calculated from startDate */}

            <div>
              <label className="block text-sm font-medium mb-2 text-blue-900">
                Máximo de ocorrências (opcional)
                <span className="text-xs text-blue-600 block">Deixe vazio para repetir indefinidamente</span>
              </label>
              <input
                type="number"
                min="1"
                value={recurringData.maxOccurrences}
                onChange={(e) => setRecurringData({ ...recurringData, maxOccurrences: e.target.value })}
                className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-blue-900"
                placeholder="Ex: 12 para um ano"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-blue-900">
              Data final (opcional)
              <span className="text-xs text-blue-600 block">Deixe vazio para repetir indefinidamente</span>
            </label>
            <input
              type="date"
              value={recurringData.endDate}
              onChange={(e) => setRecurringData({ ...recurringData, endDate: e.target.value })}
              className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-blue-900"
            />
          </div>

          <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded">
            <strong>💡 Como funciona:</strong> Esta despesa será automaticamente criada nos próximos vencimentos.
            Você pode gerenciar e pausar a recorrência na listagem de despesas.
          </div>
        </>
      ) : (
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
      )}

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
              {category}
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
      {expense && !isRecurring && (
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
          {loading ? 'Salvando...' : (
            expense ? 'Atualizar' :
            isRecurring ? '🔄 Criar Despesa Recorrente' : 'Adicionar Despesa'
          )}
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