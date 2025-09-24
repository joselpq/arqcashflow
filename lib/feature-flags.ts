/**
 * Feature Flags Configuration
 * Centralized management of feature flags for gradual rollouts
 */

export class FeatureFlags {
  /**
   * Service Layer Migration Feature Flag
   * Controls whether to use the new service layer or legacy direct API implementation
   */
  static get useServiceLayer(): boolean {
    return process.env.USE_SERVICE_LAYER === "true"
  }

  /**
   * Get all current feature flag states for debugging
   */
  static getAllFlags() {
    return {
      useServiceLayer: this.useServiceLayer,
      environment: process.env.NODE_ENV || 'development'
    }
  }

  /**
   * Log current feature flag state (useful for debugging)
   */
  static logFlags() {
    console.log('[FeatureFlags]', this.getAllFlags())
  }
}

/**
 * Helper function for conditional service layer usage with monitoring
 * @param serviceImplementation - Function to call when service layer is enabled
 * @param legacyImplementation - Function to call when using legacy implementation
 * @param endpoint - API endpoint for monitoring (optional)
 * @param method - HTTP method for monitoring (optional)
 * @returns Result from the appropriate implementation
 */
export async function withServiceLayerFlag<T>(
  serviceImplementation: () => Promise<T>,
  legacyImplementation: () => Promise<T>,
  endpoint?: string,
  method?: string
): Promise<T> {
  const { withServiceMonitoring } = await import('./monitoring')

  if (FeatureFlags.useServiceLayer) {
    if (endpoint && method) {
      return await withServiceMonitoring(endpoint, method, serviceImplementation, 'service')
    }
    return await serviceImplementation()
  }

  if (endpoint && method) {
    return await withServiceMonitoring(endpoint, method, legacyImplementation, 'legacy')
  }
  return await legacyImplementation()
}