'use client'

import { Suspense } from 'react'
import EnhancedAIChatPage from './enhanced-page'

export default function AIChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
      </div>
    }>
      <EnhancedAIChatPage />
    </Suspense>
  )
}