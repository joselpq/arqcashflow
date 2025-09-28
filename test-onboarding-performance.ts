/**
 * OnboardingIntelligenceAgent Performance Test
 * Tests document processing performance with authenticated users
 */

import fs from 'fs'
import path from 'path'

const BASE_URL = 'http://localhost:3010'

interface AuthSession {
  cookie: string
  userId: string
  teamId: string
  email: string
}

/**
 * Login and get session cookie (EXACT pattern from validate-with-auth.ts)
 * DO NOT MODIFY - This is the proven working pattern
 */
async function loginUser(email: string, password: string): Promise<AuthSession> {
  console.log(`🔐 Logging in as ${email}...`)

  // First, get the NextAuth CSRF token
  const csrfResponse = await fetch('http://localhost:3010/api/auth/csrf', {
    method: 'GET',
  })

  if (!csrfResponse.ok) {
    throw new Error(`Failed to get CSRF token: ${csrfResponse.status}`)
  }

  const { csrfToken } = await csrfResponse.json()
  const csrfCookie = csrfResponse.headers.get('set-cookie') || ''

  // Perform login
  const loginResponse = await fetch('http://localhost:3010/api/auth/callback/credentials', {
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
  const sessionResponse = await fetch('http://localhost:3010/api/auth/session', {
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

  console.log(`✅ Logged in successfully as ${session.user.email}`)

  return {
    cookie: sessionCookie,
    userId: session.user.id,
    teamId: session.user.teamId,
    email: session.user.email
  }
}

async function loadTestFile(filePath: string): Promise<{ name: string; type: string; base64: string; size: number }> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  const fileBuffer = fs.readFileSync(filePath)
  const base64 = fileBuffer.toString('base64')
  const stats = fs.statSync(filePath)
  const fileName = path.basename(filePath)

  // Determine MIME type
  let mimeType = 'application/octet-stream'
  const ext = path.extname(fileName).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.csv': 'text/csv',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg'
  }
  mimeType = mimeTypes[ext] || mimeType

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
  console.log(`   Agent: ${data.agent || 'N/A'}`)
  console.log(`   Version: ${data.version || 'N/A'}`)
  console.log(`   Status: ${data.status || 'N/A'}`)
  console.log(`   Processing Target: ${data.processingTarget || 'N/A'}`)
  console.log(`   Supported Files: ${data.supportedFileTypes ? data.supportedFileTypes.length : 0} types`)
}

async function testSingleFilePerformance(session: AuthSession, filePath: string): Promise<{
  success: boolean;
  duration: number;
  extractedEntities: number;
  createdEntities: number;
  errorCount: number;
}> {
  const fileName = path.basename(filePath)
  console.log(`\n📄 Testing ${fileName}...`)

  try {
    // Load file
    const file = await loadTestFile(filePath)
    console.log(`📊 File size: ${(file.size / 1024).toFixed(1)}KB (${(file.base64.length / 1024).toFixed(1)}KB base64)`)

    const requestBody = {
      files: [file],
      extractionType: 'auto',
      userGuidance: 'Extract all financial entities from this document'
    }

    console.log('🚀 Sending processing request...')
    const startTime = Date.now()

    const response = await fetch(`${BASE_URL}/api/agents/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': session.cookie
      },
      body: JSON.stringify(requestBody)
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ HTTP ${response.status}: ${errorText}`)
      return { success: false, duration, extractedEntities: 0, createdEntities: 0, errorCount: 1 }
    }

    const result = await response.json()

    if (result.success && result.result) {
      console.log(`⏱️  Processing time: ${duration}ms`)
      console.log(`📊 Extracted: ${result.result.extractedEntities} entities`)
      console.log(`✅ Created: ${result.result.createdEntities} entities`)
      console.log(`📈 Breakdown: ${result.result.summary.contracts}C, ${result.result.summary.expenses}E, ${result.result.summary.receivables}R`)

      const errorCount = result.result.errors ? result.result.errors.length : 0
      if (errorCount > 0) {
        console.log(`⚠️  Errors: ${errorCount}`)
      }

      return {
        success: true,
        duration,
        extractedEntities: result.result.extractedEntities,
        createdEntities: result.result.createdEntities,
        errorCount
      }
    } else {
      console.error('❌ Unexpected response format or failure')
      return { success: false, duration, extractedEntities: 0, createdEntities: 0, errorCount: 1 }
    }

  } catch (error) {
    console.error(`❌ Error processing ${fileName}: ${error}`)
    return { success: false, duration: 0, extractedEntities: 0, createdEntities: 0, errorCount: 1 }
  }
}

async function runPerformanceTests(session: AuthSession): Promise<void> {
  console.log('\n🏁 PERFORMANCE TESTS')
  console.log('=' .repeat(50))

  const testFiles = [
    './sample_data.csv',
    './Testando.xlsx',
    './teste_pdf.pdf'
  ]

  const results = []
  let totalDuration = 0
  let totalExtracted = 0
  let totalCreated = 0
  let totalErrors = 0

  for (const filePath of testFiles) {
    if (fs.existsSync(filePath)) {
      const result = await testSingleFilePerformance(session, filePath)
      results.push({ file: path.basename(filePath), ...result })

      if (result.success) {
        totalDuration += result.duration
        totalExtracted += result.extractedEntities
        totalCreated += result.createdEntities
        totalErrors += result.errorCount
      }
    } else {
      console.log(`⚠️  File not found: ${filePath}`)
    }
  }

  // Performance Summary
  console.log('\n📊 PERFORMANCE SUMMARY')
  console.log('=' .repeat(30))

  const successfulTests = results.filter(r => r.success)
  if (successfulTests.length > 0) {
    const avgDuration = totalDuration / successfulTests.length
    console.log(`⏱️  Average processing time: ${avgDuration.toFixed(0)}ms`)
    console.log(`🎯 Total entities extracted: ${totalExtracted}`)
    console.log(`✅ Total entities created: ${totalCreated}`)
    console.log(`📈 Success rate: ${((totalCreated / totalExtracted) * 100).toFixed(1)}%`)

    if (totalErrors > 0) {
      console.log(`⚠️  Total errors: ${totalErrors}`)
    }

    // Performance Analysis
    console.log('\n🔬 PERFORMANCE ANALYSIS')
    console.log('=' .repeat(30))

    if (avgDuration > 30000) {
      console.log('❌ Performance: POOR - Average >30s per file')
    } else if (avgDuration > 15000) {
      console.log('⚠️  Performance: SLOW - Average >15s per file')
    } else if (avgDuration > 5000) {
      console.log('✅ Performance: GOOD - Average 5-15s per file')
    } else {
      console.log('🚀 Performance: EXCELLENT - Average <5s per file')
    }

    const successRate = (totalCreated / totalExtracted) * 100
    if (successRate > 90) {
      console.log('🎯 Accuracy: EXCELLENT - >90% entities created')
    } else if (successRate > 70) {
      console.log('✅ Accuracy: GOOD - 70-90% entities created')
    } else {
      console.log('⚠️  Accuracy: POOR - <70% entities created')
    }

  } else {
    console.log('❌ No successful tests to analyze')
  }

  // Detailed breakdown
  console.log('\n📋 DETAILED RESULTS')
  console.log('=' .repeat(30))
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.file}: ${result.duration}ms, ${result.extractedEntities}→${result.createdEntities} entities`)
  })
}

async function main() {
  console.log('\n🧪 ONBOARDING INTELLIGENCE AGENT PERFORMANCE TEST')
  console.log('=' .repeat(60))

  try {
    // Step 1: Login
    const session = await loginUser('test@example.com', 'password123')
    console.log(`✅ Logged in as: ${session.email} (Team: ${session.teamId})`)

    // Step 2: Test agent info
    await testAgentInfo(session)

    // Step 3: Run performance tests
    await runPerformanceTests(session)

    console.log('\n✅ Performance testing completed!')
    console.log('\n💡 Manual UI Test Instructions:')
    console.log('   1. Go to http://localhost:3010')
    console.log('   2. Login with: test@example.com / password123')
    console.log('   3. Test the onboarding agent UI performance')

  } catch (error) {
    console.error(`❌ Test failed: ${error}`)
    process.exit(1)
  }
}

main().catch(console.error)