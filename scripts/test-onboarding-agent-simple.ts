/**
 * Simple Test Script for Onboarding Intelligence Agent
 *
 * Uses proper authentication flow from validate-with-auth.ts
 */

import fs from 'fs'

// Test configuration
const BASE_URL = 'http://localhost:3010'
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
}

interface AuthSession {
  cookie: string
  userId: string
  teamId: string
  email: string
}

/**
 * Login and get session cookie (copied from validate-with-auth.ts)
 */
async function loginUser(email: string, password: string): Promise<AuthSession> {
  console.log(`🔐 Logging in as ${email}...`)

  // First, get the NextAuth CSRF token
  const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`, {
    method: 'GET',
  })

  if (!csrfResponse.ok) {
    throw new Error(`Failed to get CSRF token: ${csrfResponse.status}`)
  }

  const { csrfToken } = await csrfResponse.json()
  const csrfCookie = csrfResponse.headers.get('set-cookie') || ''

  // Perform login
  const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': csrfCookie,
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      redirect: 'false',
      json: 'true'
    }),
    redirect: 'manual'
  })

  // Extract session cookie from response
  const setCookieHeader = loginResponse.headers.get('set-cookie')
  if (!setCookieHeader) {
    throw new Error('No session cookie received - login may have failed')
  }

  // Parse cookies to get session token
  const cookies = setCookieHeader.split(',').map(c => c.trim())
  const sessionCookie = cookies.find(c => c.includes('next-auth.session-token') || c.includes('__Secure-next-auth.session-token'))

  if (!sessionCookie) {
    throw new Error('Session token not found in cookies')
  }

  // Get session info to verify login
  const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: {
      'Cookie': sessionCookie,
    },
  })

  if (!sessionResponse.ok) {
    throw new Error(`Failed to get session: ${sessionResponse.status}`)
  }

  const session = await sessionResponse.json()

  if (!session.user) {
    throw new Error('Login failed - no user in session')
  }

  console.log(`✅ Logged in successfully as ${session.user.email} (Team: ${session.user.teamId})`)

  return {
    cookie: sessionCookie,
    userId: session.user.id,
    teamId: session.user.teamId,
    email: session.user.email
  }
}

async function loadTestFile(filePath: string): Promise<{ name: string; type: string; base64: string; size: number }> {
  const fileBuffer = fs.readFileSync(filePath)
  const base64 = fileBuffer.toString('base64')
  const stats = fs.statSync(filePath)
  const fileName = filePath.split('/').pop() || filePath

  // Determine MIME type
  let mimeType = 'application/octet-stream'
  if (fileName.endsWith('.csv')) {
    mimeType = 'text/csv'
  } else if (fileName.endsWith('.xlsx')) {
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else if (fileName.endsWith('.pdf')) {
    mimeType = 'application/pdf'
  }

  return {
    name: fileName,
    type: mimeType,
    base64,
    size: stats.size
  }
}

async function testAgentInfo(session: AuthSession): Promise<void> {
  console.log('\n🔍 Testing Agent Info Endpoint...')

  const response = await fetch(`${BASE_URL}/api/agents/onboarding`, {
    method: 'GET',
    headers: {
      'Cookie': session.cookie
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  console.log('✅ Agent Info Response:')
  console.log(JSON.stringify(data, null, 2))
  console.log(`   Agent: ${data.agent || 'undefined'}`)
  console.log(`   Version: ${data.version || 'undefined'}`)
  console.log(`   Status: ${data.status || 'undefined'}`)
  console.log(`   Team: ${data.teamId || 'undefined'}`)
  if (data.supportedFileTypes && Array.isArray(data.supportedFileTypes)) {
    console.log(`   Supported Files: ${data.supportedFileTypes.length} types`)
  }
}

async function testDocumentProcessing(session: AuthSession): Promise<void> {
  console.log('\n🤖 Testing Document Processing with sample_data.csv...')

  try {
    // Load just the CSV file for initial test
    const csvFile = await loadTestFile('./sample_data.csv')
    console.log(`📄 Loaded ${csvFile.name} (${(csvFile.size / 1024).toFixed(1)}KB)`)

    const requestBody = {
      files: [csvFile],
      extractionType: 'auto',
      userGuidance: 'This CSV contains contracts, expenses, and receivables from a Brazilian architecture firm'
    }

    console.log('🚀 Sending processing request...')
    const response = await fetch(`${BASE_URL}/api/agents/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': session.cookie
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log('\n✅ Processing Results:')
    console.log(JSON.stringify(result, null, 2))

    if (result.success && result.result) {
      console.log(`   Success: ${result.success}`)
      console.log(`   Files processed: ${result.result.processedFiles}/${result.result.totalFiles}`)
      console.log(`   Entities extracted: ${result.result.extractedEntities}`)
      console.log(`   Entities created: ${result.result.createdEntities}`)
      console.log(`   Summary:`)
      console.log(`     - Contracts: ${result.result.summary.contracts}`)
      console.log(`     - Expenses: ${result.result.summary.expenses}`)
      console.log(`     - Receivables: ${result.result.summary.receivables}`)

      if (result.result.errors && result.result.errors.length > 0) {
        console.log('\n⚠️  Errors:')
        result.result.errors.forEach((error: string) => {
          console.log(`     - ${error}`)
        })
      }

      // Verify entities were created
      await verifyEntitiesCreated(session, result.result.summary)
    } else {
      console.error('❌ Unexpected response format or failure')
    }

  } catch (error) {
    console.error('❌ Document processing failed:', error)
    throw error
  }
}

async function verifyEntitiesCreated(session: AuthSession, summary: any): Promise<void> {
  console.log('\n🗄️  Verifying entities were created in database...')

  const endpoints = [
    { name: 'Contracts', url: '/api/contracts', expected: summary.contracts },
    { name: 'Expenses', url: '/api/expenses', expected: summary.expenses },
    { name: 'Receivables', url: '/api/receivables', expected: summary.receivables }
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.url}`, {
        headers: {
          'Cookie': session.cookie
        }
      })

      if (response.ok) {
        const data = await response.json()
        const count = Array.isArray(data) ? data.length : (data.data ? data.data.length : 0)
        console.log(`✅ ${endpoint.name}: ${count} entities in database`)

        if (endpoint.expected > 0 && count === 0) {
          console.warn(`⚠️  Expected ${endpoint.expected} ${endpoint.name} but found 0 in database`)
        }
      } else {
        console.warn(`⚠️  Could not verify ${endpoint.name}: HTTP ${response.status}`)
      }
    } catch (error) {
      console.warn(`⚠️  Error verifying ${endpoint.name}:`, error)
    }
  }
}

async function runSimpleTest(): Promise<void> {
  console.log('🧪 Simple Onboarding Intelligence Agent Test')
  console.log('=' .repeat(50))

  try {
    // Step 1: Login
    const session = await loginUser(TEST_USER.email, TEST_USER.password)

    // Step 2: Test agent info
    await testAgentInfo(session)

    // Step 3: Test document processing
    await testDocumentProcessing(session)

    console.log('\n🎉 Test completed successfully!')
    console.log('✅ Onboarding Intelligence Agent is working correctly')

  } catch (error) {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  }
}

// Run the test
runSimpleTest()