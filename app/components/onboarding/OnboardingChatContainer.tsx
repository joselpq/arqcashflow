'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { TransitionPhase } from '../../hooks/useOnboardingTransition'

interface OnboardingChatContainerProps {
  children: ReactNode
  actions?: ReactNode
  transitionPhase?: TransitionPhase
}

export default function OnboardingChatContainer({ children, actions, transitionPhase = 'idle' }: OnboardingChatContainerProps) {
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

  // Build transition classes
  const isTransitioning = transitionPhase !== 'idle'
  const transitionClasses = isTransitioning ? `transition-${transitionPhase}` : ''

  return (
    <div className={`chat-container ${transitionClasses}`}>
      <div className="chat-content">
        {/* Chat Messages Container with auto-scroll */}
        <div
          ref={messagesContainerRef}
          className="space-y-6 pr-2 pb-6 messages-container overflow-y-auto"
        >
          {children}
        </div>

        {/* Fixed actions area at bottom with more padding */}
        {actions && (
          <div className="pt-6 mt-4 border-t border-neutral-100 actions-container">
            {actions}
          </div>
        )}
      </div>

      {/* FAB icon - appears during shrinking */}
      <div className="fab-icon">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2 L14 10 L15.5 12 L14 14 L12 22 L10 14 L8.5 12 L10 10 Z M2 12 L10 10 L12 8.5 L14 10 L22 12 L14 14 L12 15.5 L10 14 Z" />
          <path d="M18.5 3.5 L19.1 5.5 L19.65 6.5 L19.1 7.5 L18.5 9.5 L17.9 7.5 L17.35 6.5 L17.9 5.5 Z M15.5 6.5 L17.5 5.9 L18.5 5.35 L19.5 5.9 L21.5 6.5 L19.5 7.1 L18.5 7.65 L17.5 7.1 Z" />
          <path d="M5.5 14.5 L6.1 16.5 L6.65 17.5 L6.1 18.5 L5.5 20.5 L4.9 18.5 L4.35 17.5 L4.9 16.5 Z M2.5 17.5 L4.5 16.9 L5.5 16.35 L6.5 16.9 L8.5 17.5 L6.5 18.1 L5.5 18.65 L4.5 18.1 Z" />
        </svg>
      </div>

      {/* Transition animations */}
      <style jsx>{`
        .chat-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 1rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          padding: 2.5rem;
          border: 1px solid #e5e5e5;
          max-width: 48rem;
          width: 90%;
          height: 600px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          transition: opacity 0.4s ease-out, filter 0.4s ease-out;
          overflow: hidden;
        }

        .messages-container {
          flex: 1;
          overflow-x: hidden;
        }

        .actions-container {
          flex-shrink: 0;
        }

        .fab-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          opacity: 0;
          transition: opacity 0.3s ease-in 0.2s;
          pointer-events: none;
        }

        /* Shrinking: blur content, shrink to circle, show FAB */
        @keyframes shrink-to-fab {
          0% {
            width: 90%;
            max-width: 48rem;
            height: 600px;
            border-radius: 1rem;
            padding: 2.5rem;
            background: white;
          }
          100% {
            width: 56px;
            max-width: 56px;
            height: 56px;
            border-radius: 50%;
            padding: 0;
            background: linear-gradient(to right, rgb(59, 130, 246), rgb(147, 51, 234));
          }
        }

        .transition-shrinking {
          animation: shrink-to-fab 600ms ease-out forwards;
        }

        .transition-shrinking .chat-content {
          opacity: 0;
          filter: blur(8px);
        }

        .transition-shrinking .fab-icon {
          opacity: 1;
        }

        /* Moving: FAB moves to corner */
        @keyframes move-to-corner {
          0% {
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }
          100% {
            top: auto;
            left: auto;
            bottom: 24px;
            right: 24px;
            transform: translate(0, 0);
          }
        }

        .transition-moving {
          position: fixed;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          padding: 0;
          background: linear-gradient(to right, rgb(59, 130, 246), rgb(147, 51, 234));
          animation: move-to-corner 400ms ease-in-out forwards;
        }

        .transition-moving .chat-content {
          opacity: 0;
        }

        .transition-moving .fab-icon {
          opacity: 1;
        }

        /* Morphing state (same as moving, maintained for compatibility) */
        .transition-morphing {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          padding: 0;
          background: linear-gradient(to right, rgb(59, 130, 246), rgb(147, 51, 234));
          transform: translate(0, 0);
        }

        .transition-morphing .chat-content {
          opacity: 0;
        }

        .transition-morphing .fab-icon {
          opacity: 1;
        }

        @media (prefers-reduced-motion: reduce) {
          .transition-shrinking,
          .transition-moving,
          .transition-morphing {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  )
}
