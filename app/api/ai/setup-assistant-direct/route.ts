import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
})

interface CreateDataResponse {
  contracts: { created: number; errors: string[] }
  receivables: { created: number; errors: string[] }
  expenses: { created: number; errors: string[] }
}

async function createContractsFromData(contracts: any[], teamId: string) {
  const results = { created: 0, errors: [] as string[] }

  for (const contractData of contracts) {
    try {
      // Log what we're trying to create
      console.log('📝 Creating contract:', {
        clientName: contractData.clientName,
        projectName: contractData.projectName,
        totalValue: contractData.totalValue,
        signedDate: contractData.signedDate
      })

      // Ensure we have required fields
      if (!contractData.clientName) {
        results.errors.push(`Missing clientName for contract: ${contractData.projectName || 'unknown'}`)
        continue
      }
      if (!contractData.projectName) {
        results.errors.push(`Missing projectName for contract: ${contractData.clientName}`)
        continue
      }
      if (!contractData.totalValue) {
        results.errors.push(`Missing totalValue for contract: ${contractData.clientName} - ${contractData.projectName}`)
        continue
      }
      if (!contractData.signedDate) {
        results.errors.push(`Missing signedDate for contract: ${contractData.clientName} - ${contractData.projectName}`)
        continue
      }

      await prisma.contract.create({
        data: {
          clientName: contractData.clientName,
          projectName: contractData.projectName,
          description: contractData.description || null,
          totalValue: Number(contractData.totalValue),
          signedDate: new Date(contractData.signedDate),
          category: contractData.category || null,
          notes: contractData.notes || null,
          status: contractData.status || 'active',
          teamId
        }
      })
      results.created++
      console.log('✅ Contract created successfully')
    } catch (error) {
      console.log('❌ Error creating contract:', error)
      results.errors.push(`Error creating contract ${contractData.clientName}: ${error}`)
    }
  }

  return results
}

async function createReceivablesFromData(receivables: any[], teamId: string) {
  const results = { created: 0, errors: [] as string[] }

  for (const receivableData of receivables) {
    try {
      // Ensure we have required fields
      if (!receivableData.expectedDate || !receivableData.amount) {
        results.errors.push(`Missing required fields for receivable: ${JSON.stringify(receivableData)}`)
        continue
      }

      // Try to find matching contract
      let contractId = null
      if (receivableData.clientName || receivableData.projectName) {
        const whereConditions: any = { teamId }

        if (receivableData.clientName && receivableData.projectName) {
          whereConditions.AND = [
            { clientName: { contains: receivableData.clientName, mode: 'insensitive' } },
            { projectName: { contains: receivableData.projectName, mode: 'insensitive' } }
          ]
        } else if (receivableData.clientName) {
          whereConditions.clientName = { contains: receivableData.clientName, mode: 'insensitive' }
        } else if (receivableData.projectName) {
          whereConditions.projectName = { contains: receivableData.projectName, mode: 'insensitive' }
        }

        const contract = await prisma.contract.findFirst({ where: whereConditions })
        contractId = contract?.id
      }

      await prisma.receivable.create({
        data: {
          contractId,
          expectedDate: new Date(receivableData.expectedDate),
          amount: Number(receivableData.amount),
          invoiceNumber: receivableData.invoiceNumber || null,
          category: receivableData.category || null,
          notes: receivableData.notes || null,
          status: 'pending'
        }
      })
      results.created++
    } catch (error) {
      results.errors.push(`Error creating receivable: ${error}`)
    }
  }

  return results
}

