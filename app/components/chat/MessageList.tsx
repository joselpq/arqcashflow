'use client'

import { useEffect, useRef } from 'react'
import { useTerminology } from '@/lib/hooks/useTerminology'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface MessageListProps {
  messages: Message[]
  loading?: boolean
}

export default function MessageList({ messages, loading = false }: MessageListProps) {
  const { profession } = useTerminology()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages - improved reliability
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
      }
    })
  }, [messages, loading])

  if (messages.length === 0 && !loading) {
    // Profession-aware welcome message
    const welcomeMessage = profession === 'medicina'
      ? 'Compartilhe comigo todo novo paciente. Me conte sobre suas consultas, procedimentos e despesas do consultório, através de mensagem ou planilhas/documentos. Assim posso organizar suas finanças e responder suas dúvidas!'
      : 'Compartilhe comigo todo novo projeto/contrato. Me conte suas despesas e recebíveis, através de mensagem ou planilhas/documentos. Assim posso organizar suas finanças e responder suas dúvidas!'

    return (
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full text-center">
          <p className="text-neutral-800 font-medium mb-2 text-base">
            Olá, sou Arnaldo, seu assistente financeiro 👋
          </p>
          <p className="text-sm text-neutral-600 leading-relaxed">
            {welcomeMessage}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-neutral-100 text-neutral-900'
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            <p
              className={`text-xs mt-1 ${
                msg.role === 'user' ? 'text-blue-100' : 'text-neutral-500'
              }`}
            >
              {msg.timestamp.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="bg-neutral-100 rounded-lg px-4 py-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
