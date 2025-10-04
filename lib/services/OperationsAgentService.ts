/**
 * Operations Agent Service - Step 6: Structured Tool Use Migration
 *
 * Step 1: ✅ Chat with conversation context
 * Step 2: ✅ Create expenses
 * Step 3: ✅ Confirmation workflow
 * Step 4: ✅ Update and delete - Claude queries and uses APIs
 * Step 5: ✅ Multi-entity support (Expense, Contract, Receivable, RecurringExpense)
 * Step 6: 🔄 Structured tool use (no JSON leakage)
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ServiceContext } from './BaseService'
import { ExpenseService } from './ExpenseService'
import { ContractService } from './ContractService'
import { ReceivableService } from './ReceivableService'
import { RecurringExpenseService } from './RecurringExpenseService'

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string | Anthropic.ContentBlock[]
}

// Helper: Extract text from content blocks or string
function extractText(content: string | Anthropic.ContentBlock[]): string {
  if (typeof content === 'string') return content

  return content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('\n')
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
   * Also converts ContentBlock[] to string for display.
   */
  private filterInternalMessages(history: ConversationMessage[]): ConversationMessage[] {
    return history
      .filter(msg => {
        const text = extractText(msg.content)
        return (
          !text.startsWith('[QUERY_RESULTS]') &&
          !text.startsWith('[INTERNAL]') &&
          !text.startsWith('[DEBUG]')
        )
      })
      .map(msg => ({
        role: msg.role,
        content: extractText(msg.content)  // Convert to string for display
      }))
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

Você tem acesso a duas ferramentas:

1. query_database - Para consultar dados financeiros no database PostgreSQL
   - Use para responder perguntas sobre contratos, recebíveis, despesas
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

Use: descrição, valor, data, nome do cliente/projeto - informações que o usuário reconheça.

DICAS IMPORTANTES:

- **Recebíveis vinculados a projetos**: Se o usuário mencionar um projeto, busque o contrato primeiro e use o contractId ao criar
- **Deletar contratos**: Verifique se há recebíveis vinculados e pergunte ao usuário o que fazer com eles
- **Operações em lote**: Use bulkCreate, bulkUpdate, bulkDelete quando apropriado

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
│ • frequency: TEXT (weekly, monthly, quarterly, annual) - OBRIG.│
│ • interval: INTEGER (intervalo, ex: 1=todo, 2=a cada 2) - OBRIG│
│ • startDate: TIMESTAMP (início) - OBRIGATÓRIO                  │
│ • endDate: TIMESTAMP (fim) - opcional                           │
│ • nextDue: TIMESTAMP (próximo vencimento) - calculado          │
│ • dayOfMonth: INTEGER (dia do mês, 1-31) - para mensais        │
│ • isActive: BOOLEAN (ativa?) - default: true                    │
│ • vendor: TEXT (fornecedor) - opcional                          │
│ • notes: TEXT (observações) - opcional                          │
│ • teamId: TEXT (sempre '${teamId}') - OBRIGATÓRIO              │
│                                                                 │
│ IMPORTANTE: RecurringExpense NÃO tem campo "dueDate"!          │
│ Use "nextDue" para próximo vencimento ou "startDate" para início│
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
║ create(data)                                                   ║
║   OBRIGATÓRIO: clientName, projectName, totalValue, signedDate║
║   OPCIONAL: description, status, category, notes              ║
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
║   "contract-only" (padrão): Desvincula recebíveis do contrato║
║   "contract-and-receivables": Deleta contrato E recebíveis   ║
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
║   OPCIONAL (vinculado a contrato):                            ║
║     - contractId (use o id do contrato)                       ║
║   OPCIONAL (standalone):                                       ║
║     - clientName, description                                 ║
║   OUTROS OPCIONAIS: status, receivedDate, receivedAmount,     ║
║                     invoiceNumber, category, notes            ║
║   Padrões: status = "pending"                                 ║
║                                                                ║
║ bulkCreate(items)                                             ║
║   items = [{expectedDate: "...", amount: 1000, ...}, ...]    ║
║   Dica: Para vincular ao mesmo projeto, use o mesmo contractId║
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
   Exemplo: WHERE "teamId" = '${teamId}'

2. POSTGRESQL CASE SENSITIVITY: SEMPRE use aspas duplas para nomes de colunas em queries
   ✅ CORRETO: SELECT "id", "description", "dueDate" FROM "Expense"
   ❌ ERRADO: SELECT id, description, dueDate FROM Expense

   IMPORTANTE: Nomes de tabelas e colunas são case-sensitive em PostgreSQL!
   Use EXATAMENTE como mostrado no schema (Contract, Expense, dueDate, clientName, etc.)

3. INFERÊNCIA: Para campos obrigatórios, você pode inferir valores óbvios:
   • Datas: "ontem" = ${yesterday}, "hoje" = ${today}
   • Data ausente: Se não especificada, use HOJE = ${today}
     Exemplos: "novo contrato 35000, João" → signedDate = ${today}
               "R$50 almoço" → dueDate = ${today}
   • Categorias: "gasolina" → Transporte, "almoço" → Alimentação
   • Valores: "cinquenta reais" → 50.00
   • Contratos: Se projectName não especificado, use clientName como projectName
     Exemplo: "contrato 5000, Mari" → clientName="Mari", projectName="Mari"
   • Despesas Recorrentes: interval padrão = 1 (a cada 1 vez)
     Exemplos: "mensal" → interval=1, "a cada 2 meses" → interval=2
               Se não especificado, sempre use interval=1

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

REGRAS ESPECIAIS:

DELETAR CONTRATOS:
- Antes de deletar contrato, SEMPRE pergunte sobre os recebíveis vinculados!
- Opções:
  1. Apenas contrato (recebíveis ficam desvinculados) - mode: "contract-only"
  2. Contrato E recebíveis (tudo é deletado) - mode: "contract-and-receivables"
- Exemplo: "Quer deletar só o contrato ou incluir os recebíveis também?"

NUNCA execute operações destrutivas sem confirmação explícita!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOM E ESTILO:

✅ Seja amigável mas profissional
✅ Use emojis para clareza visual (📝 💰 📅 🏷️)
✅ Confirme antes de operações destrutivas
✅ Explique o que está fazendo quando não for óbvio
✅ Use linguagem de negócios (não técnica) com o usuário
✅ Identifique entidades por informações descritivas:
   • "a despesa de R$45 do Netflix"
   • "o contrato da Mari de R$5.000"
   • "o recebível de R$1.200 para 15/10"

❌ NUNCA exponha IDs técnicos (clx8dy4pz...) - use apenas internamente
❌ Não mostre SQL, JSON, ou dados brutos
❌ Não seja prolixo - seja objetivo
❌ Não assuma - pergunte quando necessário`

    // Define tools for structured tool use
    const tools: Anthropic.Tool[] = [
      {
        name: 'query_database',
        description: 'Execute SELECT query on PostgreSQL database to retrieve financial data',
        input_schema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: 'PostgreSQL SELECT query with proper column quoting. Must filter by teamId.'
            }
          },
          required: ['sql']
        }
      },
      {
        name: 'call_service',
        description: 'Execute CRUD operations on financial entities (contracts, receivables, expenses)',
        input_schema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              enum: ['ExpenseService', 'ContractService', 'ReceivableService', 'RecurringExpenseService'],
              description: 'Service to call'
            },
            method: {
              type: 'string',
              enum: ['create', 'update', 'delete', 'bulkCreate', 'bulkUpdate', 'bulkDelete'],
              description: 'Method to execute'
            },
            params: {
              type: 'object',
              description: 'Operation parameters (entity data, IDs, etc.)'
            }
          },
          required: ['service', 'method', 'params']
        }
      }
    ]

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,  // Increased from 1500 to handle large bulk operations (up to ~400 IDs)
      system: systemPrompt,
      tools: tools,  // Add structured tool use
      messages: [...history, { role: 'user' as const, content: message }]
    })

    // Process content blocks (structured tool use)
    const textBlocks: Anthropic.TextBlock[] = []
    const toolUseBlocks: Anthropic.ToolUseBlock[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        textBlocks.push(block)
      } else if (block.type === 'tool_use') {
        toolUseBlocks.push(block)
      }
    }

    // If no tools used, return conversation response
    if (toolUseBlocks.length === 0) {
      const responseText = textBlocks.map(b => b.text).join('\n')
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

    // Execute tools
    console.log(`[Operations] ${toolUseBlocks.length} tool(s) to execute`)

    for (const toolUse of toolUseBlocks) {
      console.log(`[Operations] Executing tool: ${toolUse.name}`)

      if (toolUse.name === 'query_database') {
        // Execute database query
        const sql = (toolUse.input as any).sql
        console.log('[Operations] Executing query_database:', sql)
        const results = await this.executeQuery(sql)

        // Log results
        console.log('[Operations] Query returned', results.length, 'rows')
        if (results.length > 0) {
          const ids = results.map(r => r.id).filter(Boolean)
          if (ids.length > 0) {
            console.log('[Operations] IDs returned:', ids)
          }
        }

        // Build conversation with tool results
        const toolResultContent: Anthropic.ToolResultBlockParam = {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(results, null, 2)
        }

        const updatedHistory: Anthropic.MessageParam[] = [
          ...history.map(h => ({
            role: h.role,
            content: h.content
          })),
          { role: 'user' as const, content: message },
          { role: 'assistant' as const, content: response.content },
          { role: 'user' as const, content: [toolResultContent] }
        ]

        // Call Claude again with tool results
        const followUpResponse = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          system: systemPrompt,
          tools: tools,
          messages: updatedHistory
        })

        // Check if Claude used MORE tools in follow-up
        const followUpToolUses = followUpResponse.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        )

        if (followUpToolUses.length > 0) {
          // Claude wants to use more tools
          console.log(`[Operations] Follow-up wants to use ${followUpToolUses.length} more tool(s)`)

          // Process each additional tool
          for (const followUpTool of followUpToolUses) {
            if (followUpTool.name === 'query_database') {
              const sql2 = (followUpTool.input as any).sql
              console.log('[Operations] Executing follow-up query_database:', sql2)
              const results2 = await this.executeQuery(sql2)

              console.log('[Operations] Follow-up query returned', results2.length, 'rows')

              // Add this tool result and call Claude one more time
              const toolResult2: Anthropic.ToolResultBlockParam = {
                type: 'tool_result',
                tool_use_id: followUpTool.id,
                content: JSON.stringify(results2, null, 2)
              }

              const finalHistory: Anthropic.MessageParam[] = [
                ...updatedHistory,
                { role: 'assistant' as const, content: followUpResponse.content },
                { role: 'user' as const, content: [toolResult2] }
              ]

              const finalResponse = await this.anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 8192,
                system: systemPrompt,
                tools: tools,
                messages: finalHistory
              })

              const finalText = finalResponse.content
                .filter((b): b is Anthropic.TextBlock => b.type === 'text')
                .map(b => b.text)
                .join('\n')

              const fullHistory = [
                ...history,
                { role: 'user' as const, content: message },
                { role: 'assistant' as const, content: `[QUERY_RESULTS]${JSON.stringify(results)}[/QUERY_RESULTS]` },
                { role: 'assistant' as const, content: `[QUERY_RESULTS]${JSON.stringify(results2)}[/QUERY_RESULTS]` },
                { role: 'assistant' as const, content: finalText }
              ]

              return {
                success: true,
                message: finalText,
                conversationHistory: fullHistory,
                displayHistory: this.filterInternalMessages(fullHistory)
              }
            }
          }
        }

        // No more tools - extract text response
        const followUpText = followUpResponse.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('\n')

        const fullHistory = [
          ...history,
          { role: 'user' as const, content: message },
          { role: 'assistant' as const, content: `[QUERY_RESULTS]${JSON.stringify(results)}[/QUERY_RESULTS]` },
          { role: 'assistant' as const, content: followUpText }
        ]

        return {
          success: true,
          message: followUpText,
          conversationHistory: fullHistory,
          displayHistory: this.filterInternalMessages(fullHistory)
        }
      }

      if (toolUse.name === 'call_service') {
        // Execute service call
        const input = toolUse.input as any
        return await this.handleServiceCall(
          input.service,
          input.method,
          input.params,
          message,
          history
        )
      }
    }

    // If we get here, tools were detected but not handled properly
    throw new Error('Tool execution failed')
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
