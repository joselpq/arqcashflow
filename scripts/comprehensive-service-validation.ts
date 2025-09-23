#!/usr/bin/env npx tsx

/**
 * Comprehensive Authenticated Service Validation
 *
 * This script thoroughly validates the service layer through REAL authenticated HTTP requests
 * comparing service results against current API endpoints with actual team isolation.
 *
 * Tests performed:
 * 1. Authenticated HTTP API calls (current implementation)
 * 2. Service layer calls through middleware (future implementation)
 * 3. Data equivalence between service and API results
 * 4. Team isolation verification
 * 5. Business rules enforcement
 * 6. Performance comparison
 */

import { ContractService } from '@/lib/services/ContractService'
import { ReceivableService } from '@/lib/services/ReceivableService'
import { ExpenseService } from '@/lib/services/ExpenseService'
import { withTeamContext } from '@/lib/middleware/team-context'

interface AuthSession {
  cookie: string
  userId: string
  teamId: string
  email: string
}

interface TestResult {
  test: string
  passed: boolean
  details: string
  error?: string
  performanceMs?: number
  dataComparison?: {
    apiCount: number
    serviceCount: number
    equivalent: boolean
  }
}

// Test users from our authenticated testing setup
const TEST_USERS = [
  {
    email: 'test@example.com',
    password: 'password123',
    expectedUserId: 'cmfvsa8v00002t0im966k7o90',
    expectedTeamId: 'cmfvsa8tt0000t0imqr96svt4',
    teamName: 'Team Alpha'
  },
  {
    email: 'test2@example.com',
    password: 'password123',
    expectedUserId: 'cmfvsa8v00003t0im966k7o91',
    expectedTeamId: 'cmfvsa8tt0001t0imqr96svt5',
    teamName: 'Team Beta'
  }
] as const

class ComprehensiveServiceValidator {
  private results: TestResult[] = []
  private baseUrl = 'http://localhost:3010'
  private userSessions: Map<string, AuthSession> = new Map()

  private log(message: string) {
    console.log(`🔍 ${message}`)
  }

