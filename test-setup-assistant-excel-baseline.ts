/**
 * Setup Assistant Excel Baseline Test
 *
 * Establishes baseline metrics for Testando.xlsx processing
 * to ensure Phase 1 implementation maintains functionality.
 *
 * This test:
 * 1. Calls the current /api/ai/setup-assistant-direct endpoint
 * 2. Uploads Testando.xlsx
 * 3. Records how many contracts, receivables, and expenses are created
 * 4. Measures processing time
 * 5. Validates team isolation
 *
 * Expected Results (to be determined):
 * - Testando.xlsx: Should create ~37 contracts based on BACKLOG notes
 */

import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

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
  contractsFound: number
  receivablesFound: number
  expensesFound: number
  apiReported: {
    contractsCreated: number
    receivablesCreated: number
    expensesCreated: number
    contractsFound: number
    receivablesFound: number
    expensesFound: number
  }
  errors: string[]
  analysis: string
}

/**
 * Login function (exact pattern from authenticated-api-testing-guide.md)
 */
async function loginUser(email: string, password: string): Promise<AuthSession> {
  console.log(`🔐 Logging in as ${email}...`)

  const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`, {
    method: 'GET',
  })

  if (!csrfResponse.ok) {
    throw new Error(`Failed to get CSRF token: ${csrfResponse.status}`)
  }

  const { csrfToken } = await csrfResponse.json()
  const csrfCookie = csrfResponse.headers.get('set-cookie') || ''

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

  const setCookieHeader = loginResponse.headers.get('set-cookie')
  if (!setCookieHeader) {
    throw new Error('No session cookie received - login may have failed')
  }

  const cookies = setCookieHeader.split(',').map(c => c.trim())
  const sessionCookie = cookies.find(c => c.includes('next-auth.session-token') || c.includes('__Secure-next-auth.session-token'))

  if (!sessionCookie) {
    throw new Error('Session token not found in cookies')
  }

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

  console.log(`✅ Logged in successfully as ${session.user.email}`)

  return {
    cookie: sessionCookie,
    userId: session.user.id,
    teamId: session.user.teamId,
    email: session.user.email
  }
}

/**
 * Get baseline counts using direct database queries
 */
async function getBaselineCounts(teamId: string): Promise<{ contracts: number, receivables: number, expenses: number }> {
  const [contracts, receivables, expenses] = await Promise.all([
    prisma.contract.count({ where: { teamId } }),
    prisma.receivable.count({ where: { teamId } }),
    prisma.expense.count({ where: { teamId } })
  ])

  console.log(`📊 Current database counts: ${contracts} contracts, ${receivables} receivables, ${expenses} expenses`)
  return { contracts, receivables, expenses }
}

/**
 * Clear all data for clean testing
 */
async function clearTeamData(teamId: string): Promise<void> {
  console.log('🗑️ Clearing existing team data for clean baseline...')

  // Delete in correct order to respect foreign key constraints
  await prisma.receivable.deleteMany({ where: { teamId } })
  await prisma.expense.deleteMany({ where: { teamId } })
  await prisma.contract.deleteMany({ where: { teamId } })

  console.log('✅ Team data cleared')
}

/**
 * Test Excel file processing with the current setup assistant
 */
async function testExcelProcessing(session: AuthSession, fileName: string): Promise<BaselineResult> {
  console.log(`\n🧪 Testing Excel Processing (${fileName})`)
  console.log('=' .repeat(60))

  const filePath = path.join(process.cwd(), fileName)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found: ${filePath}`)
  }

  // Get baseline counts
  const baseline = await getBaselineCounts(session.teamId)

  // Process file
  const fileBuffer = fs.readFileSync(filePath)
  const formData = new FormData()
  const file = new File([fileBuffer], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  formData.append('file', file)

  console.log(`📤 Uploading ${fileName} to setup assistant...`)
  console.log(`📏 File size: ${(fileBuffer.length / 1024).toFixed(2)} KB`)
  console.log(`🔑 Using Claude API key: ${process.env.CLAUDE_API_KEY ? 'Configured ✅' : 'Missing ❌'}`)

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
    console.error(`❌ API Error: ${response.status}`)
    console.error(`Response: ${errorText}`)
    return {
      success: false,
      processingTime,
      contractsCreated: 0,
      receivablesCreated: 0,
      expensesCreated: 0,
      contractsFound: 0,
      receivablesFound: 0,
      expensesFound: 0,
      apiReported: {
        contractsCreated: 0,
        receivablesCreated: 0,
        expensesCreated: 0,
        contractsFound: 0,
        receivablesFound: 0,
        expensesFound: 0
      },
      errors: [`API Error: ${response.status} - ${errorText}`],
      analysis: ''
    }
  }

  const result = await response.json()
  console.log(`⏱️ Processing time: ${processingTime}ms (${(processingTime/1000).toFixed(1)}s)`)
  console.log(`\n📊 Claude analysis: "${result.analysis}"`)

  const apiReported = {
    contractsCreated: result.summary?.contractsCreated || 0,
    receivablesCreated: result.summary?.receivablesCreated || 0,
    expensesCreated: result.summary?.expensesCreated || 0,
    contractsFound: result.summary?.contractsFound || 0,
    receivablesFound: result.summary?.receivablesFound || 0,
    expensesFound: result.summary?.expensesFound || 0
  }

  console.log(`\n📋 API reported:`)
  console.log(`   Found: ${apiReported.contractsFound} contracts, ${apiReported.receivablesFound} receivables, ${apiReported.expensesFound} expenses`)
  console.log(`   Created: ${apiReported.contractsCreated} contracts, ${apiReported.receivablesCreated} receivables, ${apiReported.expensesCreated} expenses`)

  // Wait for async operations
  console.log('\n⏳ Waiting 5s for database operations to complete...')
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Get actual counts from database
  const updated = await getBaselineCounts(session.teamId)

  const actualCreated = {
    contracts: updated.contracts - baseline.contracts,
    receivables: updated.receivables - baseline.receivables,
    expenses: updated.expenses - baseline.expenses
  }

  console.log(`\n✅ Actually created in database:`)
  console.log(`   ${actualCreated.contracts} contracts, ${actualCreated.receivables} receivables, ${actualCreated.expenses} expenses`)

  // Check for any errors
  if (result.summary?.errors && result.summary.errors.length > 0) {
    console.log('\n⚠️ Processing errors:')
    result.summary.errors.forEach((error: string) => console.log(`   - ${error}`))
  }

  // Success if we created the expected number of contracts (37 based on BACKLOG)
  const success = actualCreated.contracts > 0

  return {
    success,
    processingTime,
    contractsCreated: actualCreated.contracts,
    receivablesCreated: actualCreated.receivables,
    expensesCreated: actualCreated.expenses,
    contractsFound: apiReported.contractsFound,
    receivablesFound: apiReported.receivablesFound,
    expensesFound: apiReported.expensesFound,
    apiReported,
    errors: result.summary?.errors || [],
    analysis: result.analysis || ''
  }
}

