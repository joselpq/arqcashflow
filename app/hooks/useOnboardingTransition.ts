'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export type TransitionPhase = 'idle' | 'shrinking' | 'moving' | 'morphing' | 'complete'

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

    // Phase 1: Shrink to FAB (600ms)
    // - Content blurs out
    // - Container shrinks to 56px circle
    // - FAB icon appears
    setState({ phase: 'shrinking', progress: 0 })
    await new Promise(resolve => setTimeout(resolve, 600))

    // Phase 2: Move to corner (400ms)
    // - FAB circle moves to bottom-right
    setState({ phase: 'moving', progress: 50 })
    await new Promise(resolve => setTimeout(resolve, 400))

    // Phase 3: Quick morph (100ms) - visual polish
    setState({ phase: 'morphing', progress: 90 })
    await new Promise(resolve => setTimeout(resolve, 100))

    // Complete - redirect to dashboard
    setState({ phase: 'complete', progress: 100 })

    // Set flag for dashboard fade-in
    sessionStorage.setItem('onboarding-completed', 'true')

    // Redirect (dashboard page is already prefetched)
    router.push('/')
  }, [router])

  return { state, startTransition }
}
