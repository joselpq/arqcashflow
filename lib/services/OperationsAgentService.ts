/**
 * Operations Agent Service - Step 4: Update and Delete Operations (Simplified)
 *
 * Step 1: ✅ Chat with conversation context
 * Step 2: ✅ Create expenses
 * Step 3: ✅ Confirmation workflow
 * Step 4: 🔄 Update and delete - Claude queries and uses APIs
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ServiceContext } from './BaseService'
import { ExpenseService } from './ExpenseService'

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export class OperationsAgentService {
  private anthropic: Anthropic
  private expenseService: ExpenseService

  constructor(private context: ServiceContext) {
    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) throw new Error('CLAUDE_API_KEY not configured')

    this.anthropic = new Anthropic({ apiKey })
    this.expenseService = new ExpenseService(context)
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

Para executar ações, retorne APENAS o JSON correspondente (sem texto antes ou depois):

1. query_database - Consultar o database (PostgreSQL, apenas SELECT)
   {"action": "query_database", "sql": "SELECT ... FROM ... WHERE \\"teamId\\" = '${teamId}' ..."}

2. call_service - Executar operações (criar/editar/deletar)
   {"action": "call_service", "service": "ExpenseService", "method": "create", "params": {...}}

IMPORTANTE: Quando for executar uma ação, retorne SOMENTE o JSON puro, sem tags XML, sem texto explicativo.

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
║ update(id, data)                                              ║
║   Todos os campos são opcionais (atualiza apenas os enviados) ║
║                                                                ║
║ delete(id)                                                     ║
║   OBRIGATÓRIO: id                                             ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║ ContractService                                                ║
╠═══════════════════════════════════════════════════════════════╣
║ create(data)                                                   ║
║   OBRIGATÓRIO: clientName, projectName, totalValue, signedDate║
║   OPCIONAL: description, status, category, notes              ║
║                                                                ║
║ update(id, data)                                              ║
║   Todos os campos são opcionais                               ║
║                                                                ║
║ delete(id, options?)                                          ║
║   OBRIGATÓRIO: id                                             ║
║   OPCIONAL: options = {mode: "contract-only" | "contract-and-receivables"}║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║ ReceivableService                                              ║
╠═══════════════════════════════════════════════════════════════╣
║ create(data)                                                   ║
║   OBRIGATÓRIO: expectedDate, amount                           ║
║   OPCIONAL: contractId, status, receivedDate, receivedAmount, ║
║             invoiceNumber, category, clientName, description, ║
║             notes                                              ║
║                                                                ║
║ update(id, data)                                              ║
║   Todos os campos são opcionais                               ║
║                                                                ║
║ delete(id)                                                     ║
║   OBRIGATÓRIO: id                                             ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║ RecurringExpenseService                                        ║
╠═══════════════════════════════════════════════════════════════╣
║ create(data)                                                   ║
║   OBRIGATÓRIO: description, amount, category, frequency,      ║
║                startDate                                       ║
║   OPCIONAL: endDate, dayOfMonth, dayOfWeek, notes             ║
║                                                                ║
║ update(id, data)                                              ║
║   Todos os campos são opcionais                               ║
║                                                                ║
║ delete(id)                                                     ║
║   OBRIGATÓRIO: id                                             ║
╚═══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGRAS IMPORTANTES:

1. TEAM ISOLATION: SEMPRE filtre queries por teamId = '${teamId}'
   Exemplo: WHERE "teamId" = '${teamId}'

2. INFERÊNCIA: Para campos obrigatórios, você pode inferir valores óbvios:
   • Datas: "ontem" = ${yesterday}, "hoje" = ${today}
   • Categorias: "gasolina" → Transporte, "almoço" → Alimentação
   • Valores: "cinquenta reais" → 50.00

3. AMBIGUIDADE: Se a solicitação for ambígua ou faltar informação crucial,
   faça perguntas de acompanhamento antes de executar.

   Exemplos de quando perguntar:
   • "Atualiza a despesa" → Qual despesa? (precisa query_database)
   • "Cria um contrato da Mari" → Qual o valor? Data de assinatura?
   • "Deleta o contrato" → Qual contrato? Tem recebíveis vinculados?

4. IMPOSSIBILIDADE: Se a solicitação for impossível, explique o porquê.
   • "Deleta todas as despesas" → Muito perigoso, peça confirmação específica
   • "Cria recebível de R$0" → Valor deve ser positivo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WORKFLOW OBRIGATÓRIO:

Para CONSULTAS:
1. Use query_database
2. Formate a resposta de forma amigável
3. Não retorne JSON bruto para o usuário

Para CRIAR:
1. Extrair dados da mensagem do usuário
2. Mostrar PRÉVIA formatada com emojis
3. Pedir confirmação ("Confirma?")
4. Aguardar confirmação
5. Executar call_service

Para ATUALIZAR/DELETAR:
1. Use query_database para encontrar o registro
2. Se encontrar múltiplos: liste e peça clarificação
3. Se encontrar 1: mostre PRÉVIA do que vai fazer
4. Pedir confirmação
5. Executar call_service

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
    if (!action && responseText.includes('"action"')) {
      try {
        const jsonStart = responseText.indexOf('{')
        const jsonEnd = responseText.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = responseText.substring(jsonStart, jsonEnd + 1)
          action = JSON.parse(jsonStr)
          console.log('[Operations] Extracted inline JSON:', action)
        }
      } catch (error) {
        console.error('[Operations] JSON parse error:', error)
      }
    }

    if (action) {
      try {
        // QUERY DATABASE
        if (action.action === 'query_database' && action.sql) {
          const results = await this.executeQuery(action.sql)
          const resultsMessage = `Resultados da consulta: ${JSON.stringify(results, null, 2)}`

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

          return {
            success: true,
            message: followUpContent.text,
            conversationHistory: [
              ...updatedHistory,
              { role: 'assistant' as const, content: followUpContent.text }
            ]
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

    // Normal conversation or preview
    return {
      success: true,
      message: responseText,
      conversationHistory: [
        ...history,
        { role: 'user' as const, content: message },
        { role: 'assistant' as const, content: responseText }
      ]
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
      // Add other services here when needed
      // ContractService: this.contractService,
      // ReceivableService: this.receivableService,
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
      result = await serviceInstance[method](params)
    } else if (method === 'update') {
      result = await serviceInstance[method](params.id, params.data)
    } else if (method === 'delete') {
      result = await serviceInstance[method](params.id)
    } else {
      // Generic call for other methods
      result = await serviceInstance[method](params)
    }

    // Format success message based on entity type
    let successMessage = ''

    if (method === 'delete') {
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

    return {
      success: true,
      message: successMessage,
      conversationHistory: [
        ...history,
        { role: 'user' as const, content: message },
        { role: 'assistant' as const, content: successMessage }
      ]
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
