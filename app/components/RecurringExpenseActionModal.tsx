'use client'

import { useState } from 'react'

interface RecurringExpenseActionModalProps {
  isOpen: boolean
  onClose: () => void
  expense: {
    id: string
    description: string
    recurringExpenseId?: string | null
    isRecurring?: boolean
    dueDate: string
  }
  action: 'edit' | 'delete'
  onActionConfirm: (scope: 'this' | 'future' | 'all') => void
}

export default function RecurringExpenseActionModal({
  isOpen,
  onClose,
  expense,
  action,
  onActionConfirm
}: RecurringExpenseActionModalProps) {
  const [selectedScope, setSelectedScope] = useState<'this' | 'future' | 'all'>('this')

  if (!isOpen) return null

  const actionText = action === 'edit' ? 'editar' : 'excluir'
  const actionTextCap = action === 'edit' ? 'Editar' : 'Excluir'

  const handleConfirm = () => {
    onActionConfirm(selectedScope)
    onClose()
  }

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
                {actionTextCap} despesa recorrente
              </h3>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-6 max-h-[calc(100vh-180px)] overflow-y-auto">

          <div className="mb-6">
            <p className="text-gray-700 mb-3 text-base">
              Você está prestes a {actionText} uma despesa que faz parte de uma série recorrente:
            </p>
            <div className="font-medium text-gray-900 bg-gray-50 p-4 rounded-md border border-gray-200">
              "{expense.description}"
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <label className={`flex items-start space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
              selectedScope === 'this'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input
                type="radio"
                id="this-only"
                name="scope"
                value="this"
                checked={selectedScope === 'this'}
                onChange={(e) => setSelectedScope(e.target.value as 'this')}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  Apenas esta despesa
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {actionTextCap} somente esta ocorrência específica
                </p>
              </div>
            </label>

            <label className={`flex items-start space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
              selectedScope === 'future'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input
                type="radio"
                id="this-and-future"
                name="scope"
                value="future"
                checked={selectedScope === 'future'}
                onChange={(e) => setSelectedScope(e.target.value as 'future')}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  Esta e futuras despesas
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {actionTextCap} esta despesa e todas as próximas da série
                </p>
              </div>
            </label>

            <label className={`flex items-start space-x-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
              selectedScope === 'all'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input
                type="radio"
                id="all-expenses"
                name="scope"
                value="all"
                checked={selectedScope === 'all'}
                onChange={(e) => setSelectedScope(e.target.value as 'all')}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  Todas as despesas da série
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {actionTextCap} todas as despesas passadas e futuras desta série recorrente
                </p>
              </div>
            </label>
          </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className={`px-5 py-2.5 text-base font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                }`}
              >
                Confirmar {actionTextCap}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}