/**
 * AI Agent Router Service
 *
 * Orchestrates all AI agents with unified conversation context
 * Routes user requests to appropriate specialized agents:
 * - Setup Agent (document processing, batch imports)
 * - Query Agent (questions about data)
 * - Operations Agent (CRUD operations)
 *
 * Part of Phase 2: Unified AI Router System (ADR-008)
 *
 * ADR-008 Compliance:
 * - Leverage Native LLM Capabilities: Claude Sonnet 4 for intelligent routing
 * - Optimize for Experience: Quality over cost, seamless multi-turn conversations
 * - Specialization: Router orchestrates, doesn't replace specialists
 * - Context-Rich: Full conversation history shared with all agents
 * - API-Native: Uses existing services, maintains team isolation
 */

import Anthropic from '@anthropic-ai/sdk'
import { ServiceContext } from './BaseService'
import { FinancialQueryService } from './FinancialQueryService'
import { OperationsAgentService } from './OperationsAgentService'
import {
  UnifiedConversationState,
  ConversationMessage,
  AgentIntent,
  AgentResponse,
  addMessageToState,
  addRecentEntity,
  RecentEntity
} from '@/lib/types/unified-conversation'

export class AIAgentRouterService {
  private anthropic: Anthropic
  private context: ServiceContext

  // Specialized agents
  private queryAgent: FinancialQueryService
  private operationsAgent: OperationsAgentService

