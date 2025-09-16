'use client'

export default function AlertsPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Central de Alertas</h1>

        {/* Static placeholder content */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🤖</span>
            <h2 className="text-xl font-semibold text-blue-800">Supervisor de Qualidade</h2>
          </div>
          <p className="text-blue-700 mb-4">
            O Supervisor de Qualidade monitora automaticamente seus dados para detectar:
          </p>
          <ul className="text-blue-700 space-y-2 ml-4">
            <li>• <strong>Duplicatas:</strong> Contratos ou despesas similares</li>
            <li>• <strong>Valores anômalos:</strong> Amounts muito acima ou abaixo da média</li>
            <li>• <strong>Problemas de data:</strong> Datas inconsistentes ou impossíveis</li>
            <li>• <strong>Inconsistências:</strong> Dados que não fazem sentido juntos</li>
            <li>• <strong>Padrões suspeitos:</strong> Valores redondos ou descrições genéricas</li>
          </ul>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="text-center">
            <span className="text-4xl mb-4 block">📝</span>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum alerta no momento</h3>
            <p className="text-gray-600">
              O supervisor está sendo reconstruído para melhor detecção de problemas.
              Em breve, alertas automáticos aparecerão aqui quando houver inconsistências nos seus dados.
            </p>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">Como funciona</h4>
              <p className="text-yellow-700 text-sm">
                Quando você criar contratos, recebíveis ou despesas, o supervisor analisará automaticamente
                os dados e alertará sobre possíveis problemas que precisam de atenção.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}