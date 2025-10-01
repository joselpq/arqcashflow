/**
 * OperationsAgentService - Natural Language CRUD Operations
 *
 * AI-powered operations agent for creating, updating, and deleting financial entities
 * using natural language. Completes the AI Trinity (Setup → Query → Operations).
 *
 * Renamed from "CommandAgentService" (2025-10-01) to better reflect purpose
 * and avoid confusion with command-line terminology.
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
 * - Part of Phase 2: Unified AI Router System (ADR-008)
 */

import Anthropic from '@anthropic-ai/sdk'
import { ServiceContext } from './BaseService'
import { ContractService } from './ContractService'
import { ReceivableService } from './ReceivableService'
import { ExpenseService } from './ExpenseService'
import { RecurringExpenseService } from './RecurringExpenseService'
import { FinancialQueryService } from './FinancialQueryService'
import { getEntitySchema, getAllSchemasOverview } from '@/lib/ai/entity-schemas'
import {
  fuzzyMatch,
  findBestMatch,
  findAllMatches,
  parseBrazilianCurrency,
  parseNaturalDate
} from '@/lib/ai/fuzzy-match-utils'

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
  recentlyCreated?: RecentEntity[]
  lastReferencedEntities?: any[] // For "o primeiro", "o segundo" reference resolution
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    entityType?: string
    entityId?: string
    operation?: string
  }
}

export interface RecentEntity {
  type: 'contract' | 'receivable' | 'expense' | 'recurring_expense'
  id: string
  data: any
  createdAt: Date
}

/**
 * Intent classification result
 */
export interface Intent {
  operation: 'create' | 'update' | 'delete' | 'query' | 'unknown'
  entityType: 'contract' | 'receivable' | 'expense' | 'recurring_expense' | 'unknown'
  confidence: number
  parameters: Record<string, any>
  needsQuery?: boolean  // NEW: Does this operation need to query the database first?
  queryRequest?: string  // NEW: Natural language query for the Query Agent
  ambiguities: string[]
  needsClarification: boolean
  isBatch?: boolean
  batchCount?: number
  batchParameters?: {
    count: number
    interval?: 'days' | 'weeks' | 'months'
    intervalValue?: number
  }
  isBatchDelete?: boolean // For deleting multiple entities ("todos os recebíveis")
  deleteScope?: 'single' | 'multiple' | 'all' // Scope of delete operation
  cascadeDelete?: boolean // For contracts: delete associated receivables too
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

export class OperationsAgentService {
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

      // Step 2: Check if needs database lookup first (NEW: Query Agent integration)
      if (intent.needsQuery && intent.queryRequest) {
        console.log(`🔍 [Operations Agent] Needs database lookup: "${intent.queryRequest}"`)
        return await this.processWithQuerySupport(intent, conversationState, command)
      }

      // Step 3: Handle based on intent
      if (intent.needsClarification) {
        return this.requestClarification(intent)
      }

      // Step 4: Route to appropriate handler
      switch (intent.operation) {
        case 'create':
          return await this.handleCreate(intent, conversationState)
        case 'update':
          return await this.handleUpdate(intent, conversationState, command)
        case 'delete':
          return await this.handleDelete(intent, conversationState, command)
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
      console.error('OperationsAgentService error:', error)
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
          // Check if this is a batch operation
          if (intent.isBatch && Array.isArray(entityData)) {
            result = await this.executeBatchCreate(intent.entityType, entityData)
            // Track all created entities
            result.forEach((entity: any) => {
              this.trackRecentlyCreated(conversationState, intent.entityType, entity)
            })
          } else {
            result = await this.executeCreate(intent.entityType, entityData)
            // Track recently created entity for context
            this.trackRecentlyCreated(conversationState, intent.entityType, result)
          }
          break
        case 'update':
          result = await this.executeUpdate(intent.entityType, intent.parameters.entityId, entityData)
          break
        case 'delete':
          // Check if this is a batch delete
          if (entityData.entityIds && Array.isArray(entityData.entityIds)) {
            result = await this.executeBatchDelete(intent.entityType, entityData.entityIds)
          } else {
            result = await this.executeDelete(intent.entityType, entityData.id, entityData.cascadeDelete)
          }
          break
        default:
          throw new Error('Unknown operation type')
      }

