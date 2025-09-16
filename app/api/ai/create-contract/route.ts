import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from '@langchain/openai'
import { prisma } from '@/lib/prisma'
import { findBestMatches } from '@/lib/fuzzyMatch'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-utils'

const AIContractSchema = z.object({
  message: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional(),
  pendingContract: z.object({
    clientName: z.string(),
    projectName: z.string(),
    totalValue: z.number(),
    signedDate: z.string().optional(),  // Make signedDate optional since AI might not get it
    category: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    notes: z.string().optional().nullable()
  }).optional().nullable(),  // Allow null
  isConfirming: z.boolean().optional().nullable()  // Allow null
})

// Helper function to generate unique project name
async function generateUniqueProjectName(baseName: string, clientName: string, teamId: string): Promise<string> {
  const existingContracts = await prisma.contract.findMany({
    where: {
      teamId,
      clientName: clientName,
      projectName: {
        startsWith: baseName
      }
    },
    select: {
      projectName: true
    }
  })

  if (existingContracts.length === 0) {
    return baseName
  }

  // Extract numbers from existing project names
  const numbers = existingContracts.map(c => {
    const match = c.projectName.match(/\s+(\d+)$/)
    return match ? parseInt(match[1]) : 1
  })

  // Find the next available number
  const maxNumber = Math.max(...numbers, 1)
  return `${baseName} ${maxNumber + 1}`
}

