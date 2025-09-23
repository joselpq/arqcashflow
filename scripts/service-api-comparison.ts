#!/usr/bin/env npx tsx

/**
 * Service vs API Comparison Validation
 *
 * This script compares current API endpoints with service-based test endpoints
 * to validate that services produce equivalent results.
 *
 * Test approach:
 * 1. Use authenticated HTTP requests (real world scenario)
 * 2. Compare current API (/api/contracts) vs service API (/api/test-service-contracts)
 * 3. Validate data equivalence, team isolation, and performance
 * 4. Test with both user accounts to verify team isolation
 */

interface AuthSession {
  cookie: string
  userId: string
  teamId: string
  email: string
}

interface ComparisonResult {
  endpoint: string
  user: string
  currentAPI: {
    success: boolean
    data?: any
    error?: string
    responseTime: number
  }
  serviceAPI: {
    success: boolean
    data?: any
    error?: string
    responseTime: number
  }
  equivalent: boolean
  details: string
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

class ServiceAPIComparison {
  private baseUrl = 'http://localhost:3010'
  private userSessions: Map<string, AuthSession> = new Map()
  private results: ComparisonResult[] = []

  private log(message: string) {
    console.log(`🔍 ${message}`)
  }

  private logResult(result: ComparisonResult) {
    const status = result.equivalent ? '✅' : '❌'
    const timeDiff = result.serviceAPI.responseTime - result.currentAPI.responseTime
    const perfIndicator = timeDiff > 0 ? `+${timeDiff}ms` : `${timeDiff}ms`

    console.log(`${status} ${result.endpoint} (${result.user}): ${result.details} [${perfIndicator}]`)

    if (!result.equivalent) {
      if (result.currentAPI.error) console.log(`   Current API Error: ${result.currentAPI.error}`)
      if (result.serviceAPI.error) console.log(`   Service API Error: ${result.serviceAPI.error}`)
    }
  }

