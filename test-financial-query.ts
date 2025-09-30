/**
 * Test script for Financial Query Agent
 *
 * Tests the /api/ai/query endpoint with various financial questions
 */

// Test queries to validate
const testQueries = [
  {
    question: "Quais meus projetos concluídos?",
    description: "Test semantic mapping: projetos→contracts, concluídos→completed"
  },
  {
    question: "Quanto vou receber no próximo mês?",
    description: "Test receivables query with date context"
  },
  {
    question: "Quantos contratos ativos tenho?",
    description: "Test contract count with status filter"
  }
]

async function testQuery(question: string, sessionCookie?: string) {
  console.log(`\n📝 Testing: "${question}"`)

  try {
    const response = await fetch('http://localhost:3010/api/ai/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionCookie ? { 'Cookie': sessionCookie } : {})
      },
      body: JSON.stringify({
        question,
        history: []
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ Error ${response.status}: ${errorText}`)
      return { success: false, status: response.status }
    }

    const result = await response.json()
    console.log(`✅ Response:`, result.answer)
    console.log(`   Metadata:`, {
      needsClarification: result.needsClarification,
      suggestedQuestions: result.suggestedQuestions?.slice(0, 2)
    })

    return { success: true, result }
  } catch (error) {
    console.log(`❌ Request failed:`, error instanceof Error ? error.message : error)
    return { success: false, error }
  }
}

async function main() {
  console.log('🚀 Financial Query Agent Test Suite\n')
  console.log('=' .repeat(60))

  // Note: These tests require authentication
  // You'll need to provide a valid session cookie from the browser

  console.log('\n⚠️  Authentication Required')
  console.log('To run these tests:')
  console.log('1. Log in to http://localhost:3010/login')
  console.log('2. Copy the session cookie from browser DevTools')
  console.log('3. Set it as SESSION_COOKIE environment variable')
  console.log('4. Re-run this script\n')

  const sessionCookie = process.env.SESSION_COOKIE

  if (!sessionCookie) {
    console.log('❌ No session cookie provided. Skipping tests.')
    console.log('   Set SESSION_COOKIE env var to run tests.\n')
    return
  }

  // Run tests
  let passed = 0
  let failed = 0

  for (const test of testQueries) {
    console.log(`\n📋 ${test.description}`)
    const result = await testQuery(test.question, sessionCookie)

    if (result.success) {
      passed++
    } else {
      failed++
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Test Summary:`)
  console.log(`   ✅ Passed: ${passed}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📈 Total: ${testQueries.length}\n`)
}

main()
