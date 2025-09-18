'use client'

import { useState, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  files?: FileData[]
  metadata?: any
  timestamp: Date
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
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<FileData[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'setup'>('chat')
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
          alert(`Erro ao processar arquivo ${file.name}: ${fileError.message}`)
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

  // Submit message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() && files.length === 0) return

    // Check if we have any large files that need FormData
    const hasLargeFiles = files.some(f => f.file)

    console.log('handleSubmit called:', {
      message: message.trim(),
      filesCount: files.length,
      hasLargeFiles,
      files: files.map(f => ({
        name: f.name,
        type: f.type,
        strategy: f.file ? 'FormData' : 'base64',
        size: `${(f.size / 1024 / 1024).toFixed(1)}MB`
      }))
    })

    setLoading(true)

    // Create user message
    const userMessage: Message = {
      role: 'user',
      content: message || 'Documento anexado',
      files: files.length > 0 ? files.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
        base64: f.base64 // Only include base64 for display
      })) : undefined,
      timestamp: new Date()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setMessage('')
    setFiles([])

    try {
      let response: Response

      if (hasLargeFiles) {
        // Use FormData for large files
        console.log('🚚 Using FormData for large file upload')

        const formData = new FormData()
        formData.append('message', userMessage.content)

        // Add history as JSON string
        formData.append('history', JSON.stringify(newMessages.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
          metadata: m.metadata
        }))))

        // Add all files to FormData
        files.forEach(file => {
          if (file.file) {
            // Large file: add File object
            formData.append('files', file.file)
          } else if (file.base64) {
            // Small file: convert base64 back to Blob for consistency
            const binaryString = atob(file.base64)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            const blob = new Blob([bytes], { type: file.type })
            const reconstructedFile = new File([blob], file.name, { type: file.type })
            formData.append('files', reconstructedFile)
          }
        })

        response = await fetch('/api/ai/assistant', {
          method: 'POST',
          body: formData // No Content-Type header - let browser set it
        })
      } else {
        // Use JSON for small files
        console.log('📄 Using JSON for small file upload')

        const requestBody = {
          message: userMessage.content,
          files: files.map(f => ({
            name: f.name,
            type: f.type,
            base64: f.base64!,
            size: f.size
          })),
          history: newMessages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
            metadata: m.metadata
          }))
        }

        response = await fetch('/api/ai/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
      }

      console.log('Response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('AI assistant response:', result)

        const assistantMessage: Message = {
          role: 'assistant',
          content: result.response,
          metadata: {
            intent: result.intent,
            type: result.type,
            sqlQuery: result.sqlQuery,
            pendingActions: result.pendingActions
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
        content: `Erro ao processar solicitação: ${error.message}. Tente novamente.`,
        timestamp: new Date()
      }])
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

        // Use direct Claude approach - simpler and more reliable
        const response = await fetch('/api/ai/setup-assistant-direct', {
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
                      href="/contracts"
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      Ver Contratos
                    </a>
                    <a
                      href="/receivables"
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                    >
                      Ver Recebíveis
                    </a>
                    <a
                      href="/expenses"
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
        {activeTab === 'setup' ? (
          <SetupAssistant />
        ) : (
          <div>
        {/* Quick Actions */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-bold text-blue-800 mb-3">Ações Rápidas:</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickAction('Qual foi minha receita este mês?')}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
            >
              📊 Receita do Mês
            </button>
            <button
              onClick={() => handleQuickAction('Criar novo contrato')}
              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
            >
              📄 Novo Contrato
            </button>
            <button
              onClick={() => handleQuickAction('Adicionar despesa')}
              className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
            >
              💰 Nova Despesa
            </button>
            <button
              onClick={() => handleQuickAction('Mostrar contratos ativos')}
              className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors"
            >
              📋 Contratos Ativos
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="mb-6 space-y-4 max-h-96 overflow-y-auto bg-white border-2 border-neutral-300 rounded-lg p-4">
          {messages.length === 0 ? (
            <div className="text-center text-neutral-600 py-8">
              <p className="text-lg mb-4">👋 Olá! Como posso ajudá-lo hoje?</p>
              <p className="text-sm">
                Posso responder perguntas, criar contratos/despesas, ou processar documentos.
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

        {/* File Upload Area */}
        {files.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-bold text-yellow-800 mb-2">Arquivos Anexados:</h4>
            <div className="flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white border border-yellow-300 rounded px-3 py-1"
                >
                  <span className="text-sm text-neutral-900">📎 {file.name}</span>
                  <span className="text-xs text-neutral-500">
                    ({(file.size / 1024 / 1024).toFixed(1)}MB)
                    {file.file && <span className="text-blue-600 ml-1">• FormData</span>}
                    {file.base64 && <span className="text-green-600 ml-1">• JSON</span>}
                  </span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="bg-white border-2 border-neutral-300 rounded-lg p-4">
          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-4 mb-4 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-neutral-300 bg-neutral-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <p className="text-sm text-neutral-600 mb-2">
              📎 Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-xs text-neutral-500 mb-2">
              Formatos: PNG, JPG, PDF • Máximo: 32MB por arquivo
            </p>
            <p className="text-xs text-green-600 mb-2">
              ✅ Pequenos (&lt;3MB): JSON • Grandes (≥3MB): FormData upload
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Selecionar Arquivos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
          </div>

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