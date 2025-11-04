'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { formatDateFull as formatDateForDisplay } from '@/lib/utils/date'
import Modal from '../../components/Modal'
import ContractForm from '../../components/forms/ContractForm'
import ContractDeletionModal from '../../components/ContractDeletionModal'
import ContractDetailsModal from '../../components/ContractDetailsModal'
import { AdvancedFilterModal } from '../../components/AdvancedFilterModal'
import { useTerminology } from '@/lib/hooks/useTerminology'

export default function ContractsTab() {
  const { terminology } = useTerminology()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const editId = searchParams.get('edit')

  const [contracts, setContracts] = useState<any[]>([])
  const [filteredContracts, setFilteredContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([])
  const [uniqueStatuses] = useState(['active', 'completed', 'cancelled'])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<any>(null)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null)
  const [deletionModalOpen, setDeletionModalOpen] = useState(false)
  const [contractToDelete, setContractToDelete] = useState<any>(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<any>(null)

  // Initialize filters from URL params
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || 'active',
    category: searchParams.get('category') || 'all',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
  })
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null)
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [advancedFilterModalOpen, setAdvancedFilterModalOpen] = useState(false)
  const [isAiFiltered, setIsAiFiltered] = useState(false)

  // Count active filters (excluding defaults)
  const getActiveFilterCount = () => {
    let count = 0
    if (filters.status !== 'active') count++
    if (filters.category !== 'all') count++
    return count
  }

  // Sync filters and search to URL
  useEffect(() => {
    const params = new URLSearchParams()

    // Add filters to URL (skip defaults to keep URL clean)
    if (filters.status !== 'active') params.set('status', filters.status)
    if (filters.category !== 'all') params.set('category', filters.category)
    if (filters.sortBy !== 'createdAt') params.set('sortBy', filters.sortBy)
    if (filters.sortOrder !== 'desc') params.set('sortOrder', filters.sortOrder)
    if (searchQuery) params.set('search', searchQuery)

    // Preserve edit param if present
    if (editId) params.set('edit', editId)

    // Update URL without triggering navigation
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(newUrl, { scroll: false })
  }, [filters, searchQuery, pathname, router, editId])

  useEffect(() => {
    fetchContracts()
  }, [filters, searchQuery])

  // Listen for Arnaldo chat updates and refetch data
  useEffect(() => {
    const handleDataUpdate = () => {
      fetchContracts()
    }

    window.addEventListener('arnaldo-data-updated', handleDataUpdate)
    return () => window.removeEventListener('arnaldo-data-updated', handleDataUpdate)
  }, [filters, searchQuery]) // Include filters so it refetches with current filter state

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

  // Helper function to apply normalized sorting
  const applySorting = (contracts: any[]) => {
    return [...contracts].sort((a: any, b: any) => {
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
  }

  // Client-side search filtering and sorting
  useEffect(() => {
    // If AI filter is active, don't refilter
    if (isAiFiltered) return

    let filtered = contracts

    // Apply quick filter
    if (activeQuickFilter === 'high-value') {
      filtered = filtered.filter((contract: any) => (contract.totalValue || 0) > 50000)
    } else if (activeQuickFilter === 'completed-this-month') {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      filtered = filtered.filter((contract: any) => {
        if (contract.status !== 'completed' || !contract.completedDate) return false
        const completedDate = new Date(contract.completedDate)
        return completedDate >= startOfMonth && completedDate <= endOfMonth
      })
    } else if (activeQuickFilter === 'last-30-days') {
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter((contract: any) => {
        const createdDate = new Date(contract.createdAt)
        return createdDate >= thirtyDaysAgo && createdDate <= today
      })
    }
    // Note: 'active' and 'cancelled' are handled by status filter
    // Note: 'active' is handled by status filter, not here

    // Apply search filter
    if (searchQuery.trim()) {
      const query = normalizeText(searchQuery)
      filtered = filtered.filter((contract: any) =>
        normalizeText(contract.clientName || '').includes(query) ||
        normalizeText(contract.projectName || '').includes(query) ||
        normalizeText(contract.category || '').includes(query) ||
        normalizeText(contract.description || '').includes(query)
      )
    }

    // Apply sorting
    const sorted = applySorting(filtered)
    setFilteredContracts(sorted)
  }, [contracts, searchQuery, filters.sortBy, filters.sortOrder, activeQuickFilter, isAiFiltered])

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
        if (contract.totalValue !== null) {
          console.log(`    - Frontend totalValue precise?: ${Number.isInteger(contract.totalValue * 100)}`)
          console.log(`    - Frontend totalValue as string: "${contract.totalValue.toString()}"`)
          console.log(`    - Formatted display: R$ ${contract.totalValue.toLocaleString('pt-BR')}`)
        } else {
          console.log(`    - totalValue is null (optional for this profession)`)
        }
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

  function openDetailsModal(contract: any) {
    setSelectedContract(contract)
    setDetailsModalOpen(true)
  }

  function closeDetailsModal() {
    setDetailsModalOpen(false)
    setSelectedContract(null)
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
      {/* Quick Filter Chips + Add Button (merged row - saves ~40px) */}
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          {/* Left side: Quick filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (activeQuickFilter === 'active') {
                  setFilters({ ...filters, status: 'all' })
                  setActiveQuickFilter(null)
                } else {
                  setFilters({ ...filters, status: 'active' })
                  setActiveQuickFilter('active')
                }
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeQuickFilter === 'active'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200'
              }`}
            >
              ✅ Ativos
            </button>

            <button
              onClick={() => {
                if (activeQuickFilter === 'high-value') {
                  setActiveQuickFilter(null)
                } else {
                  setActiveQuickFilter('high-value')
                }
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeQuickFilter === 'high-value'
                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                  : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200'
              }`}
            >
              💰 Acima de R$50k
            </button>

            {/* [+ Mais] dropdown */}
            <div className="relative">
              <button
                onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200 flex items-center gap-1"
              >
                + Mais
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {moreFiltersOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMoreFiltersOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-20">
                    <button
                      onClick={() => {
                        setActiveQuickFilter(activeQuickFilter === 'completed-this-month' ? null : 'completed-this-month')
                        setMoreFiltersOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                        activeQuickFilter === 'completed-this-month'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      ✅ Concluídos Este Mês
                      {activeQuickFilter === 'completed-this-month' && <span className="ml-auto text-blue-600">✓</span>}
                    </button>
                    <button
                      onClick={() => {
                        setActiveQuickFilter(activeQuickFilter === 'last-30-days' ? null : 'last-30-days')
                        setMoreFiltersOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                        activeQuickFilter === 'last-30-days'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      📅 Últimos 30 Dias
                      {activeQuickFilter === 'last-30-days' && <span className="ml-auto text-blue-600">✓</span>}
                    </button>
                    <button
                      onClick={() => {
                        setFilters({ ...filters, status: 'cancelled' })
                        setActiveQuickFilter('cancelled')
                        setMoreFiltersOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                        activeQuickFilter === 'cancelled'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      ❌ Cancelados
                      {activeQuickFilter === 'cancelled' && <span className="ml-auto text-blue-600">✓</span>}
                    </button>

                    {/* Separator */}
                    <div className="border-t border-neutral-200 my-1" />

                    {/* AI Filtering */}
                    <button
                      onClick={() => {
                        setAdvancedFilterModalOpen(true)
                        setMoreFiltersOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 text-blue-700 font-medium"
                    >
                      🤖 Filtros Avançados (IA)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right side: Add button */}
          <button
            onClick={openAddModal}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-medium transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">{terminology.createContract}</span>
            <span className="sm:hidden">Adicionar</span>
          </button>
        </div>
      </div>

      {/* Compact Filters - Desktop (hidden on mobile) */}
      <div className="mb-6 hidden md:block">
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
          {(filters.status !== 'active' || filters.category !== 'all' || searchQuery || activeQuickFilter || isAiFiltered) && (
            <button
              onClick={() => {
                setFilters({ status: 'active', category: 'all', sortBy: 'signedDate', sortOrder: 'desc' })
                setSearchQuery('')
                setActiveQuickFilter(null)
                setIsAiFiltered(false)
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap px-2 transition-colors"
              aria-label="Limpar todos os filtros"
            >
              × Limpar
            </button>
          )}

          {/* Copy Link Button - show when filters are active (but not AI filter since that's not in URL) */}
          {(filters.status !== 'active' || filters.category !== 'all' || filters.sortBy !== 'createdAt' || filters.sortOrder !== 'desc' || searchQuery || activeQuickFilter) && !isAiFiltered && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                alert('Link copiado! Você pode compartilhar esta visualização filtrada.')
              }}
              className="text-sm text-neutral-600 hover:text-neutral-800 font-medium whitespace-nowrap px-2 transition-colors flex items-center gap-1"
              aria-label="Copiar link desta visualização"
              title="Copiar link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Copiar Link</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Filters - Collapsed (shown only on mobile) */}
      <div className="mb-6 md:hidden">
        <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-neutral-200 shadow-sm">
          {/* Search Input */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-neutral-300 rounded-md bg-white text-neutral-900 placeholder-neutral-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filters Button with Badge */}
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="relative px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-md font-medium text-sm hover:bg-neutral-200 transition-colors whitespace-nowrap flex items-center gap-2 min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
            {getActiveFilterCount() > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {getActiveFilterCount()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setMobileFiltersOpen(false)}
          />

          {/* Bottom Sheet */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-4 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Filtros</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filter Options */}
            <div className="p-4 space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Status</label>
                <select
                  className="w-full border border-neutral-300 rounded-lg px-4 py-3 text-base bg-white text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="completed">Finalizados</option>
                  <option value="cancelled">Cancelados</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Categoria</label>
                <select
                  className="w-full border border-neutral-300 rounded-lg px-4 py-3 text-base bg-white text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <option value="all">Todas</option>
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-neutral-200 p-4 flex gap-3">
              <button
                onClick={() => {
                  setFilters({ status: 'active', category: 'all', sortBy: 'signedDate', sortOrder: 'desc' })
                  setActiveQuickFilter(null)
                }}
                className="flex-1 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg font-medium hover:bg-blue-100 transition-colors min-h-[48px]"
              >
                Limpar
              </button>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 px-4 py-3 text-white bg-blue-600 rounded-lg font-medium hover:bg-blue-700 transition-colors min-h-[48px]"
              >
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}

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
                        {terminology.project} / {terminology.client}
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
                    const displayValue = contract.totalValue !== null
                      ? contract.totalValue.toLocaleString('pt-BR')
                      : '-'

                    if (contract.totalValue !== null) {
                      console.log(`🎨 RENDER DEBUG - Contract ${contract.id}:`)
                      console.log(`    - Raw value: ${contract.totalValue}`)
                      console.log(`    - Raw value type: ${typeof contract.totalValue}`)
                      console.log(`    - Rendered display: "${displayValue}"`)
                      console.log(`    - Value precise?: ${Number.isInteger(contract.totalValue * 100)}`)
                    }

                    return (
                    <tr key={contract.id} className="group hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <button
                            onClick={() => openDetailsModal(contract)}
                            className="font-semibold text-neutral-900 hover:text-blue-600 hover:underline cursor-pointer text-left transition-colors"
                          >
                            {contract.projectName}
                          </button>
                          <div className="text-sm text-neutral-600">{contract.clientName}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-bold text-lg text-neutral-900">
                          {contract.totalValue !== null ? `R$ ${displayValue}` : '-'}
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
                        {contract.signedDate ? formatDateForDisplay(contract.signedDate) : '-'}
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
        title={editingContract ? terminology.editContract : terminology.createContract}
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

      {/* Advanced AI Filter Modal */}
      <AdvancedFilterModal
        entity="contract"
        isOpen={advancedFilterModalOpen}
        onClose={() => setAdvancedFilterModalOpen(false)}
        onResultsReceived={(results) => {
          // Apply AI-filtered results with normalized sorting
          const sorted = applySorting(results)
          setFilteredContracts(sorted)
          setIsAiFiltered(true)
        }}
      />

      {/* Contract Details Modal */}
      {selectedContract && (
        <ContractDetailsModal
          isOpen={detailsModalOpen}
          onClose={closeDetailsModal}
          contract={selectedContract}
        />
      )}
    </div>
  )
}