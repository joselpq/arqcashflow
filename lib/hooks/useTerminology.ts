'use client'

import { useState, useEffect } from 'react'
import { getProfessionTerminology } from '@/lib/professions'

/**
 * React hook for accessing profession-aware terminology throughout the application.
 *
 * Features:
 * - Fetches team profession from API
 * - Caches profession in localStorage for instant availability on subsequent renders
 * - Returns terminology object with labels like: contract, contracts, project, projects, etc.
 * - Loading state to handle async profession fetch
 *
 * Usage:
 * ```tsx
 * const { terminology, loading } = useTerminology()
 *
 * return (
 *   <h1>{terminology.contracts}</h1>  // "Contratos" or "Pacientes"
 * )
 * ```
 *
 * @returns {Object} { terminology, loading, profession }
 */
export function useTerminology() {
  const [profession, setProfession] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check localStorage cache first for instant terminology
    const cachedProfession = localStorage.getItem('userProfession')
    if (cachedProfession) {
      setProfession(cachedProfession)
      setLoading(false)
    }

    // Fetch fresh data in background
    fetch('/api/user/team')
      .then(res => res.json())
      .then(data => {
        if (data.team?.profession) {
          setProfession(data.team.profession)
          localStorage.setItem('userProfession', data.team.profession)
        } else {
          // Default to arquitetura if no profession set
          setProfession('arquitetura')
          localStorage.setItem('userProfession', 'arquitetura')
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('[useTerminology] Failed to fetch team profession:', err)
        // Fallback to arquitetura on error
        setProfession('arquitetura')
        setLoading(false)
      })
  }, [])

  // Get terminology based on profession
  const terminology = getProfessionTerminology(profession || 'arquitetura')

  return {
    terminology,
    loading,
    profession
  }
}
