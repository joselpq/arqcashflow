"use client"

interface ExpenseMissingBannerProps {
  contractCount: number
  receivablesTotal: number
  onAddExpense: () => void
  onDismiss: () => void
}

export default function ExpenseMissingBanner({
  contractCount,
  receivablesTotal,
  onAddExpense,
  onDismiss
}: ExpenseMissingBannerProps) {
  function formatCurrency(amount: number): string {
    return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl" role="img" aria-label="Ideia">💡</span>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 text-lg mb-2">
              Adicione despesas para ver lucros precisos
            </h3>
            <p className="text-sm text-amber-700 mb-4 leading-relaxed">
              Você já cadastrou contratos e recebíveis, mas ainda não tem nenhuma despesa registrada, então seus números de lucro podem estar superestimados.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onAddExpense}
                className="bg-amber-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                Adicionar agora
              </button>
              <button
                onClick={onDismiss}
                className="text-amber-700 px-4 py-2 text-sm hover:underline"
              >
                Entendi, depois eu adiciono
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
