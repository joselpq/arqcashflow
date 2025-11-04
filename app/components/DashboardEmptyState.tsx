'use client'

import { useTerminology } from '@/lib/hooks/useTerminology'

interface DashboardEmptyStateProps {
  onImportData: () => void
}

export default function DashboardEmptyState({ onImportData }: DashboardEmptyStateProps) {
  const { terminology } = useTerminology()
  return (
    <div className="min-h-[600px] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Icon/Illustration */}
        <div className="mb-8">
          <div className="text-8xl mb-4">📊</div>
          <div className="text-6xl opacity-60">📁 💼 📄</div>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-light text-neutral-900 mb-4">
          Bem-vindo ao ArqCashflow!
        </h2>
        <p className="text-lg text-neutral-600 mb-8">
          Comece importando seus dados financeiros para ter uma visão completa do seu fluxo de caixa
        </p>

        {/* What you can import */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            O que você pode importar?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📈</span>
              <div>
                <p className="font-medium text-neutral-900">Planilhas Excel/CSV</p>
                <p className="text-sm text-neutral-600">{terminology.contracts}, recebíveis e despesas</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <p className="font-medium text-neutral-900">Documentos PDF</p>
                <p className="text-sm text-neutral-600">Propostas, contratos e faturas</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🖼️</span>
              <div>
                <p className="font-medium text-neutral-900">Imagens</p>
                <p className="text-sm text-neutral-600">Fotos de recibos e notas</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <p className="font-medium text-neutral-900">E-mails</p>
                <p className="text-sm text-neutral-600">Confirmações e contratos</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onImportData}
          className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
        >
          🤖 Importar Dados com IA
        </button>

        {/* Secondary message */}
        <p className="text-sm text-neutral-500 mt-6">
          Nossa IA irá extrair automaticamente as informações dos seus arquivos
        </p>

        {/* Additional info */}
        <div className="mt-8 pt-8 border-t border-neutral-200">
          <p className="text-sm text-neutral-600 mb-4">
            Ou comece criando seus dados manualmente:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="/projetos?tab=contratos"
              className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-sm hover:bg-neutral-50 transition-colors"
            >
              + Criar {terminology.contract}
            </a>
            <a
              href="/projetos?tab=recebiveis"
              className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-sm hover:bg-neutral-50 transition-colors"
            >
              + Adicionar Recebível
            </a>
            <a
              href="/projetos?tab=despesas"
              className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-sm hover:bg-neutral-50 transition-colors"
            >
              + Registrar Despesa
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
