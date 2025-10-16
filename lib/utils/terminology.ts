/**
 * Business Terminology Configuration
 *
 * Allows customization of business-specific terms via environment variables.
 * This enables the same codebase to work for different industries:
 * - Architecture firms: "Projetos"
 * - Medical practices: "Pacientes"
 * - Construction: "Obras"
 * - Law firms: "Casos"
 * - etc.
 */

export interface BusinessTerminology {
  // Primary entity (contracts/projects)
  projects: string // e.g., "Projetos", "Pacientes", "Obras", "Casos"
  project: string  // singular

  // Financial entities
  receivables: string // e.g., "Recebíveis", "Honorários"
  expenses: string    // e.g., "Despesas", "Custos"
}

// Default terminology (Architecture firm)
const defaultTerminology: BusinessTerminology = {
  projects: 'Projetos',
  project: 'Projeto',
  receivables: 'Recebíveis',
  expenses: 'Despesas'
}

// Industry presets
const industryPresets: Record<string, BusinessTerminology> = {
  architecture: {
    projects: 'Projetos',
    project: 'Projeto',
    receivables: 'Recebíveis',
    expenses: 'Despesas'
  },
  medical: {
    projects: 'Pacientes',
    project: 'Paciente',
    receivables: 'Honorários',
    expenses: 'Custos'
  },
  construction: {
    projects: 'Obras',
    project: 'Obra',
    receivables: 'Recebimentos',
    expenses: 'Despesas'
  },
  law: {
    projects: 'Casos',
    project: 'Caso',
    receivables: 'Honorários',
    expenses: 'Despesas'
  }
}

/**
 * Get business terminology based on environment variable
 *
 * Usage in .env:
 * BUSINESS_TYPE=architecture (default)
 * BUSINESS_TYPE=medical
 * BUSINESS_TYPE=construction
 * BUSINESS_TYPE=law
 */
export function getBusinessTerminology(): BusinessTerminology {
  const businessType = process.env.NEXT_PUBLIC_BUSINESS_TYPE || 'architecture'

  return industryPresets[businessType] || defaultTerminology
}

// Export singleton instance for consistency
export const terminology = getBusinessTerminology()