      return {
        success: true,
        message: await this.formatSuccessMessage(intent.entityType, intent.operation, result, intent.isBatch),
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
   * Track recently created entities for context retention
   */
  private trackRecentlyCreated(
    conversationState: ConversationState,
    entityType: string,
    result: any
  ): void {
    if (!conversationState.recentlyCreated) {
      conversationState.recentlyCreated = []
    }

    conversationState.recentlyCreated.unshift({
      type: entityType as any,
      id: result.id,
      data: result,
      createdAt: new Date()
    })

    // Keep only last 10 entities
    if (conversationState.recentlyCreated.length > 10) {
      conversationState.recentlyCreated = conversationState.recentlyCreated.slice(0, 10)
    }

    // Also update lastEntities for quick reference
    if (!conversationState.lastEntities) {
      conversationState.lastEntities = {}
    }
    conversationState.lastEntities[entityType as keyof typeof conversationState.lastEntities] = result
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
   * Execute batch create operation via service layer
   */
  private async executeBatchCreate(entityType: string, entitiesData: any[]): Promise<any[]> {
    const results: any[] = []

    for (const entityData of entitiesData) {
      try {
        const result = await this.executeCreate(entityType, entityData)
        results.push(result)
      } catch (error) {
        console.error(`Error creating entity in batch:`, error)
        // Continue with other entities even if one fails
        results.push({ error: error instanceof Error ? error.message : 'Erro desconhecido', failed: true })
      }
    }

    return results
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
  private async executeDelete(entityType: string, entityId: string, cascadeDelete = false): Promise<any> {
    switch (entityType) {
      case 'contract':
        // For contracts, respect the cascade delete option
        const mode = cascadeDelete ? 'with-receivables' : 'contract-only'
        return await this.contractService.delete(entityId, { mode })
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
   * Execute batch delete operation
   */
  private async executeBatchDelete(entityType: string, entityIds: string[]): Promise<any[]> {
    const results: any[] = []

    for (const entityId of entityIds) {
      try {
        const result = await this.executeDelete(entityType, entityId)
        results.push({ success: true, id: entityId, data: result })
      } catch (error) {
        console.error(`Error deleting entity ${entityId}:`, error)
        results.push({ success: false, id: entityId, error: error instanceof Error ? error.message : 'Erro desconhecido' })
      }
    }

    return results
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
      // Remove markdown code blocks if present (```json ... ``` or ``` ... ```)
      let jsonText = content.text.trim()

      // Remove markdown code block syntax
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }

      const intent = JSON.parse(jsonText.trim())
      return intent
    } catch (error) {
      console.error('Failed to parse intent:', content.text)
      console.error('Parse error:', error)
      throw new Error('Failed to classify intent')
    }
  }

  /**
   * Build intent classification prompt (ADR-008 compliant: context-rich, not prescriptive)
   */
  private buildIntentClassificationPrompt(
    command: string,
    conversationState?: ConversationState
  ): string {
    const today = new Date().toISOString().split('T')[0]

    let conversationContext = ''
    if (conversationState && conversationState.messages.length > 0) {
      conversationContext = `\n## Recent Conversation\n${conversationState.messages.slice(-5).map(m =>
        `${m.role}: ${m.content}`
      ).join('\n')}\n`
    }

    let recentEntitiesContext = ''
    if (conversationState?.recentlyCreated && conversationState.recentlyCreated.length > 0) {
      recentEntitiesContext = `\n## Recently Created Entities (for context)\n`
      conversationState.recentlyCreated.slice(0, 5).forEach((entity, i) => {
        recentEntitiesContext += `${i + 1}. ${entity.type}: ${JSON.stringify(entity.data).substring(0, 100)}...\n`
      })
    }

    return `You are a financial command agent for ArqCashflow, a financial management system for small businesses.

# BUSINESS CONTEXT

Current date: ${today}
Team ID: ${this.context.teamId}
Primary language: Brazilian Portuguese (but understand English too)
Currency: Brazilian Reais (R$)
${conversationContext}${recentEntitiesContext}

${getAllSchemasOverview()}

# YOUR TASK

Analyze the user's command and determine:
1. What operation they want (create, update, delete, or query data)
2. What entity type (contract, receivable, expense, recurring_expense)
3. What parameters you can extract from their natural language
4. What's missing or ambiguous

# IMPORTANT GUIDELINES

**Inference vs Clarification:**
- INFER when information is clear from context (dates like "ontem", categories from keywords)
- ASK CLARIFICATION when:
  * Missing REQUIRED fields that can't be inferred
  * Ambiguous references (e.g., "o projeto" without knowing which project)
  * Multiple possible interpretations
  * User request is unclear or contradictory

**Date Parsing:**
- Be flexible: "ontem", "hoje", "amanhã", "próxima semana", DD/MM, DD/MM/YYYY
- ontem = ${new Date(Date.now() - 86400000).toISOString().split('T')[0]}
- hoje = ${today}
- amanhã = ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}

**Currency Parsing:**
- Understand: R$50, 50 reais, cinquenta reais, R$ 1.500,00
- Brazilian format: 1.500,00 (thousands separator = dot, decimal = comma)

**Batch Operations:**
- Detect: "3 recebíveis", "nos próximos 3 meses", "a cada semana"
- Set isBatch=true and extract batchParameters

**Batch Delete with Recency:**
- "3 últimas despesas" = delete 3 most recent expenses → isBatchDelete=true, parameters.limit=3, parameters.sortBy="recent"
- "últimos 5 recebíveis" = delete 5 most recent → isBatchDelete=true, parameters.limit=5
- "despesas da semana passada" = delete from last week → isBatchDelete=true, parameters.dateRange

**Semantic Mappings:**
- RT/RRT = "Responsabilidade Técnica" (receivable)
- projeto/contrato/proposta = contract
- despesa/gasto/custo = expense
- recebível/fatura/pagamento = receivable

# USER COMMAND

"${command}"

# QUERY AGENT INTEGRATION

**When You Need Database Lookup:**
If the user references existing entities but doesn't provide enough info to identify them:
- "Deleta o contrato da Mari" → needsQuery: true, queryRequest: "Find contracts where client or project name contains 'Mari'"
- "Atualiza o último projeto" → needsQuery: true, queryRequest: "Get the most recent contract"
- "R$400 do projeto ACME" → needsQuery: true, queryRequest: "Find contract for project ACME"

Set `needsQuery: true` and provide a `queryRequest` in natural language.

# RESPONSE FORMAT

Respond ONLY with valid JSON (no markdown, no extra text):

{
  "operation": "create" | "update" | "delete" | "query" | "unknown",
  "entityType": "contract" | "receivable" | "expense" | "recurring_expense" | "unknown",
  "confidence": 0.0-1.0,
  "parameters": {
    // Extract ALL parameters you can identify from the command
    // Use your intelligence to parse dates, amounts, categories, etc.
  },
  "needsQuery": boolean,  // Do you need to lookup existing entities first?
  "queryRequest": string | null,  // Natural language query for Query Agent (if needsQuery=true)
  "ambiguities": ["list of what's unclear or has multiple interpretations"],
  "needsClarification": boolean,
  "isBatch": boolean,
  "batchCount": number | null,
  "batchParameters": { "count": number, "interval": "days"|"weeks"|"months", "intervalValue": number } | null,
  "isBatchDelete": boolean,
  "deleteScope": "single" | "multiple" | "all",
  "cascadeDelete": boolean
}

Use your reasoning capabilities to extract maximum information while being honest about ambiguities.`
  }

  /**
   * Handle create operation
   */
  private async handleCreate(
    intent: Intent,
    conversationState?: ConversationState
  ): Promise<CommandResult> {
    try {
      // Check if this is a batch operation
      if (intent.isBatch && intent.batchParameters) {
        return await this.handleBatchCreate(intent, conversationState)
      }

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
   * Handle batch create operation
   */
  private async handleBatchCreate(
    intent: Intent,
    conversationState?: ConversationState
  ): Promise<CommandResult> {
    try {
      const { batchParameters } = intent
      if (!batchParameters) {
        return {
          success: false,
          message: 'Erro ao processar operação em lote.'
        }
      }

      // Prepare base entity data
      const baseData = await this.prepareEntityData(intent, conversationState)
      if (!baseData) {
        return {
          success: false,
          clarificationNeeded: true,
          clarificationQuestion: 'Não consegui entender o que você quer criar. Pode fornecer mais detalhes?'
        }
      }

      // Generate batch entities with date progression
      const batchEntities = this.generateBatchEntities(baseData, batchParameters, intent.entityType)

      // Generate batch preview
      const preview = await this.generateBatchPreview(intent.entityType, batchEntities, batchParameters)

      // Return pending batch operation
      const pendingOperation: PendingOperation = {
        intent,
        preview,
        entityData: batchEntities, // Array of entities
        confirmationRequired: true
      }

      return {
        success: false,
        needsConfirmation: true,
        message: `${preview}\n\nConfirma a criação de ${batchParameters.count} ${this.pluralizeEntityName(intent.entityType)}?`,
        pendingOperation
      }
    } catch (error) {
      console.error('handleBatchCreate error:', error)
      return {
        success: false,
        message: `Erro ao preparar criação em lote: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Generate batch entities with date progression
   */
  private generateBatchEntities(
    baseData: any,
    batchParams: { count: number; interval?: string; intervalValue?: number },
    entityType: string
  ): any[] {
    const entities: any[] = []
    const baseDate = new Date(baseData.dueDate || baseData.expectedDate || baseData.signedDate || baseData.startDate || new Date())

    for (let i = 0; i < batchParams.count; i++) {
      const entityData = { ...baseData }

      // Calculate date for this entity
      if (batchParams.interval && batchParams.intervalValue) {
        const offsetDate = new Date(baseDate)

        switch (batchParams.interval) {
          case 'days':
            offsetDate.setDate(offsetDate.getDate() + (i * batchParams.intervalValue))
            break
          case 'weeks':
            offsetDate.setDate(offsetDate.getDate() + (i * batchParams.intervalValue * 7))
            break
          case 'months':
            offsetDate.setMonth(offsetDate.getMonth() + (i * batchParams.intervalValue))
            break
        }

        // Update the appropriate date field based on entity type
        const isoDate = offsetDate.toISOString().split('T')[0]
        if (entityType === 'expense') entityData.dueDate = isoDate
        if (entityType === 'receivable') entityData.expectedDate = isoDate
        if (entityType === 'contract') entityData.signedDate = isoDate
        if (entityType === 'recurring_expense') entityData.startDate = isoDate
      }

      entities.push(entityData)
    }

    return entities
  }

  /**
   * Generate preview for batch operations
   */
  private async generateBatchPreview(
    entityType: string,
    entities: any[],
    batchParams: { count: number; interval?: string; intervalValue?: number }
  ): Promise<string> {
    const entityNames = {
      contract: 'contratos',
      receivable: 'recebíveis',
      expense: 'despesas',
      recurring_expense: 'despesas recorrentes'
    }

    const entityName = entityNames[entityType as keyof typeof entityNames] || 'entidades'
    let preview = `Vou criar ${batchParams.count} ${entityName}:\n\n`

    // Show first 3 and last one if more than 4
    const entitiesToShow = entities.length <= 4
      ? entities
      : [...entities.slice(0, 3), entities[entities.length - 1]]

    entitiesToShow.forEach((entity, index) => {
      const actualIndex = index === 3 && entities.length > 4 ? entities.length - 1 : index
      preview += `${actualIndex + 1}. `

      switch (entityType) {
        case 'expense':
          preview += `${entity.description} - R$ ${entity.amount?.toFixed(2).replace('.', ',')} em ${this.formatDate(entity.dueDate)}\n`
          break
        case 'receivable':
          preview += `R$ ${entity.amount?.toFixed(2).replace('.', ',')} para ${this.formatDate(entity.expectedDate)}\n`
          break
        case 'contract':
          preview += `${entity.projectName} - R$ ${entity.totalValue?.toFixed(2).replace('.', ',')} em ${this.formatDate(entity.signedDate)}\n`
          break
        case 'recurring_expense':
          preview += `${entity.description} - R$ ${entity.amount?.toFixed(2).replace('.', ',')} a partir de ${this.formatDate(entity.startDate)}\n`
          break
      }

      // Show ellipsis if we skipped middle items
      if (index === 2 && entities.length > 4) {
        preview += `... (${entities.length - 4} mais)\n`
      }
    })

    if (batchParams.interval) {
      const intervalNames = { days: 'dias', weeks: 'semanas', months: 'meses' }
      const intervalName = intervalNames[batchParams.interval as keyof typeof intervalNames] || batchParams.interval
      preview += `\nFrequência: A cada ${batchParams.intervalValue} ${intervalName}`
    }

    return preview.trim()
  }

  /**
   * Pluralize entity name
   */
  private pluralizeEntityName(entityType: string): string {
    const plurals: Record<string, string> = {
      contract: 'contratos',
      receivable: 'recebíveis',
      expense: 'despesas',
      recurring_expense: 'despesas recorrentes'
    }
    return plurals[entityType] || 'entidades'
  }

  /**
   * Get singular entity name
   */
  private getEntityNameSingular(entityType: string): string {
    const singulars: Record<string, string> = {
      contract: 'contrato',
      receivable: 'recebível',
      expense: 'despesa',
      recurring_expense: 'despesa recorrente'
    }
    return singulars[entityType] || 'entidade'
  }

  /**
   * Prepare entity data using Claude for inference (ADR-008 compliant)
   *
   * Instead of manually parsing dates, currencies, and categories,
   * we let Claude use its native reasoning capabilities.
   */
  private async prepareEntityData(
    intent: Intent,
    conversationState?: ConversationState
  ): Promise<any | null> {
    const today = new Date().toISOString().split('T')[0]

    // Build context for Claude
    let existingEntitiesContext = ''

    // If user mentioned a project name for receivables, fetch contracts for fuzzy matching
    if (intent.entityType === 'receivable' && intent.parameters.projectName) {
      const contracts = await this.contractService.findMany({}, { limit: 100 })
      if (contracts.length > 0) {
        existingEntitiesContext = `\n## Existing Contracts (for project name matching)\n`
        existingEntitiesContext += contracts.slice(0, 20).map((c: any) =>
          `- ID: ${c.id}, Project: ${c.projectName}, Client: ${c.clientName}`
        ).join('\n')
      }
    }

    const prompt = `You are preparing data to ${intent.operation} a ${intent.entityType} in the database.

# CURRENT CONTEXT

Current date: ${today}
Team ID: ${this.context.teamId}
${existingEntitiesContext}

${getEntitySchema(intent.entityType)}

# EXTRACTED PARAMETERS FROM USER COMMAND

${JSON.stringify(intent.parameters, null, 2)}

# YOUR TASK

Transform the extracted parameters into a complete, valid entity object ready for database insertion.

**IMPORTANT GUIDELINES:**

1. **Parse and normalize all fields:**
   - Dates: Convert to ISO format (YYYY-MM-DD)
   - Amounts: Convert to numbers (handle R$, dots, commas in Brazilian format)
   - Categories: Use valid category values from schema
   - Text: Clean and normalize strings

2. **Infer missing optional fields when possible:**
   - Categories from description keywords
   - Default values that make sense
   - Status fields (e.g., "pending" for new expenses)

3. **Project name fuzzy matching (for receivables):**
   - If projectName provided, find best matching contract ID from existing contracts
   - If multiple close matches (>1), return null for contractId and explain in a comment
   - If no good match (similarity <0.6), leave contractId null

4. **Fill REQUIRED fields:**
   - Use extracted values if present
   - Use sensible defaults if missing (e.g., today for dates)
   - For text fields like clientName/projectName, if truly missing, use generic placeholder

5. **Return ONLY valid JSON** (no markdown, no explanations outside JSON):

{
  // All fields needed for this entity type
  // Use null for optional fields if not provided and can't be inferred
  // Include a "_inference_notes" field (optional) if there are important clarifications
}

**EXAMPLE for expense:**
{
  "description": "Gasolina",
  "amount": 50.00,
  "dueDate": "2025-10-01",
  "category": "transport",
  "status": "pending",
  "vendor": null,
  "invoiceNumber": null,
  "notes": null,
  "contractId": null,
  "type": "operational",
  "isRecurring": false
}

Now transform the parameters above into the correct entity structure.`

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

    // Parse Claude's response
    try {
      let jsonText = content.text.trim()

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }

      const entityData = JSON.parse(jsonText.trim())

      // Remove internal notes field if present
      delete entityData._inference_notes

      // Remove null values to let validation schemas handle defaults/optional fields
      // This prevents "Expected string, received null" errors
      Object.keys(entityData).forEach(key => {
        if (entityData[key] === null) {
          delete entityData[key]
        }
      })

      return entityData
    } catch (error) {
      console.error('Failed to parse entity data:', content.text)
      console.error('Parse error:', error)
      throw new Error('Failed to prepare entity data')
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
    conversationState?: ConversationState,
    command?: string
  ): Promise<CommandResult> {
    try {
      // Find entity to update using fuzzy matching or reference resolution
      const entity = await this.findEntity(intent, conversationState, command)

      if (!entity) {
        return {
          success: false,
          clarificationNeeded: true,
          clarificationQuestion: 'Não encontrei a entidade que você quer atualizar. Pode fornecer mais detalhes?'
        }
      }

      if (Array.isArray(entity)) {
        // Multiple matches found - store for reference resolution
        if (conversationState) {
          conversationState.lastReferencedEntities = entity
        }
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
    conversationState?: ConversationState,
    command?: string
  ): Promise<CommandResult> {
    try {
      // Handle batch delete (e.g., "todos os recebíveis do cliente X")
      if (intent.isBatchDelete) {
        return await this.handleBatchDelete(intent, conversationState)
      }

      // Find entity to delete using fuzzy matching or reference resolution
      const entity = await this.findEntity(intent, conversationState, command)

      if (!entity) {
        return {
          success: false,
          clarificationNeeded: true,
          clarificationQuestion: 'Não encontrei a entidade que você quer deletar. Pode fornecer mais detalhes? Por exemplo, o nome do projeto ou cliente.'
        }
      }

      if (Array.isArray(entity)) {
        // Multiple matches found - store for reference resolution
        if (conversationState) {
          conversationState.lastReferencedEntities = entity
        }
        return {
          success: false,
          clarificationNeeded: true,
          clarificationQuestion: this.formatMultipleMatchesMessage(entity, intent.entityType)
        }
      }

      // For contracts, check if we need to ask about cascading delete
      if (intent.entityType === 'contract' && intent.cascadeDelete === undefined) {
        // Check if contract has receivables
        const receivables = await this.receivableService.findMany({ contractId: entity.id })
        if (receivables.length > 0) {
          // Ask user if they want to delete receivables too
          return {
            success: false,
            clarificationNeeded: true,
            clarificationQuestion: `O contrato "${entity.projectName || entity.clientName}" possui ${receivables.length} recebível(is) associado(s). Deseja deletar:\n1. Apenas o contrato (recebíveis ficam órfãos)\n2. O contrato E todos os recebíveis associados\n\nResponda "apenas contrato" ou "contrato e recebíveis".`
          }
        }
      }

      // Generate delete preview
      const preview = await this.generateDeletePreview(intent.entityType, entity, intent.cascadeDelete)

      const pendingOperation: PendingOperation = {
        intent: { ...intent, parameters: { ...intent.parameters, entityId: entity.id } },
        preview,
        entityData: { id: entity.id, cascadeDelete: intent.cascadeDelete },
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
   * Handle batch delete operation
   */
  private async handleBatchDelete(
    intent: Intent,
    conversationState?: ConversationState
  ): Promise<CommandResult> {
    try {
      const { parameters, entityType, deleteScope } = intent

      // Find entities to delete based on criteria
      let entitiesToDelete: any[] = []

      if (deleteScope === 'all') {
        // Delete all entities of this type
        entitiesToDelete = await this.findAllEntitiesOfType(entityType)
      } else if (deleteScope === 'multiple') {
        // Delete entities matching criteria (e.g., clientName)
        entitiesToDelete = await this.findEntitiesByParameters(entityType, parameters)
      }

      if (entitiesToDelete.length === 0) {
        return {
          success: false,
          clarificationNeeded: true,
          clarificationQuestion: `Não encontrei nenhum ${this.getEntityNameSingular(entityType)} que corresponda aos critérios especificados.`
        }
      }

      // Generate batch delete preview
      const preview = await this.generateBatchDeletePreview(entityType, entitiesToDelete)

      const pendingOperation: PendingOperation = {
        intent,
        preview,
        entityData: { entityIds: entitiesToDelete.map(e => e.id) },
        confirmationRequired: true
      }

      return {
        success: false,
        needsConfirmation: true,
        message: `${preview}\n\n⚠️  Esta ação não pode ser desfeita. Confirma a deleção de ${entitiesToDelete.length} ${this.pluralizeEntityName(entityType)}?`,
        pendingOperation
      }
    } catch (error) {
      console.error('handleBatchDelete error:', error)
      return {
        success: false,
        message: `Erro ao preparar deleção em lote: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Find all entities of a given type
   */
  private async findAllEntitiesOfType(entityType: string): Promise<any[]> {
    switch (entityType) {
      case 'contract':
        return await this.contractService.findMany({}, { limit: 1000 })
      case 'receivable':
        return await this.receivableService.findMany({}, { limit: 1000 })
      case 'expense':
        return await this.expenseService.findMany({}, { limit: 1000 })
      case 'recurring_expense':
        return await this.recurringExpenseService.findMany({}, { limit: 1000 })
      default:
        return []
    }
  }

  /**
   * Find entities by parameters (e.g., clientName)
   */
  private async findEntitiesByParameters(entityType: string, parameters: Record<string, any>): Promise<any[]> {
    let allEntities = await this.findAllEntitiesOfType(entityType)

    // Filter by parameters if provided
    if (parameters.clientName || parameters.projectName || parameters.description) {
      allEntities = allEntities.filter(entity => {
        if (parameters.clientName && entity.clientName) {
          const score = fuzzyMatch(parameters.clientName, entity.clientName)
          if (score >= 0.6) return true
        }
        if (parameters.projectName && entity.projectName) {
          const score = fuzzyMatch(parameters.projectName, entity.projectName)
          if (score >= 0.6) return true
        }
        if (parameters.description && entity.description) {
          const score = fuzzyMatch(parameters.description, entity.description)
          if (score >= 0.6) return true
        }
        return false
      })
    }

    // Handle recency-based selection ("3 últimas despesas")
    if (parameters.sortBy === 'recent' || parameters.limit) {
      // Sort by creation date (most recent first)
      allEntities.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.dueDate || a.expectedDate || 0)
        const dateB = new Date(b.createdAt || b.dueDate || b.expectedDate || 0)
        return dateB.getTime() - dateA.getTime() // Descending (newest first)
      })

      // Apply limit if specified
      if (parameters.limit) {
        allEntities = allEntities.slice(0, parameters.limit)
      }
    }

    return allEntities
  }

  /**
   * Generate preview for batch delete
   */
  private async generateBatchDeletePreview(entityType: string, entities: any[]): Promise<string> {
    const entityName = this.pluralizeEntityName(entityType)
    let preview = `Vou deletar ${entities.length} ${entityName}:\n\n`

    // Show first 5
    const entitiesToShow = entities.slice(0, 5)
    entitiesToShow.forEach((entity, index) => {
      preview += `${index + 1}. `
      switch (entityType) {
        case 'contract':
          preview += `${entity.clientName} - ${entity.projectName} (R$ ${entity.totalValue?.toFixed(2).replace('.', ',')})\n`
          break
        case 'receivable':
          preview += `R$ ${entity.amount?.toFixed(2).replace('.', ',')} - ${entity.clientName || 'Sem cliente'}\n`
          break
        case 'expense':
          preview += `${entity.description} - R$ ${entity.amount?.toFixed(2).replace('.', ',')}\n`
          break
        case 'recurring_expense':
          preview += `${entity.description} - R$ ${entity.amount?.toFixed(2).replace('.', ',')}\n`
          break
      }
    })

    if (entities.length > 5) {
      preview += `... e mais ${entities.length - 5}\n`
    }

    return preview.trim()
  }

  /**
   * Resolve entity references like "o primeiro", "esse contrato", "último"
   */
  private resolveEntityReference(
    command: string,
    intent: Intent,
    conversationState?: ConversationState
  ): any | null {
    const normalized = command.toLowerCase()

    // Check for ordinal references: "o primeiro", "o segundo", "o terceiro"
    const ordinalMatch = normalized.match(/o\s+(primeiro|segundo|terceiro|quarto|quinto|último|ultima)/i)
    if (ordinalMatch && conversationState?.lastReferencedEntities) {
      const ordinals: Record<string, number> = {
        'primeiro': 0,
        'segundo': 1,
        'terceiro': 2,
        'quarto': 3,
        'quinto': 4,
        'último': conversationState.lastReferencedEntities.length - 1,
        'ultima': conversationState.lastReferencedEntities.length - 1
      }

      const index = ordinals[ordinalMatch[1]]
      if (index !== undefined && conversationState.lastReferencedEntities[index]) {
        return conversationState.lastReferencedEntities[index]
      }
    }

    // Check for demonstrative references: "esse", "esta", "aquele"
    if (/(esse|essa|este|esta|aquele|aquela)\s+(contrato|projeto|despesa|receb[íi]vel)/i.test(normalized)) {
      if (conversationState?.lastEntities) {
        const entityTypeMap: Record<string, keyof typeof conversationState.lastEntities> = {
          'contrato': 'contract',
          'projeto': 'contract',
          'despesa': 'expense',
          'recebível': 'receivable',
          'recebivel': 'receivable'
        }

        for (const [keyword, entityType] of Object.entries(entityTypeMap)) {
          if (normalized.includes(keyword) && conversationState.lastEntities[entityType]) {
            return conversationState.lastEntities[entityType]
          }
        }
      }
    }

    // Check for recent creation reference: "que acabei de criar", "o último que criei"
    if (/(acabei de criar|último que criei|ultima que criei|recém criado)/i.test(normalized)) {
      if (conversationState?.recentlyCreated && conversationState.recentlyCreated.length > 0) {
        // Filter by entity type if specified
        const recentOfType = conversationState.recentlyCreated.filter(e => e.type === intent.entityType)
        if (recentOfType.length > 0) {
          return recentOfType[0].data
        }
        // Otherwise return most recent
        return conversationState.recentlyCreated[0].data
      }
    }

    return null
  }

  /**
   * Find entity using fuzzy matching
   */
  private async findEntity(
    intent: Intent,
    conversationState?: ConversationState,
    command?: string
  ): Promise<any | any[] | null> {
    // First, try to resolve entity reference from context
    if (command && conversationState) {
      const referenced = this.resolveEntityReference(command, intent, conversationState)
      if (referenced) {
        return referenced
      }
    }

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
    data: any,
    isBatch?: boolean
  ): Promise<string> {
    const entityName = {
      contract: 'contrato',
      receivable: 'recebível',
      expense: 'despesa',
      recurring_expense: 'despesa recorrente'
    }[entityType] || 'entidade'

    const entityNamePlural = {
      contract: 'contratos',
      receivable: 'recebíveis',
      expense: 'despesas',
      recurring_expense: 'despesas recorrentes'
    }[entityType] || 'entidades'

    const operationName = {
      create: 'criado',
      update: 'atualizado',
      delete: 'deletado'
    }[operation] || 'processado'

    const operationNamePlural = {
      create: 'criados',
      update: 'atualizados',
      delete: 'deletados'
    }[operation] || 'processados'

    if (isBatch && Array.isArray(data)) {
      const successCount = data.filter(d => !d.failed).length
      const failedCount = data.length - successCount

      if (failedCount > 0) {
        return `✅ ${successCount} ${entityNamePlural} ${operationNamePlural} com sucesso!\n⚠️ ${failedCount} falharam.`
      }

      return `✅ ${successCount} ${entityNamePlural} ${operationNamePlural} com sucesso!`
    }

    return `✅ ${entityName.charAt(0).toUpperCase() + entityName.slice(1)} ${operationName} com sucesso!`
  }

  /**
   * Get comprehensive database schema (like Query Agent)
   *
   * Provides complete database structure for context-rich prompts
   * ADR-008 compliant: Share schema, don't prescribe parsing
   */
  private getDatabaseSchema(teamId: string): string {
    return `
# DATABASE SCHEMA

**Team Isolation**: ALL operations MUST use teamId = '${teamId}'
**Current Date**: ${new Date().toISOString().split('T')[0]}

## Contract Table
- id (TEXT, PK)
- teamId (TEXT, REQUIRED) ← MUST MATCH ${teamId}
- clientName (TEXT) - Client/company name
- projectName (TEXT) - Project name
- totalValue (DECIMAL) - Contract value in BRL
- signedDate (TIMESTAMP) - When signed
- status (TEXT) - 'active' (default), 'completed', 'cancelled'
- description, category, notes (TEXT, nullable)
- createdAt, updatedAt (TIMESTAMP)

## Receivable Table (Expected Income)
- id (TEXT, PK)
- teamId (TEXT, REQUIRED) ← MUST MATCH ${teamId}
- contractId (TEXT, FK to Contract, nullable)
- expectedDate (TIMESTAMP) - When payment expected
- receivedDate (TIMESTAMP, nullable) - When actually received
- amount, receivedAmount (DECIMAL)
- status (TEXT) - 'pending' (default), 'received', 'overdue', 'cancelled'
- clientName (TEXT, nullable) - If no contract linked
- description, category, invoiceNumber, notes (TEXT, nullable)
- createdAt, updatedAt (TIMESTAMP)

**Business Context**:
- RT/RRT = "Responsabilidade Técnica" (technical responsibility fee)
- Common categories: professional-fees, milestone-payment, final-payment

## Expense Table (Costs)
- id (TEXT, PK)
- teamId (TEXT, REQUIRED) ← MUST MATCH ${teamId}
- contractId (TEXT, FK to Contract, nullable)
- description (TEXT) - What was purchased
- amount (DECIMAL) - Cost in BRL
- dueDate (TIMESTAMP) - When due/paid
- paidDate (TIMESTAMP, nullable) - When actually paid
- category (TEXT) - See categories below
- status (TEXT) - 'pending' (default), 'paid', 'overdue', 'cancelled'
- vendor, invoiceNumber, notes (TEXT, nullable)
- type (TEXT) - 'operational' (default), 'project', 'administrative'
- isRecurring (BOOLEAN, default: false)
- receiptUrl (TEXT, nullable)
- createdAt, updatedAt (TIMESTAMP)

**Categories**: transport, meals, office, software, utilities, rent, insurance,
marketing, professional-services, materials, labor, equipment, other

**Category Inference Examples**:
- gasolina → transport
- almoço/jantar → meals
- internet/luz → utilities
- Adobe/Figma → software

## RecurringExpense Table (Subscriptions)
- id (TEXT, PK)
- teamId (TEXT, REQUIRED) ← MUST MATCH ${teamId}
- description (TEXT)
- amount (DECIMAL)
- frequency (TEXT) - 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
- startDate, endDate (TIMESTAMP, nullable)
- dayOfMonth (INTEGER 1-31, for monthly+)
- category (TEXT) - same as Expense
- status (TEXT) - 'active' (default), 'paused', 'cancelled'
- lastProcessedDate (TIMESTAMP, nullable)
- createdAt, updatedAt (TIMESTAMP)

## Semantic Mappings (Brazilian Business Terms)
- projeto/proposta/orçamento → Contract
- RT/RRT/"Responsabilidade Técnica" → Receivable (professional fee)
- recebível/fatura/pagamento/entrada → Receivable
- despesa/gasto/custo/conta/saída → Expense
- mensalidade/assinatura/recorrente → RecurringExpense
- concluído/finalizado → status: 'completed'
- ativo/em andamento → status: 'active'
- pago/quitado → status: 'paid'
- recebido → status: 'received'
`
  }

  /**
   * Process command with Query Agent support
   *
   * When the Operations Agent needs to lookup existing entities,
   * it delegates to the Query Agent and then processes the results.
   *
   * ADR-008: API-Native Integration - agents work together
   */
  private async processWithQuerySupport(
    intent: Intent,
    conversationState: ConversationState | undefined,
    originalCommand: string
  ): Promise<CommandResult> {
    try {
      // Build conversation history for Query Agent
      const queryHistory = conversationState?.messages
        ?.slice(-10)
        .map(m => ({
          question: m.role === 'user' ? m.content : '',
          answer: m.role === 'assistant' ? m.content : ''
        }))
        .filter(h => h.question || h.answer) || []

      // Use Query Agent to find entities
      console.log(`📊 [Operations Agent] Querying: "${intent.queryRequest}"`)
      const queryResult = await this.queryService.query(intent.queryRequest!, queryHistory)

      console.log(`📊 [Operations Agent] Query found:`, queryResult.rawResult)

      // Now ask Claude to proceed with the query results
      const decision = await this.processWithQueryResults(
        intent,
        queryResult,
        conversationState,
        originalCommand
      )

      return decision
    } catch (error) {
      console.error('[Operations Agent] Query support error:', error)
      return {
        success: false,
        message: 'Erro ao buscar informações no banco de dados. Tente novamente.'
      }
    }
  }

  /**
   * Process command after getting query results
   *
   * Claude decides what to do based on what the Query Agent found
   */
  private async processWithQueryResults(
    intent: Intent,
    queryResult: any,
    conversationState: ConversationState | undefined,
    originalCommand: string
  ): Promise<CommandResult> {
    const prompt = `You previously wanted to "${intent.operation}" a "${intent.entityType}".

# QUERY RESULTS

You asked the Query Agent: "${intent.queryRequest}"

The Query Agent found:
\`\`\`json
${JSON.stringify(queryResult.rawResult, null, 2)}
\`\`\`

Natural language answer: "${queryResult.answer}"

# ORIGINAL USER COMMAND

"${originalCommand}"

# YOUR TASK

Based on the query results, decide what to do:

1. **If multiple entities found** → Ask user to choose which one
2. **If exactly one entity found** → Proceed with the operation using that entity
3. **If no entities found** → Ask for clarification or suggest alternatives

# RESPONSE FORMAT

Respond with JSON (no markdown):

{
  "proceed": boolean,
  "entityData": { /* complete data for operation */ } | null,
  "entityId": "id" | null,  // If updating/deleting
  "clarificationQuestion": "text" | null,
  "multipleOptions": [  // If user needs to choose
    { "index": 1, "display": "description", "id": "entity-id", "data": {...} }
  ] | null
}`

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Parse decision
    let jsonText = content.text.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    const decision = JSON.parse(jsonText.trim())

    // Handle clarification
    if (decision.clarificationQuestion) {
      // Store options for follow-up
      if (decision.multipleOptions && conversationState) {
        conversationState.lastReferencedEntities = decision.multipleOptions
      }

      return {
        success: false,
        clarificationNeeded: true,
        clarificationQuestion: decision.clarificationQuestion,
        message: decision.clarificationQuestion
      }
    }

    // Proceed with operation
    if (decision.proceed && decision.entityData) {
      // Update intent with found entity data
      const updatedIntent = {
        ...intent,
        parameters: {
          ...intent.parameters,
          ...decision.entityData,
          entityId: decision.entityId
        }
      }

      // Route to appropriate handler
      switch (intent.operation) {
        case 'create':
          return await this.handleCreate(updatedIntent, conversationState)
        case 'update':
          return await this.handleUpdate(updatedIntent, conversationState, originalCommand)
        case 'delete':
          return await this.handleDelete(updatedIntent, conversationState, originalCommand)
        default:
          return {
            success: false,
            message: 'Operação não suportada após consulta.'
          }
      }
    }

    return {
      success: false,
      message: 'Não consegui processar a consulta. Pode reformular?'
    }
  }
}
