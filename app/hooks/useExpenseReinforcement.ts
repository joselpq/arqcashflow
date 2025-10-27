'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useChat } from '../contexts/ChatContext'

interface ExpenseReinforcementData {
  contractCount: number
  receivablesTotal: number
  expenseCount: number
}

export function useExpenseReinforcement(data: ExpenseReinforcementData | null) {
  const pathname = usePathname()
  const { addProactiveMessage, openChat } = useChat()

  useEffect(() => {
    // Only run on dashboard
    if (pathname !== '/' || !data) return

    // Check if already shown in this session
    if (typeof window !== 'undefined') {
      const shown = sessionStorage.getItem('expense-reinforcement-shown')
      if (shown) return
    }

    // Check if user needs reinforcement (has contracts but no expenses)
    const needsReinforcement = data.contractCount > 0 && data.expenseCount === 0

    if (!needsReinforcement) return

    // Wait 10 seconds after dashboard loads
    const timer = setTimeout(() => {
      // Format currency
      const formatted = `R$ ${data.receivablesTotal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`

      // Add proactive message
      const message = `Ei! Vi que você cadastrou ${data.contractCount} contrato${data.contractCount > 1 ? 's' : ''} com ${formatted} em recebíveis.\n\nQue tal adicionar suas principais despesas agora? Assim você vê quanto realmente é seu lucro! 💰\n\nMe fale quais são suas despesas, recorrentes ou pontuais, que posso adicioná-las. Exemplo: "Salário da Fernanda de R$5000 todo dia 5, desde Agosto de 2024".`

      addProactiveMessage(message)
      openChat()

      // Mark as shown for this session
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('expense-reinforcement-shown', 'true')
      }
    }, 10000) // 10 seconds

    return () => clearTimeout(timer)
  }, [pathname, data, addProactiveMessage, openChat])
}
