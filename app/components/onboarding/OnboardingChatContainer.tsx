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
    <div className={`bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 border border-neutral-200 max-w-3xl mx-auto flex flex-col h-[600px] ${transitionClasses}`}>
      {/* Chat Messages Container with auto-scroll */}
      <div
        ref={messagesContainerRef}
        className="space-y-6 flex-1 overflow-y-auto pr-2 pb-6"
      >
        {children}
      </div>

      {/* Fixed actions area at bottom with more padding */}
      {actions && (
        <div className="pt-6 mt-4 border-t border-neutral-100">
          {actions}
        </div>
      )}

      {/* Transition animations */}
      <style jsx>{`
        /* Shrink animation - container shrinks to intermediate size */
        @keyframes shrink-container {
          from {
            max-width: 768px;
            height: 600px;
            transform: translate(-50%, -50%);
          }
          to {
            max-width: 400px;
            height: 500px;
            transform: translate(-50%, -50%);
          }
        }

        /* Move animation - container moves to bottom-right */
        @keyframes move-to-corner {
          from {
            max-width: 400px;
            height: 500px;
            transform: translate(-50%, -50%);
            position: relative;
            margin: auto;
          }
          to {
            max-width: 400px;
            height: 500px;
            transform: translate(0, 0);
            position: fixed;
            bottom: 24px;
            right: 24px;
            margin: 0;
            top: auto;
            left: auto;
          }
        }

        /* Morph animation - container becomes FAB circle */
        @keyframes morph-to-fab {
          from {
            max-width: 400px;
            width: 400px;
            height: 500px;
            border-radius: 1rem;
            padding: 2.5rem;
            opacity: 1;
          }
          to {
            max-width: 56px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            padding: 0;
            opacity: 0.8;
          }
        }

        /* Apply animations based on transition phase */
        .transition-shrinking {
          animation: shrink-container 500ms ease-out forwards;
        }

        .transition-moving {
          animation: move-to-corner 700ms ease-in-out forwards;
        }

        .transition-morphing {
          animation: morph-to-fab 300ms ease-in forwards;
        }

        /* Respect reduced motion preference */
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
