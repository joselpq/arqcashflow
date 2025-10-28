'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export type TransitionPhase = 'idle' | 'shrinking' | 'fading' | 'complete'

interface TransitionState {
  phase: TransitionPhase
  progress: number // 0-100
}

export function useOnboardingTransition() {
  const router = useRouter()
  const [state, setState] = useState<TransitionState>({
    phase: 'idle',
    progress: 0
  })

  const startTransition = useCallback(async () => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      // Skip animation, instant redirect
      sessionStorage.setItem('onboarding-completed', 'true')
      router.push('/')
      return
    }

    // Prefetch dashboard page to load it in background
    router.prefetch('/')

    // Phase 1: Shrink to FAB in center (1200ms - DOUBLED)
    // - Content blurs out
    // - Container shrinks to 56px circle
    // - FAB icon appears
    setState({ phase: 'shrinking', progress: 30 })
    await new Promise(resolve => setTimeout(resolve, 1200))

    // Pause: Hold FAB in center (600ms - DOUBLED)
    // - User sees the FAB clearly before handoff
    // - Emphasizes the transition moment
    await new Promise(resolve => setTimeout(resolve, 600))

    // Phase 2: Crossfade (1600ms - DOUBLED)
    // - Onboarding FAB fades out in center
    // - Destination FAB fades in at bottom-right (on onboarding page)
    setState({ phase: 'fading', progress: 70 })

    await new Promise(resolve => setTimeout(resolve, 1600))

    // Pause: Hold both FABs visible (400ms)
    // - Center FAB is now invisible
    // - Corner FAB is fully visible
    // - User sees the final state before transition
    await new Promise(resolve => setTimeout(resolve, 400))

    // Set flag for dashboard fade-in
    sessionStorage.setItem('onboarding-completed', 'true')

    // Complete and redirect
    setState({ phase: 'complete', progress: 100 })
    router.push('/')
  }, [router])

  return { state, startTransition }
}
