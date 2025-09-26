/**
 * Comprehensive CRUD Testing for All Entities
 *
 * This script tests Create, Read, Update, Delete operations for:
 * - Contracts
 * - Receivables
 * - Expenses
 * - Recurring Expenses
 *
 * Uses authenticated requests with proper team context
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE_URL = 'http://localhost:3010'

// Test credentials - using existing test user
const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'test123'
}

interface TestResults {
  entity: string
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
  errors: string[]
}

// Helper to get auth cookie
async function authenticate(): Promise<string> {
  console.log('🔐 Authenticating test user...')

  try {
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password,
        csrfToken: '', // In test environment
        callbackUrl: '/',
        json: 'true'
      }),
      redirect: 'manual'
    })

    const cookies = response.headers.get('set-cookie')
    if (!cookies) {
      throw new Error('No authentication cookies received')
    }

    console.log('✅ Authentication successful')
    return cookies
  } catch (error) {
    console.error('❌ Authentication failed:', error)
    throw error
  }
}

// Test Contracts CRUD
async function testContractsCRUD(authCookie: string): Promise<TestResults> {
  console.log('\n📄 Testing CONTRACTS CRUD Operations...')
  const results: TestResults = {
    entity: 'Contracts',
    create: false,
    read: false,
    update: false,
    delete: false,
    errors: []
  }

  try {
    // CREATE
    console.log('  → Testing CREATE...')
    const createResponse = await fetch(`${BASE_URL}/api/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        clientName: 'Test Client CRUD',
        projectName: 'Test Project CRUD',
        description: 'Testing CRUD operations',
        totalValue: 50000,
        signedDate: '2025-01-15',
        status: 'active',
        category: 'commercial'
      })
    })

    if (!createResponse.ok) {
      const error = await createResponse.text()
      results.errors.push(`Create failed: ${error}`)
      console.log(`  ❌ CREATE failed: ${error}`)
    } else {
      const { contract } = await createResponse.json()
      results.create = true
      console.log(`  ✅ CREATE successful - ID: ${contract.id}`)

      // READ
      console.log('  → Testing READ...')
      const readResponse = await fetch(`${BASE_URL}/api/contracts?status=active`, {
        headers: { 'Cookie': authCookie }
      })

      if (!readResponse.ok) {
        results.errors.push(`Read failed: ${await readResponse.text()}`)
      } else {
        const contracts = await readResponse.json()
        results.read = contracts.length > 0
        console.log(`  ✅ READ successful - Found ${contracts.length} contracts`)
      }

      // UPDATE
      console.log('  → Testing UPDATE...')
      const updateResponse = await fetch(`${BASE_URL}/api/contracts/${contract.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookie
        },
        body: JSON.stringify({
          clientName: 'Updated Test Client',
          projectName: contract.projectName,
          totalValue: 60000,
          signedDate: contract.signedDate
        })
      })

      if (!updateResponse.ok) {
        results.errors.push(`Update failed: ${await updateResponse.text()}`)
        console.log(`  ❌ UPDATE failed`)
      } else {
        results.update = true
        console.log(`  ✅ UPDATE successful`)
      }

      // DELETE
      console.log('  → Testing DELETE...')
      const deleteResponse = await fetch(`${BASE_URL}/api/contracts/${contract.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': authCookie }
      })

      if (!deleteResponse.ok) {
        results.errors.push(`Delete failed: ${await deleteResponse.text()}`)
        console.log(`  ❌ DELETE failed`)
      } else {
        results.delete = true
        console.log(`  ✅ DELETE successful`)
      }
    }
  } catch (error) {
    results.errors.push(`Unexpected error: ${error}`)
    console.error('  ❌ Unexpected error:', error)
  }

  return results
}

// Test Receivables CRUD
async function testReceivablesCRUD(authCookie: string): Promise<TestResults> {
  console.log('\n💰 Testing RECEIVABLES CRUD Operations...')
  const results: TestResults = {
    entity: 'Receivables',
    create: false,
    read: false,
    update: false,
    delete: false,
    errors: []
  }

  try {
    // First create a contract for the receivable
    const contractResponse = await fetch(`${BASE_URL}/api/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        clientName: 'Receivable Test Client',
        projectName: 'Receivable Test Project',
        totalValue: 30000,
        signedDate: '2025-01-10'
      })
    })

    const { contract } = await contractResponse.json()

    // CREATE Receivable
    console.log('  → Testing CREATE...')
    const createResponse = await fetch(`${BASE_URL}/api/receivables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        contractId: contract.id,
        description: 'Test Receivable',
        expectedAmount: 10000,
        expectedDate: '2025-02-01',
        status: 'pending'
      })
    })

    if (!createResponse.ok) {
      const error = await createResponse.text()
      results.errors.push(`Create failed: ${error}`)
      console.log(`  ❌ CREATE failed: ${error}`)
    } else {
      const { receivable } = await createResponse.json()
      results.create = true
      console.log(`  ✅ CREATE successful - ID: ${receivable.id}`)

      // READ
      console.log('  → Testing READ...')
      const readResponse = await fetch(`${BASE_URL}/api/receivables?contractId=${contract.id}`, {
        headers: { 'Cookie': authCookie }
      })

      if (!readResponse.ok) {
        results.errors.push(`Read failed: ${await readResponse.text()}`)
      } else {
        const receivables = await readResponse.json()
        results.read = receivables.length > 0
        console.log(`  ✅ READ successful - Found ${receivables.length} receivables`)
      }

      // UPDATE
      console.log('  → Testing UPDATE...')
      const updateResponse = await fetch(`${BASE_URL}/api/receivables/${receivable.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookie
        },
        body: JSON.stringify({
          description: 'Updated Receivable',
          expectedAmount: 12000,
          status: 'paid',
          receivedAmount: 12000,
          receivedDate: '2025-02-05'
        })
      })

      if (!updateResponse.ok) {
        results.errors.push(`Update failed: ${await updateResponse.text()}`)
        console.log(`  ❌ UPDATE failed`)
      } else {
        results.update = true
        console.log(`  ✅ UPDATE successful`)
      }

      // DELETE
      console.log('  → Testing DELETE...')
      const deleteResponse = await fetch(`${BASE_URL}/api/receivables/${receivable.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': authCookie }
      })

      if (!deleteResponse.ok) {
        results.errors.push(`Delete failed: ${await deleteResponse.text()}`)
        console.log(`  ❌ DELETE failed`)
      } else {
        results.delete = true
        console.log(`  ✅ DELETE successful`)
      }

      // Clean up contract
      await fetch(`${BASE_URL}/api/contracts/${contract.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': authCookie }
      })
    }
  } catch (error) {
    results.errors.push(`Unexpected error: ${error}`)
    console.error('  ❌ Unexpected error:', error)
  }

  return results
}

// Test Expenses CRUD
async function testExpensesCRUD(authCookie: string): Promise<TestResults> {
  console.log('\n💸 Testing EXPENSES CRUD Operations...')
  const results: TestResults = {
    entity: 'Expenses',
    create: false,
    read: false,
    update: false,
    delete: false,
    errors: []
  }

  try {
    // CREATE
    console.log('  → Testing CREATE...')
    const createResponse = await fetch(`${BASE_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        description: 'Test Expense',
        amount: 500,
        dueDate: '2025-02-15',
        category: 'office',
        type: 'operational',
        vendor: 'Test Vendor',
        status: 'pending'
      })
    })

    if (!createResponse.ok) {
      const error = await createResponse.text()
      results.errors.push(`Create failed: ${error}`)
      console.log(`  ❌ CREATE failed: ${error}`)
    } else {
      const { expense } = await createResponse.json()
      results.create = true
      console.log(`  ✅ CREATE successful - ID: ${expense.id}`)

      // READ
      console.log('  → Testing READ...')
      const readResponse = await fetch(`${BASE_URL}/api/expenses?status=pending`, {
        headers: { 'Cookie': authCookie }
      })

      if (!readResponse.ok) {
        results.errors.push(`Read failed: ${await readResponse.text()}`)
      } else {
        const response = await readResponse.json()
        const expenses = response.expenses || response
        results.read = expenses.length > 0
        console.log(`  ✅ READ successful - Found ${expenses.length} expenses`)
      }

      // UPDATE
      console.log('  → Testing UPDATE...')
      const updateResponse = await fetch(`${BASE_URL}/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookie
        },
        body: JSON.stringify({
          description: 'Updated Expense',
          amount: 600,
          status: 'paid',
          paidDate: '2025-02-16'
        })
      })

      if (!updateResponse.ok) {
        results.errors.push(`Update failed: ${await updateResponse.text()}`)
        console.log(`  ❌ UPDATE failed`)
      } else {
        results.update = true
        console.log(`  ✅ UPDATE successful`)
      }

      // DELETE
      console.log('  → Testing DELETE...')
      const deleteResponse = await fetch(`${BASE_URL}/api/expenses/${expense.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': authCookie }
      })

      if (!deleteResponse.ok) {
        results.errors.push(`Delete failed: ${await deleteResponse.text()}`)
        console.log(`  ❌ DELETE failed`)
      } else {
        results.delete = true
        console.log(`  ✅ DELETE successful`)
      }
    }
  } catch (error) {
    results.errors.push(`Unexpected error: ${error}`)
    console.error('  ❌ Unexpected error:', error)
  }

  return results
}

// Test Recurring Expenses CRUD
async function testRecurringExpensesCRUD(authCookie: string): Promise<TestResults> {
  console.log('\n🔄 Testing RECURRING EXPENSES CRUD Operations...')
  const results: TestResults = {
    entity: 'Recurring Expenses',
    create: false,
    read: false,
    update: false,
    delete: false,
    errors: []
  }

  try {
    // CREATE
    console.log('  → Testing CREATE...')
    const createResponse = await fetch(`${BASE_URL}/api/recurring-expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify({
        description: 'Test Recurring Expense',
        amount: 1000,
        frequency: 'monthly',
        category: 'subscription',
        vendor: 'Test Service Provider',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        dayOfMonth: 15,
        isActive: true
      })
    })

    if (!createResponse.ok) {
      const error = await createResponse.text()
      results.errors.push(`Create failed: ${error}`)
      console.log(`  ❌ CREATE failed: ${error}`)
    } else {
      const { recurringExpense } = await createResponse.json()
      results.create = true
      console.log(`  ✅ CREATE successful - ID: ${recurringExpense.id}`)

      // READ
      console.log('  → Testing READ...')
      const readResponse = await fetch(`${BASE_URL}/api/recurring-expenses?isActive=true`, {
        headers: { 'Cookie': authCookie }
      })

      if (!readResponse.ok) {
        results.errors.push(`Read failed: ${await readResponse.text()}`)
      } else {
        const { recurringExpenses } = await readResponse.json()
        results.read = recurringExpenses.length > 0
        console.log(`  ✅ READ successful - Found ${recurringExpenses.length} recurring expenses`)
      }

      // UPDATE
      console.log('  → Testing UPDATE...')
      const updateResponse = await fetch(`${BASE_URL}/api/recurring-expenses/${recurringExpense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': authCookie
        },
        body: JSON.stringify({
          description: 'Updated Recurring Expense',
          amount: 1200,
          isActive: false
        })
      })

      if (!updateResponse.ok) {
        results.errors.push(`Update failed: ${await updateResponse.text()}`)
        console.log(`  ❌ UPDATE failed`)
      } else {
        results.update = true
        console.log(`  ✅ UPDATE successful`)
      }

      // DELETE
      console.log('  → Testing DELETE...')
      const deleteResponse = await fetch(`${BASE_URL}/api/recurring-expenses/${recurringExpense.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': authCookie }
      })

      if (!deleteResponse.ok) {
        results.errors.push(`Delete failed: ${await deleteResponse.text()}`)
        console.log(`  ❌ DELETE failed`)
      } else {
        results.delete = true
        console.log(`  ✅ DELETE successful`)
      }
    }
  } catch (error) {
    results.errors.push(`Unexpected error: ${error}`)
    console.error('  ❌ Unexpected error:', error)
  }

  return results
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive CRUD Testing')
  console.log('=====================================\n')

  const allResults: TestResults[] = []

  try {
    // Get authentication cookie
    const authCookie = await authenticate()

    // Run all CRUD tests
    allResults.push(await testContractsCRUD(authCookie))
    allResults.push(await testReceivablesCRUD(authCookie))
    allResults.push(await testExpensesCRUD(authCookie))
    allResults.push(await testRecurringExpensesCRUD(authCookie))

    // Print summary
    console.log('\n=====================================')
    console.log('📊 TEST SUMMARY')
    console.log('=====================================\n')

    let totalPassed = 0
    let totalFailed = 0

    for (const result of allResults) {
      const operations = ['create', 'read', 'update', 'delete']
      const passed = operations.filter(op => result[op as keyof TestResults]).length
      const failed = 4 - passed

      totalPassed += passed
      totalFailed += failed

      console.log(`${result.entity}:`)
      console.log(`  ✅ Passed: ${passed}/4`)
      console.log(`  ❌ Failed: ${failed}/4`)

      if (result.errors.length > 0) {
        console.log(`  ⚠️ Errors:`)
        result.errors.forEach(err => console.log(`    - ${err}`))
      }
      console.log('')
    }

    console.log('=====================================')
    console.log(`TOTAL: ✅ ${totalPassed} passed, ❌ ${totalFailed} failed`)
    console.log('=====================================')

    // Exit with appropriate code
    process.exit(totalFailed > 0 ? 1 : 0)

  } catch (error) {
    console.error('\n❌ Test execution failed:', error)
    process.exit(1)
  }
}

// Check if server is running
async function waitForServer(maxAttempts = 30): Promise<void> {
  console.log('⏳ Waiting for server to be ready...')

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/monitoring/health`)
      if (response.ok) {
        console.log('✅ Server is ready!')
        return
      }
    } catch {
      // Server not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  throw new Error('Server did not start in time')
}

// Entry point
async function main() {
  try {
    await waitForServer()
    await runAllTests()
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { runAllTests, TestResults }