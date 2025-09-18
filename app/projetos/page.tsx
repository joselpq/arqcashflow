'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// Import the existing components (we'll create these next)
import ContractsTab from './components/ContractsTab'
import ReceivablesTab from './components/ReceivablesTab'
import ExpensesTab from './components/ExpensesTab'

function ProjetosContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'contratos' | 'recebiveis' | 'despesas'>('contratos')

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'recebiveis' || tab === 'despesas') {
      setActiveTab(tab)
    } else {
      setActiveTab('contratos')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mb-4">
        <a href="/" className="text-blue-700 hover:text-blue-800 font-medium">← Dashboard</a>
      </div>

      <h1 className="text-3xl font-bold text-neutral-900 tracking-wide mb-8">🏗️ Projetos</h1>

      {/* Tab Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-8 border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('contratos')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'contratos'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            📝 Contratos
          </button>
          <button
            onClick={() => setActiveTab('recebiveis')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'recebiveis'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            💰 Recebíveis
          </button>
          <button
            onClick={() => setActiveTab('despesas')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'despesas'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            💸 Despesas
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'contratos' && <ContractsTab />}
        {activeTab === 'recebiveis' && <ReceivablesTab />}
        {activeTab === 'despesas' && <ExpensesTab />}
      </div>
    </div>
  )
}

export default function ProjetosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="mb-4">
          <a href="/" className="text-blue-700 hover:text-blue-800 font-medium">← Dashboard</a>
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-wide mb-8">🏗️ Projetos</h1>
        <div className="text-center py-12">
          <div className="animate-pulse text-neutral-500">Carregando...</div>
        </div>
      </div>
    }>
      <ProjetosContent />
    </Suspense>
  )
}