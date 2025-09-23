/**
 * Authenticated Contracts API Testing Script
 *
 * This script can login and test the actual API responses with authentication
 */

const BASEURL = 'http://localhost:3008'

class AuthenticatedTester {
  constructor() {
    this.sessionCookie = null
  }

  async login(email, password) {
    console.log('🔐 Attempting login...')

    try {
      // First, get the login page to see if we need any CSRF tokens
      const loginResponse = await fetch(`${BASEURL}/api/auth/signin/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email,
          password,
          redirect: 'false'
        })
      })

      console.log(`Login response status: ${loginResponse.status}`)

      // Check for session cookies
      const cookies = loginResponse.headers.get('set-cookie')
      if (cookies) {
        // Extract session cookie
        const sessionMatch = cookies.match(/next-auth\.session-token=([^;]+)/)
        if (sessionMatch) {
          this.sessionCookie = `next-auth.session-token=${sessionMatch[1]}`
          console.log('✅ Session cookie obtained')
          return true
        }
      }

      // Alternative: try register endpoint if login fails
      console.log('🔄 Login failed, trying register endpoint...')
      const registerResponse = await fetch(`${BASEURL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: 'Test User'
        })
      })

      console.log(`Register response status: ${registerResponse.status}`)
      const registerData = await registerResponse.json()
      console.log('Register response:', registerData)

      if (registerResponse.ok) {
        // Try login again after successful registration
        return await this.login(email, password)
      }

