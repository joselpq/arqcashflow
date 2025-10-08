'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { formatDateForInput, formatDateFull as formatDateForDisplay } from '@/lib/date-utils'
import Modal from '../components/Modal'
import ExpenseForm from '../components/forms/ExpenseForm'
import RecurringExpenseActionModal from '../components/RecurringExpenseActionModal'

function ExpensesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const editId = searchParams.get('edit')

  const [expenses, setExpenses] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([])
  const [uniqueStatuses] = useState(['pending', 'paid', 'overdue', 'cancelled'])

  // Initialize filters from URL params
  const [filters, setFilters] = useState({
    contractId: searchParams.get('contractId') || 'all',
    status: searchParams.get('status') || 'pending',
    category: searchParams.get('category') || 'all',
    type: searchParams.get('type') || 'all',
    isRecurring: searchParams.get('isRecurring') || 'all',
    sortBy: searchParams.get('sortBy') || 'dueDate',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
  })
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [filteredExpenses, setFilteredExpenses] = useState([])
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null)
  const [recurringActionModal, setRecurringActionModal] = useState<{
    isOpen: boolean
    expense: any
    action: 'edit' | 'delete'
  }>({
    isOpen: false,
    expense: null,
    action: 'edit'
  })

  const expenseCategories = [
    'Salários', 'Escritório', 'Software', 'Marketing', 'Transporte', 'Equipamentos', 'Impostos', 'Outros'
  ]

  const expenseTypes = [
    { value: 'operational', label: 'Operacional' },
    { value: 'project', label: 'Projeto' },
    { value: 'administrative', label: 'Administrativo' },
  ]

  // Sync filters and search to URL
  useEffect(() => {
    const params = new URLSearchParams()

    // Add filters to URL (skip defaults to keep URL clean)
    if (filters.contractId !== 'all') params.set('contractId', filters.contractId)
    if (filters.status !== 'pending') params.set('status', filters.status)
    if (filters.category !== 'all') params.set('category', filters.category)
    if (filters.type !== 'all') params.set('type', filters.type)
    if (filters.isRecurring !== 'all') params.set('isRecurring', filters.isRecurring)
    if (filters.sortBy !== 'dueDate') params.set('sortBy', filters.sortBy)
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
    fetchExpenses()
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
    let filtered = expenses

    // Apply quick filter (this-week or high-value)
    if (activeQuickFilter === 'this-week') {
      const today = new Date()
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter((expense: any) => {
        const dueDate = new Date(expense.dueDate)
        return expense.status === 'pending' && dueDate >= today && dueDate <= nextWeek
      })
    } else if (activeQuickFilter === 'high-value') {
      filtered = filtered.filter((expense: any) => expense.amount > 5000)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = normalizeText(searchQuery)
      filtered = filtered.filter((expense: any) =>
        normalizeText(expense.description || '').includes(query) ||
        normalizeText(expense.vendor || '').includes(query) ||
        normalizeText(expense.category || '').includes(query) ||
        normalizeText(expense.notes || '').includes(query)
      )
    }

    // Apply sorting
    const sorted = [...filtered].sort((a: any, b: any) => {
      let aVal, bVal

      switch (filters.sortBy) {
        case 'description':
          aVal = normalizeText(a.description || '')
          bVal = normalizeText(b.description || '')
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
        case 'dueDate':
          aVal = new Date(a.dueDate || 0).getTime()
          bVal = new Date(b.dueDate || 0).getTime()
          break
        default:
          aVal = new Date(a.dueDate || 0).getTime()
          bVal = new Date(b.dueDate || 0).getTime()
      }

      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1
      return 0
    })

    setFilteredExpenses(sorted)
  }, [expenses, searchQuery, filters.sortBy, filters.sortOrder, activeQuickFilter])

  // Handle auto-edit when URL parameter is present
  useEffect(() => {
    if (editId && expenses.length > 0) {
      const expenseToEdit = expenses.find((e: any) => e.id === editId)
      if (expenseToEdit) {
        openEditModal(expenseToEdit)
      }
    }
  }, [editId, expenses])

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

  async function fetchExpenses() {
    try {
      const params = new URLSearchParams()
      if (filters.contractId !== 'all') params.set('contractId', filters.contractId)
      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.category !== 'all') params.set('category', filters.category)
      if (filters.type !== 'all') params.set('type', filters.type)
      if (filters.isRecurring !== 'all') params.set('isRecurring', filters.isRecurring)
      // Note: Sorting handled client-side for better text/category sorting

      const res = await fetch(`/api/expenses?${params.toString()}`)

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error(`Failed to fetch expenses: ${res.status}`)
      }

      const data = await res.json()
      const expensesData = data.expenses || []
      setExpenses(expensesData)

      // Extract unique categories for filter dropdown
      const categories = [...new Set(expensesData.map((e: any) => e.category).filter(Boolean))] as string[]
      setUniqueCategories(categories)
    } catch (error) {
      console.error('Falha ao buscar despesas:', error)
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingExpense(null)
    setIsModalOpen(true)
  }

  function openEditModal(expense: any) {
    // Check if this is a recurring expense
    if (expense.recurringExpenseId) {
      setRecurringActionModal({
        isOpen: true,
        expense: expense,
        action: 'edit'
      })
      return
    }

    setEditingExpense(expense)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingExpense(null)
  }

  async function handleFormSubmit(expenseData: any) {
    try {
      // If creating a recurring expense, use the recurring-expenses endpoint
      if (expenseData.isRecurring && expenseData.recurringData && !editingExpense) {
        const recurringPayload = {
          description: expenseData.description,
          amount: expenseData.amount,
          category: expenseData.category,
          frequency: expenseData.recurringData.frequency,
          interval: expenseData.recurringData.interval,
          startDate: expenseData.dueDate, // Use dueDate as startDate for recurring
          endDate: expenseData.recurringData.endDate || null,
          maxOccurrences: expenseData.recurringData.maxOccurrences || null,
          contractId: expenseData.contractId || null,
          vendor: expenseData.vendor || null,
          invoiceNumber: expenseData.invoiceNumber || null,
          type: expenseData.type || 'operational',
          notes: expenseData.notes || null,
          isActive: true
        }

        const res = await fetch('/api/recurring-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recurringPayload),
        })

        if (res.ok) {
          closeModal()
          fetchExpenses()
        } else {
          const error = await res.json()
          alert('Erro ao criar despesa recorrente: ' + JSON.stringify(error))
        }
      } else if (editingExpense && editingExpense._recurringScope && editingExpense.recurringExpenseId) {
        // Editing a recurring expense with scope
        const scope = editingExpense._recurringScope

        // Check if frequency or interval changed
        const frequencyChanged = expenseData.recurringData && editingExpense._recurringExpense &&
          (editingExpense._recurringExpense.frequency !== expenseData.recurringData.frequency ||
           editingExpense._recurringExpense.interval !== expenseData.recurringData.interval)

        console.log('Frequency changed:', frequencyChanged, {
          old: editingExpense._recurringExpense,
          new: expenseData.recurringData
        })

        // If frequency changed, we need to delete and recreate. Otherwise, just update.
        if (frequencyChanged && (scope === 'future' || scope === 'all')) {
          // Step 1: Delete future/all expenses from this recurring series
          const deleteRes = await fetch(`/api/expenses/${editingExpense.id}/recurring-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'delete',
              scope: scope
            })
          })

          if (!deleteRes.ok) {
            alert('Erro ao deletar despesas futuras')
            return
          }

          const deleteResult = await deleteRes.json()
          console.log(`Deleted ${deleteResult.result.deleted} expense(s)`)

          // Step 2: Create a new RecurringExpense with the new parameters
          let startDate: Date

          if (scope === 'all') {
            // For 'all' scope: preserve the original start date of the series
            startDate = new Date(editingExpense._recurringExpense.startDate)
          } else {
            // For 'future' scope: start from the current expense date (which will be deleted and recreated)
            startDate = new Date(editingExpense.dueDate)
          }

          const newRecurringExpense = {
            description: expenseData.description,
            amount: expenseData.amount,
            category: expenseData.category,
            frequency: expenseData.recurringData.frequency,
            interval: expenseData.recurringData.interval,
            startDate: startDate.toISOString(),
            endDate: expenseData.recurringData.endDate || null,
            maxOccurrences: null,
            contractId: expenseData.contractId || null,
            vendor: expenseData.vendor || null,
            invoiceNumber: expenseData.invoiceNumber || null,
            notes: expenseData.notes || null,
            isActive: true
          }

          const createRes = await fetch('/api/recurring-expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecurringExpense)
          })

          if (createRes.ok) {
            alert(`Frequência atualizada! Uma nova série de despesas recorrentes foi criada com a nova periodicidade.`)
            closeModal()
            fetchExpenses()
          } else {
            const error = await createRes.json()
            alert('Erro ao criar nova série de despesas recorrentes: ' + (error.message || JSON.stringify(error)))
          }
        } else {
          // No frequency change - just update expenses normally
          const updatedData = {
            description: expenseData.description,
            amount: expenseData.amount,
            category: expenseData.category,
            vendor: expenseData.vendor || undefined,
            notes: expenseData.notes || undefined,
          }

          const res = await fetch(`/api/expenses/${editingExpense.id}/recurring-action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'edit',
              scope: scope,
              updatedData: updatedData
            })
          })

          if (res.ok) {
            const result = await res.json()

            // Also update RecurringExpense template if scope is future/all
            if ((scope === 'future' || scope === 'all') && expenseData.recurringData) {
              const recurringUpdateData: any = {
                description: expenseData.description,
                amount: expenseData.amount,
                category: expenseData.category,
                frequency: expenseData.recurringData.frequency,
                interval: expenseData.recurringData.interval,
              }

              if (expenseData.vendor) recurringUpdateData.vendor = expenseData.vendor
              if (expenseData.notes) recurringUpdateData.notes = expenseData.notes
              if (expenseData.recurringData.endDate) recurringUpdateData.endDate = expenseData.recurringData.endDate

              await fetch(`/api/recurring-expenses/${editingExpense.recurringExpenseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recurringUpdateData)
              })
            }

            alert(`${result.result.updated} despesa(s) atualizada(s) com sucesso!`)
            closeModal()
            fetchExpenses()
          } else {
            const error = await res.json()
            alert('Erro ao editar despesa recorrente: ' + (error.message || JSON.stringify(error)))
          }
        }
      } else {
        // Regular expense creation/update
        const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses'
        const method = editingExpense ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        })

        if (res.ok) {
          closeModal()
          fetchExpenses()
        } else {
          const error = await res.json()
          alert('Erro: ' + JSON.stringify(error))
        }
      }
    } catch (error) {
      console.error('Error submitting expense:', error)
      alert(editingExpense ? 'Falha ao atualizar despesa' : 'Falha ao criar despesa')
    }
  }

  async function deleteExpense(id: string, expense: any) {
    // Check if this is a recurring expense
    if (expense.recurringExpenseId) {
      setRecurringActionModal({
        isOpen: true,
        expense: expense,
        action: 'delete'
      })
      return
    }

    if (!confirm(`Tem certeza que deseja excluir a despesa "${expense.description}"?`)) return

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchExpenses()
      } else {
        alert('Falha ao excluir despesa')
      }
    } catch (error) {
      alert('Falha ao excluir despesa')
    }
  }

  async function handleRecurringAction(scope: 'this' | 'future' | 'all') {
    const { expense, action } = recurringActionModal

    if (!expense) return

    try {
      if (action === 'delete') {
        // Delete with scope using recurring-action endpoint
        const res = await fetch(`/api/expenses/${expense.id}/recurring-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            scope: scope
          })
        })

        if (res.ok) {
          const result = await res.json()
          alert(`${result.result.deleted} despesa(s) excluída(s) com sucesso!`)
          fetchExpenses()
        } else {
          const error = await res.json()
          alert('Falha ao excluir despesa recorrente: ' + (error.message || JSON.stringify(error)))
        }
      } else if (action === 'edit') {
        // For edit, fetch the recurring expense details and open edit modal
        if (expense.recurringExpenseId) {
          const recurringRes = await fetch(`/api/recurring-expenses/${expense.recurringExpenseId}`)
          if (recurringRes.ok) {
            const data = await recurringRes.json()
            const recurringExpense = data.recurringExpense || data // Handle both wrapped and unwrapped responses
            setEditingExpense({
              ...expense,
              _recurringScope: scope,
              _recurringExpense: recurringExpense
            })
            setIsModalOpen(true)
          } else {
            alert('Falha ao buscar detalhes da despesa recorrente')
          }
        }
      }
    } catch (error) {
      console.error('Error handling recurring action:', error)
      alert(`Erro ao ${action === 'delete' ? 'excluir' : 'editar'} despesa recorrente`)
    }
  }

  async function markAsPaid(expense: any) {
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paidDate: new Date().toISOString(),
          paidAmount: expense.amount,
        }),
      })

      if (res.ok) {
        fetchExpenses()
      }
    } catch (error) {
      console.error('Error marking as paid:', error)
      alert('Erro ao marcar como paga')
    }
  }

  function getStatusDisplay(expense: any) {
    const status = expense.status
    const statusOptions = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      paid: { label: 'Pago', color: 'bg-green-100 text-green-800' },
      overdue: { label: 'Atrasado', color: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Cancelado', color: 'bg-neutral-100 text-neutral-900' },
    }
    return statusOptions[status as keyof typeof statusOptions] || { label: status, color: 'bg-neutral-100 text-neutral-900' }
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
          aria-label="Adicionar nova despesa"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Adicionar Despesa</span>
          <span className="sm:hidden">Adicionar</span>
        </button>
      </div>

      {/* Quick Filter Chips */}
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (activeQuickFilter === 'this-week') {
                // Deactivate - reset to defaults
                setFilters({ ...filters, status: 'pending' })
                setActiveQuickFilter(null)
              } else {
                // Activate - show pending expenses due this week
                setFilters({ ...filters, status: 'pending' })
                setActiveQuickFilter('this-week')
              }
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeQuickFilter === 'this-week'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200'
            }`}
            aria-label="Filtrar por despesas vencendo esta semana"
          >
            ⏰ Vencendo Esta Semana
          </button>

          <button
            onClick={() => {
              if (activeQuickFilter === 'recurring') {
                setFilters({ ...filters, isRecurring: 'all' })
                setActiveQuickFilter(null)
              } else {
                setFilters({ ...filters, isRecurring: 'true' })
                setActiveQuickFilter('recurring')
              }
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeQuickFilter === 'recurring'
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200'
            }`}
            aria-label="Filtrar por despesas recorrentes"
          >
            🔄 Recorrentes
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
            aria-label="Filtrar por despesas acima de R$5.000"
          >
            💰 Acima de R$5k
          </button>
        </div>
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
              placeholder="Buscar despesas, fornecedores..."
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
            <option value="pending">Status: Pendente</option>
            <option value="paid">Status: Pago</option>
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
            {expenseCategories.map(category => (
              <option key={category} value={category}>Categoria: {category}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            aria-label="Filtrar por tipo"
          >
            <option value="all">Tipo: Todos</option>
            {expenseTypes.map(type => (
              <option key={type.value} value={type.value}>Tipo: {type.label}</option>
            ))}
          </select>

          {/* Recurring Filter */}
          <select
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
            value={filters.isRecurring}
            onChange={(e) => setFilters({ ...filters, isRecurring: e.target.value })}
            aria-label="Filtrar por recorrência"
          >
            <option value="all">🔄 Recorrente: Todos</option>
            <option value="true">🔄 Recorrente: Sim</option>
            <option value="false">🔄 Recorrente: Não</option>
          </select>

          {/* Clear Filters Button */}
          {(filters.status !== 'pending' || filters.category !== 'all' || filters.type !== 'all' || filters.isRecurring !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilters({ contractId: 'all', status: 'pending', category: 'all', type: 'all', isRecurring: 'all', sortBy: 'dueDate', sortOrder: 'asc' })
                setSearchQuery('')
                setActiveQuickFilter(null)
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap px-2 transition-colors"
              aria-label="Limpar todos os filtros"
            >
              × Limpar
            </button>
          )}

          {/* Copy Link Button - show when filters are active */}
          {(filters.contractId !== 'all' || filters.status !== 'pending' || filters.category !== 'all' || filters.type !== 'all' || filters.isRecurring !== 'all' || filters.sortBy !== 'dueDate' || filters.sortOrder !== 'asc' || searchQuery) && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                // Could add a toast notification here
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

      {/* Expenses Table */}
      {loading ? (
        <p>Carregando...</p>
      ) : filteredExpenses.length === 0 ? (
        <p className="text-neutral-900 font-medium">
          {searchQuery ? `Nenhuma despesa encontrada para "${searchQuery}"` : 'Nenhuma despesa ainda'}
        </p>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('description')}
                      className="group flex items-center gap-1 text-xs font-medium text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
                    >
                      Descrição
                      {getSortIcon('description')}
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
                      onClick={() => handleSort('dueDate')}
                      className="group flex items-center gap-1 text-xs font-medium text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
                    >
                      Vencimento
                      {getSortIcon('dueDate')}
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
                {filteredExpenses.map((expense: any) => {
                  const statusDisplay = getStatusDisplay(expense)
                  return (
                    <tr key={expense.id} className="group hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-semibold text-neutral-900 flex items-center gap-2">
                            {expense.recurringExpenseId && <span title="Despesa recorrente">🔄</span>}
                            {expense.description}
                          </div>
                          {expense.vendor && <div className="text-sm text-neutral-600">{expense.vendor}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-bold text-lg text-neutral-900">
                          R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusDisplay.color}`}>
                          {statusDisplay.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-900">
                        {formatDateForDisplay(expense.dueDate)}
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-900">
                        {expense.category || '-'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {expense.status === 'pending' && (
                            <button
                              onClick={() => markAsPaid(expense)}
                              className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 font-medium transition-colors"
                              title="Marcar como pago"
                            >
                              ✓
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(expense)}
                            className="bg-blue-700 text-white px-2 py-1 rounded text-xs hover:bg-blue-800 font-medium transition-colors"
                            title="Editar despesa"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteExpense(expense.id, expense)}
                            className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 font-medium transition-colors"
                            title="Excluir despesa"
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
        title={editingExpense ? 'Editar Despesa' : 'Adicionar Despesa'}
        size="lg"
      >
        <ExpenseForm
          expense={editingExpense}
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
          contracts={contracts}
        />
      </Modal>

      {/* Recurring Expense Action Modal */}
      <RecurringExpenseActionModal
        isOpen={recurringActionModal.isOpen}
        onClose={() => setRecurringActionModal({ ...recurringActionModal, isOpen: false })}
        expense={recurringActionModal.expense}
        action={recurringActionModal.action}
        onActionConfirm={handleRecurringAction}
      />
    </div>
  )
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8">Carregando...</div>}>
      <ExpensesPageContent />
    </Suspense>
  )
}
