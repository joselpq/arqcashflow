'use client'

import { useState } from 'react'
import SupervisorAlerts, { SupervisorAlert } from '@/app/components/SupervisorAlerts'

export default function AIChatPage() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<Array<{ question: string; answer: string; sqlQuery?: string }>>([])
  const [supervisorAlerts, setSupervisorAlerts] = useState<SupervisorAlert[]>([])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)

    // Get last 20 messages for context (10 Q&A pairs)
    const conversationHistory = history.slice(-10).map(item => ({
      question: item.question,
      answer: item.answer
    }))

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: conversationHistory
        }),
      })

      if (res.ok) {
        const result = await res.json()

        // Handle supervisor alerts
        if (result.alerts && result.alerts.length > 0) {
          setSupervisorAlerts(result.alerts)
        }

        const newHistoryItem = {
          question,
          answer: result.answer,
          sqlQuery: result.sqlQuery
        }
        setHistory(prev => [...prev, newHistoryItem])
        setQuestion('')
      } else {
        const error = await res.json()
        alert('Erro: ' + error.error)
      }
    } catch (error) {
      alert('Falha ao processar consulta. Certifique-se de que OPENAI_API_KEY está configurada no .env')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mb-4">
        <a href="/" className="text-blue-600 hover:underline">← Voltar ao Início</a>
      </div>

      <h1 className="text-3xl font-bold mb-8">Chat IA - Faça Perguntas Sobre Seu Fluxo de Caixa</h1>

      {/* Supervisor Alerts */}
      <SupervisorAlerts
        alerts={supervisorAlerts}
        onDismiss={() => setSupervisorAlerts([])}
      />

      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
          <p className="text-sm">
            <strong>Nota:</strong> Certifique-se de configurar sua OPENAI_API_KEY no arquivo .env para usar este recurso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border rounded px-4 py-2"
              placeholder="Faça uma pergunta sobre seu fluxo de caixa... (ex: Qual foi minha receita média mensal?)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Perguntar'}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Perguntas de Exemplo:</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Qual foi minha receita total no mês passado?</li>
            <li>Quantos contratos ativos eu tenho?</li>
            <li>Qual é o valor médio dos meus contratos?</li>
            <li>Mostre todos os recebíveis em atraso</li>
            <li>Quanto dinheiro estou esperando receber este mês?</li>
            <li>Qual percentual dos meus recebíveis é pago em dia?</li>
            <li>Liste todos os contratos na categoria visita de obra</li>
          </ul>

          {history.length > 0 && (
            <>
              <h2 className="text-xl font-semibold mt-8">Histórico do Chat</h2>
              <div className="space-y-4">
                {history.map((item, index) => (
                  <div key={index} className="border p-4 rounded">
                    <div className="mb-2">
                      <strong>P:</strong> {item.question}
                    </div>
                    <div className="mb-2">
                      <strong>R:</strong> {item.answer}
                    </div>
                    <details className="text-sm text-gray-600">
                      <summary className="cursor-pointer">Mostrar Consulta SQL</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                        {item.sqlQuery}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}