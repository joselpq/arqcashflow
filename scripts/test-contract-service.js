#!/usr/bin/env node

/**
 * Simple Contract Service Test
 *
 * Tests basic functionality of the ContractService to ensure it works
 * before proceeding with the full migration.
 */

const { ContractService } = require('../lib/services/ContractService')
const { createTeamScopedPrisma } = require('../lib/middleware/team-context')
const { prisma } = require('../lib/prisma')

// Test user and team data
const TEST_USER = {
  id: 'cmfvsa8v00002t0im966k7o90',
  email: 'test@example.com',
  name: 'Test User',
  team: {
    id: 'cmfvsa8tt0000t0imqr96svt4',
    name: 'Test Team A'
  }
}

const TEST_TEAM_ID = 'cmfvsa8tt0000t0imqr96svt4'

async function testContractService() {
  console.log('🔍 Testing ContractService...')

  try {
    // Create service context
    const context = {
      user: TEST_USER,
      teamId: TEST_TEAM_ID,
      teamScopedPrisma: createTeamScopedPrisma(prisma, TEST_TEAM_ID)
    }

    const contractService = new ContractService(context)

    // Test 1: Get existing contracts
    console.log('\n📋 Test 1: Retrieving existing contracts...')
    const existingContracts = await contractService.findMany()
    console.log(`✅ Found ${existingContracts.length} existing contracts`)

    // Test 2: Create a new contract
    console.log('\n📝 Test 2: Creating a new contract...')
    const newContract = await contractService.create({
      clientName: 'Service Test Client',
      projectName: 'Service Test Project',
      description: 'Created via ContractService for testing',
      totalValue: 25000,
      signedDate: '2024-01-15',
      status: 'active',
      category: 'testing',
      notes: 'This is a test contract created by the ContractService'
    })
    console.log(`✅ Created contract with ID: ${newContract.id}`)

    // Test 3: Retrieve the created contract
    console.log('\n🔍 Test 3: Retrieving created contract by ID...')
    const retrievedContract = await contractService.findById(newContract.id)
    console.log(`✅ Retrieved contract: ${retrievedContract?.clientName} - ${retrievedContract?.projectName}`)

    // Test 4: Update the contract
    console.log('\n✏️  Test 4: Updating the contract...')
    const updatedContract = await contractService.update(newContract.id, {
      totalValue: 30000,
      status: 'updated'
    })
    console.log(`✅ Updated contract total value to: ${updatedContract?.totalValue}`)

    // Test 5: Get summary statistics
    console.log('\n📊 Test 5: Getting contract summary...')
    const summary = await contractService.getSummary()
    console.log(`✅ Summary: ${summary.totalContracts} contracts, total value: $${summary.totalValue.toLocaleString()}`)

    // Test 6: Search contracts
    console.log('\n🔎 Test 6: Searching contracts...')
    const searchResults = await contractService.search('Service Test')
    console.log(`✅ Search found ${searchResults.length} matching contracts`)

    // Test 7: Clean up - delete the test contract
    console.log('\n🗑️  Test 7: Cleaning up test contract...')
    const deleted = await contractService.delete(newContract.id)
    console.log(`✅ Contract deleted: ${deleted}`)

    console.log('\n🎉 All ContractService tests passed!')
    return true

  } catch (error) {
    console.error('\n❌ ContractService test failed:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testContractService().then(success => {
  process.exit(success ? 0 : 1)
})