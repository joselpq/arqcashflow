export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">ArqCashflow - Gestão de Fluxo de Caixa para Arquitetos</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border p-6 rounded">
          <h2 className="text-xl font-semibold mb-4">Links Rápidos</h2>
          <div className="space-y-2">
            <a href="/contracts" className="block text-blue-600 hover:underline">
              Gerenciar Contratos
            </a>
            <a href="/receivables" className="block text-blue-600 hover:underline">
              Gerenciar Recebíveis
            </a>
            <a href="/ai-chat" className="block text-blue-600 hover:underline">
              Chat IA - Faça Perguntas
            </a>
            <a href="/api/export/excel" className="block text-blue-600 hover:underline">
              Baixar Relatório Excel
            </a>
          </div>
        </div>

        <div className="border p-6 rounded">
          <h2 className="text-xl font-semibold mb-4">Endpoints da API</h2>
          <div className="space-y-1 text-sm font-mono">
            <p>GET /api/contracts</p>
            <p>POST /api/contracts</p>
            <p>GET /api/receivables</p>
            <p>POST /api/receivables</p>
            <p>GET /api/export/excel</p>
            <p>POST /api/ai/query</p>
          </div>
        </div>
      </div>
    </div>
  )
}