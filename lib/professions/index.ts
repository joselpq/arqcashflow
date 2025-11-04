/**
 * Profession system entry point
 * Central export for all profession-related functionality
 *
 * Phase 1: Simple exports of medicina + arquitetura + terminology helpers
 * Phase 2: Will add ProfessionConfig interface and registry
 * Phase 3: Will add database-driven configs and admin UI
 */

// Import configs for local use
import { arquiteturaProfession, isArchitectureProfession } from './arquitetura'
import { medicinaProfession, isMedicalProfession, getMedicalValidationRules } from './medicina'

// Re-export for external use
export {
  arquiteturaProfession,
  isArchitectureProfession
}

export {
  medicinaProfession,
  isMedicalProfession,
  getMedicalValidationRules
}

// Terminology system exports
export {
  getProfessionTerminology,
  useTerminology,
  getOnboardingMessages
} from './terminology'

// TypeScript types
export type { ProfessionTerminology } from './terminology'

/**
 * Get complete profession configuration
 * Phase 1: Simple switch statement
 * Phase 2: Will become config-driven lookup
 *
 * @param profession - Profession identifier (e.g., 'medicina', 'arquitetura')
 * @returns Complete profession configuration object
 */
export function getProfessionConfig(profession: string | null | undefined) {
  // Map medicina to medicina config
  if (profession === 'medicina') {
    return medicinaProfession
  }

  // Default to architecture (includes null, undefined, and all architecture-related professions)
  return arquiteturaProfession
}

// Phase 2 exports (will be added later):
// export { validateProfessionConfig } from './config'
// export { ProfessionConfigProvider, useProfessionConfig } from './context'
// export type { ProfessionConfig, ValidationRules, AIPromptConfig } from './types'
