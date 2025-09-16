'use client'

// Placeholder interface to maintain compatibility
export interface SupervisorAlert {
  type: 'duplicate' | 'value' | 'date' | 'consistency' | 'unusual' | 'relationship'
  message: string
  details?: string
  suggestions?: string[]
  entityInfo?: {
    name: string
    details: string
    editUrl?: string
  }
}

interface SupervisorAlertsProps {
  alerts: SupervisorAlert[]
  onDismiss?: () => void
  className?: string
}

// Placeholder component - no functionality, just maintains UI compatibility
export default function SupervisorAlerts({ alerts, onDismiss, className = '' }: SupervisorAlertsProps) {
  // Always return null - no supervisor alerts will be shown
  // This maintains component compatibility while we rebuild supervisor integration
  return null
}