'use client'

import { useState } from 'react'
import Modal from '../Modal'
import { formatDateForInput } from '@/lib/utils/date'

interface QuickPostponeFormProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  entityType: 'receivable' | 'expense'
  currentDueDate: string
  onSubmit: (newDueDate: string) => Promise<void>
  loading?: boolean
}

export default function QuickPostponeForm({
  isOpen,
  onClose,
  onBack,
  entityType,
  currentDueDate,
  onSubmit,
  loading = false
}: QuickPostponeFormProps) {
  // Pre-fill with tomorrow's date
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const [newDueDate, setNewDueDate] = useState(formatDateForInput(tomorrow.toISOString()))

  const title = 'Adiar Vencimento'

  function addDaysFromToday(days: number): string {
    const today = new Date()
    today.setDate(today.getDate() + days)
    return formatDateForInput(today.toISOString())
  }

  function handleQuickSelect(days: number) {
    const newDate = addDaysFromToday(days)
    setNewDueDate(newDate)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!newDueDate) {
      alert('Por favor, selecione uma nova data')
      return
    }

    // Validate that new date is after current date
    const newDateObj = new Date(newDueDate)
    const currentDateObj = new Date(currentDueDate)

    if (newDateObj <= currentDateObj) {
      alert('A nova data deve ser posterior à data atual de vencimento')
      return
    }

    await onSubmit(newDueDate)
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
            Para quando você quer adiar?
          </label>
          <p className="text-xs text-neutral-500 mb-2">
            Vencimento atual: {new Date(currentDueDate).toLocaleDateString('pt-BR')}
          </p>
          <input
            type="date"
            required
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
            disabled={loading}
            min={formatDateForInput(new Date(Date.now() + 86400000).toISOString())} // Tomorrow
          />
        </div>

        {/* Quick Suggestions */}
        <div>
          <p className="text-sm text-neutral-600 mb-3">Sugestões rápidas:</p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleQuickSelect(7)}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              disabled={loading}
            >
              +7 dias
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(15)}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              disabled={loading}
            >
              +15 dias
            </button>
            <button
              type="button"
              onClick={() => handleQuickSelect(30)}
              className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              disabled={loading}
            >
              +30 dias
            </button>
          </div>
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
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-neutral-300 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
