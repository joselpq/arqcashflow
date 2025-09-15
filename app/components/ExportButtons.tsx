'use client'

import { useState, useEffect } from 'react'
import { GoogleSheetsSimpleService } from '@/lib/googleSheetsSimple'
import { format } from 'date-fns'

export default function ExportButtons() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [sheetsService, setSheetsService] = useState<GoogleSheetsSimpleService | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    const service = new GoogleSheetsSimpleService()
    setSheetsService(service)
    setIsConfigured(service.isConfigured())
  }, [])

  const handleGoogleSheetsExport = async () => {
    if (!sheetsService) {
      setMessage('❌ Google Sheets não configurado. Verifique as credenciais.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Step 1: Initialize and authenticate
      if (!isAuthenticated) {
        setMessage('🔐 Autenticando com Google...')
        await sheetsService.initialize()
        const authenticated = await sheetsService.authenticate()

        if (!authenticated) {
          setMessage('❌ Autenticação cancelada ou falhou.')
          setLoading(false)
          return
        }

        setIsAuthenticated(true)
      }

      // Step 2: Fetch data from our API
      setMessage('📊 Carregando dados...')
      const dataResponse = await fetch('/api/export/sheets-data')
      if (!dataResponse.ok) {
        throw new Error('Failed to fetch data')
      }
      const data = await dataResponse.json()

      // Step 3: Create and populate spreadsheet
      setMessage('📈 Criando Google Sheets...')
      const title = `ArqCashflow Report - ${format(new Date(), 'yyyy-MM-dd HH:mm')}`
      const spreadsheetId = await sheetsService.createSpreadsheet(title)

      setMessage('✏️ Preenchendo dados...')
      await sheetsService.populateSpreadsheet(spreadsheetId, data)

      setMessage('🔓 Tornando público...')
      await sheetsService.makeSpreadsheetPublic(spreadsheetId)

      const spreadsheetUrl = sheetsService.getSpreadsheetUrl(spreadsheetId)

      setMessage('✅ Google Sheets criado com sucesso!')

      // Open the Google Sheets in a new tab
      window.open(spreadsheetUrl, '_blank')

    } catch (error) {
      console.error('Google Sheets export error:', error)
      if (error instanceof Error) {
        setMessage(`❌ Erro: ${error.message}`)
      } else {
        setMessage('❌ Erro ao criar Google Sheets.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Excel Download - unchanged */}
      <a
        href="/api/export/excel"
        className="block text-blue-600 hover:underline flex items-center gap-2"
      >
        📊 Baixar Relatório Excel
      </a>

      {/* Google Sheets Export */}
      {isConfigured ? (
        <button
          onClick={handleGoogleSheetsExport}
          disabled={loading}
          className={`text-left w-full text-blue-600 hover:underline flex items-center gap-2 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? '⏳' : isAuthenticated ? '📈' : '🔐'}
          {loading ? 'Processando...' : isAuthenticated ? 'Criar Relatório Google Sheets' : 'Conectar e Criar Google Sheets'}
        </button>
      ) : (
        <div className="text-gray-500 flex items-center gap-2">
          🔧 Configure Google Sheets para usar
        </div>
      )}

      {/* Status message */}
      {message && (
        <div className={`text-sm p-2 rounded ${
          message.startsWith('✅')
            ? 'bg-green-100 text-green-800'
            : message.startsWith('❌')
            ? 'bg-red-100 text-red-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {message}
        </div>
      )}

      {/* Setup instructions when not configured */}
      {!isConfigured && (
        <div className="text-xs text-gray-600 mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
          <div className="font-medium mb-1">🔧 Configuração Rápida (2 minutos)</div>
          <div>Para usar Google Sheets, siga estes passos simples:</div>
          <ol className="mt-1 ml-4 text-xs list-decimal space-y-1">
            <li>
              <strong>Abra:</strong> <a href="https://console.cloud.google.com" target="_blank" className="text-blue-600 underline">console.cloud.google.com</a>
            </li>
            <li><strong>Crie projeto</strong> (ex: "meu-arqcashflow")</li>
            <li><strong>Ative APIs:</strong> Google Sheets API + Google Drive API</li>
            <li><strong>Credenciais:</strong> Create OAuth 2.0 Client ID → Web Application</li>
            <li><strong>Adicione origem:</strong> <code>http://localhost:3000</code></li>
            <li><strong>Copie Client ID</strong> e adicione no .env:</li>
          </ol>
          <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-xs">
            NEXT_PUBLIC_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
          </div>
          <div className="mt-1 text-xs">
            Depois reinicie: <code>npm run dev</code>
          </div>
        </div>
      )}
    </div>
  )
}