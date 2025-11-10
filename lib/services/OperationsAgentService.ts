/**
 * Operations Agent Service - Vercel AI SDK Implementation
 *
 * Migration History:
 * - Step 1-6: Incremental build with Anthropic SDK (ADR-012)
 * - Step 7 v1.0: Manual agentic loop (ADR-013 v1.0) - Discovered conversation state bug
 * - Step 7 v2.0: Vercel AI SDK migration (ADR-013 v2.0) ✅ CURRENT
 *
 * Key Benefits:
 * - Automatic conversation state management (no more lost context!)
 * - Built-in agentic loop (maxSteps replaces manual while-loop)
 * - Zero state management bugs (framework handles tool_use/tool_result)
 * - 65% code reduction (850 → 290 lines)
 * - Type-safe tool definitions with Zod
 *
 * Framework: Vercel AI SDK v5
 * Model: Claude Sonnet 4 (anthropic)
 *
 * Backup: OperationsAgentService-oldv2.ts (manual while-loop version)
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, streamText, tool, stepCountIs, type CoreMessage } from 'ai'
import { z } from 'zod'
import type { ServiceContext } from './BaseService'
import { ExpenseService } from './ExpenseService'
import { ContractService } from './ContractService'
import { ReceivableService } from './ReceivableService'
import { RecurringExpenseService } from './RecurringExpenseService'
import { getProfessionConfig } from '@/lib/professions'

export class OperationsAgentService {
  private expenseService: ExpenseService
  private contractService: ContractService
  private receivableService: ReceivableService
  private recurringExpenseService: RecurringExpenseService
  private anthropic: ReturnType<typeof createAnthropic>

  constructor(private context: ServiceContext) {
    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) throw new Error('CLAUDE_API_KEY not configured')

    // Initialize Anthropic provider with API key
    this.anthropic = createAnthropic({ apiKey })

    this.expenseService = new ExpenseService(context)
    this.contractService = new ContractService(context)
    this.receivableService = new ReceivableService(context)
    this.recurringExpenseService = new RecurringExpenseService(context)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MAIN ENTRY POINT - Vercel AI SDK Agentic Pattern
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async processCommand(
    message: string,
    history: CoreMessage[] = []
  ) {
    const today = new Date().toISOString().split('T')[0]
    const systemPrompt = await this.buildSystemPrompt(today)

    console.log('[Operations] Starting Vercel AI SDK agentic loop')
    console.log('[Operations] Received history items:', history.length)

    // ✅ Vercel AI SDK handles the entire agentic loop automatically!
    // Note: For prompt caching, we add system message to messages array (not system parameter)
    const result = await generateText({
      model: this.anthropic('claude-sonnet-4-20250514'),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } } // ✅ 90% cost reduction for cached tokens
          }
        },
        ...history, // Previous conversation WITH all tool_use/tool_result blocks
        { role: 'user', content: message }
      ],
      tools: {
        query_database: tool({
          description: 'Execute SELECT query on PostgreSQL database to retrieve financial data',
          inputSchema: z.object({
            sql: z.string().describe('PostgreSQL SELECT query with proper column quoting. Must filter by teamId.')
          }),
          execute: async ({ sql }) => {
            console.log('[Operations] Tool: query_database')
            console.log('[Operations] SQL:', sql)
            const results = await this.executeQuery(sql)
            console.log('[Operations] Query returned', results.length, 'rows')
            if (results.length > 0) {
              const ids = results.map(r => r.id).filter(Boolean)
              if (ids.length > 0) {
                console.log('[Operations] IDs returned:', ids)
              }
            }
            return results
          }
        }),
        call_service: tool({
          description: 'Execute CRUD operations on financial entities (contracts, receivables, expenses)',
          inputSchema: z.object({
            service: z.enum(['ExpenseService', 'ContractService', 'ReceivableService', 'RecurringExpenseService'])
              .describe('Service to call'),
            method: z.enum(['create', 'update', 'delete', 'bulkCreate', 'bulkUpdate', 'bulkDelete'])
              .describe('Method to execute'),
            params: z.any().describe('Operation parameters (entity data, IDs, etc.)')
          }),
          execute: async ({ service, method, params }) => {
            console.log(`[Operations] Tool: call_service`)
            console.log(`[Operations] ${service}.${method}`)
            const result = await this.executeServiceCall(service, method, params)
            console.log(`[Operations] ${service}.${method} completed`)
            return result
          }
        })
      },
      // ✅ CRITICAL FIX: Use stepCountIs() helper to enable multi-step tool calling
      // Default is stepCountIs(1) which stops after first tool call
      // Setting to 15 allows Claude to call tools up to 15 times before forcing a stop
      stopWhen: stepCountIs(15),
      onStepFinish: (stepResult) => {
        // Log each step for debugging
        console.log('[Operations] Step finished:', {
          finishReason: stepResult.finishReason,
          usage: stepResult.usage,
          toolCalls: stepResult.toolCalls?.length || 0,
          hasText: !!stepResult.text
        })
      }
    })

    console.log('[Operations] Agentic loop complete')
    console.log('[Operations] Finish reason:', result.finishReason)
    console.log('[Operations] Steps taken:', result.steps?.length || 0)
    console.log('[Operations] Total tokens:', result.usage.totalTokens)
    console.log('[Operations] Response messages count:', result.response.messages?.length || 0)
    console.log('[Operations] Final text:', result.text?.substring(0, 100))

    // ✅ result.messages contains EVERYTHING: user, assistant, tool_use, tool_result
    // This is the complete conversation state - just save it!
    const fullHistory: CoreMessage[] = [
      ...history,
      { role: 'user', content: message },
      ...result.response.messages // All assistant messages including tool interactions
    ]
    console.log('[Operations] Full history length:', fullHistory.length)

    // Filter for display (only show user-facing messages)
    const displayHistory = this.filterDisplayMessages(fullHistory)

    return {
      success: true,
      message: result.text,
      conversationHistory: fullHistory, // ✅ Complete conversation with all tool context
      displayHistory: displayHistory    // User-facing messages only
    }
  }

  /**
   * Process command with STREAMING (Phase 2 - ADR-020)
   * Returns a streamable result for real-time token-by-token response
   */
  async processCommandStream(
    message: string,
    history: CoreMessage[] = []
  ) {
    const today = new Date().toISOString().split('T')[0]
    const systemPrompt = await this.buildSystemPrompt(today)

    console.log('[Operations] Starting STREAMING agentic loop')
    console.log('[Operations] Received history items:', history.length)

    // ✅ Use streamText() for real-time streaming responses
    // Note: For prompt caching, we add system message to messages array (not system parameter)
    const result = streamText({
      model: this.anthropic('claude-sonnet-4-20250514'),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } } // ✅ 90% cost reduction for cached tokens
          }
        },
        ...history, // Previous conversation WITH all tool_use/tool_result blocks
        { role: 'user', content: message }
      ],
      tools: {
        query_database: tool({
          description: 'Execute SELECT query on PostgreSQL database to retrieve financial data',
          inputSchema: z.object({
            sql: z.string().describe('PostgreSQL SELECT query with proper column quoting. Must filter by teamId.')
          }),
          execute: async ({ sql }) => {
            console.log('[Operations] Tool: query_database')
            console.log('[Operations] SQL:', sql)
            const results = await this.executeQuery(sql)
            console.log('[Operations] Query returned', results.length, 'rows')
            if (results.length > 0) {
              const ids = results.map(r => r.id).filter(Boolean)
              if (ids.length > 0) {
                console.log('[Operations] IDs returned:', ids)
              }
            }
            return results
          }
        }),
        call_service: tool({
          description: 'Execute CRUD operations on financial entities (contracts, receivables, expenses)',
          inputSchema: z.object({
            service: z.enum(['ExpenseService', 'ContractService', 'ReceivableService', 'RecurringExpenseService'])
              .describe('Service to call'),
            method: z.enum(['create', 'update', 'delete', 'bulkCreate', 'bulkUpdate', 'bulkDelete'])
              .describe('Method to execute'),
            params: z.any().describe('Operation parameters (entity data, IDs, etc.)')
          }),
          execute: async ({ service, method, params }) => {
            console.log(`[Operations] Tool: call_service`)
            console.log(`[Operations] ${service}.${method}`)
            const result = await this.executeServiceCall(service, method, params)
            console.log(`[Operations] ${service}.${method} completed`)
            return result
          }
        })
      },
      stopWhen: stepCountIs(15), // Allow multi-step tool calling
      onStepFinish: (stepResult) => {
        console.log('[Operations] Streaming step finished:', {
          finishReason: stepResult.finishReason,
          usage: stepResult.usage,
          toolCalls: stepResult.toolCalls?.length || 0,
          hasText: !!stepResult.text
        })
      }
    })

    return result
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SERVICE CALL EXECUTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Execute a service call (for tool use).
   * Kept from previous implementation - same logic.
   */
  private async executeServiceCall(
    service: string,
    method: string,
    params: any
  ): Promise<any> {
    const serviceMap: Record<string, any> = {
      ExpenseService: this.expenseService,
      ContractService: this.contractService,
      ReceivableService: this.receivableService,
      RecurringExpenseService: this.recurringExpenseService
    }

    const serviceInstance = serviceMap[service]
    if (!serviceInstance) {
      throw new Error(`Service ${service} not found`)
    }

    if (typeof serviceInstance[method] !== 'function') {
      throw new Error(`Method ${method} not found in ${service}`)
    }

    return await this.callServiceMethod(serviceInstance, method, params)
  }

  /**
   * Call a service method with proper parameter handling.
   * Kept from previous implementation - same logic.
   */
  private async callServiceMethod(
    serviceInstance: any,
    method: string,
    params: any
  ): Promise<any> {
    if (method === 'create') {
      return await serviceInstance[method](params)

    } else if (method === 'bulkCreate') {
      const items = Array.isArray(params) ? params : params.items
      if (!items || !Array.isArray(items)) {
        throw new Error('bulkCreate requires an array of items')
      }
      const result = await serviceInstance[method](items)
      console.log(`[Operations] Bulk create: ${result.successCount} succeeded, ${result.failureCount} failed`)
      return result

    } else if (method === 'bulkUpdate') {
      const updates = Array.isArray(params) ? params : params.updates
      if (!updates || !Array.isArray(updates)) {
        throw new Error('bulkUpdate requires an array of updates')
      }
      const result = await serviceInstance[method](updates)
      console.log(`[Operations] Bulk update: ${result.successCount} succeeded, ${result.failureCount} failed`)
      return result

    } else if (method === 'bulkDelete') {
      const ids = Array.isArray(params) ? params : params.ids
      if (!ids || !Array.isArray(ids)) {
        throw new Error('bulkDelete requires an array of ids')
      }
      // ✅ Default continueOnError for resilience (Issue #2 fix)
      const options = params.options || { continueOnError: true }
      const result = await serviceInstance[method](ids, options)
      console.log(`[Operations] Bulk delete: ${result.successCount} succeeded, ${result.failureCount} failed`)
      return result

    } else if (method === 'update') {
      const updateId = params.id
      const updateData = params.data || (() => {
        const { id, ...rest } = params
        return rest
      })()
      return await serviceInstance[method](updateId, updateData)

    } else if (method === 'delete') {
      return await serviceInstance[method](params.id, params.options)

    } else {
      return await serviceInstance[method](params)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUERY EXECUTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Execute a database query.
   * Kept from previous implementation - same logic.
   */
  private async executeQuery(sql: string): Promise<any[]> {
    try {
      const normalizedSql = sql.trim().toLowerCase()
      if (!normalizedSql.startsWith('select')) {
        throw new Error('Only SELECT queries allowed')
      }
      if (!sql.includes(this.context.teamId)) {
        throw new Error('Query must filter by teamId')
      }

      const result = await this.context.teamScopedPrisma.raw.$queryRawUnsafe(sql)
      const arrayResult = Array.isArray(result) ? result : []

      // Convert BigInt to Number for JSON serialization
      return arrayResult.map(row => {
        const converted: any = {}
        for (const [key, value] of Object.entries(row)) {
          converted[key] = typeof value === 'bigint' ? Number(value) : value
        }
        return converted
      })
    } catch (error) {
      console.error('[Operations] Query error:', error)
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HELPER FUNCTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Filter messages for display (remove tool-related content).
   * Updated to work with CoreMessage format from Vercel AI SDK.
   */
  private filterDisplayMessages(history: CoreMessage[]): Array<{ role: string; content: string }> {
    return history
      .filter(msg => {
        // Only show user and assistant messages (not tool messages)
        if (msg.role === 'user' || msg.role === 'assistant') {
          // Filter out assistant messages that are just tool calls
          if (msg.role === 'assistant') {
            const content = this.extractTextFromMessage(msg)
            // Skip if empty or only internal markers
            if (!content || content.startsWith('[QUERY_RESULTS]') || content.startsWith('[INTERNAL]')) {
              return false
            }
          }
          return true
        }
        return false
      })
      .map(msg => ({
        role: msg.role,
        content: this.extractTextFromMessage(msg)
      }))
  }

  /**
   * Extract text content from a CoreMessage.
   * Handles both string and complex content formats.
   */
  private extractTextFromMessage(msg: CoreMessage): string {
    if (typeof msg.content === 'string') {
      return msg.content
    }

    // CoreMessage content can be an array of content parts
    if (Array.isArray(msg.content)) {
      return msg.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('\n')
    }

    return ''
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SYSTEM PROMPT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Build comprehensive system prompt.
   * Phase 1: Now profession-aware using config system
   * For architecture profession, produces IDENTICAL output to original
   */
  private async buildSystemPrompt(today: string): Promise<string> {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const teamId = this.context.teamId

    // Get team profession for prompt customization
    const team = await this.context.teamScopedPrisma.raw.team.findUnique({
      where: { id: teamId },
      select: { profession: true }
    })

    // Get profession configuration
    const professionConfig = getProfessionConfig(team?.profession)
    const ai = professionConfig.ai
    const apiTerm = ai.apiTerminology || { contract: 'projeto', project: 'projeto' }

    return `Você é Arnaldo, o assistente financeiro com acesso ao database e APIs do sistema.

Seu objetivo é ajudar o usuário a gerenciar suas finanças de forma amigável, objetiva e precisa.

CONTEXTO ATUAL:
- Data de hoje: ${today}
- Team ID: ${teamId}
- Moeda: Real brasileiro (R$)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CAPACIDADES:

Você pode atender dois tipos de solicitação:

1. CONSULTAS: Responder perguntas sobre o negócio do usuário
   - "Quanto gastei em setembro?"
   - ${ai.queryExamples.contracts}
   - "Qual o total a receber este mês?"

2. OPERAÇÕES: Criar, editar ou deletar registros financeiros
   - Contratos (${ai.entityDescriptions.contracts})
   - Recebíveis (${ai.entityDescriptions.receivables})
   - Despesas (${ai.entityDescriptions.expenses})
${ai.systemContextAddition}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FERRAMENTAS DISPONÍVEIS:

Você tem acesso a duas ferramentas:

1. query_database - Para consultar dados financeiros no database PostgreSQL
   - Use para responder perguntas sobre contract/${apiTerm.contract}, recebíveis, despesas
   - SEMPRE inclua 'id' no SELECT (para operações futuras)
   - SEMPRE filtre por teamId

2. call_service - Para criar, atualizar ou deletar registros
   - Use para operações de CRUD em entidades financeiras
   - Suporta operações em lote (bulkCreate, bulkUpdate, bulkDelete)

COMO USAR AS FERRAMENTAS:

Use as ferramentas naturalmente para completar as solicitações do usuário:

**query_database**: Para buscar informações
- Sempre inclua 'id' nos SELECTs (útil para operações futuras)
- Sempre filtre por teamId
- Formate os resultados de forma amigável - nunca mostre IDs ou SQL ao usuário

**call_service**: Para criar, atualizar ou deletar
- Use os IDs que você obteve de queries anteriores
- Mostre prévia antes de executar
- Confirme com o usuário antes de operações destrutivas

APRESENTAÇÃO DE DADOS:

Identifique entidades por informações descritivas, NÃO por IDs técnicos:
- ❌ "Encontrei a despesa clx8dy4pz0001..."
- ✅ "Encontrei a despesa de R$45,00 do Netflix em 15/09"

Use: descrição, valor, data, status, nome do cliente/${apiTerm.project} - informações que o usuário reconheça.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATABASE SCHEMA (PostgreSQL):

Contract/${apiTerm.contract} (entidade plural: ${apiTerm.contract}s):
- id: TEXT (primary key)
- clientName: TEXT (REQUIRED)
- projectName: TEXT (REQUIRED)
- totalValue: DECIMAL (${ai.schemaRequirements.contract.totalValue})
- signedDate: TIMESTAMP (${ai.schemaRequirements.contract.signedDate})
- status: TEXT (active, completed, cancelled)
- description, category, notes: TEXT
- teamId: TEXT (always '${teamId}')

Receivable (Recebíveis):
- id: TEXT (primary key)
- contractId: TEXT (optional - link to contract)
- expectedDate: TIMESTAMP (REQUIRED)
- amount: DECIMAL (REQUIRED)
- status: TEXT (pending, received, overdue)
- receivedDate, receivedAmount: optional
- clientName, description: TEXT (for standalone receivables)
- teamId: TEXT (always '${teamId}')

Expense (Despesas):
- id: TEXT (primary key)
- description: TEXT (REQUIRED)
- amount: DECIMAL (REQUIRED)
- dueDate: TIMESTAMP (REQUIRED)
- category: TEXT (REQUIRED - Alimentação, Transporte, Materiais, Serviços, Escritório, Marketing, Impostos, Salários, Outros)
- status: TEXT (pending, paid, overdue, cancelled)
- contractId, vendor, invoiceNumber: optional
- teamId: TEXT (always '${teamId}')

RecurringExpense (Despesas Recorrentes):
- id: TEXT (primary key)
- description, amount, category: REQUIRED
- frequency: TEXT (weekly, monthly, quarterly, annual)
- interval: INTEGER (1=every, 2=every 2nd, etc.)
- startDate: TIMESTAMP (REQUIRED)
- endDate: TIMESTAMP (optional)
- nextDue: TIMESTAMP (calculated)
- dayOfMonth: INTEGER (for monthly)
- isActive: BOOLEAN
- teamId: TEXT (always '${teamId}')
- IMPORTANT: NO "dueDate" field! Use "nextDue" or "startDate"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APIS DISPONÍVEIS:

╔═══════════════════════════════════════════════════════════════╗
║ ExpenseService                                                 ║
╠═══════════════════════════════════════════════════════════════╣
║ create(data)                                                   ║
║   OBRIGATÓRIO: description, amount, dueDate, category         ║
║   OPCIONAL: contractId, vendor, invoiceNumber, type, notes,   ║
║             status, paidDate, paidAmount                       ║
║   Padrões: status = null (a não ser que seja explicitamente definido)║
║                                                                ║
║ bulkCreate(items)                                             ║
║   items = [{description: "...", amount: 50, ...}, ...]        ║
║   Para criar múltiplas entidades de uma vez                   ║
║                                                                ║
║ update(id, data)                                              ║
║   Todos os campos são opcionais (atualiza apenas os enviados) ║
║                                                                ║
║ bulkUpdate(updates)                                           ║
║   updates = [{id: "...", data: {amount: 15}}, ...]            ║
║   Para atualizar múltiplas entidades de uma vez               ║
║                                                                ║
║ delete(id)                                                     ║
║   OBRIGATÓRIO: id                                             ║
║                                                                ║
║ bulkDelete(ids)                                               ║
║   ids = ["id1", "id2", "id3", ...]                            ║
║   Para deletar múltiplas entidades de uma vez                 ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║ ContractService                                                ║
╠═══════════════════════════════════════════════════════════════╣
║ create(data)                                                   ║
║   OBRIGATÓRIO: ${ai.serviceRequirements.contract.required}    ║
║   OPCIONAL: ${ai.serviceRequirements.contract.optional}       ║
║   Padrões: status = "active"                                  ║
║                                                                ║
║ bulkCreate(items)                                             ║
║   items = [{clientName: "...", projectName: "...", ...}, ...]║
║                                                                ║
║ update(id, data)                                              ║
║   Todos os campos são opcionais (atualiza apenas os enviados) ║
║                                                                ║
║ bulkUpdate(updates)                                           ║
║   updates = [{id: "...", data: {totalValue: 20000}}, ...]    ║
║                                                                ║
║ delete(id, options?)                                          ║
║   options = {mode: "contract-only" | "contract-and-receivables"}║
║   "contract-only" (padrão): Desvincula recebíveis do contract/${apiTerm.contract}║
║   "contract-and-receivables": Deleta contract/${apiTerm.contract} E recebíveis   ║
║   IMPORTANTE: Sempre pergunte ao usuário qual modo usar!     ║
║                                                                ║
║ bulkDelete(ids, options?)                                     ║
║   ids = ["id1", "id2", ...]                                   ║
║   options: mesmo comportamento do delete individual          ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║ ReceivableService                                              ║
╠═══════════════════════════════════════════════════════════════╣
║ create(data)                                                   ║
║   OBRIGATÓRIO: expectedDate, amount                           ║
║   OPCIONAL (vinculado a contrato/paciente):                            ║
║     - contractId (use o id do contrato)                       ║
║   OPCIONAL (standalone):                                       ║
║     - clientName, description                                 ║
║   OUTROS OPCIONAIS: status, receivedDate, receivedAmount,     ║
║                     invoiceNumber, category, notes            ║
║   Padrões: status = null (a não ser que seja explicitamente definido)║
║                                                                ║
║ bulkCreate(items)                                             ║
║   items = [{expectedDate: "...", amount: 1000, ...}, ...]    ║
║   Dica: Para vincular ao mesmo project/${apiTerm.project}, use o mesmo contractId║
║                                                                ║
║ update(id, data)                                              ║
║   Todos os campos são opcionais (atualiza apenas os enviados) ║
║                                                                ║
║ bulkUpdate(updates)                                           ║
║   updates = [{id: "...", data: {status: "received"}}, ...]   ║
║                                                                ║
║ delete(id)                                                     ║
║   OBRIGATÓRIO: id                                             ║
║                                                                ║
║ bulkDelete(ids)                                               ║
║   ids = ["id1", "id2", "id3", ...]                            ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║ RecurringExpenseService                                        ║
╠═══════════════════════════════════════════════════════════════╣
║ create(data)                                                   ║
║   OBRIGATÓRIO: description, amount, category, frequency,      ║
║                interval, startDate                            ║
║   OPCIONAL: endDate, dayOfMonth (para frequency="monthly"),  ║
║             vendor, notes, isActive                           ║
║   Padrões: interval = 1, isActive = true                      ║
║   Frequency: "weekly", "monthly", "quarterly", "annual"       ║
║   ATENÇÃO: NÃO tem campo "dueDate"! Use "startDate"          ║
║                                                                ║
║ bulkCreate(items)                                             ║
║   items = [{description: "...", frequency: "monthly", ...}]  ║
║                                                                ║
║ update(id, data)                                              ║
║   Todos os campos são opcionais (atualiza apenas os enviados) ║
║                                                                ║
║ bulkUpdate(updates)                                           ║
║   updates = [{id: "...", data: {amount: 150}}, ...]          ║
║                                                                ║
║ delete(id)                                                     ║
║   OBRIGATÓRIO: id                                             ║
║                                                                ║
║ bulkDelete(ids)                                               ║
║   ids = ["id1", "id2", "id3", ...]                            ║
╚═══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGRAS IMPORTANTES:

1. TEAM ISOLATION: SEMPRE filtre queries por teamId = '${teamId}'
   Example: WHERE "teamId" = '${teamId}'

2. POSTGRESQL CASE SENSITIVITY: SEMPRE use aspas duplas
   ✅ CORRECT: SELECT "id", "description", "dueDate" FROM "Expense"
   ❌ WRONG: SELECT id, description, dueDate FROM Expense

3. INFERÊNCIA: Para campos obrigatórios, você pode inferir valores óbvios:
   • Datas: "ontem" = ${yesterday}, "hoje" = ${today}
   • Data ausente: Se não especificada, use HOJE = ${today}
     Exemplos: "novo contract/${apiTerm.contract} 35000, João" → signedDate = ${today}
               "R$50 almoço" → dueDate = ${today}
   • Categorias: "gasolina" → Transporte, "almoço" → Alimentação
   • Valores: "cinquenta reais" → 50.00
   • Contratos: Se projectName não especificado, use clientName como projectName
     Exemplo: "contract/${apiTerm.contract} 5000, Mari" → clientName="Mari", projectName="Mari"
   • Despesas Recorrentes: interval padrão = 1 (a cada 1 vez)
     Exemplos: "mensal" → interval=1, "a cada 2 meses" → interval=2
               Se não especificado, sempre use interval=1

4. AMBIGUITY: Se a solicitação for ambígua ou faltar informação crucial,
   faça perguntas de acompanhamento antes de executar.

   Exemplos de quando perguntar:
   • "Atualiza a despesa" → Qual despesa? (precisa query_database)
   • "Cria um contract/${apiTerm.contract} da Mari" → Qual o valor? Data de assinatura?
   • "Deleta o contract/${apiTerm.contract}" → Qual contract/${apiTerm.contract}? Tem recebíveis vinculados?

5. IMPOSSIBILIDADE: Se a solicitação for impossível, explique o porquê.
   • "Deleta todas as despesas" → Muito perigoso, peça confirmação específica
   • "Cria recebível de R$0" → Valor deve ser positivo

6. SAFETY: NUNCA execute operações destrutivas sem confirmação explícita!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOM E ESTILO:

✅ Amigável mas profissional
✅ Use emojis (📝 💰 📅 🏷️)
✅ Confirme antes de operações destrutivas
✅ Use linguagem de negócios (não técnica)
✅ Identifique entidades por descrição:
   • "a despesa de R$45 do Netflix"
   • "o contract/${apiTerm.contract} da Mari de R$5.000"

❌ NUNCA exponha IDs técnicos
❌ Não mostre SQL ou JSON
❌ Não seja prolixo
❌ Não assuma - pergunte quando necessário`
  }
}