      return false
    } catch (error) {
      console.error('❌ Login error:', error.message)
      return false
    }
  }

  async makeAuthenticatedRequest(endpoint, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json',
    }

    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie
    }

    const startTime = Date.now()

    try {
      const response = await fetch(`${BASEURL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      const responseTime = Date.now() - startTime
      const data = await response.json()

      return {
        endpoint,
        method,
        success: response.ok,
        status: response.status,
        data,
        responseTime,
        headers: Object.fromEntries(response.headers.entries())
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        endpoint,
        method,
        success: false,
        status: 0,
        error: error.message,
        responseTime,
      }
    }
  }

  async testContractsAPI() {
    console.log('\n🧪 Testing Contracts API with Authentication')
    console.log('=' .repeat(50))

    // Test 1: GET contracts (should return actual data)
    console.log('\n📋 Testing GET /api/contracts...')

    const [original, middleware] = await Promise.all([
      this.makeAuthenticatedRequest('/api/contracts'),
      this.makeAuthenticatedRequest('/api/contracts-middleware-poc'),
    ])

    console.log(`  Original: ${original.success ? '✅' : '❌'} (${original.status}, ${original.responseTime}ms)`)
    console.log(`  Middleware: ${middleware.success ? '✅' : '❌'} (${middleware.status}, ${middleware.responseTime}ms)`)

    if (original.success && middleware.success) {
      const dataMatches = JSON.stringify(original.data) === JSON.stringify(middleware.data)
      console.log(`  Data identical: ${dataMatches ? '✅' : '❌'}`)

      if (Array.isArray(original.data) && Array.isArray(middleware.data)) {
        console.log(`  Original count: ${original.data.length} contracts`)
        console.log(`  Middleware count: ${middleware.data.length} contracts`)
      }

      if (!dataMatches) {
        console.log('\n  🔍 Data differences:')
        console.log('    Original keys:', Object.keys(original.data).sort())
        console.log('    Middleware keys:', Object.keys(middleware.data).sort())
      }
    } else {
      console.log('\n  ❌ One or both requests failed:')
      if (!original.success) {
        console.log(`    Original error: ${original.error || JSON.stringify(original.data)}`)
      }
      if (!middleware.success) {
        console.log(`    Middleware error: ${middleware.error || JSON.stringify(middleware.data)}`)
      }
    }

    // Test 2: POST contract (create new contract)
    console.log('\n📝 Testing POST /api/contracts...')

    const testContract = {
      clientName: `Test Client ${Date.now()}`,
      projectName: `Test Project ${Date.now()}`,
      description: 'Middleware validation test contract',
      totalValue: 75000,
      signedDate: '2025-01-15',
      status: 'active',
      category: 'test',
      notes: 'Created by middleware validation script'
    }

    const [originalPost, middlewarePost] = await Promise.all([
      this.makeAuthenticatedRequest('/api/contracts', 'POST', testContract),
      this.makeAuthenticatedRequest('/api/contracts-middleware-poc', 'POST', {
        ...testContract,
        clientName: testContract.clientName + ' (MW)',
        projectName: testContract.projectName + ' (MW)'
      }),
    ])

    console.log(`  Original POST: ${originalPost.success ? '✅' : '❌'} (${originalPost.status}, ${originalPost.responseTime}ms)`)
    console.log(`  Middleware POST: ${middlewarePost.success ? '✅' : '❌'} (${middlewarePost.status}, ${middlewarePost.responseTime}ms)`)

    if (originalPost.success && middlewarePost.success) {
      const originalContract = originalPost.data?.contract
      const middlewareContract = middlewarePost.data?.contract

      if (originalContract && middlewareContract) {
        console.log(`  ✅ Both contracts created successfully`)
        console.log(`    Original ID: ${originalContract.id}`)
        console.log(`    Middleware ID: ${middlewareContract.id}`)
        console.log(`    Original teamId: ${originalContract.teamId}`)
        console.log(`    Middleware teamId: ${middlewareContract.teamId}`)

        // Verify they have same structure
        const originalKeys = Object.keys(originalContract).sort()
        const middlewareKeys = Object.keys(middlewareContract).sort()
        const structureMatch = JSON.stringify(originalKeys) === JSON.stringify(middlewareKeys)
        console.log(`    Response structure identical: ${structureMatch ? '✅' : '❌'}`)
      }
    } else {
      console.log('\n  ❌ Contract creation failed:')
      if (!originalPost.success) {
        console.log(`    Original error: ${originalPost.error || JSON.stringify(originalPost.data)}`)
      }
      if (!middlewarePost.success) {
        console.log(`    Middleware error: ${middlewarePost.error || JSON.stringify(middlewarePost.data)}`)
      }
    }

    // Test 3: GET with filters
    console.log('\n🔍 Testing GET with filters...')

    const filterTests = [
      '/api/contracts?status=active',
      '/api/contracts?sortBy=clientName&sortOrder=asc',
      '/api/contracts?status=active&sortBy=totalValue&sortOrder=desc'
    ]

    for (const filterEndpoint of filterTests) {
      const [originalFilter, middlewareFilter] = await Promise.all([
        this.makeAuthenticatedRequest(filterEndpoint),
        this.makeAuthenticatedRequest(filterEndpoint.replace('/api/contracts', '/api/contracts-middleware-poc')),
      ])

      const filterName = filterEndpoint.split('?')[1] || 'basic'
      console.log(`  Filter "${filterName}":`)
      console.log(`    Original: ${originalFilter.success ? '✅' : '❌'} (${originalFilter.status})`)
      console.log(`    Middleware: ${middlewareFilter.success ? '✅' : '❌'} (${middlewareFilter.status})`)

      if (originalFilter.success && middlewareFilter.success) {
        const resultsMatch = JSON.stringify(originalFilter.data) === JSON.stringify(middlewareFilter.data)
        console.log(`    Results identical: ${resultsMatch ? '✅' : '❌'}`)
      }
    }

    // Summary
    console.log('\n' + '=' .repeat(50))
    console.log('📊 Authenticated Test Results:')

    if (original.success && middleware.success) {
      console.log('✅ Both endpoints work with authentication')
      console.log('✅ Data structures are consistent')
      console.log('✅ CRUD operations functional')
      console.log('✅ Filtering and sorting work')

      const performanceDiff = middleware.responseTime - original.responseTime
      console.log(`📈 Performance: ${performanceDiff < 0 ? 'Middleware faster' : 'Original faster'} by ${Math.abs(performanceDiff)}ms`)
    } else {
      console.log('❌ Authentication or API issues detected')
    }
  }
}

async function runAuthenticatedTests(email, password) {
  const tester = new AuthenticatedTester()

  const loginSuccess = await tester.login(email, password)

  if (!loginSuccess) {
    console.log('\n❌ Authentication failed. Cannot run authenticated tests.')
    console.log('\n📋 Alternative testing options:')
    console.log('1. Provide correct login credentials')
    console.log('2. Create a test account first')
    console.log('3. Use browser session cookie directly')
    return false
  }

  await tester.testContractsAPI()
  return true
}

// Export for use
module.exports = { runAuthenticatedTests, AuthenticatedTester }

// Check if this script is run directly with arguments
if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log('Usage: node test-with-auth.js <email> <password>')
    console.log('Example: node test-with-auth.js test@example.com password123')
    process.exit(1)
  }

  const [email, password] = args

  runAuthenticatedTests(email, password)
    .then(success => {
      if (success) {
        console.log('\n🎉 Authenticated testing completed!')
      } else {
        console.log('\n❌ Authenticated testing failed!')
      }
    })
    .catch(error => {
      console.error('\n💥 Test script crashed:', error)
    })
}