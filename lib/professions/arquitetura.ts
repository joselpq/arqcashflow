/**
 * Architecture profession configuration (default)
 *
 * This is the original ArqCashflow configuration - terminology and prompts
 * designed for architects and construction professionals.
 *
 * IMPORTANT: This config produces the EXACT same prompts as the original
 * hardcoded prompts. Do not change these strings unless you want to change
 * the behavior for architecture users.
 */

export const arquiteturaProfession = {
  id: 'arquitetura',
  label: 'Arquitetura',

  // Validation rules for architecture profession
  validation: {
    contractValueRequired: true,   // Projects have fixed contract values
    signedDateRequired: true,      // Contracts have formal signing dates
  },

  // Original ArqCashflow terminology
  terminology: {
    // Contract terminology
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
  },

  // Onboarding (original messaging)
  onboarding: {
    hasSpreadsheetQuestion: 'Tem alguma planilha onde controla seus projetos?',
    fileUploadMessage: 'Envie sua(s) planilha(s) de projetos',
    fileUploadDescription: 'Aceito: Excel (.xlsx, .xls), CSV, Google Sheets'
  },

  // AI prompt configuration (original text)
  ai: {
    // No additional context needed for architecture (original behavior)
    systemContextAddition: '',

    // Entity descriptions in prompts (MUST match original exactly)
    entityDescriptions: {
      contracts: 'projetos do usuário',
      receivables: 'valores a receber de clientes',
      expenses: 'gastos únicos ou recorrentes'
    },

    // Query examples (for CONSULTAS section)
    queryExamples: {
      contracts: '"Quais contratos estão ativos?"',
    },

    // Database schema field requirements
    schemaRequirements: {
      contract: {
        totalValue: 'REQUIRED',
        signedDate: 'REQUIRED'
      }
    },

    // Service API requirements
    serviceRequirements: {
      contract: {
        required: 'clientName, projectName, totalValue, signedDate',
        optional: 'description, status, category, notes'
      }
    }
  }
} as const

/**
 * Type guard to check if profession is arquitetura
 */
export function isArchitectureProfession(profession: string | null | undefined): boolean {
  return !profession || profession === 'arquitetura' || profession === 'engenharia-civil'
    || profession === 'design-interiores' || profession === 'paisagismo' || profession === 'urbanismo'
}
