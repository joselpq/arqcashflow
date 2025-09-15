// Debug script to check localStorage alerts
console.log('=== DEBUG: Checking localStorage alerts ===')

const ALERTS_STORAGE_KEY = 'arqcashflow-alerts'

try {
  const stored = localStorage.getItem(ALERTS_STORAGE_KEY)
  console.log('Raw localStorage data:', stored)

  if (stored) {
    const alerts = JSON.parse(stored)
    console.log('Parsed alerts:', alerts)
    console.log('Total alerts:', alerts.length)

    alerts.forEach((alert, index) => {
      console.log(`Alert ${index}:`, {
        severity: alert.severity,
        type: alert.type,
        message: alert.message,
        isRead: alert.isRead,
        source: alert.source
      })
    })

    const unreadCount = alerts.filter(alert => !alert.isRead).length
    console.log('Unread count:', unreadCount)

    const severityBreakdown = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    }, {})
    console.log('Severity breakdown:', severityBreakdown)

  } else {
    console.log('No alerts in localStorage')
  }
} catch (error) {
  console.error('Error reading localStorage:', error)
}