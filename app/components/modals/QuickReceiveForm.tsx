'use client'

import { useState } from 'react'
import Modal from '../Modal'
import { getTodayDateString } from '@/lib/utils/date'

interface QuickReceiveFormProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  entityType: 'receivable' | 'expense'
  entity: {
    id: string
    amount: number
    dueDate?: string
  }
  onSubmit: (data: { receivedDate: string; receivedAmount: number }) => Promise<void>
  loading?: boolean
}

export default function QuickReceiveForm({
  isOpen,
  onClose,
  onBack,
  entityType,
  entity,
  onSubmit,
  loading = false
}: QuickReceiveFormProps) {
  const [receivedDate, setReceivedDate] = useState(getTodayDateString())
  const [useFullAmount, setUseFullAmount] = useState(true)
  const [customAmount, setCustomAmount] = useState(entity.amount.toString())

  const title = entityType === 'receivable' ? 'Registrar Recebimento' : 'Registrar Pagamento'
  const whenLabel = entityType === 'receivable' ? 'Quando você recebeu?' : 'Quando você pagou?'
  const amountLabel = entityType === 'receivable' ? 'Qual valor foi recebido?' : 'Qual valor foi pago?'
  const fullAmountLabel = entityType === 'receivable' ? 'Valor total recebido' : 'Valor total pago'
  const diffAmountLabel = entityType === 'receivable' ? 'Recebi um valor diferente' : 'Paguei um valor diferente'

  function formatCurrency(amount: number): string {
    return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const amount = useFullAmount ? entity.amount : parseFloat(customAmount)

    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor válido')
      return
    }

    await onSubmit({
      receivedDate,
      receivedAmount: amount
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          disabled={loading}
        >
          ← Voltar
        </button>

        {/* Date Field */}
        <div>
          <label className="block mb-2 font-medium text-neutral-900">
            {whenLabel}
          </label>
          {entity.dueDate && (
            <p className="text-xs text-neutral-500 mb-2">
              Data de vencimento original: {new Date(entity.dueDate).toLocaleDateString('pt-BR')}
            </p>
          )}
          <input
            type="date"
            required
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
            className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
            disabled={loading}
          />
        </div>

        {/* Amount Field */}
        <div>
          <label className="block mb-2 font-medium text-neutral-900">
            {amountLabel}
          </label>

          {/* Full Amount Checkbox */}
          <div className="mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useFullAmount}
                onChange={(e) => setUseFullAmount(e.target.checked)}
                className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-neutral-700">
                {fullAmountLabel} ({formatCurrency(entity.amount)})
              </span>
            </label>
          </div>

          {/* Custom Amount Checkbox */}
          <div className="mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!useFullAmount}
                onChange={(e) => setUseFullAmount(!e.target.checked)}
                className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-neutral-700">{diffAmountLabel}</span>
            </label>
          </div>

          {/* Custom Amount Input (only if different amount selected) */}
          {!useFullAmount && (
            <div className="mt-3">
              <input
                type="number"
                step="0.01"
                required
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0.00"
                disabled={loading}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200 pt-4" />

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white border-2 border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-neutral-300 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Confirmar ✓'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
