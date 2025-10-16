'use client'

import { useState, useEffect } from 'react'
import { formatDateForInput, getTodayDateString } from '@/lib/utils/date'

interface ContractFormProps {
  contract?: any
  onSubmit: (contractData: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function ContractForm({ contract, onSubmit, onCancel, loading = false }: ContractFormProps) {
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [predefinedCategories, setPredefinedCategories] = useState([
    'Residencial',
    'Comercial',
    'Restaurante',
    'Loja'
  ])
  const [formData, setFormData] = useState({
    clientName: '',
    projectName: '',
    totalValue: '',
    signedDate: getTodayDateString(),
    category: '',
    notes: '',
    status: 'active'
  })

  // Initialize form data when contract changes
  useEffect(() => {
    if (contract) {
      const category = contract.category || ''

      // Check if category is in predefined list
      if (category && !predefinedCategories.includes(category)) {
        setCustomCategory(category)
        setShowCustomCategory(true)
      } else {
        setCustomCategory('')
        setShowCustomCategory(false)
      }

      setFormData({
        clientName: contract.clientName || '',
        projectName: contract.projectName || '',
        totalValue: contract.totalValue ? contract.totalValue.toString() : '',
        signedDate: contract.signedDate ? formatDateForInput(contract.signedDate) : '',
        category: category,
        notes: contract.notes || '',
        status: contract.status || 'active'
      })
    } else {
      // Reset form for new contract
      setFormData({
        clientName: '',
        projectName: '',
        totalValue: '',
        signedDate: getTodayDateString(),
        category: '',
        notes: '',
        status: 'active'
      })
      setCustomCategory('')
      setShowCustomCategory(false)
    }
  }, [contract, predefinedCategories])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const totalValue = parseFloat(formData.totalValue)
    if (isNaN(totalValue)) {
      alert('Total value must be a valid number')
      return
    }

    const submissionData = {
      ...formData,
      totalValue
    }

    await onSubmit(submissionData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-2 font-medium text-neutral-900">Nome do Cliente *</label>
        <input
          type="text"
          required
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
          value={formData.clientName}
          onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block mb-2 font-medium text-neutral-900">Nome do Projeto *</label>
        <input
          type="text"
          required
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
          value={formData.projectName}
          onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block mb-2 font-medium text-neutral-900">Valor Total *</label>
        <input
          type="number"
          required
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={formData.totalValue}
          onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
          onWheel={(e) => e.currentTarget.blur()}
          disabled={loading}
        />
      </div>

      <div>
        <label className="block mb-2 font-medium text-neutral-900">Data de Criação *</label>
        <input
          type="date"
          required
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
          value={formData.signedDate}
          onChange={(e) => setFormData({ ...formData, signedDate: e.target.value })}
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
        <label className="block mb-2 font-medium text-neutral-900">Status *</label>
        <select
          className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          disabled={loading}
          required
        >
          <option value="active">Ativo</option>
          <option value="completed">Concluído</option>
          <option value="cancelled">Cancelado</option>
        </select>
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

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : (contract ? 'Atualizar' : 'Adicionar')}
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