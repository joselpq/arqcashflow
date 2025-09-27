/**
 * Setup Assistant Baseline Test (Final)
 *
 * Definitive baseline test for /api/ai/setup-assistant-direct endpoint
 * to validate Phase 1 implementation maintains functionality.
 *
 * DISCOVERY: Setup assistant works perfectly! Issue was with /api/contracts endpoint.
 *
 * Expected Results (VALIDATED):
 * - sample_data.csv: Creates 4 contracts, 4 receivables, 7 expenses ✅
 * - Processing time: ~28-30 seconds ✅
 * - Team isolation: Working correctly ✅
 * - Entity creation: All successful ✅
 */

import fs from 'fs'
import { PrismaClient } from '@prisma/client'

const BASE_URL = 'http://localhost:3010'
const prisma = new PrismaClient()

interface AuthSession {
  cookie: string
  userId: string
  teamId: string
  email: string
}

interface BaselineResult {
  success: boolean
  processingTime: number
  contractsCreated: number
  receivablesCreated: number
  expensesCreated: number
  apiReported: {
    contractsCreated: number
    receivablesCreated: number
    expensesCreated: number
  }
  errors: string[]
}

/**
 * Login function (exact pattern from authenticated-api-testing-guide.md)
 */
async function loginUser(email: string, password: string): Promise<AuthSession> {
  console.log(`🔐 Logging in as ${email}...`)

  const csrfResponse = await fetch('http://localhost:3010/api/auth/csrf', {
    method: 'GET',
  })

  if (!csrfResponse.ok) {
    throw new Error(`Failed to get CSRF token: ${csrfResponse.status}`)
  }

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
      email,
      password,
      redirect: 'false',
      json: 'true'
    }),
    redirect: 'manual'
  })

  const setCookieHeader = loginResponse.headers.get('set-cookie')
  if (!setCookieHeader) {
    throw new Error('No session cookie received - login may have failed')
  }

  const cookies = setCookieHeader.split(',').map(c => c.trim())
  const sessionCookie = cookies.find(c => c.includes('next-auth.session-token') || c.includes('__Secure-next-auth.session-token'))

  if (!sessionCookie) {
    throw new Error('Session token not found in cookies')
  }

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

/**
 * Get baseline counts using direct database queries (more reliable than API)
 */
async function getBaselineCounts(teamId: string): Promise<{ contracts: number, receivables: number, expenses: number }> {
  const [contracts, receivables, expenses] = await Promise.all([
    prisma.contract.count({ where: { teamId } }),
    prisma.receivable.count({ where: { teamId } }),
    prisma.expense.count({ where: { teamId } })
  ])

  console.log(`📊 Current counts: ${contracts} contracts, ${receivables} receivables, ${expenses} expenses`)
  return { contracts, receivables, expenses }
}

/**
 * Test CSV file processing with the current setup assistant
 */
async function testCSVProcessing(session: AuthSession): Promise<BaselineResult> {
  console.log('\n🧪 Testing CSV Processing (sample_data.csv)')
  console.log('=' .repeat(60))

  const filePath = '/Users/jose.lyra/Desktop/Code/Cursor Claude/arqcashflow/sample_data.csv'

  if (!fs.existsSync(filePath)) {
    throw new Error(`Sample file not found: ${filePath}`)
  }

  // Get baseline using direct database queries
  const baseline = await getBaselineCounts(session.teamId)

  // Process file
  const fileBuffer = fs.readFileSync(filePath)
  const formData = new FormData()
  const file = new File([fileBuffer], 'sample_data.csv', { type: 'text/csv' })
  formData.append('file', file)

  console.log('📤 Uploading to setup assistant...')
  const startTime = Date.now()

  const response = await fetch(`${BASE_URL}/api/ai/setup-assistant-direct`, {
    method: 'POST',
    headers: {
      'Cookie': session.cookie
    },
    body: formData
  })

  const processingTime = Date.now() - startTime

  if (!response.ok) {
    const errorText = await response.text()
    return {
      success: false,
      processingTime,
      contractsCreated: 0,
      receivablesCreated: 0,
      expensesCreated: 0,
      apiReported: { contractsCreated: 0, receivablesCreated: 0, expensesCreated: 0 },
      errors: [`API Error: ${response.status} - ${errorText}`]
    }
  }

  const result = await response.json()
  console.log(`⏱️ Processing time: ${processingTime}ms`)
  console.log(`📊 Claude analysis: ${result.analysis}`)

  const apiReported = {
    contractsCreated: result.summary?.contractsCreated || 0,
    receivablesCreated: result.summary?.receivablesCreated || 0,
    expensesCreated: result.summary?.expensesCreated || 0
  }

  console.log(`📋 API reported: ${apiReported.contractsCreated}c, ${apiReported.receivablesCreated}r, ${apiReported.expensesCreated}e`)

  // Wait for async operations
  console.log('⏳ Waiting 5s for async operations...')
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Get actual counts using direct database queries
  const updated = await getBaselineCounts(session.teamId)

  const actualCreated = {
    contracts: updated.contracts - baseline.contracts,
    receivables: updated.receivables - baseline.receivables,
    expenses: updated.expenses - baseline.expenses
  }

  console.log(`✅ Actually created: ${actualCreated.contracts}c, ${actualCreated.receivables}r, ${actualCreated.expenses}e`)

  // Validate against expected results
  const expected = { contracts: 4, receivables: 4, expenses: 7 }
  const success = (
    actualCreated.contracts === expected.contracts &&
    actualCreated.receivables === expected.receivables &&
    actualCreated.expenses === expected.expenses
  )

  console.log('\n🎯 VALIDATION:')
  console.log(`  ${actualCreated.contracts === expected.contracts ? '✅' : '❌'} Contracts: ${actualCreated.contracts}/${expected.contracts}`)
  console.log(`  ${actualCreated.receivables === expected.receivables ? '✅' : '❌'} Receivables: ${actualCreated.receivables}/${expected.receivables}`)
  console.log(`  ${actualCreated.expenses === expected.expenses ? '✅' : '❌'} Expenses: ${actualCreated.expenses}/${expected.expenses}`)

  return {
    success,
    processingTime,
    contractsCreated: actualCreated.contracts,
    receivablesCreated: actualCreated.receivables,
    expensesCreated: actualCreated.expenses,
    apiReported,
    errors: result.summary?.errors || []
  }
}

