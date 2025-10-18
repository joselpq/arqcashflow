'use client'

import { ReactNode, useEffect, useRef } from 'react'

interface OnboardingChatContainerProps {
  children: ReactNode
}

export default function OnboardingChatContainer({ children }: OnboardingChatContainerProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when children change (new messages added)
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    })
  }, [children])

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 border border-neutral-200 max-w-3xl mx-auto">
      {/* Chat Messages Container with auto-scroll */}
      <div
        ref={messagesContainerRef}
        className="space-y-6 h-[450px] overflow-y-auto pr-2"
      >
        {children}
      </div>
    </div>
  )
}
