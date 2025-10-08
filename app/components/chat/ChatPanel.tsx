'use client'

import { useEffect } from 'react'
import ChatHeader from './ChatHeader'
import MessageList, { Message } from './MessageList'
import ChatInput from './ChatInput'

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
  messages: Message[]
  loading: boolean
  onSendMessage: (message: string) => void
}

export default function ChatPanel({
  isOpen,
  onClose,
  messages,
  loading,
  onSendMessage
}: ChatPanelProps) {
  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Chat Panel */}
      <div
        className={`
          fixed right-0 top-0 h-full bg-white shadow-2xl z-50
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          w-full md:w-[400px]
        `}
      >
        <ChatHeader onClose={onClose} />
        <MessageList messages={messages} loading={loading} />
        <ChatInput onSend={onSendMessage} disabled={loading} />
      </div>
    </>
  )
}
