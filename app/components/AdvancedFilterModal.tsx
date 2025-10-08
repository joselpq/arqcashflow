'use client'

/**
 * AdvancedFilterModal - AI-Powered Natural Language Filtering
 *
 * Allows users to filter data using natural language queries powered by Claude.
 * Displays query interpretation, results preview, and allows applying filtered results.
 */

import { useState } from 'react'

interface AdvancedFilterModalProps {
  entity: 'receivable' | 'expense' | 'contract'
  isOpen: boolean
  onClose: () => void
  onResultsReceived: (results: any[]) => void
}

interface FilterResult {
  success: boolean
  query: {
    where: any
    orderBy?: any
    interpretation: string
  }
  results: any[]
  count: number
  error?: string
  message?: string
}

export function AdvancedFilterModal({
  entity,
  isOpen,
  onClose,
  onResultsReceived
}: AdvancedFilterModalProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FilterResult | null>(null)

  if (!isOpen) return null

  const handleFilter = async () => {
    if (!input.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/filters/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, entity })
      })

      console.log('[Modal] Response status:', response.status)
      console.log('[Modal] Response OK?', response.ok)

      const data = await response.json()
      console.log('[Modal] Response data RAW:', JSON.stringify(data, null, 2))
      console.log('[Modal] data keys:', Object.keys(data))
      console.log('[Modal] data.success:', data.success)
      console.log('[Modal] Has query?', !!data.query)
      console.log('[Modal] Has results?', !!data.results)

      // Validate response has required fields for success case
      const isValidSuccess = data.success === true && data.query && data.results !== undefined

      const normalizedData = {
        ...data,
        success: isValidSuccess,
        // Ensure query exists even if success is false
        query: data.query || { where: {}, interpretation: '' },
        results: data.results || [],
        count: data.count || 0
      }
      console.log('[Modal] Normalized data:', normalizedData)

      // If successful, immediately apply and close (no UI rendering)
      if (isValidSuccess && normalizedData.results.length > 0) {
        onResultsReceived(normalizedData.results)
        handleClose()
      } else {
        // Show in modal if there's an error or no results
        setResult(normalizedData)
      }
    } catch (error) {
      console.error('AI Filtering error:', error)
      setResult({
        success: false,
        error: 'Erro ao processar consulta',
        message: 'Não foi possível conectar ao servidor. Tente novamente.',
        query: { where: {}, interpretation: '' },
        results: [],
        count: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApplyResults = () => {
    if (result && result.results) {
      onResultsReceived(result.results)
      handleClose()
    }
  }

  const handleClose = () => {
    setInput('')
    setResult(null)
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleFilter()
    }
  }

  const getEntityLabel = () => {
    switch (entity) {
      case 'receivable': return 'Recebíveis'
      case 'expense': return 'Despesas'
      case 'contract': return 'Projetos'
    }
  }

  const getPlaceholderExamples = () => {
    switch (entity) {
      case 'receivable':
        return `Descreva o que você quer filtrar...

Exemplos:
• atrasados do João Silva acima de 10k
• recebidos este mês ordenados por valor
• últimos 30 dias do projeto Residência`

      case 'expense':
        return `Descreva o que você quer filtrar...

Exemplos:
• despesas recorrentes OU canceladas
• últimos 7 dias acima de 5k ordenadas por data
• despesas operacionais do fornecedor Silva`

      case 'contract':
        return `Descreva o que você quer filtrar...

Exemplos:
• contratos ativos acima de 50k
• projetos finalizados este mês
• clientes Silva ordenados por valor`
    }
  }

  const formatResultPreview = (item: any) => {
    switch (entity) {
      case 'receivable':
        return (
          <div key={item.id} className="p-3 border-b hover:bg-neutral-50 cursor-pointer">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium text-neutral-900">
                  {item.contract?.projectName || item.clientName || 'Sem projeto'}
                </p>
                <p className="text-sm text-neutral-600">{item.description || 'Sem descrição'}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Vencimento: {new Date(item.expectedDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-neutral-900">
                  R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  item.status === 'received' ? 'bg-green-100 text-green-800' :
                  item.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  item.status === 'cancelled' ? 'bg-neutral-100 text-neutral-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {item.status === 'received' ? 'Recebido' :
                   item.status === 'overdue' ? 'Atrasado' :
                   item.status === 'cancelled' ? 'Cancelado' :
                   'Pendente'}
                </span>
              </div>
            </div>
          </div>
        )

      case 'expense':
        return (
          <div key={item.id} className="p-3 border-b hover:bg-neutral-50 cursor-pointer">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium text-neutral-900">{item.description}</p>
                <p className="text-sm text-neutral-600">
                  {item.vendor || 'Sem fornecedor'} • {item.category}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Vencimento: {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-neutral-900">
                  R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  item.status === 'paid' ? 'bg-green-100 text-green-800' :
                  item.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  item.status === 'cancelled' ? 'bg-neutral-100 text-neutral-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {item.status === 'paid' ? 'Pago' :
                   item.status === 'overdue' ? 'Atrasado' :
                   item.status === 'cancelled' ? 'Cancelado' :
                   'Pendente'}
                </span>
              </div>
            </div>
          </div>
        )

      case 'contract':
        return (
          <div key={item.id} className="p-3 border-b hover:bg-neutral-50 cursor-pointer">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium text-neutral-900">{item.projectName}</p>
                <p className="text-sm text-neutral-600">{item.clientName}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {item.category || 'Sem categoria'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-neutral-900">
                  R$ {item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  item.status === 'active' ? 'bg-green-100 text-green-800' :
                  item.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  'bg-neutral-100 text-neutral-800'
                }`}>
                  {item.status === 'active' ? 'Ativo' :
                   item.status === 'completed' ? 'Finalizado' :
                   'Cancelado'}
                </span>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <>
      {/* Backdrop - Glassy blurred effect */}
      <div
        className="fixed inset-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px) saturate(180%)',
          WebkitBackdropFilter: 'blur(8px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-200 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                🤖 Filtros Avançados com Arnaldo
              </h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-blue-100 text-sm mt-1">
              Filtre {getEntityLabel()} usando linguagem natural
            </p>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Digite sua consulta (Ctrl+Enter para filtrar)
              </label>
              <textarea
                placeholder={getPlaceholderExamples()}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                rows={4}
                disabled={loading}
                className="w-full p-3 border border-neutral-300 rounded-lg focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-neutral-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleFilter}
                disabled={loading || !input.trim()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin inline-block w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Processando...
                  </>
                ) : (
                  '🤖 Filtrar'
                )}
              </button>
              <button
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-3 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancelar
              </button>
            </div>

            {/* Results */}
            {result && (
              <div className="space-y-4">
                {result.success ? (
                  <>
                    {/* Interpretation */}
                    {result.query?.interpretation && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 mb-1">✓ Interpretado como:</p>
                        <p className="text-blue-800">{result.query.interpretation}</p>
                      </div>
                    )}

                    {/* Result count with auto-close message */}
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-900">
                        ✓ <span className="font-bold">{result.count}</span> item(ns) encontrado(s)
                        {result.count === 100 && <span className="text-green-700"> (limitado a 100)</span>}
                      </p>
                      {result.count > 0 && (
                        <p className="text-xs text-green-700 mt-1">
                          Aplicando filtros...
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  /* Error message */
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-900 mb-1">❌ Erro:</p>
                    <p className="text-red-800">{result.message || result.error}</p>
                    <p className="text-xs text-red-700 mt-2">
                      Dica: Tente reformular sua consulta de forma mais simples ou específica.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
