'use client'

export default function ExportButtons() {
  return (
    <div className="space-y-3">
      {/* Excel Download */}
      <a
        href="/api/export/excel"
        className="block text-blue-600 hover:underline flex items-center gap-2"
      >
        📊 Baixar Relatório Excel
      </a>

      {/* CSV for Google Sheets */}
      <a
        href="/api/export/google-sheets"
        className="block text-blue-600 hover:underline flex items-center gap-2"
      >
        📈 Baixar CSV para Google Sheets
      </a>

      {/* Instructions for Google Sheets */}
      <div className="text-xs text-gray-600 mt-2 p-2 bg-green-50 border border-green-200 rounded">
        <div className="font-medium mb-1">📈 Importar no Google Sheets (Super Simples!):</div>
        <ol className="ml-4 list-decimal space-y-1">
          <li>Clique em "Baixar CSV para Google Sheets" acima</li>
          <li>Vá para <a href="https://sheets.google.com" target="_blank" className="text-blue-600 underline">sheets.google.com</a></li>
          <li>Crie uma nova planilha</li>
          <li>Clique em <strong>Arquivo → Importar → Fazer upload</strong></li>
          <li>Selecione o arquivo baixado</li>
          <li>Escolha <strong>"Substituir planilha"</strong> e <strong>"Detectar automaticamente"</strong></li>
          <li>Clique em <strong>"Importar dados"</strong></li>
        </ol>
        <div className="mt-2 p-2 bg-blue-100 rounded">
          <div className="text-blue-800 font-medium text-xs">
            ✨ <strong>Resultado:</strong> Você terá todos seus dados organizados automaticamente em 4 seções: Contratos, Recebíveis, Despesas e Fluxo de Caixa Mensal - tudo com instruções incluídas no arquivo!
          </div>
        </div>
        <div className="mt-1 text-green-700 font-medium">
          ✅ Funciona sem configuração! Sem APIs, sem autenticação!
        </div>
      </div>
    </div>
  )
}