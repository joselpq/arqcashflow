'use client'

import { useState } from 'react'
import Modal from './Modal'

interface SetupAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

interface OnboardingResults {
  totalContracts: number
  totalReceivables: number
  totalExpenses: number
  totalErrors: number
  success: boolean
  message: string
}

interface FileItem {
  id: string
  file: File
  status: 'pending' | 'processing' | 'completed' | 'error'
  result?: any
  error?: string
}

export default function SetupAssistantModal({ isOpen, onClose, onComplete }: SetupAssistantModalProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string>('')
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<OnboardingResults | null>(null)

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

  // Add files to queue
  const addFiles = (fileList: FileList) => {
    const newFiles: FileItem[] = []
    setError('')

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const validation = validateFile(file)

      if (validation.valid) {
        const exists = files.some(f => f.file.name === file.name && f.file.size === file.size)
        if (!exists) {
          newFiles.push({
            id: `${Date.now()}-${i}`,
            file,
            status: 'pending'
          })
        }
      } else {
        setError(`${file.name}: ${validation.error}`)
        return
      }
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    setError('')
  }

  // Process all files
  const processAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) {
      setError('Por favor, selecione pelo menos um arquivo')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const formData = new FormData()
      pendingFiles.forEach((fileItem, index) => {
        formData.append(`file${index}`, fileItem.file)
      })

      setFiles(prev => prev.map(f =>
        f.status === 'pending' ? { ...f, status: 'processing' as const } : f
      ))

      const response = await fetch('/api/ai/setup-assistant-v2/multi', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok && result.success !== false) {
        // Success
        const onboardingResults: OnboardingResults = {
          totalContracts: result.combinedSummary?.totalContractsCreated || 0,
          totalReceivables: result.combinedSummary?.totalReceivablesCreated || 0,
          totalExpenses: result.combinedSummary?.totalExpensesCreated || 0,
          totalErrors: result.errors?.length || 0,
          success: true,
          message: `${result.successfulFiles || 0} arquivo(s) processado(s) com sucesso!`
        }

        setResults(onboardingResults)
        setShowResults(true)
        setFiles(prev => prev.map(f => ({ ...f, status: 'completed' as const })))
      } else {
        // Error
        setError(result.error || 'Erro ao processar arquivos')
        setFiles(prev => prev.map(f =>
          f.status === 'processing' ? { ...f, status: 'error' as const, error: result.error } : f
        ))
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError('Erro de conexão. Tente novamente.')
      setFiles(prev => prev.map(f =>
        f.status === 'processing' ? { ...f, status: 'error' as const, error: 'Erro de conexão' } : f
      ))
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  // Handle completion
  const handleComplete = () => {
    setShowResults(false)
    setFiles([])
    setResults(null)
    onComplete?.()
    onClose()
    // Refresh the page to show new data
    window.location.reload()
  }

  // Reset modal state when closed
  const handleClose = () => {
    if (!isProcessing) {
      setFiles([])
      setError('')
      setShowResults(false)
      setResults(null)
      onClose()
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Get file icon
  const getFileIcon = (fileName: string) => {
    const name = fileName.toLowerCase()
    if (name.endsWith('.csv')) return '📊'
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return '📈'
    if (name.endsWith('.pdf')) return '📄'
    if (name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) return '🖼️'
    return '📎'
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="🤖 Importar Dados com IA" size="xl">
      {showResults && results ? (
        // Success Results View
        <div className="text-center py-8">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-semibold text-green-700 mb-4">
            Dados Importados com Sucesso!
          </h3>
          <p className="text-neutral-600 mb-6">{results.message}</p>

          <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-700">{results.totalContracts}</div>
              <div className="text-sm text-neutral-600">Contratos</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-700">{results.totalReceivables}</div>
              <div className="text-sm text-neutral-600">Recebíveis</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-700">{results.totalExpenses}</div>
              <div className="text-sm text-neutral-600">Despesas</div>
            </div>
          </div>

          <button
            onClick={handleComplete}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Ver Dashboard
          </button>
        </div>
      ) : (
        // Upload View
        <div className="space-y-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-neutral-300 hover:border-blue-500 hover:bg-blue-50'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".xlsx,.xls,.csv,.pdf,image/*"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
              className="hidden"
            />
            <div className="text-5xl mb-4">📁</div>
            <p className="text-lg text-neutral-900 font-medium mb-2">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-sm text-neutral-500">
              Excel, CSV, PDF, ou Imagens • Máximo: 32MB
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="bg-neutral-50 rounded-lg p-4 max-h-60 overflow-y-auto">
              <p className="text-sm font-medium text-neutral-700 mb-3">
                Arquivos ({files.length}):
              </p>
              <div className="space-y-2">
                {files.map(fileItem => (
                  <div
                    key={fileItem.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      fileItem.status === 'completed' ? 'bg-green-50 border-green-200' :
                      fileItem.status === 'error' ? 'bg-red-50 border-red-200' :
                      fileItem.status === 'processing' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-white border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl flex-shrink-0">{getFileIcon(fileItem.file.name)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-neutral-800 text-sm truncate">{fileItem.file.name}</p>
                        <p className="text-xs text-neutral-600">{formatFileSize(fileItem.file.size)}</p>
                      </div>
                    </div>
                    {fileItem.status === 'pending' && !isProcessing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(fileItem.id)
                        }}
                        className="text-red-600 hover:text-red-700 ml-2 flex-shrink-0"
                      >
                        ✕
                      </button>
                    )}
                    {fileItem.status === 'processing' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 ml-2 flex-shrink-0"></div>
                    )}
                    {fileItem.status === 'completed' && (
                      <span className="text-green-600 ml-2 flex-shrink-0">✓</span>
                    )}
                    {fileItem.status === 'error' && (
                      <span className="text-red-600 ml-2 flex-shrink-0">✕</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
              <p className="text-yellow-800 font-medium">Processando arquivos com IA...</p>
              <p className="text-sm text-yellow-600">Isso pode levar alguns minutos</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={processAllFiles}
              disabled={isProcessing || files.filter(f => f.status === 'pending').length === 0}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Processando...' : `Importar ${files.filter(f => f.status === 'pending').length} Arquivo(s)`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
