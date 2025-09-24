---
title: "AI Document Processing Example"
type: "example"
audience: ["developer", "agent"]
contexts: ["ai-assistant", "file-handling", "document-analysis"]
complexity: "advanced"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["ai-integration-specialist", "document-processor"]
related:
  - agents/contexts/ai-assistant.md
  - developer/architecture/decisions/adr-002-claude-ai-integration.md
  - agents/patterns/error-handling.md
---

# AI Document Processing Example

## Context for LLM Agents

**Scope**: Complete example of AI-powered document processing with Claude integration, including file upload, analysis, and data extraction for Brazilian financial documents
**Prerequisites**: Understanding of Claude AI API, file handling, Brazilian document formats, and async processing patterns
**Key Patterns Applied**:
- Smart upload strategy (Vision API vs file upload based on size)
- Dual model approach (Haiku for classification, Sonnet for analysis)
- Brazilian Portuguese document understanding
- Context-aware prompting for financial documents
- Comprehensive error handling for AI operations

## Overview

This example demonstrates the complete AI document processing workflow, from file upload to structured data extraction, specifically optimized for Brazilian financial documents.

## Complete Implementation

### 1. AI Service Layer

```typescript
// lib/ai/claude-service.ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export type DocumentType = 'contract' | 'invoice' | 'receipt' | 'expense' | 'unknown'

export interface DocumentAnalysis {
  type: DocumentType
  confidence: number
  extractedData: Record<string, any>
  summary: string
  language: 'pt-BR' | 'en' | 'other'
  processingMethod: 'vision' | 'upload'
}

// Smart upload strategy - choose method based on file size and type
export function determineProcessingMethod(file: File): 'vision' | 'upload' {
  const maxVisionSize = 20 * 1024 * 1024 // 20MB limit for Vision API
  const isImage = file.type.startsWith('image/')
  const isPDF = file.type === 'application/pdf'

  // Use Vision API for images and small PDFs
  if ((isImage || isPDF) && file.size <= maxVisionSize) {
    return 'vision'
  }

  // Use file upload for larger files or other formats
  return 'upload'
}

// Document classification using Claude Haiku (fast and cost-effective)
export async function classifyDocument(
  fileData: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ type: DocumentType; confidence: number }> {
  try {
    const classificationPrompt = `
Analyze this Brazilian financial document and classify it into one of these categories:
- contract: Contratos de prestação de serviços, contratos de trabalho
- invoice: Notas fiscais, faturas de serviços
- receipt: Recibos de pagamento, comprovantes de transferência
- expense: Comprovantes de despesas, notas de compra
- unknown: Document type cannot be determined

Document filename: ${fileName}

Respond with JSON only:
{
  "type": "contract|invoice|receipt|expense|unknown",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation in Portuguese"
}
`

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: classificationPrompt
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as any,
              data: fileData.toString('base64')
            }
          }
        ]
      }]
    })

    const result = JSON.parse(response.content[0].text)
    return {
      type: result.type,
      confidence: result.confidence
    }

  } catch (error) {
    console.error('Document classification error:', error)
    return { type: 'unknown', confidence: 0 }
  }
}

// Comprehensive document analysis using Claude Sonnet (advanced reasoning)
export async function analyzeDocument(
  fileData: Buffer,
  fileName: string,
  mimeType: string,
  documentType: DocumentType
): Promise<DocumentAnalysis> {
  try {
    const processingMethod = determineProcessingMethod(
      new File([fileData], fileName, { type: mimeType })
    )

    // Get document type-specific prompts
    const analysisPrompt = getAnalysisPromptForType(documentType)

    let response: Anthropic.Messages.Message

    if (processingMethod === 'vision') {
      // Use Vision API for images and small PDFs
      response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: analysisPrompt
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as any,
                data: fileData.toString('base64')
              }
            }
          ]
        }]
      })
    } else {
      // Use file upload for larger documents
      const uploadResponse = await anthropic.files.create({
        file: new Blob([fileData], { type: mimeType }),
        purpose: 'vision'
      })

      response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: analysisPrompt
            },
            {
              type: "document",
              source: {
                type: "file",
                file_id: uploadResponse.id
              }
            }
          ]
        }]
      })
    }

    // Parse structured response
    const analysisResult = JSON.parse(response.content[0].text)

    return {
      type: documentType,
      confidence: analysisResult.confidence || 0.8,
      extractedData: analysisResult.extractedData || {},
      summary: analysisResult.summary || '',
      language: analysisResult.language || 'pt-BR',
      processingMethod
    }

  } catch (error) {
    console.error('Document analysis error:', error)
    throw new Error(`Erro na análise do documento: ${error.message}`)
  }
}

// Document type-specific analysis prompts
function getAnalysisPromptForType(documentType: DocumentType): string {
  const basePrompt = `
