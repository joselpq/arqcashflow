import { SupervisorAlert } from '@/app/components/SupervisorAlerts'

const ALERTS_STORAGE_KEY = 'arqcashflow-alerts'

export interface StoredAlert extends SupervisorAlert {
  id: string
  timestamp: number
  source: 'contract' | 'receivable' | 'expense' | 'ai-chat'
  sourceId?: string
  isRead: boolean
  entityInfo?: {
    name: string
    details: string
    editUrl?: string
  }
}

export function saveAlertsToStorage(
  alerts: SupervisorAlert[],
  source: StoredAlert['source'],
  sourceId?: string,
  entityInfo?: StoredAlert['entityInfo']
) {
  if (!alerts || alerts.length === 0) return

  try {
    const existingAlerts = getAlertsFromStorage()

    const newStoredAlerts: StoredAlert[] = alerts.map(alert => ({
      ...alert,
      id: `${source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      source,
      sourceId,
      isRead: false,
      entityInfo
    }))

    console.log('🔍 DEBUG STORAGE: New stored alerts:', newStoredAlerts)

    const allAlerts = [...existingAlerts, ...newStoredAlerts]

    // Keep only the last 50 alerts to prevent storage bloat
    const recentAlerts = allAlerts.slice(-50)

    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(recentAlerts))
    console.log('🔍 DEBUG STORAGE: Saved to localStorage:', recentAlerts)

    // Dispatch custom event to notify components about alert updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alertsUpdated'))
    }
  } catch (error) {
    console.error('Error saving alerts to storage:', error)
  }
}

export function getAlertsFromStorage(): StoredAlert[] {
  try {
    const stored = localStorage.getItem(ALERTS_STORAGE_KEY)
    if (!stored) return []

    const alerts = JSON.parse(stored)
    return Array.isArray(alerts) ? alerts : []
  } catch (error) {
    console.error('Error loading alerts from storage:', error)
    return []
  }
}

export function markAlertAsRead(alertId: string) {
  try {
    const alerts = getAlertsFromStorage()
    const updatedAlerts = alerts.map(alert =>
      alert.id === alertId ? { ...alert, isRead: true } : alert
    )
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(updatedAlerts))

    // Dispatch custom event to notify components about alert updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alertsUpdated'))
    }
  } catch (error) {
    console.error('Error marking alert as read:', error)
  }
}

export function clearAllAlerts() {
  try {
    localStorage.removeItem(ALERTS_STORAGE_KEY)

    // Dispatch custom event to notify components about alert updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alertsUpdated'))
    }
  } catch (error) {
    console.error('Error clearing alerts:', error)
  }
}


export function getAlertsBySource(source: StoredAlert['source']): StoredAlert[] {
  try {
    const alerts = getAlertsFromStorage()
    return alerts.filter(alert => alert.source === source)
  } catch (error) {
    console.error('Error filtering alerts by source:', error)
    return []
  }
}