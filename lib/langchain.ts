import { ChatOpenAI } from '@langchain/openai'
import { prisma } from './prisma'

export async function queryDatabase(question: string, history?: Array<{ question: string; answer: string }>) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const llm = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
  })

  try {
    // Get database schema info
    const schemaInfo = `
    Database Schema:

    IMPORTANT: Current date context - Today is ${new Date().toISOString().split('T')[0]} (YYYY-MM-DD format).
    When using 'now' in SQLite, be aware that the system might have timezone issues.

    Contract table:
    - id (TEXT, PRIMARY KEY)
    - clientName (TEXT)
    - projectName (TEXT)
    - description (TEXT, nullable)
    - totalValue (REAL)
    - signedDate (DATETIME)
    - status (TEXT, default: 'active') - values: active, completed, cancelled
    - category (TEXT, nullable)
    - notes (TEXT, nullable)
    - createdAt (DATETIME)
    - updatedAt (DATETIME)

    Receivable table (income/payments expected):
    - id (TEXT, PRIMARY KEY)
    - contractId (TEXT, FOREIGN KEY to Contract.id)
    - expectedDate (DATETIME)
    - amount (REAL)
    - status (TEXT, default: 'pending') - values: pending, received, overdue, cancelled
    - receivedDate (DATETIME, nullable)
    - receivedAmount (REAL, nullable)
    - invoiceNumber (TEXT, nullable)
    - category (TEXT, nullable)
    - notes (TEXT, nullable)
    - createdAt (DATETIME)
    - updatedAt (DATETIME)

    Expense table (costs/expenses):
    - id (TEXT, PRIMARY KEY)
    - contractId (TEXT, FOREIGN KEY to Contract.id, nullable)
    - description (TEXT)
    - amount (REAL)
    - dueDate (DATETIME)
    - category (TEXT) - common values: materials, labor, equipment, transport, office, software, utilities, rent, insurance, marketing, professional-services, other
    - status (TEXT, default: 'pending') - values: pending, paid, overdue, cancelled
    - paidDate (DATETIME, nullable)
    - paidAmount (REAL, nullable)
    - vendor (TEXT, nullable) - supplier/vendor name
    - invoiceNumber (TEXT, nullable)
    - type (TEXT, default: 'operational') - values: operational, project, administrative
    - isRecurring (BOOLEAN, default: false)
    - notes (TEXT, nullable)
    - receiptUrl (TEXT, nullable)
    - createdAt (DATETIME)
    - updatedAt (DATETIME)

    Budget table:
    - id (TEXT, PRIMARY KEY)
    - contractId (TEXT, FOREIGN KEY to Contract.id, nullable)
    - name (TEXT)
    - category (TEXT)
    - budgetAmount (REAL)
    - period (TEXT) - values: monthly, quarterly, project, annual
    - startDate (DATETIME)
    - endDate (DATETIME)
    - isActive (BOOLEAN, default: true)
    - notes (TEXT, nullable)
    - createdAt (DATETIME)
    - updatedAt (DATETIME)

    Category table:
    - id (TEXT, PRIMARY KEY)
    - name (TEXT, UNIQUE)
    - color (TEXT, nullable)
    - createdAt (DATETIME)
    - updatedAt (DATETIME)
    `

    // Build conversation context
    let conversationContext = ''
    if (history && history.length > 0) {
      conversationContext = `
    Previous conversation context (for reference only, focus on the current question):
    ${history.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n\n')}

    Current question: ${question}
    `
    } else {
      conversationContext = `Question: ${question}`
    }

    // Generate SQL query
    const sqlPrompt = `
    You are a SQLite expert. Given the following database schema and question, write a SQLite query to answer it.

    ${schemaInfo}

    ${conversationContext}

    IMPORTANT GUIDELINES FOR DATE AND STATUS QUERIES:

    FOR RECEIVABLES (INCOME):
    - Actual income received: use receivedDate and status = 'received'
    - Expected/planned income: use expectedDate
    - "Quanto recebi esse mês": Use datetime function: WHERE strftime('%Y-%m', datetime(receivedDate/1000, 'unixepoch')) = '2025-09' AND status = 'received'

    FOR EXPENSES (COSTS):
    - Actual expenses paid: use paidDate and status = 'paid'
    - Expected/planned expenses: use dueDate
    - "Quanto gastei esse mês": Use datetime function: WHERE strftime('%Y-%m', datetime(paidDate/1000, 'unixepoch')) = '2025-09' AND status = 'paid'

    GENERAL RULES:
    - For actual cashflow questions, always use the "actual" date fields (receivedDate/paidDate) with completed status
    - For planning/budget questions, use expected date fields (expectedDate/dueDate)
    - For comprehensive cashflow, consider both actual income (receivedDate+received) AND actual expenses (paidDate+paid)
    - IMPORTANT: Dates are stored as Unix timestamps in milliseconds (e.g., 1725408000000)
    - To query dates, use: datetime(dateField/1000, 'unixepoch') to convert to SQLite datetime
    - For "this month" queries: WHERE strftime('%Y-%m', datetime(dateField/1000, 'unixepoch')) = '2025-09'
    - For specific dates: WHERE date(datetime(dateField/1000, 'unixepoch')) = '2025-09-15'
    - Current month is September 2025 ('2025-09')

    Return ONLY the SQL query, no explanations. Use proper SQLite syntax.
    When joining tables, use proper JOIN syntax.
    For dates, use DATE() function for date comparisons.
    Consider the conversation context to understand pronouns and references (like "those", "them", "it").
    `

    const sqlResponse = await llm.invoke([{ role: 'user', content: sqlPrompt }])
    const sqlQuery = sqlResponse.content.toString().replace(/```sql\n?|\n?```/g, '').trim()

    // Execute the query using Prisma's raw query
    const result = await prisma.$queryRawUnsafe(sqlQuery)

    // Convert BigInt to string for serialization
    const serializedResult = JSON.parse(JSON.stringify(result, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ))

    // Generate natural language response
    const responsePrompt = `
    Based on the following SQL query result, provide a clear and concise answer to the user's question IN PORTUGUESE.

    User Question: ${question}
    SQL Query: ${sqlQuery}
    Query Result: ${JSON.stringify(serializedResult)}

    RESPOND ONLY IN PORTUGUESE. Provide a natural language response that directly answers the question.
    If the result includes monetary values, format them as Brazilian currency (R$ X.XXX,XX).
    If the result includes dates, format them in Brazilian format (DD/MM/YYYY).

    IMPORTANT: If the result is empty or seems incorrect, it might be because the user used different terminology.
    In this case, provide a helpful follow-up question in Portuguese to clarify what they're looking for.
    For example:
    - If user asks about "projetos" but database has "contracts", suggest: "Não encontrei projetos. Você quis dizer contratos?"
    - If user asks about "faturas" but database has "receivables", suggest: "Não encontrei faturas. Está procurando recebíveis?"
    - If user asks about "custos" or "contas", they likely mean "despesas"
    - Common terminology mappings to consider:
      * projeto=contrato, fatura=recebível, pagamento=recebível, cliente=clientName
      * custos=despesas, contas=despesas, gastos=despesas, saídas=despesas
      * receita=recebíveis, entradas=recebíveis, faturamento=recebíveis
      * fornecedores=vendors, contas=despesas, compras=despesas

    When answering financial questions, always consider both income (recebíveis) AND expenses (despesas) for a complete picture.
    Calculate net cashflow as: total recebíveis - total despesas.

    IMPORTANT: When answering about spending ("gastos"), always explain if you're looking at:
    - Actual payments made (paidDate) vs planned expenses (dueDate)
    - If no results found, suggest checking if expenses were marked as paid

    ALWAYS respond in Portuguese. Use Brazilian Portuguese conventions for numbers, dates, and currency.
    Only ask a clarifying question if the result is empty or clearly not what the user intended.
    `

    const naturalResponse = await llm.invoke([{ role: 'user', content: responsePrompt }])

    return {
      question,
      sqlQuery,
      rawResult: serializedResult,
      answer: naturalResponse.content,
    }
  } catch (error) {
    console.error('Query error:', error)
    throw error
  }
}