Você é um especialista em análise de documentos financeiros brasileiros.
Analise este documento e extraia todas as informações estruturadas relevantes.

IMPORTANTE:
- Valores monetários devem estar no formato brasileiro (R$ 1.234,56)
- Datas no formato DD/MM/AAAA
- Identifique CPF/CNPJ quando presente
- Detecte informações de endereço brasileiros (CEP, estado, cidade)
`

  switch (documentType) {
    case 'contract':
      return basePrompt + `
CONTRATO - Extraia:
- título/objeto do contrato
- partes envolvidas (contratante/contratado)
- valor total e forma de pagamento
- prazo/vigência (data início e fim)
- local de prestação dos serviços
- dados dos responsáveis (nome, CPF/CNPJ, endereço)
- cláusulas especiais relevantes

Responda em JSON:
{
  "confidence": 0.0-1.0,
  "language": "pt-BR|en|other",
  "summary": "Resumo do contrato em português",
  "extractedData": {
    "title": "string",
    "contractor": "string",
    "contractee": "string",
    "totalValue": "string (formato brasileiro)",
    "startDate": "DD/MM/AAAA",
    "endDate": "DD/MM/AAAA",
    "serviceLocation": "string",
    "paymentTerms": "string",
    "specialClauses": ["string"]
  }
}
`

    case 'invoice':
      return basePrompt + `
NOTA FISCAL - Extraia:
- número da nota fiscal
- data de emissão
- emissor (razão social, CNPJ)
- destinatário (nome/razão social, CPF/CNPJ)
- discriminação dos serviços/produtos
- valores (bruto, líquido, impostos)
- data de vencimento (se aplicável)

Responda em JSON:
{
  "confidence": 0.0-1.0,
  "language": "pt-BR|en|other",
  "summary": "Resumo da nota fiscal em português",
  "extractedData": {
    "invoiceNumber": "string",
    "issueDate": "DD/MM/AAAA",
    "issuer": {
      "name": "string",
      "cnpj": "string",
      "address": "string"
    },
    "recipient": {
      "name": "string",
      "document": "string (CPF/CNPJ)",
      "address": "string"
    },
    "items": [{
      "description": "string",
      "quantity": number,
      "unitValue": "string",
      "totalValue": "string"
    }],
    "grossValue": "string",
    "netValue": "string",
    "taxes": "string",
    "dueDate": "DD/MM/AAAA"
  }
}
`

    case 'receipt':
      return basePrompt + `
RECIBO - Extraia:
- valor pago
- data do pagamento
- forma de pagamento
- pagador (nome, CPF/CNPJ)
- beneficiário (nome, CPF/CNPJ)
- descrição do pagamento
- número do documento/referência

Responda em JSON:
{
  "confidence": 0.0-1.0,
  "language": "pt-BR|en|other",
  "summary": "Resumo do recibo em português",
  "extractedData": {
    "amount": "string (formato brasileiro)",
    "paymentDate": "DD/MM/AAAA",
    "paymentMethod": "string",
    "payer": {
      "name": "string",
      "document": "string (CPF/CNPJ)"
    },
    "recipient": {
      "name": "string",
      "document": "string (CPF/CNPJ)"
    },
    "description": "string",
    "referenceNumber": "string"
  }
}
`

    case 'expense':
      return basePrompt + `
COMPROVANTE DE DESPESA - Extraia:
- estabelecimento/fornecedor
- data da compra/serviço
- valor total
- discriminação dos itens
- forma de pagamento
- número do documento (cupom fiscal, nota, etc.)

