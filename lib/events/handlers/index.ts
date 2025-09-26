/**
 * Event Handlers - Main Export
 *
 * Centralized export for all event handlers and handler management utilities.
 */

export { BusinessEventHandlers } from './business'
export { AIEventHandlers } from './ai'
export { AuditEventHandlers } from './audit'

/**
 * Handler Registration Utility
 * Registers all default handlers with an event bus
 */
import { getEventBus } from '../bus'
import { BusinessEventHandlers } from './business'
import { AIEventHandlers } from './ai'
import { AuditEventHandlers } from './audit'

/**
 * Register all default event handlers
 * Call this during application startup to enable event processing
 */
export function registerDefaultHandlers() {
  const eventBus = getEventBus()

  // Register business logic handlers
  BusinessEventHandlers.registerAll(eventBus)

  // Register AI processing handlers
  AIEventHandlers.registerAll(eventBus)

  // Register audit/logging handlers
  AuditEventHandlers.registerAll(eventBus)

  console.log('Event system: All default handlers registered')
}

/**
 * Handler Health Check
 * Utility to verify that handlers are working correctly
 */
export async function verifyHandlerHealth(): Promise<{
  business: boolean
  ai: boolean
  audit: boolean
  overall: boolean
}> {
  try {
    const businessHealth = await BusinessEventHandlers.healthCheck()
    const aiHealth = await AIEventHandlers.healthCheck()
    const auditHealth = await AuditEventHandlers.healthCheck()

    return {
      business: businessHealth,
      ai: aiHealth,
      audit: auditHealth,
      overall: businessHealth && aiHealth && auditHealth,
    }
  } catch (error) {
    console.error('Handler health check failed:', error)
    return {
      business: false,
      ai: false,
      audit: false,
      overall: false,
    }
  }
}