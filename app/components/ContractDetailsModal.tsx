'use client'

import { useEffect, useState } from 'react'
import { formatDateFull } from '@/lib/utils/date'

interface ContractDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  contract: any
}

interface Receivable {
  id: string
  title: string
  expectedDate: string
  amount: number
  status: string
}

interface Expense {
  id: string
  description: string
  dueDate: string
  amount: number
  status: string
}

export default function ContractDetailsModal({ isOpen, onClose, contract }: ContractDetailsModalProps) {
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && contract) {
      fetchContractDetails()
    }
  }, [isOpen, contract])

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

  async function fetchContractDetails() {
    if (!contract?.id) return

    setLoading(true)
    try {
      // Fetch receivables for this contract
      const receivablesRes = await fetch(`/api/receivables?contractId=${contract.id}`)
      const receivablesData = await receivablesRes.json()
      setReceivables(Array.isArray(receivablesData) ? receivablesData : [])

      // Fetch expenses for this contract
      const expensesRes = await fetch(`/api/expenses?contractId=${contract.id}`)
      const expensesData = await expensesRes.json()
      setExpenses(Array.isArray(expensesData) ? expensesData : [])
    } catch (error) {
      console.error('Error fetching contract details:', error)
      setReceivables([])
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendente' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Pago' },
      received: { bg: 'bg-green-100', text: 'text-green-800', label: 'Recebido' },
      overdue: { bg: 'bg-red-100', text: 'text-red-800', label: 'Atrasado' },
      cancelled: { bg: 'bg-neutral-100', text: 'text-neutral-800', label: 'Cancelado' }
    }

    const config = statusConfig[status] || statusConfig.pending
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const totalReceivables = Array.isArray(receivables)
    ? receivables.reduce((sum, r) => sum + (r.amount || 0), 0)
    : 0
  const totalExpenses = Array.isArray(expenses)
    ? expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    : 0
  const netProfit = totalReceivables - totalExpenses

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
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-4xl min-w-[640px]">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  {contract?.projectName}
                </h3>
                <p className="text-sm text-neutral-600 mt-1">
                  Cliente: {contract?.clientName}
                </p>
              </div>
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
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent mx-auto"></div>
                <p className="text-sm text-neutral-600 mt-4">Carregando detalhes...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Contract Information */}
                <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                  <h4 className="font-semibold text-neutral-900 mb-3">Informações do Contrato</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Valor Total</p>
                      <p className="text-lg font-bold text-neutral-900">
                        R$ {contract?.totalValue?.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Status</p>
                      <div className="mt-1">
                        <span className={`px-3 py-1 rounded-md text-sm font-medium ${
                          contract?.status === 'active' ? 'bg-green-100 text-green-800' :
                          contract?.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {contract?.status === 'active' ? 'Ativo' : contract?.status === 'completed' ? 'Concluído' : 'Cancelado'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Data de Assinatura</p>
                      <p className="text-sm text-neutral-900">{formatDateFull(contract?.signedDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Categoria</p>
                      <p className="text-sm text-neutral-900">{contract?.category || '-'}</p>
                    </div>
                  </div>
                  {contract?.description && (
                    <div className="mt-4">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Descrição</p>
                      <p className="text-sm text-neutral-700">{contract.description}</p>
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-neutral-900 mb-3">Resumo Financeiro</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-neutral-600 uppercase tracking-wider mb-1">Total Recebíveis</p>
                      <p className="text-lg font-bold text-green-700">
                        R$ {totalReceivables.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 uppercase tracking-wider mb-1">Total Despesas</p>
                      <p className="text-lg font-bold text-red-700">
                        R$ {totalExpenses.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 uppercase tracking-wider mb-1">Lucro Líquido</p>
                      <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        R$ {netProfit.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Receivables */}
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-3 flex items-center justify-between">
                    <span>Recebíveis ({receivables.length})</span>
                  </h4>
                  {receivables.length === 0 ? (
                    <p className="text-sm text-neutral-600 text-center py-4 bg-neutral-50 rounded-lg">
                      Nenhum recebível associado a este contrato
                    </p>
                  ) : (
                    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-neutral-50 border-b border-neutral-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Título
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Data Prevista
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Valor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {receivables.map((receivable) => (
                            <tr key={receivable.id} className="hover:bg-neutral-50">
                              <td className="px-4 py-3 text-sm text-neutral-900">{receivable.title}</td>
                              <td className="px-4 py-3 text-sm text-neutral-700">
                                {formatDateFull(receivable.expectedDate)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-neutral-900">
                                R$ {receivable.amount.toLocaleString('pt-BR')}
                              </td>
                              <td className="px-4 py-3">
                                {getStatusBadge(receivable.status)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Expenses */}
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-3 flex items-center justify-between">
                    <span>Despesas ({expenses.length})</span>
                  </h4>
                  {expenses.length === 0 ? (
                    <p className="text-sm text-neutral-600 text-center py-4 bg-neutral-50 rounded-lg">
                      Nenhuma despesa associada a este contrato
                    </p>
                  ) : (
                    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-neutral-50 border-b border-neutral-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Descrição
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Data de Vencimento
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Valor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {expenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-neutral-50">
                              <td className="px-4 py-3 text-sm text-neutral-900">{expense.description}</td>
                              <td className="px-4 py-3 text-sm text-neutral-700">
                                {formatDateFull(expense.dueDate)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-neutral-900">
                                R$ {expense.amount.toLocaleString('pt-BR')}
                              </td>
                              <td className="px-4 py-3">
                                {getStatusBadge(expense.status)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
