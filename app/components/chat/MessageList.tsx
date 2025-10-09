'use client'

import { useEffect, useRef } from 'react'

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
    return (
      <div className="flex-1 flex items-center p-6">
        <div className="w-full">
          <p className="text-neutral-800 font-medium mb-3">
            Olá, sou Arnaldo, seu assistente financeiro 👋
          </p>
          <p className="text-sm text-neutral-600 mb-4">
            Posso responder perguntas sobre as suas finanças, adicionar novos projetos, despesas e recebíveis, ou atualizar e deletá-los, basta pedir!
          </p>
          <p className="text-xs text-neutral-500">
            <span className="font-medium">Alguns exemplos:</span>
            <br />
            • "Quanto faturei em setembro?"
            <br />
            • "recebi 500 reais do projeto João e Maria"
            <br />
            • "salário Pedro R$5k todo dia 5"
            <br />
            • "aumentar o salário do Pedro para 5500 a partir de Janeiro"
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
