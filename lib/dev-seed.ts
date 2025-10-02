/**
 * Development Environment Test User Seeding
 *
 * This script creates test users and teams for local development and testing.
 * It ensures the test credentials referenced in ADR-005 actually exist in the database.
 *
 * Usage:
 * - Automatically runs when starting dev server if NODE_ENV=development
 * - Manual: npx tsx lib/dev-seed.ts
 * - Reset: npx tsx lib/dev-seed.ts --reset
 */

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Test user credentials from ADR-005
const TEST_USERS = [
  {
    id: 'cmfvsa8v00002t0im966k7o90',
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User 1',
    team: {
      id: 'cmfvsa8tt0000t0imqr96svt4',
      name: 'Team Alpha',
      companyName: 'Alpha Architecture Studio',
      profession: 'architect'
    }
  },
  {
    id: 'cmfvsa8v00003t0im966k7o91',
    email: 'test2@example.com',
    password: 'password123',
    name: 'Test User 2',
    team: {
      id: 'cmfvsa8tt0001t0imqr96svt5',
      name: 'Team Beta',
      companyName: 'Beta Design Group',
      profession: 'architect'
    }
  }
] as const

/**
 * Sample test data for each team
 */
const SAMPLE_DATA = {
  contracts: [
    {
      clientName: 'Acme Corporation',
      projectName: 'Office Building Renovation',
      description: 'Complete renovation of 5-story office building',
      totalValue: 250000,
      signedDate: new Date('2024-01-15'),
      status: 'active',
      category: 'commercial'
    },
    {
      clientName: 'Johnson Family',
      projectName: 'Residential House Design',
      description: 'Custom house design for family of four',
      totalValue: 85000,
      signedDate: new Date('2024-02-01'),
      status: 'active',
      category: 'residential'
    }
  ],
  expenses: [
    {
      description: 'Office Rent',
      amount: 3500,
      dueDate: new Date('2024-03-01'),
      category: 'operational',
      status: 'pending',
      vendor: 'Property Management Co',
      type: 'recurring'
    },
    {
      description: 'CAD Software License',
      amount: 2400,
      dueDate: new Date('2024-03-15'),
      category: 'software',
      status: 'pending',
      vendor: 'AutoDesk',
      type: 'annual'
    }
  ],
  receivables: [
    {
      expectedDate: new Date('2024-03-30'),
      amount: 50000,
      status: 'pending',
      description: 'Phase 1 Payment - Office Building',
      invoiceNumber: 'INV-2024-001'
    },
    {
      expectedDate: new Date('2024-04-15'),
      amount: 25000,
      status: 'pending',
      description: 'Initial Design Payment - House',
      invoiceNumber: 'INV-2024-002'
    }
  ]
}

/**
 * Check if we're in development environment
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' ||
         process.env.NODE_ENV === undefined ||
         process.argv.includes('--force-dev')
}

/**
 * Check if user wants to reset data
 */
function shouldReset(): boolean {
  return process.argv.includes('--reset')
}

/**
 * Check if test users already exist
 */
async function testUsersExist(): Promise<boolean> {
  const existingUsers = await prisma.user.count({
    where: {
      email: {
        in: TEST_USERS.map(u => u.email)
      }
    }
  })

  return existingUsers === TEST_USERS.length
}

/**
 * Clear all test data
 */
async function clearTestData(): Promise<void> {
  console.log('🧹 Clearing existing test data...')

  // Delete in order to respect foreign key constraints
  await prisma.auditLog.deleteMany({
    where: {
      teamId: {
        in: TEST_USERS.map(u => u.team.id)
      }
    }
  })

  await prisma.receivable.deleteMany({
    where: {
      teamId: {
        in: TEST_USERS.map(u => u.team.id)
      }
    }
  })

  await prisma.expense.deleteMany({
    where: {
      teamId: {
        in: TEST_USERS.map(u => u.team.id)
      }
    }
  })

  // Budget model has been removed
  // await prisma.budget.deleteMany({
  //   where: {
  //     teamId: {
  //       in: TEST_USERS.map(u => u.team.id)
  //     }
  //   }
  // })

  await prisma.contract.deleteMany({
    where: {
      teamId: {
        in: TEST_USERS.map(u => u.team.id)
      }
    }
  })

  await prisma.user.deleteMany({
    where: {
      email: {
        in: TEST_USERS.map(u => u.email)
      }
    }
  })

  await prisma.team.deleteMany({
    where: {
      id: {
        in: TEST_USERS.map(u => u.team.id)
      }
    }
  })

  console.log('✅ Test data cleared')
}

/**
 * Create test teams
 */
