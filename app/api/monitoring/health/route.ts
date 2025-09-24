/**
 * Service Layer Migration Health Monitoring Endpoint
 *
 * Provides health status and performance metrics for the service layer migration
 * Used for monitoring dashboard and alerting
 */

import { NextRequest, NextResponse } from 'next/server'
import { ServiceLayerMonitoring } from '@/lib/monitoring'
import { FeatureFlags } from '@/lib/feature-flags'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const minutes = parseInt(searchParams.get('minutes') || '60')

    const healthSummary = ServiceLayerMonitoring.getHealthSummary()
    const recentEvents = ServiceLayerMonitoring.getRecentEvents(minutes)
    const featureFlags = FeatureFlags.getAllFlags()

    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      featureFlags,
      health: healthSummary,
      metrics: {
        serviceLayerErrorRate: healthSummary.serviceLayerErrorRate,
        legacyErrorRate: healthSummary.legacyErrorRate,
        recentEvents: recentEvents.length,
        recentErrors: recentEvents.filter(e => e.level === 'error').length,
        windowMinutes: minutes
      },
      recentErrors: recentEvents
        .filter(e => e.level === 'error')
        .slice(-10) // Last 10 errors
        .map(e => ({
          timestamp: e.timestamp,
          category: e.category,
          message: e.message,
          metadata: e.metadata
        }))
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve health status',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Reset monitoring data (for testing/development)
 */
export async function DELETE() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  ServiceLayerMonitoring.clear()

  return NextResponse.json({
    status: 'ok',
    message: 'Monitoring data cleared',
    timestamp: new Date().toISOString()
  })
}