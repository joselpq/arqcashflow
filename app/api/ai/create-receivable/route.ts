import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from '@langchain/openai'
import { prisma } from '@/lib/prisma'
import { findContractMatches } from '@/lib/fuzzyMatch'
import { supervisorValidateReceivable } from '@/lib/supervisor'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'

// Helper function for date display to avoid timezone conversion
function formatDateForDisplay(date: string | Date): string {
  if (!date) return ''
  if (typeof date === 'string' && date.includes('T')) {
    // Extract date part from ISO string and format manually to avoid timezone conversion
    const datePart = date.split('T')[0]
    const [year, month, day] = datePart.split('-')
    return `${day}/${month}/${year}`
  }
  // For date strings like "YYYY-MM-DD", parse manually to avoid timezone issues
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-')
    return `${day}/${month}/${year}`
  }
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR')
}

const AIReceivableSchema = z.object({
  message: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional(),
  pendingReceivable: z.any().optional(),
  isConfirming: z.boolean().optional()
})

// Helper function to detect affirmative responses in Portuguese
function isAffirmativeResponse(message: string): boolean {
  const affirmativeWords = [
    'sim', 'yes', 'ok', 'okay', 'confirmo', 'confirmar', 'correto', 'certo',
    'perfeito', 'exato', 'isso', 'concordo', 'aceito', 'pode', 'vai', 'vamos',
    'tudo certo', 'está certo', 'beleza', 'pode criar', 'criar', 'confirma'
  ]

  const normalized = message.toLowerCase().trim()
  return affirmativeWords.some(word => normalized.includes(word))
}

