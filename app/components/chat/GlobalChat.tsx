'use client'

import { useEffect } from 'react'
import { useChat } from '../../contexts/ChatContext'
import ArnaldoChatFAB from './ArnaldoChatFAB'
import ChatPanel from './ChatPanel'

export default function GlobalChat() {
  const { isOpen, isExpanded, messages, loading, openChat, closeChat, toggleExpanded, sendMessage } = useChat()

  // Keyboard shortcut: Cmd/Ctrl + /
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        openChat()
      }
    }

    document.addEventListener('keydown', handleKeyboard)
    return () => document.removeEventListener('keydown', handleKeyboard)
  }, [openChat])

  return (
    <>
      <ArnaldoChatFAB onClick={openChat} />
      <ChatPanel
        isOpen={isOpen}
        isExpanded={isExpanded}
        onClose={closeChat}
        onToggleExpand={toggleExpanded}
        messages={messages}
        loading={loading}
        onSendMessage={sendMessage}
      />
    </>
  )
}
