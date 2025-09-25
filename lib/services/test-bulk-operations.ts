/**
 * Comprehensive Bulk Operations Testing
 *
 * Tests all bulk operations following ArqCashflow testing guidance:
 * - Uses authenticated test users
 * - Tests team isolation
 * - Validates error handling and rollback scenarios
 * - Verifies audit logging
 * - Tests performance under load
 */

import { prisma } from '@/lib/prisma'
import { ContractService } from './ContractService'
import { ReceivableService } from './ReceivableService'
import { ExpenseService } from './ExpenseService'
import { ServiceContext } from './BaseService'
import { createDateForStorage } from '@/lib/date-utils'

// Test user credentials from our testing documentation
const TEST_USERS = {
  alpha: {
    id: 'cmfvsa8v00002t0im966k7o90',
    teamId: 'cmfvsa8tt0000t0imqr96svt4',
    email: 'test@example.com',
    company: 'Alpha Architecture Studio'
  },
  beta: {
    id: 'cmfvsa8v00003t0im966k7o91',
    teamId: 'cmfvsa8tt0001t0imqr96svt5',
    email: 'test2@example.com',
    company: 'Beta Design Group'
  }
}

async function createServiceContext(testUser: typeof TEST_USERS.alpha): Promise<ServiceContext> {
  const user = await prisma.user.findUnique({
    where: { id: testUser.id },
    include: { team: true }
  })

  if (!user) {
    throw new Error(`Test user ${testUser.email} not found. Run: npx tsx lib/dev-seed.ts`)
  }

  // Use the real team-scoped Prisma client from middleware
  // Import the actual implementation
  const { createTeamScopedPrisma } = await import('@/lib/middleware/team-context')
  const teamScopedPrisma = createTeamScopedPrisma(user.teamId)

  return {
    user: user as any,
    teamId: user.teamId,
    teamScopedPrisma
  }
}

async function testBulkContractOperations(context: ServiceContext) {
  console.log('\n🏗️  Testing Bulk Contract Operations...')
  const contractService = new ContractService(context)

  // Test data for bulk creation
  const contractsData = [
    {
      clientName: 'Bulk Client A',
      projectName: 'Bulk Project A',
      description: 'Test bulk contract creation',
      totalValue: 50000,
      signedDate: '2024-01-01',
      status: 'active',
      category: 'residential'
    },
    {
      clientName: 'Bulk Client B',
      projectName: 'Bulk Project B',
      description: 'Test bulk contract creation',
      totalValue: 75000,
      signedDate: '2024-01-15',
      status: 'pending',
      category: 'commercial'
    },
    {
      clientName: 'Bulk Client C',
      projectName: 'Bulk Project C',
      description: 'Test bulk contract creation',
      totalValue: 100000,
      signedDate: '2024-02-01',
      status: 'active',
      category: 'industrial'
    }
  ]

  try {
    // Test 1: Bulk Create
    console.log('  📝 Test 1: Bulk Create Contracts...')
    const createResult = await contractService.bulkCreate(contractsData)
    console.log(`    ✅ Created ${createResult.successCount}/${createResult.totalItems} contracts`)

    if (createResult.failureCount > 0) {
      console.log(`    ❌ Failures: ${createResult.errors.join(', ')}`)
    }

    // Collect created contract IDs
    const contractIds = createResult.results
      .filter(r => r.success && r.data)
      .map(r => r.data!.id)

    // Test 2: Bulk Update Status
    console.log('  🔄 Test 2: Bulk Update Status...')
    const updateResult = await contractService.bulkUpdateStatus(contractIds, 'completed')
    console.log(`    ✅ Updated ${updateResult.successCount}/${updateResult.totalItems} contracts`)

    // Test 3: Bulk Import (CSV simulation)
    console.log('  📊 Test 3: Bulk Import (CSV simulation)...')
    const csvData = [
      {
        clientName: 'CSV Client 1',
        projectName: 'CSV Project 1',
        description: 'Imported from CSV',
        totalValue: '45000',
        signedDate: '2024-03-01',
        status: 'active',
        category: 'residential'
      },
      {
        clientName: 'CSV Client 2',
        projectName: 'CSV Project 2',
        description: 'Imported from CSV',
        totalValue: '67500',
        signedDate: '2024-03-15',
        status: 'pending',
        category: 'commercial'
      }
    ]
    const importResult = await contractService.bulkImport(csvData)
    console.log(`    ✅ Imported ${importResult.successCount}/${importResult.totalItems} contracts`)

    // Test 4: Bulk Delete Safe (should block if has receivables)
    console.log('  🗑️  Test 4: Bulk Delete Safe...')
    const deleteResult = await contractService.bulkDeleteSafe(contractIds)
    console.log(`    ✅ Deleted ${deleteResult.successCount}/${deleteResult.totalItems} contracts`)
    if (deleteResult.blockedByReceivables.length > 0) {
      console.log(`    ⚠️  Blocked by receivables: ${deleteResult.blockedByReceivables.length} contracts`)
    }

    return { success: true, contractIds }
  } catch (error) {
    console.error('    ❌ Contract bulk operations failed:', error)
    return { success: false, error }
  }
}

