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

interface ReceivableFormProps {
  receivable?: any
  contracts: any[]
  onSubmit: (receivableData: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function ReceivableForm({ receivable, contracts, onSubmit, onCancel, loading = false }: ReceivableFormProps) {
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [predefinedCategories, setPredefinedCategories] = useState([
    'projeto',
    'obra',
    'RT'
  ])
  const [formData, setFormData] = useState({
    contractId: '',
    expectedDate: '',
    amount: '',
    invoiceNumber: '',
    category: '',
    notes: '',
    receivedDate: '',
    receivedAmount: '',
  })

  // Initialize form data when receivable changes
  useEffect(() => {
    if (receivable) {
      const category = receivable.category || ''

      // Check if category is in predefined list
      if (category && !predefinedCategories.includes(category)) {
        setCustomCategory(category)
        setShowCustomCategory(true)
      } else {
        setCustomCategory('')
        setShowCustomCategory(false)
      }

      setFormData({
        contractId: receivable.contractId || '',
        expectedDate: receivable.expectedDate ? formatDateForInput(receivable.expectedDate) : '',
        amount: receivable.amount ? receivable.amount.toString() : '',
        invoiceNumber: receivable.invoiceNumber || '',
        category: category,
        notes: receivable.notes || '',
        receivedDate: receivable.receivedDate ? formatDateForInput(receivable.receivedDate) : '',
        receivedAmount: receivable.receivedAmount ? receivable.receivedAmount.toString() : '',
      })
    } else {
      // Reset form for new receivable
      setFormData({
        contractId: '',
        expectedDate: '',
        amount: '',
        invoiceNumber: '',
        category: '',
        notes: '',
        receivedDate: '',
        receivedAmount: '',
      })
      setCustomCategory('')
      setShowCustomCategory(false)
    }
  }, [receivable, predefinedCategories])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const amount = parseFloat(formData.amount)
    if (isNaN(amount)) {
      alert('Amount must be a valid number')
      return
    }

    let receivedAmount = null
    if (formData.receivedAmount) {
      receivedAmount = parseFloat(formData.receivedAmount)
      if (isNaN(receivedAmount)) {
        alert('Received amount must be a valid number')
        return
      }
    }

    await onSubmit({
      ...formData,
      amount,
      receivedAmount
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-2 font-medium text-neutral-900">Contrato *</label>
        <select
          required
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
          value={formData.contractId}
          onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
          disabled={loading}
        >
          <option value="">Selecione um contrato</option>
          {contracts.map(contract => (
            <option key={contract.id} value={contract.id}>
              {contract.clientName} - {contract.projectName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2 font-medium text-neutral-900">Data Esperada *</label>
        <input
          type="date"
          required
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
          value={formData.expectedDate}
          onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block mb-2 font-medium text-neutral-900">Valor Esperado *</label>
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
        <label className="block mb-2 font-medium text-neutral-900">Categoria</label>
        <select
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
          value={showCustomCategory ? 'custom' : formData.category}
          onChange={(e) => {
            if (e.target.value === 'custom') {
              setShowCustomCategory(true)
              setFormData({ ...formData, category: customCategory })
            } else {
              setShowCustomCategory(false)
              setFormData({ ...formData, category: e.target.value })
            }
          }}
          disabled={loading}
        >
          <option value="">Selecione uma categoria</option>
          {predefinedCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
          <option value="custom">+ Nova categoria</option>
        </select>
      </div>

      {showCustomCategory && (
        <div>
          <label className="block mb-2 font-medium text-neutral-900">Nova Categoria</label>
          <input
            type="text"
            className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
            value={customCategory}
            onChange={(e) => {
              setCustomCategory(e.target.value)
              setFormData({ ...formData, category: e.target.value })
            }}
            placeholder="Digite o nome da nova categoria"
            disabled={loading}
          />
        </div>
      )}

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

      {/* Payment recording section */}
      <div className="border-t border-neutral-200 pt-4">
        <h4 className="font-medium text-neutral-900 mb-3">Registrar Pagamento (Opcional)</h4>

        <div>
          <label className="block mb-2 font-medium text-neutral-900">Data de Recebimento</label>
          <input
            type="date"
            className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
            value={formData.receivedDate}
            onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block mb-2 font-medium text-neutral-900">Valor Recebido</label>
          <input
            type="number"
            step="0.01"
            className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
            value={formData.receivedAmount}
            onChange={(e) => setFormData({ ...formData, receivedAmount: e.target.value })}
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : (receivable ? 'Atualizar' : 'Adicionar')}
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