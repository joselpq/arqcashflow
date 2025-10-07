'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatDateForInput, formatDateFull as formatDateForDisplay } from '@/lib/date-utils'
import Modal from '../components/Modal'
import ReceivableForm from '../components/forms/ReceivableForm'

function ReceivablesPageContent() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [receivables, setReceivables] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingReceivable, setEditingReceivable] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([])
  const [uniqueStatuses] = useState(['pending', 'received', 'overdue', 'cancelled'])
  const [filters, setFilters] = useState({
    contractId: 'all',
    status: 'pending',
    category: 'all',
    sortBy: 'expectedDate',
    sortOrder: 'asc',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredReceivables, setFilteredReceivables] = useState([])

  useEffect(() => {
    fetchContracts()
  }, [])

  useEffect(() => {
    fetchReceivables()
  }, [filters])

  // Helper function to normalize text (remove accents and lowercase)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  // Client-side search filtering and sorting
  useEffect(() => {
    let filtered = receivables

    // Apply search filter
    if (searchQuery.trim()) {
      const query = normalizeText(searchQuery)
      filtered = receivables.filter((receivable: any) =>
        normalizeText(receivable.contract?.projectName || '').includes(query) ||
        normalizeText(receivable.contract?.clientName || '').includes(query) ||
        normalizeText(receivable.category || '').includes(query) ||
        normalizeText(receivable.description || '').includes(query)
      )
    }

    // Apply sorting
    const sorted = [...filtered].sort((a: any, b: any) => {
      let aVal, bVal

      switch (filters.sortBy) {
        case 'projectName':
          aVal = normalizeText(a.contract?.projectName || '')
          bVal = normalizeText(b.contract?.projectName || '')
          break
        case 'category':
          aVal = normalizeText(a.category || '')
          bVal = normalizeText(b.category || '')
          break
        case 'status':
          aVal = normalizeText(a.status || '')
          bVal = normalizeText(b.status || '')
          break
        case 'amount':
          aVal = a.amount || 0
          bVal = b.amount || 0
          break
        case 'expectedDate':
          aVal = new Date(a.expectedDate || 0).getTime()
          bVal = new Date(b.expectedDate || 0).getTime()
          break
        default:
          aVal = new Date(a.expectedDate || 0).getTime()
          bVal = new Date(b.expectedDate || 0).getTime()
      }

      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1
      return 0
    })

    setFilteredReceivables(sorted)
  }, [receivables, searchQuery, filters.sortBy, filters.sortOrder])

  // Handle auto-edit when URL parameter is present
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
      // Note: Sorting handled client-side for better text/category sorting

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

      // Extract unique categories for filter dropdown
      const categories = [...new Set(data.map((r: any) => r.category).filter(Boolean))] as string[]
      setUniqueCategories(categories)
    } catch (error) {
      console.error('Falha ao buscar contas a receber:', error)
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
    try {
      const url = editingReceivable ? `/api/receivables/${editingReceivable.id}` : '/api/receivables'
      const method = editingReceivable ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receivableData),
      })

      if (res.ok) {
        closeModal()
        fetchReceivables()
      } else {
        const error = await res.json()
        alert('Erro: ' + JSON.stringify(error))
      }
    } catch (error) {
      alert(editingReceivable ? 'Falha ao atualizar conta a receber' : 'Falha ao criar conta a receber')
    }
  }

  async function deleteReceivable(id: string, receivable: any) {
    if (!confirm(`Tem certeza que deseja excluir o recebível "${receivable.contract?.projectName || 'sem projeto'}"?`)) return

    try {
      const res = await fetch(`/api/receivables/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchReceivables()
      } else {
        alert('Falha ao excluir conta a receber')
      }
    } catch (error) {
      alert('Falha ao excluir conta a receber')
    }
  }

  async function markAsReceived(id: string, amount: number) {
    const receivedDate = prompt('Insira a data de recebimento (AAAA-MM-DD):')
    const receivedAmount = prompt('Insira o valor recebido:', amount.toString())

    if (receivedDate && receivedAmount) {
      try {
        const res = await fetch(`/api/receivables/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'received',
            receivedDate,
            receivedAmount: parseFloat(receivedAmount),
          }),
        })

        if (res.ok) {
          fetchReceivables()
        }
      } catch (error) {
        alert('Falha ao atualizar conta a receber')
      }
    }
  }

  function handleSort(column: string) {
    if (filters.sortBy === column) {
      setFilters({
        ...filters,
        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
      })
    } else {
      setFilters({
        ...filters,
        sortBy: column,
        sortOrder: 'desc'
      })
    }
  }

  function getSortIcon(column: string) {
    if (filters.sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }

    if (filters.sortOrder === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )
    } else {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header with Add Button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={openAddModal}
          className="bg-blue-700 text-white px-4 py-2.5 rounded-lg hover:bg-blue-800 font-medium transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm"
          aria-label="Adicionar novo recebível"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Adicionar Recebível</span>
          <span className="sm:hidden">Adicionar</span>
        </button>
      </div>

      {/* Compact Filters - Single Row */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-lg border border-neutral-200 shadow-sm">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar recebíveis, clientes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-neutral-300 rounded-md bg-white text-neutral-900 placeholder-neutral-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                aria-label="Limpar busca"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Contract Filter */}
          <select
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
            value={filters.contractId}
            onChange={(e) => setFilters({ ...filters, contractId: e.target.value })}
            aria-label="Filtrar por contrato"
          >
            <option value="all">Contrato: Todos</option>
            {contracts.map((contract: any) => (
              <option key={contract.id} value={contract.id}>Contrato: {contract.projectName}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            aria-label="Filtrar por status"
          >
            <option value="all">Status: Todos</option>
            <option value="pending">Status: Pendente</option>
            <option value="received">Status: Recebido</option>
            <option value="overdue">Status: Atrasado</option>
            <option value="cancelled">Status: Cancelado</option>
          </select>

          {/* Category Filter */}
          <select
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            aria-label="Filtrar por categoria"
          >
            <option value="all">Categoria: Todas</option>
            {uniqueCategories.map(category => (
              <option key={category} value={category}>Categoria: {category}</option>
            ))}
          </select>

          {/* Clear Filters Button */}
          {(filters.status !== 'pending' || filters.contractId !== 'all' || filters.category !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilters({ contractId: 'all', status: 'pending', category: 'all', sortBy: 'expectedDate', sortOrder: 'asc' })
                setSearchQuery('')
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap px-2 transition-colors"
              aria-label="Limpar todos os filtros"
            >
              × Limpar
            </button>
          )}
        </div>
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
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('projectName')}
                      className="group flex items-center gap-1 text-xs font-medium text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
                    >
                      Projeto / Cliente
                      {getSortIcon('projectName')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSort('amount')}
                      className="group flex items-center gap-1 ml-auto text-xs font-medium text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
                    >
                      Valor
                      {getSortIcon('amount')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('status')}
                      className="group flex items-center gap-1 text-xs font-medium text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
                    >
                      Status
                      {getSortIcon('status')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('expectedDate')}
                      className="group flex items-center gap-1 text-xs font-medium text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
                    >
                      Data Prevista
                      {getSortIcon('expectedDate')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('category')}
                      className="group flex items-center gap-1 text-xs font-medium text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
                    >
                      Categoria
                      {getSortIcon('category')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {filteredReceivables.map((receivable: any) => (
                  <tr key={receivable.id} className="group hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-semibold text-neutral-900">{receivable.contract?.projectName || 'Sem projeto'}</div>
                        <div className="text-sm text-neutral-600">{receivable.contract?.clientName || '-'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-bold text-lg text-neutral-900">
                        R$ {receivable.amount.toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        receivable.status === 'received' ? 'bg-green-100 text-green-800' :
                        receivable.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {receivable.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-900">
                      {formatDateForDisplay(receivable.expectedDate)}
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-900">
                      {receivable.category || '-'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {(receivable.status === 'pending' || receivable.status === 'overdue') && (
                          <button
                            onClick={() => markAsReceived(receivable.id, receivable.amount)}
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
                          onClick={() => deleteReceivable(receivable.id, receivable)}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 font-medium transition-colors"
                          title="Excluir recebível"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
          contracts={contracts}
        />
      </Modal>
    </div>
  )
}

export default function ReceivablesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8">Carregando...</div>}>
      <ReceivablesPageContent />
    </Suspense>
  )
}
