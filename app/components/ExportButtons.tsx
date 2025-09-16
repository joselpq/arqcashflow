'use client'

export default function ExportButtons() {
  return (
    <div className="space-y-3">
      {/* Excel Download */}
      <a
        href="/api/export/excel"
        className="block text-blue-600 hover:text-blue-800 text-sm transition-colors mb-2"
      >
        Baixar Relatório Excel
      </a>

      {/* CSV for Google Sheets */}
      <a
        href="/api/export/google-sheets"
        className="block text-blue-600 hover:text-blue-800 text-sm transition-colors"
      >
        Baixar CSV para Planilhas Google
      </a>

      {/* Instructions for Google Sheets */}
      <div className="text-xs text-gray-600 mt-3 p-3 bg-neutral-50 border border-neutral-200 rounded">
        <div className="font-medium mb-2 text-neutral-700">Como importar nas Planilhas Google:</div>
        <ol className="ml-4 list-decimal space-y-1">
          <li>Clique em "Baixar CSV para Planilhas Google" acima</li>
          <li>Vá para <a href="https://sheets.google.com" target="_blank" className="text-blue-600 underline">sheets.google.com</a></li>
          <li>Crie uma nova planilha</li>
          <li>Clique em <strong>Arquivo → Importar → Fazer upload</strong></li>
          <li>Selecione o arquivo baixado</li>
          <li>Escolha <strong>"Substituir planilha"</strong> e <strong>"Detectar automaticamente"</strong></li>
          <li>Clique em <strong>"Importar dados"</strong></li>
        </ol>
        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
          <div className="text-blue-800">
            <strong>Resultado:</strong> Dados organizados em 4 seções: Contratos, Recebíveis, Despesas e Fluxo de Caixa.
          </div>
        </div>
      </div>
    </div>
  )
}