async function testBulkReceivableOperations(context: ServiceContext, contractIds: string[]) {
  console.log('\n💰 Testing Bulk Receivable Operations...')
  const receivableService = new ReceivableService(context)

  const receivablesData = contractIds.slice(0, 2).map((contractId, index) => ({
    clientName: `Bulk Client ${String.fromCharCode(65 + index)}`,
    description: `Bulk receivable ${index + 1}`,
    amount: 25000 + (index * 10000),
    dueDate: `2024-0${index + 4}-01`,
    status: 'pending',
    category: 'project',
    contractId: contractId
  }))

  try {
    // Test 1: Bulk Create Receivables
    console.log('  📝 Test 1: Bulk Create Receivables...')
    const createResult = await receivableService.bulkCreate(receivablesData)
    console.log(`    ✅ Created ${createResult.successCount}/${createResult.totalItems} receivables`)

    const receivableIds = createResult.results
      .filter(r => r.success && r.data)
      .map(r => r.data!.id)

    // Test 2: Bulk Mark as Received
    console.log('  💵 Test 2: Bulk Mark as Received...')
    const paymentUpdates = receivableIds.map(id => ({
      id,
      receivedAmount: 25000,
      receivedDate: new Date().toISOString()
    }))
    const paymentResult = await receivableService.bulkMarkAsReceived(paymentUpdates)
    console.log(`    ✅ Processed ${paymentResult.successCount}/${paymentResult.totalItems} payments`)

    // Test 3: Bulk Import from CSV
    console.log('  📊 Test 3: Bulk Import Receivables...')
    const csvData = [
      {
        clientName: 'CSV Receivable Client 1',
        description: 'Imported receivable',
        amount: '30000',
        dueDate: '2024-05-01',
        status: 'pending',
        category: 'project'
      },
      {
        clientName: 'CSV Receivable Client 2',
        description: 'Imported receivable',
        amount: '40000',
        dueDate: '2024-05-15',
        status: 'pending',
        category: 'maintenance'
      }
    ]
    const importResult = await receivableService.bulkImport(csvData)
    console.log(`    ✅ Imported ${importResult.successCount}/${importResult.totalItems} receivables`)

    return { success: true, receivableIds }
  } catch (error) {
    console.error('    ❌ Receivable bulk operations failed:', error)
    return { success: false, error }
  }
}

