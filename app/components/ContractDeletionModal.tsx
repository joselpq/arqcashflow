'use client'

import { useState, useEffect } from 'react'
import { DeletionInfo } from '@/lib/validation'
import { useTerminology } from '@/lib/hooks/useTerminology'

interface ContractDeletionModalProps {
  isOpen: boolean
  onClose: () => void
  contract: {
    id: string
    clientName: string
    projectName: string
  }
  onDeleteConfirm: (mode: 'contract-only' | 'contract-and-receivables') => void
}

export default function ContractDeletionModal({
  isOpen,
  onClose,
  contract,
  onDeleteConfirm
}: ContractDeletionModalProps) {
  const { terminology } = useTerminology()
  const [deletionInfo, setDeletionInfo] = useState<DeletionInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedMode, setSelectedMode] = useState<'contract-only' | 'contract-and-receivables'>('contract-only')

  // Fetch deletion info when modal opens
  useEffect(() => {
    if (isOpen && contract?.id) {
      fetchDeletionInfo()
    }
  }, [isOpen, contract?.id])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDeletionInfo(null)
      setSelectedMode('contract-only')
    }
  }, [isOpen])

  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const fetchDeletionInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/contracts/${contract.id}/deletion-info`)
      if (response.ok) {
        const info = await response.json()
        setDeletionInfo(info)
      } else {
        console.error('Failed to fetch deletion info')
        setDeletionInfo({
          canDelete: false,
          hasReceivables: false,
          receivablesCount: 0,
          receivables: []
        })
      }
    } catch (error) {
      console.error('Error fetching deletion info:', error)
      setDeletionInfo({
        canDelete: false,
        hasReceivables: false,
        receivablesCount: 0,
        receivables: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    onDeleteConfirm(selectedMode)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-all duration-300"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px) saturate(180%)',
          WebkitBackdropFilter: 'blur(8px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-2xl min-w-[480px]">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">
                Excluir {terminology.contract}
              </h3>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
                disabled={loading}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-neutral-600">Verificando dependências...</span>
              </div>
            ) : deletionInfo ? (
              <div className="space-y-4">
                {/* Contract Info */}
                <div className="bg-neutral-50 p-4 rounded-lg">
                  <p className="text-sm text-neutral-600 mb-1">{terminology.contract} a ser excluído:</p>
                  <p className="font-medium text-neutral-900">{contract.clientName}</p>
                  <p className="text-sm text-neutral-700">{contract.projectName}</p>
                </div>

                {/* Receivables Warning */}
                {deletionInfo.hasReceivables ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <svg className="h-5 w-5 text-amber-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.382 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="font-medium text-amber-800">
                        Atenção: Este contrato possui {deletionInfo.receivablesCount} recebível{deletionInfo.receivablesCount !== 1 ? 'eis' : ''} associado{deletionInfo.receivablesCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {deletionInfo.receivables.length > 0 && (
                      <div className="text-sm text-amber-700 space-y-1">
                        <p className="font-medium">Recebíveis afetados:</p>
                        {deletionInfo.receivables.slice(0, 3).map((receivable) => {
                          const expectedDate = new Date(receivable.expectedDate)
                          const formattedDate = expectedDate.toLocaleDateString('pt-BR')
                          return (
                            <div key={receivable.id} className="flex justify-between">
                              <span>• {formattedDate}</span>
                              <span className="font-medium">R$ {receivable.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )
                        })}
                        {deletionInfo.receivables.length > 3 && (
                          <p className="text-xs text-amber-600">... e mais {deletionInfo.receivables.length - 3}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-800">Este contrato não possui recebíveis associados. Pode ser excluído sem problemas.</span>
                    </div>
                  </div>
                )}

                {/* Deletion Options */}
                {deletionInfo.hasReceivables && (
                  <div className="space-y-3">
                    <p className="font-medium text-neutral-900">Como deseja proceder?</p>

                    <div className="space-y-2">
                      <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          type="radio"
                          name="deleteMode"
                          value="contract-only"
                          checked={selectedMode === 'contract-only'}
                          onChange={(e) => setSelectedMode(e.target.value as 'contract-only')}
                          className="mt-1 h-4 w-4 text-blue-600 border-neutral-300 focus:ring-blue-500"
                        />
                        <div className="ml-3">
                          <div className="font-medium text-neutral-900">Excluir apenas o contrato</div>
                          <div className="text-sm text-neutral-600">
                            Os recebíveis ficarão como "Recebível sem contrato" e manterão o nome do projeto como origem
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                        <input
                          type="radio"
                          name="deleteMode"
                          value="contract-and-receivables"
                          checked={selectedMode === 'contract-and-receivables'}
                          onChange={(e) => setSelectedMode(e.target.value as 'contract-and-receivables')}
                          className="mt-1 h-4 w-4 text-blue-600 border-neutral-300 focus:ring-blue-500"
                        />
                        <div className="ml-3">
                          <div className="font-medium text-neutral-900">Excluir contrato e todos os recebíveis</div>
                          <div className="text-sm text-neutral-600">
                            Todos os recebíveis associados serão excluídos permanentemente junto com o contrato.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-neutral-600">Erro ao carregar informações do contrato.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {deletionInfo && (
            <div className="bg-neutral-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !deletionInfo.canDelete}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                  selectedMode === 'contract-and-receivables'
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                }`}
              >
                {selectedMode === 'contract-and-receivables' ? 'Excluir Tudo' : `Excluir ${terminology.contract}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}