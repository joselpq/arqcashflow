/**
 * Terminology system for profession-specific labels
 *
 * Phase 1: Switch-based lookup (hardcoded professions)
 * Phase 2: Config-driven with ProfessionConfig interface
 *
 * Purpose: Separate UI terminology from underlying data model, allowing
 * the same Contract/Receivable/Expense models to serve different professions
 * with appropriate labels.
 */

import { medicinaProfession } from './medicina'

/**
 * Profession-specific terminology interface
 * Defines all labels that vary by profession
 */
export interface ProfessionTerminology {
  // Contract/Project terminology
  contract: string
  contracts: string
  project: string
  projects: string

  // Client terminology
  client: string
  clients: string

  // Form field labels
  projectName: string
  clientName: string
  totalValue: string
  signedDate: string

  // Dashboard metrics
  activeContracts: string
  totalContracts: string
  contractValue: string

  // Actions
  createContract: string
  editContract: string
  deleteContract: string
  viewContract: string
}

/**
 * Default terminology for architecture profession
 * (Original ArqCashflow terminology)
 */
const defaultTerminology: ProfessionTerminology = {
  // Contract/Project terminology
  contract: 'Contrato',
  contracts: 'Contratos',
  project: 'Projeto',
  projects: 'Projetos',

  // Client terminology
  client: 'Cliente',
  clients: 'Clientes',

  // Form field labels
  projectName: 'Nome do Projeto',
  clientName: 'Nome do Cliente',
  totalValue: 'Valor Total do Contrato',
  signedDate: 'Data de Assinatura',

  // Dashboard metrics
  activeContracts: 'Contratos Ativos',
  totalContracts: 'Total de Contratos',
  contractValue: 'Valor do Contrato',

  // Actions
  createContract: 'Adicionar Contrato',
  editContract: 'Editar Contrato',
  deleteContract: 'Remover Contrato',
  viewContract: 'Ver Contrato'
}

/**
 * Get profession-specific terminology
 *
 * Phase 1: Switch statement for known professions
 * Phase 2: Will be replaced with config lookup
 *
 * @param profession - Profession identifier (e.g., 'medicina', 'arquitetura')
 * @returns Terminology object with profession-specific labels
 */
export function getProfessionTerminology(
  profession: string | null | undefined
): ProfessionTerminology {
  // Phase 1: Hardcoded switch for known professions
  switch (profession) {
    case 'medicina':
      return medicinaProfession.terminology

    // Phase 2: Add more professions here
    // case 'advocacia':
    //   return advocaciaProfession.terminology

    // Default to architecture terminology
    default:
      return defaultTerminology
  }
}

/**
 * React-friendly hook-like function for getting terminology
 * Can be used in components: const t = useTerminology(team.profession)
 *
 * Note: Not a real React hook (doesn't use useState/useEffect)
 * Just a naming convention for clarity in components
 */
export function useTerminology(
  profession: string | null | undefined
): ProfessionTerminology {
  return getProfessionTerminology(profession)
}

/**
 * Get onboarding-specific messages for profession
 *
 * @param profession - Profession identifier
 * @returns Onboarding messages adapted to profession
 */
export function getOnboardingMessages(profession: string | null | undefined) {
  switch (profession) {
    case 'medicina':
      return {
        hasSpreadsheetQuestion: medicinaProfession.onboarding.hasSpreadsheetQuestion,
        fileUploadMessage: medicinaProfession.onboarding.fileUploadMessage,
        fileUploadDescription: medicinaProfession.onboarding.fileUploadDescription
      }

    // Default architecture messaging
    default:
      return {
        hasSpreadsheetQuestion: 'Tem alguma planilha onde controla seus projetos?',
        fileUploadMessage: 'Envie sua(s) planilha(s) de projetos',
        fileUploadDescription: 'Aceito: Excel (.xlsx, .xls), CSV, Google Sheets'
      }
  }
}
