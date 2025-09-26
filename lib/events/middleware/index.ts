/**
 * Event Middleware - Main Export
 *
 * Centralized export for all event middleware components.
 */

export { ValidationMiddleware } from './validation'
export { TeamContextMiddleware } from './team-context'

/**
 * Middleware Chain Utilities
 */
import { ValidationMiddleware } from './validation'
import { TeamContextMiddleware } from './team-context'
import type { EventPayload, EventHandler, EventContext } from '../types'

/**
 * Middleware Function Type
 */
export type EventMiddleware = (
  event: EventPayload,
  context: EventContext,
  next: () => Promise<void>
) => Promise<void>

/**
 * Create a middleware chain for event processing
 */
export function createMiddlewareChain(middlewares: EventMiddleware[]): EventMiddleware {
  return async (event: EventPayload, context: EventContext, finalHandler: () => Promise<void>) => {
    let index = 0

    async function dispatch(i: number): Promise<void> {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }

      index = i

      const middleware = middlewares[i]

      if (!middleware) {
        // No more middleware, call final handler
        return finalHandler()
      }

      return middleware(event, context, () => dispatch(i + 1))
    }

    return dispatch(0)
  }
}

/**
 * Default middleware chain for standard event processing
 */
export function createDefaultMiddlewareChain(): EventMiddleware {
  return createMiddlewareChain([
    ValidationMiddleware.validateEventStructure,
    ValidationMiddleware.validateEventPayload,
    TeamContextMiddleware.enforceTeamIsolation,
    TeamContextMiddleware.validateTeamAccess,
  ])
}

/**
 * Middleware chain for high-security events
 */
export function createSecureMiddlewareChain(): EventMiddleware {
  return createMiddlewareChain([
    ValidationMiddleware.validateEventStructure,
    ValidationMiddleware.validateEventPayload,
    ValidationMiddleware.sanitizeEventData,
    TeamContextMiddleware.enforceTeamIsolation,
    TeamContextMiddleware.validateTeamAccess,
    TeamContextMiddleware.auditTeamAccess,
  ])
}

/**
 * Apply middleware to an event handler
 */
export function withMiddleware(
  handler: EventHandler,
  middleware: EventMiddleware = createDefaultMiddlewareChain()
): EventHandler {
  return async (event: EventPayload, context: EventContext) => {
    await middleware(event, context, async () => {
      await handler(event, context)
    })
  }
}