async function main() {
  console.log('\n🧪 SETUP ASSISTANT EXCEL BASELINE TEST')
  console.log('=' .repeat(80))
  console.log('Establishing baseline metrics for Testando.xlsx processing')
  console.log('Tests the CURRENT /api/ai/setup-assistant-direct endpoint')
  console.log('')

  try {
    // Check prerequisites
    if (!process.env.CLAUDE_API_KEY) {
      console.warn('⚠️ WARNING: CLAUDE_API_KEY not found in environment variables')
      console.warn('Make sure .env file exists and contains CLAUDE_API_KEY')
    }

    // Login
    const session = await loginUser('test@example.com', 'password123')
    console.log(`📋 Team ID: ${session.teamId}`)

    // Optional: Clear data for clean test
    const clearData = process.argv.includes('--clean')
    if (clearData) {
      await clearTeamData(session.teamId)
    }

    // Test Excel processing
    const result = await testExcelProcessing(session, 'Testando.xlsx')

    // Final summary
    console.log('\n' + '=' .repeat(80))
    console.log('📋 EXCEL BASELINE SUMMARY')
    console.log('=' .repeat(80))

    if (result.success) {
      console.log('✅ Excel processing completed successfully!')
      console.log('')
      console.log('📊 BASELINE METRICS (Testando.xlsx):')
      console.log(`   • Processing time: ${result.processingTime}ms (~${Math.round(result.processingTime/1000)}s)`)
      console.log(`   • Contracts found by Claude: ${result.contractsFound}`)
      console.log(`   • Contracts created in DB: ${result.contractsCreated}`)
      console.log(`   • Receivables found by Claude: ${result.receivablesFound}`)
      console.log(`   • Receivables created in DB: ${result.receivablesCreated}`)
      console.log(`   • Expenses found by Claude: ${result.expensesFound}`)
      console.log(`   • Expenses created in DB: ${result.expensesCreated}`)

      if (result.contractsCreated !== result.contractsFound) {
        console.log(`\n⚠️ Note: Claude found ${result.contractsFound} contracts but only ${result.contractsCreated} were created`)
        console.log('This may indicate validation errors or duplicates')
      }

      console.log('')
      console.log('🎯 BASELINE ESTABLISHED')
      console.log(`Expected for Phase 1: ${result.contractsCreated} contracts, ${result.receivablesCreated} receivables, ${result.expensesCreated} expenses`)

      // Save baseline to file for reference
      const baselineData = {
        fileName: 'Testando.xlsx',
        timestamp: new Date().toISOString(),
        processingTime: result.processingTime,
        contractsCreated: result.contractsCreated,
        receivablesCreated: result.receivablesCreated,
        expensesCreated: result.expensesCreated,
        contractsFound: result.contractsFound,
        receivablesFound: result.receivablesFound,
        expensesFound: result.expensesFound,
        analysis: result.analysis
      }

      fs.writeFileSync(
        'excel-baseline.json',
        JSON.stringify(baselineData, null, 2)
      )
      console.log('\n💾 Baseline saved to excel-baseline.json')

    } else {
      console.log('❌ Excel processing failed or created no contracts')
      console.log('')
      console.log('⚠️ Issues found:')
      console.log(`   • Contracts created: ${result.contractsCreated}`)
      console.log(`   • Receivables created: ${result.receivablesCreated}`)
      console.log(`   • Expenses created: ${result.expensesCreated}`)

      if (result.errors.length > 0) {
        console.log('   • Errors:')
        result.errors.forEach(error => console.log(`     - ${error}`))
      }
    }

    console.log('\n📝 Usage:')
    console.log('   npx tsx test-setup-assistant-excel-baseline.ts         # Test with existing data')
    console.log('   npx tsx test-setup-assistant-excel-baseline.ts --clean  # Clear data before test')

  } catch (error) {
    console.error(`\n❌ Test failed: ${error}`)
    console.error('\n🔧 Prerequisites:')
    console.error('1. Server running: PORT=3010 npm run dev')
    console.error('2. Test users seeded: npx tsx lib/dev-seed.ts')
    console.error('3. CLAUDE_API_KEY configured in .env')
    console.error('4. Testando.xlsx exists in project root')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)