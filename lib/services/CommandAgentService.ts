/**
 * CommandAgentService - Natural Language CRUD Operations
 *
 * AI-powered command agent for creating, updating, and deleting financial entities
 * using natural language. Completes the AI Trinity (Setup → Query → Command).
 *
 * Flow:
 * 1. Intent Classification: Identify operation (create/update/delete) and entity type
 * 2. Parameter Extraction: Extract values from natural language
 * 3. Smart Inference: Fill missing data from context and database
 * 4. Ambiguity Resolution: Ask clarifying questions when needed
 * 5. Confirmation: Preview operation and get user approval
 * 6. Execution: Execute via service layer with audit logging
 * 7. Response: Natural language confirmation with details
 *
 * Architecture:
 * - Uses ServiceContext pattern (like FinancialQueryService)
 * - Does NOT extend BaseService (orchestrates other services)
 * - Team isolation via existing service layer
 * - Integrates with Query Agent and Setup Assistant as tools
 */

import Anthropic from '@anthropic-ai/sdk'
import { ServiceContext } from './BaseService'
import { ContractService } from './ContractService'
import { ReceivableService } from './ReceivableService'
import { ExpenseService } from './ExpenseService'
import { RecurringExpenseService } from './RecurringExpenseService'
import { FinancialQueryService } from './FinancialQueryService'

/**
 * Conversation state for context retention
 */
export interface ConversationState {
  messages: ConversationMessage[]
  pendingOperation?: PendingOperation
  lastEntities?: {
    contract?: any
    receivable?: any
    expense?: any
    recurringExpense?: any
  }
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

/**
 * Intent classification result
 */
export interface Intent {
  operation: 'create' | 'update' | 'delete' | 'query' | 'unknown'
  entityType: 'contract' | 'receivable' | 'expense' | 'recurring_expense' | 'unknown'
  confidence: number
  parameters: Record<string, any>
  ambiguities: string[]
  needsClarification: boolean
}

/**
 * Pending operation awaiting confirmation
 */
export interface PendingOperation {
  intent: Intent
  preview: string
  entityData: any
  confirmationRequired: boolean
}

/**
 * Command execution result
 */
export interface CommandResult {
  success: boolean
  message: string
  data?: any
  needsConfirmation?: boolean
  pendingOperation?: PendingOperation
  clarificationNeeded?: boolean
  clarificationQuestion?: string
  suggestedActions?: string[]
}

export class CommandAgentService {
  private anthropic: Anthropic
  private context: ServiceContext

  // Service layer instances
  private contractService: ContractService
  private receivableService: ReceivableService
  private expenseService: ExpenseService
  private recurringExpenseService: RecurringExpenseService
  private queryService: FinancialQueryService

  constructor(context: ServiceContext) {
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY not configured')
    }