  constructor(context: ServiceContext) {
    if (!process.env.CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY not configured')
    }

    this.context = context
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    })

    // Initialize specialized agents
    this.queryAgent = new FinancialQueryService(context)
    this.operationsAgent = new OperationsAgentService(context)
  }

  /**
   * Main entry point - processes any user message
   */
  async processMessage(
    message: string,
    files: any[],
    conversationState: UnifiedConversationState
  ): Promise<AgentResponse> {
    try {
      // Classify user intent
      const intent = await this.classifyIntent(message, files.length > 0, conversationState)

      console.log(`🎯 [Router] Intent: ${intent.type} (confidence: ${intent.confidence})`)

      // Route to appropriate agent
      const result = await this.routeToAgent(intent, message, files, conversationState)

      return result
    } catch (error) {
      console.error('[Router] Error processing message:', error)
      throw error
    }
  }

  /**
   * Classify user intent using Claude Sonnet 4
   *
   * ADR-008 compliant: Context-rich, not prescriptive
   */
  private async classifyIntent(
    message: string,
    hasFiles: boolean,
    conversationState: UnifiedConversationState
  ): Promise<AgentIntent> {
    // Build recent conversation context
    const recentMessages = conversationState.messages
      .slice(-5)
      .map(m => `${m.role}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`)
      .join('\n')

    const prompt = `You are an AI assistant router for ArqCashflow, a financial management system.

# CONTEXT
- User has ${hasFiles ? 'uploaded files' : 'NO files'}
- Last agent used: ${conversationState.lastAgent || 'none'}
- Recent conversation:
${recentMessages || '(No previous conversation)'}

# USER MESSAGE
"${message}"

# YOUR TASK
Classify the user's intent into ONE of these categories:

1. **setup** - User uploaded documents/images OR wants to process receipts, contracts, invoices, bulk imports
   Examples: "Process these PDFs", "Import this Excel", user uploaded files

2. **query** - User asks QUESTIONS about existing data (revenue, expenses, contracts, analytics)
   Examples: "Quanto gastei?", "Quais meus projetos?", "Show me revenue this month"

3. **operations** - User wants to CREATE/UPDATE/DELETE specific entities using natural language
   Examples: "R$50 em gasolina ontem", "Cria contrato para João", "Deleta o projeto X"

4. **general** - Greetings, unclear intent, help requests, general chat
   Examples: "Oi", "Como funciona?", "Ajuda"

# CLASSIFICATION RULES
- If files present → ALWAYS "setup" (unless explicitly asking a question about data)
- If asking "quanto", "quais", "mostre", "lista" → "query"
- If giving data to create/update/delete → "operations"
- When in doubt between query and operations → "operations" (it can delegate to query if needed)
- If completely unclear → "general"

# RESPONSE FORMAT
Respond with ONLY valid JSON (no markdown, no code blocks):

{
  "type": "setup" | "query" | "operations" | "general",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Examples:
"Quanto gastei esse mês?" → {"type": "query", "confidence": 0.95, "reasoning": "Question about expenses"}
"R$50 gasolina ontem" → {"type": "operations", "confidence": 0.9, "reasoning": "Creating expense"}
"Oi" → {"type": "general", "confidence": 1.0, "reasoning": "Greeting"}`

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse JSON response
    try {
      // Remove markdown code blocks if present
      let jsonText = content.text.trim()
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
      }

      const intent = JSON.parse(jsonText.trim())

      return {
        type: intent.type || 'general',
        confidence: intent.confidence || 0.5,
        reasoning: intent.reasoning || 'No reasoning provided'
      }
    } catch (error) {
      console.error('[Router] Failed to parse intent:', content.text)
      // Default to general if parsing fails
      return {
        type: 'general',
        confidence: 0.3,
        reasoning: 'Failed to parse intent, defaulting to general'
      }
    }
  }

  /**
   * Route to appropriate agent based on intent
   */
  private async routeToAgent(
    intent: AgentIntent,
    message: string,
    files: any[],
    conversationState: UnifiedConversationState
  ): Promise<AgentResponse> {
    switch (intent.type) {
      case 'setup':
        return await this.routeToSetupAgent(message, files, conversationState)

      case 'query':
        return await this.routeToQueryAgent(message, conversationState)

      case 'operations':
        return await this.routeToOperationsAgent(message, conversationState)

      case 'general':
        return this.handleGeneralIntent(message)

      default:
        throw new Error(`Unknown intent type: ${intent.type}`)
    }
  }

  /**
   * Route to Setup Agent (document processing)
   */
  private async routeToSetupAgent(
    message: string,
    files: any[],
    conversationState: UnifiedConversationState
  ): Promise<AgentResponse> {
    console.log(`📄 [Router] Routing to Setup Agent (${files.length} files)`)

    // TODO: Implement Setup Agent integration
    // For now, return placeholder
    return {
      agentUsed: 'setup',
      response: '📄 Setup Agent: Document processing will be available soon. For now, please use the Setup Assistant directly.',
      conversationState
    }
  }

  /**
   * Route to Query Agent (financial questions)
   */
  private async routeToQueryAgent(
    message: string,
    conversationState: UnifiedConversationState
  ): Promise<AgentResponse> {
    console.log(`📊 [Router] Routing to Query Agent`)

    // Convert unified state to Query Agent format
    const queryHistory = conversationState.messages
      .filter(m => m.agentUsed === 'query' || !m.agentUsed) // Include query messages and general
      .slice(-10) // Last 10 relevant messages
      .map(m => ({
        question: m.role === 'user' ? m.content : '',
        answer: m.role === 'assistant' ? m.content : ''
      }))
      .filter(h => h.question || h.answer)

    const result = await this.queryAgent.query(message, queryHistory)

    // Update conversation state
    const updatedState = {
      ...conversationState,
      lastAgent: 'query' as const
    }

    return {
      agentUsed: 'query',
      response: result.answer,
      data: result,
      conversationState: updatedState
    }
  }

  /**
   * Route to Operations Agent (CRUD operations)
   */
  private async routeToOperationsAgent(
    message: string,
    conversationState: UnifiedConversationState
  ): Promise<AgentResponse> {
    console.log(`⚡ [Router] Routing to Operations Agent`)

    // Convert unified state to Operations Agent format
    const operationsState = {
      messages: conversationState.messages,
      recentlyCreated: conversationState.recentlyCreated,
      pendingOperation: conversationState.pendingOperation?.agentType === 'operations'
        ? conversationState.pendingOperation.operation
        : undefined,
      lastEntities: this.extractLastEntities(conversationState.recentlyCreated)
    }

    const result = await this.operationsAgent.processCommand(message, operationsState.messages)

    // Update unified state with conversation history from Operations Agent
    let updatedState = {
      ...conversationState,
      messages: result.conversationHistory,
      lastAgent: 'operations' as const
    }

    // Operations Agent doesn't use pending operations - it handles confirmations internally via conversation
    updatedState.pendingOperation = undefined

    // Note: Entity tracking happens inside OperationsAgentService via ExpenseService
    // We don't track entities here since the Operations Agent manages its own state

    return {
      agentUsed: 'operations',
      response: result.message,
      data: result,
      conversationState: updatedState
    }
  }

  /**
   * Handle general intent (greetings, help)
   */
  private handleGeneralIntent(message: string): AgentResponse {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.match(/^(oi|olá|ola|hello|hi|hey|bom dia|boa tarde|boa noite)/)) {
      return {
        agentUsed: 'router',
        response: `Olá! 👋 Sou o assistente de IA do ArqCashflow. Posso ajudá-lo com:

📄 **Processar documentos** - Upload de recibos, contratos, planilhas
📊 **Consultar dados** - "Quanto gastei esse mês?", "Quais meus projetos?"
⚡ **Operações rápidas** - "R$50 gasolina ontem", "Cria contrato para João"

Como posso ajudar?`
      }
    }

    if (lowerMessage.match(/(ajuda|help|como funciona|what can you do)/)) {
      return {
        agentUsed: 'router',
        response: `🤖 **Como usar o assistente de IA:**

**Para processar documentos:**
• Faça upload de arquivos (PDF, Excel, imagens)
• Exemplo: "Process this invoice"

**Para consultar seus dados:**
• Pergunte sobre finanças, projetos, receitas
• Exemplo: "Quanto recebi esse mês?"

**Para criar/editar dados:**
• Use linguagem natural
• Exemplo: "R$50 em gasolina ontem"
• Exemplo: "Cria contrato para Cliente X, R$100k"

Digite sua pergunta ou comando!`
      }
    }

    return {
      agentUsed: 'router',
      response: 'Desculpe, não entendi. Pode reformular? Você pode me perguntar sobre seus dados financeiros, criar despesas/contratos, ou processar documentos.'
    }
  }

  /**
   * Extract last entities by type from recently created
   */
  private extractLastEntities(recentlyCreated: RecentEntity[]): any {
    const lastEntities: any = {}

    const entityTypes = ['contract', 'receivable', 'expense', 'recurring_expense'] as const

    entityTypes.forEach(type => {
      const entity = recentlyCreated.find(e => e.type === type)
      if (entity) {
        lastEntities[type] = entity.data
      }
    })

    return lastEntities
  }
}
