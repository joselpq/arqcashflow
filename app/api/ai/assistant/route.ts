import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { queryDatabase } from '@/lib/langchain'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    console.error('JSON parse error:', error, 'Original response:', response)
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

// Intent classification using AI
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.1,
      max_tokens: 50
    })

    const intent = response.choices[0]?.message?.content?.trim().toLowerCase()
    return intent || 'general'
  } catch (error) {
    console.error('Intent classification error:', error)
    return 'general'
  }
}

// Process documents using OpenAI Vision API
async function processDocuments(files: any[], teamId: string) {
  const results = []

  for (const file of files) {
    try {
      // Classify document type first
      const classificationPrompt = `Analyze this document and classify it as one of:
1. "receipt" - Purchase receipt, expense proof
2. "invoice" - Bill to be paid, vendor invoice
3. "contract" - Contract document, agreement
4. "other" - Other document type

Respond with ONLY the classification.`

      const classificationResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: classificationPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.type};base64,${file.base64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 50
      })

      const docType = classificationResponse.choices[0]?.message?.content?.trim().toLowerCase()

      // Extract information based on document type
      let extractionPrompt = ''
      if (docType === 'receipt' || docType === 'invoice') {
        extractionPrompt = `Extract expense information from this document. Return ONLY a valid JSON object (no markdown formatting):
{
  "description": "brief description of the expense",
  "amount": number (just the number, no currency),
  "vendor": "vendor/store name if visible",
  "date": "date in YYYY-MM-DD format if visible",
  "category": "one of: materiais, mão-de-obra, equipamentos, transporte, escritório, software, utilidades, aluguel, seguro, marketing, serviços-profissionais, outros",
  "invoiceNumber": "invoice/receipt number if visible"
}

If information is missing, use null. Be precise with amounts and dates. Return only the JSON object, no code blocks or markdown.`
      } else if (docType === 'contract') {
        extractionPrompt = `Extract contract information from this document. Return ONLY a valid JSON object (no markdown formatting):
{
  "clientName": "client/customer name",
  "projectName": "project name or description",
  "totalValue": number (just the number, no currency),
  "signedDate": "date in YYYY-MM-DD format if visible",
  "description": "brief description of the contract",
  "category": "one of: Residencial, Comercial, Restaurante, Loja"
}

If information is missing, use null. Be precise with amounts and dates. Return only the JSON object, no code blocks or markdown.`
      } else {
        extractionPrompt = `This document doesn't appear to be a receipt, invoice, or contract.
Return ONLY a valid JSON object (no markdown formatting):
{
  "type": "other",
  "summary": "brief summary of what this document contains"
}`
      }

      const extractionResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: extractionPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.type};base64,${file.base64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })

      const extractedData = safeJsonParse(extractionResponse.choices[0]?.message?.content || '{}')

      results.push({
        fileName: file.name,
        documentType: docType,
        extractedData
      })

    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
      results.push({
        fileName: file.name,
        error: 'Failed to process document'
      })
    }
  }

  return results
}

// Create contract from extracted data
async function createContractFromData(data: any, teamId: string) {
  try {
    const contract = await prisma.contract.create({
      data: {
        teamId,
        clientName: data.clientName,
        projectName: data.projectName,
        totalValue: data.totalValue,
        signedDate: data.signedDate ? new Date(data.signedDate) : new Date(),
        description: data.description || null,
        category: data.category || null,
        status: 'active'
      }
    })

    return { success: true, contract }
  } catch (error) {
    console.error('Error creating contract:', error)
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
    console.error('Error creating expense:', error)
    return { success: false, error: 'Failed to create expense' }
  }
}

// Handle different intents
async function handleIntent(intent: string, message: string, files: any[], teamId: string, history: any[] = [], pendingAction: any = null) {
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

      const processedDocs = await processDocuments(files, teamId)

      // Auto-create if extraction is clear, otherwise ask for confirmation
      const autoCreateResults = []
      const pendingConfirmations = []

      for (const doc of processedDocs) {
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
      // Parse contract info from natural language
      const contractPrompt = `Extract contract information from this message: "${message}"

Return ONLY a valid JSON object (no markdown formatting):
{
  "clientName": "client name if mentioned",
  "projectName": "project name if mentioned",
  "totalValue": number (just the number if mentioned),
  "signedDate": "date in YYYY-MM-DD if mentioned",
  "description": "description if mentioned",
  "category": "category if mentioned"
}

Use null for missing information. Return only the JSON object, no code blocks or markdown.`

      const contractResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: contractPrompt }],
        temperature: 0.1
      })

      const contractData = safeJsonParse(contractResponse.choices[0]?.message?.content || '{}')

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

Return ONLY a valid JSON object (no markdown formatting):
{
  "description": "expense description",
  "amount": number (just the number if mentioned),
  "vendor": "vendor name if mentioned",
  "date": "date in YYYY-MM-DD if mentioned, otherwise today",
  "category": "one of: materiais, mão-de-obra, equipamentos, transporte, escritório, software, utilidades, aluguel, seguro, marketing, serviços-profissionais, outros"
}

Use null for missing information except date (use today's date if not specified). Return only the JSON object, no code blocks or markdown.`

      const expenseResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: expensePrompt }],
        temperature: 0.1
      })

      const expenseData = safeJsonParse(expenseResponse.choices[0]?.message?.content || '{}')

      if (expenseData.description && expenseData.amount) {
        // Set today's date if not provided
        if (!expenseData.date) {
          expenseData.date = new Date().toISOString().split('T')[0]
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
          response: `Para criar uma despesa, preciso de mais informações:\n• Descrição: ${expenseData.description || 'não informada'}\n• Valor: ${expenseData.amount || 'não informado'}\n• Vencimento: ${expenseData.date || 'não informado'}\n\nPor favor, forneça os dados em falta.`
        }
      }

    default:
      return {
        type: 'general_response',
        response: 'Posso ajudá-lo com:\n• 📊 Consultas sobre seus dados financeiros\n• 📄 Criação de contratos\n• 💰 Adição de despesas\n• 🧾 Processamento de documentos (recibos, contratos)\n\nComo posso ajudá-lo hoje?'
      }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { teamId } = await requireAuth()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { message = '', files = [], history = [], pendingAction = null } = AssistantRequestSchema.parse(body)

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
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
    }

    console.error('AI Assistant error:', error)
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    )
  }
}