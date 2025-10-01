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
import {
  parseNaturalDate,
  inferExpenseCategory,
  inferReceivableCategory,
  fuzzyMatch,
  findBestMatch,
  findAllMatches,
  parseBrazilianCurrency
} from '@/lib/ai/smart-inference'

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

      switch (intent.operation) {
        case 'create':
          result = await this.executeCreate(intent.entityType, entityData)
          break
        case 'update':
          result = await this.executeUpdate(intent.entityType, intent.parameters.entityId, entityData)
          break
        case 'delete':
          result = await this.executeDelete(intent.entityType, entityData.id)
          break
        default:
          throw new Error('Unknown operation type')
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
   * Execute create operation via service layer
   */
  private async executeCreate(entityType: string, entityData: any): Promise<any> {
    switch (entityType) {
      case 'contract':
        return await this.contractService.create(entityData)
      case 'receivable':
        return await this.receivableService.create(entityData)
      case 'expense':
        return await this.expenseService.create(entityData)
      case 'recurring_expense':
        return await this.recurringExpenseService.create(entityData)
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
  }

  /**
   * Execute update operation via service layer
   */
  private async executeUpdate(entityType: string, entityId: string, updateData: any): Promise<any> {
    switch (entityType) {
      case 'contract':
        return await this.contractService.update(entityId, updateData)
      case 'receivable':
        return await this.receivableService.update(entityId, updateData)
      case 'expense':
        return await this.expenseService.update(entityId, updateData)
      case 'recurring_expense':
        return await this.recurringExpenseService.update(entityId, updateData)
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
  }

  /**
   * Execute delete operation via service layer
   */
  private async executeDelete(entityType: string, entityId: string): Promise<any> {
    switch (entityType) {
      case 'contract':
        // For contracts, use simple deletion (contract-only mode)
        return await this.contractService.delete(entityId, { mode: 'contract-only' })
      case 'receivable':
        return await this.receivableService.delete(entityId)
      case 'expense':
        return await this.expenseService.delete(entityId)
      case 'recurring_expense':
        return await this.recurringExpenseService.delete(entityId)
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
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
    try {
      // Prepare entity data with smart inference
      const entityData = await this.prepareEntityData(intent, conversationState)

      if (!entityData) {
        return {
          success: false,
          clarificationNeeded: true,
          clarificationQuestion: 'Não consegui entender o que você quer criar. Pode fornecer mais detalhes?'
        }
      }

      // Generate preview message
      const preview = await this.generatePreview(intent.entityType, 'create', entityData)

      // Return pending operation for confirmation
      const pendingOperation: PendingOperation = {
        intent,
        preview,
        entityData,
        confirmationRequired: true
      }

      return {
        success: false,
        needsConfirmation: true,
        message: `${preview}\n\nConfirma?`,
        pendingOperation
      }
    } catch (error) {
      console.error('handleCreate error:', error)
      return {
        success: false,
        message: `Erro ao preparar criação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Prepare entity data from intent with smart inference
   */
  private async prepareEntityData(
    intent: Intent,
    conversationState?: ConversationState
  ): Promise<any | null> {
    const params = intent.parameters

    switch (intent.entityType) {
      case 'expense':
        return await this.prepareExpenseData(params, conversationState)
      case 'receivable':
        return await this.prepareReceivableData(params, conversationState)
      case 'contract':
        return await this.prepareContractData(params, conversationState)
      case 'recurring_expense':
        return await this.prepareRecurringExpenseData(params, conversationState)
      default:
        return null
    }
  }

  /**
   * Prepare expense data with smart inference
   */
  private async prepareExpenseData(
    params: Record<string, any>,
    conversationState?: ConversationState
  ): Promise<any> {
    // Parse date
    let dueDate = params.date
    if (typeof params.date === 'string') {
      const parsed = parseNaturalDate(params.date)
      if (parsed) dueDate = parsed
    }

    // Infer category if not provided
    let category = params.category
    if (!category && params.description) {
      category = inferExpenseCategory(params.description)
    }

    // Parse amount if string
    let amount = params.amount
    if (typeof amount === 'string') {
      amount = parseBrazilianCurrency(amount)
    }

    return {
      description: params.description || 'Despesa',
      amount,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      category: category || 'other',
      status: params.status || 'pending',
      vendor: params.vendor || null,
      invoiceNumber: params.invoiceNumber || null,
      notes: params.notes || null,
      contractId: params.contractId || null,
      type: params.type || 'operational',
      isRecurring: false
    }
  }

  /**
   * Prepare receivable data with smart inference
   */
  private async prepareReceivableData(
    params: Record<string, any>,
    conversationState?: ConversationState
  ): Promise<any> {
    // Parse date
    let expectedDate = params.date || params.expectedDate
    if (typeof expectedDate === 'string') {
      const parsed = parseNaturalDate(expectedDate)
      if (parsed) expectedDate = parsed
    }

    // Parse amount
    let amount = params.amount
    if (typeof amount === 'string') {
      amount = parseBrazilianCurrency(amount)
    }

    // Find contract by project name if provided
    let contractId = params.contractId
    if (!contractId && params.projectName) {
      const contracts = await this.contractService.findMany({}, { limit: 100 })
      const match = findBestMatch(
        params.projectName,
        contracts,
        (c: any) => c.projectName,
        0.6
      )

      if (match) {
        contractId = match.entity.id
      } else {
        // Check for multiple matches
        const allMatches = findAllMatches(
          params.projectName,
          contracts,
          (c: any) => c.projectName,
          0.5
        )

        if (allMatches.length > 1) {
          throw new Error(
            `Encontrei ${allMatches.length} projetos parecidos com "${params.projectName}". ` +
            `Pode especificar qual? ${allMatches.slice(0, 3).map((m, i) => `${i + 1}. ${m.entity.projectName}`).join(', ')}`
          )
        }
      }
    }

    // Infer category
    let category = params.category
    if (!category && params.description) {
      category = inferReceivableCategory(params.description)
    }

    return {
      contractId: contractId || null,
      expectedDate: expectedDate || new Date().toISOString().split('T')[0],
      amount,
      status: params.status || 'pending',
      receivedDate: null,
      receivedAmount: null,
      invoiceNumber: params.invoiceNumber || null,
      category: category || null,
      notes: params.notes || null,
      clientName: params.clientName || null,
      description: params.description || 'Recebível'
    }
  }

  /**
   * Prepare contract data with smart inference
   */
  private async prepareContractData(
    params: Record<string, any>,
    conversationState?: ConversationState
  ): Promise<any> {
    // Parse signed date
    let signedDate = params.date || params.signedDate
    if (typeof signedDate === 'string') {
      const parsed = parseNaturalDate(signedDate)
      if (parsed) signedDate = parsed
    }

    // Parse total value
    let totalValue = params.amount || params.totalValue
    if (typeof totalValue === 'string') {
      totalValue = parseBrazilianCurrency(totalValue)
    }

    return {
      clientName: params.clientName || 'Cliente',
      projectName: params.projectName || 'Projeto',
      description: params.description || '',
      totalValue,
      signedDate: signedDate || new Date().toISOString().split('T')[0],
      status: params.status || 'draft',
      category: params.category || null,
      notes: params.notes || null
    }
  }

  /**
   * Prepare recurring expense data with smart inference
   */
  private async prepareRecurringExpenseData(
    params: Record<string, any>,
    conversationState?: ConversationState
  ): Promise<any> {
    // Parse start date
    let startDate = params.date || params.startDate
    if (typeof startDate === 'string') {
      const parsed = parseNaturalDate(startDate)
      if (parsed) startDate = parsed
    }

    // Parse amount
    let amount = params.amount
    if (typeof amount === 'string') {
      amount = parseBrazilianCurrency(amount)
    }

    // Infer category
    let category = params.category
    if (!category && params.description) {
      category = inferExpenseCategory(params.description)
    }

    // Infer frequency from keywords
    let frequency = params.frequency || 'monthly'
    if (params.description) {
      const desc = params.description.toLowerCase()
      if (/mensal|mês|todo mês/.test(desc)) frequency = 'monthly'
      if (/semanal|semana|toda semana/.test(desc)) frequency = 'weekly'
      if (/anual|ano|todo ano/.test(desc)) frequency = 'yearly'
    }

    return {
      description: params.description || 'Despesa Recorrente',
      amount,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: params.endDate || null,
      frequency,
      category: category || 'other',
      vendor: params.vendor || null,
      notes: params.notes || null,
      isActive: true
    }
  }

  /**
   * Generate preview message for confirmation
   */
  private async generatePreview(
    entityType: string,
    operation: string,
    data: any
  ): Promise<string> {
    const entityNames = {
      contract: 'contrato',
      receivable: 'recebível',
      expense: 'despesa',
      recurring_expense: 'despesa recorrente'
    }

    const entityName = entityNames[entityType as keyof typeof entityNames] || 'entidade'
    const verb = operation === 'create' ? 'criar' : operation === 'update' ? 'atualizar' : 'deletar'

    let preview = `Vou ${verb} ${entityName === 'despesa' ? 'uma' : 'um'} ${entityName}:\n`

    switch (entityType) {
      case 'expense':
        preview += `• Descrição: ${data.description}\n`
        preview += `• Valor: R$ ${data.amount?.toFixed(2).replace('.', ',')}\n`
        preview += `• Data: ${this.formatDate(data.dueDate)}\n`
        if (data.category) preview += `• Categoria: ${this.translateCategory(data.category)}\n`
        break

      case 'receivable':
        preview += `• Valor: R$ ${data.amount?.toFixed(2).replace('.', ',')}\n`
        preview += `• Data esperada: ${this.formatDate(data.expectedDate)}\n`
        if (data.description) preview += `• Descrição: ${data.description}\n`
        if (data.contractId) preview += `• Vinculado a projeto\n`
        break

      case 'contract':
        preview += `• Cliente: ${data.clientName}\n`
        preview += `• Projeto: ${data.projectName}\n`
        preview += `• Valor: R$ ${data.totalValue?.toFixed(2).replace('.', ',')}\n`
        preview += `• Data: ${this.formatDate(data.signedDate)}\n`
        break

      case 'recurring_expense':
        preview += `• Descrição: ${data.description}\n`
        preview += `• Valor: R$ ${data.amount?.toFixed(2).replace('.', ',')}\n`
        preview += `• Frequência: ${this.translateFrequency(data.frequency)}\n`
        preview += `• Início: ${this.formatDate(data.startDate)}\n`
        break
    }

    return preview.trim()
  }

  /**
   * Format date from ISO to Brazilian format
   */
  private formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  /**
   * Translate category to Portuguese
   */
  private translateCategory(category: string): string {
    const translations: Record<string, string> = {
      transport: 'Transporte',
      meals: 'Alimentação',
      office: 'Escritório',
      software: 'Software',
      utilities: 'Utilidades',
      rent: 'Aluguel',
      marketing: 'Marketing',
      'professional-services': 'Serviços Profissionais',
      materials: 'Materiais',
      labor: 'Mão de Obra',
      equipment: 'Equipamentos',
      other: 'Outros'
    }
    return translations[category] || category
  }

  /**
   * Translate frequency to Portuguese
   */
  private translateFrequency(frequency: string): string {
    const translations: Record<string, string> = {
      daily: 'Diária',
      weekly: 'Semanal',
      monthly: 'Mensal',
      yearly: 'Anual'
    }
    return translations[frequency] || frequency
  }

  /**
   * Handle update operation
   */
  private async handleUpdate(
    intent: Intent,
    conversationState?: ConversationState
  ): Promise<CommandResult> {
    try {
      // Find entity to update using fuzzy matching
      const entity = await this.findEntity(intent, conversationState)

      if (!entity) {
        return {
          success: false,
          clarificationNeeded: true,
          clarificationQuestion: 'Não encontrei a entidade que você quer atualizar. Pode fornecer mais detalhes?'
        }
      }

      if (Array.isArray(entity)) {
        // Multiple matches found
        return {
          success: false,
          clarificationNeeded: true,
          clarificationQuestion: this.formatMultipleMatchesMessage(entity, intent.entityType)
        }
      }

      // Prepare update data
      const updateData = await this.prepareUpdateData(intent, entity)

      // Generate preview
      const preview = await this.generateUpdatePreview(intent.entityType, entity, updateData)

      const pendingOperation: PendingOperation = {
        intent: { ...intent, parameters: { ...intent.parameters, entityId: entity.id } },
        preview,
        entityData: updateData,
        confirmationRequired: true
      }

      return {
        success: false,
        needsConfirmation: true,
        message: `${preview}\n\nConfirma?`,
        pendingOperation
      }
    } catch (error) {
      console.error('handleUpdate error:', error)
      return {
        success: false,
        message: `Erro ao preparar atualização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Handle delete operation
   */
  private async handleDelete(
    intent: Intent,
    conversationState?: ConversationState
  ): Promise<CommandResult> {
    try {
      // Find entity to delete using fuzzy matching
      const entity = await this.findEntity(intent, conversationState)

      if (!entity) {
        return {
          success: false,
          clarificationNeeded: true,
          clarificationQuestion: 'Não encontrei a entidade que você quer deletar. Pode fornecer mais detalhes?'
        }
      }

      if (Array.isArray(entity)) {
        // Multiple matches found
        return {
          success: false,
          clarificationNeeded: true,
          clarificationQuestion: this.formatMultipleMatchesMessage(entity, intent.entityType)
        }
      }

      // Generate delete preview
      const preview = await this.generateDeletePreview(intent.entityType, entity)

      const pendingOperation: PendingOperation = {
        intent: { ...intent, parameters: { ...intent.parameters, entityId: entity.id } },
        preview,
        entityData: { id: entity.id },
        confirmationRequired: true
      }

      return {
        success: false,
        needsConfirmation: true,
        message: `${preview}\n\n⚠️  Esta ação não pode ser desfeita. Confirma?`,
        pendingOperation
      }
    } catch (error) {
      console.error('handleDelete error:', error)
      return {
        success: false,
        message: `Erro ao preparar deleção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Find entity using fuzzy matching
   */
  private async findEntity(
    intent: Intent,
    conversationState?: ConversationState
  ): Promise<any | any[] | null> {
    const params = intent.parameters
    const searchTerm = params.projectName || params.clientName || params.description

    if (!searchTerm) {
      return null
    }

    switch (intent.entityType) {
      case 'contract': {
        const contracts = await this.contractService.findMany({}, { limit: 100 })
        const matches = findAllMatches(
          searchTerm,
          contracts,
          (c: any) => c.projectName || c.clientName,
          0.5
        )

        if (matches.length === 0) return null
        if (matches.length === 1) return matches[0].entity
        if (matches.length > 1 && matches[0].score > 0.8) return matches[0].entity
        return matches.slice(0, 5).map(m => m.entity)
      }

      case 'receivable': {
        const receivables = await this.receivableService.findMany({}, { limit: 100 })
        const matches = findAllMatches(
          searchTerm,
          receivables,
          (r: any) => r.description || r.clientName || '',
          0.5
        )

        if (matches.length === 0) return null
        if (matches.length === 1) return matches[0].entity
        if (matches.length > 1 && matches[0].score > 0.8) return matches[0].entity
        return matches.slice(0, 5).map(m => m.entity)
      }

      case 'expense': {
        const expenses = await this.expenseService.findMany({}, { limit: 100 })
        const matches = findAllMatches(
          searchTerm,
          expenses,
          (e: any) => e.description || '',
          0.5
        )

        if (matches.length === 0) return null
        if (matches.length === 1) return matches[0].entity
        if (matches.length > 1 && matches[0].score > 0.8) return matches[0].entity
        return matches.slice(0, 5).map(m => m.entity)
      }

      case 'recurring_expense': {
        const expenses = await this.recurringExpenseService.findMany({}, { limit: 100 })
        const matches = findAllMatches(
          searchTerm,
          expenses,
          (e: any) => e.description || '',
          0.5
        )

        if (matches.length === 0) return null
        if (matches.length === 1) return matches[0].entity
        if (matches.length > 1 && matches[0].score > 0.8) return matches[0].entity
        return matches.slice(0, 5).map(m => m.entity)
      }

      default:
        return null
    }
  }

  /**
   * Prepare update data from intent
   */
  private async prepareUpdateData(intent: Intent, existingEntity: any): Promise<any> {
    const params = intent.parameters
    const updates: any = {}

    // Parse and update fields that were provided
    if (params.amount !== undefined) {
      updates.amount = typeof params.amount === 'string'
        ? parseBrazilianCurrency(params.amount)
        : params.amount
    }

    if (params.date !== undefined) {
      const parsed = parseNaturalDate(params.date)
      if (parsed) {
        // Map to appropriate field based on entity type
        if (intent.entityType === 'expense') updates.dueDate = parsed
        if (intent.entityType === 'receivable') updates.expectedDate = parsed
        if (intent.entityType === 'contract') updates.signedDate = parsed
        if (intent.entityType === 'recurring_expense') updates.startDate = parsed
      }
    }

    if (params.status !== undefined) {
      updates.status = params.status
    }

    if (params.category !== undefined) {
      updates.category = params.category
    }

    if (params.description !== undefined) {
      updates.description = params.description
    }

    if (params.clientName !== undefined) {
      updates.clientName = params.clientName
    }

    if (params.projectName !== undefined) {
      updates.projectName = params.projectName
    }

    return updates
  }

  /**
   * Generate update preview message
   */
  private async generateUpdatePreview(
    entityType: string,
    existingEntity: any,
    updateData: any
  ): Promise<string> {
    const entityNames = {
      contract: 'contrato',
      receivable: 'recebível',
      expense: 'despesa',
      recurring_expense: 'despesa recorrente'
    }

    const entityName = entityNames[entityType as keyof typeof entityNames] || 'entidade'
    let preview = `Vou atualizar ${entityName === 'despesa' ? 'a' : 'o'} ${entityName}:\n`

    // Show what's being updated
    const updates: string[] = []
    if (updateData.amount !== undefined) {
      updates.push(`Valor: R$ ${updateData.amount.toFixed(2).replace('.', ',')}`)
    }
    if (updateData.dueDate || updateData.expectedDate || updateData.signedDate || updateData.startDate) {
      const date = updateData.dueDate || updateData.expectedDate || updateData.signedDate || updateData.startDate
      updates.push(`Data: ${this.formatDate(date)}`)
    }
    if (updateData.status) {
      updates.push(`Status: ${updateData.status}`)
    }
    if (updateData.category) {
      updates.push(`Categoria: ${this.translateCategory(updateData.category)}`)
    }
    if (updateData.description) {
      updates.push(`Descrição: ${updateData.description}`)
    }

    preview += updates.map(u => `• ${u}`).join('\n')

    return preview.trim()
  }

  /**
   * Generate delete preview message
   */
  private async generateDeletePreview(entityType: string, entity: any): Promise<string> {
    const entityNames = {
      contract: 'contrato',
      receivable: 'recebível',
      expense: 'despesa',
      recurring_expense: 'despesa recorrente'
    }

    const entityName = entityNames[entityType as keyof typeof entityNames] || 'entidade'
    let preview = `Vou deletar ${entityName === 'despesa' ? 'a' : 'o'} ${entityName}:\n`

    switch (entityType) {
      case 'contract':
        preview += `• Projeto: ${entity.projectName}\n`
        preview += `• Cliente: ${entity.clientName}\n`
        break
      case 'receivable':
        preview += `• Descrição: ${entity.description || 'Recebível'}\n`
        preview += `• Valor: R$ ${entity.amount?.toFixed(2).replace('.', ',')}\n`
        break
      case 'expense':
        preview += `• Descrição: ${entity.description}\n`
        preview += `• Valor: R$ ${entity.amount?.toFixed(2).replace('.', ',')}\n`
        break
      case 'recurring_expense':
        preview += `• Descrição: ${entity.description}\n`
        preview += `• Frequência: ${this.translateFrequency(entity.frequency)}\n`
        break
    }

    return preview.trim()
  }

  /**
   * Format multiple matches message for clarification
   */
  private formatMultipleMatchesMessage(entities: any[], entityType: string): string {
    const entityNames = {
      contract: 'projetos',
      receivable: 'recebíveis',
      expense: 'despesas',
      recurring_expense: 'despesas recorrentes'
    }

    const entityName = entityNames[entityType as keyof typeof entityNames] || 'entidades'
    let message = `Encontrei ${entities.length} ${entityName} parecidos:\n`

    entities.forEach((entity, index) => {
      let identifier = ''
      switch (entityType) {
        case 'contract':
          identifier = `${entity.projectName} (${entity.clientName})`
          break
        case 'receivable':
          identifier = `${entity.description || 'Recebível'} - R$ ${entity.amount?.toFixed(2)}`
          break
        case 'expense':
        case 'recurring_expense':
          identifier = `${entity.description} - R$ ${entity.amount?.toFixed(2)}`
          break
      }
      message += `${index + 1}. ${identifier}\n`
    })

    message += '\nQual deles você quer modificar?'
    return message.trim()
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
