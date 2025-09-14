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

    Contract table:
    - id (TEXT, PRIMARY KEY)
    - clientName (TEXT)
    - projectName (TEXT)
    - description (TEXT, nullable)
    - totalValue (REAL)
    - signedDate (DATETIME)
    - status (TEXT, default: 'active')
    - category (TEXT, nullable)
    - notes (TEXT, nullable)
    - createdAt (DATETIME)
    - updatedAt (DATETIME)

    Receivable table:
    - id (TEXT, PRIMARY KEY)
    - contractId (TEXT, FOREIGN KEY to Contract.id)
    - expectedDate (DATETIME)
    - amount (REAL)
    - status (TEXT, default: 'pending')
    - receivedDate (DATETIME, nullable)
    - receivedAmount (REAL, nullable)
    - invoiceNumber (TEXT, nullable)
    - category (TEXT, nullable)
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
    Based on the following SQL query result, provide a clear and concise answer to the user's question.

    User Question: ${question}
    SQL Query: ${sqlQuery}
    Query Result: ${JSON.stringify(serializedResult)}

    Provide a natural language response that directly answers the question.
    If the result includes monetary values, format them as currency.
    If the result includes dates, format them in a readable format.

    IMPORTANT: If the result is empty or seems incorrect, it might be because the user used different terminology.
    In this case, provide a helpful follow-up question to clarify what they're looking for.
    For example:
    - If user asks about "projects" but database has "contracts", suggest: "I couldn't find projects. Did you mean contracts?"
    - If user asks about "invoices" but database has "receivables", suggest: "I couldn't find invoices. Are you looking for receivables?"
    - Common terminology mappings to consider: project=contract, invoice=receivable, payment=receivable, client=clientName

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