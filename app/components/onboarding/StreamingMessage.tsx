'use client'

import { useState, useEffect } from 'react'

interface StreamingMessageProps {
  content: string
  speed?: number // characters per interval
  interval?: number // milliseconds between characters
  onComplete?: () => void
}

export default function StreamingMessage({
  content,
  speed = 2,
  interval = 30,
  onComplete
}: StreamingMessageProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    let currentIndex = 0
    const timer = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedText(content.slice(0, currentIndex + speed))
        currentIndex += speed
      } else {
        setIsComplete(true)
        clearInterval(timer)
        onComplete?.()
      }
    }, interval)

    return () => clearInterval(timer)
  }, [content, speed, interval, onComplete])

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] p-4 rounded-2xl bg-neutral-100 text-neutral-900">
        <p className="text-base leading-relaxed">
          {displayedText}
          {!isComplete && (
            <span className="inline-block w-[2px] h-5 bg-neutral-900 ml-1 animate-pulse">|</span>
          )}
        </p>
      </div>
    </div>
  )
}
