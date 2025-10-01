/**
 * FinancialQueryService - Text-to-SQL Approach
 *
 * AI-powered financial query service using Claude for natural language to SQL
 * Mirrors the original LangChain approach but with Claude instead of OpenAI
 *
 * Flow:
 * 1. Claude generates SQL query from natural language
 * 2. Execute SQL query on database
 * 3. Claude formats results into natural language response
 */

import Anthropic from '@anthropic-ai/sdk'
import { ServiceContext } from './BaseService'

export interface ConversationMessage {
  question: string
  answer: string
}

export interface QueryResult {
  question: string
  answer: string
  sqlQuery?: string
  rawResult?: any
  needsClarification?: boolean
  suggestedQuestions?: string[]
}

export class FinancialQueryService {
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
   * Process a financial query using text-to-SQL approach
   */
  async query(question: string, conversationHistory?: ConversationMessage[]): Promise<QueryResult> {
    try {
      // Step 1: Generate SQL query from natural language
      const sqlQuery = await this.generateSQL(question, conversationHistory)

      // Step 2: Execute SQL query
      const rawResult = await this.executeSQL(sqlQuery)

      // Step 3: Format results into natural language
      const answer = await this.formatResponse(question, sqlQuery, rawResult, conversationHistory)

      return {
        question,
        answer,
        sqlQuery,
        rawResult,
      }
    } catch (error) {
      console.error('FinancialQueryService error:', error)
      throw new Error('Failed to process query. Please try rephrasing your question.')
    }
  }

  /**
   * Generate SQL query from natural language using Claude
   */
  private async generateSQL(question: string, conversationHistory?: ConversationMessage[]): Promise<string> {
    const teamId = this.context.teamId

    // Build conversation context
    let conversationContext = ''
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = `
Previous conversation context (for reference only, focus on the current question):
${conversationHistory.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n\n')}

Current question: ${question}
`
    } else {
      conversationContext = `Question: ${question}`
    }

    const schemaInfo = this.getDatabaseSchema(teamId)

    const prompt = `You are a PostgreSQL expert. Given the following database schema and question, write a PostgreSQL query to answer it.

${schemaInfo}

${conversationContext}

SEMANTIC MAPPINGS (CRITICAL):
Portuguese → English database equivalents:
- projeto/projetos → "Contract" table
- cliente/clientes → "clientName" column
- recebível/recebíveis, fatura/faturas, pagamento/pagamentos → "Receivable" table
- despesa/despesas, gasto/gastos, custo/custos, conta/contas → "Expense" table
- concluído/finalizado/terminado → status = 'completed'
- ativo/em andamento → status = 'active'
- cancelado → status = 'cancelled'
- pago → status = 'paid'
- recebido → status = 'received'
- pendente/aguardando → status = 'pending'
- atrasado/vencido → status = 'overdue'

IMPORTANT GUIDELINES FOR DATE AND STATUS QUERIES:

FOR RECEIVABLES (INCOME):
- Actual income received: use "receivedDate" and status = 'received'
- Expected/planned income: use "expectedDate"
- "Quanto recebi esse mês": WHERE DATE_TRUNC('month', "receivedDate") = DATE_TRUNC('month', CURRENT_DATE) AND status = 'received'

FOR EXPENSES (COSTS):
- Actual expenses paid: use "paidDate" and status = 'paid'
- Expected/planned expenses: use "dueDate"
- "Quanto gastei esse mês": WHERE DATE_TRUNC('month', "paidDate") = DATE_TRUNC('month', CURRENT_DATE) AND status = 'paid'

GENERAL RULES:
- Today's date: ${new Date().toISOString().split('T')[0]}
- For actual cashflow questions, always use the "actual" date fields (receivedDate/paidDate) with completed status
- For planning/budget questions, use expected date fields (expectedDate/dueDate)
- For "this month" queries: WHERE DATE_TRUNC('month', "dateField") = DATE_TRUNC('month', CURRENT_DATE)
- For specific dates: WHERE DATE("dateField") = '2025-09-15'
- For date ranges: WHERE "dateField" >= '2025-09-01' AND "dateField" < '2025-10-01'

Return ONLY the SQL query, no explanations. Use proper PostgreSQL syntax.
When joining tables, use proper JOIN syntax.
Use double quotes for column names and table names.
For dates, use PostgreSQL date functions like DATE(), DATE_TRUNC(), etc.
Consider the conversation context to understand pronouns and references.`

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

    // Extract SQL query (remove markdown code blocks if present)
    const sqlQuery = content.text.replace(/```sql\n?|\n?```/g, '').trim()

