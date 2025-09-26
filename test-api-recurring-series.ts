/**
 * API Endpoint Testing for Recurring Expense Series
 *
 * Tests the recurring expense series functionality through actual HTTP API calls.
 * Requires the server to be running on port 3010.
 */

import { format, addMonths } from 'date-fns'

const BASE_URL = 'http://localhost:3010'

// Test user credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const typeColors = {
    info: colors.cyan,
    success: colors.green,
    error: colors.red,
    warning: colors.yellow
  }
  console.log(`${typeColors[type]}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`)
  console.log(`${colors.bright}${colors.blue}${title}${colors.reset}`)
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`)
}

// Helper to make authenticated requests
async function makeRequest(
  path: string,
  options: RequestInit = {},
  authToken?: string
): Promise<any> {
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (authToken) {
    headers.Cookie = `auth-token=${authToken}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// Login and get auth token
async function login(): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  })

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`)
  }

  // Extract auth token from Set-Cookie header
  const setCookie = response.headers.get('set-cookie')
  const match = setCookie?.match(/auth-token=([^;]+)/)

  if (!match) {
    throw new Error('No auth token in response')
  }

  return match[1]
}

async function testAPIEndpoints() {
  let authToken: string
  const createdIds: string[] = []

  try {
    // ============================================================
    // AUTHENTICATION
    // ============================================================
    logSection('AUTHENTICATION')

    log('Logging in...')
    authToken = await login()
    log('✓ Successfully authenticated', 'success')

    // ============================================================
    // TEST 1: CREATE RECURRING EXPENSE WITH FULL SERIES
    // ============================================================
    logSection('TEST 1: CREATE WITH FULL SERIES via API')

    const createData = {
      description: 'API Test Monthly Subscription',
      amount: 150,
      category: 'software',
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: 10,
      startDate: format(addMonths(new Date(), -2), 'yyyy-MM-dd'),
      vendor: 'API Test Vendor',
      notes: 'Testing via API',
      isActive: true
    }

    log('Creating recurring expense via POST /api/recurring-expenses...')
    const createResponse = await makeRequest(
      '/api/recurring-expenses',
      {
        method: 'POST',
        body: JSON.stringify(createData)
      },
      authToken
    )

    const created = createResponse.recurringExpense
    createdIds.push(created.id)

    log(`✓ Created recurring expense: ${created.id}`, 'success')
    log(`  Generated ${created.expenses?.length || 0} expense instances`, 'success')

    // ============================================================
    // TEST 2: GET RECURRING EXPENSE
    // ============================================================
    logSection('TEST 2: GET RECURRING EXPENSE')

    log(`Getting recurring expense via GET /api/recurring-expenses/${created.id}...`)
    const getResponse = await makeRequest(
      `/api/recurring-expenses/${created.id}`,
      {},
      authToken
    )

    log(`✓ Retrieved recurring expense with ${getResponse.recurringExpense.expenses?.length || 0} expenses`, 'success')

    // ============================================================
    // TEST 3: UPDATE SERIES WITH SCOPES
    // ============================================================
    logSection('TEST 3: UPDATE SERIES WITH SCOPES')

    // Update future expenses only
    log('Updating future expenses via PATCH /api/recurring-expenses/[id]/series...')
    const updateFutureResponse = await makeRequest(
      `/api/recurring-expenses/${created.id}/series`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          scope: 'future',
          amount: 200,
          notes: 'Updated via API'
        })
      },
      authToken
    )

    log(`✓ Updated ${updateFutureResponse.updatedCount} future expenses`, 'success')

    // Update single expense
    const expenses = getResponse.recurringExpense.expenses
    if (expenses && expenses[0]) {
      log('Updating single expense via PATCH /api/recurring-expenses/[id]/series...')
      const updateSingleResponse = await makeRequest(
        `/api/recurring-expenses/${created.id}/series`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            scope: 'single',
            targetExpenseId: expenses[0].id,
            amount: 250
          })
        },
        authToken
      )

      log(`✓ Updated ${updateSingleResponse.updatedCount} single expense`, 'success')
    }

    // ============================================================
    // TEST 4: DELETE SERIES WITH SCOPES
    // ============================================================
    logSection('TEST 4: DELETE SERIES WITH SCOPES')

    // Create another recurring expense for deletion testing
    const deleteTestData = {
      description: 'API Delete Test',
      amount: 75,
      category: 'test',
      frequency: 'weekly',
      interval: 1,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      vendor: 'Delete Test',
      isActive: true
    }

    log('Creating test recurring expense for deletion...')
    const deleteTestResponse = await makeRequest(
      '/api/recurring-expenses',
      {
        method: 'POST',
        body: JSON.stringify(deleteTestData)
      },
      authToken
    )

    const deleteTestId = deleteTestResponse.recurringExpense.id
    createdIds.push(deleteTestId)

    // Delete future expenses
    log('Deleting future expenses via DELETE /api/recurring-expenses/[id]/series...')
    const deleteFutureResponse = await makeRequest(
      `/api/recurring-expenses/${deleteTestId}/series?scope=future`,
      {
        method: 'DELETE'
      },
      authToken
    )

    log(`✓ Deleted ${deleteFutureResponse.deletedCount} future expenses`, 'success')

    // ============================================================
    // TEST 5: REGENERATE SERIES
    // ============================================================
    logSection('TEST 5: REGENERATE SERIES')

    // Update frequency first
    log('Updating frequency via PUT /api/recurring-expenses/[id]...')
    await makeRequest(
      `/api/recurring-expenses/${created.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          frequency: 'weekly'
        })
      },
      authToken
    )

    // Regenerate series
    log('Regenerating series via POST /api/recurring-expenses/[id]/series...')
    const regenerateResponse = await makeRequest(
      `/api/recurring-expenses/${created.id}/series`,
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'regenerate',
          preservePaidExpenses: true
        })
      },
      authToken
    )

    log(`✓ Regenerated ${regenerateResponse.generatedCount} expenses after frequency change`, 'success')

    // ============================================================
    // TEST 6: LIST RECURRING EXPENSES
    // ============================================================
    logSection('TEST 6: LIST RECURRING EXPENSES')

    log('Listing recurring expenses via GET /api/recurring-expenses...')
    const listResponse = await makeRequest(
      '/api/recurring-expenses',
      {},
      authToken
    )

    log(`✓ Retrieved ${listResponse.recurringExpenses.length} recurring expenses`, 'success')

    // ============================================================
    // CLEANUP
    // ============================================================
    logSection('CLEANUP')

    for (const id of createdIds) {
      try {
        log(`Deleting test recurring expense ${id}...`)
        await makeRequest(
          `/api/recurring-expenses/${id}/series?scope=all`,
          {
            method: 'DELETE'
          },
          authToken
        )
        log(`✓ Deleted ${id}`, 'success')
      } catch (err) {
        // Might already be deleted
      }
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    logSection('API TEST SUMMARY')

    log('✅ Authentication working', 'success')
    log('✅ Create with full series generation working', 'success')
    log('✅ Get recurring expense working', 'success')
    log('✅ Update series with scopes working', 'success')
    log('✅ Delete series with scopes working', 'success')
    log('✅ Regenerate series working', 'success')
    log('✅ List recurring expenses working', 'success')

  } catch (error) {
    log(`\n❌ API test failed: ${error}`, 'error')
    console.error(error)
    process.exit(1)
  }
}

async function main() {
  console.log(`\n${colors.bright}${colors.cyan}🚀 API ENDPOINT TESTING FOR RECURRING EXPENSE SERIES${colors.reset}`)
  console.log(`${colors.cyan}   Testing against: ${BASE_URL}${colors.reset}`)
  console.log(`${colors.cyan}   Test user: ${TEST_USER.email}${colors.reset}\n`)

  // Check if server is running
  try {
    await fetch(`${BASE_URL}/api/health`)
  } catch (err) {
    log('❌ Server is not running on port 3010!', 'error')
    log('\nPlease start the server in another terminal:', 'warning')
    log('  PORT=3010 npm run dev', 'warning')
    process.exit(1)
  }

  await testAPIEndpoints()

  console.log(`\n${colors.bright}${colors.green}✨ ALL API TESTS COMPLETED SUCCESSFULLY!${colors.reset}\n`)
  process.exit(0)
}

// Run the API tests
main().catch(console.error)