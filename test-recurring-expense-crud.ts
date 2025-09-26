/**
 * Recurring Expense CRUD Testing with Authentication
 *
 * Tests the complete service layer with real authenticated operations for recurring expenses.
 * Verifies that edit/delete operations now work correctly after service layer migration.
 */

import { PrismaClient } from '@prisma/client'
import { RecurringExpenseService } from './lib/services/RecurringExpenseService'
import { createTeamScopedPrisma } from './lib/middleware/team-context'
import { ServiceContext } from './lib/services/BaseService'

const prisma = new PrismaClient()

// Test users from our testing documentation
const TEST_USERS = {
  alpha: {
    id: 'cmfvsa8v00002t0im966k7o90',
    teamId: 'cmfvsa8tt0000t0imqr96svt4',
    email: 'test@example.com',
    name: 'Test User Alpha'
  }
}

async function createAuthenticatedContext(): Promise<ServiceContext> {
  const user = await prisma.user.findUnique({
    where: { id: TEST_USERS.alpha.id },
    include: { team: true }
  })

  if (!user) {
    throw new Error(`Test user not found. Run: npx tsx lib/dev-seed.ts`)
  }

  const teamScopedPrisma = createTeamScopedPrisma(user.teamId)

  return {
    user: user as any,
    teamId: user.teamId,
    teamScopedPrisma
  }
}

async function testRecurringExpenseCRUD(context: ServiceContext) {
  console.log('\n🔄 Testing Recurring Expense CRUD Operations')
  console.log('-'.repeat(50))

  const recurringExpenseService = new RecurringExpenseService(context)
  let createdRecurringExpenseId: string | null = null

  try {
    // Test 1: Create recurring expense
    console.log('\n1️⃣ Testing CREATE recurring expense...')
    const createData = {
      description: 'Monthly Office Rent',
      amount: 2500,
      category: 'office',
      frequency: 'monthly' as const,
      interval: 1,
      dayOfMonth: 1,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      vendor: 'Property Management Co',
      notes: 'Test recurring expense for office rent',
      isActive: true
    }

    const createdRecurringExpense = await recurringExpenseService.create(createData)
    createdRecurringExpenseId = createdRecurringExpense.id

    console.log('✅ Created recurring expense:', createdRecurringExpense.id)
    console.log(`   Description: ${createdRecurringExpense.description}`)
    console.log(`   Amount: $${createdRecurringExpense.amount}`)
    console.log(`   Frequency: ${createdRecurringExpense.frequency}`)
    console.log(`   Is Active: ${createdRecurringExpense.isActive}`)

    // Test 2: Read recurring expense
    console.log('\n2️⃣ Testing READ recurring expense...')
    const foundRecurringExpense = await recurringExpenseService.findById(createdRecurringExpenseId, {
      includeContract: true,
      includeUser: true,
      includeExpenses: true
    })

    if (!foundRecurringExpense) {
      throw new Error('Failed to find created recurring expense')
    }

    console.log('✅ Found recurring expense:', foundRecurringExpense.id)
    console.log(`   Team ID: ${foundRecurringExpense.teamId}`)
    console.log(`   Next Due: ${foundRecurringExpense.nextDue.toDateString()}`)

    // Test 3: Update recurring expense (THIS WAS THE MAIN ISSUE!)
    console.log('\n3️⃣ Testing UPDATE recurring expense...')
    const updateData = {
      description: 'Monthly Office Rent - Updated',
      amount: 2750,
      vendor: 'New Property Management Co',
      notes: 'Updated test recurring expense',
      isActive: true
    }

    const updatedRecurringExpense = await recurringExpenseService.update(createdRecurringExpenseId, updateData)

    if (!updatedRecurringExpense) {
      throw new Error('Failed to update recurring expense')
    }

    console.log('✅ Updated recurring expense successfully!')
    console.log(`   New Description: ${updatedRecurringExpense.description}`)
    console.log(`   New Amount: $${updatedRecurringExpense.amount}`)
    console.log(`   New Vendor: ${updatedRecurringExpense.vendor}`)

    // Test 4: List recurring expenses
    console.log('\n4️⃣ Testing LIST recurring expenses...')
    const recurringExpenses = await recurringExpenseService.findMany({
      isActive: true
    }, {
      includeContract: true,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })

    console.log(`✅ Found ${recurringExpenses.length} active recurring expenses`)
    for (const re of recurringExpenses.slice(0, 3)) {
      console.log(`   - ${re.description} ($${re.amount}) - ${re.frequency}`)
    }

    // Test 5: Get summary statistics
    console.log('\n5️⃣ Testing SUMMARY statistics...')
    const summary = await recurringExpenseService.getSummary()

    console.log('✅ Summary statistics:')
    console.log(`   Total Active: ${summary.totalActive}`)
    console.log(`   Total Inactive: ${summary.totalInactive}`)
    console.log(`   Total Amount: $${summary.totalAmount}`)
    console.log(`   By Frequency:`, Object.entries(summary.byFrequency).map(([k, v]) => `${k}=${v.count}`).join(', '))

    // Test 6: Delete recurring expense (THIS WAS THE OTHER MAIN ISSUE!)
    console.log('\n6️⃣ Testing DELETE recurring expense...')
    const deleteSuccess = await recurringExpenseService.delete(createdRecurringExpenseId)

    if (!deleteSuccess) {
      throw new Error('Failed to delete recurring expense')
    }

    console.log('✅ Deleted recurring expense successfully!')

    // Test 7: Verify deletion
    console.log('\n7️⃣ Verifying deletion...')
    const deletedRecurringExpense = await recurringExpenseService.findById(createdRecurringExpenseId)

    if (deletedRecurringExpense) {
      throw new Error('Recurring expense should have been deleted but still exists')
    }

    console.log('✅ Confirmed: Recurring expense was properly deleted')

    return {
      success: true,
      createdId: createdRecurringExpenseId,
      testsRun: 7
    }

  } catch (error) {
    console.error(`❌ Recurring expense CRUD test failed:`, error)

    // Cleanup in case of failure
    if (createdRecurringExpenseId) {
      try {
        await recurringExpenseService.delete(createdRecurringExpenseId)
        console.log('🧹 Cleaned up test recurring expense')
      } catch (cleanupError) {
        console.log('⚠️  Could not cleanup test recurring expense:', cleanupError)
      }
    }

    throw error
  }
}

