#!/usr/bin/env npx tsx

/**
 * Direct Service Test
 * Tests the service layer functionality by directly creating the context
 */

import { ContractService } from '@/lib/services/ContractService'
import { ServiceContext } from '@/lib/services/BaseService'
import { createTeamScopedPrisma } from '@/lib/middleware/team-context'
import { prisma } from '@/lib/prisma'

async function testService() {
  console.log('🔍 Testing ContractService directly...')

  try {
    // Create a mock context for testing
    const context: ServiceContext = {
      user: {
        id: 'cmfvsa8v00002t0im966k7o90',
        email: 'test@example.com',
        name: 'Test User',
        team: {
          id: 'cmfvsa8tt0000t0imqr96svt4',
          name: 'Test Team A'
        }
      } as any,
      teamId: 'cmfvsa8tt0000t0imqr96svt4',
      teamScopedPrisma: createTeamScopedPrisma('cmfvsa8tt0000t0imqr96svt4')
    }

    const contractService = new ContractService(context)

    console.log('📋 Getting existing contracts...')
    const contracts = await contractService.findMany()
    console.log(`✅ Found ${contracts.length} contracts`)

    if (contracts.length > 0) {
      console.log('🔍 Getting first contract details...')
      const firstContract = await contractService.findById(contracts[0].id)
      console.log(`✅ Retrieved: ${firstContract?.clientName} - ${firstContract?.projectName}`)

      console.log('📊 Getting summary...')
      const summary = await contractService.getSummary()
      console.log(`✅ Summary: ${summary.totalContracts} contracts, $${summary.totalValue.toLocaleString()} total`)

      console.log('🔍 Testing search...')
      const searchResults = await contractService.search('test')
      console.log(`✅ Search returned ${searchResults.length} results`)

      console.log('📈 Testing filtering...')
      const activeContracts = await contractService.findByStatus('active')
      console.log(`✅ Found ${activeContracts.length} active contracts`)
    }

    console.log('🎉 All service operations completed successfully!')
    return true

  } catch (error) {
    console.error('❌ Service test failed:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

testService().then(success => {
  process.exit(success ? 0 : 1)
})