import ExportButtons from './components/ExportButtons'

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">ArqCashflow - Gestão de Fluxo de Caixa para Arquitetos</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border p-6 rounded">
          <h2 className="text-xl font-semibold mb-4">Links Rápidos</h2>
          <div className="space-y-2">
            <a href="/contracts" className="block text-blue-600 hover:underline">
              📝 Gerenciar Contratos
            </a>
            <a href="/receivables" className="block text-blue-600 hover:underline">
              💰 Gerenciar Recebíveis
            </a>
            <a href="/expenses" className="block text-blue-600 hover:underline">
              💸 Gerenciar Despesas
            </a>
            <a href="/ai-chat" className="block text-blue-600 hover:underline">
              🤖 Chat IA - Faça Perguntas
            </a>
            <a href="/alerts" className="block text-blue-600 hover:underline">
              🚨 Central de Alertas
            </a>
            <div className="border-t pt-2 mt-4">
              <h3 className="text-md font-medium mb-2">📊 Exportar Relatórios</h3>
              <ExportButtons />
            </div>
          </div>
        </div>

        <div className="border p-6 rounded">
          <h2 className="text-xl font-semibold mb-4">Endpoints da API</h2>
          <div className="space-y-1 text-sm font-mono">
            <p>GET /api/contracts</p>
            <p>POST /api/contracts</p>
            <p>GET /api/receivables</p>
            <p>POST /api/receivables</p>
            <p>GET /api/expenses</p>
            <p>POST /api/expenses</p>
            <p>GET /api/budgets</p>
            <p>POST /api/budgets</p>
            <p>GET /api/export/excel</p>
            <p>POST /api/export/google-sheets</p>
            <p>POST /api/ai/query</p>
          </div>
        </div>
      </div>
    </div>
  )
}