Responda em JSON:
{
  "confidence": 0.0-1.0,
  "language": "pt-BR|en|other",
  "summary": "Resumo da despesa em português",
  "extractedData": {
    "vendor": "string",
    "date": "DD/MM/AAAA",
    "totalAmount": "string (formato brasileiro)",
    "items": [{
      "description": "string",
      "amount": "string"
    }],
    "paymentMethod": "string",
    "documentNumber": "string",
    "category": "string (ex: material, alimentação, transporte)"
  }
}
`

    default:
      return basePrompt + `
DOCUMENTO DESCONHECIDO - Analise o conteúdo e extraia:
- tipo provável do documento
- informações principais identificadas
- valores monetários (se houver)
- datas relevantes (se houver)
- pessoas/empresas mencionadas

Responda em JSON:
{
  "confidence": 0.0-1.0,
  "language": "pt-BR|en|other",
  "summary": "Resumo do documento em português",
  "extractedData": {
    "probableType": "string",
    "mainInfo": "string",
    "amounts": ["string"],
    "dates": ["DD/MM/AAAA"],
    "entities": ["string"]
  }
}
`
  }
}
```

### 2. API Route for Document Processing

```typescript
// app/api/ai/process-document/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { classifyDocument, analyzeDocument, determineProcessingMethod } from '@/lib/ai/claude-service'

const MAX_FILE_SIZE = 32 * 1024 * 1024 // 32MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain'
]

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const context = formData.get('context') as string // 'contract', 'invoice', etc.

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 3. Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File too large',
        details: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: 'Unsupported file type',
        details: `Allowed types: ${ALLOWED_TYPES.join(', ')}`
      }, { status: 400 })
    }

    // 4. Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    console.log(`Processing document: ${file.name} (${file.size} bytes, ${file.type})`)

    // 5. Step 1: Document Classification (if context not provided)
    let documentType = context as any
    let classificationConfidence = 1.0

    if (!documentType || documentType === 'unknown') {
      console.log('Classifying document type...')
      const classification = await classifyDocument(fileBuffer, file.name, file.type)
      documentType = classification.type
      classificationConfidence = classification.confidence

      console.log(`Classification result: ${documentType} (confidence: ${classificationConfidence})`)
    }

    // 6. Step 2: Document Analysis
    console.log('Analyzing document content...')
    const analysis = await analyzeDocument(fileBuffer, file.name, file.type, documentType)

    // 7. Create processing record for audit trail
    const processingRecord = {
      teamId: session.user.teamId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      documentType,
      classificationConfidence,
      analysisConfidence: analysis.confidence,
      processingMethod: analysis.processingMethod,
      language: analysis.language,
      processedAt: new Date().toISOString()
    }

    console.log('Document processing completed successfully')

    // 8. Return analysis results
    return NextResponse.json({
      success: true,
      analysis: {
        documentType,
        classificationConfidence,
        extractedData: analysis.extractedData,
        summary: analysis.summary,
        language: analysis.language,
        processingMethod: analysis.processingMethod,
        confidence: analysis.confidence
      },
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        processedAt: processingRecord.processedAt
      }
    })

  } catch (error) {
    console.error('Document processing error:', error)

    // Handle specific AI service errors
    if (error.message?.includes('rate_limit')) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        details: 'Too many requests. Please wait before trying again.'
      }, { status: 429 })
    }

    if (error.message?.includes('invalid_api_key')) {
      return NextResponse.json({
        error: 'AI service configuration error'
      }, { status: 500 })
    }

    if (error.message?.includes('file_too_large')) {
      return NextResponse.json({
        error: 'File too large for AI processing',
        details: 'Please use a smaller file or different format.'
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Document processing failed',
      details: error.message
    }, { status: 500 })
  }
}
```

### 3. React Component for Document Upload and Processing

