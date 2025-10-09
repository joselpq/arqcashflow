'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const handleSend = async () => {
    if (message.trim() && !disabled && !isSending) {
      setIsSending(true)
      const messageToSend = message.trim()
      setMessage('') // Clear immediately after storing the message
      try {
        await onSend(messageToSend)
      } finally {
        setIsSending(false)
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift) - only if not currently sending
    if (e.key === 'Enter' && !e.shiftKey && !isSending) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="p-4 border-t border-neutral-200 bg-white">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Aguarde a resposta..." : "Digite sua mensagem..."}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-neutral-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || isSending}
          className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors h-10 flex items-center justify-center"
          aria-label="Enviar mensagem"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
      <p className="text-xs text-neutral-500 mt-2">
        Pressione Enter para enviar, Shift+Enter para nova linha
      </p>
    </div>
  )
}
