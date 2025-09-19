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
  const [filteredContracts, setFilteredContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([])
  const [uniqueStatuses] = useState(['active', 'completed', 'cancelled'])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<any>(null)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null)
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

  // Client-side search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContracts(contracts)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = contracts.filter((contract: any) =>
        contract.clientName?.toLowerCase().includes(query) ||
        contract.projectName?.toLowerCase().includes(query) ||
        contract.category?.toLowerCase().includes(query) ||
        contract.description?.toLowerCase().includes(query)
      )
      setFilteredContracts(filtered)
    }
  }, [contracts, searchQuery])

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

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar contratos, clientes, projetos..."
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
          <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">Status:</label>
          <select
            className="border border-neutral-300 rounded-md px-3 py-1 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
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
            <option value="signedDate">Data de Criação</option>
            <option value="clientName">Cliente</option>
            <option value="projectName">Projeto</option>
            <option value="totalValue">Valor</option>
            <option value="status">Status</option>
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

        {(filters.status !== 'active' || filters.category !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setFilters({ status: 'active', category: 'all', sortBy: 'createdAt', sortOrder: 'desc' })
              setSearchQuery('')
            }}
            className="ml-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpar filtros
          </button>
        )}
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
                      Data
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
                  {filteredContracts.map((contract: any) => (
                    <tr key={contract.id} className="group hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-semibold text-neutral-900">{contract.projectName}</div>
                          <div className="text-sm text-neutral-600">{contract.clientName}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-bold text-lg text-neutral-900">
                          R$ {contract.totalValue.toLocaleString('pt-BR')}
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
                            onClick={() => deleteContract(contract.id)}
                            className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 font-medium transition-colors"
                            title="Excluir contrato"
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