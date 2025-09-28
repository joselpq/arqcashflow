'use client'

import { useState, useRef, useCallback } from 'react'
import { XMarkIcon, DocumentIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

interface FileItem {
  id: string
  file: File
  status: 'pending' | 'processing' | 'completed' | 'error'
  result?: any
  error?: string
}

interface OnboardingResults {
  totalContracts: number
  totalReceivables: number
  totalExpenses: number
  totalErrors: number
  success: boolean
  message: string
}

interface OnboardingFileUploadProps {
  onComplete: (results: OnboardingResults) => void
  onSkip: () => void
  onBack: () => void
  loading?: boolean
}

export default function OnboardingFileUpload({
  onComplete,
  onSkip,
  onBack,
  loading: externalLoading = false
}: OnboardingFileUploadProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validate file type and size
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const fileName = file.name.toLowerCase()
    const fileType = file.type.toLowerCase()

    // Check file type - Support Excel, CSV, PDF, and Images
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
    setError('')

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
        setError(`Arquivo ${file.name}: ${validation.error}`)
        return
      }
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  // Remove a file from the queue
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    setError('')
  }

  // Process all files using multi-file endpoint
  const processAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) {
      setError('Por favor, selecione pelo menos um arquivo')
      return
    }

    setIsProcessing(true)
    setError('')

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

        // Complete onboarding with combined results
        const onboardingResults: OnboardingResults = {
          totalContracts: result.combinedSummary?.totalContractsCreated || 0,
          totalReceivables: result.combinedSummary?.totalReceivablesCreated || 0,
          totalExpenses: result.combinedSummary?.totalExpensesCreated || 0,
          totalErrors: result.combinedSummary?.totalErrors || 0,
          success: true,
          message: `Processados ${result.totalFiles} arquivo(s) com sucesso!`
        }

        onComplete(onboardingResults)

      } else {
        // Error from API
        console.error('Multi-file processing error:', result)
        setError(result.error || 'Erro ao processar arquivos')

        // Mark all pending files as error
        setFiles(prev => prev.map(f =>
          f.status === 'processing'
            ? { ...f, status: 'error' as const, error: result.error || 'Erro desconhecido' }
            : f
        ))
      }
    } catch (error) {
      console.error('Request failed:', error)
      setError('Erro de conexão. Tente novamente.')

      // Mark all processing files as error
      setFiles(prev => prev.map(f =>
        f.status === 'processing'
          ? { ...f, status: 'error' as const, error: 'Erro de conexão' }
          : f
      ))
    } finally {
      setIsProcessing(false)
    }
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

  const isLoading = isProcessing || externalLoading

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Enhanced Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 sm:p-8 lg:p-10 text-center transition-all cursor-pointer ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-neutral-300 hover:border-blue-500 hover:bg-blue-50'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv,.pdf,image/*"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          className="hidden"
        />
        <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">📁</div>
        <p className="text-base sm:text-lg lg:text-xl text-neutral-900 font-medium mb-2 sm:mb-3">
          Arraste múltiplos arquivos aqui ou clique para selecionar
        </p>
        <p className="text-sm sm:text-base text-neutral-500 mb-2">
          Excel, CSV, PDF, ou Imagens • Máximo: 32MB por arquivo
        </p>
        <p className="text-xs sm:text-sm text-neutral-400">
          Seus dados estão seguros e criptografados
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-neutral-50 rounded-lg p-4">
          <p className="text-sm font-medium text-neutral-700 mb-3">
            Arquivos selecionados ({files.length}):
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
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getFileIcon(fileItem.file.name)}</span>
                  <div>
                    <p className="font-medium text-neutral-800 text-sm">{fileItem.file.name}</p>
                    <p className="text-xs text-neutral-600">{formatFileSize(fileItem.file.size)}</p>
                    {fileItem.status === 'completed' && fileItem.result?.summary && (
                      <p className="text-xs text-green-600 mt-1">
                        ✅ {fileItem.result.summary.contractsCreated || 0} contratos,
                        {fileItem.result.summary.receivablesCreated || 0} recebíveis,
                        {fileItem.result.summary.expensesCreated || 0} despesas
                      </p>
                    )}
                    {fileItem.status === 'error' && (
                      <p className="text-xs text-red-600 mt-1">❌ {fileItem.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {fileItem.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(fileItem.id)
                      }}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      title="Remover arquivo"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                  {fileItem.status === 'processing' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  )}
                  {fileItem.status === 'completed' && (
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                  )}
                  {fileItem.status === 'error' && (
                    <ExclamationCircleIcon className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-3 sm:py-4 border border-neutral-300 text-neutral-700 rounded-lg text-base sm:text-lg font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
        >
          ← Voltar
        </button>
        <button
          onClick={processAllFiles}
          disabled={isLoading || files.filter(f => f.status === 'pending').length === 0}
          className="flex-1 bg-blue-600 text-white py-3 sm:py-4 px-6 rounded-lg text-base sm:text-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isProcessing ? 'Processando...' : `Importar ${files.filter(f => f.status === 'pending').length} Arquivo(s)`}
        </button>
        <button
          onClick={onSkip}
          disabled={isLoading}
          className="px-6 py-3 sm:py-4 border border-neutral-300 text-neutral-700 rounded-lg text-base sm:text-lg font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
        >
          Pular por agora
        </button>
      </div>

      <p className="text-xs sm:text-sm text-center text-neutral-500 w-full px-4">
        Não se preocupe, você pode importar dados a qualquer momento depois
      </p>
    </div>
  )
}