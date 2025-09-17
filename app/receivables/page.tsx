'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'

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

function ReceivablesPageContent() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [receivables, setReceivables] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingReceivable, setEditingReceivable] = useState<any>(null)
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([])
  const [uniqueStatuses] = useState(['pending', 'received', 'overdue', 'cancelled'])
  const [filters, setFilters] = useState({
    contractId: 'all',
    status: 'pending',
    category: 'all',
    sortBy: 'expectedDate',
    sortOrder: 'asc',
  })
  const [formData, setFormData] = useState({
    contractId: '',
    expectedDate: '',
    amount: '',
    invoiceNumber: '',
    category: '',
    notes: '',
    receivedDate: '',
    receivedAmount: '',
  })
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [predefinedCategories, setPredefinedCategories] = useState([
    'projeto',
    'obra',
    'RT'
  ])
  const [showAISection, setShowAISection] = useState(true)
  const [aiMessage, setAiMessage] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiHistory, setAiHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [pendingReceivable, setPendingReceivable] = useState<any>(null)

  useEffect(() => {
    fetchContracts()
  }, [])

  useEffect(() => {
    // Always fetch receivables when filters change, regardless of contracts
    // This allows receivables to load even if there are no contracts
    fetchReceivables()
  }, [filters])

  // Handle auto-edit when URL parameter is present
  useEffect(() => {
    if (editId && receivables.length > 0) {
      const receivableToEdit = receivables.find((r: any) => r.id === editId)
      if (receivableToEdit) {
        editReceivable(receivableToEdit)
        // Scroll to form
        setTimeout(() => {
          document.getElementById('receivable-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
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

      // Extract unique categories for filter dropdown
      const categories = [...new Set(data.map((r: any) => r.category).filter(Boolean))]
      setUniqueCategories(categories)
    } catch (error) {
      console.error('Falha ao buscar contas a receber:', error)
      setReceivables([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchData() {
    await fetchContracts()
    await fetchReceivables()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const url = editingReceivable ? `/api/receivables/${editingReceivable.id}` : '/api/receivables'
      const method = editingReceivable ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          receivedAmount: formData.receivedAmount ? parseFloat(formData.receivedAmount) : null,
        }),
      })

      if (res.ok) {
        const result = await res.json()


        alert(editingReceivable ? 'Conta a receber atualizada com sucesso!' : 'Conta a receber criada com sucesso!')
        resetForm()
        fetchData()
      } else {
        const error = await res.json()
        alert('Erro: ' + JSON.stringify(error))
      }
    } catch (error) {
      alert(editingReceivable ? 'Falha ao atualizar conta a receber' : 'Falha ao criar conta a receber')
    }
  }

  function resetForm() {
    setFormData({
      contractId: '',
      expectedDate: '',
      amount: '',
      invoiceNumber: '',
      category: '',
      notes: '',
      receivedDate: '',
      receivedAmount: '',
    })
    setEditingReceivable(null)
    setCustomCategory('')
    setShowCustomCategory(false)
  }

  function editReceivable(receivable: any) {
    // Switch to manual mode when editing
    setShowAISection(false)

    setEditingReceivable(receivable)
    const category = receivable.category || ''

    // Check if category is in predefined list
    if (category && !predefinedCategories.includes(category)) {
      // If not in list, show as custom
      setShowCustomCategory(true)
      setCustomCategory(category)
    } else {
      setShowCustomCategory(false)
      setCustomCategory('')
    }

    setFormData({
      contractId: receivable.contractId || '',
      expectedDate: receivable.expectedDate ? formatDateForInput(receivable.expectedDate) : '',
      amount: receivable.amount ? receivable.amount.toString() : '',
      invoiceNumber: receivable.invoiceNumber || '',
      category: category || '',
      notes: receivable.notes || '',
      receivedDate: receivable.receivedDate ? formatDateForInput(receivable.receivedDate) : '',
      receivedAmount: receivable.receivedAmount ? receivable.receivedAmount.toString() : '',
    })
  }

  async function deleteReceivable(id: string) {
    if (!confirm('Tem certeza de que deseja excluir esta conta a receber?')) return

    try {
      const res = await fetch(`/api/receivables/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert('Conta a receber excluída com sucesso!')
        fetchData()
      } else {
        alert('Falha ao excluir conta a receber')
      }
    } catch (error) {
      alert('Falha ao excluir conta a receber')
    }
  }

  async function handleAISubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!aiMessage.trim()) return

    setAiLoading(true)
    const userMessage = aiMessage
    setAiMessage('')

    // Add user message to history
    const newHistory = [...aiHistory, { role: 'user' as const, content: userMessage }]
    setAiHistory(newHistory)

    try {
      const res = await fetch('/api/ai/create-receivable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: aiHistory,
          pendingReceivable,
          isConfirming: pendingReceivable !== null
        }),
      })

      const result = await res.json()

      if (result.action === 'created') {

        // Receivable created successfully
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: `${result.message}\n📋 Conta a receber criada com sucesso!`
        }])
        setPendingReceivable(null)
        fetchData()
        // Clear history after successful creation
        setTimeout(() => {
          setAiHistory([])
          setPendingReceivable(null)
        }, 3000)
      } else if (result.action === 'clarify') {
        // AI needs more information
        let response = result.question
        if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
          response += '\n\nOpções disponíveis:\n' + result.suggestions.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')
        }
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: response
        }])
      } else if (result.action === 'no_contract') {
        let response = result.message
        if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
          response += '\n\nContratos similares:\n' + result.suggestions.join('\n')
        }
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: response
        }])
      } else if (result.action === 'confirm') {
        // AI needs confirmation before creating
        setPendingReceivable(result.pendingReceivable)
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: result.question
        }])
      } else if (result.action === 'edit_suggestion') {
        // AI detected edit intention
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: result.message
        }])
      } else {
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: 'Desculpe, não consegui processar sua solicitação.'
        }])
      }
    } catch (error) {
      console.error('AI error:', error)
      setAiHistory([...newHistory, {
        role: 'assistant' as const,
        content: 'Erro ao processar solicitação. Verifique se a API está configurada.'
      }])
    } finally {
      setAiLoading(false)
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
          alert('Marcado como recebido!')
          fetchData()
        }
      } catch (error) {
        alert('Falha ao atualizar conta a receber')
      }
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mb-4">
        <a href="/" className="text-blue-600 hover:underline">← Voltar ao Início</a>
      </div>

      <h1 className="text-3xl font-bold mb-8 text-neutral-900">Gerenciamento de Contas a Receber</h1>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

          {contracts.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
              <p className="text-yellow-800">⚠️ Nenhum contrato disponível</p>
              <p className="text-sm text-yellow-700 mt-1">
                Para criar contas a receber, você precisa primeiro <a href="/contracts" className="underline">criar um contrato</a>.
              </p>
            </div>
          ) : showAISection ? (
            <div id="receivable-form">
              <h2 className="text-xl font-bold mb-4 text-neutral-900">Adicionar Conta a Receber com IA</h2>

              <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
                <p className="text-sm text-green-800 leading-relaxed">
                  💡 <strong>Exemplos:</strong>
                  <br />
                  <em>"2500 a receber 25/11 da loja Leo Madeiras, RT do projeto dina claire"</em>
                  <br />
                  <em>"Receber 5000 dia 15 do próximo mês do João Silva, projeto residencial"</em>
                  <br />
                  <em>"3 parcelas de 1000 do restaurante Sabor, primeira dia 10"</em>
                </p>
              </div>

              {/* AI Chat History */}
              {aiHistory && Array.isArray(aiHistory) && aiHistory.length > 0 && (
                <div className="mb-4 space-y-2 max-h-60 overflow-y-auto">
                  {aiHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded border ${
                        msg.role === 'user'
                          ? 'bg-gray-100 border-gray-300 ml-8'
                          : 'bg-green-50 border-green-200 mr-8'
                      }`}
                    >
                      <p className="text-sm font-bold mb-1 text-neutral-900">
                        {msg.role === 'user' ? '👤 Você' : '🤖 Assistente'}
                      </p>
                      <p className="text-sm text-neutral-900 whitespace-pre-line leading-relaxed">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAISubmit} className="space-y-4">
                <div>
                  <textarea
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 h-24 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-600"
                    placeholder="Descreva a conta a receber que deseja criar..."
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    disabled={aiLoading}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                    disabled={aiLoading}
                  >
                    {aiLoading ? 'Processando...' : 'Enviar'}
                  </button>
                  {aiHistory && Array.isArray(aiHistory) && aiHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAiHistory([])}
                      className="bg-neutral-600 text-white px-6 py-2 rounded-lg hover:bg-neutral-700 font-medium transition-colors"
                    >
                      Limpar Conversa
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold mb-4 text-neutral-900">
                {editingReceivable ? 'Editar Conta a Receber' : 'Adicionar Manual'}
              </h2>
            </div>
          )}

          {contracts.length > 0 && !showAISection && (
            <form onSubmit={handleSubmit} className="space-y-4" id="receivable-form">
              <div>
                <label className="block mb-2 font-medium text-neutral-900">Contrato *</label>
                <select
                  required
                  className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                  value={formData.contractId || ''}
                  onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                >
                  <option value="">Selecione um contrato</option>
                  {contracts.map((contract: any) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.projectName} - {contract.clientName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 font-medium text-neutral-900">Data Prevista *</label>
                <input
                  type="date"
                  required
                  className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                  value={formData.expectedDate || ''}
                  onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-neutral-900">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-neutral-900">Número da Nota Fiscal</label>
                <input
                  type="text"
                  className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                  value={formData.invoiceNumber || ''}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-neutral-900">Data de Recebimento</label>
                <input
                  type="date"
                  className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                  value={formData.receivedDate || ''}
                  onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-neutral-900">Valor Recebido</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                  value={formData.receivedAmount || ''}
                  onChange={(e) => setFormData({ ...formData, receivedAmount: e.target.value })}
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-neutral-900">Categoria</label>
                <select
                  className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                  value={showCustomCategory ? 'custom' : (formData.category || '')}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === 'custom') {
                      setShowCustomCategory(true)
                      setFormData({ ...formData, category: '' })
                    } else if (value === 'add_new') {
                      const newCategory = prompt('Insira o nome da nova categoria:')
                      if (newCategory && newCategory.trim()) {
                        setPredefinedCategories(prev => [...prev, newCategory.trim()])
                        setFormData({ ...formData, category: newCategory.trim() })
                        setShowCustomCategory(false)
                      }
                    } else {
                      setFormData({ ...formData, category: value })
                      setShowCustomCategory(false)
                      setCustomCategory('')
                    }
                  }}
                >
                  <option value="">Selecione uma categoria</option>
                  {predefinedCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="add_new">➕ Adicionar nova categoria...</option>
                  <option value="custom">✏️ Inserir categoria personalizada...</option>
                </select>
                {showCustomCategory && (
                  <input
                    type="text"
                    className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 mt-2 focus:border-blue-600 focus:outline-none bg-white"
                    placeholder="Inserir categoria personalizada"
                    value={customCategory || ''}
                    onChange={(e) => {
                      setCustomCategory(e.target.value)
                      setFormData({ ...formData, category: e.target.value })
                    }}
                  />
                )}
              </div>

              <div>
                <label className="block mb-2 font-medium text-neutral-900">Observações</label>
                <textarea
                  className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 font-medium transition-colors"
                >
                  {editingReceivable ? 'Atualizar Conta a Receber' : 'Criar Conta a Receber'}
                </button>
                {editingReceivable && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-neutral-600 text-white px-6 py-2 rounded-lg hover:bg-neutral-700 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-neutral-900">Próximas Contas a Receber</h2>

          {/* Filters and Sorting */}
          <div className="mb-4 space-y-3 p-4 bg-white border-2 border-neutral-300 rounded-lg shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-2">Contrato</label>
                <select
                  className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
                  value={filters.contractId}
                  onChange={(e) => setFilters({ ...filters, contractId: e.target.value })}
                >
                  <option value="all">Todos os Contratos</option>
                  {contracts.map((contract: any) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.projectName}
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
                  <option value="all">Todos os Status</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
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
                  <option value="all">Todas as Categorias</option>
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
                  <option value="expectedDate">Data Prevista</option>
                  <option value="amount">Valor</option>
                  <option value="status">Status</option>
                  <option value="category">Categoria</option>
                  <option value="receivedDate">Data de Recebimento</option>
                  <option value="createdAt">Data de Criação</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-2">Ordem</label>
                <select
                  className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
                  value={filters.sortOrder}
                  onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
                >
                  <option value="asc">Crescente</option>
                  <option value="desc">Decrescente</option>
                </select>
              </div>
            </div>
          </div>
          {loading ? (
            <p>Carregando...</p>
          ) : receivables.length === 0 ? (
            <p className="text-neutral-900 font-medium">Nenhuma conta a receber ainda</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {receivables.map((receivable: any) => (
                <div key={receivable.id} className="bg-white border-2 border-neutral-300 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-neutral-900">{receivable.contract.projectName}</h3>
                      <p className="text-sm text-neutral-900 font-medium">Cliente: {receivable.contract.clientName}</p>
                      <p className="text-sm font-medium text-neutral-900">
                        Previsto: {formatDateForDisplay(receivable.expectedDate)}
                      </p>
                      <p className="text-sm font-semibold text-neutral-900">Valor: R${receivable.amount.toLocaleString()}</p>
                      {receivable.category && (
                        <p className="text-sm font-medium text-neutral-900">Categoria: {receivable.category}</p>
                      )}
                      <p className="text-sm font-medium text-neutral-900">
                        Status: <span className={
                          receivable.status === 'received' ? 'text-green-600' :
                          receivable.status === 'overdue' ? 'text-red-600' :
                          'text-yellow-600'
                        }>{receivable.status}</span>
                      </p>
                      {receivable.receivedDate && (
                        <p className="text-sm text-green-600">
                          Recebido: {formatDateForDisplay(receivable.receivedDate)}
                          {receivable.receivedAmount && ` - R$${receivable.receivedAmount.toLocaleString()}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => editReceivable(receivable)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteReceivable(receivable.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {(receivable.status === 'pending' || receivable.status === 'overdue') && (
                      <button
                        onClick={() => markAsReceived(receivable.id, receivable.amount)}
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 font-medium transition-colors"
                      >
                        Marcar como Recebido
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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