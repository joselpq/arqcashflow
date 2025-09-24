/**
 * Simple Error Monitoring and Alerting for Service Layer Migration
 * Provides basic error tracking and performance monitoring
 */

export interface MonitoringEvent {
  timestamp: Date
  level: 'info' | 'warn' | 'error'
  category: 'service-layer' | 'legacy' | 'performance' | 'general'
  message: string
  metadata?: Record<string, any>
  error?: Error
}

export class ServiceLayerMonitoring {
  private static events: MonitoringEvent[] = []

  /**
   * Log a service layer event
   */
  static log(level: MonitoringEvent['level'], category: MonitoringEvent['category'], message: string, metadata?: Record<string, any>, error?: Error) {
    const event: MonitoringEvent = {
      timestamp: new Date(),
      level,
      category,
      message,
      metadata,
      error
    }

    this.events.push(event)

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
      logFn(`[${category.toUpperCase()}] ${message}`, metadata || '', error || '')
    }

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }
  }

  /**
   * Log service layer usage
   */
  static logServiceUsage(endpoint: string, method: string, duration: number, success: boolean, error?: Error) {
    this.log(
      success ? 'info' : 'error',
      'service-layer',
      `Service layer ${success ? 'success' : 'error'}: ${method} ${endpoint}`,
      { endpoint, method, duration, success },
      error
    )
  }

  /**
   * Log legacy implementation usage
   */
  static logLegacyUsage(endpoint: string, method: string, duration: number, success: boolean, error?: Error) {
    this.log(
      success ? 'info' : 'error',
      'legacy',
      `Legacy implementation ${success ? 'success' : 'error'}: ${method} ${endpoint}`,
      { endpoint, method, duration, success },
      error
    )
  }

  /**
   * Log performance comparison
   */
  static logPerformanceComparison(endpoint: string, serviceTime: number, legacyTime: number) {
    const diff = serviceTime - legacyTime
    const percentage = legacyTime > 0 ? ((diff / legacyTime) * 100).toFixed(1) : '0'

    this.log(
      'info',
      'performance',
      `Performance comparison for ${endpoint}: Service=${serviceTime}ms, Legacy=${legacyTime}ms (${diff > 0 ? '+' : ''}${percentage}%)`,
      { endpoint, serviceTime, legacyTime, diff, percentage }
    )
  }

  /**
   * Get error rate for a specific category and time window
   */
  static getErrorRate(category: MonitoringEvent['category'], windowMinutes: number = 60): number {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000)
    const relevantEvents = this.events.filter(e => e.category === category && e.timestamp > cutoff)

    if (relevantEvents.length === 0) return 0

    const errorCount = relevantEvents.filter(e => e.level === 'error').length
    return (errorCount / relevantEvents.length) * 100
  }

  /**
   * Get recent events
   */
  static getRecentEvents(minutes: number = 60): MonitoringEvent[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return this.events.filter(e => e.timestamp > cutoff)
  }

  /**
   * Get health summary
   */
  static getHealthSummary() {
    const serviceErrorRate = this.getErrorRate('service-layer', 60)
    const legacyErrorRate = this.getErrorRate('legacy', 60)
    const recentEvents = this.getRecentEvents(60).length
    const errorEvents = this.getRecentEvents(60).filter(e => e.level === 'error').length

    return {
      serviceLayerErrorRate: serviceErrorRate,
      legacyErrorRate: legacyErrorRate,
      recentEventCount: recentEvents,
      recentErrorCount: errorEvents,
      overallHealth: serviceErrorRate < 5 && legacyErrorRate < 5 ? 'healthy' : 'warning',
      timestamp: new Date()
    }
  }

  /**
   * Clear all events (for testing)
   */
  static clear() {
    this.events = []
  }
}

/**
 * Decorator for monitoring service layer calls
 */
export function withServiceMonitoring<T>(
  endpoint: string,
  method: string,
  implementation: () => Promise<T>,
  implementationType: 'service' | 'legacy' = 'service'
): Promise<T> {
  const start = Date.now()

  return implementation()
    .then(result => {
      const duration = Date.now() - start

      if (implementationType === 'service') {
        ServiceLayerMonitoring.logServiceUsage(endpoint, method, duration, true)
      } else {
        ServiceLayerMonitoring.logLegacyUsage(endpoint, method, duration, true)
      }

      return result
    })
    .catch(error => {
      const duration = Date.now() - start

      if (implementationType === 'service') {
        ServiceLayerMonitoring.logServiceUsage(endpoint, method, duration, false, error)
      } else {
        ServiceLayerMonitoring.logLegacyUsage(endpoint, method, duration, false, error)
      }

      throw error
    })
}