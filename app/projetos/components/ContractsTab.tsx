'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatDateFull as formatDateForDisplay } from '@/lib/date-utils'
import Modal from '../../components/Modal'
import ContractForm from '../../components/forms/ContractForm'
import ContractDeletionModal from '../../components/ContractDeletionModal'

export default function ContractsTab() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [contracts, setContracts] = useState([])
  const [filteredContracts, setFilteredContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([])
  const [uniqueStatuses] = useState(['active', 'completed', 'cancelled'])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<any>(null)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null)
  const [deletionModalOpen, setDeletionModalOpen] = useState(false)
  const [contractToDelete, setContractToDelete] = useState<any>(null)
  const [filters, setFilters] = useState({
    status: 'active',
    category: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchContracts()
  }, [filters, searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (statusDropdownOpen && !target.closest('[data-status-dropdown]')) {
        setStatusDropdownOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [statusDropdownOpen])

  useEffect(() => {
    if (editId) {
      const contract = contracts.find((c: any) => c.id === editId)
      if (contract) {
        openEditModal(contract)
      }
    }
  }, [editId, contracts])

  // Helper function to normalize text (remove accents and lowercase)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  // Client-side search filtering and sorting
  useEffect(() => {
    let filtered = contracts

    // Apply search filter
    if (searchQuery.trim()) {
      const query = normalizeText(searchQuery)
      filtered = contracts.filter((contract: any) =>
        normalizeText(contract.clientName || '').includes(query) ||
        normalizeText(contract.projectName || '').includes(query) ||
        normalizeText(contract.category || '').includes(query) ||
        normalizeText(contract.description || '').includes(query)
      )
    }

    // Apply sorting
    const sorted = [...filtered].sort((a: any, b: any) => {
      let aVal, bVal

      switch (filters.sortBy) {
        case 'projectName':
          aVal = normalizeText(a.projectName || '')
          bVal = normalizeText(b.projectName || '')
          break
        case 'clientName':
          aVal = normalizeText(a.clientName || '')
          bVal = normalizeText(b.clientName || '')
          break
        case 'category':
          aVal = normalizeText(a.category || '')
          bVal = normalizeText(b.category || '')
          break
        case 'status':
          aVal = normalizeText(a.status || '')
          bVal = normalizeText(b.status || '')
          break
        case 'totalValue':
          aVal = a.totalValue || 0
          bVal = b.totalValue || 0
          break
        case 'signedDate':
          aVal = new Date(a.signedDate || 0).getTime()
          bVal = new Date(b.signedDate || 0).getTime()
          break
        default:
          aVal = a.signedDate || ''
          bVal = b.signedDate || ''
      }

      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1
      return 0
    })

    setFilteredContracts(sorted)
  }, [contracts, searchQuery, filters.sortBy, filters.sortOrder])

  async function fetchContracts() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.category !== 'all') params.append('category', filters.category)
      // Note: Sorting handled client-side for better text/category sorting

      const res = await fetch(`/api/contracts?${params.toString()}`)
      const data = await res.json()

      // 🔍 DEBUG: Track values when received from API
      console.log('🖥️ FRONTEND DEBUG - Value tracking after API fetch:')
      data.forEach((contract: any, index: number) => {
        console.log(`  Contract ${index + 1}:`)
        console.log(`    - ID: ${contract.id}`)
        console.log(`    - Client: ${contract.clientName}`)
        console.log(`    - Frontend totalValue: ${contract.totalValue}`)
        console.log(`    - Frontend totalValue type: ${typeof contract.totalValue}`)
        console.log(`    - Frontend totalValue precise?: ${Number.isInteger(contract.totalValue * 100)}`)
        console.log(`    - Frontend totalValue as string: "${contract.totalValue.toString()}"`)
        console.log(`    - Formatted display: R$ ${contract.totalValue.toLocaleString('pt-BR')}`)
      })

      setContracts(data)

      const categories = [...new Set(data.map((contract: any) => contract.category).filter(Boolean))] as string[]
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

  async function openDeleteModal(contract: any) {
    // Check if contract has receivables before opening modal
    try {
      const res = await fetch(`/api/contracts/${contract.id}/deletion-info`)
      if (res.ok) {
        const deletionInfo = await res.json()

        if (!deletionInfo.hasReceivables) {
          // No receivables - show simple confirmation
          if (confirm(`Tem certeza que deseja excluir o contrato "${contract.clientName} - ${contract.projectName}"?`)) {
            await handleDeleteConfirm('contract-only', contract)
          }
        } else {
          // Has receivables - open modal for user choice
          setContractToDelete(contract)
          setDeletionModalOpen(true)
        }
      }
    } catch (error) {
      console.error('Error checking deletion info:', error)
      alert('Erro ao verificar informações de exclusão')
    }
  }

  async function handleDeleteConfirm(mode: 'contract-only' | 'contract-and-receivables', contract?: any) {
    const contractToDeleteNow = contract || contractToDelete
    if (!contractToDeleteNow) return

    try {
      const res = await fetch(`/api/contracts/${contractToDeleteNow.id}?mode=${mode}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchContracts()
        setDeletionModalOpen(false)
        setContractToDelete(null)
      } else {
        alert('Falha ao excluir contrato')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Falha ao excluir contrato')
    }
  }

  function closeDeletionModal() {
    setDeletionModalOpen(false)
    setContractToDelete(null)
  }

  async function updateContractStatus(contractId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus
        })
      })

      if (res.ok) {
        setStatusDropdownOpen(null)
        fetchContracts()
      } else {
        const errorData = await res.json()
        console.error('API error:', errorData)
        alert('Failed to update status')
      }
    } catch (error) {
      console.error('Status update error:', error)
      alert('Failed to update status')
    }
  }

  function toggleStatusDropdown(contractId: string) {
    setStatusDropdownOpen(statusDropdownOpen === contractId ? null : contractId)
  }

  function handleSort(column: string) {
    if (filters.sortBy === column) {
      // Toggle sort order if clicking the same column
      setFilters({
        ...filters,
        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
      })
    } else {
      // Set new column with default descending order
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
          aria-label="Adicionar novo contrato"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Adicionar Contrato</span>
          <span className="sm:hidden">Adicionar</span>
        </button>
      </div>

      {/* Compact Filters - Single Row (Search + Status + Category only) */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-lg border border-neutral-200 shadow-sm">
          {/* Search Input - Takes remaining space */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar projetos, clientes..."
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

          {/* Status Filter */}
          <select
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            aria-label="Filtrar por status"
          >
            <option value="all">Status: Todos</option>
            <option value="active">Status: Ativos</option>
            <option value="completed">Status: Finalizados</option>
            <option value="cancelled">Status: Cancelados</option>
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

          {/* Clear Filters Button - Only shows when filters are active */}
          {(filters.status !== 'active' || filters.category !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilters({ status: 'active', category: 'all', sortBy: 'signedDate', sortOrder: 'desc' })
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

        {/* Contract Table */}
        {loading ? (
          <p>Carregando...</p>
        ) : filteredContracts.length === 0 ? (
          <p className="text-neutral-900 font-medium">
            {searchQuery ? `Nenhum contrato encontrado para "${searchQuery}"` : 'Nenhum contrato ainda'}
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
                        onClick={() => handleSort('totalValue')}
                        className="group flex items-center gap-1 ml-auto text-xs font-medium text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
                      >
                        Valor
                        {getSortIcon('totalValue')}
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
                        onClick={() => handleSort('signedDate')}
                        className="group flex items-center gap-1 text-xs font-medium text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
                      >
                        Data
                        {getSortIcon('signedDate')}
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
                  {filteredContracts.map((contract: any) => {
                    // 🔍 DEBUG: Track values at render time
                    const displayValue = contract.totalValue.toLocaleString('pt-BR')
                    console.log(`🎨 RENDER DEBUG - Contract ${contract.id}:`)
                    console.log(`    - Raw value: ${contract.totalValue}`)
                    console.log(`    - Raw value type: ${typeof contract.totalValue}`)
                    console.log(`    - Rendered display: "${displayValue}"`)
                    console.log(`    - Value precise?: ${Number.isInteger(contract.totalValue * 100)}`)

                    return (
                    <tr key={contract.id} className="group hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-semibold text-neutral-900">{contract.projectName}</div>
                          <div className="text-sm text-neutral-600">{contract.clientName}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-bold text-lg text-neutral-900">
                          R$ {displayValue}
                        </div>
                      </td>
                      <td className="px-4 py-4 relative">
                        <div data-status-dropdown>
                          <button
                            onClick={() => toggleStatusDropdown(contract.id)}
                            className="flex items-center gap-2 hover:bg-neutral-100 rounded-md p-1 transition-colors cursor-pointer"
                            title="Clique para alterar status"
                          >
                            <div className={`w-3 h-3 rounded-full ${
                              contract.status === 'active' ? 'bg-green-500' :
                              contract.status === 'completed' ? 'bg-blue-500' :
                              'bg-red-500'
                            }`}></div>
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                              contract.status === 'active' ? 'bg-green-100 text-green-800' :
                              contract.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {contract.status === 'active' ? 'Ativo' : contract.status === 'completed' ? 'Concluído' : 'Cancelado'}
                            </span>
                            <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {statusDropdownOpen === contract.id && (
                            <div className="absolute top-0 left-0 w-32 bg-white border border-neutral-200 rounded-md shadow-lg z-50">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateContractStatus(contract.id, 'active')
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-2 rounded-t-md ${
                                  contract.status === 'active' ? 'bg-green-50 text-green-800' : 'text-neutral-700'
                                }`}
                              >
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                Ativo
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateContractStatus(contract.id, 'completed')
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-2 ${
                                  contract.status === 'completed' ? 'bg-blue-50 text-blue-800' : 'text-neutral-700'
                                }`}
                              >
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                Concluído
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateContractStatus(contract.id, 'cancelled')
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-2 rounded-b-md ${
                                  contract.status === 'cancelled' ? 'bg-red-50 text-red-800' : 'text-neutral-700'
                                }`}
                              >
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                Cancelado
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-900">
                        {formatDateForDisplay(contract.signedDate)}
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-900">
                        {contract.category || '-'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => openEditModal(contract)}
                            className="bg-blue-700 text-white px-2 py-1 rounded text-xs hover:bg-blue-800 font-medium transition-colors"
                            title="Editar contrato"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => openDeleteModal(contract)}
                            className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 font-medium transition-colors"
                            title="Excluir contrato"
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

      {/* Contract Deletion Modal */}
      {contractToDelete && (
        <ContractDeletionModal
          isOpen={deletionModalOpen}
          onClose={closeDeletionModal}
          contract={contractToDelete}
          onDeleteConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  )
}