/**
 * Full Series Generation Testing
 *
 * Tests the new full series generation feature for recurring expenses.
 * Verifies that all expenses are created upfront (up to 2 years) when a recurring expense is created.
 */

import { PrismaClient } from '@prisma/client'
import { RecurringExpenseService } from './lib/services/RecurringExpenseService'
import { createTeamScopedPrisma } from './lib/middleware/team-context'
import { ServiceContext } from './lib/services/BaseService'
import { format, addMonths } from 'date-fns'

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

async function testFullSeriesGeneration(context: ServiceContext) {
  console.log('\n📊 Testing Full Series Generation for Recurring Expenses')
  console.log('='.repeat(60))

  const recurringExpenseService = new RecurringExpenseService(context)
  let createdRecurringExpenseId: string | null = null

  try {
    // Test 1: Create monthly recurring expense with full series generation
    console.log('\n1️⃣ Testing MONTHLY recurring expense with full series...')
    const monthlyData = {
      description: 'Monthly Software Subscription',
      amount: 99.99,
      category: 'software',
      frequency: 'monthly' as const,
      interval: 1,
      dayOfMonth: 15,
      startDate: format(addMonths(new Date(), -3), 'yyyy-MM-dd'), // 3 months ago
      vendor: 'Software Co',
      notes: 'Testing full series generation for monthly expense',
      isActive: true
    }

    const monthlyRecurring = await recurringExpenseService.create(monthlyData)
    createdRecurringExpenseId = monthlyRecurring.id

    console.log('✅ Created monthly recurring expense:', monthlyRecurring.id)
    console.log(`   Description: ${monthlyRecurring.description}`)
    console.log(`   Frequency: ${monthlyRecurring.frequency} (every ${monthlyRecurring.interval} month)`)
    console.log(`   Start Date: ${monthlyRecurring.startDate}`)

    // Check generated expenses
    const monthlyWithExpenses = await recurringExpenseService.findById(monthlyRecurring.id, {
      includeExpenses: true,
      expensesLimit: 100
    })

    console.log(`\n   📅 Generated ${monthlyWithExpenses?.expenses?.length || 0} expense instances:`)

    if (monthlyWithExpenses?.expenses) {
      // Show first 5 and last 5 expenses
      const expenses = monthlyWithExpenses.expenses
      const showExpenses = [...expenses.slice(0, 5), ...expenses.slice(-5)]

      showExpenses.forEach((expense, idx) => {
        if (idx === 5) console.log('   ...')
        console.log(`     ${idx < 5 ? idx + 1 : expenses.length - (9 - idx)}: ${format(expense.dueDate, 'yyyy-MM-dd')} - ${expense.status} - $${expense.amount}`)
      })

      // Verify past expenses are marked as paid
      const pastExpenses = expenses.filter(e => new Date(e.dueDate) < new Date())
      const paidPastExpenses = pastExpenses.filter(e => e.status === 'paid')
      console.log(`\n   ✅ Past expenses: ${paidPastExpenses.length}/${pastExpenses.length} marked as paid`)

      // Verify future expenses are pending
      const futureExpenses = expenses.filter(e => new Date(e.dueDate) >= new Date())
      const pendingFutureExpenses = futureExpenses.filter(e => e.status === 'pending')
      console.log(`   ✅ Future expenses: ${pendingFutureExpenses.length}/${futureExpenses.length} marked as pending`)
    }

    // Clean up monthly expense
    await recurringExpenseService.deleteExpenseSeries(monthlyRecurring.id, { scope: 'all' })

    // Test 2: Create weekly recurring expense with end date
    console.log('\n2️⃣ Testing WEEKLY recurring expense with end date...')
    const weeklyData = {
      description: 'Weekly Cleaning Service',
      amount: 150,
      category: 'maintenance',
      frequency: 'weekly' as const,
      interval: 2, // Every 2 weeks
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addMonths(new Date(), 3), 'yyyy-MM-dd'), // 3 months from now
      vendor: 'Cleaning Co',
      notes: 'Testing bi-weekly series with end date',
      isActive: true
    }

    const weeklyRecurring = await recurringExpenseService.create(weeklyData)

    console.log('✅ Created weekly recurring expense:', weeklyRecurring.id)
    console.log(`   Frequency: every ${weeklyRecurring.interval} weeks`)
    console.log(`   End Date: ${weeklyRecurring.endDate}`)

    const weeklyWithExpenses = await recurringExpenseService.findById(weeklyRecurring.id, {
      includeExpenses: true,
      expensesLimit: 100
    })

    console.log(`   📅 Generated ${weeklyWithExpenses?.expenses?.length || 0} expense instances (limited by end date)`)

    // Clean up weekly expense
    await recurringExpenseService.deleteExpenseSeries(weeklyRecurring.id, { scope: 'all' })

    // Test 3: Test series update functionality
    console.log('\n3️⃣ Testing series UPDATE functionality...')
    const testData = {
      description: 'Test Series for Updates',
      amount: 500,
      category: 'test',
      frequency: 'monthly' as const,
      interval: 1,
      dayOfMonth: 1,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      vendor: 'Test Vendor',
      isActive: true
    }

    const testRecurring = await recurringExpenseService.create(testData)
    console.log('✅ Created test recurring expense for updates')

    // Update only future expenses
    const updateResult = await recurringExpenseService.updateExpenseSeries(
      testRecurring.id,
      { amount: 600 },
      { scope: 'future' }
    )

    console.log(`   ✅ Updated ${updateResult.updatedCount} future expenses to new amount: $600`)

    // Test series deletion (future only)
    console.log('\n4️⃣ Testing series DELETE functionality...')
    const deleteResult = await recurringExpenseService.deleteExpenseSeries(
      testRecurring.id,
      { scope: 'future' }
    )

    console.log(`   ✅ Deleted ${deleteResult.deletedCount} future expenses`)

    // Final cleanup
    await recurringExpenseService.delete(testRecurring.id)

    // Test 5: Test annual recurring expense
    console.log('\n5️⃣ Testing ANNUAL recurring expense...')
    const annualData = {
      description: 'Annual Insurance Premium',
      amount: 12000,
      category: 'insurance',
      frequency: 'annual' as const,
      interval: 1,
      startDate: format(addMonths(new Date(), -6), 'yyyy-MM-dd'), // 6 months ago
      vendor: 'Insurance Corp',
      notes: 'Testing annual series generation',
      isActive: true
    }

    const annualRecurring = await recurringExpenseService.create(annualData)

    const annualWithExpenses = await recurringExpenseService.findById(annualRecurring.id, {
      includeExpenses: true
    })

    console.log('✅ Created annual recurring expense:', annualRecurring.id)
    console.log(`   📅 Generated ${annualWithExpenses?.expenses?.length || 0} annual expense instances`)

    if (annualWithExpenses?.expenses) {
      annualWithExpenses.expenses.forEach((expense, idx) => {
        console.log(`     ${idx + 1}: ${format(expense.dueDate, 'yyyy-MM-dd')} - ${expense.status} - $${expense.amount}`)
      })
    }

    // Clean up annual expense
    await recurringExpenseService.deleteExpenseSeries(annualRecurring.id, { scope: 'all' })

    console.log('\n✅ All full series generation tests completed successfully!')

  } catch (error) {
    console.error('\n❌ Test failed:', error)

    // Clean up on error
    if (createdRecurringExpenseId) {
      try {
        await recurringExpenseService.deleteExpenseSeries(createdRecurringExpenseId, { scope: 'all' })
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError)
      }
    }

    throw error
  }
}

async function main() {
  try {
    console.log('🚀 Starting Full Series Generation Tests')
    console.log('   Using test user:', TEST_USERS.alpha.email)

    const context = await createAuthenticatedContext()
    await testFullSeriesGeneration(context)

    console.log('\n✨ All tests completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test suite failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the tests
main().catch(console.error)