'use client'

import { useState, useRef, useCallback } from 'react'
import { XMarkIcon, DocumentIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

interface FileItem {
  id: string
  file: File
  status: 'pending' | 'processing' | 'completed' | 'error'
  result?: any
  error?: string
  progress?: string
}

interface ProcessingProgress {
  currentFile: number
  totalFiles: number
  currentFileName: string
  estimatedTimeRemaining?: number
}

interface CombinedResults {
  totalContracts: number
  totalReceivables: number
  totalExpenses: number
  totalErrors: number
  fileResults: Array<{
    fileName: string
    contracts: number
    receivables: number
    expenses: number
    errors: string[]
    status: 'success' | 'error'
  }>
}

export default function MultiFileSetupAssistant() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState<ProcessingProgress | null>(null)
  const [combinedResults, setCombinedResults] = useState<CombinedResults | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validate file type and size
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const fileName = file.name.toLowerCase()
    const fileType = file.type.toLowerCase()

    // Check file type
    const isSpreadsheet = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
    const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf')
    const isImage = fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)

    if (!isSpreadsheet && !isPDF && !isImage) {
      return { valid: false, error: 'Tipo de arquivo não suportado' }
    }

    // Check file size (32MB limit)
    if (file.size > 32 * 1024 * 1024) {
      return { valid: false, error: 'Arquivo muito grande (máx: 32MB)' }
    }

    return { valid: true }
  }

  // Add files to the queue
  const addFiles = (fileList: FileList) => {
    const newFiles: FileItem[] = []

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const validation = validateFile(file)

      if (validation.valid) {
        // Check if file already exists
        const exists = files.some(f => f.file.name === file.name && f.file.size === file.size)
        if (!exists) {
          newFiles.push({
            id: `${Date.now()}-${i}`,
            file,
            status: 'pending'
          })
        }
      } else {
        // Show validation error for invalid files
        console.warn(`File ${file.name} rejected: ${validation.error}`)
      }
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  // Remove a file from the queue
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  // Clear all completed files
  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'))
    setCombinedResults(null)
  }

  // Process all pending files using multi-file endpoint
  const processAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) return

    setIsProcessing(true)
    setCombinedResults(null)

    try {
      // Prepare FormData with all files
      const formData = new FormData()
      pendingFiles.forEach((fileItem, index) => {
        formData.append(`file${index}`, fileItem.file)
      })

      // Update all pending files to processing status
      setFiles(prev => prev.map(f =>
        f.status === 'pending' ? { ...f, status: 'processing' as const } : f
      ))

      // Send all files to multi-file endpoint
      const response = await fetch('/api/ai/setup-assistant-v2/multi', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Update file statuses based on results
        const fileResultsMap = new Map<string, any>()

        // Map results to files by name
        result.fileResults?.forEach((fileResult: any) => {
          fileResultsMap.set(fileResult.fileName, fileResult)
        })

        // Update each file's status
        setFiles(prev => prev.map(f => {
          const fileResult = fileResultsMap.get(f.file.name)
          if (fileResult) {
            return {
              ...f,
              status: fileResult.status === 'success' ? 'completed' as const : 'error' as const,
              result: fileResult.status === 'success' ? fileResult : undefined,
              error: fileResult.status === 'error' ? fileResult.error : undefined
            }
          }
          return f
        }))

        // Set combined results
        if (result.combinedSummary) {
          setCombinedResults({
            totalContracts: result.combinedSummary.totalContractsCreated,
            totalReceivables: result.combinedSummary.totalReceivablesCreated,
            totalExpenses: result.combinedSummary.totalExpensesCreated,
            totalErrors: result.combinedSummary.totalErrors,
            fileResults: result.fileResults?.map((fr: any) => ({
              fileName: fr.fileName,
              contracts: fr.summary?.contractsCreated || 0,
              receivables: fr.summary?.receivablesCreated || 0,
              expenses: fr.summary?.expensesCreated || 0,
              errors: fr.summary?.errors || [],
              status: fr.status
            })) || []
          })
        }

        // Simulate progress updates (since we're not using WebSockets yet)
        // In a real implementation, you would poll the progress endpoint
        setProgress(null)

      } else {
        // Error from API
        console.error('Multi-file processing error:', result)

        // Mark all pending files as error
        setFiles(prev => prev.map(f =>
          f.status === 'processing'
            ? { ...f, status: 'error' as const, error: result.error || 'Erro desconhecido' }
            : f
        ))
      }
    } catch (error) {
      console.error('Request failed:', error)

      // Mark all processing files as error
      setFiles(prev => prev.map(f =>
        f.status === 'processing'
          ? { ...f, status: 'error' as const, error: 'Erro de conexão' }
          : f
      ))
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }

  // Calculate and display combined results
  const calculateCombinedResults = () => {
    const results: CombinedResults = {
      totalContracts: 0,
      totalReceivables: 0,
      totalExpenses: 0,
      totalErrors: 0,
      fileResults: []
    }

    files.forEach(file => {
      if (file.status === 'completed' && file.result) {
        const summary = file.result.summary || {}
        results.totalContracts += summary.contractsCreated || 0
        results.totalReceivables += summary.receivablesCreated || 0
        results.totalExpenses += summary.expensesCreated || 0
        results.totalErrors += (summary.errors?.length || 0)

        results.fileResults.push({
          fileName: file.file.name,
          contracts: summary.contractsCreated || 0,
          receivables: summary.receivablesCreated || 0,
          expenses: summary.expensesCreated || 0,
          errors: summary.errors || [],
          status: 'success'
        })
      } else if (file.status === 'error') {
        results.totalErrors += 1
        results.fileResults.push({
          fileName: file.file.name,
          contracts: 0,
          receivables: 0,
          expenses: 0,
          errors: [file.error || 'Erro desconhecido'],
          status: 'error'
        })
      }
    })

    setCombinedResults(results)
  }

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }, [files])

  // File icon based on type
  const getFileIcon = (fileName: string) => {
    const name = fileName.toLowerCase()
    if (name.endsWith('.csv')) return '📊'
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return '📈'
    if (name.endsWith('.pdf')) return '📄'
    if (name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) return '🖼️'
    return '📎'
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-neutral-400 bg-white'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-4xl mb-4">📁</div>
        <p className="text-lg font-medium text-neutral-800 mb-2">
          Arraste múltiplos arquivos aqui ou clique para selecionar
        </p>
        <p className="text-sm text-neutral-600 mb-4">
          Formatos: CSV, Excel, PDF, Imagens • Máximo: 32MB por arquivo
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
        >
          Selecionar Arquivos
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.pdf,image/*"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-neutral-800">Arquivos Selecionados ({files.length})</h4>
            {files.some(f => f.status === 'completed') && (
              <button
                onClick={clearCompleted}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Limpar Concluídos
              </button>
            )}
          </div>

          <div className="space-y-2">
            {files.map(fileItem => (
              <div
                key={fileItem.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  fileItem.status === 'completed' ? 'bg-green-50 border-green-200' :
                  fileItem.status === 'error' ? 'bg-red-50 border-red-200' :
                  fileItem.status === 'processing' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-neutral-50 border-neutral-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getFileIcon(fileItem.file.name)}</span>
                  <div>
                    <p className="font-medium text-neutral-800">{fileItem.file.name}</p>
                    <p className="text-sm text-neutral-600">{formatFileSize(fileItem.file.size)}</p>
                    {fileItem.status === 'processing' && fileItem.progress && (
                      <p className="text-xs text-yellow-600 mt-1">{fileItem.progress}</p>
                    )}
                    {fileItem.status === 'completed' && fileItem.result?.summary && (
                      <div className="text-xs text-green-600 mt-1">
                        <p>
                          ✅ {fileItem.result.summary.contractsCreated || 0} contratos,
                          {fileItem.result.summary.receivablesCreated || 0} recebíveis,
                          {fileItem.result.summary.expensesCreated || 0} despesas
                        </p>
                        {fileItem.result.excelSheets && fileItem.result.excelSheets.totalSheets > 1 && (
                          <p className="text-purple-600 mt-1">
                            📊 Excel: {fileItem.result.excelSheets.processedSheets.length}/{fileItem.result.excelSheets.totalSheets} planilhas processadas
                            {fileItem.result.excelSheets.skippedSheets.length > 0 && (
                              <span className="text-orange-600"> ({fileItem.result.excelSheets.skippedSheets.length} vazias)</span>
                            )}
                          </p>
                        )}
                      </div>
                    )}
                    {fileItem.status === 'error' && (
                      <p className="text-xs text-red-600 mt-1">❌ {fileItem.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {fileItem.status === 'pending' && (
                    <button
                      onClick={() => removeFile(fileItem.id)}
                      disabled={isProcessing}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      title="Remover arquivo"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                  {fileItem.status === 'processing' && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                  )}
                  {fileItem.status === 'completed' && (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  )}
                  {fileItem.status === 'error' && (
                    <ExclamationCircleIcon className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Process Button */}
          {files.some(f => f.status === 'pending') && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={processAllFiles}
                disabled={isProcessing}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {isProcessing ? 'Processando...' : `Processar ${files.filter(f => f.status === 'pending').length} Arquivo(s)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Progress Indicator */}
      {isProcessing && progress && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            <div className="flex-1">
              <p className="font-medium text-yellow-800">
                Processando arquivo {progress.currentFile} de {progress.totalFiles}
              </p>
              <p className="text-sm text-yellow-600">{progress.currentFileName}</p>
              {progress.estimatedTimeRemaining && (
                <p className="text-xs text-yellow-600 mt-1">
                  Tempo estimado: {Math.ceil(progress.estimatedTimeRemaining)}s
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Combined Results */}
      {combinedResults && !isProcessing && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-bold text-green-800 mb-3">✅ Processamento Concluído!</h4>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-white border border-green-300 rounded">
              <div className="text-2xl font-bold text-green-700">{combinedResults.totalContracts}</div>
              <div className="text-sm text-green-600">Contratos Criados</div>
            </div>
            <div className="text-center p-3 bg-white border border-blue-300 rounded">
              <div className="text-2xl font-bold text-blue-700">{combinedResults.totalReceivables}</div>
              <div className="text-sm text-blue-600">Recebíveis Criados</div>
            </div>
            <div className="text-center p-3 bg-white border border-amber-300 rounded">
              <div className="text-2xl font-bold text-amber-700">{combinedResults.totalExpenses}</div>
              <div className="text-sm text-amber-600">Despesas Criadas</div>
            </div>
          </div>

          {/* Per-file Results */}
          <details className="mb-4">
            <summary className="cursor-pointer text-sm text-green-700 font-medium">
              Ver detalhes por arquivo
            </summary>
            <div className="mt-2 space-y-2">
              {combinedResults.fileResults.map((result, index) => (
                <div key={index} className="text-sm p-2 bg-white rounded border border-green-200">
                  <p className="font-medium text-neutral-800">{result.fileName}</p>
                  {result.status === 'success' ? (
                    <p className="text-xs text-green-600">
                      {result.contracts} contratos, {result.receivables} recebíveis, {result.expenses} despesas
                    </p>
                  ) : (
                    <p className="text-xs text-red-600">{result.errors.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          </details>

          {/* Errors Warning */}
          {combinedResults.totalErrors > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ {combinedResults.totalErrors} erro(s) encontrado(s). Verifique os detalhes acima.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <a
              href="/projetos?tab=contratos"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
            >
              Ver Contratos
            </a>
            <a
              href="/projetos?tab=recebiveis"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
            >
              Ver Recebíveis
            </a>
            <a
              href="/projetos?tab=despesas"
              className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 text-sm"
            >
              Ver Despesas
            </a>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-neutral-600 text-white px-4 py-2 rounded hover:bg-neutral-700 text-sm"
            >
              Adicionar Mais Arquivos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}