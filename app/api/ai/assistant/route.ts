import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { queryDatabase } from '@/lib/langchain'
import { getTodayDateString } from '@/lib/date-utils'
import { z } from 'zod'

const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
})

// Helper function to clean JSON response from AI (removes markdown code blocks)
function cleanJsonResponse(response: string): string {
  if (!response) return '{}'

  // Remove markdown code blocks if present
  let cleaned = response.trim()

  // Remove ```json and ``` markers
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '')
  }
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '')
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\s*```$/, '')
  }

  return cleaned.trim()
}

// Safe JSON parse with error handling
function safeJsonParse(response: string, fallback: any = {}) {
  try {
    const cleaned = cleanJsonResponse(response)
    return JSON.parse(cleaned)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('JSON parse error:', errorMessage, 'Original response:', response)
    return fallback
  }
}

// Schema for incoming requests
const AssistantRequestSchema = z.object({
  message: z.string().optional(),
  files: z.array(z.object({
    name: z.string(),
    type: z.string(),
    base64: z.string()
  })).optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    metadata: z.any().optional()
  })).optional(),
  pendingAction: z.object({
    type: z.enum(['contract', 'expense', 'receivable']),
    data: z.any()
  }).optional()
})

// Intent classification using Claude
async function classifyIntent(message: string, hasFiles: boolean, history: any[] = []) {
  const systemPrompt = `You are an AI assistant for a cashflow management system. Classify the user's intent into one of these categories:

CATEGORIES:
1. "query" - User wants to ask questions about existing data (revenue, contracts, expenses, etc.)
2. "create_contract" - User wants to create a new contract or mentions client/project details
3. "create_expense" - User wants to add an expense, mentions costs, bills, purchases, vendors
4. "create_receivable" - User wants to add expected payments, invoices to send, billing
5. "process_document" - User uploaded files or mentions processing receipts, contracts, invoices
6. "general" - General conversation, greetings, unclear intent

CONTEXT:
- User has ${hasFiles ? 'uploaded files' : 'no files'}
- Recent conversation: ${history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}

USER MESSAGE: "${message}"

Respond with ONLY the category name (e.g., "query" or "create_expense").`

  try {
    const response = await claude.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 50,
      system: systemPrompt,
      messages: [
        { role: 'user', content: message }
      ],
    })

    const firstBlock = response.content[0]
    const intent = (firstBlock?.type === 'text' ? firstBlock.text : '').trim().toLowerCase()
    return intent || 'general'
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Intent classification error:', errorMessage)
    return 'general'
  }
}

// Helper to extract info from filename
function extractInfoFromFilename(filename: string) {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')

  // Try to extract client names (pattern: "name + name" or "name e name")
  const clientMatch = nameWithoutExt.match(/([A-Za-zÀ-ÿ]+(?:\s+[eE]\s+|\s*\+\s*)[A-Za-zÀ-ÿ]+)/i)
  const clientName = clientMatch ? clientMatch[1].replace(/\s*\+\s*/, ' e ').replace(/\s+[eE]\s+/, ' e ') : null

  // Try to extract project info (after "Proposta" or "-")
  const projectMatch = nameWithoutExt.match(/(?:Proposta|projeto|Project)\s+(.+)/i)
  const projectName = projectMatch ? projectMatch[1].trim() : clientName

  // Try to extract vendor info
  const vendorMatch = nameWithoutExt.match(/^([^-]+)/i)
  const vendor = vendorMatch ? vendorMatch[1].trim() : null

  return { clientName, projectName, vendor }
}

// Process documents using OpenAI Vision API
async function processDocuments(files: any[], _teamId: string) {
  const results = []

  for (const file of files) {
    try {
      // Claude can process both images and PDFs directly!
      let isProcessableFile = false
      let content: any[] = []

      if (file.type.startsWith('image/')) {
        console.log(`🖼️ Processing image with Claude: ${file.name}`)
        isProcessableFile = true
        content = [
          {
            type: 'text',
            text: 'Please analyze this image document and classify it as: receipt, invoice, contract, or other.'
          },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: file.type,
              data: file.base64
            }
          }
        ]
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        console.log(`📄 Processing PDF with Claude: ${file.name}`)
        isProcessableFile = true
        content = [
          {
            type: 'text',
            text: 'Please analyze this PDF document and classify it as: receipt, invoice, contract, or other.'
          },
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: file.base64
            }
          }
        ]
      }

      if (!isProcessableFile) {
        // Fallback to filename-based processing for unsupported file types
        console.log(`📄 Using filename-based processing for: ${file.name}`)

        let docType = 'contract' // Default to contracts
        const lowerName = file.name.toLowerCase()

        if (lowerName.includes('recibo') || lowerName.includes('receipt') || lowerName.includes('nota')) {
          docType = 'receipt'
        } else if (lowerName.includes('fatura') || lowerName.includes('invoice') || lowerName.includes('boleto')) {
          docType = 'invoice'
        } else if (lowerName.includes('contrato') || lowerName.includes('proposta') || lowerName.includes('contract')) {
          docType = 'contract'
        }

        // Extract information from filename
        const nameInfo = extractInfoFromFilename(file.name)

        if (docType === 'contract') {
          results.push({
            fileName: file.name,
            documentType: docType,
            extractedData: {
              clientName: nameInfo.clientName || 'Cliente do arquivo',
              projectName: nameInfo.projectName || nameInfo.clientName || 'Projeto do arquivo',
              totalValue: null,
              signedDate: null,
              description: `Contrato importado de arquivo: ${file.name}`,
              category: 'Residencial'
            }
          })
        } else {
          results.push({
            fileName: file.name,
            documentType: docType,
            extractedData: {
              description: `Documento importado: ${file.name}`,
              amount: null,
              vendor: nameInfo.vendor,
              date: getTodayDateString(),
              category: 'outros'
            }
          })
        }

        continue // Skip to next file
      }

      // Use Claude for comprehensive document analysis (works for both PDFs and images!)
      const analysisPrompt = `Analyze this document and extract relevant information for a cashflow management system.

