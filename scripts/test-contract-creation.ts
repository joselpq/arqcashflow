/**
 * Test contract creation in isolation to debug circular reference
 */

import { ContractService } from '../lib/services/ContractService'
import { prisma } from '../lib/prisma'
import { createTeamScopedPrisma } from '../lib/middleware/team-context'

const mockTeamContext = {
  teamId: 'test-contract-team',
  userEmail: 'contract-test@example.com',
  teamScopedPrisma: createTeamScopedPrisma('test-contract-team'),
  user: {
    id: 'contract-test-user',
    email: 'contract-test@example.com',
    name: 'Contract Test User'
  } as any,
  req: null as any,
  res: null as any
}

async function testContractCreation() {
  console.log('🧪 Testing Contract Creation in Isolation\n')

  try {
    // Setup test environment
    await prisma.team.upsert({
      where: { id: mockTeamContext.teamId },
      update: {},
      create: {
        id: mockTeamContext.teamId,
        name: 'Contract Test Team'
      }
    })

    await prisma.user.upsert({
      where: { id: mockTeamContext.user.id },
      update: {},
      create: {
        id: mockTeamContext.user.id,
        email: mockTeamContext.user.email,
        name: mockTeamContext.user.name,
        teamId: mockTeamContext.teamId,
        password: 'test-password-hash'
      }
    })

    console.log('✅ Test environment setup complete\n')

    // Test single contract creation
    const contractService = new ContractService(mockTeamContext)

    const contractData = {
      clientName: 'Test Client',
      projectName: 'Test Project',
      description: 'Test description',
      totalValue: 50000,
      signedDate: '2024-01-15',
      status: 'Ativo',
      category: 'Residencial'
    }

    console.log('📋 Creating single contract...')
    console.log('Contract data:', JSON.stringify(contractData, null, 2))

    try {
      const contract = await contractService.create(contractData)
      console.log('✅ Single contract created successfully:', contract.id)
    } catch (error) {
      console.error('❌ Single contract creation failed:', error.message)
      console.error('Stack trace:', error.stack)
    }

    // Test bulk contract creation
    console.log('\n📋 Testing bulk contract creation...')
    const bulkData = [contractData]

    try {
      const result = await contractService.bulkCreate(bulkData, { continueOnError: true })
      console.log('✅ Bulk creation result:', result)
    } catch (error) {
      console.error('❌ Bulk contract creation failed:', error.message)
      console.error('Stack trace:', error.stack)
    }

  } catch (error) {
    console.error('❌ Test setup failed:', error)
  } finally {
    // Cleanup
    try {
      await prisma.contract.deleteMany({ where: { teamId: mockTeamContext.teamId } })
      await prisma.user.deleteMany({ where: { id: mockTeamContext.user.id } })
      await prisma.team.deleteMany({ where: { id: mockTeamContext.teamId } })
      console.log('\n🧹 Cleanup complete')
    } catch (cleanupError) {
      console.error('⚠️ Cleanup failed:', cleanupError)
    }

    await prisma.$disconnect()
  }
}

testContractCreation().catch(console.error)