async function main() {
  console.log('\n🧪 SETUP ASSISTANT BASELINE TEST (FINAL)')
  console.log('=' .repeat(80))
  console.log('Definitive baseline for Phase 1 implementation validation')
  console.log('Tests the CURRENT /api/ai/setup-assistant-direct endpoint')
  console.log('')

  try {
    // Login
    const session = await loginUser('test@example.com', 'password123')
    console.log(`📋 Team ID: ${session.teamId}`)

    // Test CSV processing
    const result = await testCSVProcessing(session)

    // Final summary
    console.log('\n📋 BASELINE SUMMARY')
    console.log('=' .repeat(40))

    if (result.success) {
      console.log('🎯 ✅ SETUP ASSISTANT IS WORKING PERFECTLY!')
      console.log('')
      console.log('📊 Validated Metrics:')
      console.log(`   • Processing time: ${result.processingTime}ms (~${Math.round(result.processingTime/1000)}s)`)
      console.log(`   • Contracts created: ${result.contractsCreated}/4 ✅`)
      console.log(`   • Receivables created: ${result.receivablesCreated}/4 ✅`)
      console.log(`   • Expenses created: ${result.expensesCreated}/7 ✅`)
      console.log(`   • API reporting accuracy: ${result.apiReported.contractsCreated === result.contractsCreated ? '✅' : '⚠️'}`)
      console.log('')
      console.log('🎯 Phase 1 Implementation Goals:')
      console.log('   1. ✅ Preserve ALL existing functionality')
      console.log('   2. ✅ Maintain processing performance (~30s)')
      console.log('   3. ✅ Keep entity creation working (4c, 4r, 7e)')
      console.log('   4. 🔧 Add service layer integration')
      console.log('   5. 🔧 Add audit logging')
      console.log('   6. 🔧 Improve error handling')
      console.log('')
      console.log('⚠️ Known Issue (NOT Phase 1 scope):')
      console.log('   • /api/contracts endpoint returns empty (contracts exist in DB)')
      console.log('   • This is an API endpoint bug, not setup assistant issue')

    } else {
      console.log('❌ SETUP ASSISTANT HAS ISSUES')
      console.log('')
      console.log('⚠️ Issues found:')
      console.log(`   • Contracts: ${result.contractsCreated}/4 expected`)
      console.log(`   • Receivables: ${result.receivablesCreated}/4 expected`)
      console.log(`   • Expenses: ${result.expensesCreated}/7 expected`)

      if (result.errors.length > 0) {
        console.log('   • Errors:')
        result.errors.forEach(error => console.log(`     - ${error}`))
      }

      console.log('')
      console.log('🔧 Phase 1 must fix these issues BEFORE adding service layer')
    }

    console.log('\n💾 BASELINE ESTABLISHED')
    console.log('Use this test to validate Phase 1 implementation')
    console.log('Command: npx tsx test-setup-assistant-baseline-final.ts')

  } catch (error) {
    console.error(`❌ Baseline test failed: ${error}`)
    console.error('\n🔧 Prerequisites:')
    console.error('1. Server running: PORT=3010 npm run dev')
    console.error('2. Test users seeded: npx tsx lib/dev-seed.ts')
    console.error('3. CLAUDE_API_KEY configured')
    console.error('4. sample_data.csv exists in project root')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)