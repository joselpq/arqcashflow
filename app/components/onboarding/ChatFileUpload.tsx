'use client'

import { useState, useRef } from 'react'
import { DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface ChatFileUploadProps {
  onUploadComplete: (results: UploadResults) => void
  onUploadStart: () => void
}

interface UploadResults {
  totalContracts: number
  totalReceivables: number
  totalExpenses: number
  totalErrors: number
  success: boolean
}

export default function ChatFileUpload({ onUploadComplete, onUploadStart }: ChatFileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-neutral-300 bg-neutral-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <DocumentIcon className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
        <p className="text-sm text-neutral-700 mb-2">
          Arraste arquivos aqui ou
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium underline disabled:opacity-50"
        >
          selecione do seu computador
        </button>
        <p className="text-xs text-neutral-500 mt-2">
          Planilhas, PDFs ou imagens (máx: 32MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv,.pdf,image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Selected files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-600">
            Arquivos selecionados ({selectedFiles.length}):
          </p>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-white border border-neutral-200 rounded-lg p-2"
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <DocumentIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <span className="text-sm text-neutral-700 truncate">{file.name}</span>
                <span className="text-xs text-neutral-500 flex-shrink-0">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <button
                onClick={() => removeFile(index)}
                disabled={isProcessing}
                className="ml-2 text-neutral-400 hover:text-red-500 disabled:opacity-50"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {selectedFiles.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={isProcessing}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processando...
            </span>
          ) : (
            `Processar ${selectedFiles.length} arquivo${selectedFiles.length > 1 ? 's' : ''}`
          )}
        </button>
      )}
    </div>
  )
}