async function createExpensesFromData(expenses: any[], teamId: string) {
  const results = { created: 0, errors: [] as string[] }

  for (const expenseData of expenses) {
    try {
      // Ensure we have required fields
      if (!expenseData.description || !expenseData.amount || !expenseData.dueDate || !expenseData.category) {
        results.errors.push(`Missing required fields for expense: ${JSON.stringify(expenseData)}`)
        continue
      }

      await prisma.expense.create({
        data: {
          description: expenseData.description,
          amount: Number(expenseData.amount),
          dueDate: new Date(expenseData.dueDate),
          category: expenseData.category,
          vendor: expenseData.vendor || null,
          invoiceNumber: expenseData.invoiceNumber || null,
          type: expenseData.type || 'operational',
          notes: expenseData.notes || null,
          status: 'pending',
          isRecurring: false,
          teamId
        }
      })
      results.created++
    } catch (error) {
      results.errors.push(`Error creating expense: ${error}`)
    }
  }

  return results
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth()

    if (!user.team) {
      return NextResponse.json({ error: 'User team not found' }, { status: 400 })
    }

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      console.log('📁 Processing file with DIRECT Claude approach:', file.name, 'Type:', file.type)

      // Convert file based on type
      const buffer = Buffer.from(await file.arrayBuffer())
      let fileContent: string | undefined
      let fileBase64: string | undefined
      let isVisualDocument = false

      // Check file type by MIME type and extension
      const fileType = file.type.toLowerCase()
      const fileName = file.name.toLowerCase()

      if (fileName.endsWith('.csv')) {
        // CSV files - keep original buffer for document attachment
        fileContent = buffer.toString('utf-8') // For logging only
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Excel files - keep original buffer for document attachment
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        fileContent = XLSX.utils.sheet_to_csv(worksheet) // For logging only
      } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        // PDF files - send as base64 for Claude to process
        fileBase64 = buffer.toString('base64')
        isVisualDocument = true
        console.log('📄 Processing PDF document')
      } else if (fileType.startsWith('image/') ||
                 fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) {
        // Image files - send as base64 for Claude to process
        fileBase64 = buffer.toString('base64')
        isVisualDocument = true
        console.log('🖼️ Processing image document')
      } else {
        return NextResponse.json({
          error: 'Unsupported file type. Please upload CSV, Excel, PDF, or image files.'
        }, { status: 400 })
      }

      // Different prompts for different document types
      let prompt: string

      if (isVisualDocument) {
        // Prompt for PDFs and images
        prompt = `You are a data extraction expert for a Brazilian architecture firm's cashflow system.

Analyze this document (PDF or image) and extract financial data according to these STRICT RULES:

DOCUMENT TYPE IDENTIFICATION:
1. **PROPOSAL/ORÇAMENTO**: Contains future project pricing, "proposta", breakdown of services with values
   → Extract as: 1 CONTRACT + RECEIVABLES (only if payment terms are specified)
   → DO NOT create expenses from proposals - these are future income, not costs

2. **INVOICE/NOTA FISCAL**: Contains charges for services/products already delivered
   → Extract as: 1 EXPENSE (what you need to pay)

3. **RECEIPT/RECIBO**: Contains proof of payment already made
   → Extract as: 1 EXPENSE with status "paid"

4. **CONTRACT/CONTRATO**: Contains agreed project terms and total value
   → Extract as: 1 CONTRACT + RECEIVABLES (only if payment terms are specified)

CONTRACT AND PROPOSAL PROCESSING RULES:
When you see a PROPOSAL or CONTRACT document:

A) ALWAYS CREATE ONE CONTRACT with:
   - clientName: Extract client name from document
   - projectName: Create from project description (e.g. "Projeto Arquitetura Residencial")
   - totalValue: The MAIN total value (exclude optional services like "acompanhamento")
   - signedDate: Use proposal/contract date as signed date
   - category: "Residencial", "Comercial", "Restaurante", etc.
   - notes: Include any optional services with rates (e.g. "Acompanhamento de projeto: R$ 350/visita")

B) CREATE RECEIVABLES only if payment terms are mentioned:
   - If "25% na assinatura" + 4 installments → Create 5 receivables:
     * 25% of total value on signed date
     * 4 equal installments of remaining 75% at 30, 60, 90, 120 days after signed date
   - If different payment terms mentioned, follow those exactly
   - If NO payment terms specified, create NO receivables
   - Use client name and project name for receivables

C) DO NOT CREATE EXPENSES from proposals or contracts (common mistake!)

BRAZILIAN FORMATS:
- Dates: "13/11/2024" or "13.11.24" → "2024-11-13"
- Currency: "R$ 30.575" → 30575 (number only)
- Payment terms: "30/60/90/120" means installments at 30, 60, 90, 120 days

VALIDATION RULES:
- Proposals should NEVER generate expenses
- Contract total value should match the sum of all receivables
- Receivable dates should be properly calculated from base date
- Optional services (like visits) go in contract notes, not separate line items`
      } else {
        // Prompt for spreadsheets (CSV/Excel)
        prompt = `You are a data extraction expert for a Brazilian architecture firm's cashflow system.

Analyze this spreadsheet data and extract ALL contracts, receivables, and expenses you can find.
IMPORTANT: Extract EVERY SINGLE ROW that looks like a contract, receivable, or expense. Do not limit or truncate the results.

IMPORTANT RULES:
1. For rows with project names like "LF - Livia Assan", extract:
   - clientName: "Livia Assan" (the part after the dash)
   - projectName: "LF" (the code before the dash)

2. Special cases for project names:
   - "LF (BAN) - Livia Assan" → clientName: "Livia Assan", projectName: "LF (BAN)"
   - "RL-IC - Rosa Lyra Isabel de Castela" → clientName: "Rosa Lyra Isabel de Castela", projectName: "RL-IC"

3. Brazilian date formats:
   - "23/Oct/20" means October 23, 2020
   - "15/09/2024" means September 15, 2024
   - Always output as "YYYY-MM-DD"

4. Brazilian currency:
   - "R$ 3,500" means 3500
   - "R$ 1.234,56" means 1234.56
   - Remove all formatting and return numbers only

5. STATUS AND CATEGORY STANDARDIZATION (VERY IMPORTANT):

   For CONTRACT STATUS, map Portuguese status to these EXACT English values:
   - "Em andamento", "Ativo", "Em progresso", "Andamento" → "active"
   - "Finalizado", "Concluído", "Completo", "Terminado" → "completed"
   - "Cancelado", "Cancelou", "Parado", "Suspenso" → "cancelled"
   - If unclear or empty, use "active"

   For EXPENSE TYPE, map to these EXACT English values:
   - "Operacional", "Despesa geral", "Administrativo" → "operational"
   - "Projeto", "Obra", "Cliente específico" → "project"
   - "Administração", "Escritório", "RH" → "administrative"
   - If unclear or empty, use "operational"

   For CATEGORIES (both contracts and expenses), use intelligent classification:
   - Residential projects → "Residencial"
   - Commercial projects → "Comercial"
   - Restaurant projects → "Restaurante"
   - Store/retail projects → "Loja"
   - For expenses: materials, labor, equipment, transport, office, software, etc.

6. Detect data types by looking at the headers and content:
   - Contracts: have client/project names, total values, and dates
   - Receivables: have expected dates and amounts to receive
   - Expenses: have descriptions, amounts, due dates, and vendors

7. If a CSV has multiple sections (like contracts section, then receivables section, then expenses section), detect ALL of them

8. EXTRACT ALL ROWS - if there are 37 contracts in the data, return all 37, not just a sample

9. Use the DESCRIPTION/NOTES fields to store any additional Portuguese information that doesn't fit the standardized fields

FILE CONTENT:
${fileContent}`
      }

      // Add the JSON structure to both prompts
      prompt += `

Return a JSON object with this EXACT structure (no markdown, just JSON):
{
  "analysis": "Brief summary of what you found",
  "data": {
    "contracts": [
      {
        "clientName": "string",
        "projectName": "string",
        "description": "string or null",
        "totalValue": number,
        "signedDate": "YYYY-MM-DD",
        "category": "string or null (e.g. 'Residencial', 'Comercial', 'Restaurante', 'Loja')",
        "status": "active|completed|cancelled (REQUIRED - map from Portuguese)",
        "notes": "string or null (use for additional Portuguese info)"
      }
    ],
    "receivables": [
      {
        "clientName": "string or null",
        "projectName": "string or null",
        "expectedDate": "YYYY-MM-DD",
        "amount": number,
        "invoiceNumber": "string or null",
        "category": "string or null",
        "notes": "string or null"
      }
    ],
    "expenses": [
      {
        "description": "string",
        "amount": number,
        "dueDate": "YYYY-MM-DD",
        "category": "string (e.g. 'materials', 'labor', 'equipment', 'transport', 'office')",
        "vendor": "string or null",
        "invoiceNumber": "string or null",
        "type": "operational|project|administrative (REQUIRED - map intelligently)",
        "notes": "string or null"
      }
    ]
  }
}`

      try {
        console.log('🤖 Calling Claude directly')

        let messageContent: any

        if (isVisualDocument && fileBase64) {
          // For visual documents, send the image/PDF and text prompt
          console.log(`📄 Processing visual document: ${file.type}`)
          console.log(`📏 Base64 size: ${fileBase64.length} characters`)

          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            // PDF handling - Claude expects document format, not image format
            messageContent = [
              {
                type: "text",
                text: prompt
              },
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: fileBase64
                }
              }
            ]
          } else {
            // Image handling
            messageContent = [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: file.type,
                  data: fileBase64
                }
              }
            ]
          }
        } else {
          // For text documents (CSV/Excel), send as text content in prompt
          console.log(`📄 Processing text document`)
          console.log(`📏 Content size: ${fileContent?.length || 0} characters`)

          // Simple approach - just replace the placeholder with the file content
          messageContent = prompt.replace('${fileContent}', fileContent || '')
        }

        // Simple retry mechanism for rate limiting
        let response
        let retries = 0
        const maxRetries = 2

        while (retries <= maxRetries) {
          try {
            response = await anthropic.messages.create({
              model: 'claude-sonnet-4-20250514', // Using Claude Sonnet 4 for improved performance
              max_tokens: 8192,
              messages: [{
                role: 'user',
                content: messageContent
              }]
            })
            break // Success, exit retry loop
          } catch (error: any) {
            if (error.status === 429 && retries < maxRetries) {
              retries++
              const waitTime = retries * 2000 // 2s, 4s
              console.log(`Rate limited, waiting ${waitTime}ms before retry ${retries}/${maxRetries}`)
              await new Promise(resolve => setTimeout(resolve, waitTime))
            } else {
              throw error // Re-throw if not rate limit or max retries reached
            }
          }
        }

        console.log('✅ Claude response received')
        console.log(`📏 Response length: ${JSON.stringify(response).length} characters`)

        const content = response?.content?.[0]
        if (!content || content.type !== 'text') {
          throw new Error('Unexpected response type from Claude')
        }

        console.log(`📏 Text content length: ${content.text.length} characters`)

        // Extract JSON from response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          console.log('❌ No JSON found in response. First 500 chars:', content.text.substring(0, 500))
          throw new Error('No valid JSON found in Claude response')
        }

        console.log(`📏 JSON match length: ${jsonMatch[0].length} characters`)

        const claudeResponse = JSON.parse(jsonMatch[0])

        console.log('📊 Claude found:')
        console.log(`  Contracts: ${claudeResponse.data?.contracts?.length || 0}`)
        console.log(`  Receivables: ${claudeResponse.data?.receivables?.length || 0}`)
        console.log(`  Expenses: ${claudeResponse.data?.expenses?.length || 0}`)

        // Log first few contracts to see what Claude extracted
        if (claudeResponse.data?.contracts?.length > 0) {
          console.log('\n📝 Sample contracts Claude extracted:')
          claudeResponse.data.contracts.slice(0, 5).forEach((contract: any, index: number) => {
            console.log(`  ${index + 1}. ${contract.clientName} - ${contract.projectName} - R$${contract.totalValue} - ${contract.signedDate}`)
          })
          if (claudeResponse.data.contracts.length > 5) {
            console.log(`  ... and ${claudeResponse.data.contracts.length - 5} more`)
          }
        }

        // Create data in database
        const results: CreateDataResponse = {
          contracts: { created: 0, errors: [] },
          receivables: { created: 0, errors: [] },
          expenses: { created: 0, errors: [] }
        }

        if (claudeResponse.data?.contracts?.length > 0) {
          console.log('Creating contracts...')
          results.contracts = await createContractsFromData(claudeResponse.data.contracts, user.team.id)
        }

        if (claudeResponse.data?.receivables?.length > 0) {
          console.log('Creating receivables...')
          results.receivables = await createReceivablesFromData(claudeResponse.data.receivables, user.team.id)
        }

        if (claudeResponse.data?.expenses?.length > 0) {
          console.log('Creating expenses...')
          results.expenses = await createExpensesFromData(claudeResponse.data.expenses, user.team.id)
        }

        return NextResponse.json({
          message: 'Arquivo processado com sucesso!',
          analysis: claudeResponse.analysis,
          results,
          summary: {
            contractsCreated: results.contracts.created,
            receivablesCreated: results.receivables.created,
            expensesCreated: results.expenses.created,
            contractsFound: claudeResponse.data?.contracts?.length || 0,
            receivablesFound: claudeResponse.data?.receivables?.length || 0,
            expensesFound: claudeResponse.data?.expenses?.length || 0,
            errors: [
              ...results.contracts.errors,
              ...results.receivables.errors,
              ...results.expenses.errors
            ]
          }
        })

      } catch (error) {
        console.error('Claude processing error:', error)
        return NextResponse.json({
          error: 'Erro ao processar arquivo com Claude',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
  } catch (error) {
    console.error('Setup Assistant error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}