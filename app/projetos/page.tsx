'use client'

import { Suspense } from 'react'
import ContractsTab from './components/ContractsTab'

function ProjetosContent() {
  return <ContractsTab />
}

export default function ProjetosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="text-center py-12">
          <div className="animate-pulse text-neutral-500">Carregando...</div>
        </div>
      </div>
    }>
      <ProjetosContent />
    </Suspense>
  )
}
