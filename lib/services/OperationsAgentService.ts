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
    const teamId = this.context.teamId

    const systemPrompt = `Você é um assistente financeiro para ArqCashflow.

CONTEXTO:
- Data de hoje: ${today}
- Team ID: ${teamId}
- Moeda: Real brasileiro (R$)

DATABASE SCHEMA (PostgreSQL):
Tabela "Expense":
- id: TEXT (Primary Key)
- teamId: TEXT (sempre '${teamId}')
- description: TEXT
- amount: DECIMAL
- dueDate: TIMESTAMP
- category: TEXT (Alimentação, Transporte, Materiais, Serviços, Escritório, Outros)
- status: TEXT
- notes: TEXT
- createdAt: TIMESTAMP

FERRAMENTAS DISPONÍVEIS:

1. query_database - Consultar despesas
   {"action": "query_database", "sql": "SELECT * FROM \"Expense\" WHERE \"teamId\" = '${teamId}' AND ..."}

2. create_expense - Criar despesa
   {"action": "create_expense", "data": {"description": "...", "amount": 50.00, "dueDate": "2025-10-02", "category": "Transporte"}}

3. update_expense - Atualizar despesa (precisa do ID)
   {"action": "update_expense", "id": "expense-id", "data": {"amount": 60}}

4. delete_expense - Deletar despesa (precisa do ID)
   {"action": "delete_expense", "id": "expense-id"}

FLUXO:

Para CRIAR: Extrair dados → Mostrar prévia → Confirmar → Criar

Para ATUALIZAR/DELETAR:
1. Use query_database para encontrar a despesa
2. Analise os resultados (você verá na conversa)
3. Se encontrar 1: mostre prévia e peça confirmação
4. Se encontrar múltiplos: liste e peça clarificação
5. Se usuário confirmar: use update_expense ou delete_expense com o ID que você viu nos resultados

IMPORTANTE:
- Você vê os resultados das queries na conversa
- Use os IDs que você encontrou para update/delete
- Se a solicitação for ambígua, peça clarificação
- Para conversa normal, responda em português SEM JSON`

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
    if (responseText.includes('"action"')) {
      try {
        const jsonStart = responseText.indexOf('{')
        const jsonEnd = responseText.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1) {
          action = JSON.parse(responseText.substring(jsonStart, jsonEnd + 1))
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

        // CREATE EXPENSE
        if (action.action === 'create_expense' && action.data) {
          const expense = await this.expenseService.create({
            description: action.data.description,
            amount: action.data.amount,
            dueDate: action.data.dueDate,
            category: action.data.category,
            notes: action.data.notes || undefined
          })

          const successMessage = `✅ Despesa criada!

📝 ${expense.description}
💰 R$ ${expense.amount.toFixed(2)}
📅 ${new Date(expense.dueDate).toLocaleDateString('pt-BR')}
🏷️ ${expense.category}`

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

        // UPDATE EXPENSE
        if (action.action === 'update_expense' && action.id && action.data) {
          const expense = await this.expenseService.update(action.id, action.data)

          if (!expense) {
            return {
              success: false,
              message: '❌ Despesa não encontrada.',
              conversationHistory: [
                ...history,
                { role: 'user' as const, content: message },
                { role: 'assistant' as const, content: '❌ Despesa não encontrada.' }
              ]
            }
          }

          const successMessage = `✅ Despesa atualizada!

📝 ${expense.description}
💰 R$ ${expense.amount.toFixed(2)}
📅 ${new Date(expense.dueDate).toLocaleDateString('pt-BR')}
🏷️ ${expense.category}`

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

        // DELETE EXPENSE
        if (action.action === 'delete_expense' && action.id) {
          await this.expenseService.delete(action.id)

          const successMessage = `✅ Despesa deletada com sucesso!`

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
