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
  base64: string
  size: number
}

export default function EnhancedAIChatPage() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<FileData[]>([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file upload
  const handleFiles = async (fileList: FileList) => {
    const newFiles: FileData[] = []

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]

      // Validate file type and size
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert(`Arquivo ${file.name} não é suportado. Use imagens ou PDFs.`)
        continue
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`Arquivo ${file.name} é muito grande. Máximo: 10MB.`)
        continue
      }

      // Convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1]) // Remove data:type;base64, prefix
        }
        reader.readAsDataURL(file)
      })

      newFiles.push({
        name: file.name,
        type: file.type,
        base64,
        size: file.size
      })
    }

    setFiles(prev => [...prev, ...newFiles])
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

    setLoading(true)

    // Create user message
    const userMessage: Message = {
      role: 'user',
      content: message || 'Documento anexado',
      files: files.length > 0 ? [...files] : undefined,
      timestamp: new Date()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setMessage('')
    setFiles([])

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          files: userMessage.files || [],
          history: newMessages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
            metadata: m.metadata
          }))
        })
      })

      if (response.ok) {
        const result = await response.json()

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
        const error = await response.json()
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Erro: ${error.error}`,
          timestamp: new Date()
        }])
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Erro ao processar solicitação. Tente novamente.',
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

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mb-4">
        <a href="/" className="text-blue-600 hover:underline">← Voltar ao Início</a>
      </div>

      <h1 className="text-3xl font-bold mb-8 text-neutral-900">🤖 Assistente IA Avançado</h1>

      <div className="max-w-4xl mx-auto">
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
              Formatos: PNG, JPG, PDF • Máximo: 10MB por arquivo
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
          </ul>
        </div>
      </div>
    </div>
  )
}