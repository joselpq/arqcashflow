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

  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringData, setRecurringData] = useState<{
    frequency: string
    interval: number | ''
    endDate: string
    maxOccurrences: string
  }>({
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

      // Check if this is a recurring expense being edited
      if (expense._recurringExpense) {
        setIsRecurring(true)
        setRecurringData({
          frequency: expense._recurringExpense.frequency || 'monthly',
          interval: expense._recurringExpense.interval || 1,
          endDate: expense._recurringExpense.endDate ? formatDateForInput(expense._recurringExpense.endDate) : '',
          maxOccurrences: '', // Not stored in RecurringExpense schema
        })
      } else {
        setIsRecurring(false)
      }
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
      alert('Amount must be a valid number')
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

    const submissionData: any = {
      ...formData,
      amount,
      paidAmount,
      contractId: formData.contractId || null // Send null if empty string
    }

    // Add recurring data if creating or editing a recurring expense
    if (isRecurring) {
      const interval = parseInt(recurringData.interval.toString())
      if (isNaN(interval) || interval < 1) {
        alert('Intervalo deve ser um número maior que 0')
        return
      }

      submissionData.isRecurring = true
      submissionData.recurringData = {
        frequency: recurringData.frequency,
        interval,
        endDate: recurringData.endDate || null,
        maxOccurrences: recurringData.maxOccurrences ? parseInt(recurringData.maxOccurrences) : null,
      }
    }

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
          step="0.01"
          required
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          onWheel={(e) => e.currentTarget.blur()}
          disabled={loading}
        />
      </div>

      {/* Recurring Expense Section - Unified for both new and edit */}
      <div className="border-t border-neutral-200 pt-4 pb-4">
        {/* Show info banner when editing recurring expense */}
        {expense && expense._recurringExpense && expense._recurringScope && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-blue-900">Editando despesa recorrente</p>
                <p className="text-sm text-blue-700 mt-1">
                  {expense._recurringScope === 'this' && 'Alterações serão aplicadas apenas a esta despesa'}
                  {expense._recurringScope === 'future' && 'Alterações serão aplicadas a esta e futuras despesas'}
                  {expense._recurringScope === 'all' && 'Alterações serão aplicadas a todas as despesas da série'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Checkbox - always show, but disabled when editing recurring with scope */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded"
            disabled={loading || (expense && expense._recurringExpense && expense._recurringScope)}
          />
          <span className="font-medium text-neutral-900">🔄 Tornar esta despesa recorrente</span>
        </label>

        {/* Recurring fields - show when checkbox is checked OR when editing with proper scope */}
        {isRecurring && (
          <div className="mt-4 space-y-4 pl-6 border-l-2 border-blue-500">
            <div>
              <label className="block mb-2 font-medium text-neutral-900">Frequência *</label>
              <select
                required={isRecurring}
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
                value={recurringData.frequency}
                onChange={(e) => setRecurringData({ ...recurringData, frequency: e.target.value })}
                disabled={loading || (expense && expense._recurringScope === 'this')}
              >
                {frequencyOptions.map(freq => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-neutral-900">Intervalo *</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required={isRecurring}
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={recurringData.interval}
                onChange={(e) => {
                  const value = e.target.value
                  // Allow empty string for deletion, otherwise parse as number
                  if (value === '') {
                    setRecurringData({ ...recurringData, interval: '' })
                  } else {
                    const num = parseInt(value)
                    if (!isNaN(num) && num >= 1) {
                      setRecurringData({ ...recurringData, interval: num })
                    }
                  }
                }}
                onBlur={(e) => {
                  // On blur, ensure we have at least 1
                  if (recurringData.interval === '' || recurringData.interval < 1) {
                    setRecurringData({ ...recurringData, interval: 1 })
                  }
                }}
                onWheel={(e) => e.currentTarget.blur()}
                disabled={loading || (expense && expense._recurringScope === 'this')}
                placeholder="Ex: 1 para mensal, 2 para bimestral"
              />
              <p className="text-sm text-neutral-600 mt-1">
                Repetir a cada {recurringData.interval || 1} {recurringData.frequency === 'weekly' ? 'semana(s)' : recurringData.frequency === 'monthly' ? 'mês(es)' : recurringData.frequency === 'quarterly' ? 'trimestre(s)' : 'ano(s)'}
              </p>
            </div>

            <div>
              <label className="block mb-2 font-medium text-neutral-900">Data Final (Opcional)</label>
              <input
                type="date"
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
                value={recurringData.endDate}
                onChange={(e) => setRecurringData({ ...recurringData, endDate: e.target.value })}
                disabled={loading || (expense && expense._recurringScope === 'this')}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-neutral-900">Máximo de Ocorrências (Opcional)</label>
              <input
                type="number"
                min="1"
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={recurringData.maxOccurrences}
                onChange={(e) => setRecurringData({ ...recurringData, maxOccurrences: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                disabled={loading || (expense && expense._recurringScope === 'this')}
                placeholder="Deixe em branco para repetir indefinidamente"
              />
            </div>
          </div>
        )}
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
              step="0.01"
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={formData.paidAmount}
              onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
              onWheel={(e) => e.currentTarget.blur()}
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
