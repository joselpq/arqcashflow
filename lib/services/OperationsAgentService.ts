/**
 * Operations Agent Service - Step 5: Multi-Entity Operations
 *
 * Step 1: ✅ Chat with conversation context
 * Step 2: ✅ Create expenses
 * Step 3: ✅ Confirmation workflow
 * Step 4: ✅ Update and delete - Claude queries and uses APIs
 * Step 5: ✅ Multi-entity support (Expense, Contract, Receivable, RecurringExpense)
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ServiceContext } from './BaseService'
import { ExpenseService } from './ExpenseService'
import { ContractService } from './ContractService'
import { ReceivableService } from './ReceivableService'
import { RecurringExpenseService } from './RecurringExpenseService'

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export class OperationsAgentService {
  private anthropic: Anthropic
  private expenseService: ExpenseService
  private contractService: ContractService
  private receivableService: ReceivableService
  private recurringExpenseService: RecurringExpenseService

  constructor(private context: ServiceContext) {
    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) throw new Error('CLAUDE_API_KEY not configured')

    this.anthropic = new Anthropic({ apiKey })
    this.expenseService = new ExpenseService(context)
    this.contractService = new ContractService(context)
    this.receivableService = new ReceivableService(context)
    this.recurringExpenseService = new RecurringExpenseService(context)
  }

  /**
   * Filter out internal messages that should not be displayed to users.
   * Internal messages are marked with special prefixes like [QUERY_RESULTS], [INTERNAL], etc.
   */
  private filterInternalMessages(history: ConversationMessage[]): ConversationMessage[] {
    return history.filter(msg =>
      !msg.content.startsWith('[QUERY_RESULTS]') &&
      !msg.content.startsWith('[INTERNAL]') &&
      !msg.content.startsWith('[DEBUG]')
    )
  }

  async processCommand(
    message: string,
    history: ConversationMessage[] = []
  ) {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const teamId = this.context.teamId

    const systemPrompt = `Você é um assistente financeiro da ArqCashflow com acesso ao database e APIs do sistema.

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
   - "Quais contratos estão ativos?"
   - "Qual o total a receber este mês?"

2. OPERAÇÕES: Criar, editar ou deletar registros financeiros
   - Contratos (projetos do usuário)
   - Recebíveis (valores a receber de clientes)
   - Despesas (gastos únicos ou recorrentes)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FERRAMENTAS DISPONÍVEIS:

1. query_database - Consultar o database (PostgreSQL, apenas SELECT)
   {"action": "query_database", "sql": "SELECT ... FROM ... WHERE \\"teamId\\" = '${teamId}' ..."}

2. call_service - Executar operações (criar/editar/deletar)
   {"action": "call_service", "service": "ExpenseService", "method": "create", "params": {...}}

REGRAS CRÍTICAS PARA AÇÕES:

⚠️ QUANDO EXECUTAR UMA QUERY OU OPERAÇÃO:
- Retorne APENAS o JSON da ação, SEM NENHUM TEXTO antes ou depois
- NÃO explique o que vai fazer
- NÃO mostre o SQL ou JSON para o usuário
- APENAS retorne o JSON puro para execução

Exemplo ERRADO ❌:
"Vou buscar suas despesas com Notion. {"action": "query_database", ...}"

Exemplo CORRETO ✅:
{"action": "query_database", ...}

DEPOIS da query ser executada, você receberá os resultados e ENTÃO deve formatar para o usuário.

REGRA CRÍTICA SOBRE RESULTADOS DE QUERY:
- Você receberá resultados de query como: "[QUERY_RESULTS]...dados...[/QUERY_RESULTS]"
- Esses dados são APENAS para você usar internamente
- NUNCA mostre esse JSON bruto para o usuário
- Ao invés disso, formate os dados de forma amigável e legível
- Exemplo: ao invés de mostrar o JSON, diga "Encontrei 3 despesas: ..." com formatação bonita

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATABASE SCHEMA (PostgreSQL):

┌─────────────────────────────────────────────────────────────────┐
│ Contract (Contratos/Projetos do cliente)                        │
├─────────────────────────────────────────────────────────────────┤
│ • id: TEXT (chave primária)                                     │
│ • clientName: TEXT (nome do cliente) - OBRIGATÓRIO             │
│ • projectName: TEXT (nome do projeto) - OBRIGATÓRIO            │
│ • description: TEXT (descrição do projeto) - opcional           │
│ • totalValue: DECIMAL (valor total do contrato) - OBRIGATÓRIO  │
│ • signedDate: TIMESTAMP (data de assinatura) - OBRIGATÓRIO     │
│ • status: TEXT (active, completed, cancelled) - default: active │
│ • category: TEXT (categoria do projeto) - opcional             │
│ • notes: TEXT (observações) - opcional                          │
│ • teamId: TEXT (sempre '${teamId}') - OBRIGATÓRIO              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Receivable (Recebíveis/Valores a receber)                       │
├─────────────────────────────────────────────────────────────────┤
│ • id: TEXT (chave primária)                                     │
│ • contractId: TEXT (vínculo com contrato) - opcional           │
│ • expectedDate: TIMESTAMP (data esperada) - OBRIGATÓRIO        │
│ • amount: DECIMAL (valor a receber) - OBRIGATÓRIO              │
│ • status: TEXT (pending, received, overdue) - default: pending  │
│ • receivedDate: TIMESTAMP (data recebimento) - opcional         │
│ • receivedAmount: DECIMAL (valor recebido) - opcional           │
│ • invoiceNumber: TEXT (número NF) - opcional                    │
│ • category: TEXT (categoria) - opcional                         │
│ • clientName: TEXT (nome cliente) - opcional (standalone)       │
│ • description: TEXT (descrição) - opcional (standalone)         │
│ • notes: TEXT (observações) - opcional                          │
│ • teamId: TEXT (sempre '${teamId}') - OBRIGATÓRIO              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Expense (Despesas)                                              │
├─────────────────────────────────────────────────────────────────┤
│ • id: TEXT (chave primária)                                     │
│ • description: TEXT (descrição) - OBRIGATÓRIO                  │
│ • amount: DECIMAL (valor) - OBRIGATÓRIO                        │
│ • dueDate: TIMESTAMP (data vencimento) - OBRIGATÓRIO           │
│ • category: TEXT (categoria) - OBRIGATÓRIO                     │
│   Categorias: Alimentação, Transporte, Materiais, Serviços,    │
│               Escritório, Marketing, Impostos, Salários, Outros │
│ • status: TEXT (pending, paid, overdue, cancelled)              │
│ • contractId: TEXT (vínculo com projeto) - opcional            │
│ • vendor: TEXT (fornecedor) - opcional                          │
│ • invoiceNumber: TEXT (número NF) - opcional                    │
│ • type: TEXT (operational, project, administrative) - opcional  │
│ • isRecurring: BOOLEAN (se é recorrente) - default: false       │
│ • paidDate: TIMESTAMP (data pagamento) - opcional               │
│ • paidAmount: DECIMAL (valor pago) - opcional                   │
│ • notes: TEXT (observações) - opcional                          │
│ • teamId: TEXT (sempre '${teamId}') - OBRIGATÓRIO              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ RecurringExpense (Despesas Recorrentes)                         │
├─────────────────────────────────────────────────────────────────┤
│ • id: TEXT (chave primária)                                     │
│ • description: TEXT (descrição) - OBRIGATÓRIO                  │
│ • amount: DECIMAL (valor) - OBRIGATÓRIO                        │
│ • category: TEXT (categoria) - OBRIGATÓRIO                     │
│ • frequency: TEXT (monthly, weekly, yearly) - OBRIGATÓRIO      │
│ • startDate: TIMESTAMP (início) - OBRIGATÓRIO                  │
│ • endDate: TIMESTAMP (fim) - opcional                           │
│ • dayOfMonth: INTEGER (dia do mês, 1-31) - para mensais        │
│ • dayOfWeek: INTEGER (dia semana, 0-6) - para semanais         │
│ • notes: TEXT (observações) - opcional                          │
│ • teamId: TEXT (sempre '${teamId}') - OBRIGATÓRIO              │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APIS DISPONÍVEIS:

╔═══════════════════════════════════════════════════════════════╗
║ ExpenseService                                                 ║
╠═══════════════════════════════════════════════════════════════╣
║ create(data)                                                   ║
║   OBRIGATÓRIO: description, amount, dueDate, category         ║
║   OPCIONAL: contractId, vendor, invoiceNumber, type, notes,   ║
║             status, paidDate, paidAmount                       ║
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
║ create(data), update(id, data), delete(id, options?)         ║
║ bulkCreate(items), bulkUpdate(updates), bulkDelete(ids)      ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║ ReceivableService                                              ║
╠═══════════════════════════════════════════════════════════════╣
║ create(data), update(id, data), delete(id)                   ║
║ bulkCreate(items), bulkUpdate(updates), bulkDelete(ids)      ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║ RecurringExpenseService                                        ║
╠═══════════════════════════════════════════════════════════════╣
║ create(data), update(id, data), delete(id)                   ║
║ bulkCreate(items), bulkUpdate(updates), bulkDelete(ids)      ║
╚═══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGRAS IMPORTANTES:

1. TEAM ISOLATION: SEMPRE filtre queries por teamId = '${teamId}'
   Exemplo: WHERE "teamId" = '${teamId}'

2. POSTGRESQL CASE SENSITIVITY: SEMPRE use aspas duplas para nomes de colunas em queries
   ✅ CORRETO: SELECT "id", "description", "dueDate" FROM "Expense"
   ❌ ERRADO: SELECT id, description, dueDate FROM Expense

   IMPORTANTE: Nomes de tabelas e colunas são case-sensitive em PostgreSQL!
   Use EXATAMENTE como mostrado no schema (Contract, Expense, dueDate, clientName, etc.)

3. INFERÊNCIA: Para campos obrigatórios, você pode inferir valores óbvios:
   • Datas: "ontem" = ${yesterday}, "hoje" = ${today}
   • Categorias: "gasolina" → Transporte, "almoço" → Alimentação
   • Valores: "cinquenta reais" → 50.00

4. AMBIGUIDADE: Se a solicitação for ambígua ou faltar informação crucial,
   faça perguntas de acompanhamento antes de executar.

   Exemplos de quando perguntar:
   • "Atualiza a despesa" → Qual despesa? (precisa query_database)
   • "Cria um contrato da Mari" → Qual o valor? Data de assinatura?
   • "Deleta o contrato" → Qual contrato? Tem recebíveis vinculados?

5. IMPOSSIBILIDADE: Se a solicitação for impossível, explique o porquê.
   • "Deleta todas as despesas" → Muito perigoso, peça confirmação específica
   • "Cria recebível de R$0" → Valor deve ser positivo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WORKFLOW OBRIGATÓRIO:

Para CONSULTAS:
1. Use query_database (SEMPRE inclua 'id' no SELECT mesmo que seja só consulta!)
2. Formate a resposta de forma amigável (não mostre os IDs para o usuário)
3. Não retorne JSON bruto para o usuário

IMPORTANTE: SEMPRE inclua 'id' em TODAS as queries, mesmo consultas simples!
Isso permite que você possa atualizar/deletar depois sem fazer nova query.

Para CRIAR:
1. Extrair dados da mensagem do usuário
2. Mostrar PRÉVIA formatada com emojis
3. Pedir confirmação ("Confirma?")
4. Aguardar confirmação
5. Executar call_service

Para ATUALIZAR/DELETAR:
1. Use query_database para encontrar o registro (SEMPRE inclua 'id' na query!)
2. MEMORIZE os IDs retornados na conversa - você verá os resultados
3. Mostre PRÉVIA do que vai fazer usando os mesmos registros encontrados
4. Aguardar confirmação
5. Execute call_service usando EXATAMENTE os IDs que você viu nos resultados da query

CRÍTICO:
- Quando listar registros para o usuário, SEMPRE inclua 'id' na SELECT
- Use os MESMOS IDs que você recebeu na primeira query
- NÃO faça uma nova query para pegar IDs - use os que já tem na conversa!

Exemplo correto:
1. Query: SELECT id, description, amount FROM "Expense" WHERE ... LIMIT 3
2. Você vê: [{id: "abc", ...}, {id: "def", ...}, {id: "ghi", ...}]
3. Update: bulkUpdate com ids ["abc", "def", "ghi"]

NUNCA execute operações destrutivas sem confirmação explícita!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOM E ESTILO:

✅ Seja amigável mas profissional
✅ Use emojis para clareza visual (📝 💰 📅 🏷️)
✅ Confirme antes de operações destrutivas
✅ Explique o que está fazendo quando não for óbvio
✅ Use linguagem de negócios (não técnica) com o usuário

❌ Não exponha detalhes técnicos (IDs, SQL) para o usuário
❌ Não seja prolixo - seja objetivo
❌ Não assuma - pergunte quando necessário`

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [...history, { role: 'user' as const, content: message }]
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response')
    const responseText = content.text.trim()

    // Extract JSON action if present
    let action = null

    // Method 1: Check for tool use format (Claude is mimicking function calling)
    // Format: <invoke name="..."><parameter name="X">value</parameter>...</invoke>
    if (responseText.includes('<invoke') || responseText.includes('<parameter')) {
      try {
        const serviceMatch = responseText.match(/<parameter name="service">\s*([^<]+)\s*<\/parameter>/i)
        const methodMatch = responseText.match(/<parameter name="method">\s*([^<]+)\s*<\/parameter>/i)
        const paramsMatch = responseText.match(/<parameter name="params">\s*(\{[\s\S]*?\})\s*<\/parameter>/i)
        const actionTypeMatch = responseText.match(/<parameter name="action">\s*([^<]+)\s*<\/parameter>/i)
        const sqlMatch = responseText.match(/<parameter name="sql">\s*([^<]+)\s*<\/parameter>/i)

        if (serviceMatch && methodMatch && paramsMatch) {
          // call_service format
          const params = JSON.parse(paramsMatch[1].trim())
          action = {
            action: 'call_service',
            service: serviceMatch[1].trim(),
            method: methodMatch[1].trim(),
            params
          }
          console.log('[Operations] Extracted tool use format (call_service):', action)
        } else if (actionTypeMatch && actionTypeMatch[1].trim() === 'query_database' && sqlMatch) {
          // query_database format
          action = {
            action: 'query_database',
            sql: sqlMatch[1].trim()
          }
          console.log('[Operations] Extracted tool use format (query_database):', action)
        }
      } catch (error) {
        console.error('[Operations] Tool use format parse error:', error)
      }
    }

    // Method 2: Try to extract inline JSON (fallback for simple format)
    // Handle multiple JSON objects in response (for batch operations)
    if (!action && responseText.includes('"action"')) {
      try {
        // Find all complete JSON objects (supporting nested objects)
        const jsonObjects: any[] = []
        let currentPos = 0

        while (currentPos < responseText.length) {
          const jsonStart = responseText.indexOf('{', currentPos)
          if (jsonStart === -1) break

          // Find matching closing brace
          let braceCount = 0
          let jsonEnd = -1
          for (let i = jsonStart; i < responseText.length; i++) {
            if (responseText[i] === '{') braceCount++
            if (responseText[i] === '}') {
              braceCount--
              if (braceCount === 0) {
                jsonEnd = i
                break
              }
            }
          }

          if (jsonEnd === -1) break

          try {
            const jsonStr = responseText.substring(jsonStart, jsonEnd + 1)
            const parsed = JSON.parse(jsonStr)
            if (parsed.action) {
              jsonObjects.push(parsed)
            }
          } catch (e) {
            // Skip invalid JSON
          }

          currentPos = jsonEnd + 1
        }

        if (jsonObjects.length === 1) {
          action = jsonObjects[0]
          console.log('[Operations] Extracted inline JSON:', action)
        } else if (jsonObjects.length > 1) {
          // Multiple actions - convert to bulkUpdate if they're all updates
          const allUpdates = jsonObjects.every(obj =>
            obj.action === 'call_service' &&
            obj.method === 'update' &&
            obj.service === jsonObjects[0].service
          )

          if (allUpdates) {
            // Convert to bulkUpdate
            const updates = jsonObjects.map(obj => ({
              id: obj.params.id,
              data: obj.params.data || (() => {
                const { id, ...rest } = obj.params
                return rest
              })()
            }))

            action = {
              action: 'call_service',
              service: jsonObjects[0].service,
              method: 'bulkUpdate',
              params: updates
            }
            console.log('[Operations] Converted multiple updates to bulkUpdate:', updates.length, 'items')
          } else {
            // Different operations - can't batch, use first one for now
            action = jsonObjects[0]
            console.log('[Operations] Multiple different actions detected, using first one only')
          }
        }
      } catch (error) {
        console.error('[Operations] JSON parse error:', error)
      }
    }

    if (action) {
      console.log('[Operations] Action detected:', {
        actionType: action.action,
        hasSQL: !!action.sql,
        hasService: !!action.service,
        hasMethod: !!action.method
      })

      try {
        // QUERY DATABASE
        if (action.action === 'query_database' && action.sql) {
          console.log('[Operations] Executing query_database...')
          const results = await this.executeQuery(action.sql)

          // Log the actual results with IDs
          console.log('[Operations] Query returned', results.length, 'rows')
          if (results.length > 0) {
            console.log('[Operations] Query results:', JSON.stringify(results, null, 2))
            // Specifically highlight IDs if present
            const ids = results.map(r => r.id).filter(Boolean)
            if (ids.length > 0) {
              console.log('[Operations] IDs returned by query:', ids)
            }
          }

          // Use special markers to indicate this is internal data, not user-facing
          const resultsMessage = `[QUERY_RESULTS]${JSON.stringify(results, null, 2)}[/QUERY_RESULTS]`

          // Add query results to conversation and ask Claude what to do next
          const updatedHistory = [
            ...history,
            { role: 'user' as const, content: message },
            { role: 'assistant' as const, content: resultsMessage }
          ]

          // Call Claude again with results
          const followUpResponse = await this.anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            system: systemPrompt,
            messages: updatedHistory
          })

          const followUpContent = followUpResponse.content[0]
          if (followUpContent.type !== 'text') throw new Error('Unexpected response')

          const fullHistory = [
            ...updatedHistory,
            { role: 'assistant' as const, content: followUpContent.text }
          ]

          return {
            success: true,
            message: followUpContent.text,
            conversationHistory: fullHistory,
            displayHistory: this.filterInternalMessages(fullHistory)
          }
        }

        // CALL SERVICE (new unified handler)
        if (action.action === 'call_service' && action.service && action.method && action.params) {
          return await this.handleServiceCall(action.service, action.method, action.params, message, history)
        }

        // Legacy handlers (for backward compatibility during transition)
        if (action.action === 'create_expense' && action.data) {
          return await this.handleServiceCall('ExpenseService', 'create', action.data, message, history)
        }

        if (action.action === 'update_expense' && action.id && action.data) {
          return await this.handleServiceCall('ExpenseService', 'update', { id: action.id, data: action.data }, message, history)
        }

        if (action.action === 'delete_expense' && action.id) {
          return await this.handleServiceCall('ExpenseService', 'delete', { id: action.id }, message, history)
        }

      } catch (error) {
        const errorMessage = `❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        return {
          success: false,
          message: errorMessage,
          conversationHistory: [
            ...history,
            { role: 'user' as const, content: message },
            { role: 'assistant' as const, content: errorMessage }
          ]
        }
      }
    }

    // Normal conversation or preview (no action detected)
    // If we got here, either no action was found OR action handlers didn't return
    console.log('[Operations] No action detected or action not handled, returning response as-is')

    const fullHistory = [
      ...history,
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: responseText }
    ]

    return {
      success: true,
      message: responseText,
      conversationHistory: fullHistory,
      displayHistory: this.filterInternalMessages(fullHistory)
    }
  }

  private async handleServiceCall(
    service: string,
    method: string,
    params: any,
    message: string,
    history: ConversationMessage[]
  ) {
    // Map service name to service instance
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

    // Call the service method
    let result
    if (method === 'create') {
      console.log(`[Operations] Calling ${service}.${method} with:`, params)
      result = await serviceInstance[method](params)
    } else if (method === 'bulkCreate') {
      // Handle bulk creates: params can be array or object with 'items' property
      const items = Array.isArray(params) ? params : params.items
      if (!items || !Array.isArray(items)) {
        throw new Error('bulkCreate requires an array of items')
      }
      console.log(`[Operations] Calling ${service}.${method} with ${items.length} items`)
      result = await serviceInstance[method](items)
      console.log(`[Operations] ${service}.${method} completed:`, result.successCount, 'succeeded,', result.failureCount, 'failed')
      if (result.errors && result.errors.length > 0) {
        console.log('[Operations] Errors:', result.errors)
      }
    } else if (method === 'bulkUpdate') {
      // Handle bulk updates: params can be array or object with 'updates' property
      const updates = Array.isArray(params) ? params : params.updates
      if (!updates || !Array.isArray(updates)) {
        throw new Error('bulkUpdate requires an array of updates')
      }
      console.log(`[Operations] Calling ${service}.${method} with ${updates.length} items`)
      console.log('[Operations] Update details:', JSON.stringify(updates, null, 2))
      result = await serviceInstance[method](updates)
      console.log(`[Operations] ${service}.${method} completed:`, result.successCount, 'succeeded,', result.failureCount, 'failed')
      if (result.errors && result.errors.length > 0) {
        console.log('[Operations] Errors:', result.errors)
      }
    } else if (method === 'bulkDelete') {
      // Handle bulk deletes: params can be array or object with 'ids' property
      const ids = Array.isArray(params) ? params : params.ids
      if (!ids || !Array.isArray(ids)) {
        throw new Error('bulkDelete requires an array of ids')
      }
      console.log(`[Operations] Calling ${service}.${method} with ${ids.length} ids:`, ids)
      result = await serviceInstance[method](ids)
      console.log(`[Operations] ${service}.${method} completed:`, result.successCount, 'succeeded,', result.failureCount, 'failed')
      if (result.errors && result.errors.length > 0) {
        console.log('[Operations] Errors:', result.errors)
      }
    } else if (method === 'update') {
      // Handle two formats:
      // 1. params = { id: "...", data: { amount: 15 } } (expected format)
      // 2. params = { id: "...", amount: 15 } (Claude's natural format)
      const updateId = params.id
      const updateData = params.data || (() => {
        const { id, ...rest } = params
        return rest
      })()
      console.log(`[Operations] Calling ${service}.${method} with id:`, updateId, 'data:', updateData)
      result = await serviceInstance[method](updateId, updateData)
    } else if (method === 'delete') {
      console.log(`[Operations] Calling ${service}.${method} with id:`, params.id)
      result = await serviceInstance[method](params.id)
      console.log(`[Operations] ${service}.${method} completed, result:`, result)
    } else {
      // Generic call for other methods
      console.log(`[Operations] Calling ${service}.${method} with:`, params)
      result = await serviceInstance[method](params)
    }

    // Format success message based on entity type
    let successMessage = ''

    if (method === 'bulkCreate') {
      // Handle bulk create result
      successMessage = `✅ Criação em lote concluída!

📊 Total: ${result.totalItems} itens
✅ Sucesso: ${result.successCount}
❌ Falhas: ${result.failureCount}`

      if (result.failureCount > 0 && result.errors.length > 0) {
        successMessage += `\n\n⚠️ Erros:\n${result.errors.slice(0, 3).join('\n')}`
      }
    } else if (method === 'bulkUpdate') {
      // Handle bulk update result
      successMessage = `✅ Atualização em lote concluída!

📊 Total: ${result.totalItems} itens
✅ Sucesso: ${result.successCount}
❌ Falhas: ${result.failureCount}`

      if (result.failureCount > 0 && result.errors.length > 0) {
        successMessage += `\n\n⚠️ Erros:\n${result.errors.slice(0, 3).join('\n')}`
      }
    } else if (method === 'bulkDelete') {
      // Handle bulk delete result
      successMessage = `✅ Exclusão em lote concluída!

📊 Total: ${result.totalItems} itens
✅ Sucesso: ${result.successCount}
❌ Falhas: ${result.failureCount}`

      if (result.failureCount > 0 && result.errors.length > 0) {
        successMessage += `\n\n⚠️ Erros:\n${result.errors.slice(0, 3).join('\n')}`
      }
    } else if (method === 'delete') {
      successMessage = `✅ Registro deletado com sucesso!`
    } else if (result) {
      // Format based on entity type
      if ('description' in result && 'amount' in result && 'dueDate' in result) {
        // Expense
        successMessage = `✅ Despesa ${method === 'create' ? 'criada' : 'atualizada'}!

📝 ${result.description}
💰 R$ ${result.amount.toFixed(2)}
📅 ${new Date(result.dueDate).toLocaleDateString('pt-BR')}
🏷️ ${result.category}`
      } else if ('clientName' in result && 'projectName' in result) {
        // Contract
        successMessage = `✅ Contrato ${method === 'create' ? 'criado' : 'atualizado'}!

👤 Cliente: ${result.clientName}
📋 Projeto: ${result.projectName}
💰 Valor: R$ ${result.totalValue.toFixed(2)}
📅 Assinatura: ${new Date(result.signedDate).toLocaleDateString('pt-BR')}`
      } else if ('expectedDate' in result && 'amount' in result) {
        // Receivable
        successMessage = `✅ Recebível ${method === 'create' ? 'criado' : 'atualizado'}!

💰 Valor: R$ ${result.amount.toFixed(2)}
📅 Data esperada: ${new Date(result.expectedDate).toLocaleDateString('pt-BR')}
${result.clientName ? `👤 Cliente: ${result.clientName}` : ''}
${result.description ? `📝 ${result.description}` : ''}`
      } else {
        successMessage = `✅ Operação realizada com sucesso!`
      }
    }

    const fullHistory = [
      ...history,
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: successMessage }
    ]

    return {
      success: true,
      message: successMessage,
      conversationHistory: fullHistory,
      displayHistory: this.filterInternalMessages(fullHistory)
    }
  }

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
      return Array.isArray(result) ? result : []
    } catch (error) {
      console.error('[Operations] Query error:', error)
      throw new Error('Erro ao executar consulta')
    }
  }
}