    return sqlQuery
  }

  /**
   * Execute SQL query safely using team-scoped prisma client
   */
  private async executeSQL(sqlQuery: string): Promise<any> {
    try {
      // Use raw prisma client for $queryRawUnsafe
      // Note: Team isolation is enforced by SQL query including teamId filter
      const result = await this.context.teamScopedPrisma.raw.$queryRawUnsafe(sqlQuery)

      // Convert BigInt to string for serialization
      const serializedResult = JSON.parse(JSON.stringify(result, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ))

      return serializedResult
    } catch (error) {
      console.error('SQL execution error:', error)
      throw new Error('Failed to execute database query')
    }
  }

  /**
   * Format query results into natural language response
   */
  private async formatResponse(
    question: string,
    sqlQuery: string,
    rawResult: any,
    conversationHistory?: ConversationMessage[]
  ): Promise<string> {
    const prompt = `Based on the following SQL query result, provide a clear and concise answer to the user's question IN PORTUGUESE.

User Question: ${question}
SQL Query: ${sqlQuery}
Query Result: ${JSON.stringify(rawResult)}

RESPOND ONLY IN PORTUGUESE. Provide a natural language response that directly answers the question.
If the result includes monetary values, format them as Brazilian currency (R$ X.XXX,XX).
If the result includes dates, format them in Brazilian format (DD/MM/YYYY).

CRITICAL SECURITY REQUIREMENT:
- NEVER include internal IDs (like contract IDs, receivable IDs, expense IDs) in your response
- These IDs are for internal use only and should not be exposed to users
- Focus only on business-relevant information: client names, project names, amounts, dates, statuses

IMPORTANT: If the result is empty or seems incorrect, provide a helpful follow-up question in Portuguese to clarify what they're looking for.

ALWAYS respond in Portuguese. Use Brazilian Portuguese conventions for numbers, dates, and currency.
Be concise and precise - answer EXACTLY what was asked, nothing more.`

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

    return content.text
  }

  /**
   * Get database schema information for SQL generation
   */
  private getDatabaseSchema(teamId: string): string {
    return `
Database Schema:

IMPORTANT: Current date context - Today is ${new Date().toISOString().split('T')[0]} (YYYY-MM-DD format).
This is a PostgreSQL database, use PostgreSQL syntax for all queries.

CRITICAL: ALL QUERIES MUST FILTER BY "teamId" = '${teamId}' to ensure data isolation!
Note: Use double quotes for column names in PostgreSQL.

"Contract" table:
- "id" (TEXT, PRIMARY KEY)
- "teamId" (TEXT, REQUIRED) - MUST FILTER BY THIS: "teamId" = '${teamId}'
- "clientName" (TEXT)
- "projectName" (TEXT)
- "description" (TEXT, nullable)
- "totalValue" (DECIMAL)
- "signedDate" (TIMESTAMP)
- "status" (TEXT, default: 'active') - values: active, completed, cancelled
- "category" (TEXT, nullable)
- "notes" (TEXT, nullable)
- "createdAt" (TIMESTAMP)
- "updatedAt" (TIMESTAMP)

"Receivable" table (income/payments expected):
- "id" (TEXT, PRIMARY KEY)
- "contractId" (TEXT, FOREIGN KEY to "Contract"."id", nullable)
- "teamId" (TEXT, REQUIRED) - MUST FILTER BY THIS: "teamId" = '${teamId}'
- "expectedDate" (TIMESTAMP)
- "amount" (DECIMAL)
- "status" (TEXT, default: 'pending') - values: pending, received, overdue, cancelled
- "receivedDate" (TIMESTAMP, nullable)
- "receivedAmount" (DECIMAL, nullable)
- "invoiceNumber" (TEXT, nullable)
- "category" (TEXT, nullable)
- "notes" (TEXT, nullable)
- "createdAt" (TIMESTAMP)
- "updatedAt" (TIMESTAMP)

"Expense" table (costs/expenses):
- "id" (TEXT, PRIMARY KEY)
- "teamId" (TEXT, REQUIRED) - MUST FILTER BY THIS: "teamId" = '${teamId}'
- "contractId" (TEXT, FOREIGN KEY to "Contract"."id", nullable)
- "description" (TEXT)
- "amount" (DECIMAL)
- "dueDate" (TIMESTAMP)
- "category" (TEXT) - common values: materials, labor, equipment, transport, office, software, utilities, rent, insurance, marketing, professional-services, other
- "status" (TEXT, default: 'pending') - values: pending, paid, overdue, cancelled
- "paidDate" (TIMESTAMP, nullable)
- "paidAmount" (DECIMAL, nullable)
- "vendor" (TEXT, nullable) - supplier/vendor name
- "invoiceNumber" (TEXT, nullable)
- "type" (TEXT, default: 'operational') - values: operational, project, administrative
- "isRecurring" (BOOLEAN, default: false)
- "notes" (TEXT, nullable)
- "receiptUrl" (TEXT, nullable)
- "createdAt" (TIMESTAMP)
- "updatedAt" (TIMESTAMP)
`
  }
}
