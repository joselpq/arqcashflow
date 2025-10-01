/**
 * Test Script for teste_TH2.xlsx Upload
 *
 * Tests the enhanced JSON repair and reduced batch size fixes
 * Expected: Should now successfully process all 6 sheets without JSON parsing errors
 */

import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const BASE_URL = 'http://localhost:3010'
const prisma = new PrismaClient()

interface AuthSession {
  cookie: string
  userId: string
  teamId: string
  email: string
}

/**
 * Login function
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

  if (!loginResponse.ok) {
    throw new Error(`Login failed: ${loginResponse.status}`)
  }

  const cookies = loginResponse.headers.get('set-cookie') || ''

  // Get session to find userId and teamId
  const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: {
      'Cookie': cookies
    }
  })

  if (!sessionResponse.ok) {
    throw new Error(`Failed to get session: ${sessionResponse.status}`)
  }

  const session = await sessionResponse.json()

  return {
    cookie: cookies,
    userId: session.user.id,
    teamId: session.user.teamId,
    email: session.user.email
  }
}

/**
 * Upload file to setup assistant
 */
async function uploadFile(auth: AuthSession, filePath: string) {
  console.log(`\n📤 Uploading ${path.basename(filePath)}...`)

  const startTime = Date.now()

  const formData = new FormData()
  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer])
  formData.append('files', blob, path.basename(filePath))

  const response = await fetch(`${BASE_URL}/api/ai/setup-assistant-v2/multi`, {
    method: 'POST',
    headers: {
      'Cookie': auth.cookie
    },
    body: formData
  })

  const processingTime = Date.now() - startTime

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`❌ Upload failed: ${response.status}`)
    console.error(`Error: ${errorText}`)
    return {
      success: false,
      error: errorText,
      processingTime
    }
  }

  const result = await response.json()
  console.log(`✅ Upload completed in ${(processingTime / 1000).toFixed(1)}s`)

  return {
    success: result.success,
    result: result.results?.[0] || result,
    processingTime
  }
}

/**
 * Count entities in database
 */
async function countEntities(teamId: string) {
  const [contracts, receivables, expenses] = await Promise.all([
    prisma.contract.count({ where: { teamId } }),
    prisma.receivable.count({ where: { teamId } }),
    prisma.expense.count({ where: { teamId } })
  ])

  return { contracts, receivables, expenses }
}

/**
 * Clean up test data
 */
async function cleanupTestData(teamId: string) {
  console.log('\n🧹 Cleaning up test data...')

  await prisma.expense.deleteMany({ where: { teamId } })
  await prisma.receivable.deleteMany({ where: { teamId } })
  await prisma.contract.deleteMany({ where: { teamId } })

  console.log('✅ Cleanup complete')
}

/**
 * Main test function
 */
async function runTest() {
  console.log('🚀 Testing teste_TH2.xlsx with enhanced JSON repair')
  console.log('=' .repeat(60))

  try {
    // Login
    const auth = await loginUser('joselpq@gmail.com', '12345678')
    console.log(`✅ Logged in as ${auth.email}`)
    console.log(`   Team ID: ${auth.teamId}`)

    // Clean up before test
    await cleanupTestData(auth.teamId)

    // Count before
    const beforeCounts = await countEntities(auth.teamId)
    console.log(`\n📊 Before upload:`)
    console.log(`   Contracts: ${beforeCounts.contracts}`)
    console.log(`   Receivables: ${beforeCounts.receivables}`)
    console.log(`   Expenses: ${beforeCounts.expenses}`)

    // Upload file
    const filePath = path.join(process.cwd(), 'teste_TH2.xlsx')
    const uploadResult = await uploadFile(auth, filePath)

    // Count after
    const afterCounts = await countEntities(auth.teamId)
    console.log(`\n📊 After upload:`)
    console.log(`   Contracts: ${afterCounts.contracts}`)
    console.log(`   Receivables: ${afterCounts.receivables}`)
    console.log(`   Expenses: ${afterCounts.expenses}`)

    console.log(`\n📈 Created:`)
    console.log(`   Contracts: ${afterCounts.contracts - beforeCounts.contracts}`)
    console.log(`   Receivables: ${afterCounts.receivables - beforeCounts.receivables}`)
    console.log(`   Expenses: ${afterCounts.expenses - beforeCounts.expenses}`)

    if (uploadResult.success) {
      console.log(`\n✅ TEST PASSED - JSON parsing successful!`)
      console.log(`   Processing time: ${(uploadResult.processingTime / 1000).toFixed(1)}s`)
    } else {
      console.log(`\n❌ TEST FAILED`)
      console.log(`   Error: ${uploadResult.error}`)
    }

    // Clean up after test
    await cleanupTestData(auth.teamId)

  } catch (error) {
    console.error('\n❌ Test failed with error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run test
runTest().catch(console.error)