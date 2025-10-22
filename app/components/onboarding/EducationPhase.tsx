'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import StreamingMessage from './StreamingMessage'
import TypingIndicator from './TypingIndicator'

interface EducationMessage {
  content: string
  buttonLabel: string
  autoAdvanceDelay?: number | null // null = wait for user click, number = auto-advance after ms
}

interface EducationPhaseProps {
  onComplete: () => void
}

const educationMessages: EducationMessage[] = [
  {
    content: "Se precisar de mim para criar ou editar contratos, recebíveis ou despesas, é só me mandar uma mensagem.",
    buttonLabel: "Ok", // Not shown - typing indicator used instead
    autoAdvanceDelay: null // Handled by typing indicator
  },
  {
    content: "Ah, e também pode contar comigo para responder perguntas sobre seus projetos e finanças, como o lucro de um mês específico, receita média por projeto etc. Estarei logo ali!",
    buttonLabel: "Continuar",
    autoAdvanceDelay: null // Wait for user click
  }
]

export default function EducationPhase({ onComplete }: EducationPhaseProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [showButton, setShowButton] = useState(false)
  const [showTyping, setShowTyping] = useState(false)
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)
  const typingRef = useRef<HTMLDivElement>(null)

  const currentMessage = educationMessages[currentMessageIndex]
  const isLastMessage = currentMessageIndex === educationMessages.length - 1
  const isFirstMessage = currentMessageIndex === 0

  // Advance to next message or complete
  const handleAdvance = useCallback(() => {
    if (isLastMessage) {
      onComplete()
    } else {
      setCurrentMessageIndex(prev => prev + 1)
      setShowButton(false)
      setShowTyping(false)
      setIsAutoAdvancing(false)
    }
  }, [isLastMessage, onComplete])

  // Auto-scroll when button or typing appears
  useEffect(() => {
    const elementRef = showButton ? buttonRef : showTyping ? typingRef : null
    if (elementRef?.current) {
      // Find the scrollable parent container
      const scrollContainer = elementRef.current.closest('.overflow-y-auto')
      if (scrollContainer) {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }, 50)
      }
    }
  }, [showButton, showTyping])

  // Auto-advance after typing indicator (first message only)
  useEffect(() => {
    if (showTyping && isFirstMessage) {
      const timer = setTimeout(() => {
        handleAdvance()
      }, 2000) // Show typing for 2 seconds

      return () => clearTimeout(timer)
    }
  }, [showTyping, isFirstMessage, handleAdvance])

  // Auto-advance timer for messages with autoAdvanceDelay (currently none, but kept for flexibility)
  useEffect(() => {
    if (showButton && currentMessage?.autoAdvanceDelay !== null && currentMessage?.autoAdvanceDelay !== undefined) {
      setIsAutoAdvancing(true)
      const timer = setTimeout(() => {
        handleAdvance()
      }, currentMessage.autoAdvanceDelay)

      return () => clearTimeout(timer)
    }
  }, [showButton, currentMessage, handleAdvance])

  // Handle message completion (streaming finished)
  const handleMessageComplete = () => {
    if (isFirstMessage) {
      // Show typing indicator instead of button
      setShowTyping(true)
    } else {
      // Show button for last message after 1 second delay
      setTimeout(() => {
        setShowButton(true)
      }, 1000)
    }
  }

  // Guard against undefined message
  if (!currentMessage) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Display all previous messages */}
      {educationMessages.slice(0, currentMessageIndex).map((msg, index) => (
        <div key={index} className="flex justify-start">
          <div className="max-w-[80%] p-4 rounded-2xl bg-neutral-100 text-neutral-900">
            <p className="text-base leading-relaxed">{msg.content}</p>
          </div>
        </div>
      ))}

      {/* Current streaming message */}
      <StreamingMessage
        key={currentMessageIndex}
        content={currentMessage.content}
        speed={2}
        interval={30}
        onComplete={handleMessageComplete}
      />

      {/* Typing indicator (first message only) */}
      {showTyping && (
        <div ref={typingRef} className="mt-6">
          <TypingIndicator />
        </div>
      )}

      {/* Action button (last message only) */}
      {showButton && (
        <div ref={buttonRef} className="flex justify-center mt-8">
          <button
            onClick={handleAdvance}
            className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {currentMessage.buttonLabel}
            {isAutoAdvancing && (
              <span className="ml-2 text-sm opacity-75">
                (ou aguarde)
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
