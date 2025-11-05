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
  addProactiveMessage: (content: string) => void
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

  const addProactiveMessage = useCallback((content: string) => {
    const proactiveMessage: Message = {
      role: 'assistant',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, proactiveMessage])
    setFullHistory(prev => [...prev, { role: 'assistant', content }])
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
        // ✅ Route to OperationsAgent with STREAMING support (ADR-020 Phase 2)
        const response = await fetch('/api/ai/operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageContent,
            conversationHistory: fullHistory, // Preserve full conversation context
            stream: true // Enable streaming
          })
        })

        if (response.ok && response.body) {
          // ✅ STREAMING MODE: Read response as stream
          const reader = response.body.getReader()
          const decoder = new TextDecoder()

          // Create assistant message container for streaming
          const assistantMessage: Message = {
            role: 'assistant',
            content: '',
            timestamp: new Date()
          }

          // Add empty assistant message to UI
          setMessages([...newMessages, assistantMessage])
          setLoading(false) // Hide thinking indicator, show streaming

          try {
            let accumulatedText = ''

            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              // Decode chunk and accumulate
              const chunk = decoder.decode(value, { stream: true })

              // Parse Vercel AI SDK data stream format (data: prefix)
              const lines = chunk.split('\n').filter(line => line.trim())

              for (const line of lines) {
                if (line.startsWith('0:')) {
                  // Text delta from Vercel AI SDK streaming
                  const textChunk = line.slice(3, -1) // Remove prefix and quotes
                  accumulatedText += textChunk
                  assistantMessage.content = accumulatedText

                  // Update message in place
                  setMessages(prev => [
                    ...prev.slice(0, -1),
                    { ...assistantMessage }
                  ])
                }
              }
            }

            // Emit event to notify pages that data might have changed
            window.dispatchEvent(new CustomEvent('arnaldo-data-updated'))

            // Update full history after streaming completes
            setFullHistory(prev => [
              ...prev,
              { role: 'user', content: messageContent },
              { role: 'assistant', content: accumulatedText }
            ])

          } catch (streamError) {
            console.error('[Chat] Streaming error:', streamError)
            const errorMessage: Message = {
              role: 'assistant',
              content: 'Desculpe, houve um erro durante o streaming. Tente novamente.',
              timestamp: new Date()
            }
            setMessages([...newMessages, errorMessage])
          }
        } else {
          // Fallback to error handling
          const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
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
        clearHistory,
        addProactiveMessage
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