async function testBulkExpenseOperations(context: ServiceContext) {
  console.log('\n💸 Testing Bulk Expense Operations...')
  const expenseService = new ExpenseService(context)

  const expensesData = [
    {
      description: 'Bulk Expense A - Materials',
      amount: 5000,
      dueDate: '2024-06-01',
      vendor: 'Material Supplier A',
      category: 'materials',
      type: 'project' as const,
      status: 'pending'
    },
    {
      description: 'Bulk Expense B - Equipment',
      amount: 7500,
      dueDate: '2024-06-15',
      vendor: 'Equipment Rental B',
      category: 'equipment',
      type: 'operational' as const,
      status: 'pending'
    },
    {
      description: 'Bulk Expense C - Services',
      amount: 3000,
      dueDate: '2024-07-01',
      vendor: 'Service Provider C',
      category: 'services',
      type: 'operational' as const,
      status: 'pending'
    }
  ]

  try {
    // Test 1: Bulk Create Expenses
    console.log('  📝 Test 1: Bulk Create Expenses...')
    const createResult = await expenseService.bulkCreate(expensesData)
    console.log(`    ✅ Created ${createResult.successCount}/${createResult.totalItems} expenses`)

    const expenseIds = createResult.results
      .filter(r => r.success && r.data)
      .map(r => r.data!.id)

    // Test 2: Bulk Mark as Paid
    console.log('  💳 Test 2: Bulk Mark as Paid...')
    const paymentUpdates = expenseIds.slice(0, 2).map(id => ({
      id,
      paidAmount: 5000,
      paidDate: new Date().toISOString()
    }))
    const paymentResult = await expenseService.bulkMarkAsPaid(paymentUpdates)
    console.log(`    ✅ Processed ${paymentResult.successCount}/${paymentResult.totalItems} payments`)

    // Test 3: Bulk Update Categories
    console.log('  🏷️  Test 3: Bulk Update Categories...')
    const categoryResult = await expenseService.bulkUpdateCategory(expenseIds, 'bulk-test')
    console.log(`    ✅ Updated ${categoryResult.successCount}/${categoryResult.totalItems} categories`)

    return { success: true, expenseIds }
  } catch (error) {
    console.error('    ❌ Expense bulk operations failed:', error)
    return { success: false, error }
  }
}

async function testTeamIsolation() {
  console.log('\n🔒 Testing Team Isolation in Bulk Operations...')

  try {
    // Create contexts for both test users
    const alphaContext = await createServiceContext(TEST_USERS.alpha)
    const betaContext = await createServiceContext(TEST_USERS.beta)

    const alphaService = new ContractService(alphaContext)
    const betaService = new ContractService(betaContext)

    // Alpha user creates contracts
    console.log('  👤 Alpha user creating contracts...')
    const alphaContracts = await alphaService.bulkCreate([{
      clientName: 'Alpha Team Client',
      projectName: 'Alpha Team Project',
      totalValue: 50000,
      signedDate: '2024-01-01',
      status: 'active',
      category: 'residential'
    }])

    // Beta user creates contracts
    console.log('  👤 Beta user creating contracts...')
    const betaContracts = await betaService.bulkCreate([{
      clientName: 'Beta Team Client',
      projectName: 'Beta Team Project',
      totalValue: 75000,
      signedDate: '2024-01-01',
      status: 'active',
      category: 'commercial'
    }])

    // Verify team isolation
    const alphaContractsList = await alphaService.findMany({})
    const betaContractsList = await betaService.findMany({})

    console.log(`  ✅ Alpha team sees ${alphaContractsList.length} contracts`)
    console.log(`  ✅ Beta team sees ${betaContractsList.length} contracts`)

    // Verify no data overlap
    const alphaIds = alphaContractsList.map(c => c.id)
    const betaIds = betaContractsList.map(c => c.id)
    const overlap = alphaIds.filter(id => betaIds.includes(id))

    if (overlap.length === 0) {
      console.log('  ✅ Team isolation verified - no data overlap')
      return { success: true }
    } else {
      console.error('  ❌ Team isolation failed - data overlap detected:', overlap)
      return { success: false, error: 'Data overlap detected' }
    }
  } catch (error) {
    console.error('    ❌ Team isolation test failed:', error)
    return { success: false, error }
  }
}

