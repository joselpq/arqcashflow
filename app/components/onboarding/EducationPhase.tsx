'use client'

import { useState, useEffect } from 'react'
import StreamingMessage from './StreamingMessage'

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
    content: "Se precisar de mim para criar ou editar contratos, recebíveis ou despesas, estarei logo aqui.",
    buttonLabel: "Ok",
    autoAdvanceDelay: 3000 // Auto-advance after 3s
  },
  {
    content: "Ah, e pode contar comigo para responder perguntas sobre seus projetos ou finanças",
    buttonLabel: "Continuar",
    autoAdvanceDelay: null // Wait for user click
  }
]

export default function EducationPhase({ onComplete }: EducationPhaseProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [showButton, setShowButton] = useState(false)
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false)

  const currentMessage = educationMessages[currentMessageIndex]
  const isLastMessage = currentMessageIndex === educationMessages.length - 1

  // Handle message completion (streaming finished)
  const handleMessageComplete = () => {
    setShowButton(true)

    // Auto-advance if configured
    if (currentMessage.autoAdvanceDelay !== null && currentMessage.autoAdvanceDelay !== undefined) {
      setIsAutoAdvancing(true)
      const timer = setTimeout(() => {
        handleAdvance()
      }, currentMessage.autoAdvanceDelay)

      return () => clearTimeout(timer)
    }
  }

  // Advance to next message or complete
  const handleAdvance = () => {
    if (isLastMessage) {
      onComplete()
    } else {
      setCurrentMessageIndex(prev => prev + 1)
      setShowButton(false)
      setIsAutoAdvancing(false)
    }
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

      {/* Action button */}
      {showButton && (
        <div className="flex justify-center mt-4">
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
