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

  // Form options (categories and status)
  formOptions: {
    categories: [
      'Projeto Residencial',
      'Projeto Comercial',
      'Projeto Corporativo',
      'Projeto Industrial',
      'Reforma',
      'Paisagismo',
      'Interiores',
      'Consultoria',
      'Outros'
    ],
    statuses: [
      { value: 'active', label: 'Ativo' },
      { value: 'completed', label: 'Concluído' },
      { value: 'paused', label: 'Pausado' },
      { value: 'cancelled', label: 'Cancelado' }
    ]
  },

  // Onboarding (original messaging)
  onboarding: {
    hasSpreadsheetQuestion: 'Tem alguma planilha onde controla seus projetos?',
    hasContractsQuestion: 'Você tem contratos ou propostas dos seus projetos? Assim podemos extrair e cadastrar os valores e datas de todos os recebíveis',
    fileUploadMessage: 'Envie sua(s) planilha(s) de projetos',
    fileUploadDescription: 'Aceito: Excel (.xlsx, .xls), CSV, Google Sheets'
  },

  // Business context for SetupAssistant AI extraction prompts
  businessContext: {
    businessType: 'um escritório de arquitetura no Brasil',
    professionName: 'Arquitetura',

    // Condensed summary for file analysis prompt
    summaryContext: 'Arquitetos ou escritórios de arquitetura no Brasil ganham dinheiro majoritariamente de projetos (geralmente pago em múltiplas parcelas por projeto), comissão de RT (responsabilidade técnica) na intermediação de venda/contratação de móveis ou demais fornecedores pelos seus clientes (geralmente múltiplas entradas por projeto, pagas por diversos fornecedores), acompanhamento de obra ou de projeto (geralmente também em parcelas) ou até um % de gestão ou comissão sobre o orçamento da obra. Os projetos podem ser residenciais (ex: apartamentos, áreas comuns de prédios), comerciais (ex: lojas, bares, restaurantes), corporativos (ex: escritórios, sedes de empresas), industriais (mais raro). As principais despesas geralmente são com salários, espaço (ex: aluguel, energia, internet), softwares de arquitetura (geralmente pagos mensalmente ou anualmente), marketing (ex: branding, PR, instagram, ads), impostos, equipamentos (mais pontuais, como computador, mesa, celular, manutenções), entre outros menores. Agregue este contexto aos seus conhecimentos para identificar sinais de que uma entrada se trata de um contrato, uma receita ou uma despesa, o nome do arquivo, da planilha e as colunas podem fornecer dicas importantes.',

    // Detailed revenue sources for PDF/vision extraction
    revenueDescription: `Arquitetos ou escritórios de arquitetura no Brasil ganham dinheiro majoritariamente de:
• Projetos (geralmente pago em múltiplas parcelas por projeto)
• Comissão de RT (responsabilidade técnica) na intermediação de venda/contratação de móveis ou demais fornecedores pelos seus clientes (geralmente múltiplas entradas por projeto, pagas por diversos fornecedores)
• Acompanhamento de obra ou de projeto (geralmente também em parcelas)
• Percentual de gestão ou comissão sobre o orçamento da obra`,

    // Project types for PDF/vision extraction
    projectTypes: `Tipos de projetos comuns:
• Residenciais: apartamentos, áreas comuns de prédios
• Comerciais: lojas, bares, restaurantes
• Corporativos: escritórios, sedes de empresas
• Industriais (mais raro)`,

    // Common expenses for PDF/vision extraction
    expenseDescription: `Principais despesas:
• Salários
• Espaço: aluguel, energia, internet
• Softwares de arquitetura (mensais ou anuais)
• Marketing: branding, PR, instagram, ads
• Impostos
• Equipamentos: computador, mesa, celular, manutenções
• Outros custos operacionais`
  },

  // AI prompt configuration (original text)
  ai: {
    // Field mapping for consistency with other professions
    systemContextAddition: `
CONTEXTO DE ARQUITETURA:
- MAPEAMENTO DE CAMPOS DO DATABASE:
  • projectName = Nome do Projeto (o projeto/obra em si)
  • clientName = Nome do Cliente (quem contratou o projeto)
  • contractId = ID do projeto (quando vincular recebíveis/despesas)
`,

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
    },

    // API terminology for prompt injection (maps database terms to user terms)
    apiTerminology: {
      contract: 'projeto',      // "contract" in DB = "projeto" for users
      project: 'projeto'        // "project" in DB = "projeto" for users
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