async function createTestTeams(): Promise<void> {
  console.log('👥 Creating test teams...')

  for (const user of TEST_USERS) {
    await prisma.team.create({
      data: {
        id: user.team.id,
        name: user.team.name,
        companyName: user.team.companyName,
        profession: user.team.profession,
        type: 'individual'
      }
    })
  }

  console.log('✅ Test teams created')
}

/**
 * Create test users
 */
async function createTestUsers(): Promise<void> {
  console.log('👤 Creating test users...')

  for (const userData of TEST_USERS) {
    const hashedPassword = await bcrypt.hash(userData.password, 12)

    await prisma.user.create({
      data: {
        id: userData.id,
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        teamId: userData.team.id,
        onboardingComplete: true
      }
    })
  }

  console.log('✅ Test users created')
}

/**
 * Create sample data for testing
 */
async function createSampleData(): Promise<void> {
  console.log('📊 Creating sample data...')

  for (const [index, userData] of TEST_USERS.entries()) {
    const teamId = userData.team.id

    // Create contracts
    const contractsData = SAMPLE_DATA.contracts.map((contract, i) => ({
      ...contract,
      teamId,
      // Vary data slightly between teams
      totalValue: contract.totalValue + (index * 10000),
      clientName: `${contract.clientName} ${index === 0 ? 'Alpha' : 'Beta'}`
    }))

    const createdContracts = await Promise.all(
      contractsData.map(contract => prisma.contract.create({ data: contract }))
    )

    // Create expenses
    const expensesData = SAMPLE_DATA.expenses.map((expense, i) => ({
      ...expense,
      teamId,
      contractId: i < createdContracts.length ? createdContracts[i].id : null,
      amount: expense.amount + (index * 500)
    }))

    await Promise.all(
      expensesData.map(expense => prisma.expense.create({ data: expense }))
    )

    // Create receivables
    const receivablesData = SAMPLE_DATA.receivables.map((receivable, i) => ({
      ...receivable,
      teamId,
      contractId: i < createdContracts.length ? createdContracts[i].id : null,
      amount: receivable.amount + (index * 5000),
      clientName: contractsData[i]?.clientName || 'Test Client'
    }))

    await Promise.all(
      receivablesData.map(receivable => prisma.receivable.create({ data: receivable }))
    )
  }

  console.log('✅ Sample data created')
}

/**
 * Display test user credentials
 */
function displayCredentials(): void {
  console.log('\n' + '='.repeat(60))
  console.log('🔐 TEST USER CREDENTIALS FOR LOCAL DEVELOPMENT')
  console.log('='.repeat(60))

  TEST_USERS.forEach((user, index) => {
    console.log(`\n📧 Test User ${index + 1} (${user.team.name}):`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Password: ${user.password}`)
    console.log(`   User ID: ${user.id}`)
    console.log(`   Team ID: ${user.team.id}`)
    console.log(`   Company: ${user.team.companyName}`)
  })

  console.log('\n' + '='.repeat(60))
  console.log('🧪 TESTING TEAM ISOLATION:')
  console.log('='.repeat(60))
  console.log('1. Login as test@example.com')
  console.log('2. Create/view data')
  console.log('3. Logout and login as test2@example.com')
  console.log('4. Verify you cannot see User 1\'s data')
  console.log('5. Verify middleware blocks cross-team access')

  console.log('\n💡 Quick Commands:')
  console.log('   Reset test data: npx tsx lib/dev-seed.ts --reset')
  console.log('   Re-run seed: npx tsx lib/dev-seed.ts')
  console.log('   Run middleware validation: npx tsx lib/middleware/validate-poc.ts')
}

/**
 * Main seeding function
 */
export async function seedDevelopmentData(): Promise<void> {
  if (!isDevelopment()) {
    console.log('⚠️  Skipping test data seeding - not in development environment')
    return
  }

  try {
    console.log('🌱 Starting development data seeding...')

    // Check if we should reset or if users already exist
    const reset = shouldReset()
    const usersExist = await testUsersExist()

    if (usersExist && !reset) {
      console.log('✅ Test users already exist - skipping seed')
      displayCredentials()
      return
    }

    if (reset || usersExist) {
      await clearTestData()
    }

    // Create test data
    await createTestTeams()
    await createTestUsers()
    await createSampleData()

    console.log('\n🎉 Development seeding completed successfully!')
    displayCredentials()

  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    throw error
  }
}

/**
 * Auto-seed when in development mode (called from other modules)
 */
export async function autoSeedIfNeeded(): Promise<void> {
  if (!isDevelopment()) {
    return
  }

  const usersExist = await testUsersExist()
  if (!usersExist) {
    console.log('🌱 Auto-seeding test users for development...')
    await seedDevelopmentData()
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDevelopmentData()
    .then(() => {
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Seeding script crashed:', error)
      process.exit(1)
    })
}