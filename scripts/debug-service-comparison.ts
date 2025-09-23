#!/usr/bin/env npx tsx

/**
 * Debug Service vs API Comparison
 * Simple script to see what each endpoint returns
 */

// Login and get session
async function loginAndTest() {
  const baseUrl = 'http://localhost:3010'

  // Step 1: Get CSRF token
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`)
  const { csrfToken } = await csrfResponse.json()
  const csrfCookie = csrfResponse.headers.get('set-cookie') || ''

  // Step 2: Login
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

  const setCookieHeader = loginResponse.headers.get('set-cookie')
  const cookies = setCookieHeader!.split(',').map(c => c.trim())
  const sessionCookie = cookies.find(c => c.includes('next-auth.session-token') || c.includes('__Secure-next-auth.session-token'))!

  console.log('🔍 Authenticated successfully')

  // Step 3: Test both endpoints
  console.log('\n📊 Testing /api/contracts:')
  const currentResponse = await fetch(`${baseUrl}/api/contracts`, {
    headers: { 'Cookie': sessionCookie }
  })

  if (currentResponse.ok) {
    const currentData = await currentResponse.json()
    console.log(`✅ Current API: ${Array.isArray(currentData) ? currentData.length : 'not array'} items`)
    console.log('Raw data:', JSON.stringify(currentData, null, 2).substring(0, 500) + '...')
  } else {
    console.log(`❌ Current API failed: ${currentResponse.status}`)
  }

  console.log('\n📊 Testing /api/test-service-contracts:')
  const serviceResponse = await fetch(`${baseUrl}/api/test-service-contracts`, {
    headers: { 'Cookie': sessionCookie }
  })

  if (serviceResponse.ok) {
    const serviceData = await serviceResponse.json()
    console.log(`✅ Service API: ${Array.isArray(serviceData) ? serviceData.length : 'not array'} items`)
    console.log('Raw data:', JSON.stringify(serviceData, null, 2).substring(0, 500) + '...')
  } else {
    console.log(`❌ Service API failed: ${serviceResponse.status}`)
    const errorText = await serviceResponse.text()
    console.log('Error:', errorText)
  }
}

loginAndTest().catch(console.error)