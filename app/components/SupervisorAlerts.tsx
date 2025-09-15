'use client'

import { useState, useEffect, useMemo } from 'react'

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

// Single unified style for all alerts
const alertStyle = {
  container: 'bg-yellow-50 border-yellow-200',
  icon: 'text-yellow-500',
  title: 'text-yellow-800',
  text: 'text-yellow-700'
}

const alertIcon = '⚠️'

const typeLabels = {
  duplicate: 'Duplicação',
  value: 'Valor',
  date: 'Data',
  consistency: 'Consistência',
  unusual: 'Incomum',
  relationship: 'Relacionamento'
}

export default function SupervisorAlerts({ alerts, onDismiss, className = '' }: SupervisorAlertsProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [expandedAlerts, setExpandedAlerts] = useState<Set<number>>(new Set())

  // Memoize the validAlerts calculation to prevent infinite re-renders
  const validAlerts = useMemo(() => {
    if (!alerts || !Array.isArray(alerts)) return []

    return alerts.filter(alert => alert && typeof alert === 'object').map(alert => {
      // Handle old format from supervisor
      if ('issue' in alert || 'description' in alert) {
        return {
          type: 'value' as const,
          message: (alert as any).issue || 'Data Issue',
          details: (alert as any).description || 'Please review this data',
          suggestions: ['Review and verify the data']
        }
      }
      // Ensure all required fields exist
      return {
        type: alert.type || 'unusual' as const,
        message: alert.message || 'Data anomaly detected',
        details: alert.details,
        suggestions: alert.suggestions,
        entityInfo: alert.entityInfo
      }
    })
  }, [alerts])

  useEffect(() => {
    setIsVisible(validAlerts.length > 0)
    setExpandedAlerts(new Set())
  }, [validAlerts.length]) // Use validAlerts.length instead of the entire array

  if (!isVisible || validAlerts.length === 0) {
    return null
  }

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedAlerts)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedAlerts(newExpanded)
  }


  return (
    <div className={`mb-6 ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 border border-gray-200 rounded-t-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-semibold text-gray-800">
            Supervisor de Qualidade
          </h3>
          <span className="text-sm text-gray-600">
            ({validAlerts.length} {validAlerts.length === 1 ? 'alerta' : 'alertas'})
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 text-lg font-bold"
          title="Dispensar alertas"
        >
          ×
        </button>
      </div>


      {/* Alerts List */}
      <div className="border-x border-b border-gray-200 rounded-b-lg">
        {validAlerts.map((alert, index) => {
          const isExpanded = expandedAlerts.has(index)
          const hasDetails = alert.details || (alert.suggestions && alert.suggestions.length > 0)

          return (
            <div
              key={index}
              className={`${alertStyle.container} ${index === 0 ? '' : 'border-t'} border-gray-200`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`text-xl ${alertStyle.icon} flex-shrink-0`}>
                    {alertIcon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs uppercase font-semibold px-2 py-1 rounded ${alertStyle.container} ${alertStyle.title}`}>
                            {typeLabels[alert.type] || 'Alerta'}
                          </span>
                        </div>
                        <p className={`text-sm font-medium ${alertStyle.title} leading-tight`}>
                          {alert.message}
                        </p>
                        {alert.entityInfo && (
                          <div className={`mt-1 text-xs ${alertStyle.text}`}>
                            <div className="font-medium">{alert.entityInfo.name}</div>
                            <div className="opacity-90">{alert.entityInfo.details}</div>
                          </div>
                        )}
                      </div>

                      {hasDetails && (
                        <button
                          onClick={() => toggleExpanded(index)}
                          className={`text-sm ${alertStyle.title} hover:opacity-75 flex-shrink-0 ml-2`}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && hasDetails && (
                      <div className={`mt-3 ${alertStyle.text} text-sm space-y-2`}>
                        {alert.details && (
                          <div>
                            <strong>Detalhes:</strong>
                            <p className="mt-1">{alert.details}</p>
                          </div>
                        )}

                        {alert.suggestions && alert.suggestions.length > 0 && (
                          <div>
                            <strong>Sugestões:</strong>
                            <ul className="mt-1 list-disc list-inside space-y-1 ml-2">
                              {alert.suggestions.map((suggestion, idx) => (
                                <li key={idx}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {alert.entityInfo?.editUrl && (
                          <div className="mt-3 pt-2 border-t border-current border-opacity-20">
                            <a
                              href={alert.entityInfo.editUrl}
                              className={`inline-flex items-center gap-1 text-sm font-medium ${alertStyle.title} hover:opacity-75 transition-opacity`}
                            >
                              ✏️ Editar {alert.entityInfo.name}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center py-2">
        💡 O supervisor analisa seus dados em tempo real para identificar possíveis inconsistências
      </div>
    </div>
  )
}