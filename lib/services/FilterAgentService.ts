/**
 * FilterAgentService - Natural Language to Prisma Query
 *
 * AI-powered filtering service using Claude to generate Prisma query objects
 * from natural language input. Trust-the-LLM approach - no preprocessing.
 *
 * Flow:
 * 1. User provides natural language filter query
 * 2. Claude generates Prisma query object (where, orderBy)
 * 3. Frontend executes query directly with team isolation
 */

import Anthropic from '@anthropic-ai/sdk'
import { ServiceContext } from './BaseService'

export interface FilterContext {
  entity: 'receivable' | 'expense' | 'contract'
  teamId: string
}

export interface FilterResult {
  where: any           // Prisma where clause
  orderBy?: any        // Prisma orderBy clause
  interpretation: string  // Human-readable explanation
}

export class FilterAgentService {
  private anthropic: Anthropic
  private context: ServiceContext

  constructor(context: ServiceContext) {
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY not configured')
    }

    this.context = context
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    })
  }

  /**
   * Parse natural language filter into Prisma query object
   */
  async parseFilter(input: string, filterContext: FilterContext): Promise<FilterResult> {
    const systemPrompt = this.buildSystemPrompt(filterContext)

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.1, // Low temperature for consistency
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: input
        }
      ]
    })

    // Extract JSON from response
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    console.log('[FilterAgent] Raw Claude response:', content.text)

    try {
      const parsed = JSON.parse(content.text)
      console.log('[FilterAgent] Parsed successfully:', JSON.stringify(parsed, null, 2))
      return parsed as FilterResult
    } catch (error) {
      console.error('[FilterAgent] JSON parse failed!')
      console.error('[FilterAgent] Raw text was:', content.text)
      throw new Error(`Failed to parse Claude response as JSON: ${content.text}`)
    }
  }

  /**
   * Build system prompt with Prisma schema and examples
   */
  private buildSystemPrompt(filterContext: FilterContext): string {
    const schema = this.getPrismaSchema(filterContext.entity)
    const examples = this.getExamples(filterContext.entity)
    const statuses = this.getAvailableStatuses(filterContext.entity)

    return `You are a Prisma query generator for ArqCashflow financial data.

DATABASE SCHEMA:
${schema}

AVAILABLE STATUSES:
${statuses}

IMPORTANT RULES:
1. Return ONLY valid JSON with "where", "orderBy" (optional), and "interpretation" fields
2. Team isolation is handled by middleware - do NOT include teamId in queries
3. Use Prisma query syntax exactly (e.g., { gt: 10000 }, { contains: "text", mode: "insensitive" })
4. For date ranges, calculate ISO-8601 DateTime strings (e.g., "2024-09-08T00:00:00.000Z")
5. Use OR/AND/NOT for boolean logic as needed
6. Always provide a clear interpretation in Brazilian Portuguese

EXAMPLES:
${examples}

Now generate a Prisma query object for the following user input.`
  }

  /**
   * Get Prisma schema for specific entity
   */
  private getPrismaSchema(entity: string): string {
    switch (entity) {
      case 'receivable':
        return `model Receivable {
  id             String    @id @default(cuid())
  contractId     String?
  expectedDate   DateTime
  amount         Float
  status         String    @default("pending")     // "pending" | "received" | "overdue" | "cancelled"
  receivedDate   DateTime?
  receivedAmount Float?
  invoiceNumber  String?
  category       String?
  notes          String?
  clientName     String?
  description    String?
  teamId         String?

  // Relations
  contract       Contract? @relation(fields: [contractId], references: [id])
}

model Contract {
  id           String
  clientName   String
  projectName  String
  description  String?
  totalValue   Float
  status       String    // "active" | "completed" | "cancelled"
  category     String?
}`

      case 'expense':
        return `model Expense {
  id                 String    @id @default(cuid())
  contractId         String?
  description        String
  amount             Float
  dueDate            DateTime
  category           String
  status             String    @default("pending")    // "pending" | "paid" | "overdue" | "cancelled"
  paidDate           DateTime?
  paidAmount         Float?
  vendor             String?
  invoiceNumber      String?
  type               String?   // "operational" | "project" | "administrative"
  isRecurring        Boolean   @default(false)
  notes              String?
  recurringExpenseId String?
  generatedDate      DateTime?
  teamId             String?

  // Relations
  contract           Contract?  @relation(fields: [contractId], references: [id])
}

model Contract {
  id           String
  clientName   String
  projectName  String
  description  String?
  totalValue   Float
  status       String    // "active" | "completed" | "cancelled"
  category     String?
}`

      case 'contract':
        return `model Contract {
  id           String    @id @default(cuid())
  clientName   String
  projectName  String
  description  String?
  totalValue   Float
  signedDate   DateTime
  status       String    @default("active")    // "active" | "completed" | "cancelled"
  category     String?
  notes        String?
  createdAt    DateTime  @default(now())
  teamId       String
}`

      default:
        throw new Error(`Unknown entity type: ${entity}`)
    }
  }

  /**
   * Get example queries for specific entity
   */
  private getExamples(entity: string): string {
    const today = new Date().toISOString()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    switch (entity) {
      case 'receivable':
        return `
User: "atrasados acima de 10k"
Output: {
  "where": { "status": "overdue", "amount": { "gt": 10000 } },
  "orderBy": { "amount": "desc" },
  "interpretation": "Recebíveis atrasados acima de R$ 10.000, ordenados por valor (maior → menor)"
}

User: "recebíveis do João Silva nos últimos 30 dias"
Output: {
  "where": {
    "contract": {
      "OR": [
        { "projectName": { "contains": "João Silva", "mode": "insensitive" } },
        { "clientName": { "contains": "João Silva", "mode": "insensitive" } }
      ]
    },
    "expectedDate": { "gte": "${thirtyDaysAgo}" }
  },
  "orderBy": { "expectedDate": "asc" },
  "interpretation": "Recebíveis de projetos/clientes 'João Silva' dos últimos 30 dias, ordenados por data"
}

User: "recebidos este mês"
Output: {
  "where": {
    "status": "received",
    "receivedDate": {
      "gte": "${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()}",
      "lte": "${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()}"
    }
  },
  "orderBy": { "receivedDate": "desc" },
  "interpretation": "Recebíveis pagos este mês, ordenados por data de recebimento"
}`

      case 'expense':
        return `
User: "despesas recorrentes OU canceladas"
Output: {
  "where": {
    "OR": [
      { "recurringExpenseId": { "not": null } },
      { "status": "cancelled" }
    ]
  },
  "orderBy": { "dueDate": "desc" },
  "interpretation": "Despesas recorrentes ou canceladas, ordenadas por data de vencimento"
}

User: "últimos 7 dias acima de 5k"
Output: {
  "where": {
    "dueDate": { "gte": "${sevenDaysAgo}", "lte": "${today}" },
    "amount": { "gt": 5000 }
  },
  "orderBy": { "amount": "desc" },
  "interpretation": "Despesas dos últimos 7 dias acima de R$ 5.000, ordenadas por valor"
}

User: "despesas operacionais do fornecedor Silva"
Output: {
  "where": {
    "type": "operational",
    "vendor": { "contains": "Silva", "mode": "insensitive" }
  },
  "orderBy": { "dueDate": "asc" },
  "interpretation": "Despesas operacionais do fornecedor 'Silva', ordenadas por data de vencimento"
}`

      case 'contract':
        return `
User: "contratos ativos acima de 50k"
Output: {
  "where": {
    "status": "active",
    "totalValue": { "gt": 50000 }
  },
  "orderBy": { "totalValue": "desc" },
  "interpretation": "Contratos ativos com valor acima de R$ 50.000, ordenados por valor (maior → menor)"
}

User: "projetos finalizados este mês"
Output: {
  "where": {
    "status": "completed",
    "signedDate": {
      "gte": "${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()}",
      "lte": "${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()}"
    }
  },
  "orderBy": { "signedDate": "desc" },
  "interpretation": "Projetos concluídos este mês, ordenados por data de assinatura"
}

User: "clientes Silva"
Output: {
  "where": {
    "clientName": { "contains": "Silva", "mode": "insensitive" }
  },
  "orderBy": { "createdAt": "desc" },
  "interpretation": "Projetos do cliente 'Silva', ordenados por data de criação"
}`

      default:
        return ''
    }
  }

  /**
   * Get available statuses for specific entity
   */
  private getAvailableStatuses(entity: string): string {
    switch (entity) {
      case 'receivable':
        return '- "pending": Aguardando pagamento\n- "received": Pago/Recebido\n- "overdue": Atrasado\n- "cancelled": Cancelado'
      case 'expense':
        return '- "pending": Pendente\n- "paid": Pago\n- "overdue": Atrasado\n- "cancelled": Cancelado'
      case 'contract':
        return '- "active": Ativo\n- "completed": Finalizado\n- "cancelled": Cancelado'
      default:
        return ''
    }
  }
}