First, classify the document as one of:
1. "receipt" - Purchase receipt, expense proof
2. "invoice" - Bill to be paid, vendor invoice
3. "contract" - Contract document, agreement
4. "other" - Other document type

Then extract ALL relevant information and return a JSON response with this structure:

{
  "documentType": "receipt|invoice|contract|other",
  "extractedData": {
    // For contracts:
    "clientName": "client name if found",
    "projectName": "project name if found",
    "totalValue": number_value_if_found,
    "signedDate": "YYYY-MM-DD if found",
    "description": "brief description",
    "category": "Residencial|Comercial|Restaurante|Loja if applicable",

    // For receipts/invoices:
    "description": "expense description",
    "amount": number_value_if_found,
    "vendor": "vendor name if found",
    "date": "YYYY-MM-DD if found",
    "category": "materiais|mão-de-obra|equipamentos|transporte|escritório|software|utilidades|aluguel|seguro|marketing|serviços-profissionais|outros",
    "invoiceNumber": "invoice number if found"
  }
}

Be thorough in extracting information. Use null for missing values. Return ONLY the JSON object, no markdown formatting.`

      // Add the comprehensive analysis prompt to the content
      const analysisContent: any[] = [
        {
          type: 'text',
          text: analysisPrompt
        },
        ...content.slice(1) // Skip the first text item, use our analysis prompt
      ]

      const analysisResponse = await claude.messages.create({
        model: 'claude-3-5-sonnet-20241022', // Latest stable Sonnet for document analysis
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: analysisContent
          }
        ],
      })

      const analysisBlock = analysisResponse.content[0]
      const analysisResult = safeJsonParse((analysisBlock?.type === 'text' ? analysisBlock.text : '{}'))
      const docType = analysisResult.documentType?.toLowerCase() || 'other'
      const extractedData = analysisResult.extractedData || {}

      console.log(`📄 Claude analysis result for ${file.name}:`, { docType, extractedData })

      results.push({
        fileName: file.name,
        documentType: docType,
        extractedData
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Error processing file ${file.name}:`, errorMessage)

      // Check if it's an API error
      if (error && typeof error === 'object' && 'code' in error && error.code === 'invalid_request_error') {
        results.push({
          fileName: file.name,
          error: 'Arquivo inválido ou muito grande. Use imagens (PNG, JPG) ou PDFs menores que 10MB.'
        })
      } else if (error && typeof error === 'object' && 'code' in error && error.code === 'rate_limit_exceeded') {
        results.push({
          fileName: file.name,
          error: 'Limite de API excedido. Tente novamente em alguns segundos.'
        })
      } else {
        results.push({
          fileName: file.name,
          error: `Falha ao processar documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        })
      }
    }
  }

  return results
}

// Create contract from extracted data
async function createContractFromData(data: any, teamId: string) {
  try {
    // Check for existing contracts with same project name
    let projectName = data.projectName
    const existingContracts = await prisma.contract.findMany({
      where: {
        teamId,
        clientName: data.clientName,
        projectName: {
          startsWith: projectName
        }
      },
      select: {
        projectName: true
      }
    })

    // If duplicates exist, append a number
    if (existingContracts.length > 0) {
      // Extract existing numbers from project names
      const numbers = existingContracts.map(c => {
        const match = c.projectName.match(/\s+(\d+)$/)
        return match ? parseInt(match[1]) : 1
      })

      // Find the next available number
      const nextNumber = Math.max(...numbers) + 1
      projectName = `${projectName} ${nextNumber}`
    }

    const contract = await prisma.contract.create({
      data: {
        teamId,
        clientName: data.clientName,
        projectName,
        totalValue: data.totalValue,
        signedDate: data.signedDate ? new Date(data.signedDate) : new Date(),
        description: data.description || null,
        category: data.category || null,
        status: 'active'
      }
    })

    return { success: true, contract }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error creating contract:', errorMessage)
    return { success: false, error: 'Failed to create contract' }
  }
}

// Create expense from extracted data
async function createExpenseFromData(data: any, teamId: string) {
  try {
    const expense = await prisma.expense.create({
      data: {
        teamId,
        description: data.description,
        amount: data.amount,
        dueDate: data.date ? new Date(data.date) : new Date(),
        category: data.category || 'outros',
        vendor: data.vendor || null,
        invoiceNumber: data.invoiceNumber || null,
        status: 'pending',
        type: 'operational'
      }
    })

    return { success: true, expense }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error creating expense:', errorMessage)
    return { success: false, error: 'Failed to create expense' }
  }
}

// Create receivable from extracted data
async function createReceivableFromData(data: any, teamId: string) {
  try {
    // Find the contract by client name or project name
    let contract = null
    if (data.clientName || data.projectName) {
      contract = await prisma.contract.findFirst({
        where: {
          teamId,
          OR: [
            { clientName: { contains: data.clientName, mode: 'insensitive' } },
            { projectName: { contains: data.projectName, mode: 'insensitive' } }
          ]
        }
      })
    }

    // If no contract found and we have client/project info, create a minimal contract
    if (!contract && (data.clientName || data.projectName)) {
      contract = await prisma.contract.create({
        data: {
          teamId,
          clientName: data.clientName || 'Cliente',
          projectName: data.projectName || 'Projeto',
          totalValue: data.amount || 0,
          signedDate: new Date(),
          status: 'active',
          description: 'Contrato criado automaticamente para recebível'
        }
      })
    }

    if (!contract) {
      return { success: false, error: 'Contrato não encontrado. Forneça o nome do cliente ou projeto.' }
    }

    const receivable = await prisma.receivable.create({
      data: {
        contractId: contract.id,
        expectedDate: data.date ? new Date(data.date) : new Date(),
        amount: data.amount,
        status: 'pending',
        category: data.category || 'project work',
        invoiceNumber: data.invoiceNumber || null,
        notes: data.notes || null
      }
    })

    return { success: true, receivable, contract }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error creating receivable:', errorMessage)
    return { success: false, error: 'Failed to create receivable' }
  }
}

// Handle different intents
async function handleIntent(intent: string, message: string, files: any[], teamId: string, history: any[] = [], _pendingAction: any = null) {
  switch (intent) {
    case 'query':
      // Use existing query system
      const queryResult = await queryDatabase(message, teamId, history.slice(-5))
      return {
        type: 'query_response',
        response: queryResult.answer,
        sqlQuery: queryResult.sqlQuery
      }

    case 'process_document':
      if (!files || files.length === 0) {
        return {
          type: 'clarification',
          response: 'Não vejo nenhum documento anexado. Por favor, faça upload do documento que deseja processar.'
        }
      }

      console.log('🔍 Processing documents:', files.map(f => ({ name: f.name, type: f.type, size: f.base64?.length })))

      let processedDocs
      try {
        processedDocs = await processDocuments(files, teamId)
        console.log('📄 Document processing results:', processedDocs)
      } catch (docError) {
        console.error('❌ Document processing failed:', docError)
        return {
          type: 'document_error',
          response: `Erro ao processar documento: ${docError instanceof Error ? docError.message : 'Erro desconhecido'}. Verifique se o arquivo é uma imagem (PNG, JPG) ou PDF válido.`
        }
      }

      // Check if all documents had errors
      const hasErrors = processedDocs.every(doc => doc.error)
      if (hasErrors) {
        const errorMessages = processedDocs.map(doc => `• ${doc.fileName}: ${doc.error}`).join('\n')
        return {
          type: 'document_error',
          response: `❌ Erro ao processar documentos:\n${errorMessages}`
        }
      }

      // Auto-create if extraction is clear, otherwise ask for confirmation
      const autoCreateResults = []
      const pendingConfirmations = []

      for (const doc of processedDocs) {
        // Skip documents with errors
        if (doc.error) {
          continue
        }
        if (doc.documentType === 'receipt' || doc.documentType === 'invoice') {
          if (doc.extractedData.description && doc.extractedData.amount) {
            // Auto-create expense if data is clear
            const result = await createExpenseFromData(doc.extractedData, teamId)
            autoCreateResults.push({ type: 'expense', result, fileName: doc.fileName })
          } else {
            pendingConfirmations.push({ type: 'expense', data: doc.extractedData, fileName: doc.fileName })
          }
        } else if (doc.documentType === 'contract') {
          if (doc.extractedData.clientName && doc.extractedData.projectName && doc.extractedData.totalValue) {
            // Auto-create contract if data is clear
            const result = await createContractFromData(doc.extractedData, teamId)
            autoCreateResults.push({ type: 'contract', result, fileName: doc.fileName })
          } else {
            pendingConfirmations.push({ type: 'contract', data: doc.extractedData, fileName: doc.fileName })
          }
        }
      }

      let response = ''
      if (autoCreateResults.length > 0) {
        response += `✅ Processados automaticamente:\n`
        autoCreateResults.forEach(item => {
          response += `• ${item.fileName}: ${item.type === 'expense' ? 'Despesa' : 'Contrato'} criado${item.result.success ? '' : ' (erro)'}\n`
        })
      }

      if (pendingConfirmations.length > 0) {
        response += `\n⏳ Aguardando confirmação:\n`
        pendingConfirmations.forEach(item => {
          response += `• ${item.fileName}: ${JSON.stringify(item.data, null, 2)}\n`
        })
        response += '\nConfirme se os dados estão corretos ou faça ajustes.'

        return {
          type: 'confirmation_needed',
          response,
          pendingActions: pendingConfirmations
        }
      }

      return {
        type: 'document_processed',
        response: response || 'Documentos processados com sucesso!'
      }

    case 'create_contract':
      // Build context from history - pass full history to AI for better understanding
      let conversationContext = ''
      if (history && history.length > 0) {
        // Get recent conversation for context
        const recentMessages = history.slice(-4)
        conversationContext = 'Previous conversation:\n' +
          recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')
      }

      // Parse contract info from natural language
      const contractPrompt = `Extract contract information from this message: "${message}"

${conversationContext}

IMPORTANT: Consider the full conversation context. If the user previously mentioned contract details and is now providing missing information, combine ALL the information from the conversation.

Return ONLY a valid JSON object (no markdown formatting):
{
  "clientName": "client name if mentioned in current message or context",
  "projectName": "project name if mentioned (if user says to use client name as project, use the client name)",
  "totalValue": number (just the number if mentioned in current message or context),
  "signedDate": "date in YYYY-MM-DD if mentioned",
  "description": "description if mentioned",
  "category": "category if mentioned"
}

Use null for missing information. Return only the JSON object, no code blocks or markdown.`

      const contractResponse = await claude.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 300,
        messages: [{ role: 'user', content: contractPrompt }],
      })

      const contractBlock = contractResponse.content[0]
      const contractData = safeJsonParse((contractBlock?.type === 'text' ? contractBlock.text : '{}'))

      // If no project name but has client name, use client name as project name
      if (contractData.clientName && !contractData.projectName) {
        contractData.projectName = contractData.clientName
      }

      if (contractData.clientName && contractData.projectName && contractData.totalValue) {
        const result = await createContractFromData(contractData, teamId)
        return {
          type: 'contract_created',
          response: result.success ?
            `✅ Contrato criado: ${contractData.clientName} - ${contractData.projectName} (R$ ${contractData.totalValue.toLocaleString('pt-BR')})` :
            `❌ Erro ao criar contrato: ${result.error}`
        }
      } else {
        return {
          type: 'clarification',
          response: `Para criar um contrato, preciso de mais informações:\n• Cliente: ${contractData.clientName || 'não informado'}\n• Projeto: ${contractData.projectName || 'não informado'}\n• Valor: ${contractData.totalValue || 'não informado'}\n\nPor favor, forneça os dados em falta.`
        }
      }

    case 'create_expense':
      // Parse expense info from natural language
      const expensePrompt = `Extract expense information from this message: "${message}"

Be smart about inferring information. Examples:
- "despesa 2500, ontem, escritório" = {"description": "Despesa de escritório", "amount": 2500, "date": "ontem", "category": "escritório"}
- "R$2000 escritório daqui a uma semana" = {"description": "Despesa de escritório", "amount": 2000, "date": "daqui a uma semana", "category": "escritório"}
- "materiais 5000" = {"description": "Materiais", "amount": 5000, "category": "materiais"}
- "aluguel amanhã" = {"description": "Aluguel", "category": "aluguel", "date": "amanhã"}

Return ONLY a valid JSON object (no markdown formatting):
{
  "description": "expense description (infer from context if not explicit)",
  "amount": number (just the number if mentioned),
  "vendor": "vendor name if mentioned",
  "date": "date in YYYY-MM-DD if mentioned, or relative dates like 'ontem', 'hoje', 'amanhã', 'daqui a uma semana'",
  "category": "one of: materiais, mão-de-obra, equipamentos, transporte, escritório, software, utilidades, aluguel, seguro, marketing, serviços-profissionais, outros"
}

Be intelligent about filling in description from category or context. Use null only when truly missing. Return only the JSON object, no code blocks or markdown.`

      const expenseResponse = await claude.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 300,
        messages: [{ role: 'user', content: expensePrompt }],
      })

      const expenseBlock = expenseResponse.content[0]
      const expenseData = safeJsonParse((expenseBlock?.type === 'text' ? expenseBlock.text : '{}'))

      // Handle relative dates
      if (expenseData.date) {
        const today = new Date()
        const dateStr = expenseData.date.toLowerCase()

        if (dateStr === 'yesterday' || dateStr === 'ontem') {
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          expenseData.date = yesterday.toISOString().split('T')[0]
        } else if (dateStr === 'today' || dateStr === 'hoje') {
          expenseData.date = today.toISOString().split('T')[0]
        } else if (dateStr === 'tomorrow' || dateStr === 'amanhã') {
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          expenseData.date = tomorrow.toISOString().split('T')[0]
        } else if (dateStr.includes('daqui a') || dateStr.includes('em ') || dateStr.includes('próxima') || dateStr.includes('next')) {
          // Handle "daqui a uma semana", "em 3 dias", "próxima semana", etc.
          if (dateStr.includes('semana') || dateStr.includes('week')) {
            const futureDate = new Date(today)
            futureDate.setDate(futureDate.getDate() + 7)
            expenseData.date = futureDate.toISOString().split('T')[0]
          } else if (dateStr.includes('dia') || dateStr.includes('day')) {
            // Extract number of days
            const daysMatch = dateStr.match(/(\d+)/)
            const days = daysMatch ? parseInt(daysMatch[1]) : 1
            const futureDate = new Date(today)
            futureDate.setDate(futureDate.getDate() + days)
            expenseData.date = futureDate.toISOString().split('T')[0]
          } else if (dateStr.includes('mês') || dateStr.includes('month')) {
            const futureDate = new Date(today)
            futureDate.setMonth(futureDate.getMonth() + 1)
            expenseData.date = futureDate.toISOString().split('T')[0]
          }
        }
      }

      // Set today's date if not provided
      if (!expenseData.date) {
        expenseData.date = getTodayDateString()
      }

      // Be more flexible - only require amount, auto-generate description if missing
      if (expenseData.amount) {
        // Auto-generate description if missing but category exists
        if (!expenseData.description && expenseData.category) {
          expenseData.description = `Despesa de ${expenseData.category}`
        }

        // If still no description, use a generic one
        if (!expenseData.description) {
          expenseData.description = 'Despesa'
        }

        const result = await createExpenseFromData(expenseData, teamId)
        return {
          type: 'expense_created',
          response: result.success ?
            `✅ Despesa criada: ${expenseData.description} - R$ ${expenseData.amount.toLocaleString('pt-BR')}` :
            `❌ Erro ao criar despesa: ${result.error}`
        }
      } else {
        return {
          type: 'clarification',
          response: `Para criar uma despesa, preciso pelo menos do valor. Tente algo como:\n• "despesa 2500 escritório"\n• "materiais 5000 reais"\n• "aluguel 3500 vencimento amanhã"\n\nValor atual: ${expenseData.amount || 'não informado'}`
        }
      }

    case 'create_receivable':
      // Parse receivable info from natural language
      const receivablePrompt = `Extract receivable information from this message: "${message}"

Be smart about inferring information. Examples:
- "RT projeto dina claire R$4600 amanhã" = {"description": "RT projeto dina claire", "amount": 4600, "date": "amanhã", "projectName": "dina claire"}
- "recebível João Silva 5000 próxima semana" = {"description": "recebível João Silva", "amount": 5000, "date": "próxima semana", "clientName": "João Silva"}
- "faturar Maria Santos 3000" = {"description": "faturar Maria Santos", "amount": 3000, "clientName": "Maria Santos"}

Return ONLY a valid JSON object (no markdown formatting):
{
  "description": "receivable description (infer from context)",
  "amount": number (just the number if mentioned),
  "clientName": "client name if mentioned",
  "projectName": "project name if mentioned",
  "date": "date in YYYY-MM-DD if mentioned, or relative dates like 'hoje', 'amanhã', 'próxima semana'",
  "category": "category if mentioned, default to 'project work'",
  "invoiceNumber": "invoice number if mentioned"
}

Be intelligent about filling in information from context. Use null only when truly missing. Return only the JSON object, no code blocks or markdown.`

      const receivableResponse = await claude.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 300,
        messages: [{ role: 'user', content: receivablePrompt }],
      })

      const receivableBlock = receivableResponse.content[0]
      const receivableData = safeJsonParse((receivableBlock?.type === 'text' ? receivableBlock.text : '{}'))

      // Handle relative dates (same logic as expenses)
      if (receivableData.date) {
        const today = new Date()
        const dateStr = receivableData.date.toLowerCase()

        if (dateStr === 'yesterday' || dateStr === 'ontem') {
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          receivableData.date = yesterday.toISOString().split('T')[0]
        } else if (dateStr === 'today' || dateStr === 'hoje') {
          receivableData.date = today.toISOString().split('T')[0]
        } else if (dateStr === 'tomorrow' || dateStr === 'amanhã') {
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          receivableData.date = tomorrow.toISOString().split('T')[0]
        } else if (dateStr.includes('daqui a') || dateStr.includes('em ') || dateStr.includes('próxima') || dateStr.includes('next')) {
          // Handle "daqui a uma semana", "em 3 dias", "próxima semana", etc.
          if (dateStr.includes('semana') || dateStr.includes('week')) {
            const futureDate = new Date(today)
            futureDate.setDate(futureDate.getDate() + 7)
            receivableData.date = futureDate.toISOString().split('T')[0]
          } else if (dateStr.includes('dia') || dateStr.includes('day')) {
            // Extract number of days
            const daysMatch = dateStr.match(/(\d+)/)
            const days = daysMatch ? parseInt(daysMatch[1]) : 1
            const futureDate = new Date(today)
            futureDate.setDate(futureDate.getDate() + days)
            receivableData.date = futureDate.toISOString().split('T')[0]
          } else if (dateStr.includes('mês') || dateStr.includes('month')) {
            const futureDate = new Date(today)
            futureDate.setMonth(futureDate.getMonth() + 1)
            receivableData.date = futureDate.toISOString().split('T')[0]
          }
        }
      }

      // Set today's date if not provided
      if (!receivableData.date) {
        receivableData.date = getTodayDateString()
      }

      // Only require amount, auto-generate description if missing
      if (receivableData.amount) {
        // Auto-generate description if missing
        if (!receivableData.description) {
          if (receivableData.clientName && receivableData.projectName) {
            receivableData.description = `Recebível - ${receivableData.clientName} - ${receivableData.projectName}`
          } else if (receivableData.clientName) {
            receivableData.description = `Recebível - ${receivableData.clientName}`
          } else if (receivableData.projectName) {
            receivableData.description = `Recebível - ${receivableData.projectName}`
          } else {
            receivableData.description = 'Recebível'
          }
        }

        const result = await createReceivableFromData(receivableData, teamId)
        return {
          type: 'receivable_created',
          response: result.success ?
            `✅ Recebível criado: ${receivableData.description} - R$ ${receivableData.amount.toLocaleString('pt-BR')} para ${new Date(receivableData.date).toLocaleDateString('pt-BR')}` :
            `❌ Erro ao criar recebível: ${result.error}`
        }
      } else {
        return {
          type: 'clarification',
          response: `Para criar um recebível, preciso pelo menos do valor e referência ao cliente/projeto. Tente algo como:\n• "RT projeto Maria Santos 5000 amanhã"\n• "recebível João Silva 3000 próxima semana"\n• "faturar cliente X 4500"\n\nValor atual: ${receivableData.amount || 'não informado'}`
        }
      }

    default:
      return {
        type: 'general_response',
        response: 'Posso ajudá-lo com:\n• 📊 Consultas sobre seus dados financeiros\n• 📄 Criação de contratos\n• 💰 Adição de despesas\n• 💵 Criação de recebíveis\n• 🧾 Processamento de documentos (recibos, contratos)\n\nComo posso ajudá-lo hoje?'
      }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { teamId } = await requireAuth()

    if (!process.env.CLAUDE_API_KEY) {
      return Response.json(
        { error: 'Claude API key not configured' },
        { status: 500 }
      )
    }

    // Handle both JSON and multipart/form-data requests
    let message = ''
    let files: any[] = []
    let history: any[] = []
    let pendingAction = null

    const contentType = (request as Request).headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form-data for large files
      console.log('📦 Processing multipart form-data request')

      const formData = await (request as Request).formData()
      message = formData.get('message') as string || ''

      // Parse history if provided
      const historyStr = formData.get('history') as string
      if (historyStr) {
        try {
          history = JSON.parse(historyStr)
        } catch (e) {
          console.warn('Failed to parse history from form data')
        }
      }

      // Process uploaded files
      const uploadedFiles = formData.getAll('files')
      for (const file of uploadedFiles) {
        if (file instanceof File) {
          console.log(`📄 Processing uploaded file: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)

          // Convert file to base64 for Claude API
          const arrayBuffer = await file.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')

          files.push({
            name: file.name,
            type: file.type,
            base64,
            size: file.size
          })
        }
      }
    } else {
      // Handle traditional JSON requests for smaller files
      console.log('📄 Processing JSON request')
      const body = await (request as Request).json()
      const parsedBody = AssistantRequestSchema.parse(body)
      message = parsedBody.message || ''
      files = parsedBody.files || []
      history = parsedBody.history || []
      pendingAction = parsedBody.pendingAction || null
    }

    // Classify user intent
    const intent = await classifyIntent(message, files.length > 0, history)

    console.log('🤖 AI Assistant:', { intent, hasFiles: files.length > 0, message: message.substring(0, 100) })

    // Handle the intent
    const result = await handleIntent(intent, message, files, teamId, history, pendingAction)

    return NextResponse.json({
      intent,
      ...result
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request format' }, { status: 400 })
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('AI Assistant error:', errorMessage)
    return Response.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    )
  }
}