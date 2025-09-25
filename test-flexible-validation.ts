/**
 * Test Flexible Validation System
 * Verify that future dates are allowed but logged as warnings
 */

import { ContractService } from './lib/services/ContractService'
import { withTeamContext } from './lib/middleware/team-context'
import { prisma } from './lib/prisma'

async function testFlexibleValidation() {
  console.log('🧪 Testing Flexible Validation System')
  console.log('=' * 50)

  try {
    // Test with authenticated context
    const testUser = await prisma.user.findFirst({
      where: { email: 'test@example.com' },
      include: { team: true }
    })

    if (!testUser) {
      throw new Error('Test user not found')
    }

    // Create service context
    const context = {
      user: testUser,
      teamId: testUser.teamId,
      teamScopedPrisma: prisma // Simplified for testing
    }

    const contractService = new ContractService(context)

    // Test 1: Future date (should work with warning)
    console.log('\n📅 Test 1: Creating contract with future date...')
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    const contractData = {
      clientName: `Future Test Client ${Date.now()}`,
      projectName: `Future Project ${Date.now()}`,
      description: 'Testing flexible validation',
      totalValue: 75000,
      signedDate: futureDateStr,
      status: 'active',
      category: 'test'
    }

    try {
      const contract = await contractService.create(contractData)
      console.log(`✅ Future date contract created successfully: ${contract.id}`)
      console.log(`   Signed date: ${contract.signedDate}`)

      // Clean up
      await contractService.delete(contract.id)
      console.log('✅ Test contract cleaned up')

      // Check if warning was logged
      const warnings = await prisma.auditLog.findMany({
        where: {
          action: 'FUTURE_SIGNED_DATE',
          entityId: contract.id
        },
        orderBy: { timestamp: 'desc' },
        take: 1
      })

      if (warnings.length > 0) {
        console.log('✅ Warning properly logged in audit system')
        console.log(`   Message: ${warnings[0].metadata.message}`)
      } else {
        console.log('❌ Warning not found in audit system')
      }

    } catch (error) {
      console.log(`❌ Future date contract creation failed: ${error.message}`)
    }

    // Test 2: Negative value (should still be blocked)
    console.log('\n💰 Test 2: Creating contract with negative value...')
    try {
      await contractService.create({
        ...contractData,
        clientName: `Negative Test ${Date.now()}`,
        totalValue: -5000,
        signedDate: '2024-01-01' // Valid date
      })
      console.log('❌ Negative value should have been blocked!')
    } catch (error) {
      console.log(`✅ Negative value properly blocked: ${error.message}`)
    }

    console.log('\n' + '=' * 50)
    console.log('🎉 Flexible validation testing completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testFlexibleValidation().catch(console.error)