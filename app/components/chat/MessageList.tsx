'use client'

import { useEffect, useRef } from 'react'
import { useTerminology } from '@/lib/hooks/useTerminology'
import { ThinkingIndicator } from './ThinkingIndicator'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface MessageListProps {
  messages: Message[]
  loading?: boolean
  isStreamingPaused?: boolean
}

export default function MessageList({ messages, loading = false, isStreamingPaused = false }: MessageListProps) {
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
            <div className={`prose prose-sm max-w-none ${
              msg.role === 'user' ? 'prose-invert' : ''
            }`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Customize rendering for better chat UI
                  h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-2 mb-1" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-base font-bold mt-2 mb-1" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-1 mb-1" {...props} />,
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="ml-2" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                  em: ({node, ...props}) => <em className="italic" {...props} />,
                  code: ({node, className, children, ...props}) => {
                    const isInline = !className
                    return isInline ? (
                      <code className={`px-1 py-0.5 rounded text-xs ${
                        msg.role === 'user' ? 'bg-blue-600' : 'bg-neutral-200'
                      }`} {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className={`block px-2 py-1 rounded text-xs overflow-x-auto ${
                        msg.role === 'user' ? 'bg-blue-600' : 'bg-neutral-200'
                      }`} {...props}>
                        {children}
                      </code>
                    )
                  },
                  pre: ({node, ...props}) => <pre className="mb-2 overflow-x-auto" {...props} />,
                  a: ({node, ...props}) => <a className="underline hover:opacity-80" {...props} />,
                  blockquote: ({node, ...props}) => (
                    <blockquote className={`border-l-2 pl-2 my-2 ${
                      msg.role === 'user' ? 'border-blue-300' : 'border-neutral-400'
                    }`} {...props} />
                  ),
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto mb-2">
                      <table className="min-w-full border-collapse" {...props} />
                    </div>
                  ),
                  th: ({node, ...props}) => (
                    <th className={`border px-2 py-1 text-left text-xs font-bold ${
                      msg.role === 'user' ? 'border-blue-400 bg-blue-600' : 'border-neutral-300 bg-neutral-200'
                    }`} {...props} />
                  ),
                  td: ({node, ...props}) => (
                    <td className={`border px-2 py-1 text-xs ${
                      msg.role === 'user' ? 'border-blue-400' : 'border-neutral-300'
                    }`} {...props} />
                  ),
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
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

      {(loading || isStreamingPaused) && (
        <div className="flex justify-start">
          <div className="bg-neutral-100 rounded-lg">
            <ThinkingIndicator />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
