'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatDateForInput, formatDateFull as formatDateForDisplay, getTodayDateString, getExpenseActualStatus } from '@/lib/date-utils'
// Supervisor imports removed - clean slate for rebuild

function ExpensesPageContent() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [expenses, setExpenses] = useState([])
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [contracts, setContracts] = useState([])
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, overdue: 0, count: 0 })
  const [loading, setLoading] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [viewMode, setViewMode] = useState('regular') // 'regular', 'recurring'
  // Supervisor state removed - clean slate for rebuild

  // Filters
  const [filters, setFilters] = useState({
    contractId: 'all',
    status: 'pending',
    category: 'all',
    type: 'all',
    sortBy: 'dueDate',
    sortOrder: 'asc',
  })

  // Form data
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    dueDate: '',
    category: 'Salários',
    contractId: '',
    vendor: '',
    invoiceNumber: '',
    type: 'operational',
    notes: '',
    status: 'pending',
    paidDate: '',
    paidAmount: '',
  })

  // Recurring expense state (separate to avoid interference)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringData, setRecurringData] = useState({
    frequency: 'monthly',
    interval: 1,
    endDate: '',
    maxOccurrences: '',
  })

  const expenseCategories = [
    'Salários', 'Escritório', 'Software', 'Marketing', 'Transporte', 'Equipamentos', 'Impostos', 'Outros'
  ]

  const expenseTypes = [
    { value: 'operational', label: 'Operacional' },
    { value: 'project', label: 'Projeto' },
    { value: 'administrative', label: 'Administrativo' },
  ]

  const statusOptions = [
    { value: 'pending', label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'paid', label: 'Pago', color: 'bg-green-100 text-green-800' },
    { value: 'overdue', label: 'Atrasado', color: 'bg-red-100 text-red-800' },
    { value: 'cancelled', label: 'Cancelado', color: 'bg-neutral-100 text-neutral-900' },
  ]

  const frequencyOptions = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'annual', label: 'Anual' },
  ]

  useEffect(() => {
    if (viewMode === 'regular') {
      fetchExpenses()
    } else {
      fetchRecurringExpenses()
    }
    fetchContracts()
  }, [filters, viewMode])

  // Handle auto-edit when URL parameter is present
  useEffect(() => {
    if (editId && expenses.length > 0) {
      const expenseToEdit = expenses.find((e: any) => e.id === editId)
      if (expenseToEdit) {
        editExpense(expenseToEdit)
        // Scroll to form
        setTimeout(() => {
          document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    }
  }, [editId, expenses])

  async function fetchExpenses() {
    setLoading(true)
    try {
      const params = new URLSearchParams(filters)
      const response = await fetch(`/api/expenses?${params}`)

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error(`Failed to fetch expenses: ${response.status}`)
      }

      const data = await response.json()
      setExpenses(data.expenses || [])
      setSummary(data.summary || { total: 0, paid: 0, pending: 0, overdue: 0, count: 0 })
    } catch (error) {
      console.error('Error fetching expenses:', error)
      alert('Erro ao carregar despesas')
      setExpenses([])
      setSummary({ total: 0, paid: 0, pending: 0, overdue: 0, count: 0 })
    } finally {
      setLoading(false)
    }
  }

  async function fetchRecurringExpenses() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        category: filters.category,
        contractId: filters.contractId,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })
      const response = await fetch(`/api/recurring-expenses?${params}`)

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error(`Failed to fetch recurring expenses: ${response.status}`)
      }

      const data = await response.json()
      setRecurringExpenses(data.recurringExpenses || [])
      setSummary(data.summary || { total: 0, paid: 0, pending: 0, overdue: 0, count: 0 })
    } catch (error) {
      console.error('Error fetching recurring expenses:', error)
      alert('Erro ao carregar despesas recorrentes')
      setRecurringExpenses([])
      setSummary({ total: 0, paid: 0, pending: 0, overdue: 0, count: 0 })
    } finally {
      setLoading(false)
    }
  }

  async function fetchContracts() {
    try {
      const response = await fetch('/api/contracts')

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error(`Failed to fetch contracts: ${response.status}`)
      }

      const data = await response.json()
      setContracts(data || [])
    } catch (error) {
      console.error('Error fetching contracts:', error)
      setContracts([])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      // Validate and prepare form data
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        alert('Por favor, insira um valor válido maior que zero')
        return
      }

      // Validate paid amount if provided
      let paidAmount = null
      if (formData.paidAmount && formData.paidAmount.trim() !== '') {
        paidAmount = parseFloat(formData.paidAmount)
        if (isNaN(paidAmount) || paidAmount < 0) {
          alert('Por favor, insira um valor pago válido')
          return
        }
      }

      // Check if this is a recurring expense (only for new expenses, not edits)
      if (isRecurring && !editingExpense) {
        // Validate recurring data
        const interval = parseInt(recurringData.interval)
        if (isNaN(interval) || interval < 1) {
          alert('Por favor, insira um intervalo válido (1 ou maior)')
          return
        }

        // Auto-calculate dayOfMonth from startDate
        const startDate = new Date(formData.dueDate)
        const dayOfMonth = startDate.getDate()

        const maxOccurrences = recurringData.maxOccurrences ? parseInt(recurringData.maxOccurrences) : null
        if (maxOccurrences && maxOccurrences < 1) {
          alert('Por favor, insira um número de ocorrências válido')
          return
        }

        // Prepare recurring expense data
        const recurringExpenseData = {
          description: formData.description,
          amount: amount,
          category: formData.category,
          frequency: recurringData.frequency,
          interval: interval,
          dayOfMonth: dayOfMonth,
          startDate: formData.dueDate,
          endDate: recurringData.endDate || null,
          maxOccurrences: maxOccurrences,
          contractId: formData.contractId || null,
          vendor: formData.vendor || null,
          invoiceNumber: formData.invoiceNumber || null,
          type: formData.type,
          notes: formData.notes || null,
        }

        const response = await fetch('/api/recurring-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recurringExpenseData),
        })

        if (response.ok) {
          alert('Despesa recorrente criada com sucesso!')
          resetForm()
          // Switch to recurring view to show the created recurring expense
          setViewMode('recurring')
        } else {
          const error = await response.json()
          alert(`Erro: ${error.error}`)
        }
        return
      }

      // Regular expense logic (existing functionality preserved)
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses'
      const method = editingExpense ? 'PUT' : 'POST'

      // Prepare the data object - exclude undefined/empty fields to avoid validation issues
      const expenseData = {
        description: formData.description,
        amount: amount,
        dueDate: formData.dueDate,
        category: formData.category,
        type: formData.type,
        status: formData.status,
        contractId: formData.contractId || null,
        vendor: formData.vendor || null,
        invoiceNumber: formData.invoiceNumber || null,
        notes: formData.notes || null,
        ...(paidAmount !== null && { paidAmount }),
        // Include paidDate if provided, or set to today if status is paid but no date provided
        ...(formData.paidDate && { paidDate: formData.paidDate }),
        ...(formData.status === 'paid' && !formData.paidDate && { paidDate: getTodayDateString() }),
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      })

      if (response.ok) {
        const result = await response.json()

        // Supervisor alert handling removed - clean slate for rebuild

        alert(editingExpense ? 'Despesa atualizada com sucesso!' : 'Despesa criada com sucesso!')
        resetForm()
        if (viewMode === 'regular') {
          fetchExpenses()
        } else {
          fetchRecurringExpenses()
        }
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Erro ao salvar despesa')
    }
  }


  function resetForm() {
    setFormData({
      description: '',
      amount: '',
      dueDate: '',
      category: 'Salários',
      contractId: '',
      vendor: '',
      invoiceNumber: '',
      type: 'operational',
      notes: '',
      status: 'pending',
      paidDate: '',
      paidAmount: '',
    })
    setIsRecurring(false)
    setRecurringData({
      frequency: 'monthly',
      interval: 1,
      endDate: '',
      maxOccurrences: '',
    })
    setEditingExpense(null)
  }

  async function editExpense(expense) {
    setEditingExpense(expense)
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      dueDate: formatDateForInput(expense.dueDate),
      category: expense.category,
      contractId: expense.contractId || '',
      vendor: expense.vendor || '',
      invoiceNumber: expense.invoiceNumber || '',
      type: expense.type,
      notes: expense.notes || '',
      status: expense.status || 'pending',
      paidDate: expense.paidDate ? formatDateForInput(expense.paidDate) : '',
      paidAmount: expense.paidAmount ? expense.paidAmount.toString() : '',
    })
  }

  async function markAsPaid(expense) {
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          paidDate: new Date().toISOString(),
          paidAmount: expense.amount,
        }),
      })

      if (response.ok) {
        if (viewMode === 'regular') {
          fetchExpenses()
        } else {
          fetchRecurringExpenses()
        }
        alert('Despesa marcada como paga!')
      }
    } catch (error) {
      console.error('Error marking as paid:', error)
      alert('Erro ao marcar como paga')
    }
  }

  async function deleteExpense(expense) {
    if (!confirm(`Excluir despesa "${expense.description}"?`)) return

    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        if (viewMode === 'regular') {
          fetchExpenses()
        } else {
          fetchRecurringExpenses()
        }
        alert('Despesa excluída!')
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Erro ao excluir despesa')
    }
  }

  function getStatusDisplay(expense) {
    const status = getExpenseActualStatus(expense)
    const statusOption = statusOptions.find(s => s.value === status)
    return statusOption || { label: status, color: 'bg-neutral-100 text-neutral-900' }
  }

  // Recurring expense functions
  async function toggleRecurringActive(recurring) {
    try {
      const response = await fetch(`/api/recurring-expenses/${recurring.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !recurring.isActive,
        }),
      })

      if (response.ok) {
        fetchRecurringExpenses()
        alert(recurring.isActive ? 'Despesa recorrente pausada!' : 'Despesa recorrente ativada!')
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Error toggling active status:', error)
      alert('Erro ao alterar status')
    }
  }

  async function generateNext(recurring) {
    try {
      const response = await fetch(`/api/recurring-expenses/${recurring.id}/generate`, {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()
        fetchRecurringExpenses()
        alert(result.message)
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Error generating expense:', error)
      alert('Erro ao gerar despesa')
    }
  }

  async function deleteRecurring(recurring) {
    if (!confirm(`Excluir despesa recorrente "${recurring.description}"? Isso não afetará as despesas já geradas.`)) return

    try {
      const response = await fetch(`/api/recurring-expenses/${recurring.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchRecurringExpenses()
        alert('Despesa recorrente excluída!')
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting recurring expense:', error)
      alert('Erro ao excluir despesa recorrente')
    }
  }

  function getFrequencyDisplay(frequency, interval) {
    const base = frequencyOptions.find(f => f.value === frequency)?.label || frequency
    if (interval === 1) return base
    return `A cada ${interval} ${frequency === 'weekly' ? 'semanas' :
                                   frequency === 'monthly' ? 'meses' :
                                   frequency === 'quarterly' ? 'trimestres' : 'anos'}`
  }

  function getRecurringStatusDisplay(recurring) {
    if (!recurring.isActive) {
      return { label: 'Pausada', color: 'bg-gray-100 text-gray-800' }
    }

    if (recurring.lastError) {
      return { label: 'Erro', color: 'bg-red-100 text-red-800' }
    }

    if (recurring.maxOccurrences && recurring.generatedCount >= recurring.maxOccurrences) {
      return { label: 'Concluída', color: 'bg-green-100 text-green-800' }
    }

    const nextDue = new Date(recurring.nextDue)
    const today = new Date()
    if (nextDue <= today) {
      return { label: 'Pronta', color: 'bg-blue-100 text-blue-800' }
    }

    return { label: 'Ativa', color: 'bg-green-100 text-green-800' }
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mb-4">
        <a href="/" className="text-blue-600 hover:underline">← Voltar ao Início</a>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Gerenciamento de Despesas</h1>

        {/* View Mode Toggle */}
        <div className="flex bg-neutral-200 rounded-lg p-1">
          <button
            onClick={() => setViewMode('regular')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'regular'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Despesas Regulares
          </button>
          <button
            onClick={() => setViewMode('recurring')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'recurring'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            🔄 Despesas Recorrentes
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded">
          <h3 className="text-sm font-medium text-blue-700">Total Despesas</h3>
          <p className="text-2xl font-bold text-blue-900">
            R$ {summary.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-blue-600">{summary.count} despesas</p>
        </div>
        <div className="bg-green-50 border border-green-200 p-4 rounded">
          <h3 className="text-sm font-medium text-green-700">Pagas</h3>
          <p className="text-2xl font-bold text-green-900">
            R$ {summary.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <h3 className="text-sm font-medium text-yellow-700">Pendentes</h3>
          <p className="text-2xl font-bold text-yellow-900">
            R$ {summary.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 p-4 rounded">
          <h3 className="text-sm font-medium text-red-700">Atrasadas</h3>
          <p className="text-2xl font-bold text-red-900">
            R$ {summary.overdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section - Only show for regular expenses */}
        {viewMode === 'regular' && (
        <div>
          {/* Toggle between AI and Manual */}

          <div className="bg-white border-2 border-neutral-300 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-neutral-900">
              {editingExpense ? 'Editar Despesa' : 'Adicionar Despesa'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4" id="expense-form">
                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Descrição *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Valor *</label>
                  <input
                    type="number"
                      value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Data de Vencimento *</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Categoria *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                    required
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                  >
                    {expenseTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Projeto</label>
                  <select
                    value={formData.contractId}
                    onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                  >
                    <option value="">Nenhum projeto específico</option>
                    {contracts.map(contract => (
                      <option key={contract.id} value={contract.id}>
                        {contract.clientName} - {contract.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Fornecedor</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Número da Nota</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Observações</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                    rows={3}
                  />
                </div>

                {/* Recurring Expense Toggle - Only for new expenses */}
                {!editingExpense && (
                  <div className="border-t border-neutral-200 pt-4">
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="isRecurring"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-white border-2 border-neutral-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <label htmlFor="isRecurring" className="ml-2 text-sm font-medium text-neutral-900">
                        🔄 Repetir esta despesa automaticamente
                      </label>
                    </div>

                    {isRecurring && (
                      <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-blue-900">Frequência</label>
                            <select
                              value={recurringData.frequency}
                              onChange={(e) => setRecurringData({ ...recurringData, frequency: e.target.value })}
                              className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-blue-900"
                            >
                              {frequencyOptions.map(freq => (
                                <option key={freq.value} value={freq.value}>{freq.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2 text-blue-900">Repetir a cada</label>
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={recurringData.interval}
                              onChange={(e) => setRecurringData({ ...recurringData, interval: parseInt(e.target.value) || 1 })}
                              className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-blue-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* dayOfMonth is now auto-calculated from startDate */}

                          <div>
                            <label className="block text-sm font-medium mb-2 text-blue-900">
                              Máximo de ocorrências (opcional)
                              <span className="text-xs text-blue-600 block">Deixe vazio para repetir indefinidamente</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={recurringData.maxOccurrences}
                              onChange={(e) => setRecurringData({ ...recurringData, maxOccurrences: e.target.value })}
                              className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-blue-900"
                              placeholder="Ex: 12 para um ano"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 text-blue-900">
                            Data final (opcional)
                            <span className="text-xs text-blue-600 block">Deixe vazio para repetir indefinidamente</span>
                          </label>
                          <input
                            type="date"
                            value={recurringData.endDate}
                            onChange={(e) => setRecurringData({ ...recurringData, endDate: e.target.value })}
                            className="w-full border-2 border-blue-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-blue-900"
                          />
                        </div>

                        <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded">
                          <strong>💡 Como funciona:</strong> Esta despesa será automaticamente criada nos próximos vencimentos.
                          Você pode gerenciar e modificar a recorrência na seção "Despesas Recorrentes".
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                  >
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                {(formData.status === 'paid' || editingExpense?.status === 'paid') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-neutral-900">Data do Pagamento</label>
                      <input
                        type="date"
                        value={formData.paidDate}
                        onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
                        className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-neutral-900">Valor Pago</label>
                      <input
                        type="number"
                              value={formData.paidAmount}
                        onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                        className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                        placeholder="Deixe vazio para usar o valor total"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 font-medium transition-colors"
                  >
                    {editingExpense
                      ? 'Atualizar Despesa'
                      : isRecurring
                        ? '🔄 Criar Despesa Recorrente'
                        : 'Criar Despesa'
                    }
                  </button>
                  {editingExpense && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
          </div>
        </div>
        )}

        {/* List Section */}
        <div className="bg-white border-2 border-neutral-300 p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-neutral-900">
              {viewMode === 'regular' ? 'Lista de Despesas' : 'Lista de Despesas Recorrentes'}
            </h2>
            {loading && <span className="text-blue-700 font-medium">Carregando...</span>}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="all">Todos os Status</option>
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>

            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="all">Todas Categorias</option>
              {expenseCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="all">Todos os Tipos</option>
              {expenseTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="dueDate">Data de Vencimento</option>
              <option value="amount">Valor</option>
              <option value="description">Descrição</option>
              <option value="vendor">Fornecedor</option>
              <option value="createdAt">Data de Criação</option>
            </select>
          </div>

          {/* Expenses List - Regular or Recurring */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {viewMode === 'regular' ? (
              <>
                {expenses.map(expense => {
                  const statusDisplay = getStatusDisplay(expense)
                  return (
                    <div key={expense.id} className="bg-white border-2 border-neutral-300 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg text-neutral-900">{expense.description}</h3>
                            <span className={`px-2 py-1 rounded text-xs ${statusDisplay.color}`}>
                              {statusDisplay.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-900 font-medium">
                            <div>
                              <strong>Valor:</strong> R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div>
                              <strong>Vencimento:</strong> {formatDateForDisplay(expense.dueDate)}
                            </div>
                            {expense.vendor && (
                              <div>
                                <strong>Fornecedor:</strong> {expense.vendor}
                              </div>
                            )}
                            <div>
                              <strong>Categoria:</strong> {expense.category}
                            </div>
                          </div>

                          {expense.contract && (
                            <div className="text-sm text-blue-700 mt-1 font-medium">
                              <strong>Projeto:</strong> {expense.contract.clientName} - {expense.contract.projectName}
                            </div>
                          )}

                          {expense.paidDate && (
                            <div className="text-sm text-green-700 mt-1 font-medium">
                              <strong>Pago em:</strong> {formatDateForDisplay(expense.paidDate)}
                              {expense.paidAmount && expense.paidAmount !== expense.amount && (
                                <span> - R$ {expense.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 ml-4">
                          {expense.status === 'pending' && (
                            <button
                              onClick={() => markAsPaid(expense)}
                              className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 font-medium transition-colors"
                            >
                              Marcar Pago
                            </button>
                          )}
                          <button
                            onClick={() => editExpense(expense)}
                            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteExpense(expense)}
                            className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 font-medium transition-colors"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {expenses.length === 0 && !loading && (
                  <div className="text-center text-neutral-900 py-8 font-medium">
                    Nenhuma despesa encontrada
                  </div>
                )}
              </>
            ) : (
              <>
                {recurringExpenses.map(recurring => {
                  const statusDisplay = getRecurringStatusDisplay(recurring)
                  return (
                    <div key={recurring.id} className="bg-white border-2 border-neutral-300 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg text-neutral-900">{recurring.description}</h3>
                            <span className={`px-2 py-1 rounded text-xs ${statusDisplay.color}`}>
                              {statusDisplay.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm text-neutral-900 font-medium">
                            <div>
                              <strong>Valor:</strong> R$ {recurring.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div>
                              <strong>Próximo:</strong> {formatDateForDisplay(recurring.nextDue)}
                            </div>
                            <div>
                              <strong>Frequência:</strong> {getFrequencyDisplay(recurring.frequency, recurring.interval)}
                            </div>
                            <div>
                              <strong>Categoria:</strong> {recurring.category}
                            </div>
                            <div>
                              <strong>Geradas:</strong> {recurring.generatedCount}
                              {recurring.maxOccurrences && ` / ${recurring.maxOccurrences}`}
                            </div>
                            <div>
                              <strong>Dia:</strong> {new Date(recurring.startDate).getDate()}
                            </div>
                          </div>

                          {recurring.contract && (
                            <div className="text-sm text-blue-700 mt-1 font-medium">
                              <strong>Projeto:</strong> {recurring.contract.clientName} - {recurring.contract.projectName}
                            </div>
                          )}

                          {recurring.vendor && (
                            <div className="text-sm text-neutral-600 mt-1">
                              <strong>Fornecedor:</strong> {recurring.vendor}
                            </div>
                          )}

                          {recurring.lastError && (
                            <div className="text-sm text-red-600 mt-1 bg-red-50 p-2 rounded">
                              <strong>⚠️ Erro:</strong> {recurring.lastError}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 ml-4">
                          {recurring.isActive ? (
                            <>
                              <button
                                onClick={() => generateNext(recurring)}
                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                              >
                                Gerar Agora
                              </button>
                              <button
                                onClick={() => toggleRecurringActive(recurring)}
                                className="text-xs bg-yellow-600 text-white px-3 py-1 rounded-lg hover:bg-yellow-700 font-medium transition-colors"
                              >
                                Pausar
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => toggleRecurringActive(recurring)}
                              className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 font-medium transition-colors"
                            >
                              Ativar
                            </button>
                          )}
                          <button
                            onClick={() => deleteRecurring(recurring)}
                            className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 font-medium transition-colors"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {recurringExpenses.length === 0 && !loading && (
                  <div className="text-center text-neutral-600 py-12">
                    <div className="text-6xl mb-4">📅</div>
                    <h3 className="text-xl font-medium mb-2">Nenhuma despesa recorrente encontrada</h3>
                    <p className="text-neutral-500 mb-4">
                      Comece criando uma despesa recorrente usando o formulário na aba "Despesas Regulares".
                    </p>
                    <button
                      onClick={() => setViewMode('regular')}
                      className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                      Criar Primeira Despesa Recorrente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
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