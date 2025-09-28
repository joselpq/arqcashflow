/**
 * Debug Claude extraction to understand duplicates
 */

import * as XLSX from 'xlsx'
import fs from 'fs'
import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'

dotenv.config()

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
})

async function testClaudeExtraction() {
  console.log('🔍 Testing Claude extraction from Testando.xlsx')

  // Read and process Excel file
  const buffer = fs.readFileSync('Testando.xlsx')
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const fileContent = XLSX.utils.sheet_to_csv(worksheet)

  console.log('📄 First 10 lines of CSV conversion:')
  console.log(fileContent.split('\n').slice(0, 10).join('\n'))

  // Use the same prompt as our service
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
        "category": "string or null (e.g. 'Residencial', 'Comercial', 'Restaurante', 'Loja')",
        "status": "active|completed|cancelled (REQUIRED - map from Portuguese)",
        "notes": "string or null (use for additional Portuguese info)"
      }
    ],
    "receivables": [],
    "expenses": []
  }
}`

  try {
    console.log('\n🤖 Calling Claude for extraction...')

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.log('❌ No JSON found in response')
      return
    }

    const claudeResponse = JSON.parse(jsonMatch[0])

    console.log('\n📊 Claude extraction results:')
    console.log(`Found ${claudeResponse.data.contracts.length} contracts`)

    // Analyze for duplicates
    const clientProjectPairs: Record<string, number> = {}
    const duplicates: any[] = []

    claudeResponse.data.contracts.forEach((contract: any, index: number) => {
      const key = `${contract.clientName}_${contract.projectName}`

      if (clientProjectPairs[key]) {
        duplicates.push({
          original: clientProjectPairs[key],
          duplicate: index + 1,
          key,
          contract
        })
      } else {
        clientProjectPairs[key] = index + 1
      }
    })

    if (duplicates.length > 0) {
      console.log('\n⚠️ DUPLICATES FOUND IN CLAUDE EXTRACTION:')
      duplicates.forEach(dup => {
        console.log(`  "${dup.contract.clientName}" + "${dup.contract.projectName}" (appears multiple times)`)
      })
    } else {
      console.log('\n✅ No duplicates found in Claude extraction')
    }

    console.log('\n📋 All extracted contracts:')
    claudeResponse.data.contracts.forEach((contract: any, i: number) => {
      console.log(`  ${i + 1}. "${contract.clientName}" + "${contract.projectName}" - R$${contract.totalValue}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testClaudeExtraction()