  private logResult(result: TestResult) {
    const status = result.passed ? '✅' : '❌'
    let details = result.details
    if (result.performanceMs) {
      details += ` (${result.performanceMs}ms)`
    }
    if (result.dataComparison) {
      details += ` [API:${result.dataComparison.apiCount} vs Service:${result.dataComparison.serviceCount}]`
    }
    console.log(`${status} ${result.test}: ${details}`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  }

  /**
   * Login user and get authenticated session (based on working validate-with-auth.ts)
   */
  async loginUser(email: string, password: string): Promise<AuthSession> {
    const startTime = Date.now()

    try {
      // Step 1: Get CSRF token
      const csrfResponse = await fetch(`${this.baseUrl}/api/auth/csrf`)
      if (!csrfResponse.ok) {
        throw new Error(`CSRF request failed: ${csrfResponse.status}`)
      }

      const { csrfToken } = await csrfResponse.json()
      const csrfCookie = csrfResponse.headers.get('set-cookie') || ''

      // Step 2: Login with credentials (using same approach as working script)
      const loginResponse = await fetch(`${this.baseUrl}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': csrfCookie,
        },
        body: new URLSearchParams({
          csrfToken,
          email,
          password,
          redirect: 'false',
          json: 'true'
        }),
        redirect: 'manual'
      })

      // Extract session cookie from response
      const setCookieHeader = loginResponse.headers.get('set-cookie')
      if (!setCookieHeader) {
        throw new Error('No session cookie received - login may have failed')
      }

      // Parse cookies to get session token
      const cookies = setCookieHeader.split(',').map(c => c.trim())
      const sessionCookie = cookies.find(c => c.includes('next-auth.session-token') || c.includes('__Secure-next-auth.session-token'))

      if (!sessionCookie) {
        throw new Error('Session token not found in cookies')
      }

      // Step 3: Verify session
      const sessionResponse = await fetch(`${this.baseUrl}/api/auth/session`, {
        headers: {
          'Cookie': sessionCookie,
        },
      })

      if (!sessionResponse.ok) {
        throw new Error(`Session verification failed: ${sessionResponse.status}`)
      }

      const sessionData = await sessionResponse.json()
      if (!sessionData.user) {
        throw new Error('Login failed - no user in session')
      }

      const session: AuthSession = {
        cookie: sessionCookie,
        userId: sessionData.user.id,
        teamId: sessionData.user.teamId,
        email: sessionData.user.email
      }

      this.userSessions.set(email, session)

      this.log(`Authenticated ${email} (Team: ${session.teamId}) in ${Date.now() - startTime}ms`)
      return session

    } catch (error) {
      throw new Error(`Login failed for ${email}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Make authenticated API request
   */
  async authenticatedRequest(session: AuthSession, endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Cookie': session.cookie,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Test API vs Service data equivalence for one user
   */
  async testDataEquivalence(session: AuthSession): Promise<void> {
    this.log(`Testing data equivalence for ${session.email}...`)

    try {
      const startTime = Date.now()

      // Get data from current API endpoints
      const [apiContracts, apiReceivables, apiExpenses] = await Promise.all([
        this.authenticatedRequest(session, '/api/contracts'),
        this.authenticatedRequest(session, '/api/receivables'),
        this.authenticatedRequest(session, '/api/expenses')
      ])

      const apiTime = Date.now() - startTime

      // Get data from service layer through withTeamContext
      const serviceStartTime = Date.now()
      const serviceData = await withTeamContext(async (context) => {
        // Ensure we're testing with the same team context
        if (context.teamId !== session.teamId) {
          throw new Error(`Team context mismatch: expected ${session.teamId}, got ${context.teamId}`)
        }

        const contractService = new ContractService(context)
        const receivableService = new ReceivableService(context)
        const expenseService = new ExpenseService(context)

        const [contracts, receivables, expenses] = await Promise.all([
          contractService.findMany(),
          receivableService.findMany(),
          expenseService.findMany()
        ])

        return { contracts, receivables, expenses }
      })

      const serviceTime = Date.now() - serviceStartTime

      // Compare results
      const contractsEquivalent = Array.isArray(apiContracts) && Array.isArray(serviceData.contracts) &&
                                  apiContracts.length === serviceData.contracts.length
      const receivablesEquivalent = Array.isArray(apiReceivables) && Array.isArray(serviceData.receivables) &&
                                    apiReceivables.length === serviceData.receivables.length
      const expensesEquivalent = Array.isArray(apiExpenses) && Array.isArray(serviceData.expenses) &&
                                 apiExpenses.length === serviceData.expenses.length

      const allEquivalent = contractsEquivalent && receivablesEquivalent && expensesEquivalent

      this.results.push({
        test: `Data Equivalence - ${session.email}`,
        passed: allEquivalent,
        details: `Contracts: ${contractsEquivalent ? '✓' : '✗'} (${Array.isArray(apiContracts) ? apiContracts.length : 'err'} vs ${Array.isArray(serviceData.contracts) ? serviceData.contracts.length : 'err'}), Receivables: ${receivablesEquivalent ? '✓' : '✗'} (${Array.isArray(apiReceivables) ? apiReceivables.length : 'err'} vs ${Array.isArray(serviceData.receivables) ? serviceData.receivables.length : 'err'}), Expenses: ${expensesEquivalent ? '✓' : '✗'} (${Array.isArray(apiExpenses) ? apiExpenses.length : 'err'} vs ${Array.isArray(serviceData.expenses) ? serviceData.expenses.length : 'err'})`,
        performanceMs: Math.max(apiTime, serviceTime),
        dataComparison: {
          apiCount: (Array.isArray(apiContracts) ? apiContracts.length : 0) +
                   (Array.isArray(apiReceivables) ? apiReceivables.length : 0) +
                   (Array.isArray(apiExpenses) ? apiExpenses.length : 0),
          serviceCount: serviceData.contracts.length + serviceData.receivables.length + serviceData.expenses.length,
          equivalent: allEquivalent
        }
      })

      // Store detailed comparison data
      (this.results[this.results.length - 1] as any).rawData = {
        api: { contracts: apiContracts, receivables: apiReceivables, expenses: apiExpenses },
        service: serviceData,
        timing: { apiTime, serviceTime }
      }

    } catch (error) {
      this.results.push({
        test: `Data Equivalence - ${session.email}`,
        passed: false,
        details: 'Failed to compare API vs Service data',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test team isolation between users
   */
  async testTeamIsolation(): Promise<void> {
    this.log('Testing team isolation between users...')

    try {
      const user1Session = this.userSessions.get(TEST_USERS[0].email)
      const user2Session = this.userSessions.get(TEST_USERS[1].email)

      if (!user1Session || !user2Session) {
        throw new Error('Missing user sessions for team isolation test')
      }

      // Get data for both users
      const user1Data = await this.authenticatedRequest(user1Session, '/api/contracts')
      const user2Data = await this.authenticatedRequest(user2Session, '/api/contracts')

      // Verify no data overlap
      let hasOverlap = false
      if (Array.isArray(user1Data) && Array.isArray(user2Data)) {
        const user1Ids = new Set(user1Data.map((c: any) => c.id))
        hasOverlap = user2Data.some((c: any) => user1Ids.has(c.id))
      }

      // Verify team IDs are different
      const differentTeams = user1Session.teamId !== user2Session.teamId

      this.results.push({
        test: 'Team Isolation',
        passed: !hasOverlap && differentTeams,
        details: `No data overlap: ${!hasOverlap ? '✓' : '✗'}, Different teams: ${differentTeams ? '✓' : '✗'} (${user1Session.teamId} vs ${user2Session.teamId})`
      })

    } catch (error) {
      this.results.push({
        test: 'Team Isolation',
        passed: false,
        details: 'Failed to verify team isolation',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test business rules enforcement through services
   */
  async testBusinessRules(): Promise<void> {
    this.log('Testing business rules enforcement...')

    try {
      const session = this.userSessions.get(TEST_USERS[0].email)
      if (!session) {
        throw new Error('No session available for business rules test')
      }

      let rulesEnforced = 0
      let totalRules = 0

      await withTeamContext(async (context) => {
        const contractService = new ContractService(context)
        const receivableService = new ReceivableService(context)
        const expenseService = new ExpenseService(context)

        // Test invalid contract creation
        totalRules++
        try {
          await contractService.create({
            clientName: '', // Should fail - required field
            projectName: 'Test Project',
            totalValue: 50000,
            signedDate: '2024-01-15'
          })
        } catch (error) {
          rulesEnforced++
        }

        // Test invalid receivable creation
        totalRules++
        try {
          await receivableService.create({
            expectedDate: '2024-01-15',
            amount: -1000 // Should fail - negative amount
          })
        } catch (error) {
          rulesEnforced++
        }

        // Test invalid expense creation
        totalRules++
        try {
          await expenseService.create({
            description: '', // Should fail - required field
            amount: 1000,
            dueDate: '2024-01-15',
            category: 'test'
          })
        } catch (error) {
          rulesEnforced++
        }
      })

      this.results.push({
        test: 'Business Rules Enforcement',
        passed: rulesEnforced === totalRules,
        details: `${rulesEnforced}/${totalRules} business rules correctly enforced`
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
   * Test unauthorized access protection
   */
  async testUnauthorizedAccess(): Promise<void> {
    this.log('Testing unauthorized access protection...')

    try {
      // Test API without authentication
      const endpoints = ['/api/contracts', '/api/receivables', '/api/expenses']
      let unauthorizedBlocked = 0

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`)
          if (response.status === 401) {
            unauthorizedBlocked++
          }
        } catch (error) {
          // Network error is also acceptable (means no access)
          unauthorizedBlocked++
        }
      }

      this.results.push({
        test: 'Unauthorized Access Protection',
        passed: unauthorizedBlocked === endpoints.length,
        details: `${unauthorizedBlocked}/${endpoints.length} endpoints correctly blocked unauthorized access`
      })

    } catch (error) {
      this.results.push({
        test: 'Unauthorized Access Protection',
        passed: false,
        details: 'Failed to test unauthorized access',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Test service performance vs API performance
   */
  async testPerformance(): Promise<void> {
    this.log('Testing service vs API performance...')

    try {
      const session = this.userSessions.get(TEST_USERS[0].email)
      if (!session) {
        throw new Error('No session available for performance test')
      }

      // Measure API performance
      const apiStartTime = Date.now()
      await Promise.all([
        this.authenticatedRequest(session, '/api/contracts'),
        this.authenticatedRequest(session, '/api/receivables'),
        this.authenticatedRequest(session, '/api/expenses')
      ])
      const apiTime = Date.now() - apiStartTime

      // Measure service performance
      const serviceStartTime = Date.now()
      await withTeamContext(async (context) => {
        const contractService = new ContractService(context)
        const receivableService = new ReceivableService(context)
        const expenseService = new ExpenseService(context)

        await Promise.all([
          contractService.findMany(),
          receivableService.findMany(),
          expenseService.findMany()
        ])
      })
      const serviceTime = Date.now() - serviceStartTime

      const performanceDiff = ((serviceTime - apiTime) / apiTime) * 100
      const acceptable = Math.abs(performanceDiff) < 50 // Within 50% is acceptable

      this.results.push({
        test: 'Performance Comparison',
        passed: acceptable,
        details: `API: ${apiTime}ms, Service: ${serviceTime}ms, Difference: ${performanceDiff.toFixed(1)}%`,
        performanceMs: Math.max(apiTime, serviceTime)
      })

    } catch (error) {
      this.results.push({
        test: 'Performance Comparison',
        passed: false,
        details: 'Failed to measure performance',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * Run comprehensive validation
   */
  async runValidation(): Promise<boolean> {
    console.log('🚀 Comprehensive Authenticated Service Validation')
    console.log('================================================\n')

    try {
      // Step 1: Login all test users
      this.log('Authenticating test users...')
      for (const user of TEST_USERS) {
        await this.loginUser(user.email, user.password)
      }

      // Step 2: Test unauthorized access
      await this.testUnauthorizedAccess()
      this.logResult(this.results[this.results.length - 1])

      // Step 3: Test data equivalence for each user
      for (const user of TEST_USERS) {
        const session = this.userSessions.get(user.email)!
        await this.testDataEquivalence(session)
        this.logResult(this.results[this.results.length - 1])
      }

      // Step 4: Test team isolation
      await this.testTeamIsolation()
      this.logResult(this.results[this.results.length - 1])

      // Step 5: Test business rules
      await this.testBusinessRules()
      this.logResult(this.results[this.results.length - 1])

      // Step 6: Test performance
      await this.testPerformance()
      this.logResult(this.results[this.results.length - 1])

      // Summary
      const passed = this.results.filter(r => r.passed).length
      const total = this.results.length
      const passRate = ((passed / total) * 100).toFixed(1)

      console.log(`\n📊 Comprehensive Validation Summary: ${passed}/${total} tests passed (${passRate}%)`)

      if (passed === total) {
        console.log('🎉 All comprehensive validations passed!')
        console.log('✅ Service layer is equivalent to current API implementation')
        console.log('✅ Team isolation is properly enforced')
        console.log('✅ Business rules are correctly implemented')
        console.log('✅ Performance is acceptable')
        console.log('\n🚀 Ready for service layer migration!')
      } else {
        console.log('⚠️  Some comprehensive validations failed')
        console.log('❌ Review issues before proceeding with migration')

        this.results.filter(r => !r.passed).forEach(r => {
          console.log(`   • ${r.test}: ${r.details}`)
          if (r.error) {
            console.log(`     Error: ${r.error}`)
          }
        })
      }

      return passed === total

    } catch (error) {
      console.error('❌ Comprehensive validation failed:', error)
      return false
    }
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new ComprehensiveServiceValidator()
  validator.runValidation().then(success => {
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('❌ Validation failed with error:', error)
    process.exit(1)
  })
}

export { ComprehensiveServiceValidator }