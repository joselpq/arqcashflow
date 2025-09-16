import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { requireAuth } from '@/lib/auth-utils'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { user, teamId } = await requireAuth()
    console.log('🔍 AI EXPENSE DEBUG:', {
      userId: user.id,
      userEmail: user.email,
      teamId,
      teamName: user.team?.name
    })

    const { message, history = [], pendingExpense = null, isConfirming = false } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Get existing expenses for context - filtered by team
    const expenses = await prisma.expense.findMany({
      where: {
        teamId
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        contract: {
          select: {
            clientName: true,
            projectName: true,
          },
        },
      },
    })

    // Get contracts for linking expenses - filtered by team
    const contracts = await prisma.contract.findMany({
      where: {
        teamId
      },
      select: {
        id: true,
        clientName: true,
        projectName: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const systemPrompt = `You are an AI assistant helping to create expense records in Portuguese for an architecture firm.

Current date: ${new Date().toLocaleDateString('pt-BR')}

Existing recent expenses (for context):
${expenses.map(e => `- ${e.description} (${e.vendor || 'sem fornecedor'}) - R$${e.amount} - ${e.category}`).join('\n')}

Available projects (for linking):
${contracts.map(c => `- ${c.clientName} - ${c.projectName} (ID: ${c.id})`).join('\n')}

Common expense categories: materials, labor, equipment, transport, office, software, utilities, rent, insurance, marketing, professional-services, other

Your task is to extract expense information from natural language and create expense records.

Parse values like:
- "5k" or "5 mil" → 5000
- "2.5k" or "2,5 mil" → 2500
- "500" → 500

Parse dates like:
- "hoje" → today's date
- "amanhã" → tomorrow
- "1/abril" or "01/04" → April 1st of current year
- "15/3" → March 15th
- "vencimento em 10 dias" → 10 days from today

When user confirms (says "sim", "ok", "confirmar", etc.) and you have a pendingExpense, create it.

Always respond with a JSON object in one of these formats:

1. When you have all required information:
{
  "action": "confirm",
  "expense": {
    "description": "string",
    "amount": number,
    "dueDate": "YYYY-MM-DD",
    "category": "string",
    "vendor": "string or null",
    "invoiceNumber": "string or null",
    "type": "operational|project|administrative",
    "contractId": "string or null",
    "notes": "string or null"
  },
  "confirmation": "Message asking user to confirm the expense details in Portuguese"
}

2. When user confirms a pending expense:
{
  "action": "created",
  "confirmation": "Despesa criada com sucesso!"
}

3. When you need more information:
{
  "action": "clarify",
  "question": "Question in Portuguese asking for missing information"
}

4. When parsing errors occur:
{
  "action": "error",
  "message": "Error message in Portuguese"
}`

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history,
      { role: 'user' as const, content: message }
    ]

    // If user is confirming and we have a pending expense
    if (isConfirming && pendingExpense) {
      const lowerMessage = message.toLowerCase()
      if (lowerMessage.includes('sim') || lowerMessage.includes('ok') ||
          lowerMessage.includes('confirma') || lowerMessage === 's') {

        try {
          // Validate required fields
          if (!pendingExpense.description || !pendingExpense.amount || !pendingExpense.dueDate || !pendingExpense.category) {
            return NextResponse.json({
              action: 'error',
              message: 'Dados incompletos. Descrição, valor, data de vencimento e categoria são obrigatórios.'
            })
          }

          // Validate and format the pending expense data
          const expenseData = {
            teamId,
            description: pendingExpense.description,
            amount: Number(pendingExpense.amount),
            dueDate: new Date(pendingExpense.dueDate),
            category: pendingExpense.category,
            contractId: pendingExpense.contractId || null,
            vendor: pendingExpense.vendor || null,
            invoiceNumber: pendingExpense.invoiceNumber || null,
            type: pendingExpense.type || 'operational',
            notes: pendingExpense.notes || null,
          }

          // Validate that amount is a valid number
          if (isNaN(expenseData.amount) || expenseData.amount <= 0) {
            return NextResponse.json({
              action: 'error',
              message: 'Valor deve ser um número positivo válido.'
            })
          }

          // Validate that dueDate is a valid date
          if (isNaN(expenseData.dueDate.getTime())) {
            return NextResponse.json({
              action: 'error',
              message: 'Data de vencimento inválida.'
            })
          }

          // Create the expense with validated data
          await prisma.expense.create({
            data: expenseData
          })

          return NextResponse.json({
            action: 'created',
            confirmation: '✅ Despesa criada com sucesso!'
          })
        } catch (createError) {
          console.error('Error creating expense:', createError)
          return NextResponse.json({
            action: 'error',
            message: 'Erro ao criar despesa. Verifique se todos os dados estão corretos.'
          })
        }
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    return NextResponse.json(result)

  } catch (error) {
    console.error('AI expense creation error:', error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized - Authentication required' }, { status: 401 })
    }
    return NextResponse.json(
      {
        action: 'error',
        message: 'Erro ao processar solicitação. Tente novamente.'
      },
      { status: 500 }
    )
  }
}