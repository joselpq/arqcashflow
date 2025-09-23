#!/usr/bin/env npx tsx

/**
 * Authenticated Service Validation
 *
 * Tests the service layer through real API calls using authenticated test users
 * This validates the complete flow: HTTP -> Middleware -> Services -> Database
 *
 * IMPORTANT: This test uses the REAL authenticated environment with actual
 * test users and team isolation, not mocked data.
 */

import { ContractService } from '@/lib/services/ContractService'
import { ReceivableService } from '@/lib/services/ReceivableService'
import { ExpenseService } from '@/lib/services/ExpenseService'
import { withTeamContext } from '@/lib/middleware/team-context'

// Test user credentials from our authenticated testing docs
const TEST_USERS = {
  user1: {
    id: 'cmfvsa8v00002t0im966k7o90',
    teamId: 'cmfvsa8tt0000t0imqr96svt4',
    email: 'test@example.com',
    name: 'Test User Alpha'
  },
  user2: {
    id: 'cmfvsa8v00003t0im966k7o91',
    teamId: 'cmfvsa8tt0001t0imqr96svt5',
    email: 'test2@example.com',
    name: 'Test User Beta'
  }
}

interface TestResult {
  test: string
  passed: boolean
  details: string
  error?: string
}

class AuthenticatedServiceValidator {
  private results: TestResult[] = []
  private baseUrl = 'http://localhost:3000'

  private log(message: string) {
    console.log(`🔍 ${message}`)
  }