async function runAllTests() {
  console.log('🧪 Recurring Expense CRUD Testing Suite')
  console.log('=' .repeat(60))
  console.log('Testing the service layer migration fixes for edit/delete operations')

  try {
    // Setup authenticated context
    const context = await createAuthenticatedContext()
    console.log(`✅ Authenticated as: ${context.user.name} (Team: ${context.teamId})`)

    // Run all tests
    const recurringExpenseResults = await testRecurringExpenseCRUD(context)

    console.log('\n' + '='.repeat(60))
    console.log('🎉 ALL TESTS PASSED!')
    console.log('✅ Recurring expense edit operations now work correctly')
    console.log('✅ Recurring expense delete operations now work correctly')
    console.log('✅ Service layer migration successful')
    console.log(`✅ Total tests completed: ${recurringExpenseResults.testsRun}`)

    console.log('\n📋 Fix Summary:')
    console.log('- Created RecurringExpenseService with full CRUD operations')
    console.log('- Migrated API routes to use withTeamContext middleware')
    console.log('- Implemented proper validation using unified schemas')
    console.log('- Added audit logging for all operations')
    console.log('- Ensured team isolation for all data access')

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error)
    console.log('\n🔍 Troubleshooting Steps:')
    console.log('1. Ensure test users exist: npx tsx lib/dev-seed.ts')
    console.log('2. Check database connection')
    console.log('3. Verify service layer imports are correct')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test suite
if (require.main === module) {
  runAllTests().catch(console.error)
}

export { runAllTests, testRecurringExpenseCRUD }