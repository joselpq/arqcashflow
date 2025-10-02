/**
 * Test Operations Agent - Step 1: Conversation Context
 *
 * Tests that Claude can remember conversation context
 */

const BASE_URL = 'http://localhost:3000'

async function testConversationContext() {
  console.log('🧪 Testing Operations Agent - Step 1: Conversation Context\n')

  // You need to get a valid session token first
  console.log('📋 SETUP INSTRUCTIONS:')
  console.log('1. Open http://localhost:3000 in your browser')
  console.log('2. Log in to the application')
  console.log('3. Open browser DevTools (F12) → Console')
  console.log('4. Run this command to get your session token:')
  console.log('   document.cookie.split(";").find(c => c.includes("authjs.session-token"))?.split("=")[1]')
  console.log('5. Copy the token and set it as SESSION_TOKEN environment variable:')
  console.log('   export SESSION_TOKEN="your-token-here"')
  console.log('6. Run this test: npx tsx test-operations-step1.ts\n')

  const sessionToken = process.env.SESSION_TOKEN
  if (!sessionToken) {
    console.error('❌ SESSION_TOKEN not set')
    process.exit(1)
  }

  const conversationHistory: any[] = []

  // Test 1: First message
  console.log('📝 Test 1: First message')
  const result1 = await callOperationsAgent('Oi, tudo bem?', conversationHistory, sessionToken)
  if (result1.success) {
    console.log(`✅ Response: ${result1.message}\n`)
    conversationHistory.push(...result1.conversationHistory)
  } else {
    console.log(`❌ Failed: ${result1.error}\n`)
    return
  }

  // Test 2: Follow-up (should remember context)
  console.log('📝 Test 2: Follow-up message')
  const result2 = await callOperationsAgent('Qual é o meu nome?', conversationHistory, sessionToken)
  if (result2.success) {
    console.log(`✅ Response: ${result2.message}\n`)
    conversationHistory.push(...result2.conversationHistory.slice(conversationHistory.length))
  } else {
    console.log(`❌ Failed: ${result2.error}\n`)
    return
  }

  // Test 3: Another follow-up
  console.log('📝 Test 3: Another follow-up')
  const result3 = await callOperationsAgent('Me diga algo sobre o que conversamos antes', conversationHistory, sessionToken)
  if (result3.success) {
    console.log(`✅ Response: ${result3.message}\n`)
  } else {
    console.log(`❌ Failed: ${result3.error}\n`)
    return
  }

  console.log('✅ All tests passed! Conversation context is working.')
  console.log(`📊 Total messages in history: ${conversationHistory.length}`)
}

async function callOperationsAgent(
  message: string,
  conversationHistory: any[],
  sessionToken: string
) {
  const response = await fetch(`${BASE_URL}/api/ai/operations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `authjs.session-token=${sessionToken}`
    },
    body: JSON.stringify({
      message,
      conversationHistory
    })
  })

  return await response.json()
}

// Run tests
testConversationContext().catch(console.error)
