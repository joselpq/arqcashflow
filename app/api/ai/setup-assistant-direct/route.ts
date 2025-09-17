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

      console.log('📁 Processing file with DIRECT Claude approach:', file.name)

      // Convert file to text content for Claude
      const buffer = Buffer.from(await file.arrayBuffer())
      let fileContent = ''

      if (file.name.endsWith('.csv')) {
        fileContent = buffer.toString('utf-8')
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        fileContent = XLSX.utils.sheet_to_csv(worksheet)
      } else {
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
      }

      // Direct Claude prompt - let Claude do ALL the work
      const prompt = `You are a data extraction expert for a Brazilian architecture firm's cashflow system.

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

5. Detect data types by looking at the headers and content:
   - Contracts: have client/project names, total values, and dates
   - Receivables: have expected dates and amounts to receive
   - Expenses: have descriptions, amounts, due dates, and vendors

6. If a CSV has multiple sections (like contracts section, then receivables section, then expenses section), detect ALL of them

7. EXTRACT ALL ROWS - if there are 37 contracts in the data, return all 37, not just a sample

FILE CONTENT:
${fileContent}

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
        "category": "string or null",
        "status": "string or null",
        "notes": "string or null"
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
        "category": "string",
        "vendor": "string or null",
        "invoiceNumber": "string or null",
        "type": "operational|project|administrative",
        "notes": "string or null"
      }
    ]
  }
}`

      try {
        console.log('🤖 Calling Claude directly with full file content')
        console.log(`📏 Content size: ${fileContent.length} characters`)

        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 8192, // Maximum allowed
          messages: [{
            role: 'user',
            content: prompt
          }]
        })

        console.log('✅ Claude response received')
        console.log(`📏 Response length: ${JSON.stringify(response).length} characters`)

        const content = response.content[0]
        if (content.type !== 'text') {
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