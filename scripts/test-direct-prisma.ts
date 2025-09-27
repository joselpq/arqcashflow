/**
 * Test direct Prisma vs team-scoped Prisma to isolate the circular reference issue
 */

import { prisma } from '../lib/prisma'

async function testDirectPrisma() {
  console.log('🧪 Testing Direct Prisma Contract Creation\n')

  try {
    // Setup test data
    const teamId = 'direct-prisma-test-team'
    const userId = 'direct-prisma-test-user'

    // Create team and user directly
    await prisma.team.upsert({
      where: { id: teamId },
      update: {},
      create: {
        id: teamId,
        name: 'Direct Prisma Test Team'
      }
    })

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: 'direct-prisma-test@example.com',
        name: 'Direct Prisma Test User',
        teamId: teamId,
        password: 'test-password-hash'
      }
    })

    console.log('✅ Test environment setup complete\n')

    // Test direct contract creation with Prisma
    const contractData = {
      clientName: 'Direct Test Client',
      projectName: 'Direct Test Project',
      description: 'Direct test description',
      totalValue: 75000,
      signedDate: new Date('2024-01-15T15:00:00.000Z'),
      status: 'Ativo',
      category: 'Residencial',
      teamId: teamId
    }

    console.log('📋 Creating contract with direct Prisma...')
    console.log('Contract data:', JSON.stringify(contractData, (key, value) =>
      value instanceof Date ? value.toISOString() : value, 2))

    const contract = await prisma.contract.create({
      data: contractData
    })

    console.log('✅ Direct Prisma contract created successfully:', contract.id)

  } catch (error) {
    console.error('❌ Direct Prisma test failed:', error.message)
    console.error('Stack trace:', error.stack)
  } finally {
    // Cleanup
    try {
      await prisma.contract.deleteMany({ where: { teamId: 'direct-prisma-test-team' } })
      await prisma.user.deleteMany({ where: { id: 'direct-prisma-test-user' } })
      await prisma.team.deleteMany({ where: { id: 'direct-prisma-test-team' } })
      console.log('\n🧹 Cleanup complete')
    } catch (cleanupError) {
      console.error('⚠️ Cleanup failed:', cleanupError)
    }

    await prisma.$disconnect()
  }
}

testDirectPrisma().catch(console.error)