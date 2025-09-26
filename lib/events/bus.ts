/**
 * Event Bus Implementation
 *
 * Core event system providing type-safe event emission and subscription
 * with team isolation, persistence, and reliability features.
 */

import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import type {
  EventBus,
  EventPayload,
  EventHandler,
  EventType,
  EventContext,
} from './types'
import { EventTypes } from './types'
import { EventSchemas } from './types'
import { ValidationError, validateSchema } from '@/lib/validation'

/**
 * Event Persistence Interface
 * Stores events in database for reliability and audit trail
 */
interface StoredEvent {
  id: string
  type: string
  teamId: string
  userId?: string
  timestamp: Date
  source: string
  payload: any
  metadata?: any
}

/**
 * ArqCashflow Event Bus Implementation
 *
 * Features:
 * - Type-safe event emission and subscription
 * - Team-based event isolation
 * - Event persistence for reliability
 * - Wildcard pattern matching
 * - Integration with unified validation layer
 */
export class ArqEventBus implements EventBus {
  private emitter: EventEmitter
  private handlers: Map<string, Set<EventHandler>>
  private persistEvents: boolean

  constructor(options: {
    persistEvents?: boolean
    maxListeners?: number
  } = {}) {
    this.emitter = new EventEmitter()
    this.handlers = new Map()
    this.persistEvents = options.persistEvents ?? true

    // Set max listeners to handle multiple event types
    this.emitter.setMaxListeners(options.maxListeners ?? 100)
  }

  /**
   * Emit an event with type safety and validation
   */
  async emit<T extends EventPayload>(event: T): Promise<void> {
    try {
      // Validate event payload
      this.validateEvent(event)

      // Persist event if enabled
      if (this.persistEvents) {
        await this.persistEvent(event)
      }

      // Emit to direct listeners
      const directHandlers = this.handlers.get(event.type) || new Set()
      await this.executeHandlers(Array.from(directHandlers), event)

      // Emit to pattern listeners (e.g., 'contract.*' matches 'contract.created')
      const [category] = event.type.split('.')
      const wildcardPattern = `${category}.*`
      const wildcardHandlers = this.handlers.get(wildcardPattern) || new Set()
      await this.executeHandlers(Array.from(wildcardHandlers), event)

      // Emit to global listeners (*)
      const globalHandlers = this.handlers.get('*') || new Set()
      await this.executeHandlers(Array.from(globalHandlers), event)

    } catch (error) {
      console.error('Event emission failed:', error)

      // Emit system error event (avoid infinite recursion)
      if (event.type !== EventTypes.SERVICE_ERROR) {
        await this.emitSystemError(event, error as Error)
      }

      throw error
    }
  }

