/**
 * Unified Conversation State Types
 *
 * Shared conversation context across all AI agents (Setup, Query, Operations)
 * Enables multi-turn conversations with context retention
 *
 * Part of Phase 2: Unified AI Router System (ADR-008)
 */

/**
 * Unified conversation state - single source of truth
 */
export interface UnifiedConversationState {
  // Conversation history (shared across ALL agents)
  messages: ConversationMessage[]

  // Recently created entities (from any agent)
  recentlyCreated: RecentEntity[]

  // Current pending operation (if any)
  pendingOperation?: {
    agentType: 'setup' | 'query' | 'operations'
    operation: any
    requiresConfirmation: boolean
  }

  // Last agent used (for context continuity)
  lastAgent?: 'setup' | 'query' | 'operations'

  // Conversation metadata
  metadata: {
    startedAt: Date
    lastUpdatedAt: Date
    messageCount: number
    entitiesCreated: number
  }
}

/**
 * Individual conversation message
 */
export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  agentUsed?: 'setup' | 'query' | 'operations' | 'router'
  metadata?: {
    intent?: string
    entityType?: string
    entityId?: string
    filesProcessed?: number
    operation?: string
  }
}

/**
 * Recently created entity (for context)
 */
export interface RecentEntity {
  type: 'contract' | 'receivable' | 'expense' | 'recurring_expense'
  id: string
  data: any
  createdAt: Date
  createdBy: 'setup' | 'operations' // Which agent created it
}

/**
 * Agent intent classification result
 */
export interface AgentIntent {
  type: 'setup' | 'query' | 'operations' | 'general'
  confidence: number
  reasoning: string
}

/**
 * Agent response
 */
export interface AgentResponse {
  agentUsed: 'setup' | 'query' | 'operations' | 'router'
  response: string
  data?: any
  conversationState?: UnifiedConversationState
}

/**
 * Helper to create initial conversation state
 */
export function createInitialConversationState(): UnifiedConversationState {
  return {
    messages: [],
    recentlyCreated: [],
    metadata: {
      startedAt: new Date(),
      lastUpdatedAt: new Date(),
      messageCount: 0,
      entitiesCreated: 0
    }
  }
}

/**
 * Helper to update conversation state with new message
 */
export function addMessageToState(
  state: UnifiedConversationState,
  role: 'user' | 'assistant',
  content: string,
  agentUsed?: 'setup' | 'query' | 'operations' | 'router',
  metadata?: ConversationMessage['metadata']
): UnifiedConversationState {
  const message: ConversationMessage = {
    role,
    content,
    timestamp: new Date(),
    agentUsed,
    metadata
  }

  return {
    ...state,
    messages: [...state.messages, message],
    metadata: {
      ...state.metadata,
      lastUpdatedAt: new Date(),
      messageCount: state.metadata.messageCount + 1
    }
  }
}

/**
 * Helper to add recently created entity
 */
export function addRecentEntity(
  state: UnifiedConversationState,
  entity: RecentEntity
): UnifiedConversationState {
  // Keep only last 10 entities
  const recentlyCreated = [entity, ...state.recentlyCreated].slice(0, 10)

  return {
    ...state,
    recentlyCreated,
    metadata: {
      ...state.metadata,
      entitiesCreated: state.metadata.entitiesCreated + 1,
      lastUpdatedAt: new Date()
    }
  }
}
