import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface SupervisorAlert {
  type: 'duplicate' | 'value' | 'date' | 'consistency' | 'unusual' | 'relationship'
  message: string
  details?: string
  suggestions?: string[]
  entityInfo?: {
    name: string
    details: string
    editUrl?: string
  }
}

// Helper function to validate and normalize alerts from AI responses
function normalizeAlerts(alerts: any[], entityInfo?: { name: string; details: string; editUrl?: string }): SupervisorAlert[] {
  if (!Array.isArray(alerts)) return []

  return alerts.map(alert => ({
    type: alert.type || 'unusual',
    message: alert.message || 'Data anomaly detected',
    details: alert.details,
    suggestions: Array.isArray(alert.suggestions) ? alert.suggestions : [],
    entityInfo: entityInfo
  }))
}

export interface SupervisorContext {
  contracts: any[]
  contractStats: {
    totalCount: number
    averageValue: number
    medianValue: number
    valueRange: { min: number, max: number }
    statusDistribution: Record<string, number>
    categoryDistribution: Record<string, number>
    clientFrequency: Record<string, number>
    dateRange: { earliest: string, latest: string }
  }
  receivables: any[]
  receivableStats: {
    totalCount: number
    averageAmount: number
    statusDistribution: Record<string, number>
    overdueCount: number
    categoryDistribution: Record<string, number>
  }
  expenses: any[]
  expenseStats: {
    totalCount: number
    averageAmount: number
    statusDistribution: Record<string, number>
    typeDistribution: Record<string, number>
    categoryDistribution: Record<string, number>
    vendorFrequency: Record<string, number>
  }
  budgets: any[]
}

