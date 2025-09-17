'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
// Supervisor imports removed - clean slate for rebuild

// Helper functions for date conversion with UTC handling
function formatDateForInput(date: string | Date): string {
  if (!date) return ''
  if (typeof date === 'string' && date.includes('T')) {
    // Extract date part from ISO string to avoid timezone conversion
    return date.split('T')[0]
  }
  const d = new Date(date)
  return format(d, 'yyyy-MM-dd')
}

function formatDateForDisplay(date: string | Date): string {
  if (!date) return ''
  if (typeof date === 'string' && date.includes('T')) {
    // Extract date part from ISO string and format manually to avoid timezone conversion
    const datePart = date.split('T')[0]
    const [year, month, day] = datePart.split('-')
    return `${day}/${month}/${year}`
  }
  const d = new Date(date)
  return format(d, 'dd/MM/yyyy')
}

function ExpensesPageContent() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [expenses, setExpenses] = useState([])
  const [contracts, setContracts] = useState([])
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, overdue: 0, count: 0 })
  const [loading, setLoading] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [showAISection, setShowAISection] = useState(true)
  const [aiMessage, setAiMessage] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiHistory, setAiHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [pendingExpense, setPendingExpense] = useState<any>(null)
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
    category: 'materiais',
    contractId: '',
    vendor: '',
    invoiceNumber: '',
    type: 'operational',
    notes: '',
    status: 'pending',
    paidDate: '',
    paidAmount: '',
  })

  const expenseCategories = [
    'materiais', 'mão-de-obra', 'equipamentos', 'transporte', 'escritório', 'software',
    'utilidades', 'aluguel', 'seguro', 'marketing', 'serviços-profissionais', 'outros'
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

  useEffect(() => {
    fetchExpenses()
    fetchContracts()
  }, [filters])

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
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses'
      const method = editingExpense ? 'PUT' : 'POST'

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
        ...(formData.status === 'paid' && !formData.paidDate && { paidDate: new Date().toISOString().split('T')[0] }),
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
        fetchExpenses()
      } else {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Erro ao salvar despesa')
    }
  }

  async function handleAISubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!aiMessage.trim()) return

    setAiLoading(true)
    const newHistory = [...aiHistory, { role: 'user' as const, content: aiMessage }]
    setAiHistory(newHistory)
    setAiMessage('')

    try {
      const res = await fetch('/api/ai/create-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: aiMessage,
          history: aiHistory,
          pendingExpense,
          isConfirming: pendingExpense !== null
        })
      })

      const result = await res.json()

      if (result.action === 'created') {
        // Supervisor alert handling removed - clean slate for rebuild

        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: result.confirmation || 'Despesa criada com sucesso!'
        }])
        setPendingExpense(null)
        fetchExpenses()
        setTimeout(() => {
          setAiHistory([])
          setPendingExpense(null)
        }, 3000)
      } else if (result.action === 'confirm') {
        setPendingExpense(result.expense)
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: result.confirmation || 'Pode confirmar se os dados estão corretos?'
        }])
      } else if (result.action === 'clarify') {
        // Clear pending expense when asking for clarification to avoid confusion
        setPendingExpense(null)
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: result.question
        }])
      } else if (result.action === 'error') {
        // Clear pending expense on error
        setPendingExpense(null)
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: result.message
        }])
      } else {
        // Handle unexpected responses
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: 'Resposta inesperada. Tente novamente ou use o modo manual.'
        }])
      }
    } catch (error) {
      console.error('AI error:', error)
      setAiHistory([...newHistory, {
        role: 'assistant' as const,
        content: 'Erro ao processar solicitação. Tente novamente.'
      }])
    } finally {
      setAiLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      description: '',
      amount: '',
      dueDate: '',
      category: 'materiais',
      contractId: '',
      vendor: '',
      invoiceNumber: '',
      type: 'operational',
      notes: '',
      status: 'pending',
      paidDate: '',
      paidAmount: '',
    })
    setEditingExpense(null)
    setShowAISection(false) // Switch to manual mode after editing
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
    setShowAISection(false) // Switch to manual mode for editing
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
        fetchExpenses()
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
        fetchExpenses()
        alert('Despesa excluída!')
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Erro ao excluir despesa')
    }
  }

  function getStatusDisplay(expense) {
    let status = expense.status

    // Check if pending expense is overdue
    if (status === 'pending' && new Date(expense.dueDate) < new Date()) {
      status = 'overdue'
    }

    const statusOption = statusOptions.find(s => s.value === status)
    return statusOption || { label: status, color: 'bg-neutral-100 text-neutral-900' }
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mb-4">
        <a href="/" className="text-blue-600 hover:underline">← Voltar ao Início</a>
      </div>

      <h1 className="text-3xl font-bold mb-8 text-neutral-900">Gerenciamento de Despesas</h1>

      {/* Supervisor Alerts removed - clean slate for rebuild */}

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
        {/* Form Section */}
        <div>
          {/* Toggle between AI and Manual */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setShowAISection(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${showAISection
                ? 'bg-blue-700 text-white'
                : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200'
              }`}
            >
              🤖 Adicionar com IA
            </button>
            <button
              type="button"
              onClick={() => setShowAISection(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${!showAISection
                ? 'bg-blue-700 text-white'
                : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200'
              }`}
            >
              ✏️ Adicionar Manual
            </button>
          </div>

          {showAISection ? (
            <div className="bg-white border-2 border-neutral-300 p-6 rounded-lg shadow-sm" id="expense-form">
              <h2 className="text-xl font-bold mb-4 text-neutral-900">Adicionar Despesa com IA</h2>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
                <p className="text-sm text-blue-800 leading-relaxed">
                  💡 <strong>Dica:</strong> Descreva a despesa em linguagem natural. Exemplos:
                  <br />
                  <em>"Compra de materiais na Leroy Merlin, 5 mil reais, vencimento amanhã"</em>
                  <br />
                  <em>"Aluguel do escritório 3500 vencimento dia 10"</em>
                </p>
              </div>

              {/* Pending Expense Indicator */}
              {pendingExpense && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <h3 className="text-sm font-bold text-yellow-800 mb-2">⏳ Despesa Pendente de Confirmação:</h3>
                  <div className="text-sm text-yellow-700">
                    <p><strong>Descrição:</strong> {pendingExpense.description}</p>
                    <p><strong>Valor:</strong> R$ {Number(pendingExpense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p><strong>Vencimento:</strong> {new Date(pendingExpense.dueDate).toLocaleDateString('pt-BR')}</p>
                    <p><strong>Categoria:</strong> {pendingExpense.category}</p>
                    {pendingExpense.vendor && <p><strong>Fornecedor:</strong> {pendingExpense.vendor}</p>}
                  </div>
                  <p className="text-xs text-yellow-600 mt-2">Digite "sim" ou "confirmar" para criar a despesa</p>
                </div>
              )}

              {/* AI Chat History */}
              {aiHistory.length > 0 && (
                <div className="mb-4 space-y-2 max-h-60 overflow-y-auto">
                  {aiHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded border ${
                        msg.role === 'user'
                          ? 'bg-gray-100 border-gray-300 ml-8'
                          : 'bg-blue-50 border-blue-200 mr-8'
                      }`}
                    >
                      <p className="text-sm font-bold mb-1 text-neutral-900">
                        {msg.role === 'user' ? '👤 Você' : '🤖 Assistente'}
                      </p>
                      <p className="text-sm text-neutral-900 leading-relaxed">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAISubmit} className="space-y-4">
                <div>
                  <textarea
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 h-24 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-600"
                    placeholder="Descreva a despesa que deseja criar..."
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    disabled={aiLoading}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium transition-colors"
                    disabled={aiLoading}
                  >
                    {aiLoading ? 'Processando...' : 'Enviar'}
                  </button>
                  {aiHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAiHistory([])
                        setPendingExpense(null)
                      }}
                      className="bg-neutral-600 text-white px-6 py-2 rounded-lg hover:bg-neutral-700 font-medium transition-colors"
                    >
                      Limpar Conversa
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white border-2 border-neutral-300 p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-neutral-900">
                {editingExpense ? 'Editar Despesa' : 'Adicionar Despesa Manual'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4" id="expense-form">
                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Descrição *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Data de Vencimento *</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Categoria *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
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
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
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
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
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
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Número da Nota</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Observações</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-900">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
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
                        className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-neutral-900">Valor Pago</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.paidAmount}
                        onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                        className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
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
                    {editingExpense ? 'Atualizar' : 'Criar'} Despesa
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
          )}
        </div>

        {/* List Section */}
        <div className="bg-white border-2 border-neutral-300 p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-neutral-900">Lista de Despesas</h2>
            {loading && <span className="text-blue-700 font-medium">Carregando...</span>}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-600 focus:outline-none"
            >
              <option value="all">Todos os Status</option>
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>

            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-600 focus:outline-none"
            >
              <option value="all">Todas Categorias</option>
              {expenseCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-600 focus:outline-none"
            >
              <option value="all">Todos os Tipos</option>
              {expenseTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-600 focus:outline-none"
            >
              <option value="dueDate">Data de Vencimento</option>
              <option value="amount">Valor</option>
              <option value="description">Descrição</option>
              <option value="vendor">Fornecedor</option>
              <option value="createdAt">Data de Criação</option>
            </select>
          </div>

          {/* Expenses List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
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