```typescript
'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface DocumentProcessor {
  onSuccess: (analysis: any) => void
  onError: (error: string) => void
  context?: 'contract' | 'invoice' | 'receipt' | 'expense'
}

export default function DocumentProcessor({ onSuccess, onError, context }: DocumentProcessor) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState(0)

  const processDocument = async (file: File) => {
    setIsProcessing(true)
    setUploadProgress(0)

    try {
      // Prepare form data
      const formData = new FormData()
      formData.append('file', file)
      if (context) {
        formData.append('context', context)
      }

      setProcessingStage('Enviando documento...')

      // Upload and process document
      const response = await fetch('/api/ai/process-document', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || error.error || 'Processing failed')
      }

      setProcessingStage('Analisando conteúdo...')

      const result = await response.json()

      setProcessingStage('Concluído!')

      // Success callback
      onSuccess(result)

    } catch (error) {
      console.error('Document processing error:', error)
      onError(error.message)
    } finally {
      setIsProcessing(false)
      setProcessingStage('')
      setUploadProgress(0)
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processDocument(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'text/plain': ['.txt']
    },
    maxSize: 32 * 1024 * 1024, // 32MB
    multiple: false,
    disabled: isProcessing
  })

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive && !isDragReject ? 'border-blue-400 bg-blue-50' : ''}
          ${isDragReject ? 'border-red-400 bg-red-50' : ''}
          ${!isDragActive && !isDragReject ? 'border-gray-300 hover:border-gray-400' : ''}
          ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />

        {isProcessing ? (
          <div className="space-y-4">
            <div className="animate-spin mx-auto h-8 w-8 border-b-2 border-blue-600 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">{processingStage}</p>
              <p className="text-xs text-gray-500 mt-1">
                Processando com inteligência artificial...
              </p>
            </div>
          </div>
        ) : (
          <div>
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            {isDragActive ? (
              <p className="mt-2 text-sm text-blue-600">
                Solte o arquivo aqui...
              </p>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600">Clique para enviar</span> ou arraste um arquivo
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PDF, JPEG, PNG, WEBP até 32MB
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Processing Tips */}
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>💡 <strong>Dica:</strong> Para melhor precisão, use arquivos com boa qualidade</p>
        <p>🇧🇷 <strong>Suporte:</strong> Documentos brasileiros em português são analisados com maior precisão</p>
        <p>⚡ <strong>Velocidade:</strong> Arquivos menores são processados mais rapidamente</p>
      </div>
    </div>
  )
}
```

### 4. Usage Example in Parent Component

```typescript
function ContractCreationPage() {
  const [extractedData, setExtractedData] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const handleDocumentAnalysis = (analysis) => {
    console.log('Document analysis completed:', analysis)

    // Show extracted data to user
    setExtractedData(analysis.analysis.extractedData)

    // If it's a contract, pre-fill the contract form
    if (analysis.analysis.documentType === 'contract') {
      setShowForm(true)
    }

    // Show success message
    toast.success(`Documento analisado: ${analysis.analysis.summary}`)
  }

  const handleProcessingError = (error) => {
    console.error('Processing error:', error)
    toast.error(`Erro ao processar documento: ${error}`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo Contrato</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          🤖 Análise Inteligente de Documentos
        </h3>
        <p className="text-sm text-blue-700">
          Envie um contrato em PDF ou imagem e a IA extrairá automaticamente as informações principais.
        </p>
      </div>

      <DocumentProcessor
        context="contract"
        onSuccess={handleDocumentAnalysis}
        onError={handleProcessingError}
      />

      {extractedData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-900 mb-2">
            ✅ Dados Extraídos
          </h3>
          <pre className="text-xs text-green-700 whitespace-pre-wrap">
            {JSON.stringify(extractedData, null, 2)}
          </pre>
        </div>
      )}

      {showForm && (
        <ContractForm
          initialData={extractedData}
          onSuccess={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
```

## Key Implementation Points

### 1. Smart Upload Strategy
- **File Size Detection**: Automatically chooses Vision API vs file upload based on size
- **Type Optimization**: Different processing for images vs PDFs vs text files
- **Error Handling**: Graceful fallback when AI services are unavailable

### 2. Brazilian Document Expertise
- **Portuguese Prompts**: All AI interactions in Portuguese for better accuracy
- **Local Formats**: Recognizes Brazilian date, currency, and document formats
- **Document Types**: Specialized handling for Brazilian financial document types

### 3. Dual Model Approach
- **Classification (Haiku)**: Fast, cost-effective document type identification
- **Analysis (Sonnet)**: Deep reasoning and structured data extraction
- **Cost Optimization**: Uses appropriate model for each task

### 4. Comprehensive Error Handling
- **Rate Limiting**: Proper handling of API rate limits
- **File Validation**: Size, type, and format validation before processing
- **User Feedback**: Clear error messages and processing status updates

---

*This example demonstrates advanced AI document processing with Claude, optimized for Brazilian financial documents and integrated with ArqCashflow's team-based security model.*