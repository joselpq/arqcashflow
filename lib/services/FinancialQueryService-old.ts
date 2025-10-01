/**
 * FinancialQueryService
 *
 * AI-powered financial query service using Claude for natural language understanding
 * Provides intelligent responses to financial questions with full business context
 *
 * Key Features:
 * - Natural language query understanding (Portuguese + English)
 * - Semantic mapping (projeto→contract, concluído→completed, etc.)
 * - Service layer integration (no raw SQL)
 * - Conversation context management
 * - Team isolation enforced
 * - Precise, concise responses
 */

import Anthropic from '@anthropic-ai/sdk'
import { ServiceContext } from './BaseService'
import { ContractService } from './ContractService'
import { ReceivableService } from './ReceivableService'
import { ExpenseService } from './ExpenseService'

export interface ConversationMessage {
  question: string
  answer: string
}

export interface QueryResult {
  question: string
  answer: string
  dataUsed?: any // Optional: data retrieved for transparency
  needsClarification?: boolean
  suggestedQuestions?: string[]
}

export class FinancialQueryService {
  private anthropic: Anthropic
  private context: ServiceContext
  private contractService: ContractService
  private receivableService: ReceivableService
  private expenseService: ExpenseService

  constructor(context: ServiceContext) {
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY not configured')
    }

