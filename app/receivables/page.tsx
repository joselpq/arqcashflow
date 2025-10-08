'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { formatDateForInput, formatDateFull as formatDateForDisplay } from '@/lib/date-utils'
import Modal from '../components/Modal'
import ReceivableForm from '../components/forms/ReceivableForm'
import { AdvancedFilterModal } from '../components/AdvancedFilterModal'

function ReceivablesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const editId = searchParams.get('edit')

  const [receivables, setReceivables] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingReceivable, setEditingReceivable] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([])
  const [uniqueStatuses] = useState(['pending', 'received', 'overdue', 'cancelled'])

  // Initialize filters from URL params
  const [filters, setFilters] = useState({
    contractId: searchParams.get('contractId') || 'all',
    status: searchParams.get('status') || 'pending',
    category: searchParams.get('category') || 'all',
    sortBy: searchParams.get('sortBy') || 'expectedDate',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
  })
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [filteredReceivables, setFilteredReceivables] = useState([])
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null)
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [advancedFilterModalOpen, setAdvancedFilterModalOpen] = useState(false)
  const [isAiFiltered, setIsAiFiltered] = useState(false)

  // Count active filters (excluding defaults)
  const getActiveFilterCount = () => {
    let count = 0
    if (filters.status !== 'pending') count++
    if (filters.category !== 'all') count++
    if (filters.contractId !== 'all') count++
    return count
  }

  // Sync filters and search to URL
  useEffect(() => {
    const params = new URLSearchParams()

    // Add filters to URL (skip defaults to keep URL clean)
    if (filters.contractId !== 'all') params.set('contractId', filters.contractId)
    if (filters.status !== 'pending') params.set('status', filters.status)
    if (filters.category !== 'all') params.set('category', filters.category)
    if (filters.sortBy !== 'expectedDate') params.set('sortBy', filters.sortBy)
    if (filters.sortOrder !== 'asc') params.set('sortOrder', filters.sortOrder)
    if (searchQuery) params.set('search', searchQuery)

    // Preserve edit param if present
    if (editId) params.set('edit', editId)

    // Update URL without triggering navigation
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(newUrl, { scroll: false })
  }, [filters, searchQuery, pathname, router, editId])

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

  // Helper function to apply normalized sorting
  const applySorting = (receivables: any[]) => {
    return [...receivables].sort((a: any, b: any) => {
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
  }

  // Client-side search filtering and sorting
  useEffect(() => {
    // If AI filter is active, don't refilter
    if (isAiFiltered) return

    let filtered = receivables

    // Apply quick filter
    if (activeQuickFilter === 'this-month') {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      filtered = filtered.filter((receivable: any) => {
        const expectedDate = new Date(receivable.expectedDate)
        return expectedDate >= startOfMonth && expectedDate <= endOfMonth
      })
    } else if (activeQuickFilter === 'high-value') {
      filtered = filtered.filter((receivable: any) => receivable.amount > 10000)
    } else if (activeQuickFilter === 'last-7-days') {
      const today = new Date()
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter((receivable: any) => {
        const expectedDate = new Date(receivable.expectedDate)
        return expectedDate >= sevenDaysAgo && expectedDate <= today
      })
    } else if (activeQuickFilter === 'last-30-days') {
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter((receivable: any) => {
        const expectedDate = new Date(receivable.expectedDate)
        return expectedDate >= thirtyDaysAgo && expectedDate <= today
      })
    } else if (activeQuickFilter === 'received-this-month') {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      filtered = filtered.filter((receivable: any) => {
        if (receivable.status !== 'received' || !receivable.receivedDate) return false
        const receivedDate = new Date(receivable.receivedDate)
        return receivedDate >= startOfMonth && receivedDate <= endOfMonth
      })
    }
    // Note: 'overdue' and 'cancelled' are handled by status filter, not here

    // Apply search filter
    if (searchQuery.trim()) {
      const query = normalizeText(searchQuery)
      filtered = filtered.filter((receivable: any) =>
        normalizeText(receivable.contract?.projectName || '').includes(query) ||
        normalizeText(receivable.contract?.clientName || '').includes(query) ||
        normalizeText(receivable.category || '').includes(query) ||
        normalizeText(receivable.description || '').includes(query)
      )
    }

    // Apply sorting
    const sorted = applySorting(filtered)
    setFilteredReceivables(sorted)
  }, [receivables, searchQuery, filters.sortBy, filters.sortOrder, activeQuickFilter, isAiFiltered])

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
      {/* Quick Filter Chips + Add Button (merged row - saves ~40px) */}
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          {/* Left side: Quick filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (activeQuickFilter === 'overdue') {
                  setFilters({ ...filters, status: 'pending' })
                  setActiveQuickFilter(null)
                } else {
                  setFilters({ ...filters, status: 'overdue' })
                  setActiveQuickFilter('overdue')
                }
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeQuickFilter === 'overdue'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200'
              }`}
            >
              ⚠️ Atrasados
            </button>

            <button
              onClick={() => {
                if (activeQuickFilter === 'this-month') {
                  setActiveQuickFilter(null)
                } else {
                  setActiveQuickFilter('this-month')
                }
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeQuickFilter === 'this-month'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200'
              }`}
            >
              📅 Este Mês
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
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200'
              }`}
            >
              💰 Acima de R$10k
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
                        setActiveQuickFilter(activeQuickFilter === 'last-7-days' ? null : 'last-7-days')
                        setMoreFiltersOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                        activeQuickFilter === 'last-7-days'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      📅 Últimos 7 Dias
                      {activeQuickFilter === 'last-7-days' && <span className="ml-auto text-blue-600">✓</span>}
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
                        setActiveQuickFilter(activeQuickFilter === 'received-this-month' ? null : 'received-this-month')
                        setMoreFiltersOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                        activeQuickFilter === 'received-this-month'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      ✅ Recebidos Este Mês
                      {activeQuickFilter === 'received-this-month' && <span className="ml-auto text-blue-600">✓</span>}
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
            <span className="hidden sm:inline">Adicionar Recebível</span>
            <span className="sm:hidden">Adicionar</span>
          </button>
        </div>
      </div>

      {/* Compact Filters - Desktop (hidden on mobile) */}
      <div className="mb-6 hidden md:block">
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
          {(filters.status !== 'pending' || filters.contractId !== 'all' || filters.category !== 'all' || searchQuery || activeQuickFilter || isAiFiltered) && (
            <button
              onClick={() => {
                setFilters({ contractId: 'all', status: 'pending', category: 'all', sortBy: 'expectedDate', sortOrder: 'asc' })
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
          {(filters.contractId !== 'all' || filters.status !== 'pending' || filters.category !== 'all' || filters.sortBy !== 'expectedDate' || filters.sortOrder !== 'asc' || searchQuery || activeQuickFilter) && !isAiFiltered && (
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
                  <option value="pending">Pendente</option>
                  <option value="received">Recebido</option>
                  <option value="overdue">Atrasado</option>
                  <option value="cancelled">Cancelado</option>
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

              {/* Contract */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Projeto</label>
                <select
                  className="w-full border border-neutral-300 rounded-lg px-4 py-3 text-base bg-white text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={filters.contractId}
                  onChange={(e) => setFilters({ ...filters, contractId: e.target.value })}
                >
                  <option value="all">Todos</option>
                  {contracts.map((contract: any) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.projectName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-neutral-200 p-4 flex gap-3">
              <button
                onClick={() => {
                  setFilters({ contractId: 'all', status: 'pending', category: 'all', sortBy: 'expectedDate', sortOrder: 'asc' })
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

      {/* Advanced AI Filter Modal */}
      <AdvancedFilterModal
        entity="receivable"
        isOpen={advancedFilterModalOpen}
        onClose={() => setAdvancedFilterModalOpen(false)}
        onResultsReceived={(results) => {
          // Apply AI-filtered results with normalized sorting
          const sorted = applySorting(results)
          setFilteredReceivables(sorted)
          setIsAiFiltered(true)
        }}
      />
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
