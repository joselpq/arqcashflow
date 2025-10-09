'use client'

import { useState, useRef, useEffect } from 'react'
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
  const [activeTab, setActiveTab] = useState<'arnaldo' | 'setup'>('arnaldo')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    })
  }, [messages, loading])

  // Auto-resize textarea while preserving cursor position
  useEffect(() => {
    if (textareaRef.current) {
      // Save cursor position before DOM manipulation
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd

      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`

      // Restore cursor position after height adjustment
      textareaRef.current.setSelectionRange(start, end)
    }
  }, [message])

  // Unified AI Submit - Arnaldo handles everything
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

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-neutral-300">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('arnaldo')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'arnaldo'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              🤖 Arnaldo AI
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
        {activeTab === 'arnaldo' ? (
          <div>
            {/* Arnaldo Tab - Friendly AI Assistant */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Olá, sou Arnaldo, seu assistente financeiro 👋</strong>
              </p>
              <p className="text-sm text-blue-800">
                Faça perguntas sobre suas finanças ("Quanto faturei em setembro?"), adicione novos projetos, despesas e recebíveis ("recebi 500 reais do projeto João e Maria", "salário Pedro R$5k todo dia 5") ou atualize/delete-os ("aumentar o salário do Pedro para 5500 a partir de Janeiro").
              </p>
            </div>

            {/* Chat Messages */}
            <div ref={messagesContainerRef} className="mb-6 space-y-4 max-h-96 overflow-y-auto bg-white border-2 border-neutral-300 rounded-lg p-4">
              {messages.length === 0 ? (
                <div className="text-center text-neutral-600 py-8">
                  <p className="text-sm">
                    Converse naturalmente comigo sobre suas finanças. Posso responder perguntas ou fazer ações por você.
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
                  </div>
                ))
              )}
              {loading && (
                <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-300 mr-8">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
                    <span className="text-sm text-neutral-600">Processando...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="bg-white border-2 border-neutral-300 rounded-lg p-4">
              <form onSubmit={handleUnifiedSubmit} className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    // Send on Enter (without Shift)
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleUnifiedSubmit(e)
                    }
                  }}
                  placeholder={loading ? "Aguarde a resposta..." : "Digite sua pergunta ou comando..."}
                  rows={1}
                  className="flex-1 resize-none px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Processando...' : 'Enviar'}
                </button>
              </form>
              <p className="text-xs text-neutral-500 mt-2">
                Pressione Enter para enviar, Shift+Enter para nova linha
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Setup Assistant Tab - Friendly blue box */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Importação rápida de dados.</strong> Envie seus arquivos Excel, CSV ou PDF com contratos, despesas ou recebíveis.
                Vamos ler e registrar tudo automaticamente para você. Leva alguns segundos ou minutos dependendo do tamanho do arquivo.
              </p>
            </div>

            {/* Multi-File Setup Assistant Component */}
            <MultiFileSetupAssistant />
          </div>
        )}
      </div>
    </div>
  )
}
