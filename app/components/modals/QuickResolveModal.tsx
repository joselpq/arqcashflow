'use client'

import Modal from '../Modal'
import { formatDateShort } from '@/lib/utils/date'

interface QuickResolveModalProps {
  isOpen: boolean
  onClose: () => void
  entityType: 'receivable' | 'expense'
  entity: {
    id: string
    description: string
    amount: number
    dueDate: string
    client?: string
    project?: string
    vendor?: string
  }
  onMarkAsReceived: () => void
  onPostpone: () => void
  onEditFull: () => void
}

export default function QuickResolveModal({
  isOpen,
  onClose,
  entityType,
  entity,
  onMarkAsReceived,
  onPostpone,
  onEditFull
}: QuickResolveModalProps) {
  function formatCurrency(amount: number): string {
    return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  function getDaysOverdue(dueDate: string): number {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = today.getTime() - due.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const title = entityType === 'receivable' ? 'Resolver Recebimento Atrasado' : 'Resolver Pagamento Atrasado'
  const markAsLabel = entityType === 'receivable' ? 'Marcar como recebido' : 'Marcar como pago'
  const markAsDescription = entityType === 'receivable' ? 'Registrar que você recebeu' : 'Registrar que você pagou'

  const displayTitle = entity.client && entity.project
    ? `${entity.client} - ${entity.project}`
    : entity.vendor
    ? `${entity.description} - ${entity.vendor}`
    : entity.description

  const daysOverdue = getDaysOverdue(entity.dueDate)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-6">
        {/* Entity Summary */}
        <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-lg">📄</span>
            <p className="font-medium text-neutral-900 flex-1">{displayTitle}</p>
          </div>
          <div className="flex items-center gap-2 text-neutral-700">
            <span className="text-lg">💰</span>
            <p className="font-semibold text-lg">{formatCurrency(entity.amount)}</p>
          </div>
          <div className="flex items-center gap-2 text-red-600">
            <span className="text-lg">📅</span>
            <p className="text-sm">
              Venceu em: {new Date(entity.dueDate).toLocaleDateString('pt-BR')} ({daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'})
            </p>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-4" />

        {/* Action Selection */}
        <div className="space-y-4">
          <p className="font-medium text-neutral-900 text-center">O que você gostaria de fazer?</p>

          {/* Primary Action: Mark as Received/Paid */}
          <button
            onClick={onMarkAsReceived}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg p-4 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-semibold text-lg mb-1">{markAsLabel}</p>
                <p className="text-sm text-green-100">{markAsDescription}</p>
              </div>
            </div>
          </button>

          {/* Secondary Action: Postpone */}
          <button
            onClick={onPostpone}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-900 border-2 border-blue-200 rounded-lg p-4 transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <p className="font-semibold text-base mb-1">Adiar para outra data</p>
                <p className="text-sm text-blue-700">Mudar a data de vencimento</p>
              </div>
            </div>
          </button>

          {/* Tertiary Option: Edit Full Details */}
          <div className="text-center">
            <button
              onClick={onEditFull}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              ou editar detalhes completos →
            </button>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="border-t border-neutral-200 pt-4">
          <button
            onClick={onClose}
            className="w-full text-neutral-600 hover:text-neutral-800 py-2 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  )
}