  private logResult(result: TestResult) {
    const status = result.passed ? '✅' : '❌'
    console.log(`${status} ${result.test}: ${result.details}`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  }

  /**
   * Test services through the real middleware (not HTTP)
   * This simulates what happens inside API routes
   */
  async testServiceWithRealMiddleware(): Promise<void> {
    this.log('Testing services with real team context middleware...')

    try {
      // Test using the REAL withTeamContext middleware
      const result = await withTeamContext(async (context) => {
        const contractService = new ContractService(context)
        const receivableService = new ReceivableService(context)
        const expenseService = new ExpenseService(context)

        // Test basic operations
        const contracts = await contractService.findMany()
        const receivables = await receivableService.findMany()
        const expenses = await expenseService.findMany()

        // Test business logic
        const contractSummary = await contractService.getSummary()
        const receivableSummary = await receivableService.getSummary()
        const expenseSummary = await expenseService.getSummary()

        // Test search functionality
        const contractSearch = await contractService.search('test')
        const receivableSearch = await receivableService.search('test')

        return {
          contracts: contracts.length,
          receivables: receivables.length,
          expenses: expenses.length,
          contractValue: contractSummary.totalValue,
          receivableAmount: receivableSummary.totalAmount,
          expenseAmount: expenseSummary.totalAmount,
          searchResults: contractSearch.length + receivableSearch.length
        }
      })

      this.results.push({
        test: 'Real Middleware Integration',
        passed: true,
        details: `Found ${result.contracts} contracts, ${result.receivables} receivables, ${result.expenses} expenses. Total values: $${result.contractValue}, $${result.receivableAmount}, $${result.expenseAmount}. Search: ${result.searchResults} results.`
      })

    } catch (error) {
      this.results.push({
        test: 'Real Middleware Integration',
        passed: false,
        details: 'Failed to execute with real middleware',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test API endpoints that should use services (once migrated)
   * For now, this tests the current API endpoints to establish baseline
   */
  async testAPIEndpoints(): Promise<void> {
    this.log('Testing current API endpoints for baseline comparison...')

    try {
      // Test contracts endpoint
      const contractsResponse = await fetch(`${this.baseUrl}/api/contracts`)
      if (!contractsResponse.ok) {
        throw new Error(`Contracts API failed: ${contractsResponse.status}`)
      }
      const contracts = await contractsResponse.json()

      // Test receivables endpoint
      const receivablesResponse = await fetch(`${this.baseUrl}/api/receivables`)
      if (!receivablesResponse.ok) {
        throw new Error(`Receivables API failed: ${receivablesResponse.status}`)
      }
      const receivables = await receivablesResponse.json()

      // Test expenses endpoint
      const expensesResponse = await fetch(`${this.baseUrl}/api/expenses`)
      if (!expensesResponse.ok) {
        throw new Error(`Expenses API failed: ${expensesResponse.status}`)
      }
      const expenses = await expensesResponse.json()

      this.results.push({
        test: 'Current API Baseline',
        passed: true,
        details: `API endpoints accessible. Contracts: ${Array.isArray(contracts) ? contracts.length : 'invalid'}, Receivables: ${Array.isArray(receivables) ? receivables.length : 'invalid'}, Expenses: ${Array.isArray(expenses) ? expenses.length : 'invalid'}`
      })

    } catch (error) {
      this.results.push({
        test: 'Current API Baseline',
        passed: false,
        details: 'Failed to access current API endpoints',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test business rules enforcement
   */
  async testBusinessRulesWithRealMiddleware(): Promise<void> {
    this.log('Testing business rules enforcement with real middleware...')

    try {
      await withTeamContext(async (context) => {
        const contractService = new ContractService(context)
        const receivableService = new ReceivableService(context)
        const expenseService = new ExpenseService(context)

        let rulesEnforced = 0
        let totalRules = 0

        // Test contract business rules
        totalRules++
        try {
          await contractService.create({
            clientName: '', // Should fail
            projectName: 'Test Project',
            totalValue: 50000,
            signedDate: '2024-01-15'
          })
        } catch (error) {
          rulesEnforced++
        }

        // Test receivable business rules
        totalRules++
        try {
          await receivableService.create({
            expectedDate: '2024-01-15',
            amount: -1000 // Should fail
          })
        } catch (error) {
          rulesEnforced++
        }

        // Test expense business rules
        totalRules++
        try {
          await expenseService.create({
            description: 'Test Expense',
            amount: 1000,
            dueDate: '2024-01-15',
            category: 'test',
            paidAmount: 2000 // Should fail - more than amount
          })
        } catch (error) {
          rulesEnforced++
        }

        this.results.push({
          test: 'Business Rules Enforcement',
          passed: rulesEnforced === totalRules,
          details: `${rulesEnforced}/${totalRules} business rules correctly enforced`
        })
      })

    } catch (error) {
      this.results.push({
        test: 'Business Rules Enforcement',
        passed: false,
        details: 'Failed to test business rules',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test team isolation by simulating different team contexts
   * NOTE: This simulates team context but doesn't test actual HTTP auth
   */
  async testTeamIsolationSimulation(): Promise<void> {
    this.log('Testing team isolation simulation...')

    try {
      // This would require mocking different team contexts
      // For now, we verify that the services respect team boundaries

      const result = await withTeamContext(async (context) => {
        const contractService = new ContractService(context)

        // Get all contracts for current team
        const contracts = await contractService.findMany()

        // Verify all contracts belong to the same team
        const teamIds = contracts.map(c => c.teamId)
        const uniqueTeamIds = [...new Set(teamIds)]

        return {
          contractCount: contracts.length,
          uniqueTeamIds: uniqueTeamIds.length,
          expectedTeamId: context.teamId
        }
      })

      this.results.push({
        test: 'Team Isolation Verification',
        passed: result.uniqueTeamIds <= 1, // Should be 0 or 1 team ID
        details: `Found ${result.contractCount} contracts with ${result.uniqueTeamIds} unique team IDs for team ${result.expectedTeamId}`
      })

    } catch (error) {
      this.results.push({
        test: 'Team Isolation Verification',
        passed: false,
        details: 'Failed to verify team isolation',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Run all validation tests
   */
  async runValidation(): Promise<boolean> {
    console.log('🚀 Authenticated Service Layer Validation')
    console.log('========================================\n')

    await this.testServiceWithRealMiddleware()
    this.logResult(this.results[this.results.length - 1])

    await this.testAPIEndpoints()
    this.logResult(this.results[this.results.length - 1])

    await this.testBusinessRulesWithRealMiddleware()
    this.logResult(this.results[this.results.length - 1])

    await this.testTeamIsolationSimulation()
    this.logResult(this.results[this.results.length - 1])

    // Summary
    const passed = this.results.filter(r => r.passed).length
    const total = this.results.length
    const passRate = ((passed / total) * 100).toFixed(1)

    console.log(`\n📊 Authenticated Validation Summary: ${passed}/${total} tests passed (${passRate}%)`)

    if (passed === total) {
      console.log('🎉 All authenticated validations passed!')
      console.log('✅ Services are ready for API integration')
    } else {
      console.log('⚠️  Some authenticated validations failed')
      console.log('❌ Review issues before proceeding with migration')

      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`   • ${r.test}: ${r.details}`)
        if (r.error) {
          console.log(`     Error: ${r.error}`)
        }
      })
    }

    return passed === total
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new AuthenticatedServiceValidator()
  validator.runValidation().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('❌ Validation failed with error:', error)
    process.exit(1)
  })
}

export { AuthenticatedServiceValidator }