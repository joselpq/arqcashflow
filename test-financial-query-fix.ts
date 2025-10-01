/**
 * Test Financial Query Agent Fix
 *
 * Tests the fixed teamScopedPrisma.raw.$queryRawUnsafe() method
 * Run with: npx tsx test-financial-query-fix.ts
 */

async function testFinancialQuery() {
  console.log('🧪 Testing Financial Query Agent Fix\n')

  // Test requires authentication - provide instructions
  console.log('📋 Instructions:')
  console.log('1. Make sure dev server is running: npm run dev')
  console.log('2. Open browser and login to get session cookie')
  console.log('3. Open DevTools > Network > Copy cookie header')
  console.log('4. Replace COOKIE_HERE below with your cookie\n')

  const COOKIE = 'next-auth.session-token=YOUR_SESSION_TOKEN_HERE'

  if (COOKIE.includes('YOUR_SESSION_TOKEN_HERE')) {
    console.log('⚠️  Please update COOKIE variable with your session cookie')
    console.log('   1. Login at http://localhost:3000/login')
    console.log('   2. Open DevTools > Application > Cookies')
    console.log('   3. Copy next-auth.session-token value')
    console.log('   4. Replace YOUR_SESSION_TOKEN_HERE in this file\n')
    return
  }

  try {
    // Test query
    const response = await fetch('http://localhost:3000/api/ai/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': COOKIE
      },
      body: JSON.stringify({
        question: 'Quais são os dois últimos recebíveis adicionados?',
        history: []
      })
    })

    console.log('📡 Response Status:', response.status)

    if (!response.ok) {
      const error = await response.json()
      console.log('❌ Error:', error)
      return
    }

    const result = await response.json()

    console.log('\n✅ Success! Query executed successfully\n')
    console.log('📊 Result:')
    console.log('Question:', result.question)
    console.log('Answer:', result.answer)
    console.log('\n💾 SQL Query:', result.sqlQuery)
    console.log('\n🔍 Raw Result:', JSON.stringify(result.rawResult, null, 2))

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testFinancialQuery()
