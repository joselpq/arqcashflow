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

    // Phase 1: Shrink (500ms)
    setState({ phase: 'shrinking', progress: 0 })
    await new Promise(resolve => setTimeout(resolve, 500))

    // Phase 2: Move to corner (700ms)
    setState({ phase: 'moving', progress: 33 })
    await new Promise(resolve => setTimeout(resolve, 700))

    // Phase 3: Morph to FAB (300ms)
    setState({ phase: 'morphing', progress: 66 })
    await new Promise(resolve => setTimeout(resolve, 300))

    // Complete - redirect to dashboard
    setState({ phase: 'complete', progress: 100 })

    // Set flag for dashboard to know we're coming from onboarding
    sessionStorage.setItem('onboarding-completed', 'true')

    // Small delay before redirect to ensure animation completes
    await new Promise(resolve => setTimeout(resolve, 100))
    router.push('/')
  }, [router])

  return { state, startTransition }
}
