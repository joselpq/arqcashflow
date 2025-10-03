'use client'

import { useState, useRef } from 'react'
import MultiFileSetupAssistant from '../components/setup-assistant/MultiFileSetupAssistant'

interface Message {
  role: 'user' | 'assistant'
  content: string
  files?: FileData[]
  metadata?: any
  timestamp: Date
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface FileData {
  name: string
  type: string
  base64?: string // For small files
  file?: File // For large files that will use FormData
  size: number
}

export default function EnhancedAIChatPage() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([]) // Display messages (user-facing)
  const [fullHistory, setFullHistory] = useState<ConversationMessage[]>([]) // Full conversation (with internal messages)
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<FileData[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'setup' | 'command' | 'unified'>('unified')
  const [conversationState, setConversationState] = useState<any>(null)
  const [pendingOperation, setPendingOperation] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file upload
  const handleFiles = async (fileList: FileList) => {
    try {
      const newFiles: FileData[] = []

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]

        console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`)

        // Validate file type and size
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          alert(`Arquivo ${file.name} não é suportado. Use imagens ou PDFs.`)
          continue
        }

        // Check file size limits - Claude API supports up to 32MB
        const maxFileSize = 32 * 1024 * 1024 // 32MB limit

        if (file.size > maxFileSize) {
          alert(`Arquivo ${file.name} é muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). ` +
                `Máximo permitido: 32MB.\n\n` +
                `Para arquivos maiores, considere:\n` +
                `• Comprimir o PDF\n` +
                `• Usar imagens das páginas principais\n` +
                `• Dividir em múltiplos arquivos menores`)
          continue
        }

        // Determine upload strategy: small files use base64, large files use FormData
        const largeFileThreshold = 3 * 1024 * 1024 // 3MB threshold
        const isLargeFile = file.size > largeFileThreshold

        console.log(`File ${file.name}: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${isLargeFile ? 'FormData' : 'base64'} strategy`)

        try {
          if (isLargeFile) {
            // Large file: store File object for FormData upload
            console.log(`📦 Storing large file for FormData upload: ${file.name}`)

            newFiles.push({
              name: file.name,
              type: file.type,
              file, // Store original File object
              size: file.size
            })

            console.log(`✅ Large file queued: ${file.name}`)
          } else {
            // Small file: convert to base64 for JSON upload
            console.log(`📄 Converting small file to base64: ${file.name}`)

            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => {
                try {
                  const result = reader.result as string
                  if (!result || typeof result !== 'string') {
                    reject(new Error('Failed to read file'))
                    return
                  }
                  resolve(result.split(',')[1]) // Remove data:type;base64, prefix
                } catch (error) {
                  reject(error)
                }
              }
              reader.onerror = () => reject(new Error('FileReader error'))
              reader.readAsDataURL(file)
            })

            if (!base64) {
              console.error(`Failed to convert ${file.name} to base64`)
              alert(`Erro ao processar arquivo ${file.name}`)
              continue
            }

            newFiles.push({
              name: file.name,
              type: file.type,
              base64,
              size: file.size
            })

            console.log(`✅ Small file processed: ${file.name}, base64 length: ${base64.length}`)
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError)
          alert(`Erro ao processar arquivo ${file.name}: ${fileError instanceof Error ? fileError.message : 'Erro desconhecido'}`)
        }
      }

      if (newFiles.length > 0) {
        setFiles(prev => {
          const updated = [...prev, ...newFiles]
          console.log(`Updated files state:`, updated.map(f => ({ name: f.name, type: f.type, size: f.size })))
          return updated
        })
      }
    } catch (error) {
      console.error('Error in handleFiles:', error)
      alert('Erro ao processar arquivos')
    }
  }

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // Remove file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Submit command (for Command tab)
  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)

    // Create user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setMessage('')

    try {
      console.log('🎯 Using Command Agent endpoint')

      const requestBody = {
        command: userMessage.content,
        conversationState: conversationState ? {
          messages: newMessages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString()
          })),
          pendingOperation: pendingOperation
        } : undefined,
        isConfirmation: pendingOperation ? true : false
      }

      const response = await fetch('/api/ai/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('Command response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Command agent response:', result)

        // Update conversation state
        if (result.pendingOperation) {
          setPendingOperation(result.pendingOperation)
        } else {
          setPendingOperation(null)
        }

        // Update conversation state
        setConversationState({
          messages: newMessages,
          pendingOperation: result.pendingOperation || null
        })

        const assistantMessage: Message = {
          role: 'assistant',
          content: result.message,
          metadata: result,
          timestamp: new Date()
        }

        setMessages([...newMessages, assistantMessage])
      } else {
        const error = await response.json()
        console.error('Command error:', error)

        const errorMessage: Message = {
          role: 'assistant',
          content: `❌ Erro: ${error.error || 'Falha ao processar comando'}`,
          timestamp: new Date()
        }

        setMessages([...newMessages, errorMessage])
      }
    } catch (error) {
      console.error('Command submission error:', error)

      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Erro de comunicação. Por favor, tente novamente.',
        timestamp: new Date()
      }

      setMessages([...newMessages, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  // Submit message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)

    // Create user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setMessage('')

    try {
      // Use financial query endpoint for text-only queries
      console.log('💬 Using Financial Query endpoint')

      const requestBody = {
        question: userMessage.content,
        history: newMessages.slice(-10).map(m => ({
          question: m.role === 'user' ? m.content : '',
          answer: m.role === 'assistant' ? m.content : ''
        })).filter(h => h.question || h.answer) // Remove empty entries
      }

      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Financial query response:', result)

        const assistantMessage: Message = {
          role: 'assistant',
          content: result.answer,
          metadata: {
            needsClarification: result.needsClarification,
            suggestedQuestions: result.suggestedQuestions,
            dataUsed: result.dataUsed
          },
          timestamp: new Date()
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        console.error('API error response:', response.status, response.statusText)
        try {
          const error = await response.json()
          console.error('Error details:', error)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Erro: ${error.error}`,
            timestamp: new Date()
          }])
        } catch (jsonError) {
          console.error('Failed to parse error JSON:', jsonError)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Erro HTTP ${response.status}: ${response.statusText}`,
            timestamp: new Date()
          }])
        }
      }
    } catch (error) {
      console.error('Request failed:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Erro ao processar solicitação: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Tente novamente.`,
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  // Unified AI Submit - Week 3 Phase 2
  const handleUnifiedSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)

    // Create user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setMessage('')

    try {
      // Use fullHistory (with internal messages) for backend context
      // This preserves query results and other internal data Claude needs
      const response = await fetch('/api/ai/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: fullHistory // Send full history with [QUERY_RESULTS] etc.
        })
      })

      if (response.ok) {
        const result = await response.json()

        // Update fullHistory with complete conversation (includes internal messages)
        if (result.conversationHistory && result.conversationHistory.length > 0) {
          setFullHistory(result.conversationHistory)
        }

        // Update messages with user-facing display only
        if (result.displayHistory && result.displayHistory.length > 0) {
          // Use displayHistory - excludes internal messages like [QUERY_RESULTS]
          const historyMessages: Message[] = result.displayHistory.map((msg: ConversationMessage) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date()
          }))
          setMessages(historyMessages)
        } else if (result.conversationHistory && result.conversationHistory.length > 0) {
          // Fallback to conversationHistory (legacy behavior)
          const historyMessages: Message[] = result.conversationHistory.map((msg: ConversationMessage) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date()
          }))
          setMessages(historyMessages)
        } else {
          // Fallback to old behavior (single message)
          const assistantMessage: Message = {
            role: 'assistant',
            content: result.message,
            timestamp: new Date()
          }
          setMessages([...newMessages, assistantMessage])
        }
      } else {
        const error = await response.json()

        const errorMessage: Message = {
          role: 'assistant',
          content: `❌ Erro: ${error.error || 'Falha ao processar solicitação'}`,
          timestamp: new Date()
        }

        setMessages([...newMessages, errorMessage])
      }
    } catch (error) {
      console.error('Unified AI submission error:', error)

      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Erro de comunicação. Por favor, tente novamente.',
        timestamp: new Date()
      }

      setMessages([...newMessages, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  // Quick action buttons
  const handleQuickAction = (action: string) => {
    setMessage(action)
    // Auto-submit for quick actions
    setTimeout(() => {
      document.getElementById('submit-btn')?.click()
    }, 100)
  }

  // Setup Assistant Component
  const SetupAssistant = () => {
    const [setupFile, setSetupFile] = useState<File | null>(null)
    const [setupLoading, setSetupLoading] = useState(false)
    const [setupResult, setSetupResult] = useState<any>(null)
    const setupFileInputRef = useRef<HTMLInputElement>(null)

    const handleSetupFile = (file: File) => {
      // Validate file type - now supports CSV, Excel, PDF, and images
      const fileName = file.name.toLowerCase()
      const fileType = file.type.toLowerCase()

      const isSpreadsheet = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
      const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf')
      const isImage = fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)

      if (!isSpreadsheet && !isPDF && !isImage) {
        alert('Por favor, selecione um arquivo CSV, Excel, PDF ou imagem (JPG, PNG, etc.)')
        return
      }

      // Check file size (32MB limit)
      if (file.size > 32 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo permitido: 32MB')
        return
      }

      setSetupFile(file)
      setSetupResult(null)
    }

    const handleSetupDrop = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleSetupFile(e.dataTransfer.files[0])
      }
    }

    const processSetupFile = async () => {
      if (!setupFile) return

      setSetupLoading(true)

      try {
        const formData = new FormData()
        formData.append('file', setupFile)

        // Use V2 service layer approach - includes audit logging and better error handling
        const response = await fetch('/api/ai/setup-assistant-v2', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const result = await response.json()
          setSetupResult(result)

          // Clear the file after successful processing
          setSetupFile(null)
          if (setupFileInputRef.current) {
            setupFileInputRef.current.value = ''
          }
        } else {
          const error = await response.json()
          setSetupResult({
            error: true,
            message: error.error || 'Erro ao processar arquivo'
          })
        }
      } catch (error) {
        console.error('Setup processing error:', error)
        setSetupResult({
          error: true,
          message: 'Erro ao conectar com o servidor'
        })
      } finally {
        setSetupLoading(false)
      }
    }

    return (
      <div className="space-y-6">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-blue-800 mb-2">📊 Assistente de Configuração</h3>
          <p className="text-sm text-blue-700 mb-2">
            Envie planilhas, PDFs, ou imagens com seus dados financeiros e deixe a IA criar automaticamente:
          </p>
          <ul className="text-sm text-blue-700 space-y-1 mb-3">
            <li>• <strong>Contratos:</strong> clientes, projetos, valores, datas</li>
            <li>• <strong>Recebíveis:</strong> valores a receber, datas esperadas</li>
            <li>• <strong>Despesas:</strong> custos, fornecedores, vencimentos</li>
          </ul>
          <p className="text-xs text-blue-600">
            ✨ A IA agora processa planilhas (CSV/Excel), documentos PDF e imagens! Pode extrair dados de notas fiscais, contratos, recibos e muito mais.
          </p>
        </div>

        {/* File Upload */}
        <div className="bg-white border-2 border-neutral-300 rounded-lg p-6">
          <div
            className="border-2 border-dashed border-neutral-400 rounded-lg p-8 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleSetupDrop}
          >
            <div className="text-4xl mb-4">📊</div>
            <p className="text-lg font-medium text-neutral-800 mb-2">
              Arraste seu arquivo aqui ou clique para selecionar
            </p>
            <p className="text-sm text-neutral-600 mb-4">
              Formatos suportados: CSV, Excel, PDF, Imagens (JPG, PNG) • Máximo: 32MB
            </p>

            <button
              onClick={() => setupFileInputRef.current?.click()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Selecionar Arquivo
            </button>

            <input
              ref={setupFileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,image/*"
              onChange={(e) => e.target.files && handleSetupFile(e.target.files[0])}
              className="hidden"
            />
          </div>

          {/* Selected File */}
          {setupFile && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-800">📎 {setupFile.name}</p>
                  <p className="text-sm text-green-600">
                    {(setupFile.size / 1024 / 1024).toFixed(1)}MB
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSetupFile(null)}
                    className="text-red-600 hover:text-red-700 px-3 py-1 rounded"
                  >
                    Remover
                  </button>
                  <button
                    onClick={processSetupFile}
                    disabled={setupLoading}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {setupLoading ? 'Processando...' : 'Processar Arquivo'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {setupLoading && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
              <p className="text-yellow-800 font-medium">Analisando arquivo com IA...</p>
              <p className="text-sm text-yellow-600">Isso pode levar alguns segundos</p>
            </div>
          )}

          {/* Results */}
          {setupResult && (
            <div className="mt-4">
              {setupResult.error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-bold text-red-800 mb-2">❌ Erro no Processamento</h4>
                  <p className="text-red-700">{setupResult.message}</p>
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-bold text-green-800 mb-3">✅ Processamento Concluído!</h4>

                  {setupResult.analysis && (
                    <div className="mb-4 p-3 bg-white border border-green-300 rounded">
                      <h5 className="font-medium text-green-800 mb-1">📋 Análise da IA:</h5>
                      <p className="text-sm text-green-700">{setupResult.analysis}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-white border border-green-300 rounded">
                      <div className="text-2xl font-bold text-green-700">
                        {setupResult.summary?.contractsCreated || 0}
                      </div>
                      <div className="text-sm text-green-600">Contratos</div>
                    </div>
                    <div className="text-center p-3 bg-white border border-green-300 rounded">
                      <div className="text-2xl font-bold text-blue-700">
                        {setupResult.summary?.receivablesCreated || 0}
                      </div>
                      <div className="text-sm text-blue-600">Recebíveis</div>
                    </div>
                    <div className="text-center p-3 bg-white border border-green-300 rounded">
                      <div className="text-2xl font-bold text-amber-700">
                        {setupResult.summary?.expensesCreated || 0}
                      </div>
                      <div className="text-sm text-amber-600">Despesas</div>
                    </div>
                  </div>

                  {setupResult.summary?.totalErrors > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-300 rounded">
                      <p className="text-sm text-yellow-800">
                        ⚠️ {setupResult.summary.totalErrors} erro(s) encontrado(s).
                        Verifique os dados criados e ajuste se necessário.
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <a
                      href="/projetos?tab=contratos"
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      Ver Contratos
                    </a>
                    <a
                      href="/projetos?tab=recebiveis"
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                    >
                      Ver Recebíveis
                    </a>
                    <a
                      href="/projetos?tab=despesas"
                      className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 text-sm"
                    >
                      Ver Despesas
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Examples */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          <h4 className="font-bold text-neutral-800 mb-3">💡 Exemplos de Colunas</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-green-700 mb-2">📄 Contratos</h5>
              <ul className="text-neutral-600 space-y-1">
                <li>• Cliente, Projeto</li>
                <li>• Valor Total, Data Assinatura</li>
                <li>• Categoria, Descrição</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-blue-700 mb-2">💰 Recebíveis</h5>
              <ul className="text-neutral-600 space-y-1">
                <li>• Valor, Data Esperada</li>
                <li>• Cliente, Projeto</li>
                <li>• Nota Fiscal, Categoria</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-amber-700 mb-2">💸 Despesas</h5>
              <ul className="text-neutral-600 space-y-1">
                <li>• Descrição, Valor</li>
                <li>• Data Vencimento, Categoria</li>
                <li>• Fornecedor, Tipo</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mb-4">
        <a href="/" className="text-blue-600 hover:underline">← Voltar ao Início</a>
      </div>

      <h1 className="text-3xl font-bold mb-8 text-neutral-900">🤖 Assistente IA</h1>

      <div className="max-w-4xl mx-auto">
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-neutral-300">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('unified')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'unified'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              🚀 AI Unificado
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              💬 Chat Inteligente
            </button>
            <button
              onClick={() => setActiveTab('command')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'command'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              🎯 Comandos
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'setup'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              📊 Configuração Rápida
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'unified' ? (
          <div>
            {/* Unified AI Tab - All-in-one AI Assistant */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-bold text-blue-900 mb-3">🚀 AI Unificado - Assistente Inteligente</h3>
              <p className="text-xs text-blue-700 mb-3">
                Envie qualquer tipo de mensagem! O AI Unificado detecta automaticamente o que você precisa e roteia para o agente certo:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-start">
                  <span className="mr-2">💬</span>
                  <span className="text-blue-700"><strong>Perguntas</strong> → Query Agent</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-2">🎯</span>
                  <span className="text-purple-700"><strong>Comandos CRUD</strong> → Operations Agent</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-2">📄</span>
                  <span className="text-green-700"><strong>Documentos</strong> → Setup Assistant</span>
                </div>
                <div className="flex items-start">
                  <span className="mr-2">🤝</span>
                  <span className="text-orange-700"><strong>Geral</strong> → Router direto</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setMessage('Quanto gastei esse mês?')}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  💬 Pergunta
                </button>
                <button
                  onClick={() => setMessage('R$50 em gasolina ontem')}
                  className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors"
                >
                  🎯 Comando
                </button>
                <button
                  onClick={() => setMessage('Oi, preciso de ajuda')}
                  className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors"
                >
                  🤝 Geral
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="mb-6 space-y-4 max-h-96 overflow-y-auto bg-white border-2 border-neutral-300 rounded-lg p-4">
              {messages.length === 0 ? (
                <div className="text-center text-neutral-600 py-8">
                  <p className="text-lg mb-4">🚀 AI Unificado</p>
                  <p className="text-sm">
                    Converse naturalmente! O sistema detecta automaticamente o que você precisa.
                  </p>
                  <p className="text-xs text-neutral-500 mt-2">
                    Experimente: "Quanto gastei esse mês?" ou "R$50 em gasolina ontem"
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      msg.role === 'user'
                        ? 'bg-blue-50 border-blue-200 ml-8'
                        : 'bg-neutral-50 border-neutral-300 mr-8'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    {msg.metadata?.agentUsed && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          msg.metadata.agentUsed === 'query' ? 'bg-blue-100 text-blue-700' :
                          msg.metadata.agentUsed === 'operations' ? 'bg-purple-100 text-purple-700' :
                          msg.metadata.agentUsed === 'setup' ? 'bg-green-100 text-green-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {msg.metadata.agentUsed === 'query' ? '💬 Query' :
                           msg.metadata.agentUsed === 'operations' ? '🎯 Operations' :
                           msg.metadata.agentUsed === 'setup' ? '📄 Setup' :
                           '🤝 Router'}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
              {loading && (
                <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-300 mr-8">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                    <span className="text-sm text-neutral-600">Analisando e roteando...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Pending Operation Alert */}
            {pendingOperation && (
              <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⏳</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-yellow-900 mb-1">Operação Aguardando Confirmação</h4>
                    <p className="text-sm text-yellow-800 mb-2">
                      {pendingOperation.operation === 'create' && 'Criação pendente'}
                      {pendingOperation.operation === 'update' && 'Atualização pendente'}
                      {pendingOperation.operation === 'delete' && 'Deleção pendente'}
                    </p>
                    <p className="text-xs text-yellow-700">
                      Responda com "sim", "confirma" ou "não", "cancela"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Input Form - Unified */}
            <div className="bg-white border-2 border-neutral-300 rounded-lg p-4">
              <form onSubmit={handleUnifiedSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={pendingOperation ? "Digite 'sim' para confirmar ou 'não' para cancelar..." : "Digite qualquer coisa... perguntas, comandos, ou apenas converse"}
                  className={`flex-1 px-4 py-2 border ${pendingOperation ? 'border-yellow-400' : 'border-neutral-300'} rounded-lg focus:outline-none focus:ring-2 ${pendingOperation ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'}`}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!message.trim() || loading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processando...' : pendingOperation ? 'Responder' : 'Enviar'}
                </button>
              </form>
              {conversationState && (
                <div className="mt-2 text-xs text-neutral-500">
                  💬 {conversationState.messages?.length || 0} mensagens na conversa
                  {conversationState.recentlyCreated?.length > 0 &&
                    ` • ✨ ${conversationState.recentlyCreated.length} entidade(s) criada(s)`
                  }
                  {pendingOperation &&
                    ` • ⏳ Operação pendente`
                  }
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'setup' ? (
          <MultiFileSetupAssistant />
        ) : activeTab === 'command' ? (
          <div>
            {/* Command Tab - Natural Language CRUD */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-bold text-blue-800 mb-3">🎯 Comandos Rápidos:</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMessage('R$50 em gasolina ontem')}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  💰 Criar Despesa
                </button>
                <button
                  onClick={() => setMessage('R$400 de RT para receber amanhã')}
                  className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                >
                  📥 Criar Recebível
                </button>
                <button
                  onClick={() => setMessage('Novo contrato com Cliente X de R$10k')}
                  className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors"
                >
                  📄 Criar Contrato
                </button>
                <button
                  onClick={() => setMessage('Atualiza a despesa de gasolina para R$60')}
                  className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors"
                >
                  ✏️ Atualizar
                </button>
              </div>
              <p className="text-xs text-blue-700 mt-3">
                💡 Dica: Use linguagem natural! Exemplos:<br/>
                • "R$50 em gasolina ontem"<br/>
                • "R$400 de RT do projeto Mari para receber amanhã"<br/>
                • "Atualiza o contrato da ACME para R$150k"<br/>
                • "Deleta a despesa de gasolina"
              </p>
            </div>

            {/* Chat Messages - reused from chat tab */}
            <div className="mb-6 space-y-4 max-h-96 overflow-y-auto bg-white border-2 border-neutral-300 rounded-lg p-4">
              {messages.length === 0 ? (
                <div className="text-center text-neutral-600 py-8">
                  <p className="text-lg mb-4">🎯 Comandos Rápidos</p>
                  <p className="text-sm">
                    Digite comandos em linguagem natural para criar, atualizar ou deletar dados.
                  </p>
                  <p className="text-xs text-neutral-500 mt-2">
                    Exemplo: "R$50 em gasolina ontem" cria uma despesa automaticamente
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      msg.role === 'user'
                        ? 'bg-blue-50 border-blue-200 ml-8'
                        : 'bg-neutral-50 border-neutral-300 mr-8'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    {msg.metadata && (
                      <div className="mt-2 text-xs text-neutral-500">
                        {msg.metadata.success === true && '✅ Sucesso'}
                        {msg.metadata.success === false && '❌ Erro'}
                        {msg.metadata.needsConfirmation && ' 🔄 Aguardando confirmação'}
                      </div>
                    )}
                  </div>
                ))
              )}
              {loading && (
                <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-300 mr-8">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                    <span className="text-sm text-neutral-600">Processando comando...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form - Command specific */}
            <div className="bg-white border-2 border-neutral-300 rounded-lg p-4">
              <form onSubmit={handleCommandSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite seu comando aqui... (ex: R$50 em gasolina ontem)"
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!message.trim() || loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processando...' : 'Enviar'}
                </button>
              </form>
              {pendingOperation && (
                <div className="mt-2 text-xs text-orange-600">
                  ⚠️ Operação pendente - responda "sim" ou "não" para confirmar
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
        {/* Quick Questions */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-bold text-blue-800 mb-3">💡 Perguntas Rápidas:</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickAction('Quanto vou receber no próximo mês?')}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
            >
              💰 Receitas Futuras
            </button>
            <button
              onClick={() => handleQuickAction('Quais meus projetos concluídos?')}
              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
            >
              ✅ Projetos Finalizados
            </button>
            <button
              onClick={() => handleQuickAction('Quanto gastei este mês?')}
              className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
            >
              📊 Despesas do Mês
            </button>
            <button
              onClick={() => handleQuickAction('Quais contratos estão ativos?')}
              className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors"
            >
              📋 Contratos Ativos
            </button>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            💡 Dica: Faça perguntas sobre contratos, recebíveis, despesas e análises financeiras
          </p>
        </div>

        {/* Chat Messages */}
        <div className="mb-6 space-y-4 max-h-96 overflow-y-auto bg-white border-2 border-neutral-300 rounded-lg p-4">
          {messages.length === 0 ? (
            <div className="text-center text-neutral-600 py-8">
              <p className="text-lg mb-4">👋 Olá! Como posso ajudá-lo hoje?</p>
              <p className="text-sm">
                Faça perguntas sobre seus contratos, recebíveis, despesas e finanças.
              </p>
              <p className="text-xs text-neutral-500 mt-2">
                Para importar documentos, use a aba "📊 Configuração Rápida"
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  msg.role === 'user'
                    ? 'bg-blue-50 border-blue-200 ml-8'
                    : 'bg-neutral-50 border-neutral-300 mr-8'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-neutral-900">
                    {msg.role === 'user' ? '👤 Você' : '🤖 Assistente'}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {msg.timestamp.toLocaleTimeString('pt-BR')}
                  </span>
                  {msg.metadata?.intent && (
                    <span className="text-xs bg-neutral-200 text-neutral-700 px-2 py-1 rounded">
                      {msg.metadata.intent}
                    </span>
                  )}
                </div>

                <p className="text-sm text-neutral-900 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>

                {/* Show uploaded files */}
                {msg.files && msg.files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.files.map((file, fileIndex) => (
                      <span
                        key={fileIndex}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1"
                      >
                        📎 {file.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Show SQL query for query responses */}
                {msg.metadata?.sqlQuery && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-neutral-600 hover:text-neutral-800">
                      Ver consulta SQL
                    </summary>
                    <pre className="mt-1 p-2 bg-neutral-100 rounded text-neutral-800 overflow-x-auto">
                      {msg.metadata.sqlQuery}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="text-center text-neutral-600 py-4">
              <span className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></span>
              Processando...
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="bg-white border-2 border-neutral-300 rounded-lg p-4">

          {/* Message Form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              className="flex-1 border-2 border-neutral-300 rounded-lg px-4 py-2 focus:border-blue-600 focus:outline-none bg-white text-neutral-900 placeholder-neutral-600"
              placeholder="Digite sua mensagem ou anexe documentos..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
            />
            <button
              id="submit-btn"
              type="submit"
              className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 font-medium transition-colors"
              disabled={loading || (!message.trim() && files.length === 0)}
            >
              {loading ? 'Enviando...' : 'Enviar'}
            </button>
          </form>
        </div>

        {/* Capabilities Info */}
        <div className="mt-6 text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg p-4">
          <h3 className="font-bold text-neutral-800 mb-2">💡 O que posso fazer:</h3>
          <ul className="space-y-1">
            <li>📊 <strong>Consultas:</strong> "Qual foi minha receita este mês?" ou "Mostre contratos vencendo"</li>
            <li>📄 <strong>Contratos:</strong> "Criar contrato de 50 mil com João Silva" ou envie documento</li>
            <li>💰 <strong>Despesas:</strong> "Adicionar despesa de materiais 5 mil" ou envie recibo</li>
            <li>🧾 <strong>Documentos:</strong> Envie recibos, notas fiscais ou contratos para processamento automático</li>
            <li>📁 <strong>Arquivos grandes:</strong> Suporte completo para PDFs até 32MB com upload automático via FormData</li>
          </ul>
        </div>
          </div>
        )}
      </div>
    </div>
  )
}