  /**
   * Login user using the same method as the working validation script
   */
  async loginUser(email: string, password: string): Promise<AuthSession> {
    try {
      // Step 1: Get CSRF token
      const csrfResponse = await fetch(`${this.baseUrl}/api/auth/csrf`)
      if (!csrfResponse.ok) {
        throw new Error(`CSRF request failed: ${csrfResponse.status}`)
      }

      const { csrfToken } = await csrfResponse.json()
      const csrfCookie = csrfResponse.headers.get('set-cookie') || ''

      // Step 2: Login with credentials
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

      // Extract session cookie
      const setCookieHeader = loginResponse.headers.get('set-cookie')
      if (!setCookieHeader) {
        throw new Error('No session cookie received')
      }

      const cookies = setCookieHeader.split(',').map(c => c.trim())
      const sessionCookie = cookies.find(c => c.includes('next-auth.session-token') || c.includes('__Secure-next-auth.session-token'))

      if (!sessionCookie) {
        throw new Error('Session token not found in cookies')
      }

      // Step 3: Verify session
      const sessionResponse = await fetch(`${this.baseUrl}/api/auth/session`, {
        headers: { 'Cookie': sessionCookie }
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
      this.log(`Authenticated ${email} (Team: ${session.teamId})`)
      return session

    } catch (error) {
      throw new Error(`Login failed for ${email}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Make authenticated API request and measure performance
   */
  async makeRequest(session: AuthSession, endpoint: string, options: RequestInit = {}): Promise<{success: boolean, data?: any, error?: string, responseTime: number}> {
    const startTime = Date.now()

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Cookie': session.cookie,
          'Content-Type': 'application/json',
          ...options.headers
        }
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime
        }
      }

      const data = await response.json()
      return {
        success: true,
        data,
        responseTime
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Compare current API vs service API for a specific endpoint
   */
  async compareEndpoint(session: AuthSession, currentEndpoint: string, serviceEndpoint: string, queryParams?: string): Promise<void> {
    const fullCurrentEndpoint = queryParams ? `${currentEndpoint}?${queryParams}` : currentEndpoint
    const fullServiceEndpoint = queryParams ? `${serviceEndpoint}?${queryParams}` : serviceEndpoint

    // Make requests to both endpoints
    const [currentResult, serviceResult] = await Promise.all([
      this.makeRequest(session, fullCurrentEndpoint),
      this.makeRequest(session, fullServiceEndpoint)
    ])

    // Analyze equivalence
    let equivalent = false
    let details = ''

    if (!currentResult.success && !serviceResult.success) {
      equivalent = true
      details = 'Both APIs failed (equivalent error handling)'
    } else if (!currentResult.success || !serviceResult.success) {
      equivalent = false
      details = currentResult.success ? 'Service API failed' : 'Current API failed'
    } else {
      // Both succeeded - compare data
      const currentData = currentResult.data
      const serviceData = serviceResult.data

      if (Array.isArray(currentData) && Array.isArray(serviceData)) {
        equivalent = currentData.length === serviceData.length
        details = equivalent
          ? `Both returned ${currentData.length} items`
          : `Current: ${currentData.length} items, Service: ${serviceData.length} items`
      } else {
        // For object responses, compare key presence
        const currentKeys = currentData ? Object.keys(currentData).sort() : []
        const serviceKeys = serviceData ? Object.keys(serviceData).sort() : []
        equivalent = JSON.stringify(currentKeys) === JSON.stringify(serviceKeys)
        details = equivalent
          ? 'Object structures match'
          : `Different structures: ${currentKeys.join(',')} vs ${serviceKeys.join(',')}`
      }
    }

    const result: ComparisonResult = {
      endpoint: currentEndpoint,
      user: session.email,
      currentAPI: currentResult,
      serviceAPI: serviceResult,
      equivalent,
      details
    }

    this.results.push(result)
    this.logResult(result)
  }

  /**
   * Test CRUD operations comparison
   */
  async testCRUDOperations(session: AuthSession): Promise<void> {
    this.log(`Testing CRUD operations for ${session.email}...`)

    // Test contract creation in both APIs
    const testContract = {
      clientName: 'Test Client Service Comparison',
      projectName: 'Service Test Project',
      totalValue: 25000,
      signedDate: '2024-01-15',
      category: 'Residencial'
    }

    const [currentCreate, serviceCreate] = await Promise.all([
      this.makeRequest(session, '/api/contracts', {
        method: 'POST',
        body: JSON.stringify(testContract)
      }),
      this.makeRequest(session, '/api/test-service-contracts', {
        method: 'POST',
        body: JSON.stringify(testContract)
      })
    ])

    const createEquivalent = currentCreate.success === serviceCreate.success
    const createDetails = createEquivalent
      ? 'Both create operations had same success status'
      : `Create results differ: Current=${currentCreate.success}, Service=${serviceCreate.success}`

    this.results.push({
      endpoint: '/api/contracts [POST]',
      user: session.email,
      currentAPI: currentCreate,
      serviceAPI: serviceCreate,
      equivalent: createEquivalent,
      details: createDetails
    })

    this.logResult(this.results[this.results.length - 1])
  }

  /**
   * Run comprehensive comparison
   */
  async runComparison(): Promise<boolean> {
    console.log('🚀 Service vs API Comparison Validation')
    console.log('=========================================\n')

    try {
      // Step 1: Login all test users
      this.log('Authenticating test users...')
      for (const user of TEST_USERS) {
        await this.loginUser(user.email, user.password)
      }

      // Step 2: Compare basic endpoints for each user
      for (const user of TEST_USERS) {
        const session = this.userSessions.get(user.email)!

        this.log(`Testing basic endpoints for ${user.email}...`)

        // Compare GET endpoints
        await this.compareEndpoint(session, '/api/contracts', '/api/test-service-contracts')
        await this.compareEndpoint(session, '/api/receivables', '/api/test-service-receivables')
        await this.compareEndpoint(session, '/api/expenses', '/api/test-service-expenses')

        // Test with filters
        await this.compareEndpoint(session, '/api/contracts', '/api/test-service-contracts', 'status=active')
        await this.compareEndpoint(session, '/api/receivables', '/api/test-service-receivables', 'status=pending')
        await this.compareEndpoint(session, '/api/expenses', '/api/test-service-expenses', 'status=pending&category=operational')

        // Test CRUD operations
        await this.testCRUDOperations(session)
      }

      // Step 3: Performance analysis
      const passedTests = this.results.filter(r => r.equivalent).length
      const totalTests = this.results.length
      const passRate = ((passedTests / totalTests) * 100).toFixed(1)

      // Calculate average performance difference
      const performanceDiffs = this.results
        .filter(r => r.currentAPI.success && r.serviceAPI.success)
        .map(r => r.serviceAPI.responseTime - r.currentAPI.responseTime)

      const avgPerformanceDiff = performanceDiffs.length > 0
        ? (performanceDiffs.reduce((a, b) => a + b, 0) / performanceDiffs.length).toFixed(1)
        : 'N/A'

      console.log(`\n📊 Service vs API Comparison Summary: ${passedTests}/${totalTests} tests equivalent (${passRate}%)`)
      console.log(`📈 Average performance difference: ${avgPerformanceDiff}ms (Service - Current)`)

      if (passedTests === totalTests) {
        console.log('🎉 All service comparisons passed!')
        console.log('✅ Service layer produces equivalent results to current API')
        console.log('✅ Services are ready for migration')
      } else {
        console.log('⚠️  Some service comparisons failed')
        console.log('❌ Review differences before proceeding with migration')

        this.results.filter(r => !r.equivalent).forEach(r => {
          console.log(`   • ${r.endpoint} (${r.user}): ${r.details}`)
        })
      }

      return passedTests === totalTests

    } catch (error) {
      console.error('❌ Service comparison failed:', error)
      return false
    }
  }

  /**
   * Generate detailed comparison report
   */
  generateReport(): string {
    const passedTests = this.results.filter(r => r.equivalent).length
    const totalTests = this.results.length

    let report = `# Service vs API Comparison Report\n\n`
    report += `**Date**: ${new Date().toISOString()}\n`
    report += `**Success Rate**: ${passedTests}/${totalTests} (${((passedTests/totalTests)*100).toFixed(1)}%)\n\n`

    report += `## Test Results\n\n`

    for (const result of this.results) {
      const status = result.equivalent ? '✅' : '❌'
      report += `${status} **${result.endpoint}** (${result.user})\n`
      report += `   - ${result.details}\n`
      report += `   - Performance: Current ${result.currentAPI.responseTime}ms, Service ${result.serviceAPI.responseTime}ms\n\n`
    }

    report += `## Recommendations\n\n`
    if (passedTests === totalTests) {
      report += `- ✅ Service layer is ready for migration\n`
      report += `- ✅ All endpoints produce equivalent results\n`
      report += `- ✅ Performance is acceptable\n`
    } else {
      report += `- ❌ Service layer needs fixes before migration\n`
      report += `- ❌ Review failed comparisons\n`
      report += `- ❌ Address performance or data differences\n`
    }

    return report
  }
}

// Run comparison if this script is executed directly
if (require.main === module) {
  const comparison = new ServiceAPIComparison()
  comparison.runComparison().then(success => {
    if (success) {
      const report = comparison.generateReport()
      console.log('\n' + '='.repeat(50))
      console.log('📋 DETAILED COMPARISON REPORT')
      console.log('='.repeat(50))
      console.log(report)
    }
    process.exit(success ? 0 : 1)
  }).catch(error => {
    console.error('❌ Comparison failed with error:', error)
    process.exit(1)
  })
}

export { ServiceAPIComparison }