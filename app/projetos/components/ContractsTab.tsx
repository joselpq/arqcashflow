'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Modal from '../../components/Modal'
import ContractForm from '../../components/forms/ContractForm'

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

export default function ContractsTab() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([])
  const [uniqueStatuses] = useState(['active', 'completed', 'cancelled'])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<any>(null)
  const [filters, setFilters] = useState({
    status: 'active',
    category: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  useEffect(() => {
    fetchContracts()
  }, [filters])

  useEffect(() => {
    if (editId) {
      const contract = contracts.find((c: any) => c.id === editId)
      if (contract) {
        openEditModal(contract)
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

  function openAddModal() {
    setEditingContract(null)
    setIsModalOpen(true)
  }

  function openEditModal(contract: any) {
    setEditingContract(contract)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingContract(null)
  }

  async function handleFormSubmit(contractData: any) {
    setFormLoading(true)
    try {
      const url = editingContract ? `/api/contracts/${editingContract.id}` : '/api/contracts'
      const method = editingContract ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData)
      })

      if (res.ok) {
        closeModal()
        fetchContracts()
      } else {
        alert('Error saving contract')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error saving contract')
    } finally {
      setFormLoading(false)
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


  return (
    <div>
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-neutral-900">Contratos</h2>
        <button
          onClick={openAddModal}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Contrato
        </button>
      </div>

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
                      onClick={() => openEditModal(contract)}
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingContract ? 'Editar Contrato' : 'Adicionar Contrato'}
        size="lg"
      >
        <ContractForm
          contract={editingContract}
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
          loading={formLoading}
        />
      </Modal>
    </div>
  )
}