export async function POST(request: NextRequest) {
  try {
    const { user, teamId } = await requireAuth()
    console.log('🔍 AI RECEIVABLE DEBUG:', {
      userId: user.id,
      userEmail: user.email,
      teamId,
      teamName: user.team?.name
    })

    const body = await request.json()
    const { message, history, pendingReceivable, isConfirming } = AIReceivableSchema.parse(body)

    // If user is confirming a pending receivable, check if it's an affirmative response
    if (isConfirming && pendingReceivable) {
      if (!isAffirmativeResponse(message)) {
        // User is not confirming, treat as cancellation or new request
        return NextResponse.json({
          success: true,
          action: 'clarify',
          question: '😅 Entendi que você não quer criar esse recebível. Em que posso ajudar agora?'
        })
      }

      // User confirmed, proceed with creation
      const alerts = await supervisorValidateReceivable(pendingReceivable, pendingReceivable.contractId, teamId)

      const receivable = await prisma.receivable.create({
        data: {
          ...pendingReceivable,
          expectedDate: new Date(pendingReceivable.expectedDate),
          status: 'pending'
        },
        include: {
          contract: true
        }
      })

      // Note: Alert storage is handled on the client side

      return NextResponse.json({
        success: true,
        action: 'created',
        receivable,
        message: 'Conta a receber criada com sucesso!',
        alerts: alerts.length > 0 ? alerts : undefined
      })
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const llm = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY,
    })

    // Get existing contracts for reference - filtered by team
    const contracts = await prisma.contract.findMany({
      select: {
        id: true,
        clientName: true,
        projectName: true,
        category: true,
      },
      where: {
        teamId,
        status: 'active'
      }
    })

    // Build conversation history
    const conversationHistory = history ? history.map(h =>
      `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${h.content}`
    ).join('\n') : ''

    const contractsInfo = contracts.map(c =>
      `ID: ${c.id} | Cliente: ${c.clientName} | Projeto: ${c.projectName}${c.category ? ` | Categoria: ${c.category}` : ''}`
    ).join('\n')

    // Find potential fuzzy matches for better context
    const allText = `${message} ${conversationHistory}`
    const fuzzyMatches = findContractMatches(allText, contracts, 0.3)
    const fuzzyMatchInfo = fuzzyMatches.length > 0
      ? `\n\nPossíveis correspondências fuzzy no texto:\n${fuzzyMatches.map(m =>
          `- ${m.contract.clientName} / ${m.contract.projectName} (${m.matchField}: ${(m.similarity * 100).toFixed(0)}% similar)`
        ).join('\n')}`
      : ''

    const systemPrompt = `Você é um assistente especializado em criar contas a receber para um escritório de arquitetura no Brasil.

Contratos ativos no sistema:
${contractsInfo || 'Nenhum contrato ativo encontrado'}${fuzzyMatchInfo}

Categorias de recebíveis: projeto, obra, RT (ou personalizada)

${conversationHistory ? `Conversa anterior:\n${conversationHistory}\n` : ''}

Mensagem atual do usuário: ${message}

EXEMPLOS de mensagens do usuário:
- "2500 a receber 25/11 da loja Leo Madeiras, RT do projeto dina claire"
- "Receber 5000 dia 15 do próximo mês do João Silva, projeto residencial"
- "3 parcelas de 1000 do restaurante Sabor, primeira dia 10"

TAREFA: Analise a mensagem e determine se o usuário quer CRIAR uma nova conta a receber ou EDITAR uma existente.

INDICADORES DE EDIÇÃO:
- Palavras como "alterar", "modificar", "mudar", "editar", "atualizar", "corrigir"
- Referência a recebível existente ("aquele de 2500", "o da loja Leo", etc.)
- Mencionar mudança de valor, data, status

INDICADORES DE CRIAÇÃO:
- Palavras como "nova", "criar", "adicionar", "receber"
- Valores e datas específicas para novos recebíveis
- Parcelas ou múltiplos recebíveis

Informações OBRIGATÓRIAS para CRIAR:
1. Contrato associado (identificar pelo cliente/projeto mencionado)
2. Valor (em R$)
3. Data prevista de recebimento

Informações OPCIONAIS:
- Categoria (projeto, obra, RT, ou outra)
- Número da nota fiscal
- Observações

REGRAS IMPORTANTES:
- Use fuzzy matching para identificar contratos (aceite variações de maiúsculas/minúsculas, acentos, abreviações)
- Se mencionar parcelas, crie múltiplos recebíveis
- Para datas relativas (próximo mês, dia 15, etc), calcule corretamente
- Se não encontrar contrato correspondente, pergunte para esclarecer
- Se houver ambiguidade sobre qual contrato, liste opções
- SEMPRE retorne JSON válido
- Se faltarem informações obrigatórias (valor, data, contrato), pergunte especificamente

Hoje é ${new Date().toISOString().split('T')[0]}

RESPONDA em formato JSON:

Se for CRIAR e tiver informações suficientes:
{
  "action": "create",
  "receivables": [
    {
      "contractId": "id_do_contrato",
      "amount": 0000.00,
      "expectedDate": "YYYY-MM-DD",
      "category": "categoria ou null",
      "invoiceNumber": "número ou null",
      "notes": "observações ou null"
    }
  ],
  "confirmation": "Mensagem confirmando o(s) recebível(is) que será(ão) criado(s)",
  "contractInfo": "Cliente: X, Projeto: Y"
}

Se for EDITAR um recebível existente:
{
  "action": "edit_suggestion",
  "message": "Identifiquei que você quer editar uma conta a receber existente. Para editá-la:\n1. Encontre o recebível na lista à direita\n2. Clique no botão 'Editar'\n3. Faça as alterações desejadas\n\nOu me diga exatamente qual recebível (valor/cliente/data) e o que quer alterar com mais detalhes."
}

Se PRECISAR de esclarecimentos:
{
  "action": "clarify",
  "question": "Pergunta específica para esclarecer",
  "context": "O que foi entendido até agora",
  "suggestions": ["opção 1", "opção 2"] // se houver opções para o usuário escolher
}

Se NÃO ENCONTRAR contrato correspondente:
{
  "action": "no_contract",
  "message": "Mensagem explicando que não foi encontrado contrato",
  "suggestions": ["contratos similares se houver"]
}`

    const response = await llm.invoke([{ role: 'user', content: systemPrompt }])
    let result
    try {
      const responseText = response.content.toString()
      console.log('AI Response:', responseText) // Debug log
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      console.error('Raw response:', response.content.toString())
      return NextResponse.json({
        success: true,
        action: 'clarify',
        question: 'Desculpe, houve um erro interno. Pode reformular sua solicitação de forma mais específica? Por exemplo: "valor a receber, data prevista, de qual cliente/projeto"',
        context: 'Erro de processamento interno'
      })
    }

    // Validate result structure
    if (!result || !result.action) {
      return NextResponse.json({
        success: true,
        action: 'clarify',
        question: 'Não consegui entender sua solicitação. Pode me dizer especificamente qual valor você precisa receber, de qual cliente/projeto e para qual data?',
        context: 'Informações insuficientes'
      })
    }

    if (result.action === 'create') {
      // Instead of creating immediately, return confirmation request
      const receivableData = result.receivables[0] // Take first receivable for confirmation

      return NextResponse.json({
        success: true,
        action: 'confirm',
        pendingReceivable: receivableData,
        question: `${result.confirmation}\n\n📋 **Por favor, confirme se os dados estão corretos:**\n• Valor: R$${receivableData.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n• Data esperada: ${formatDateForDisplay(receivableData.expectedDate)}\n• Projeto: ${result.contractInfo}\n\n💬 *Pode confirmar se está tudo certo? Qualquer confirmação sua e eu criarei o recebível!*`,
        contractInfo: result.contractInfo
      })
    } else if (result.action === 'no_contract') {
      return NextResponse.json({
        success: true,
        action: 'no_contract',
        message: result.message,
        suggestions: result.suggestions || []
      })
    } else {
      // Need clarification
      return NextResponse.json({
        success: true,
        action: 'clarify',
        question: result.question,
        context: result.context,
        suggestions: result.suggestions || []
      })
    }
  } catch (error) {
    console.error('AI Receivable creation error:', error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized - Authentication required' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Falha ao processar solicitação' },
      { status: 500 }
    )
  }
}