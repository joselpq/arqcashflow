'use client'

import { useState, useEffect, useRef } from 'react'

interface StreamingMessageProps {
  content: string
  speed?: number // characters per interval
  interval?: number // milliseconds between characters
  onComplete?: () => void
  keepCursorAfterComplete?: boolean // Keep cursor blinking after typing finishes
}

export default function StreamingMessage({
  content,
  speed = 2,
  interval = 30,
  onComplete,
  keepCursorAfterComplete = false
}: StreamingMessageProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const onCompleteRef = useRef(onComplete)
  const containerRef = useRef<HTMLDivElement>(null)

  // Update ref when onComplete changes (prevents effect re-run)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Auto-scroll to bottom when text updates
  useEffect(() => {
    if (containerRef.current) {
      // Find the scrollable parent container
      const scrollContainer = containerRef.current.closest('.overflow-y-auto')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [displayedText])

  // Streaming animation effect
  useEffect(() => {
    // Reset state when content changes
    setDisplayedText('')
    setIsComplete(false)

    let currentIndex = 0
    const timer = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedText(content.slice(0, currentIndex + speed))
        currentIndex += speed
      } else {
        setIsComplete(true)
        clearInterval(timer)
        // Call onComplete using ref to avoid dependency
        onCompleteRef.current?.()
      }
    }, interval)

    return () => clearInterval(timer)
  }, [content, speed, interval]) // Removed onComplete from dependencies

  return (
    <div ref={containerRef} className="flex justify-start">
      <div className="max-w-[80%] p-4 rounded-2xl bg-neutral-100 text-neutral-900">
        <p className="text-base leading-relaxed">
          {displayedText}
          {(!isComplete || keepCursorAfterComplete) && (
            <span
              className="inline-block w-[2px] h-5 bg-neutral-900 ml-1"
              style={{
                animation: 'blink 1s step-end infinite'
              }}
            />
          )}
        </p>
        <style jsx>{`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  )
}
