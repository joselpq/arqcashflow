'use client'

import { useState, useRef } from 'react'
import { DocumentIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface ChatFileUploadProps {
  onUploadComplete: (results: UploadResults) => void
  onUploadStart: () => void
  onFilesSelected?: () => void
}

interface UploadResults {
  totalContracts: number
  totalReceivables: number
  totalExpenses: number
  totalErrors: number
  success: boolean
}

export default function ChatFileUpload({ onUploadComplete, onUploadStart, onFilesSelected }: ChatFileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showFileList, setShowFileList] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileBlockRef = useRef<HTMLDivElement>(null)

  const validateFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase()
    const fileType = file.type.toLowerCase()

    const isSpreadsheet = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
    const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf')
    const isImage = fileType.startsWith('image/')

    if (!isSpreadsheet && !isPDF && !isImage) {
      return false
    }

    if (file.size > 32 * 1024 * 1024) {
      return false
    }

    return true
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const validFiles: File[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (validateFile(file)) {
        const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size)
        if (!exists) {
          validFiles.push(file)
        }
      }
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])

      // Auto-scroll to show the file block after files are selected
      setTimeout(() => {
        if (fileBlockRef.current) {
          const scrollContainer = fileBlockRef.current.closest('.overflow-y-auto')
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight
          }
        }
        onFilesSelected?.()
      }, 100)
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsProcessing(true)
    onUploadStart() // This shows the loading message in chat

    try {
      const formData = new FormData()
      selectedFiles.forEach((file, index) => {
        formData.append(`file${index}`, file)
      })

      const response = await fetch('/api/ai/setup-assistant-v2/multi', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok && result.success) {
        onUploadComplete({
          totalContracts: result.combinedSummary?.totalContractsCreated || 0,
          totalReceivables: result.combinedSummary?.totalReceivablesCreated || 0,
          totalExpenses: result.combinedSummary?.totalExpensesCreated || 0,
          totalErrors: result.combinedSummary?.totalErrors || 0,
          success: true
        })
        setSelectedFiles([])
      } else {
        onUploadComplete({
          totalContracts: 0,
          totalReceivables: 0,
          totalExpenses: 0,
          totalErrors: 1,
          success: false
        })
      }
    } catch (error) {
      console.error('Upload failed:', error)
      onUploadComplete({
        totalContracts: 0,
        totalReceivables: 0,
        totalExpenses: 0,
        totalErrors: 1,
        success: false
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  return (
    <div ref={fileBlockRef} className="flex justify-start mb-4">
      <div className="max-w-[80%] space-y-2">
        {/* Drop zone - hide when processing */}
        {!isProcessing && (
          <div
            className={`rounded-2xl p-4 transition-all ${
              dragActive
                ? 'bg-blue-50 border-2 border-blue-300'
                : 'bg-neutral-100 border-2 border-neutral-200'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📎</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-700">
                  Arraste arquivos ou{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
                  >
                    clique aqui
                  </button>
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Excel, PDF, imagens • máx 32MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv,.pdf,image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Selected files - compact with collapsible list */}
        {selectedFiles.length > 0 && (
          <div className="bg-neutral-50 rounded-2xl p-3 space-y-2">
            {/* Header with file count and toggle */}
            <button
              onClick={() => setShowFileList(!showFileList)}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-900">
                  {selectedFiles.length} arquivo{selectedFiles.length > 1 ? 's' : ''}
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
              {showFileList ? (
                <ChevronUpIcon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-700" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-700" />
              )}
            </button>

            {/* Collapsible file list */}
            {showFileList && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5 group hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-sm">📄</span>
                      <span className="text-xs text-neutral-900 truncate font-medium">
                        {file.name}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      disabled={isProcessing}
                      className="ml-2 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30"
                      aria-label="Remover"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button - compact */}
            <button
              onClick={handleUpload}
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm hover:shadow"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  <span className="text-xs">Enviando...</span>
                </span>
              ) : (
                `✨ Processar`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
