#!/usr/bin/env npx tsx

/**
 * Simple Service Test
 * Tests the service layer functionality with minimal dependencies
 */

import { withTeamContext } from '@/lib/middleware/team-context'
import { ContractService } from '@/lib/services/ContractService'

async function testService() {
  console.log('🔍 Testing ContractService...')

  try {
    // Use the existing middleware to get proper context
    const result = await withTeamContext(async (context) => {
      const contractService = new ContractService(context)

      console.log('📋 Getting existing contracts...')
      const contracts = await contractService.findMany()
      console.log(`✅ Found ${contracts.length} contracts`)

      if (contracts.length > 0) {
        console.log('🔍 Getting first contract details...')
        const firstContract = await contractService.findById(contracts[0].id)
        console.log(`✅ Retrieved: ${firstContract?.clientName} - ${firstContract?.projectName}`)
      }

      console.log('📊 Getting summary...')
      const summary = await contractService.getSummary()
      console.log(`✅ Summary: ${summary.totalContracts} contracts, $${summary.totalValue.toLocaleString()} total`)

      return { success: true, contractCount: contracts.length }
    })

    console.log('🎉 Service test completed successfully!')
    console.log('Result:', result)

  } catch (error) {
    console.error('❌ Service test failed:', error)
    throw error
  }
}

testService().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})