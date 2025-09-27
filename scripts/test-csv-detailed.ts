/**
 * Test CSV with detailed logging
 */
import fs from 'fs'

async function testCSVDetailed(): Promise<void> {
  try {
    // Login
    const csrfResponse = await fetch('http://localhost:3010/api/auth/csrf')
    const { csrfToken } = await csrfResponse.json()
    const csrfCookie = csrfResponse.headers.get('set-cookie') || ''

    const loginResponse = await fetch('http://localhost:3010/api/auth/callback/credentials', {
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
    const sessionCookie = setCookieHeader.split(',').find(c => c.includes('next-auth.session-token'))!

    // Load CSV file
    const fileBuffer = fs.readFileSync('./sample_data.csv')
    const base64 = fileBuffer.toString('base64')

    console.log('🧪 Testing CSV with enhanced receivable logging')

    const requestBody = {
      files: [{
        name: 'sample_data.csv',
        type: 'text/csv',
        base64,
        size: fileBuffer.length
      }],
      extractionType: 'auto',
      userGuidance: 'CSV with 4 contracts, 4 receivables, 7 expenses from Brazilian architecture firm'
    }

    const response = await fetch('http://localhost:3010/api/agents/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(requestBody)
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Processing result:')
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`❌ Processing failed: HTTP ${response.status}`)
      console.log(await response.text())
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testCSVDetailed()