/**
 * Profession system entry point
 * Central export for all profession-related functionality
 *
 * Phase 1: Simple exports of medicina + terminology helpers
 * Phase 2: Will add ProfessionConfig interface and registry
 * Phase 3: Will add database-driven configs and admin UI
 */

// Medical profession exports
export {
  medicinaProfession,
  isMedicalProfession,
  getMedicalValidationRules
} from './medicina'

// Terminology system exports
export {
  getProfessionTerminology,
  useTerminology,
  getOnboardingMessages
} from './terminology'

// TypeScript types
export type { ProfessionTerminology } from './terminology'

// Phase 2 exports (will be added later):
// export { getProfessionConfig, validateProfessionConfig } from './config'
// export { ProfessionConfigProvider, useProfessionConfig } from './context'
// export type { ProfessionConfig, ValidationRules, AIPromptConfig } from './types'
