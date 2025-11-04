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
    client: 'Responsável',
    clients: 'Responsáveis',

    // Form field labels
    projectName: 'Nome do Paciente',
    clientName: 'Nome do Responsável',
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

  // Form options (categories and status)
  formOptions: {
    categories: [
      'Consulta de Rotina',
      'Consulta de Retorno',
      'Procedimento',
      'Exame',
      'Cirurgia',
      'Tratamento Continuado',
      'Emergência',
      'Telemedicina',
      'Outros'
    ],
    statuses: [
      { value: 'active', label: 'Em Tratamento' },
      { value: 'completed', label: 'Alta Médica' },
      { value: 'paused', label: 'Pausado' },
      { value: 'cancelled', label: 'Cancelado' }
    ]
  },

  // Onboarding customization
  onboarding: {
    hasSpreadsheetQuestion: 'Você controla suas consultas e finanças em alguma planilha?',
    hasContractsQuestion: 'Você tem alguma lista ou planilha com seus pacientes e os valores das consultas/procedimentos?',
    fileUploadMessage: 'Envie sua(s) planilha(s) de pacientes e consultas',
    fileUploadDescription: 'Aceito: Excel (.xlsx, .xls), CSV, Google Sheets'
  },

  // Business context for SetupAssistant AI extraction prompts
  businessContext: {
    businessType: 'um profissional de medicina no Brasil',
    professionName: 'Medicina',

    // Condensed summary for file analysis prompt
    summaryContext: 'Profissionais de medicina no Brasil atendem pacientes em consultórios, clínicas ou hospitais. A receita vem principalmente de consultas (valor por sessão, que pode variar), procedimentos médicos (exames, pequenas cirurgias), atendimentos de emergência, plantões, e eventualmente convênios médicos ou planos de saúde. Os "contratos" no contexto médico são na verdade PACIENTES em tratamento ou acompanhamento contínuo. Não há necessariamente um valor fixo de contrato ou data de assinatura formal - o relacionamento é contínuo e baseado em consultas. As principais despesas incluem salários de equipe (secretária, enfermeiros), aluguel de consultório/clínica, equipamentos médicos, materiais descartáveis, software de gestão médica, impostos, plano de saúde profissional, seguro de responsabilidade civil, marketing e manutenção de equipamentos.',

    // Detailed revenue sources for PDF/vision extraction
    revenueDescription: `Profissionais de medicina no Brasil ganham dinheiro principalmente de:
• Consultas médicas (valor por sessão, pode variar por especialidade)
• Procedimentos médicos (exames, pequenas cirurgias, tratamentos)
• Atendimentos de emergência e plantões
• Aluguel de sala para outros médicos
• Convênios médicos e planos de saúde (recebimento por atendimentos)
• Telemedicina (consultas online)
• Aulas ou palestras
• Comissão por encaminhamento de pacientes para outros especialistas`,

    // Project types for PDF/vision extraction
    projectTypes: `Tipos de atendimento comuns:
• Consultas de rotina e check-ups
• Tratamentos especializados por área médica
• Procedimentos ambulatoriais
• Acompanhamento de pacientes crônicos
• Atendimentos de emergência
• Telemedicina e consultas online`,

    // Common expenses for PDF/vision extraction
    expenseDescription: `Principais despesas:
• Salários: secretária, enfermeiros, assistentes
• Espaço: aluguel de consultório/clínica, energia, internet
• Equipamentos médicos e manutenção
• Materiais descartáveis e insumos médicos
• Software de gestão médica e prontuário eletrônico
• Marketing: site, redes sociais, Google Ads
• Impostos e taxas profissionais
• Plano de saúde profissional e seguro de responsabilidade civil
• Formação continuada e congressos médicos`
  },

  // AI prompt context additions
  ai: {
    systemContextAddition: `
CONTEXTO MÉDICO:
- Usuário é profissional da área de medicina
- Para fins de APIs, "Contratos" são Pacientes
- Se o usuário mencionar o nome de um paciente para associar uma despesa ou recebível, encontre esse paciente (contrato) para associar essa despesa/recebível a ele ao invés de criar sem contrato
- Valores podem ser por consulta/sessão (não necessariamente fixos)
- Relacionamentos são contínuos (não há "data de assinatura" formal)
- Recebíveis podem ser honorários por consultas/procedimentos, aluguéis de salas para outros médicos, aulas, palestras, etc.
- Quando o usuário menciona uma consulta, ele está se referindo a uma consulta médica, e não uma consulta ao banco de dados (a não ser que mencione explicitamente isso)
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
    },

    // API terminology for prompt injection (maps database terms to user terms)
    apiTerminology: {
      contract: 'paciente',     // "contract" in DB = "paciente" for users
      project: 'paciente'       // "project" in DB = "paciente" for users
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
