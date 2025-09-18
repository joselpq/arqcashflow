'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
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

export default function ContractsTab() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingContract, setEditingContract] = useState<any>(null)
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([])
  const [uniqueStatuses] = useState(['active', 'completed', 'cancelled'])
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [predefinedCategories, setPredefinedCategories] = useState([
    'Residencial',
    'Comercial',
    'Restaurante',
    'Loja'
  ])
  const [filters, setFilters] = useState({
    status: 'active',
    category: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })
  const [formData, setFormData] = useState({
    clientName: '',
    projectName: '',
    description: '',
    totalValue: '',
    signedDate: '',
    category: '',
    notes: ''
  })

  useEffect(() => {
    fetchContracts()
  }, [filters])

  useEffect(() => {
    if (editId) {
      const contract = contracts.find((c: any) => c.id === editId)
      if (contract) {
        editContract(contract)
      }
    }
  }, [editId, contracts])

  async function fetchContracts() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.category !== 'all') params.append('category', filters.category)
      params.append('sortBy', filters.sortBy)
      params.append('sortOrder', filters.sortOrder)

      const res = await fetch(`/api/contracts?${params.toString()}`)
      const data = await res.json()
      setContracts(data)

      const categories = [...new Set(data.map((contract: any) => contract.category).filter(Boolean))]
      setUniqueCategories(categories)
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const totalValue = parseFloat(formData.totalValue)
      if (isNaN(totalValue)) {
        alert('Total value must be a valid number')
        return
      }

      const url = editingContract ? `/api/contracts/${editingContract.id}` : '/api/contracts'
      const method = editingContract ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalValue
        })
      })

      if (res.ok) {
        resetForm()
        fetchContracts()
      } else {
        alert('Error saving contract')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error saving contract')
    }
  }

  async function deleteContract(id: string) {
    if (!confirm('Are you sure you want to delete this contract? This will also delete all associated receivables.')) {
      return
    }

    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchContracts()
      } else {
        alert('Failed to delete contract')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete contract')
    }
  }

  function resetForm() {
    setFormData({
      clientName: '',
      projectName: '',
      description: '',
      totalValue: '',
      signedDate: '',
      category: '',
      notes: ''
    })
    setEditingContract(null)
    setCustomCategory('')
    setShowCustomCategory(false)
  }

  function editContract(contract: any) {
    setEditingContract(contract)
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
      description: contract.description || '',
      totalValue: contract.totalValue ? contract.totalValue.toString() : '',
      signedDate: contract.signedDate ? formatDateForInput(contract.signedDate) : '',
      category: category,
      notes: contract.notes || ''
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <div>
          <h2 className="text-xl font-bold mb-4 text-neutral-900">
            {editingContract ? 'Editar Contrato' : 'Adicionar Contrato'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4" id="contract-form">
            <div>
              <label className="block mb-2 font-medium text-neutral-900">Nome do Cliente *</label>
              <input
                type="text"
                required
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
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
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-neutral-900">Descrição</label>
              <textarea
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-neutral-900">Valor Total *</label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                value={formData.totalValue}
                onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-neutral-900">Data de Assinatura *</label>
              <input
                type="date"
                required
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900"
                value={formData.signedDate}
                onChange={(e) => setFormData({ ...formData, signedDate: e.target.value })}
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
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 font-medium transition-colors"
              >
                {editingContract ? 'Atualizar' : 'Adicionar'}
              </button>
              {editingContract && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-neutral-600 text-white px-6 py-2 rounded-lg hover:bg-neutral-700 font-medium transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4 text-neutral-900">Contratos Existentes</h2>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          <div>
            <label className="block text-sm font-semibold text-neutral-900 mb-2">Status</label>
            <select
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">Todos</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {status === 'active' ? 'Ativo' : status === 'completed' ? 'Finalizado' : 'Cancelado'}
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
              {uniqueCategories.map(category => (
                <option key={category} value={category}>{category}</option>
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
              <option value="createdAt">Data de Criação</option>
              <option value="signedDate">Data de Assinatura</option>
              <option value="clientName">Nome do Cliente</option>
              <option value="projectName">Nome do Projeto</option>
              <option value="totalValue">Valor Total</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-900 mb-2">Ordem</label>
            <select
              className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
              value={filters.sortOrder}
              onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
            >
              <option value="desc">Decrescente</option>
              <option value="asc">Crescente</option>
            </select>
          </div>
        </div>

        {/* Contract List */}
        {loading ? (
          <p>Carregando...</p>
        ) : contracts.length === 0 ? (
          <p className="text-neutral-900 font-medium">Nenhum contrato ainda</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {contracts.map((contract: any) => (
              <div key={contract.id} className="bg-white border-2 border-neutral-300 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-neutral-900">{contract.projectName}</h3>
                    <p className="text-sm text-neutral-900 font-medium">Cliente: {contract.clientName}</p>
                    <p className="text-sm font-semibold text-neutral-900">Valor: R$ {contract.totalValue.toLocaleString('pt-BR')}</p>
                    <div className="flex items-center gap-2 my-1">
                      <span className="text-sm font-medium text-neutral-900">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        contract.status === 'active' ? 'bg-green-100 text-green-800' :
                        contract.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {contract.status === 'active' ? 'Ativo' : contract.status === 'completed' ? 'Finalizado' : 'Cancelado'}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-900">Data: {formatDateForDisplay(contract.signedDate)}</p>
                    {contract.category && (
                      <p className="text-sm text-neutral-900">Categoria: {contract.category}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => editContract(contract)}
                      className="bg-blue-700 text-white px-3 py-1 rounded text-sm hover:bg-blue-800 font-medium transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteContract(contract.id)}
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
      </div>
    </div>
  )
}