    this.context = context
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    })

    // Initialize service layer instances
    this.contractService = new ContractService(context)
    this.receivableService = new ReceivableService(context)
    this.expenseService = new ExpenseService(context)
    this.recurringExpenseService = new RecurringExpenseService(context)
    this.queryService = new FinancialQueryService(context)
  }

  /**
   * Process a command from the user
   */
  async processCommand(
    command: string,
    conversationState?: ConversationState
  ): Promise<CommandResult> {
    try {
      // Step 1: Classify intent
      const intent = await this.classifyIntent(command, conversationState)

      // Step 2: Handle based on intent
      if (intent.needsClarification) {
        return this.requestClarification(intent)
      }

      // Step 3: Route to appropriate handler
      switch (intent.operation) {
        case 'create':
          return await this.handleCreate(intent, conversationState)
        case 'update':
          return await this.handleUpdate(intent, conversationState)
        case 'delete':
          return await this.handleDelete(intent, conversationState)
        case 'query':
          // Delegate to Financial Query Agent
          return await this.handleQuery(command, conversationState)
        default:
          return {
            success: false,
            message: 'Não entendi o que você quer fazer. Pode reformular?',
            clarificationNeeded: true
          }
      }
    } catch (error) {
      console.error('CommandAgentService error:', error)
      return {
        success: false,
        message: 'Desculpe, ocorreu um erro ao processar seu comando. Tente novamente.',
      }
    }
  }

  /**
   * Confirm a pending operation
   */
  async confirmOperation(
    conversationState: ConversationState,
    confirmed: boolean
  ): Promise<CommandResult> {
    if (!conversationState.pendingOperation) {
      return {
        success: false,
        message: 'Não há nenhuma operação pendente para confirmar.',
      }
    }

    if (!confirmed) {
      return {
        success: true,
        message: 'Ok, operação cancelada. Posso ajudar com algo mais?',
      }
    }

    // Execute the pending operation
    const { intent, entityData } = conversationState.pendingOperation

    try {
      let result: any

      switch (intent.entityType) {
        case 'contract':
          result = await this.contractService.create(entityData)
          break
        case 'receivable':
          result = await this.receivableService.create(entityData)
          break
        case 'expense':
          result = await this.expenseService.create(entityData)
          break
        case 'recurring_expense':
          result = await this.recurringExpenseService.create(entityData)
          break
        default:
          throw new Error('Unknown entity type')
      }

      return {
        success: true,
        message: await this.formatSuccessMessage(intent.entityType, intent.operation, result),
        data: result
      }
    } catch (error) {
      console.error('Operation execution error:', error)
      return {
        success: false,
        message: `Erro ao executar operação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      }
    }
  }

  /**
   * Classify user intent using Claude
   */
  private async classifyIntent(
    command: string,
    conversationState?: ConversationState
  ): Promise<Intent> {
    const prompt = this.buildIntentClassificationPrompt(command, conversationState)

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

    // Parse Claude's response as JSON
    try {
      const intent = JSON.parse(content.text)
      return intent
    } catch (error) {
      console.error('Failed to parse intent:', content.text)
      throw new Error('Failed to classify intent')
    }
  }

  /**
   * Build intent classification prompt
   */
  private buildIntentClassificationPrompt(
    command: string,
    conversationState?: ConversationState
  ): string {
    const today = new Date().toISOString().split('T')[0]

    let contextInfo = ''
    if (conversationState && conversationState.messages.length > 0) {
      contextInfo = `\nConversation history:\n${conversationState.messages.slice(-5).map(m =>
        `${m.role}: ${m.content}`
      ).join('\n')}\n`
    }

    return `You are an intent classifier for a financial management system. Analyze the user's command and classify it.

Current date: ${today}
Team ID: ${this.context.teamId}
${contextInfo}

User command: "${command}"

INTENT CLASSIFICATION RULES:

**Operations:**
- create: User wants to add new entity (criar, adicionar, registrar, lançar, incluir)
- update: User wants to modify existing entity (atualizar, mudar, editar, corrigir, modificar)
- delete: User wants to remove entity (deletar, remover, excluir, apagar)
- query: User wants to search/fetch data (mostre, quanto, quais, listar, buscar, encontrar)

**Entity Types:**
- contract: projeto, contrato, proposta, cliente (+ project name/client name)
- receivable: recebível, fatura, pagamento, RT, receber, receita
- expense: despesa, gasto, custo, conta, pagar
- recurring_expense: despesa recorrente, gasto fixo, mensalidade, assinatura

**Parameter Extraction:**
Extract these from natural language:
- amount: Values in Brazilian currency (R$50, 50 reais, cinquenta)
- date: Dates (ontem, hoje, amanhã, próxima semana, DD/MM, DD/MM/YYYY)
  - ontem = ${new Date(Date.now() - 86400000).toISOString().split('T')[0]}
  - hoje = ${today}
  - amanhã = ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
- category: For expenses (transporte, alimentação, escritório, etc.)
- description: Free text description
- clientName: Client/company name
- projectName: Project name
- status: Status keywords (pago, pendente, ativo, cancelado)

**Ambiguity Detection:**
Mark needsClarification=true if:
- Missing critical fields (amount for expense, project for receivable)
- Ambiguous references ("o projeto" without prior context)
- Multiple possible interpretations
- Date references that are unclear

**Response Format (JSON only, no extra text):**
{
  "operation": "create|update|delete|query|unknown",
  "entityType": "contract|receivable|expense|recurring_expense|unknown",
  "confidence": 0.0-1.0,
  "parameters": {
    "amount": number or null,
    "date": "YYYY-MM-DD" or null,
    "category": string or null,
    "description": string or null,
    "clientName": string or null,
    "projectName": string or null,
    "status": string or null,
    ...any other extracted fields
  },
  "ambiguities": ["list of ambiguous elements"],
  "needsClarification": boolean
}

EXAMPLES:

Input: "R$50 em gasolina ontem"
Output: {
  "operation": "create",
  "entityType": "expense",
  "confidence": 0.95,
  "parameters": {
    "amount": 50,
    "date": "${new Date(Date.now() - 86400000).toISOString().split('T')[0]}",
    "category": "transporte",
    "description": "gasolina"
  },
  "ambiguities": [],
  "needsClarification": false
}

Input: "R$400 de RT do projeto Mari"
Output: {
  "operation": "create",
  "entityType": "receivable",
  "confidence": 0.85,
  "parameters": {
    "amount": 400,
    "projectName": "Mari",
    "description": "RT"
  },
  "ambiguities": ["projectName: 'Mari' might match multiple projects"],
  "needsClarification": true
}

Analyze the command and respond ONLY with the JSON object, no other text.`
  }

  /**
   * Handle create operation
   */
  private async handleCreate(
    intent: Intent,
    conversationState?: ConversationState
  ): Promise<CommandResult> {
    // TODO: Implement smart inference and entity data preparation
    // TODO: Generate preview message
    // TODO: Return pending operation for confirmation

    return {
      success: false,
      message: 'Create operation not yet implemented',
    }
  }

  /**
   * Handle update operation
   */
  private async handleUpdate(
    intent: Intent,
    conversationState?: ConversationState
  ): Promise<CommandResult> {
    // TODO: Implement entity lookup and update logic

    return {
      success: false,
      message: 'Update operation not yet implemented',
    }
  }

  /**
   * Handle delete operation
   */
  private async handleDelete(
    intent: Intent,
    conversationState?: ConversationState
  ): Promise<CommandResult> {
    // TODO: Implement entity lookup and delete logic

    return {
      success: false,
      message: 'Delete operation not yet implemented',
    }
  }

  /**
   * Handle query operation (delegate to Financial Query Agent)
   */
  private async handleQuery(
    command: string,
    conversationState?: ConversationState
  ): Promise<CommandResult> {
    try {
      const history = conversationState?.messages.map(m => ({
        question: m.role === 'user' ? m.content : '',
        answer: m.role === 'assistant' ? m.content : ''
      })).filter(h => h.question || h.answer) || []

      const result = await this.queryService.query(command, history)

      return {
        success: true,
        message: result.answer,
        data: result
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao processar consulta. Tente reformular a pergunta.',
      }
    }
  }

  /**
   * Request clarification from user
   */
  private requestClarification(intent: Intent): CommandResult {
    let question = 'Preciso de mais informações. '

    if (intent.ambiguities.length > 0) {
      question += intent.ambiguities.join('. ')
    } else {
      question += 'Pode fornecer mais detalhes?'
    }

    return {
      success: false,
      clarificationNeeded: true,
      clarificationQuestion: question,
      message: question
    }
  }

  /**
   * Format success message for completed operation
   */
  private async formatSuccessMessage(
    entityType: string,
    operation: string,
    data: any
  ): Promise<string> {
    const entityName = {
      contract: 'contrato',
      receivable: 'recebível',
      expense: 'despesa',
      recurring_expense: 'despesa recorrente'
    }[entityType] || 'entidade'

    const operationName = {
      create: 'criado',
      update: 'atualizado',
      delete: 'deletado'
    }[operation] || 'processado'

    return `✅ ${entityName.charAt(0).toUpperCase() + entityName.slice(1)} ${operationName} com sucesso!`
  }
}
