'use client'

import { useState, useEffect } from 'react'

export default function ContractsPage() {
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
    status: 'all',
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

  async function fetchContracts() {
    try {
      const params = new URLSearchParams()
      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.category !== 'all') params.set('category', filters.category)
      params.set('sortBy', filters.sortBy)
      params.set('sortOrder', filters.sortOrder)

      const res = await fetch(`/api/contracts?${params.toString()}`)
      const data = await res.json()
      setContracts(data)

      // Extract unique categories for filter dropdown
      const categories = [...new Set(data.map((c: any) => c.category).filter(Boolean))]
      setUniqueCategories(categories)
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
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
      signedDate: contract.signedDate.split('T')[0],
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
    <div className="min-h-screen p-8">
      <div className="mb-4">
        <a href="/" className="text-blue-600 hover:underline">← Voltar ao Início</a>
      </div>

      <h1 className="text-3xl font-bold mb-8">Gerenciamento de Contratos</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          {/* Toggle between AI and Manual */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setShowAISection(true)}
              className={`px-4 py-2 rounded ${showAISection
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🤖 Adicionar com IA
            </button>
            <button
              type="button"
              onClick={() => setShowAISection(false)}
              className={`px-4 py-2 rounded ${!showAISection
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ✏️ Adicionar Manual
            </button>
          </div>

          {showAISection ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Adicionar Contrato com IA</h2>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
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
                      className={`p-3 rounded border ${
                        msg.role === 'user'
                          ? 'bg-gray-100 border-gray-300 ml-8'
                          : 'bg-blue-50 border-blue-200 mr-8'
                      }`}
                    >
                      <p className="text-sm font-bold mb-1 text-gray-800">
                        {msg.role === 'user' ? '👤 Você' : '🤖 Assistente'}
                      </p>
                      <p className="text-sm text-gray-900">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAISubmit} className="space-y-4">
                <div>
                  <textarea
                    className="w-full border rounded px-3 py-2 h-24"
                    placeholder="Descreva o contrato que deseja criar..."
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    disabled={aiLoading}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    disabled={aiLoading}
                  >
                    {aiLoading ? 'Processando...' : 'Enviar'}
                  </button>
                  {aiHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAiHistory([])}
                      className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                    >
                      Limpar Conversa
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {editingContract ? 'Editar Contrato' : 'Adicionar Contrato Manual'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1">Nome do Cliente *</label>
              <input
                type="text"
                required
                className="w-full border rounded px-3 py-2"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-1">Nome do Projeto *</label>
              <input
                type="text"
                required
                className="w-full border rounded px-3 py-2"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-1">Descrição</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-1">Valor Total *</label>
              <input
                type="number"
                step="0.01"
                required
                className="w-full border rounded px-3 py-2"
                value={formData.totalValue}
                onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-1">Data de Assinatura *</label>
              <input
                type="date"
                required
                className="w-full border rounded px-3 py-2"
                value={formData.signedDate}
                onChange={(e) => setFormData({ ...formData, signedDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-1">Status</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Ativo</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block mb-1">Categoria</label>
              <select
                className="w-full border rounded px-3 py-2"
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
                  className="w-full border rounded px-3 py-2 mt-2"
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
              <label className="block mb-1">Observações</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                {editingContract ? 'Atualizar Contrato' : 'Criar Contrato'}
              </button>
              {editingContract && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
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
          <h2 className="text-xl font-semibold mb-4">Contratos Existentes</h2>

          {/* Filters and Sorting */}
          <div className="mb-4 space-y-3 p-4 bg-gray-100 border border-gray-300 rounded">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ordenar Por</label>
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ordem</label>
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900"
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
            <p className="text-gray-500">Nenhum contrato ainda</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {contracts.map((contract: any) => (
                <div key={contract.id} className="border p-4 rounded">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{contract.projectName}</h3>
                      <p className="text-sm text-gray-600">Cliente: {contract.clientName}</p>
                      <p className="text-sm">Valor: R$ {contract.totalValue.toLocaleString('pt-BR')}</p>
                      <div className="flex items-center gap-2 my-1">
                        <span className="text-sm">Status:</span>
                        <select
                          className="text-sm border border-gray-300 rounded px-2 py-1"
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
                      <p className="text-sm">Recebíveis: {contract.receivables.length}</p>
                      {contract.category && (
                        <p className="text-sm">Categoria: {contract.category}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => editContract(contract)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteContract(contract.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
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