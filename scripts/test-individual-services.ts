#!/usr/bin/env npx tsx

/**
 * Test individual service endpoints to debug issues
 */

async function testIndividualEndpoints() {
  const baseUrl = 'http://localhost:3010'

  // Login first
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`)
  const { csrfToken } = await csrfResponse.json()
  const csrfCookie = csrfResponse.headers.get('set-cookie') || ''

  const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': csrfCookie,
    },
    body: new URLSearchParams({
      csrfToken,
      email: 'test@example.com',
      password: 'password123',
      redirect: 'false',
      json: 'true'
    }),
    redirect: 'manual'
  })

  const setCookieHeader = loginResponse.headers.get('set-cookie')!
  const cookies = setCookieHeader.split(',').map(c => c.trim())
  const sessionCookie = cookies.find(c => c.includes('next-auth.session-token') || c.includes('__Secure-next-auth.session-token'))!

  console.log('✅ Authenticated')

  // Test receivables
  console.log('\n📊 Testing Receivables:')

  const currentReceivables = await fetch(`${baseUrl}/api/receivables`, {
    headers: { 'Cookie': sessionCookie }
  })
  const currentReceivablesData = await currentReceivables.json()
  console.log(`Current API: ${Array.isArray(currentReceivablesData) ? currentReceivablesData.length : 'not array'} items`)

  const serviceReceivables = await fetch(`${baseUrl}/api/test-service-receivables`, {
    headers: { 'Cookie': sessionCookie }
  })
  const serviceReceivablesData = await serviceReceivables.json()
  console.log(`Service API: ${Array.isArray(serviceReceivablesData) ? serviceReceivablesData.length : 'not array'} items`)
  console.log('Service response:', JSON.stringify(serviceReceivablesData).substring(0, 200))

  // Test expenses
  console.log('\n📊 Testing Expenses:')

  const currentExpenses = await fetch(`${baseUrl}/api/expenses`, {
    headers: { 'Cookie': sessionCookie }
  })
  const currentExpensesData = await currentExpenses.json()
  console.log(`Current API: ${Array.isArray(currentExpensesData) ? currentExpensesData.length : 'not array'} items`)

  const serviceExpenses = await fetch(`${baseUrl}/api/test-service-expenses`, {
    headers: { 'Cookie': sessionCookie }
  })
  const serviceExpensesData = await serviceExpenses.json()
  console.log(`Service API: ${Array.isArray(serviceExpensesData) ? serviceExpensesData.length : 'not array'} items`)
  console.log('Service response:', JSON.stringify(serviceExpensesData).substring(0, 200))
}

testIndividualEndpoints().catch(console.error)