export async function POST(request: NextRequest) {
  console.log('=== AI Contract Route Called ===')
  try {
    const { user, teamId } = await requireAuth()
    console.log('🔍 AI CONTRACT DEBUG:', {
      userId: user.id,
      userEmail: user.email,
      teamId,
      teamName: user.team?.name
    })

    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    const { message, history, pendingContract, isConfirming } = AIContractSchema.parse(body)
    console.log('Parsed params:', { message, history: history?.length || 0, pendingContract, isConfirming })

    // If user is confirming a pending contract, create it directly
    if (isConfirming && pendingContract) {
      // Check if we have all required fields
      if (!pendingContract.signedDate) {
        return NextResponse.json({
          success: true,
          action: 'clarify',
          question: 'Qual é a data de assinatura do contrato? Por favor, informe a data.',
          context: 'Falta a data de assinatura'
        })
      }

      const contract = await prisma.contract.create({
        data: {
          ...pendingContract,
          teamId,
          signedDate: new Date(pendingContract.signedDate),
          status: pendingContract.status || 'active',
        }
      })

      console.log('✅ AI CONTRACT CREATED:', {
        contractId: contract.id,
        assignedTeamId: contract.teamId,
        clientName: contract.clientName,
        projectName: contract.projectName
      })

      return NextResponse.json({
        success: true,
        action: 'created',
        contract,
        confirmation: 'Contrato criado com sucesso! ✅'
      })
    }

    // Check if user is responding to a duplicate question
    if (pendingContract && history && history.length > 0) {
      const lastAssistantMessage = history.filter(h => h.role === 'assistant').pop()
      if (lastAssistantMessage && lastAssistantMessage.content.includes('Já existe um contrato')) {
        // User is responding to duplicate question
        const wantsNew = message.toLowerCase().includes('2') ||
                        message.toLowerCase().includes('novo') ||
                        message.toLowerCase().includes('criar')

        if (wantsNew) {
          // Generate unique project name
          const uniqueProjectName = await generateUniqueProjectName(
            pendingContract.projectName,
            pendingContract.clientName,
            teamId
          )

          const updatedContract = { ...pendingContract, projectName: uniqueProjectName }

          return NextResponse.json({
            success: true,
            action: 'confirm',
            contract: updatedContract,
            confirmation: `Criando novo contrato com nome único:\n\n• Cliente: ${updatedContract.clientName}\n• Projeto: ${updatedContract.projectName}\n• Valor: R$ ${updatedContract.totalValue.toLocaleString('pt-BR')}\n${updatedContract.signedDate ? `• Data: ${new Date(updatedContract.signedDate).toLocaleDateString('pt-BR')}` : '• Data: [FALTA INFORMAR]'}\n• Categoria: ${updatedContract.category || 'N/A'}\n• Descrição: ${updatedContract.description || 'N/A'}\n\nDigite 'confirmar' para criar o contrato.`,
            inferences: []
          })
        }
      }
    }

    // Check if we have a pending contract and the user might be providing missing date
    if (pendingContract && !pendingContract.signedDate && !isConfirming) {
      // Check if the message looks like a date
      const datePatterns = [
        /\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/, // 01/04, 01-04, 01/04/2024
        /\d{1,2}\s*(?:de\s*)?\w+/i, // 01 abril, 1 de abril
        /(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i
      ]

      const looksLikeDate = datePatterns.some(pattern => pattern.test(message))

      if (looksLikeDate) {
        // Parse the date and update the pending contract
        let parsedDate: string | null = null

        // Try to parse different date formats
        const currentYear = new Date().getFullYear()

        // Handle "01/Abril" or "01 de abril" format
        const monthNames: Record<string, number> = {
          'janeiro': 1, 'jan': 1,
          'fevereiro': 2, 'fev': 2,
          'março': 3, 'mar': 3,
          'abril': 4, 'abr': 4,
          'maio': 5, 'mai': 5,
          'junho': 6, 'jun': 6,
          'julho': 7, 'jul': 7,
          'agosto': 8, 'ago': 8,
          'setembro': 9, 'set': 9,
          'outubro': 10, 'out': 10,
          'novembro': 11, 'nov': 11,
          'dezembro': 12, 'dez': 12
        }

        // Try to extract day and month
        const match = message.match(/(\d{1,2})[\/\-\s]+(?:de\s+)?(\w+)/i)
        if (match) {
          const day = parseInt(match[1])
          const monthStr = match[2].toLowerCase()
          const month = monthNames[monthStr]

          if (month) {
            parsedDate = `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
          }
        }

        // Try DD/MM format
        if (!parsedDate) {
          const ddmmMatch = message.match(/(\d{1,2})[\/\-](\d{1,2})/)
          if (ddmmMatch) {
            const day = parseInt(ddmmMatch[1])
            const month = parseInt(ddmmMatch[2])
            parsedDate = `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
          }
        }

        if (parsedDate) {
          // Update the pending contract with the date and ask for final confirmation
          const updatedContract = { ...pendingContract, signedDate: parsedDate }

          return NextResponse.json({
            success: true,
            action: 'confirm',
            contract: updatedContract,
            confirmation: `Dados completos! Pode confirmar?\n\n• Cliente: ${updatedContract.clientName}\n• Projeto: ${updatedContract.projectName}\n• Valor: R$ ${updatedContract.totalValue.toLocaleString('pt-BR')}\n• Data: ${new Date(parsedDate).toLocaleDateString('pt-BR')}\n• Categoria: ${updatedContract.category || 'N/A'}\n• Descrição: ${updatedContract.description || 'N/A'}\n\nDigite 'confirmar' para criar o contrato.`,
            inferences: []
          })
        }
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const llm = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY,
    })

    // Get existing clients and projects for reference - filtered by team
    const existingContracts = await prisma.contract.findMany({
      where: {
        teamId
      },
      select: {
        id: true,
        clientName: true,
        projectName: true,
        category: true,
        totalValue: true,
        status: true,
      }
    })

    const uniqueClients = [...new Set(existingContracts.map(c => c.clientName))]
    const uniqueProjects = [...new Set(existingContracts.map(c => c.projectName))]
    const uniqueCategories = [...new Set(existingContracts.filter(c => c.category).map(c => c.category))]

    // Build conversation history
    const conversationHistory = history ? history.map(h =>
      `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${h.content}`
    ).join('\n') : ''

    // Find fuzzy matches for client names to help with duplicates
    const allText = `${message} ${conversationHistory}`
    const clientMatches = findBestMatches(allText, uniqueClients, 0.6, 3)
    const projectMatches = findBestMatches(allText, uniqueProjects, 0.6, 3)

    const fuzzyInfo = []
    if (clientMatches.length > 0) {
      fuzzyInfo.push(`Clientes similares: ${clientMatches.map(m => `${m.text} (${(m.similarity * 100).toFixed(0)}%)`).join(', ')}`)
    }
    if (projectMatches.length > 0) {
      fuzzyInfo.push(`Projetos similares: ${projectMatches.map(m => `${m.text} (${(m.similarity * 100).toFixed(0)}%)`).join(', ')}`)
    }
    const fuzzyMatchInfo = fuzzyInfo.length > 0 ? `\n\n${fuzzyInfo.join('\n')}` : ''

    const systemPrompt = `Você é um assistente para criar contratos de arquitetura. Analise a mensagem do usuário e responda em JSON válido.

Mensagem atual: ${message}
${conversationHistory ? `\nContexto da conversa:\n${conversationHistory}` : ''}

CONTRATOS EXISTENTES:
${existingContracts.map(c => `ID: ${c.id} | Cliente: ${c.clientName} | Projeto: ${c.projectName} | Valor: R$ ${c.totalValue?.toLocaleString('pt-BR') || '0'} | Status: ${c.status || 'N/A'}`).join('\n') || 'Nenhum contrato encontrado'}${fuzzyMatchInfo}

INSTRUÇÕES IMPORTANTES:
1. Se a mensagem contém informações para um NOVO CONTRATO, use "action": "confirm"
2. Se a mensagem menciona EDITAR/ALTERAR/MODIFICAR algo existente, use "action": "edit"
3. Se faltam informações essenciais (clientName, projectName, totalValue, ou signedDate), use "action": "clarify"
4. NUNCA peça informações que o usuário já forneceu anteriormente na conversa
5. Se o usuário está respondendo a uma pergunta sua sobre data, tente entender a resposta no contexto
6. Mensagens como "01/Abril", "1 de maio", "15/03" são respostas de DATA quando você perguntou por uma data

DETECTAR DUPLICATAS:
- Se o cliente E projeto são EXATAMENTE iguais a um contrato existente, pergunte se quer editar ou criar novo
- Use "action": "clarify" com pergunta: "Já existe um contrato com este cliente e projeto. Você quer:\n1. Editar o contrato existente\n2. Criar um novo contrato (será adicionado '2' ao nome do projeto)"
- Só assuma edição se o usuário EXPLICITAMENTE usar palavras como "editar", "alterar", "modificar"

DETECTAR EDIÇÃO (apenas com palavras explícitas):
- Palavras: "editar", "alterar", "modificar", "mudar", "atualizar", "corrigir"
- Pedidos para "mudar valor para X", "alterar data para Y"
- NÃO assuma edição apenas por nome similar - sempre pergunte primeiro

Para NOVO CONTRATO, você precisa inferir/extrair:
- clientName: nomes de pessoas mencionados (ex: "Mila e Lucas")
- projectName: combine com tipo se mencionado (ex: "Projeto Residencial Mila e Lucas")
- totalValue: converta valores (ex: "16 mil" = 16000)
- signedDate: converta datas (ex: "1 de agosto de 2023" = "2023-08-01", "hoje" = "${new Date().toISOString().split('T')[0]}", "ontem" = "${new Date(Date.now() - 86400000).toISOString().split('T')[0]}")
- category: identifique tipo (residencial/comercial/restaurante/loja)

DATAS RELATIVAS:
- "hoje" = "${new Date().toISOString().split('T')[0]}"
- "ontem" = "${new Date(Date.now() - 86400000).toISOString().split('T')[0]}"
- "anteontem" = "${new Date(Date.now() - 172800000).toISOString().split('T')[0]}"

EXEMPLO para "Projeto Mila e Lucas, residencial, 70m2, data 1 de agosto de 2023, 16 mil":
{
  "action": "confirm",
  "contract": {
    "clientName": "Mila e Lucas",
    "projectName": "Projeto Residencial Mila e Lucas",
    "totalValue": 16000,
    "signedDate": "2023-08-01",
    "category": "Residencial",
    "description": "Projeto residencial de 70m2",
    "status": "active",
    "notes": null
  },
  "inferences": [],
  "confirmation": "Pode confirmar se os dados estão corretos?\n\n• Cliente: Mila e Lucas\n• Projeto: Projeto Residencial Mila e Lucas\n• Valor: R$ 16.000\n• Data: 01/08/2023\n• Categoria: Residencial\n• Descrição: Projeto residencial de 70m2\n\nDigite 'confirmar' para criar o contrato."
}

EXEMPLO para "Projeto João, comercial, 32k" (faltando data):
{
  "action": "clarify",
  "question": "Qual é a data de assinatura do contrato?",
  "context": "Entendi: Cliente João, projeto comercial, valor R$ 32.000"
}

EXEMPLO para projeto duplicado:
{
  "action": "clarify",
  "question": "Já existe um contrato com este cliente e projeto. Você quer:\n1. Editar o contrato existente\n2. Criar um novo contrato (será adicionado '2' ao nome do projeto)",
  "context": "Contrato existente encontrado: João e Maria - Projeto Residencial João e Maria"
}

Para EDITAR contrato existente:
{
  "action": "edit",
  "contractId": "id_do_contrato_encontrado",
  "updates": {
    "clientName": "novo_nome_se_alterado",
    "projectName": "novo_projeto_se_alterado",
    "totalValue": novo_valor_se_alterado,
    "signedDate": "nova_data_se_alterada",
    "category": "nova_categoria_se_alterada",
    "description": "nova_descrição_se_alterada",
    "status": "novo_status_se_alterado",
    "notes": "novas_notas_se_alteradas"
  },
  "confirmation": "Confirmar alteração: [detalhe das mudanças]"
}

Para ESCLARECER use:
{
  "action": "clarify",
  "question": "Pergunta específica sobre o que falta",
  "context": "O que já entendi"
}

IMPORTANTE: Responda APENAS com JSON válido, sem texto adicional.`

    const response = await llm.invoke([{ role: 'user', content: systemPrompt }])
    let result
    try {
      const responseText = response.content.toString()
      console.log('Contract AI Response:', responseText) // Debug log

      // Clean the response text - remove any markdown formatting or extra text
      let cleanedResponse = responseText.trim()

      // Find JSON content between ```json and ``` if present
      const jsonMatch = cleanedResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
      if (jsonMatch) {
        cleanedResponse = jsonMatch[1]
      }

      // Find the first complete JSON object if response contains extra text
      const jsonStart = cleanedResponse.indexOf('{')
      const jsonEnd = cleanedResponse.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1)
      }

      // Try to parse - if it fails due to unescaped newlines, try to fix them
      try {
        result = JSON.parse(cleanedResponse)
      } catch (e) {
        // Attempt to fix common JSON issues like unescaped newlines in strings
        // This regex finds string values and properly escapes newlines
        const fixedResponse = cleanedResponse.replace(
          /"([^"\\]*(\\.[^"\\]*)*)"/g,
          (match) => {
            // Replace actual newlines with \n escape sequence
            return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r')
          }
        )
        result = JSON.parse(fixedResponse)
      }
    } catch (parseError) {
      console.error('JSON Parse Error in Contract AI:', parseError)
      console.error('Raw response:', response.content.toString())
      return NextResponse.json({
        success: true,
        action: 'clarify',
        question: 'Desculpe, houve um erro interno. Pode reformular sua solicitação? Diga se quer criar um novo contrato ou editar um existente.',
        context: 'Erro de processamento'
      })
    }

    // Validate result structure
    if (!result || typeof result !== 'object') {
      console.error('Invalid result object:', result)
      return NextResponse.json({
        success: true,
        action: 'clarify',
        question: 'Não consegui processar sua mensagem. Você quer criar um novo contrato ou editar um existente? Para um novo contrato, me informe: cliente, projeto, valor e data.',
        context: 'Resposta inválida'
      })
    }

    if (!result.action || typeof result.action !== 'string') {
      console.error('Missing or invalid action in result:', result)
      return NextResponse.json({
        success: true,
        action: 'clarify',
        question: 'Não consegui entender sua solicitação. Você quer criar um novo contrato ou editar um existente? Se for novo, me diga cliente, projeto, valor e data.',
        context: 'Ação indefinida'
      })
    }

    // Ensure action is one of the expected values
    const validActions = ['confirm', 'clarify', 'edit', 'created', 'edited']
    if (!validActions.includes(result.action)) {
      console.error('Unknown action received:', result.action)
      return NextResponse.json({
        success: true,
        action: 'clarify',
        question: 'Recebi uma ação desconhecida. Por favor, diga se quer criar um novo contrato ou editar um existente.',
        context: `Ação desconhecida: ${result.action}`
      })
    }

    if (result.action === 'confirm') {
      // Return contract details for user confirmation - don't create yet
      const response = {
        success: true,
        action: 'confirm',
        contract: result.contract,
        confirmation: result.confirmation,
        inferences: result.inferences || []
      }
      console.log('Returning confirm response:', JSON.stringify(response, null, 2))
      return NextResponse.json(response)
    } else if (result.action === 'edit') {
      // Update the existing contract
      const updates: any = { ...result.updates }
      if (updates.signedDate) {
        updates.signedDate = new Date(updates.signedDate)
      }

      const updatedContract = await prisma.contract.update({
        where: {
          id: result.contractId,
          teamId // Ensure user can only edit contracts from their team
        },
        data: updates
      })

      return NextResponse.json({
        success: true,
        action: 'edited',
        contract: updatedContract,
        confirmation: result.confirmation || 'Contrato atualizado com sucesso!'
      })
    } else if (result.action === 'clarify') {
      // Need clarification
      return NextResponse.json({
        success: true,
        action: 'clarify',
        question: result.question || 'Por favor, forneça mais informações.',
        context: result.context || ''
      })
    } else {
      // Fallback for any unexpected actions
      console.error('Unhandled action type:', result.action)
      return NextResponse.json({
        success: true,
        action: 'clarify',
        question: 'Não consegui processar sua solicitação. Você quer criar um novo contrato ou editar um existente?',
        context: `Ação não tratada: ${result.action}`
      })
    }
  } catch (error) {
    console.error('AI Contract creation error:', error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: 'Unauthorized - Authentication required' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      console.log('Zod validation error:', error.errors)
      const errorResponse = { error: 'Invalid request format' }
      console.log('Returning error response:', errorResponse)
      return NextResponse.json(errorResponse, { status: 400 })
    }
    const errorResponse = { error: 'Falha ao processar solicitação' }
    console.log('Returning 500 error response:', errorResponse)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}