async function buildSupervisorContext(teamId: string): Promise<SupervisorContext> {
  // Fetch all data filtered by team
  const contracts = await prisma.contract.findMany({
    where: { teamId },
    include: { receivables: true, expenses: true },
    orderBy: { createdAt: 'desc' }
  })

  const receivables = await prisma.receivable.findMany({
    where: {
      contract: {
        teamId
      }
    },
    include: { contract: true },
    orderBy: { createdAt: 'desc' }
  })

  const expenses = await prisma.expense.findMany({
    where: { teamId },
    include: { contract: true },
    orderBy: { createdAt: 'desc' }
  })

  const budgets = await prisma.budget.findMany({
    where: { teamId },
    include: { contract: true }
  })

  // Calculate contract statistics
  const contractValues = contracts.map(c => c.totalValue).filter(v => v > 0)
  const contractStats = {
    totalCount: contracts.length,
    averageValue: contractValues.length ? contractValues.reduce((a, b) => a + b, 0) / contractValues.length : 0,
    medianValue: contractValues.length ? contractValues.sort((a, b) => a - b)[Math.floor(contractValues.length / 2)] : 0,
    valueRange: {
      min: contractValues.length ? Math.min(...contractValues) : 0,
      max: contractValues.length ? Math.max(...contractValues) : 0
    },
    statusDistribution: contracts.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    categoryDistribution: contracts.reduce((acc, c) => {
      if (c.category) acc[c.category] = (acc[c.category] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    clientFrequency: contracts.reduce((acc, c) => {
      acc[c.clientName] = (acc[c.clientName] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    dateRange: {
      earliest: contracts.length ? contracts[contracts.length - 1].signedDate.toISOString() : '',
      latest: contracts.length ? contracts[0].signedDate.toISOString() : ''
    }
  }

  // Calculate receivable statistics
  const receivableAmounts = receivables.map(r => r.amount).filter(a => a > 0)
  const today = new Date()
  const receivableStats = {
    totalCount: receivables.length,
    averageAmount: receivableAmounts.length ? receivableAmounts.reduce((a, b) => a + b, 0) / receivableAmounts.length : 0,
    statusDistribution: receivables.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    overdueCount: receivables.filter(r => r.status === 'pending' && new Date(r.expectedDate) < today).length,
    categoryDistribution: receivables.reduce((acc, r) => {
      if (r.category) acc[r.category] = (acc[r.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  // Calculate expense statistics
  const expenseAmounts = expenses.map(e => e.amount).filter(a => a > 0)
  const expenseStats = {
    totalCount: expenses.length,
    averageAmount: expenseAmounts.length ? expenseAmounts.reduce((a, b) => a + b, 0) / expenseAmounts.length : 0,
    statusDistribution: expenses.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    typeDistribution: expenses.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    categoryDistribution: expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    vendorFrequency: expenses.reduce((acc, e) => {
      if (e.vendor) acc[e.vendor] = (acc[e.vendor] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return {
    contracts,
    contractStats,
    receivables,
    receivableStats,
    expenses,
    expenseStats,
    budgets
  }
}

export async function supervisorValidateContract(
  contractData: any,
  teamId: string,
  isUpdate = false,
  existingContractId?: string
): Promise<SupervisorAlert[]> {
  const context = await buildSupervisorContext(teamId)

  const prompt = `You are a financial data supervisor for an architect's cashflow management system. Analyze this contract ${isUpdate ? 'update' : 'creation'} and identify any potential issues or anomalies.

DATABASE SCHEMA CONTEXT:
- Contract: id, clientName, projectName, description, totalValue (Float), signedDate (DateTime), status (active/completed/cancelled), category, notes
- Receivable: linked to contract, expectedDate, amount, status (pending/received/overdue/cancelled)
- Expense: optionally linked to contract, description, amount, dueDate, category, status, vendor, type (operational/project/administrative)

CURRENT DATABASE CONTEXT:
Contract Statistics:
- Total contracts: ${context.contractStats.totalCount}
- Average contract value: R$${context.contractStats.averageValue.toFixed(2)}
- Median contract value: R$${context.contractStats.medianValue.toFixed(2)}
- Value range: R$${context.contractStats.valueRange.min.toFixed(2)} - R$${context.contractStats.valueRange.max.toFixed(2)}
- Status distribution: ${JSON.stringify(context.contractStats.statusDistribution)}
- Client frequency: ${JSON.stringify(context.contractStats.clientFrequency)}
- Date range: ${context.contractStats.dateRange.earliest} to ${context.contractStats.dateRange.latest}

Recent Contracts (last 5):
${context.contracts.slice(0, 5).map(c => `- ${c.clientName}: ${c.projectName} - R$${c.totalValue} (${c.signedDate.toISOString().split('T')[0]}) [${c.status}]`).join('\n')}

${isUpdate ? 'UPDATING' : 'NEW'} CONTRACT DATA:
${JSON.stringify(contractData, null, 2)}

FOCOS DE VALIDAÇÃO (responda em português brasileiro):
1. **Duplicatas**: Nomes similares de cliente/projeto, correspondências exatas
2. **Anomalias de Valor**: Valores muito altos/baixos comparados ao histórico, zeros extras, valores irreais
3. **Problemas de Data**: Datas futuras, datas que não fazem sentido, erros de ano
4. **Consistência**: Variações no nome do cliente, padrões de nomeação de projetos
5. **Lógica de Negócio**: Relacionamentos de contratos, informações ausentes
6. **Qualidade dos Dados**: Padrões incomuns, erros de digitação, problemas de formatação

**RESPOND IN BRAZILIAN PORTUGUESE with intelligent suggestions using JSON format:**

Example format:
{
  "alerts": [
    {
      "type": "value",
      "message": "Valor do contrato parece ter zeros extras",
      "details": "R$500.000 para projeto residencial - muito acima da média de R$50.000",
      "suggestions": [
        "Você quis dizer R$50.000 em vez de R$500.000?",
        "Confirme o valor do contrato com o cliente",
        "Edite o contrato com o valor correto se necessário"
      ]
    }
  ]
}

Return {"alerts": []} JSON object if no issues found.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt + '\n\nPlease respond with a JSON object in the specified format.' }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content || '{"alerts": []}')

    // Create entityInfo for contract alerts
    const contractId = existingContractId || contractData.id
    const entityInfo = contractId ? {
      name: `Contrato - ${contractData.projectName || 'Projeto'}`,
      details: `Cliente: ${contractData.clientName || 'N/A'} | Valor: R$${contractData.totalValue?.toLocaleString('pt-BR') || '0'} | Data: ${contractData.signedDate ? new Date(contractData.signedDate).toLocaleDateString('pt-BR') : 'N/A'}`,
      editUrl: `/contracts?edit=${contractId}`
    } : undefined

    return normalizeAlerts(result.alerts || [], entityInfo)
  } catch (error) {
    console.error('Supervisor validation error:', error)
    return []
  }
}

export async function supervisorValidateReceivable(
  receivableData: any,
  contractId: string,
  teamId: string
): Promise<SupervisorAlert[]> {
  console.log('🤖 Supervisor validating receivable:', { receivableData, contractId })

  const context = await buildSupervisorContext(teamId)
  const relatedContract = context.contracts.find(c => c.id === contractId)

  console.log('📊 Context:', {
    contractsCount: context.contracts.length,
    relatedContract: relatedContract ? `${relatedContract.clientName} - ${relatedContract.projectName} (R$${relatedContract.totalValue})` : 'Not found'
  })

  const prompt = `You are a financial data supervisor. Analyze this new receivable creation for potential issues.

DATABASE CONTEXT:
Receivable Statistics:
- Total receivables: ${context.receivableStats.totalCount}
- Average amount: R$${context.receivableStats.averageAmount.toFixed(2)}
- Status distribution: ${JSON.stringify(context.receivableStats.statusDistribution)}
- Overdue count: ${context.receivableStats.overdueCount}

RELATED CONTRACT:
${relatedContract ? `Client: ${relatedContract.clientName}, Project: ${relatedContract.projectName}, Total Value: R$${relatedContract.totalValue}, Signed: ${relatedContract.signedDate.toISOString().split('T')[0]}, Status: ${relatedContract.status}` : 'Contract not found'}

EXISTING RECEIVABLES FOR THIS CONTRACT:
${relatedContract?.receivables.map(r => `- R$${r.amount} expected ${r.expectedDate.toISOString().split('T')[0]} [${r.status}]`).join('\n') || 'None'}

NEW RECEIVABLE DATA:
${JSON.stringify(receivableData, null, 2)}

VALIDATION FOCUS:
1. **Lógica de Valores**: Valor vs total do contrato, divisão razoável, soma excedendo contrato
2. **Lógica de Datas**: Data esperada vs data de assinatura do contrato, datas passadas, timing irrealístico
3. **Duplicatas**: Valores/datas similares já existem
4. **Regras de Negócio**: Status do contrato vs criação de recebível, contratos completados
5. **Padrões**: Cronogramas de pagamento incomuns, valores

**RESPOND IN BRAZILIAN PORTUGUESE with actionable suggestions and intelligent corrections using JSON format:**

IMPORTANT: Respond with JSON in exactly this format:
{
  "alerts": [
    {
      "type": "value",
      "message": "Valor do recebível excede o total do contrato",
      "details": "Recebível de R$800.000 vs contrato de R$20.000. Possível erro de digitação (zero extra)?",
      "suggestions": [
        "Verifique se você quis dizer R$8.000 em vez de R$800.000",
        "Confirme se este recebível é realmente para este contrato",
        "Edite o recebível com o valor correto se necessário"
      ]
    }
  ]
}

**GUIDELINES:**
- ONLY CREATE ALERTS FOR REAL PROBLEMS - not normal business operations
- Always suggest specific corrections for obvious mistakes (extra zeros, wrong decimals)
- Provide actionable next steps ("edite o recebível", "verifique com o cliente")
- Be helpful and constructive, not just critical
- Use Brazilian Portuguese throughout
- DO NOT create alerts for: active contracts, normal payment schedules, or standard business operations
- ONLY alert if there are VALUE ERRORS, DATE PROBLEMS, DUPLICATES, or CONTRACT VIOLATIONS

Return {"alerts": []} JSON object if no issues found.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt + '\n\nPlease respond with a JSON object in the specified format.' }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content || '{"alerts": []}')
    console.log('🚨 Supervisor receivable result:', result)

    // Create entityInfo for receivable alerts
    const entityInfo = {
      name: `Conta a Receber - ${relatedContract?.projectName || 'Projeto'}`,
      details: `Cliente: ${relatedContract?.clientName || 'N/A'} | Valor: R$${receivableData.amount?.toLocaleString('pt-BR') || '0'} | Data: ${receivableData.expectedDate ? new Date(receivableData.expectedDate).toLocaleDateString('pt-BR') : 'N/A'}`,
      editUrl: `` // Will be completed in API with actual receivable ID
    }

    return normalizeAlerts(result.alerts || [], entityInfo)
  } catch (error) {
    console.error('🚨 Supervisor receivable validation error:', error)
    return []
  }
}

export async function supervisorValidateExpense(
  expenseData: any,
  teamId: string
): Promise<SupervisorAlert[]> {
  const context = await buildSupervisorContext(teamId)

  const prompt = `You are a financial data supervisor. Analyze this new expense creation for potential issues.

DATABASE CONTEXT:
Expense Statistics:
- Total expenses: ${context.expenseStats.totalCount}
- Average amount: R$${context.expenseStats.averageAmount.toFixed(2)}
- Type distribution: ${JSON.stringify(context.expenseStats.typeDistribution)}
- Category distribution: ${JSON.stringify(context.expenseStats.categoryDistribution)}
- Top vendors: ${JSON.stringify(Object.entries(context.expenseStats.vendorFrequency).slice(0, 5))}

Recent Expenses (last 5):
${context.expenses.slice(0, 5).map(e => `- ${e.description}: R$${e.amount} due ${e.dueDate.toISOString().split('T')[0]} [${e.category}] ${e.vendor ? `(${e.vendor})` : ''}`).join('\n')}

NEW EXPENSE DATA:
${JSON.stringify(expenseData, null, 2)}

VALIDATION FOCUS (in Brazilian Portuguese):
1. **Anomalias de Valor**: Valores muito altos/baixos, zeros extras, erros de digitação
2. **Problemas de Data**: Datas de vencimento passadas, timing irrealístico, erros de ano
3. **Duplicatas**: Combinações similares de descrição/valor/fornecedor/data
4. **Lógica de Categoria**: Categoria apropriada para descrição, consistência do fornecedor
5. **Padrões de Negócio**: Relacionamentos com fornecedores, despesas recorrentes, padrões incomuns
6. **Qualidade dos Dados**: Clareza da descrição, variações do nome do fornecedor

**RESPOND IN BRAZILIAN PORTUGUESE with intelligent corrections using JSON format:**

Example format:
{
  "alerts": [
    {
      "type": "value",
      "message": "Valor da despesa parece ter zero extra",
      "details": "R$50.000 para 'Materiais básicos' - muito acima da média de R$500",
      "suggestions": [
        "Você quis dizer R$5.000 em vez de R$50.000?",
        "Confirme o valor com a nota fiscal",
        "Edite a despesa com o valor correto"
      ]
    }
  ]
}

Return {"alerts": []} JSON object if no issues found.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt + '\n\nPlease respond with a JSON object in the specified format.' }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content || '{"alerts": []}')

    // Create entityInfo for expense alerts
    const entityInfo = {
      name: `Despesa - ${expenseData.description || 'Despesa'}`,
      details: `Categoria: ${expenseData.category || 'N/A'} | Valor: R$${expenseData.amount?.toLocaleString('pt-BR') || '0'} | Vencimento: ${expenseData.dueDate ? new Date(expenseData.dueDate).toLocaleDateString('pt-BR') : 'N/A'}`,
      editUrl: `` // Will be completed in API with actual expense ID
    }

    return normalizeAlerts(result.alerts || [], entityInfo)
  } catch (error) {
    console.error('Supervisor validation error:', error)
    return []
  }
}

