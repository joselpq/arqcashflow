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
  const [filteredReceivables, setFilteredReceivables] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [contractsLoading, setContractsLoading] = useState(true)
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
  const [searchQuery, setSearchQuery] = useState('')

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

  // Client-side search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredReceivables(receivables)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = receivables.filter((receivable: any) =>
        receivable.contract?.clientName?.toLowerCase().includes(query) ||
        receivable.contract?.projectName?.toLowerCase().includes(query) ||
        receivable.category?.toLowerCase().includes(query) ||
        receivable.invoiceNumber?.toLowerCase().includes(query) ||
        receivable.notes?.toLowerCase().includes(query)
      )
      setFilteredReceivables(filtered)
    }
  }, [receivables, searchQuery])

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
    } finally {
      setContractsLoading(false)
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
          className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Recebível
        </button>
      </div>

      {!contractsLoading && contracts.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
          <p className="text-yellow-800">⚠️ Nenhum contrato disponível</p>
          <p className="text-sm text-yellow-700 mt-1">
            Para criar contas a receber, você precisa primeiro <a href="/projetos" className="underline">criar um contrato</a>.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar recebíveis, clientes, projetos, categorias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-neutral-300 rounded-lg bg-white text-neutral-900 placeholder-neutral-500 focus:border-blue-600 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filters - Horizontal Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">Contrato:</label>
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none min-w-[180px]"
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

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">Status:</label>
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
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

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">Categoria:</label>
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="all">Todas</option>
            {uniqueCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">Ordenar:</label>
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          >
            <option value="expectedDate">Data Esperada</option>
            <option value="amount">Valor</option>
            <option value="status">Status</option>
            <option value="category">Categoria</option>
            <option value="receivedDate">Data Recebimento</option>
            <option value="createdAt">Data Criação</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            value={filters.sortOrder}
            onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
          >
            <option value="desc">↓ Desc</option>
            <option value="asc">↑ Asc</option>
          </select>
        </div>

        {(filters.contractId !== 'all' || filters.status !== 'pending' || filters.category !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setFilters({ contractId: 'all', status: 'pending', category: 'all', sortBy: 'expectedDate', sortOrder: 'asc' })
              setSearchQuery('')
            }}
            className="ml-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Receivables Table */}
      {loading ? (
        <p>Carregando...</p>
      ) : filteredReceivables.length === 0 ? (
        <p className="text-neutral-900 font-medium">
          {searchQuery ? `Nenhum recebível encontrado para "${searchQuery}"` : 'Nenhum recebível ainda'}
        </p>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Cliente / Projeto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {filteredReceivables.map((receivable: any) => {
                  const isOverdue = receivable.status === 'overdue'
                  return (
                  <tr key={receivable.id} className={`group hover:bg-neutral-50 transition-colors ${
                    isOverdue ? 'bg-red-50 border-l-4 border-l-red-500' : ''
                  }`}>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-semibold text-neutral-900">
                          {receivable.contract?.projectName || 'Projeto'}
                        </div>
                        <div className="text-sm text-neutral-600">
                          {receivable.contract?.clientName || 'Cliente'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-bold text-lg text-neutral-900">
                        R$ {receivable.amount.toLocaleString('pt-BR')}
                      </div>
                      {receivable.receivedDate && receivable.receivedAmount && receivable.receivedAmount !== receivable.amount && (
                        <div className="text-sm text-green-600">
                          Recebido: R$ {receivable.receivedAmount.toLocaleString('pt-BR')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          receivable.status === 'pending' ? 'bg-yellow-500' :
                          receivable.status === 'received' ? 'bg-green-500' :
                          receivable.status === 'overdue' ? 'bg-red-500 animate-pulse' :
                          'bg-neutral-500'
                        }`}></div>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
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
                      {receivable.receivedDate && (
                        <div className="text-xs text-green-600 mt-1">
                          Recebido: {formatDateForDisplay(receivable.receivedDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-900">
                      {formatDateForDisplay(receivable.expectedDate)}
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-900">
                      <div>{receivable.category || '-'}</div>
                      {receivable.invoiceNumber && (
                        <div className="text-xs text-neutral-500">#{receivable.invoiceNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {(receivable.status === 'pending' || receivable.status === 'overdue') && (
                          <button
                            onClick={() => markAsReceived(receivable)}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 font-medium transition-colors"
                            title="Marcar como recebido"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(receivable)}
                          className="bg-blue-700 text-white px-2 py-1 rounded text-xs hover:bg-blue-800 font-medium transition-colors"
                          title="Editar recebível"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteReceivable(receivable.id)}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 font-medium transition-colors"
                          title="Excluir recebível"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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