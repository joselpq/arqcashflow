#!/usr/bin/env npx tsx

/**
 * Comprehensive Service Layer Validation
 * Tests all services (Contract, Receivable, Expense) to ensure they work correctly
 */

import { ContractService } from '@/lib/services/ContractService'
import { ReceivableService } from '@/lib/services/ReceivableService'
import { ExpenseService } from '@/lib/services/ExpenseService'
import { ServiceContext } from '@/lib/services/BaseService'
import { prisma } from '@/lib/prisma'

async function validateAllServices() {
  console.log('🚀 Comprehensive Service Layer Validation\n')

  try {
    // Create mock team-scoped prisma for testing
    const mockTeamScopedPrisma = {
      contract: {
        findMany: (args?: any) => {
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
      },
      receivable: {
        findMany: (args?: any) => {
          const where = args?.where || {}
          where.teamId = 'cmfvsa8tt0000t0imqr96svt4'
          return prisma.receivable.findMany({ ...args, where })
        },
        findFirst: (args?: any) => {
          const where = args?.where || {}
          where.teamId = 'cmfvsa8tt0000t0imqr96svt4'
          return prisma.receivable.findFirst({ ...args, where })
        },
        create: (args: any) => {
          const data = { ...args.data, teamId: 'cmfvsa8tt0000t0imqr96svt4' }
          return prisma.receivable.create({ ...args, data })
        },
        update: (args: any) => {
          const where = { ...args.where, teamId: 'cmfvsa8tt0000t0imqr96svt4' }
          return prisma.receivable.update({ ...args, where })
        },
        delete: (args: any) => {
          const where = { ...args.where, teamId: 'cmfvsa8tt0000t0imqr96svt4' }
          return prisma.receivable.delete({ ...args, where })
        },
        count: (args?: any) => {
          const where = args?.where || {}
          where.teamId = 'cmfvsa8tt0000t0imqr96svt4'
          return prisma.receivable.count({ ...args, where })
        }
      },
      expense: {
        findMany: (args?: any) => {
          const where = args?.where || {}
          where.teamId = 'cmfvsa8tt0000t0imqr96svt4'
          return prisma.expense.findMany({ ...args, where })
        },
        findFirst: (args?: any) => {
          const where = args?.where || {}
          where.teamId = 'cmfvsa8tt0000t0imqr96svt4'
          return prisma.expense.findFirst({ ...args, where })
        },
        create: (args: any) => {
          const data = { ...args.data, teamId: 'cmfvsa8tt0000t0imqr96svt4' }
          return prisma.expense.create({ ...args, data })
        },
        update: (args: any) => {
          const where = { ...args.where, teamId: 'cmfvsa8tt0000t0imqr96svt4' }
          return prisma.expense.update({ ...args, where })
        },
        delete: (args: any) => {
          const where = { ...args.where, teamId: 'cmfvsa8tt0000t0imqr96svt4' }
          return prisma.expense.delete({ ...args, where })
        },
        count: (args?: any) => {
          const where = args?.where || {}
          where.teamId = 'cmfvsa8tt0000t0imqr96svt4'
          return prisma.expense.count({ ...args, where })
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

    // Initialize services
    const contractService = new ContractService(context)
    const receivableService = new ReceivableService(context)
    const expenseService = new ExpenseService(context)

    let testsPassed = 0
    let totalTests = 0

    // Test Contract Service
    console.log('📋 Testing ContractService...')
    totalTests++
    try {
      const contracts = await contractService.findMany()
      const summary = await contractService.getSummary()
      console.log(`✅ Contracts: ${contracts.length} found, $${summary.totalValue.toLocaleString()} total value`)
      testsPassed++
    } catch (error) {
      console.log(`❌ ContractService failed: ${error}`)
    }

    // Test Receivable Service
    console.log('💰 Testing ReceivableService...')
    totalTests++
    try {
      const receivables = await receivableService.findMany()
      const summary = await receivableService.getSummary()
      console.log(`✅ Receivables: ${receivables.length} found, $${summary.totalAmount.toLocaleString()} total amount`)
      testsPassed++
    } catch (error) {
      console.log(`❌ ReceivableService failed: ${error}`)
    }

    // Test Expense Service
    console.log('💸 Testing ExpenseService...')
    totalTests++
    try {
      const expenses = await expenseService.findMany()
      const summary = await expenseService.getSummary()
      console.log(`✅ Expenses: ${expenses.length} found, $${summary.totalAmount.toLocaleString()} total amount`)
      testsPassed++
    } catch (error) {
      console.log(`❌ ExpenseService failed: ${error}`)
    }

    // Test advanced features
    console.log('\n🔍 Testing advanced features...')

    // Test search functionality
    totalTests++
    try {
      const contractSearch = await contractService.search('test')
      const receivableSearch = await receivableService.search('test')
      const expenseSearch = await expenseService.search('test')
      console.log(`✅ Search: ${contractSearch.length} contracts, ${receivableSearch.length} receivables, ${expenseSearch.length} expenses`)
      testsPassed++
    } catch (error) {
      console.log(`❌ Search functionality failed: ${error}`)
    }

    // Test filtering
    totalTests++
    try {
      const activeContracts = await contractService.findByStatus('active')
      const overdueReceivables = await receivableService.findOverdue()
      const overdueExpenses = await expenseService.findOverdue()
      console.log(`✅ Filtering: ${activeContracts.length} active contracts, ${overdueReceivables.length} overdue receivables, ${overdueExpenses.length} overdue expenses`)
      testsPassed++
    } catch (error) {
      console.log(`❌ Filtering failed: ${error}`)
    }

    // Test business rule validation
    console.log('\n🔒 Testing business rules...')

    // Contract validation
    totalTests++
    try {
      await contractService.create({
        clientName: '',
        projectName: 'Test',
        totalValue: 50000,
        signedDate: '2024-01-15'
      })
      console.log('❌ Should have rejected empty client name')
    } catch (error) {
      console.log('✅ Contract validation: Correctly rejected empty client name')
      testsPassed++
    }

    // Receivable validation
    totalTests++
    try {
      await receivableService.create({
        expectedDate: '2024-01-15',
        amount: -1000
      })
      console.log('❌ Should have rejected negative amount')
    } catch (error) {
      console.log('✅ Receivable validation: Correctly rejected negative amount')
      testsPassed++
    }

    // Expense validation
    totalTests++
    try {
      await expenseService.create({
        description: 'Test Expense',
        amount: 1000,
        dueDate: '2024-01-15',
        category: 'test',
        paidAmount: 2000 // More than amount
      })
      console.log('❌ Should have rejected paid amount > total amount')
    } catch (error) {
      console.log('✅ Expense validation: Correctly rejected excessive paid amount')
      testsPassed++
    }

    // Summary
    console.log(`\n📊 Validation Summary: ${testsPassed}/${totalTests} tests passed (${((testsPassed / totalTests) * 100).toFixed(1)}%)`)

    if (testsPassed === totalTests) {
      console.log('🎉 All service layer validations passed! Services are ready for migration.')
      return true
    } else {
      console.log('⚠️  Some validations failed. Review issues before proceeding.')
      return false
    }

  } catch (error) {
    console.error('❌ Validation failed with error:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

validateAllServices().then(success => {
  process.exit(success ? 0 : 1)
})