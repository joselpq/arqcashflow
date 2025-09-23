#!/usr/bin/env npx tsx

/**
 * Detailed API debugging to see exact responses
 */

async function debugAPIResponses() {
  const baseUrl = 'http://localhost:3010'

  // Login
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

  // Test current receivables API
  console.log('\n📊 Current Receivables API:')
  const currentReceivables = await fetch(`${baseUrl}/api/receivables`, {
    headers: { 'Cookie': sessionCookie }
  })
  console.log(`Status: ${currentReceivables.status}`)
  console.log(`Headers:`, Object.fromEntries(currentReceivables.headers.entries()))

  const receivablesText = await currentReceivables.text()
  console.log(`Raw response: "${receivablesText}"`)

  try {
    const receivablesData = JSON.parse(receivablesText)
    console.log(`Parsed type: ${typeof receivablesData}`)
    console.log(`Is array: ${Array.isArray(receivablesData)}`)
    console.log(`Data:`, JSON.stringify(receivablesData).substring(0, 200))
  } catch (e) {
    console.log(`Parse error: ${e}`)
  }

  // Test service receivables API
  console.log('\n📊 Service Receivables API:')
  const serviceReceivables = await fetch(`${baseUrl}/api/test-service-receivables`, {
    headers: { 'Cookie': sessionCookie }
  })
  console.log(`Status: ${serviceReceivables.status}`)
  console.log(`Headers:`, Object.fromEntries(serviceReceivables.headers.entries()))

  const serviceReceivablesText = await serviceReceivables.text()
  console.log(`Raw response: "${serviceReceivablesText.substring(0, 200)}"`)

  try {
    const serviceReceivablesData = JSON.parse(serviceReceivablesText)
    console.log(`Parsed type: ${typeof serviceReceivablesData}`)
    console.log(`Is array: ${Array.isArray(serviceReceivablesData)}`)
    console.log(`Length: ${serviceReceivablesData.length}`)
  } catch (e) {
    console.log(`Parse error: ${e}`)
  }
}

debugAPIResponses().catch(console.error)