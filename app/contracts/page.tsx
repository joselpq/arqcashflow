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

function ContractsPageContent() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingContract, setEditingContract] = useState<any>(null)
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([])
  const [uniqueStatuses] = useState(['active', 'completed', 'cancelled'])
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [predefinedCategories, setPredefinedCategories] = useState([
    'Residencial',
    'Comercial',
    'Restaurante',
    'Loja'
  ])
  const [showAISection, setShowAISection] = useState(true)
  const [aiMessage, setAiMessage] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiHistory, setAiHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [pendingContract, setPendingContract] = useState<any>(null)
  const [filters, setFilters] = useState({
    status: 'active',
    category: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })
  const [formData, setFormData] = useState({
    clientName: '',
    projectName: '',
    description: '',
    totalValue: '',
    signedDate: '',
    status: 'active',
    category: '',
    notes: '',
  })

  useEffect(() => {
    fetchContracts()
  }, [filters])

  // Handle auto-edit when URL parameter is present
  useEffect(() => {
    if (editId && contracts.length > 0) {
      const contractToEdit = contracts.find((c: any) => c.id === editId)
      if (contractToEdit) {
        editContract(contractToEdit)
        // Scroll to form
        setTimeout(() => {
          document.getElementById('contract-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    }
  }, [editId, contracts])

  async function fetchContracts() {
    try {
      const params = new URLSearchParams()
      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.category !== 'all') params.set('category', filters.category)
      params.set('sortBy', filters.sortBy)
      params.set('sortOrder', filters.sortOrder)

      const res = await fetch(`/api/contracts?${params.toString()}`)

      if (!res.ok) {
        if (res.status === 401) {
          // User not authenticated, redirect to login
          window.location.href = '/login'
          return
        }
        throw new Error(`Failed to fetch contracts: ${res.status}`)
      }

      const data = await res.json()
      setContracts(data)

      // Extract unique categories for filter dropdown
      const categories = [...new Set(data.map((c: any) => c.category).filter(Boolean))] as string[]
      setUniqueCategories(categories)
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
      setContracts([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const url = editingContract ? `/api/contracts/${editingContract.id}` : '/api/contracts'
      const method = editingContract ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalValue: parseFloat(formData.totalValue),
        }),
      })

      if (res.ok) {
        const result = await res.json()


        alert(editingContract ? 'Contrato atualizado com sucesso!' : 'Contrato criado com sucesso!')
        resetForm()
        fetchContracts()
      } else {
        const error = await res.json()
        alert('Error: ' + JSON.stringify(error))
      }
    } catch (error) {
      alert(editingContract ? 'Falha ao atualizar contrato' : 'Falha ao criar contrato')
    }
  }

  function resetForm() {
    setFormData({
      clientName: '',
      projectName: '',
      description: '',
      totalValue: '',
      signedDate: '',
      status: 'active',
      category: '',
      notes: '',
    })
    setEditingContract(null)
    setCustomCategory('')
    setShowCustomCategory(false)
  }

  function editContract(contract: any) {
    // Switch to manual mode when editing
    setShowAISection(false)

    setEditingContract(contract)
    const category = contract.category || ''

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
      clientName: contract.clientName,
      projectName: contract.projectName,
      description: contract.description || '',
      totalValue: contract.totalValue.toString(),
      signedDate: formatDateForInput(contract.signedDate),
      status: contract.status || 'active',
      category: category,
      notes: contract.notes || '',
    })
  }

  async function deleteContract(id: string) {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) return

    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert('Contrato excluído com sucesso!')
        fetchContracts()
      } else {
        alert('Falha ao excluir contrato')
      }
    } catch (error) {
      alert('Failed to delete contract')
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

    // Check if user is confirming a pending contract
    const isConfirming = pendingContract && (
      userMessage.toLowerCase().includes('confirmar') ||
      userMessage.toLowerCase().includes('sim') ||
      userMessage.toLowerCase().includes('ok') ||
      userMessage.toLowerCase().includes('certo')
    )

    try {
      const requestBody: any = {
        message: userMessage,
        history: aiHistory
      }

      // Only include these fields if they're not null
      if (pendingContract !== null) {
        requestBody.pendingContract = pendingContract
      }
      if (isConfirming !== null) {
        requestBody.isConfirming = isConfirming
      }

      const res = await fetch('/api/ai/create-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const result = await res.json()

      console.log('=== AI Response Debug ===')
      console.log('Response status:', res.status)
      console.log('Response ok:', res.ok)
      console.log('Result received:', JSON.stringify(result, null, 2))
      console.log('Result.action:', result.action)
      console.log('Type of result:', typeof result)

      if (result.action === 'created') {

        // Contract was created successfully
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: result.confirmation || 'Contrato criado com sucesso!'
        }])
        setPendingContract(null) // Clear pending contract
        fetchContracts()
        // Clear history after successful creation
        setTimeout(() => {
          setAiHistory([])
          setPendingContract(null)
        }, 3000)
      } else if (result.action === 'edited') {

        // Contract was edited successfully
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: result.confirmation || 'Contrato atualizado com sucesso!'
        }])
        fetchContracts()
        // Clear history after successful edit
        setTimeout(() => {
          setAiHistory([])
        }, 3000)
      } else if (result.action === 'confirm') {
        // AI is asking for confirmation
        setPendingContract(result.contract)
        // Only show the confirmation message, not the inferences
        const confirmMessage = result.confirmation || 'Pode confirmar se os dados estão corretos?'
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: confirmMessage
        }])
      } else if (result.action === 'clarify') {
        // AI needs more information
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
        console.error('Unknown action:', result)
        setAiHistory([...newHistory, {
          role: 'assistant' as const,
          content: `Resposta inesperada da IA. Ação: ${result?.action || 'indefinida'}`
        }])
      }
    } catch (error) {
      console.error('AI error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setAiHistory([...newHistory, {
        role: 'assistant' as const,
        content: `Erro ao processar solicitação: ${errorMessage}`
      }])
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mb-4">
        <a href="/" className="text-blue-700 hover:text-blue-800 font-medium">← Dashboard</a>
      </div>

      <h1 className="text-3xl font-bold text-neutral-900 tracking-wide mb-8">Contratos</h1>


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

          {showAISection ? (
            <div id="contract-form">
              <h2 className="text-xl font-bold mb-4 text-neutral-900">Adicionar Contrato com IA</h2>

              <div className="bg-blue-50/50 border border-blue-200/50 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Dica:</strong> Descreva o contrato em linguagem natural. Exemplo:
                  <br />
                  <em>"Contrato de 50 mil com João Silva para projeto residencial na Vila Madalena, assinado ontem"</em>
                </p>
              </div>

              {/* AI Chat History */}
              {aiHistory.length > 0 && (
                <div className="mb-4 space-y-2 max-h-60 overflow-y-auto">
                  {aiHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        msg.role === 'user'
                          ? 'bg-neutral-100 border-neutral-200/60 ml-8'
                          : 'bg-blue-50/50 border-blue-200/50 mr-8'
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
                    placeholder="Descreva o contrato que deseja criar..."
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
                {editingContract ? 'Editar Contrato' : 'Adicionar Contrato Manual'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4" id="contract-form">
            <div>
              <label className="block mb-2 font-medium text-neutral-900">Nome do Cliente *</label>
              <input
                type="text"
                required
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-neutral-900">Nome do Projeto *</label>
              <input
                type="text"
                required
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-neutral-900">Descrição</label>
              <textarea
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-neutral-900">Valor Total *</label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                value={formData.totalValue}
                onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-neutral-900">Data de Assinatura *</label>
              <input
                type="date"
                required
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                value={formData.signedDate}
                onChange={(e) => setFormData({ ...formData, signedDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-neutral-900">Status</label>
              <select
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Ativo</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-neutral-900">Categoria</label>
              <select
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                value={showCustomCategory ? 'custom' : formData.category}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'custom') {
                    setShowCustomCategory(true)
                    setFormData({ ...formData, category: '' })
                  } else if (value === 'add_new') {
                    const newCategory = prompt('Digite o nome da nova categoria:')
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
                  placeholder="Digite a categoria personalizada"
                  value={customCategory}
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
                className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-500"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 font-medium transition-colors"
              >
                {editingContract ? 'Atualizar Contrato' : 'Criar Contrato'}
              </button>
              {editingContract && (
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
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-neutral-900">Contratos Existentes</h2>

          {/* Filters and Sorting */}
          <div className="mb-4 space-y-3 p-4 bg-white border-2 border-neutral-300 rounded-lg shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                  <option value="createdAt">Data de Criação</option>
                  <option value="signedDate">Data de Assinatura</option>
                  <option value="clientName">Nome do Cliente</option>
                  <option value="projectName">Nome do Projeto</option>
                  <option value="totalValue">Valor Total</option>
                  <option value="status">Status</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-2">Ordem</label>
                <select
                  className="w-full border-2 border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
                  value={filters.sortOrder}
                  onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
                >
                  <option value="desc">Decrescente</option>
                  <option value="asc">Crescente</option>
                </select>
              </div>
            </div>
          </div>
          {loading ? (
            <p>Carregando...</p>
          ) : contracts.length === 0 ? (
            <p className="text-neutral-900 font-medium">Nenhum contrato ainda</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {contracts.map((contract: any) => (
                <div key={contract.id} className="bg-white border-2 border-neutral-300 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-neutral-900">{contract.projectName}</h3>
                      <p className="text-sm text-neutral-900 font-medium">Cliente: {contract.clientName}</p>
                      <p className="text-sm font-semibold text-neutral-900">Valor: R$ {contract.totalValue.toLocaleString('pt-BR')}</p>
                      <div className="flex items-center gap-2 my-1">
                        <span className="text-sm font-medium text-neutral-900">Status:</span>
                        <select
                          className="text-sm border-2 border-neutral-300 rounded-lg px-2 py-1 bg-white text-neutral-900 focus:border-blue-600 focus:outline-none"
                          value={contract.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            try {
                              const res = await fetch(`/api/contracts/${contract.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  ...contract,
                                  status: newStatus
                                }),
                              })
                              if (res.ok) {
                                fetchContracts()
                              } else {
                                alert('Falha ao atualizar status')
                              }
                            } catch (error) {
                              alert('Failed to update status')
                            }
                          }}
                        >
                          <option value="active">Ativo</option>
                          <option value="completed">Concluído</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </div>
                      <p className="text-sm font-medium text-neutral-900">Recebíveis: {contract.receivables.length}</p>
                      {contract.category && (
                        <p className="text-sm font-medium text-neutral-900">Categoria: {contract.category}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => editContract(contract)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteContract(contract.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
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

export default function ContractsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8">Carregando...</div>}>
      <ContractsPageContent />
    </Suspense>
  )
}