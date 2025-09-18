'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Modal from '../../components/Modal'
import ReceivableForm from '../../components/forms/ReceivableForm'

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

export default function ReceivablesTab() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [receivables, setReceivables] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([])
  const [uniqueStatuses] = useState(['pending', 'received', 'overdue', 'cancelled'])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReceivable, setEditingReceivable] = useState<any>(null)
  const [filters, setFilters] = useState({
    contractId: 'all',
    status: 'pending',
    category: 'all',
    sortBy: 'expectedDate',
    sortOrder: 'asc',
  })

  useEffect(() => {
    fetchContracts()
  }, [])

  useEffect(() => {
    fetchReceivables()
  }, [filters])

  useEffect(() => {
    if (editId && receivables.length > 0) {
      const receivableToEdit = receivables.find((r: any) => r.id === editId)
      if (receivableToEdit) {
        openEditModal(receivableToEdit)
      }
    }
  }, [editId, receivables])

  async function fetchContracts() {
    try {
      const res = await fetch('/api/contracts')
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error(`Failed to fetch contracts: ${res.status}`)
      }
      const data = await res.json()
      setContracts(data)
    } catch (error) {
      console.error('Falha ao buscar contratos:', error)
      setContracts([])
    }
  }

  async function fetchReceivables() {
    try {
      const params = new URLSearchParams()
      if (filters.contractId !== 'all') params.set('contractId', filters.contractId)
      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.category !== 'all') params.set('category', filters.category)
      params.set('sortBy', filters.sortBy)
      params.set('sortOrder', filters.sortOrder)

      const res = await fetch(`/api/receivables?${params.toString()}`)
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error(`Failed to fetch receivables: ${res.status}`)
      }
      const data = await res.json()
      setReceivables(data)

      const categories = [...new Set(data.map((receivable: any) => receivable.category).filter(Boolean))]
      setUniqueCategories(categories)
    } catch (error) {
      console.error('Falha ao buscar recebíveis:', error)
      setReceivables([])
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingReceivable(null)
    setIsModalOpen(true)
  }

  function openEditModal(receivable: any) {
    setEditingReceivable(receivable)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingReceivable(null)
  }

  async function handleFormSubmit(receivableData: any) {
    setFormLoading(true)
    try {
      const url = editingReceivable ? `/api/receivables/${editingReceivable.id}` : '/api/receivables'
      const method = editingReceivable ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receivableData)
      })

      if (res.ok) {
        closeModal()
        await fetchReceivables()
      } else {
        alert('Error saving receivable')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error saving receivable')
    } finally {
      setFormLoading(false)
    }
  }

  async function deleteReceivable(id: string) {
    if (!confirm('Are you sure you want to delete this receivable?')) {
      return
    }

    try {
      const res = await fetch(`/api/receivables/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await fetchReceivables()
      } else {
        alert('Failed to delete receivable')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete receivable')
    }
  }

  async function markAsReceived(receivable: any) {
    if (!confirm('Mark this receivable as received?')) {
      return
    }

    try {
      const res = await fetch(`/api/receivables/${receivable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...receivable,
          status: 'received',
          receivedDate: new Date().toISOString().split('T')[0],
          receivedAmount: receivable.amount
        })
      })

      if (res.ok) {
        await fetchReceivables()
      } else {
        alert('Failed to update receivable')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update receivable')
    }
  }

  return (
    <div>
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-neutral-900">Recebíveis</h2>
        <button
          onClick={openAddModal}
          disabled={contracts.length === 0}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Recebível
        </button>
      </div>

      {contracts.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
          <p className="text-yellow-800">⚠️ Nenhum contrato disponível</p>
          <p className="text-sm text-yellow-700 mt-1">
            Para criar contas a receber, você precisa primeiro <a href="/projetos" className="underline">criar um contrato</a>.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <div>
          <label className="block text-sm font-semibold text-neutral-900 mb-2">Contrato</label>
          <select
            className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.contractId}
            onChange={(e) => setFilters({ ...filters, contractId: e.target.value })}
          >
            <option value="all">Todos os contratos</option>
            {contracts.map((contract: any) => (
              <option key={contract.id} value={contract.id}>
                {contract.clientName} - {contract.projectName}
              </option>
            ))}
          </select>
        </div>

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
                {status === 'pending' ? 'Pendente' :
                 status === 'received' ? 'Recebido' :
                 status === 'overdue' ? 'Atrasado' : 'Cancelado'}
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
            <option value="expectedDate">Data Esperada</option>
            <option value="amount">Valor</option>
            <option value="status">Status</option>
            <option value="category">Categoria</option>
            <option value="receivedDate">Data de Recebimento</option>
            <option value="createdAt">Data de Criação</option>
          </select>
        </div>
      </div>

      {/* Receivables List */}
      {loading ? (
        <p>Carregando...</p>
      ) : receivables.length === 0 ? (
        <p className="text-neutral-900 font-medium">Nenhum recebível ainda</p>
      ) : (
        <div className="space-y-4">
          {receivables.map((receivable: any) => (
            <div key={receivable.id} className="bg-white border-2 border-neutral-300 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-lg text-neutral-900">
                      R$ {receivable.amount.toLocaleString('pt-BR')}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      receivable.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      receivable.status === 'received' ? 'bg-green-100 text-green-800' :
                      receivable.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-neutral-100 text-neutral-900'
                    }`}>
                      {receivable.status === 'pending' ? 'Pendente' :
                       receivable.status === 'received' ? 'Recebido' :
                       receivable.status === 'overdue' ? 'Atrasado' : 'Cancelado'}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-900 font-medium">
                    Contrato: {receivable.contract?.clientName} - {receivable.contract?.projectName}
                  </p>
                  <p className="text-sm text-neutral-900">
                    Data Esperada: {formatDateForDisplay(receivable.expectedDate)}
                  </p>
                  {receivable.receivedDate && (
                    <p className="text-sm text-green-700">
                      Recebido em: {formatDateForDisplay(receivable.receivedDate)}
                      {receivable.receivedAmount && receivable.receivedAmount !== receivable.amount &&
                        ` - R$ ${receivable.receivedAmount.toLocaleString('pt-BR')}`}
                    </p>
                  )}
                  {receivable.category && (
                    <p className="text-sm text-neutral-900">Categoria: {receivable.category}</p>
                  )}
                  {receivable.invoiceNumber && (
                    <p className="text-sm text-neutral-900">Fatura: {receivable.invoiceNumber}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {(receivable.status === 'pending' || receivable.status === 'overdue') && (
                    <button
                      onClick={() => markAsReceived(receivable)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 font-medium transition-colors"
                    >
                      Marcar como Recebido
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(receivable)}
                    className="bg-blue-700 text-white px-3 py-1 rounded text-sm hover:bg-blue-800 font-medium transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteReceivable(receivable.id)}
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
        title={editingReceivable ? 'Editar Recebível' : 'Adicionar Recebível'}
        size="lg"
      >
        <ReceivableForm
          receivable={editingReceivable}
          contracts={contracts}
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
          loading={formLoading}
        />
      </Modal>
    </div>
  )
}