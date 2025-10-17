'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { Message } from '../components/chat/MessageList'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatContextType {
  isOpen: boolean
  isExpanded: boolean
  messages: Message[]
  loading: boolean
  fullHistory: ConversationMessage[]
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  toggleExpanded: () => void
  sendMessage: (message: string, file?: File) => Promise<void>
  clearHistory: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [fullHistory, setFullHistory] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(false)

  const openChat = useCallback(() => setIsOpen(true), [])
  const closeChat = useCallback(() => setIsOpen(false), [])
  const toggleChat = useCallback(() => setIsOpen(prev => !prev), [])
  const toggleExpanded = useCallback(() => setIsExpanded(prev => !prev), [])

  const clearHistory = useCallback(() => {
    setMessages([])
    setFullHistory([])
  }, [])

  const sendMessage = useCallback(async (messageContent: string, file?: File) => {
    if ((!messageContent.trim() && !file) || loading) return

    setLoading(true)

    // Create user message
    const userMessage: Message = {
      role: 'user',
      content: file ? `${messageContent} 📎 ${file.name}` : messageContent,
      timestamp: new Date()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)

    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // SMART ROUTING: File upload → SetupAssistant | Text → OperationsAgent
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      if (file) {
        // ✅ Route to SetupAssistant for file processing (using multi endpoint for consistency)
        const processingMessage: Message = {
          role: 'assistant',
          content: '📁 Processando arquivo... Isso pode levar alguns minutos.',
          timestamp: new Date()
        }
        setMessages([...newMessages, processingMessage])

        const formData = new FormData()
        formData.append('file0', file) // Match multi endpoint format

        const response = await fetch('/api/ai/setup-assistant-v2/multi', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const result = await response.json()

          // Emit event to trigger live refresh on entity pages
          window.dispatchEvent(new CustomEvent('arnaldo-data-updated'))

          // Format SetupAssistant results for chat display (multi endpoint format)
          const successMessage: Message = {
            role: 'assistant',
            content: `✅ Arquivo processado com sucesso!\n\n📊 **Resumo da importação:**\n- ${result.combinedSummary.totalContractsCreated} contratos criados\n- ${result.combinedSummary.totalReceivablesCreated} recebíveis criados\n- ${result.combinedSummary.totalExpensesCreated} despesas criadas${result.errors?.length > 0 ? `\n\n⚠️ ${result.errors.length} avisos durante o processamento` : ''}`,
            timestamp: new Date()
          }

          setMessages([...newMessages, successMessage])

          // Clear conversation history after file upload (different context)
          setFullHistory([])
        } else {
          const error = await response.json()
          const errorMessage: Message = {
            role: 'assistant',
            content: `❌ Erro ao processar arquivo: ${error.error || 'Erro desconhecido'}\n\n${error.supportedTypes ? '**Tipos suportados:** ' + error.supportedTypes.join(', ') : ''}${error.details ? '\n\n**Detalhes:** ' + error.details : ''}`,
            timestamp: new Date()
          }
          setMessages([...newMessages, errorMessage])
        }
      } else {
        // ✅ Route to OperationsAgent for text-based CRUD operations
        const response = await fetch('/api/ai/operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageContent,
            conversationHistory: fullHistory // Preserve full conversation context
          })
        })

        if (response.ok) {
          const result = await response.json()

          // Emit event to notify pages that data might have changed
          window.dispatchEvent(new CustomEvent('arnaldo-data-updated'))

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
            content: `Desculpe, ocorreu um erro: ${error.error || 'Erro desconhecido'}`,
            timestamp: new Date()
          }
          setMessages([...newMessages, errorMessage])
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Desculpe, não consegui processar sua mensagem. Tente novamente.',
        timestamp: new Date()
      }
      setMessages([...newMessages, errorMessage])
    } finally {
      setLoading(false)
    }
  }, [messages, fullHistory, loading])

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        isExpanded,
        messages,
        loading,
        fullHistory,
        openChat,
        closeChat,
        toggleChat,
        toggleExpanded,
        sendMessage,
        clearHistory
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