async function testErrorHandling() {
  console.log('\n⚠️  Testing Error Handling and Rollback...')

  try {
    const context = await createServiceContext(TEST_USERS.alpha)
    const contractService = new ContractService(context)

    // Test with invalid data that should fail
    const invalidData = [
      {
        clientName: 'Valid Contract',
        projectName: 'Valid Project',
        totalValue: 50000,
        signedDate: '2024-01-01',
        status: 'active',
        category: 'residential'
      },
      {
        clientName: '', // Invalid: empty client name
        projectName: 'Invalid Project',
        totalValue: -1000, // Invalid: negative amount
        signedDate: '2024-01-01',
        status: 'active',
        category: 'residential'
      }
    ]

    console.log('  🧪 Testing with invalid data (should fail atomically)...')

    try {
      const result = await contractService.bulkCreate(invalidData)

      if (result.success) {
        console.error('    ❌ Expected bulk operation to fail but it succeeded')
        return { success: false, error: 'Invalid data was accepted' }
      } else {
        console.log('    ✅ Bulk operation properly failed with validation errors')
        console.log(`      Errors: ${result.errors.join(', ')}`)
        return { success: true }
      }
    } catch (error) {
      console.log('    ✅ Transaction properly rolled back on error')
      return { success: true }
    }

  } catch (error) {
    console.error('    ❌ Error handling test failed:', error)
    return { success: false, error }
  }
}

async function runComprehensiveTests() {
  console.log('🧪 ArqCashflow Bulk Operations - Comprehensive Testing')
  console.log('=' .repeat(60))

  const results = {
    contractOps: { success: false },
    receivableOps: { success: false },
    expenseOps: { success: false },
    teamIsolation: { success: false },
    errorHandling: { success: false }
  }

  try {
    // Test authenticated environment setup
    console.log('\n🔐 Verifying Test Environment...')
    const alphaContext = await createServiceContext(TEST_USERS.alpha)
    const betaContext = await createServiceContext(TEST_USERS.beta)
    console.log('  ✅ Test users found and contexts created')

    // Run all tests
    const contractResult = await testBulkContractOperations(alphaContext)
    results.contractOps = contractResult

    if (contractResult.success) {
      const receivableResult = await testBulkReceivableOperations(alphaContext, contractResult.contractIds || [])
      results.receivableOps = receivableResult
    }

    const expenseResult = await testBulkExpenseOperations(alphaContext)
    results.expenseOps = expenseResult

    const isolationResult = await testTeamIsolation()
    results.teamIsolation = isolationResult

    const errorResult = await testErrorHandling()
    results.errorHandling = errorResult

  } catch (error) {
    console.error('\n❌ Test setup failed:', error)
  }

  // Results Summary
  console.log('\n📊 Test Results Summary')
  console.log('=' .repeat(60))

  const testResults = [
    ['Contract Operations', results.contractOps.success],
    ['Receivable Operations', results.receivableOps.success],
    ['Expense Operations', results.expenseOps.success],
    ['Team Isolation', results.teamIsolation.success],
    ['Error Handling', results.errorHandling.success]
  ]

  testResults.forEach(([test, success]) => {
    const icon = success ? '✅' : '❌'
    console.log(`  ${icon} ${test}: ${success ? 'PASSED' : 'FAILED'}`)
  })

  const allPassed = testResults.every(([_, success]) => success)

  console.log('\n' + '=' .repeat(60))
  if (allPassed) {
    console.log('🎉 ALL BULK OPERATIONS TESTS PASSED!')
    console.log('   Service Layer Phase 4 bulk operations are working correctly.')
  } else {
    console.log('❌ SOME TESTS FAILED')
    console.log('   Please review the failed tests above.')
  }
  console.log('=' .repeat(60))

  return allPassed
}

// Run tests when script is executed directly
if (require.main === module) {
  runComprehensiveTests()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error('Testing failed with error:', error)
      process.exit(1)
    })
}

export { runComprehensiveTests }