  /**
   * Subscribe to events by type or pattern
   */
  on<T extends EventPayload>(eventTypeOrPattern: EventType | string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventTypeOrPattern)) {
      this.handlers.set(eventTypeOrPattern, new Set())
    }

    const handlers = this.handlers.get(eventTypeOrPattern)!
    handlers.add(handler as EventHandler)
  }

  /**
   * Unsubscribe from events
   */
  off(eventTypeOrPattern: EventType | string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventTypeOrPattern)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.handlers.delete(eventTypeOrPattern)
      }
    }
  }

  /**
   * Subscribe to event once (auto-unsubscribe after first emission)
   */
  once<T extends EventPayload>(eventType: EventType, handler: EventHandler<T>): void {
    const onceHandler: EventHandler<T> = async (event, context) => {
      this.off(eventType, onceHandler)
      await handler(event, context)
    }

    this.on(eventType, onceHandler)
  }

  /**
   * Remove all listeners for event type (or all listeners if no type specified)
   */
  removeAllListeners(eventType?: EventType): void {
    if (eventType) {
      this.handlers.delete(eventType)
    } else {
      this.handlers.clear()
    }
  }

  /**
   * Get event history for team (supports filtering)
   */
  async getEventHistory(teamId: string, options: {
    eventType?: EventType
    limit?: number
    since?: Date
  } = {}): Promise<EventPayload[]> {
    try {
      const where: any = { teamId }

      if (options.eventType) {
        where.type = options.eventType
      }

      if (options.since) {
        where.timestamp = { gte: options.since }
      }

      const events = await prisma.event.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options.limit || 100,
      })

      return events.map(this.deserializeEvent)
    } catch (error) {
      console.error('Failed to fetch event history:', error)
      return []
    }
  }

  /**
   * Get event statistics for team
   */
  async getEventStats(teamId: string, since?: Date): Promise<{
    totalEvents: number
    eventsByType: Record<string, number>
    recentActivity: number
  }> {
    try {
      const where: any = { teamId }
      if (since) {
        where.timestamp = { gte: since }
      }

      const [totalEvents, eventsByType] = await Promise.all([
        prisma.event.count({ where }),
        prisma.event.groupBy({
          by: ['type'],
          where,
          _count: { type: true },
        }),
      ])

      // Recent activity (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recentActivity = await prisma.event.count({
        where: { ...where, timestamp: { gte: yesterday } },
      })

      return {
        totalEvents,
        eventsByType: Object.fromEntries(
          eventsByType.map(item => [item.type, item._count.type])
        ),
        recentActivity,
      }
    } catch (error) {
      console.error('Failed to fetch event stats:', error)
      return { totalEvents: 0, eventsByType: {}, recentActivity: 0 }
    }
  }

  /**
   * Validate event payload using unified validation layer
   */
  private validateEvent(event: EventPayload): void {
    // Determine which schema to use based on event type
    const [category] = event.type.split('.')
    let schema

    switch (category) {
      case 'contract':
        schema = EventSchemas.contract
        break
      case 'receivable':
        schema = EventSchemas.receivable
        break
      case 'expense':
        schema = EventSchemas.expense
        break
      case 'recurring':
        schema = EventSchemas.expense // Recurring expenses use same schema structure
        break
      case 'document':
      case 'ai':
        schema = EventSchemas.ai
        break
      case 'bulk':
        schema = EventSchemas.bulk
        break
      default:
        schema = EventSchemas.system
    }

    // Validate using unified validation layer
    try {
      validateSchema(schema)(event)
    } catch (error) {
      throw new Error(`Event validation failed: ${error}`)
    }
  }

  /**
   * Execute event handlers with error isolation
   */
  private async executeHandlers(handlers: EventHandler[], event: EventPayload): Promise<void> {
    const context: EventContext = {
      teamId: event.teamId,
      userId: event.userId,
      timestamp: event.timestamp,
      source: event.source,
      metadata: event.metadata,
    }

    // Execute all handlers in parallel, but isolate errors
    const results = await Promise.allSettled(
      handlers.map(handler => handler(event, context))
    )

    // Log any handler errors (but don't stop event processing)
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Event handler ${index} failed:`, result.reason)
      }
    })
  }

  /**
   * Persist event to database for reliability and audit trail
   */
  private async persistEvent(event: EventPayload): Promise<void> {
    try {
      await prisma.event.create({
        data: {
          id: event.id,
          type: event.type,
          teamId: event.teamId,
          userId: event.userId,
          timestamp: event.timestamp,
          source: event.source,
          payload: event.payload || {},
          metadata: event.metadata || {},
        },
      })
    } catch (error) {
      console.error('Failed to persist event:', error)
      // Don't throw - event processing should continue even if persistence fails
    }
  }

  /**
   * Emit a system error event
   */
  private async emitSystemError(originalEvent: EventPayload, error: Error): Promise<void> {
    try {
      const errorEvent: EventPayload = {
        id: uuidv4(),
        type: EventTypes.SERVICE_ERROR,
        timestamp: new Date(),
        teamId: originalEvent.teamId,
        userId: originalEvent.userId,
        source: 'system',
        payload: {
          entityType: 'event_system',
          entityId: originalEvent.id,
          errorMessage: error.message,
          stackTrace: error.stack,
        },
        metadata: {
          originalEventType: originalEvent.type,
          originalEventId: originalEvent.id,
        },
      } as any

      // Direct emit to avoid recursion
      await this.persistEvent(errorEvent)

      // Notify error handlers directly
      const errorHandlers = this.handlers.get(EventTypes.SERVICE_ERROR) || new Set()
      await this.executeHandlers(Array.from(errorHandlers), errorEvent)

    } catch (nestedError) {
      console.error('Failed to emit system error event:', nestedError)
    }
  }

  /**
   * Deserialize stored event back to EventPayload
   */
  private deserializeEvent(storedEvent: any): EventPayload {
    return {
      id: storedEvent.id,
      type: storedEvent.type,
      timestamp: storedEvent.timestamp,
      teamId: storedEvent.teamId,
      userId: storedEvent.userId,
      source: storedEvent.source,
      payload: storedEvent.payload,
      metadata: storedEvent.metadata,
    } as EventPayload
  }
}

/**
 * Global event bus instance
 * Singleton pattern ensures consistent event handling across the application
 */
let globalEventBus: ArqEventBus | null = null

/**
 * Get or create the global event bus instance
 */
export function getEventBus(): ArqEventBus {
  if (!globalEventBus) {
    globalEventBus = new ArqEventBus({
      persistEvents: true,
      maxListeners: 200,
    })
  }
  return globalEventBus
}

/**
 * Create a team-scoped event bus helper
 * Automatically adds team context to emitted events
 */
export function createTeamEventBus(teamId: string, userId?: string) {
  const bus = getEventBus()

  return {
    async emit<T extends Omit<EventPayload, 'id' | 'timestamp' | 'teamId'>>(
      eventData: T & { source: EventPayload['source'] }
    ): Promise<void> {
      const event: EventPayload = {
        id: uuidv4(),
        timestamp: new Date(),
        teamId,
        userId,
        ...eventData,
      } as EventPayload

      await bus.emit(event)
    },

    on: bus.on.bind(bus),
    off: bus.off.bind(bus),
    once: bus.once.bind(bus),
    removeAllListeners: bus.removeAllListeners.bind(bus),
    getEventHistory: (options?: Parameters<typeof bus.getEventHistory>[1]) =>
      bus.getEventHistory(teamId, options),
    getEventStats: (since?: Date) => bus.getEventStats(teamId, since),
  }
}

/**
 * Event Bus Factory
 * For testing or creating isolated event bus instances
 */
export function createEventBus(options?: {
  persistEvents?: boolean
  maxListeners?: number
}): ArqEventBus {
  return new ArqEventBus(options)
}