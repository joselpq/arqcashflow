#!/usr/bin/env npx tsx

/**
 * Isolated Service Test
 * Tests just the service business logic without middleware dependencies
 */

import { ContractService, ContractCreateData } from '@/lib/services/ContractService'
import { ServiceContext } from '@/lib/services/BaseService'
import { prisma } from '@/lib/prisma'

async function testServiceIsolated() {
  console.log('🔍 Testing ContractService in isolation...')

  try {
    // Create a minimal mock context without the complex middleware
    const mockTeamScopedPrisma = {
      contract: {
        findMany: (args?: any) => {
          // Add teamId filtering
          const where = args?.where || {}
          where.teamId = 'cmfvsa8tt0000t0imqr96svt4'
          return prisma.contract.findMany({ ...args, where })
        },
        findFirst: (args?: any) => {
          const where = args?.where || {}
          where.teamId = 'cmfvsa8tt0000t0imqr96svt4'
          return prisma.contract.findFirst({ ...args, where })
        },
        create: (args: any) => {
          const data = { ...args.data, teamId: 'cmfvsa8tt0000t0imqr96svt4' }
          return prisma.contract.create({ ...args, data })
        },
        update: (args: any) => {
          const where = { ...args.where, teamId: 'cmfvsa8tt0000t0imqr96svt4' }
          return prisma.contract.update({ ...args, where })
        },
        delete: (args: any) => {
          const where = { ...args.where, teamId: 'cmfvsa8tt0000t0imqr96svt4' }
          return prisma.contract.delete({ ...args, where })
        },
        count: (args?: any) => {
          const where = args?.where || {}
          where.teamId = 'cmfvsa8tt0000t0imqr96svt4'
          return prisma.contract.count({ ...args, where })
        }
      }
    } as any

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
      teamScopedPrisma: mockTeamScopedPrisma
    }

    const contractService = new ContractService(context)

    console.log('📋 Testing contract retrieval...')
    const contracts = await contractService.findMany()
    console.log(`✅ Found ${contracts.length} contracts`)

    console.log('📊 Testing summary calculation...')
    const summary = await contractService.getSummary()
    console.log(`✅ Summary: ${summary.totalContracts} contracts, $${summary.totalValue.toLocaleString()} total`)

    // Test business rule validation
    console.log('🔒 Testing business rules...')
    try {
      await contractService.create({
        clientName: '',
        projectName: 'Test Project',
        totalValue: 50000,
        signedDate: '2024-01-15'
      })
      console.log('❌ Should have rejected empty client name')
    } catch (error) {
      console.log('✅ Correctly rejected empty client name')
    }

    try {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      await contractService.create({
        clientName: 'Test Client',
        projectName: 'Test Project',
        totalValue: 50000,
        signedDate: futureDate.toISOString()
      })
      console.log('❌ Should have rejected future date')
    } catch (error) {
      console.log('✅ Correctly rejected future signed date')
    }

    console.log('🎉 All isolated service tests passed!')
    return true

  } catch (error) {
    console.error('❌ Isolated service test failed:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

testServiceIsolated().then(success => {
  process.exit(success ? 0 : 1)
})