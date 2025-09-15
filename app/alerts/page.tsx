'use client'

import { useState, useEffect } from 'react'
import SupervisorAlerts, { SupervisorAlert } from '@/app/components/SupervisorAlerts'
import { StoredAlert, getAlertsFromStorage } from '@/lib/alertStorage'

export default function AlertsPage() {
  const [storedAlerts, setStoredAlerts] = useState<StoredAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load alerts from localStorage
    try {
      const alerts = getAlertsFromStorage()
      console.log('🔍 DEBUG: Raw alerts from storage:', alerts)
      console.log('🔍 DEBUG: First alert structure:', alerts[0])
      setStoredAlerts(alerts)
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearAllAlerts = () => {
    setStoredAlerts([])
    localStorage.removeItem('arqcashflow-alerts')

    // Dispatch custom event to notify components about alert updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alertsUpdated'))
    }
  }

  const removeAlert = (index: number) => {
    const newAlerts = storedAlerts.filter((_, i) => i !== index)
    setStoredAlerts(newAlerts)
    if (newAlerts.length > 0) {
      localStorage.setItem('arqcashflow-alerts', JSON.stringify(newAlerts))
    } else {
      localStorage.removeItem('arqcashflow-alerts')
    }

    // Dispatch custom event to notify components about alert updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alertsUpdated'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="mb-4">
          <a href="/" className="text-blue-600 hover:underline">← Voltar ao Início</a>
        </div>
        <div className="text-center py-8">
          <p>Carregando alertas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-4">
        <a href="/" className="text-blue-600 hover:underline">← Voltar ao Início</a>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Central de Alertas</h1>
          <p className="text-gray-600 mt-2">
            Gerencie todos os alertas do supervisor de qualidade em um só lugar
          </p>
        </div>

        {storedAlerts.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={clearAllAlerts}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              🗑️ Limpar Todos
            </button>
            <button
              onClick={() => {
                clearAllAlerts()
                window.location.reload()
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              title="Limpa os alertas antigos e recarrega a página para ver melhorias"
            >
              🔄 Renovar Sistema
            </button>
          </div>
        )}
      </div>

      {/* Alert Statistics */}
      {storedAlerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-8">
          <div className="text-2xl font-bold text-yellow-800">
            {storedAlerts.length} {storedAlerts.length === 1 ? 'Alerta' : 'Alertas'}
          </div>
          <div className="text-sm text-yellow-600">Requerem sua atenção</div>
        </div>
      )}

      {/* Alerts Display */}
      {storedAlerts.length > 0 ? (
        <div className="space-y-4">
          {storedAlerts.map((alert, index) => (
            <div key={index} className="relative">
              <SupervisorAlerts
                alerts={[{
                  type: alert.type,
                  message: alert.message,
                  details: alert.details,
                  suggestions: alert.suggestions,
                  entityInfo: alert.entityInfo
                }]}
                onDismiss={() => removeAlert(index)}
                className="mb-0"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum Alerta Pendente!</h2>
          <p className="text-gray-600 mb-8">
            Todos os seus dados estão consistentes. O supervisor não detectou nenhum problema.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="font-semibold text-blue-800 mb-3">💡 Como Funciona o Supervisor</h3>
            <div className="text-sm text-blue-700 text-left space-y-2">
              <p>• <strong>Contratos:</strong> Detecta duplicatas, valores irreais, datas inconsistentes</p>
              <p>• <strong>Recebíveis:</strong> Valida valores vs contrato, cronogramas, lógica de negócio</p>
              <p>• <strong>Despesas:</strong> Identifica anomalias, categorias incorretas, fornecedores</p>
              <p>• <strong>IA Chat:</strong> Fornece insights proativos sobre suas consultas</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}