    this.context = context
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    })

    this.contractService = new ContractService(context)
    this.receivableService = new ReceivableService(context)
    this.expenseService = new ExpenseService(context)
  }

  /**
   * Process a financial query using Claude
   */
  async query(question: string, conversationHistory?: ConversationMessage[]): Promise<QueryResult> {
    try {
      // Step 1: Understand the query intent using Claude
      const intent = await this.analyzeQueryIntent(question, conversationHistory)

      // Step 2: Fetch relevant data using service layer
      const rawData = await this.fetchRelevantData(intent)

      // Step 3: Calculate the answer (counts, sums, etc.) - don't send raw data to Claude
      const calculatedResults = this.calculateResults(intent, rawData)

      // Step 4: Generate natural language response with Claude using only the calculated results
      const answer = await this.generateResponse(question, intent, calculatedResults, conversationHistory)

      return {
        question,
        answer: answer.response,
        dataUsed: calculatedResults, // Return calculated results, not raw data
        needsClarification: answer.needsClarification,
        suggestedQuestions: answer.suggestedQuestions,
      }
    } catch (error) {
      console.error('FinancialQueryService error:', error)
      throw new Error('Failed to process query. Please try rephrasing your question.')
    }
  }

  /**
   * Analyze query intent and extract parameters
   */
  private async analyzeQueryIntent(
    question: string,
    conversationHistory?: ConversationMessage[]
  ): Promise<any> {
    const conversationContext = conversationHistory
      ? conversationHistory.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n\n')
      : ''

    const prompt = `You are a financial data query analyzer for a Brazilian architecture firm management system.

SEMANTIC MAPPINGS (CRITICAL):
Portuguese → English equivalents:
- projeto/projetos → contract/contracts
- cliente/clientes → client
- recebível/recebíveis, fatura/faturas, pagamento/pagamentos → receivable/receivables
- despesa/despesas, gasto/gastos, custo/custos, conta/contas → expense/expenses
- concluído/finalizado/terminado → completed
- ativo/em andamento → active
- cancelado → cancelled
- pago → paid
- recebido → received
- pendente/aguardando → pending
- atrasado/vencido → overdue

DATA STRUCTURE:
1. Contracts (contratos/projetos):
   - Contains: clientName, projectName, totalValue, status (active/completed/cancelled), signedDate
   - Represents project agreements with clients

2. Receivables (recebíveis/faturas):
   - Contains: amount, expectedDate, receivedDate, status (pending/received/overdue/cancelled)
   - Linked to contracts (contractId)
   - Represents expected/actual income

3. Expenses (despesas/gastos):
   - Contains: description, amount, dueDate, paidDate, status (pending/paid/overdue/cancelled)
   - May be linked to contracts (projectId) or standalone
   - Categories: materials, labor, equipment, transport, office, etc.

${conversationContext ? `\nPREVIOUS CONVERSATION:\n${conversationContext}\n` : ''}

CURRENT QUESTION: "${question}"

TASK: Analyze the question and extract:
1. entity_type: Which entities to query (contracts, receivables, expenses, or multiple)
2. filters: What filters to apply (status, date ranges, client name, etc.)
3. aggregation: What calculation/summary needed (count, sum, list, etc.)
4. time_context: Time period (this month, last quarter, specific date, etc.)
5. clarification_needed: true if question is too ambiguous

Respond in JSON format:
{
  "entity_type": ["contracts"|"receivables"|"expenses"],
  "filters": {
    "status": "...",
    "dateField": "...",
    "dateRange": {...},
    "clientName": "...",
    "projectName": "..."
  },
  "aggregation": "list"|"count"|"sum"|"average",
  "time_context": {...},
  "clarification_needed": boolean,
  "inferred_terms": {"original": "mapped"}
}

Be smart: infer intent even with imprecise language. Don't require clarification unless truly ambiguous.`

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse intent analysis')
    }

    return JSON.parse(jsonMatch[0])
  }

  /**
   * Fetch relevant data using service layer based on intent
   */
  private async fetchRelevantData(intent: any): Promise<any> {
    const data: any = {}

    // Fetch contracts if needed (limit to 100 most recent)
    if (intent.entity_type.includes('contracts')) {
      const filters: any = {}
      if (intent.filters.status) {
        filters.status = intent.filters.status
      }
      if (intent.filters.clientName) {
        filters.clientName = intent.filters.clientName
      }

      const contracts = await this.contractService.findMany(filters, { sortBy: 'createdAt', sortOrder: 'desc' })
      data.contracts = contracts.slice(0, 100) // Limit to 100 for token management
    }

    // Fetch receivables if needed (limit to 100 most recent)
    if (intent.entity_type.includes('receivables')) {
      const filters: any = {}
      if (intent.filters.status) {
        filters.status = intent.filters.status
      }

      const receivables = await this.receivableService.findMany(filters, { sortBy: 'createdAt', sortOrder: 'desc' })
      data.receivables = receivables.slice(0, 100) // Limit to 100 for token management
    }

    // Fetch expenses if needed (limit to 100 most recent)
    if (intent.entity_type.includes('expenses')) {
      const filters: any = {}
      if (intent.filters.status) {
        filters.status = intent.filters.status
      }
      if (intent.filters.category) {
        filters.category = intent.filters.category
      }

      const expenses = await this.expenseService.findMany(filters, { sortBy: 'createdAt', sortOrder: 'desc' })
      data.expenses = expenses.slice(0, 100) // Limit to 100 for token management
    }

    return data
  }

  /**
   * Create a concise data summary to avoid token limits
   */
  private createDataSummary(data: any): string {
    const summary: string[] = []

    if (data.contracts) {
      const contracts = data.contracts
      summary.push(`CONTRACTS (${contracts.length} total):`)

      // Group by status
      const byStatus: any = {}
      let totalValue = 0

      contracts.forEach((c: any) => {
        byStatus[c.status] = (byStatus[c.status] || 0) + 1
        totalValue += Number(c.totalValue || 0)
      })

      summary.push(`  Status: ${Object.entries(byStatus).map(([s, count]) => `${s}=${count}`).join(', ')}`)
      summary.push(`  Total Value: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)

      // Show first 10 as examples
      if (contracts.length > 0) {
        summary.push(`  Examples (first 10):`)
        contracts.slice(0, 10).forEach((c: any) => {
          summary.push(`    - ${c.clientName || 'N/A'} / ${c.projectName || 'N/A'}: R$ ${Number(c.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${c.status})`)
        })
      }
    }

    if (data.receivables) {
      const receivables = data.receivables
      summary.push(`\nRECEIVABLES (${receivables.length} total):`)

      // Group by status
      const byStatus: any = {}
      let totalAmount = 0

      receivables.forEach((r: any) => {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1
        totalAmount += Number(r.amount || 0)
      })

      summary.push(`  Status: ${Object.entries(byStatus).map(([s, count]) => `${s}=${count}`).join(', ')}`)
      summary.push(`  Total Amount: R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)

      // Show first 10 as examples
      if (receivables.length > 0) {
        summary.push(`  Examples (first 10):`)
        receivables.slice(0, 10).forEach((r: any) => {
          const date = r.expectedDate ? new Date(r.expectedDate).toLocaleDateString('pt-BR') : 'N/A'
          summary.push(`    - R$ ${Number(r.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} on ${date} (${r.status})`)
        })
      }
    }

    if (data.expenses) {
      const expenses = data.expenses
      summary.push(`\nEXPENSES (${expenses.length} total):`)

      // Group by status
      const byStatus: any = {}
      let totalAmount = 0

      expenses.forEach((e: any) => {
        byStatus[e.status] = (byStatus[e.status] || 0) + 1
        totalAmount += Number(e.amount || 0)
      })

      summary.push(`  Status: ${Object.entries(byStatus).map(([s, count]) => `${s}=${count}`).join(', ')}`)
      summary.push(`  Total Amount: R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)

      // Show first 10 as examples
      if (expenses.length > 0) {
        summary.push(`  Examples (first 10):`)
        expenses.slice(0, 10).forEach((e: any) => {
          summary.push(`    - ${e.description || 'N/A'}: R$ ${Number(e.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${e.status})`)
        })
      }
    }

    if (summary.length === 0) {
      return 'No data found for the requested query.'
    }

    return summary.join('\n')
  }

  /**
   * Generate intelligent response using Claude
   */
  private async generateResponse(
    question: string,
    intent: any,
    data: any,
    conversationHistory?: ConversationMessage[]
  ): Promise<{ response: string; needsClarification: boolean; suggestedQuestions?: string[] }> {
    const conversationContext = conversationHistory
      ? conversationHistory.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n\n')
      : ''

    // Create a concise summary instead of sending all raw data
    const dataSummary = this.createDataSummary(data)

    const prompt = `You are a financial assistant for a Brazilian architecture firm. Answer questions precisely and concisely in PORTUGUESE.

${conversationContext ? `CONVERSA ANTERIOR:\n${conversationContext}\n\n` : ''}

PERGUNTA ATUAL: "${question}"

INTENT ANALYSIS:
${JSON.stringify(intent, null, 2)}

DATA SUMMARY:
${dataSummary}

INSTRUCTIONS:
1. Answer EXACTLY what the user asked - be precise and concise
2. Format currency as R$ X.XXX,XX
3. Format dates as DD/MM/YYYY
4. Use bullet points for lists (if listing more than 2 items)
5. NEVER expose internal IDs (contractId, receivableId, etc.)
6. If data is empty and intent is clear, explain what's missing
7. If question is ambiguous despite analysis, ask ONE clarifying question
8. Keep responses short (2-3 sentences max, unless listing items)

RESPONSE RULES:
- If asking for count: Just give the number with context
- If asking for total: Give the sum with currency format
- If asking for list: List items with relevant details (client, value, date)
- If asking about status: Provide clear status summary

Respond in JSON format:
{
  "response": "Your Portuguese answer here",
  "needsClarification": boolean,
  "suggestedQuestions": ["Optional follow-up questions in Portuguese"]
}

Be intelligent: understand the context, infer meaning, don't over-explain.`

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse response')
    }

    return JSON.parse(jsonMatch[0])
  }
}
