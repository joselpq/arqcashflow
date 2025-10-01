/**
 * Entity Schema Definitions for AI Command Agent
 *
 * Provides clear schema documentation for Claude to understand
 * entity structures, required vs optional fields, and validation rules.
 */

export const ENTITY_SCHEMAS = {
  contract: {
    description: 'A contract/project with a client. Represents work agreements and project scopes.',
    required: [
      'clientName (string) - Name of the client/company',
      'projectName (string) - Name of the project',
      'totalValue (number) - Total contract value in BRL (R$)',
      'signedDate (ISO date string YYYY-MM-DD) - When contract was signed',
    ],
    optional: [
      'description (string) - Detailed project description',
      'status (string) - Contract status: "active" (default), "completed", "cancelled"',
      'category (string) - Project category/type',
      'notes (string) - Additional notes',
    ],
    examples: [
      'Create contract for ACME Corp, office renovation project, R$120,000, signed yesterday',
      'New project: Casa Moderna for João Silva, R$85k, signed 15/03/2025',
    ]
  },

  receivable: {
    description: 'Money expected to be received from clients. Can be linked to a contract or standalone.',
    required: [
      'amount (number) - Amount to receive in BRL (R$)',
      'expectedDate (ISO date string YYYY-MM-DD) - When payment is expected',
    ],
    optional: [
      'contractId (string) - Link to related contract (if applicable)',
      'clientName (string) - Client name (required if no contractId)',
      'description (string) - What this payment is for (e.g., "RT", "Milestone 1", "Final Payment")',
      'status (string) - Payment status: "pending" (default), "received", "overdue"',
      'category (string) - Revenue category',
      'invoiceNumber (string) - Invoice/NF number',
      'notes (string) - Additional notes',
    ],
    inference_hints: [
      'RT/RRT typically means "Responsabilidade Técnica" (technical responsibility fee)',
      'If user mentions a project name, try to find matching contractId',
      'Categories: "professional-fees", "milestone-payment", "technical-responsibility", "final-payment", "advance-payment"',
    ],
    examples: [
      'R$400 de RT do projeto Mari para receber amanhã',
      'Expecting R$50,000 milestone payment from ACME project next week',
      'R$1,200 invoice #123 from Beta Design, due 30/06',
    ]
  },

  expense: {
    description: 'Business expenses and costs. Can be linked to a project or operational.',
    required: [
      'description (string) - What was purchased/paid for',
      'amount (number) - Expense amount in BRL (R$)',
      'dueDate (ISO date string YYYY-MM-DD) - When payment is due or was made',
      'category (string) - Expense category (see categories below)',
    ],
    optional: [
      'contractId (string) - Link to project if project-related',
      'status (string) - Payment status: "pending" (default), "paid", "overdue"',
      'vendor (string) - Who you paid/will pay',
      'type (string) - "operational" (default), "project", "administrative"',
      'invoiceNumber (string) - Invoice/receipt number',
      'notes (string) - Additional notes',
      'paidDate (ISO date string) - When actually paid (if status is "paid")',
      'paidAmount (number) - Actual amount paid (if different from original)',
    ],
    categories: [
      'transport - Gas, Uber, taxi, public transit, tolls, parking',
      'meals - Lunch, dinner, coffee, restaurant, food',
      'office - Stationery, paper, printer, toner, office supplies',
      'software - SaaS, licenses, apps, cloud services, hosting',
      'utilities - Electricity, water, internet, phone',
      'rent - Office/space rental',
      'marketing - Ads, Google Ads, Facebook, Instagram, publicity',
      'professional-services - Accountant, lawyer, consulting',
      'materials - Construction materials, cement, paint, wood',
      'labor - Workers, painters, electricians, plumbers',
      'equipment - Tools, machinery, equipment rental',
      'other - Anything else',
    ],
    inference_hints: [
      'Infer category from description keywords (gasolina→transport, almoço→meals, etc.)',
      'If date is "ontem"/"yesterday", calculate from today',
      'If date is "hoje"/"today", use today',
      'If date is "amanhã"/"tomorrow", calculate from today',
      'Status defaults to "pending" unless user says "paguei"/"paid"',
    ],
    examples: [
      'R$50 em gasolina ontem',
      'Paid R$1,200 for office rent yesterday',
      'R$350 lunch with client today, project ACME',
    ]
  },

  recurring_expense: {
    description: 'Recurring/subscription expenses that repeat on a schedule.',
    required: [
      'description (string) - What this recurring expense is for',
      'amount (number) - Recurring amount in BRL (R$)',
      'frequency (string) - How often: "weekly", "monthly", "quarterly", "annual"',
      'startDate (ISO date string YYYY-MM-DD) - When recurrence starts',
    ],
    optional: [
      'category (string) - Same categories as regular expenses',
      'vendor (string) - Service provider',
      'contractId (string) - Link to project if applicable',
      'dayOfMonth (number 1-31) - Specific day for monthly/quarterly/annual',
      'endDate (ISO date string) - When recurrence ends (if known)',
      'interval (number) - Recurrence interval: 1=every period, 2=every other period (default: 1)',
      'type (string) - "operational" (default), "project", "administrative"',
      'notes (string) - Additional notes',
    ],
    inference_hints: [
      'Monthly expenses often mentioned with day: "todo dia 10" = dayOfMonth: 10',
      'Subscriptions/assinaturas are typically monthly unless specified',
      'If user says "mensalidade", frequency is "monthly"',
    ],
    examples: [
      'Netflix subscription R$45 monthly starting today',
      'Office rent R$1,200 every month on day 5',
      'Quarterly software license R$600 starting next month',
    ]
  },
}

export function getEntitySchema(entityType: string): string {
  const schema = ENTITY_SCHEMAS[entityType as keyof typeof ENTITY_SCHEMAS]
  if (!schema) return ''

  let output = `\n## ${entityType.toUpperCase()} SCHEMA\n\n`
  output += `Description: ${schema.description}\n\n`

  output += `REQUIRED FIELDS:\n`
  schema.required.forEach(field => output += `  - ${field}\n`)

  if (schema.optional && schema.optional.length > 0) {
    output += `\nOPTIONAL FIELDS:\n`
    schema.optional.forEach(field => output += `  - ${field}\n`)
  }

  if ('categories' in schema && schema.categories) {
    output += `\nVALID CATEGORIES:\n`
    schema.categories.forEach(cat => output += `  - ${cat}\n`)
  }

  if ('inference_hints' in schema && schema.inference_hints) {
    output += `\nINFERENCE HINTS:\n`
    schema.inference_hints.forEach(hint => output += `  - ${hint}\n`)
  }

  if (schema.examples && schema.examples.length > 0) {
    output += `\nEXAMPLES:\n`
    schema.examples.forEach(ex => output += `  - "${ex}"\n`)
  }

  return output
}

export function getAllSchemasOverview(): string {
  return `
# AVAILABLE ENTITY TYPES

ArqCashflow manages 4 entity types:

1. **contract** - Projects/contracts with clients
2. **receivable** - Money expected from clients
3. **expense** - Business costs and expenses
4. **recurring_expense** - Subscriptions and recurring costs

Users work in Brazilian Portuguese primarily, but understand English too.
All currency amounts are in Brazilian Reais (R$).
Dates should be parsed flexibly: DD/MM/YYYY, DD/MM, "ontem", "hoje", "amanhã", etc.
`
}
