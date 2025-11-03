/**
 * Medical profession-specific configuration
 *
 * Phase 1: Hardcoded for doctors (MVP validation)
 * Phase 2: Will migrate to config-driven system
 *
 * Context: Doctors work with patients (not projects) and typically charge per session
 * rather than having fixed contract values. This config adapts the platform for medical
 * professionals while maintaining the same underlying data model.
 */

export const medicinaProfession = {
  id: 'medicina',
  label: 'Medicina',

  // Validation overrides for medical profession
  validation: {
    contractValueRequired: false,  // Sessions may have variable pricing
    signedDateRequired: false,     // Ongoing patient relationships
    sessionFrequencyTracking: true // Track consultation frequency
  },

  // Terminology mappings (UI labels)
  terminology: {
    // Contract terminology
    contract: 'Paciente',
    contracts: 'Pacientes',
    project: 'Paciente',
    projects: 'Pacientes',

    // Client terminology
    client: 'Paciente',
    clients: 'Pacientes',

    // Form field labels
    projectName: 'Nome do Paciente',
    clientName: 'Nome do Paciente',
    totalValue: 'Valor Médio por Consulta',
    signedDate: 'Data da Primeira Consulta',

    // Dashboard metrics
    activeContracts: 'Pacientes Ativos',
    totalContracts: 'Total de Pacientes',
    contractValue: 'Valor Médio por Consulta',

    // Actions
    createContract: 'Adicionar Paciente',
    editContract: 'Editar Paciente',
    deleteContract: 'Remover Paciente',
    viewContract: 'Ver Paciente'
  },

  // Onboarding customization
  onboarding: {
    hasSpreadsheetQuestion: 'Você controla seus pacientes e consultas em alguma planilha?',
    fileUploadMessage: 'Envie sua(s) planilha(s) de pacientes e consultas',
    fileUploadDescription: 'Aceito: Excel (.xlsx, .xls), CSV, Google Sheets'
  },

  // AI prompt context additions
  ai: {
    systemContextAddition: `
CONTEXTO MÉDICO:
- Usuário é profissional da área de medicina
- "Contratos" são PACIENTES (pessoas em tratamento/acompanhamento)
- Valores podem ser por consulta/sessão (não necessariamente fixos)
- Relacionamentos são contínuos (não há "data de assinatura" formal)
- Recebíveis são honorários por consultas/procedimentos realizados
`,
    entityDescriptions: {
      contracts: 'pacientes em tratamento ou acompanhamento',
      receivables: 'honorários de consultas e procedimentos',
      expenses: 'despesas operacionais do consultório/clínica'
    },

    // Query examples (for CONSULTAS section)
    queryExamples: {
      contracts: '"Quais pacientes estão ativos?"',
    },

    // Database schema field requirements
    schemaRequirements: {
      contract: {
        totalValue: 'OPTIONAL',
        signedDate: 'OPTIONAL'
      }
    },

    // Service API requirements
    serviceRequirements: {
      contract: {
        required: 'clientName, projectName',
        optional: 'totalValue, signedDate, description, status, category, notes'
      }
    }
  }
} as const

/**
 * Type guard to check if profession is medicina
 */
export function isMedicalProfession(profession: string | null | undefined): boolean {
  return profession === 'medicina'
}

/**
 * Get medical-specific validation rules
 */
export function getMedicalValidationRules() {
  return {
    contractValueRequired: false,
    signedDateRequired: false,
    allowSessionBasedPricing: true
  }
}
