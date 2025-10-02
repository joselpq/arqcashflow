/**
 * Operations Agent Service - Step 3: Simplified (Trust Claude Completely)
 *
 * Give Claude full instructions and conversation context.
 * Let Claude handle the entire flow naturally.
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

    const systemPrompt = `Você é um assistente financeiro para ArqCashflow.

CONTEXTO:
- Data de hoje: ${today}
- Moeda: Real brasileiro (R$)

BANCO DE DADOS - Despesas (Expense):
- description: string (descrição curta)
- amount: decimal (valor positivo)
- dueDate: YYYY-MM-DD (padrão: hoje se não especificado)
- category: string (uma das categorias abaixo)
- notes: string (opcional)

CATEGORIAS VÁLIDAS:
- "Alimentação" (almoço, jantar, café, restaurante, comida...)
- "Transporte" (gasolina, uber, taxi, combustível, estacionamento...)
- "Materiais" (material, compra, insumo, equipamento...)
- "Serviços" (serviço, consultoria, manutenção...)
- "Escritório" (aluguel, conta, internet, telefone, luz...)
- "Outros" (quando não se encaixa em nenhuma)

FLUXO PARA CRIAR DESPESA:
1. Usuário pede para criar despesa (ex: "R$50 em gasolina")
2. Você extrai os dados e mostra prévia formatada:

   Vou criar uma despesa:
   📝 [description]
   💰 R$ [amount]
   📅 [date em pt-BR]
   🏷️ [category]

   Confirma?

3. Usuário confirma (sim, ok, pode, etc) → você cria a despesa com JSON:
   {"action": "create_expense", "data": {"description": "...", "amount": 50.00, "dueDate": "2025-10-02", "category": "Transporte", "notes": null}}

4. Usuário rejeita (não, cancela, etc) → você responde "❌ Operação cancelada."

IMPORTANTE:
- Para datas: "ontem" = dia anterior, "hoje" = ${today}, "amanhã" = próximo dia
- Se faltar informação, pergunte ao usuário
- Para conversa normal (não sobre despesas), responda normalmente em português SEM JSON
- Seja amigável e objetivo`

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [...history, { role: 'user' as const, content: message }]
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response')

    const responseText = content.text.trim()

    // Check if Claude wants to create an expense
    // Extract JSON if it's embedded in the response
    let action = null
    if (responseText.includes('"action"')) {
      try {
        // Find JSON in the response (may have text before/after)
        const jsonStart = responseText.indexOf('{')
        const jsonEnd = responseText.lastIndexOf('}')

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = responseText.substring(jsonStart, jsonEnd + 1)
          action = JSON.parse(jsonStr)
        }
      } catch (error) {
        console.error('[Operations] JSON parse error:', error)
        console.error('[Operations] Response was:', responseText)
      }
    }

    if (action) {
      try {

        if (action.action === 'create_expense' && action.data) {
          // Create the expense
          const expense = await this.expenseService.create({
            description: action.data.description,
            amount: action.data.amount,
            dueDate: action.data.dueDate,
            category: action.data.category,
            notes: action.data.notes || undefined
          })

          const successMessage = `✅ Despesa criada com sucesso!

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
      } catch (error) {
        const errorMessage = `❌ Erro ao criar despesa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`

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
}
