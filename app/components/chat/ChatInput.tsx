'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { useTerminology } from '@/lib/hooks/useTerminology'
import { getProfessionConfig } from '@/lib/professions'

interface ChatInputProps {
  onSend: (message: string, file?: File) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const { profession } = useTerminology()
  const professionConfig = getProfessionConfig(profession)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Validate file type and size
  const validateFile = (file: File): string | null => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp'
    ]

    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!validTypes.includes(file.type)) {
      return 'Tipo de arquivo não suportado. Use Excel, CSV, PDF ou imagens.'
    }

    if (file.size > maxSize) {
      return 'Arquivo muito grande. Tamanho máximo: 10MB'
    }

    return null
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const error = validateFile(file)
    if (error) {
      setFileError(error)
      setSelectedFile(null)
      return
    }

    setFileError(null)
    setSelectedFile(file)
  }

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFileError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSend = async () => {
    // Allow sending with file only, message only, or both
    const hasContent = message.trim() || selectedFile
    if (hasContent && !disabled && !isSending) {
      setIsSending(true)
      const messageToSend = message.trim()
      const fileToSend = selectedFile

      // Clear inputs immediately
      setMessage('')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      try {
        await onSend(messageToSend || 'Arquivo enviado', fileToSend || undefined)
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

  const exampleQueries = profession === 'medicina'
    ? [
        "Quantos pacientes atendi em setembro?",
        "Recebi R$350 da consulta do João",
        "Salário enfermeira R$4k todo dia 5"
      ]
    : [
        "Quanto faturei em setembro?",
        "Recebi 500 reais do projeto João",
        "Salário Pedro R$5k todo dia 5"
      ]

  const handleExampleClick = (example: string) => {
    setMessage(example)
    textareaRef.current?.focus()
  }

  return (
    <div className="p-4 border-t border-neutral-200 bg-white">
      {/* Example queries - shown when no messages */}
      {!selectedFile && (
        <div className="mb-3 flex flex-wrap gap-2 justify-center">
          {exampleQueries.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              disabled={disabled || isSending}
              className="text-xs bg-neutral-50 hover:bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-full border border-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {/* File preview */}
      {selectedFile && (
        <div className="mb-3 flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="flex-1 text-sm text-neutral-700 truncate">{selectedFile.name}</span>
          <span className="text-xs text-neutral-500">{(selectedFile.size / 1024).toFixed(1)} KB</span>
          <button
            onClick={handleRemoveFile}
            className="text-neutral-500 hover:text-red-600 transition-colors"
            aria-label="Remover arquivo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error message */}
      {fileError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {fileError}
        </div>
      )}

      <div className="flex gap-2 items-end">
        {/* File upload button */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept=".xlsx,.xls,.csv,.pdf,image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          disabled={disabled || isSending}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSending}
          className="bg-neutral-100 text-neutral-700 rounded-lg p-2 hover:bg-neutral-200 disabled:bg-neutral-50 disabled:cursor-not-allowed transition-colors h-10 flex items-center justify-center"
          aria-label="Anexar arquivo"
          title="Anexar arquivo (Excel, CSV, PDF, imagem)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Aguarde a resposta..." : selectedFile ? "Mensagem opcional..." : "Digite sua mensagem..."}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-neutral-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
        />
        <button
          onClick={handleSend}
          disabled={(!message.trim() && !selectedFile) || disabled || isSending}
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
        {selectedFile
          ? 'Arquivo selecionado. Envie ou adicione uma mensagem opcional.'
          : 'Pressione Enter para enviar, Shift+Enter para nova linha'}
      </p>
    </div>
  )
}
