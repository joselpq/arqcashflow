/**
 * Contracts API Testing Plan
 *
 * This script provides a comprehensive test plan for validating
 * the middleware migration of the Contracts API.
 *
 * Usage:
 * 1. Start development server: npm run dev
 * 2. Run this script: npx tsx lib/middleware/test-contracts-api.ts
 * 3. Follow the manual testing instructions
 */

interface ContractTestData {
  clientName: string
  projectName: string
  description?: string
  totalValue: number
  signedDate: string
  status?: string
  category?: string
  notes?: string
}

interface TestResult {
  endpoint: string
  method: string
  success: boolean
  status: number
  data?: any
  error?: string
  responseTime: number
}

/**
 * Test data for contract creation
 */
const testContracts: ContractTestData[] = [
  {
    clientName: "Acme Corporation",
    projectName: "Office Building Renovation",
    description: "Complete renovation of 5-story office building",
    totalValue: 250000,
    signedDate: "2025-01-15",
    status: "active",
    category: "commercial",
    notes: "High priority project with tight deadline"
  },
  {
    clientName: "Smith Residence",
    projectName: "Modern Home Design",
    description: "Custom modern home with sustainable features",
    totalValue: 150000,
    signedDate: "2025-01-20",
    status: "active",
    category: "residential",
    notes: "Client prefers eco-friendly materials"
  },
  {
    clientName: "City of Springfield",
    projectName: "Community Center",
    totalValue: 500000,
    signedDate: "2025-02-01",
    category: "public"
  }
]

/**
 * Make HTTP request to API endpoint
 */
async function makeRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  headers: Record<string, string> = {}
): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const response = await fetch(`http://localhost:3008${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
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
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      endpoint,
      method,
      success: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
    }
  }
}

/**
 * Test basic endpoint availability
 */
async function testEndpointAvailability(): Promise<void> {
  console.log('🌐 Testing endpoint availability...')

  const [originalResult, middlewareResult] = await Promise.all([
    makeRequest('/api/contracts'),
    makeRequest('/api/contracts-middleware-poc'),
  ])

  console.log(`  Original endpoint: ${originalResult.success ? '✅' : '❌'} (${originalResult.status})`)
  console.log(`  Middleware endpoint: ${middlewareResult.success ? '✅' : '❌'} (${middlewareResult.status})`)

  // Both should return 401 (Unauthorized) since we don't have auth
  if (originalResult.status === 401 && middlewareResult.status === 401) {
    console.log('  ✅ Both endpoints require authentication (expected)')
  } else {
    console.log('  ⚠️  Unexpected status codes - check server logs')
  }
}

/**
 * Test GET operations (listing contracts)
 */
async function testGetOperations(): Promise<void> {
  console.log('\n📋 Testing GET operations...')

  const testCases = [
    { endpoint: '/api/contracts', name: 'Basic list' },
    { endpoint: '/api/contracts?status=active', name: 'Filter by status' },
    { endpoint: '/api/contracts?category=commercial', name: 'Filter by category' },
    { endpoint: '/api/contracts?sortBy=clientName&sortOrder=asc', name: 'Sort by client name' },
    { endpoint: '/api/contracts?sortBy=totalValue&sortOrder=desc', name: 'Sort by value' },
  ]

  for (const testCase of testCases) {
    console.log(`\n  Testing: ${testCase.name}`)

    const [original, middleware] = await Promise.all([
      makeRequest(testCase.endpoint),
      makeRequest(testCase.endpoint.replace('/api/contracts', '/api/contracts-middleware-poc')),
    ])

    console.log(`    Original: ${original.success ? '✅' : '❌'} (${original.status}, ${original.responseTime}ms)`)
    console.log(`    Middleware: ${middleware.success ? '✅' : '❌'} (${middleware.status}, ${middleware.responseTime}ms)`)

    if (original.success && middleware.success) {
      const dataMatches = JSON.stringify(original.data) === JSON.stringify(middleware.data)
      console.log(`    Data matches: ${dataMatches ? '✅' : '❌'}`)

      if (!dataMatches && Array.isArray(original.data) && Array.isArray(middleware.data)) {
        console.log(`    Array lengths: original=${original.data.length}, middleware=${middleware.data.length}`)
      }
    }
  }
}

/**
 * Test POST operations (creating contracts)
 */
async function testPostOperations(): Promise<void> {
  console.log('\n📝 Testing POST operations...')

  for (let i = 0; i < testContracts.length; i++) {
    const contract = testContracts[i]
    console.log(`\n  Testing contract ${i + 1}: ${contract.clientName}`)

    const [original, middleware] = await Promise.all([
      makeRequest('/api/contracts', 'POST', contract),
      makeRequest('/api/contracts-middleware-poc', 'POST', contract),
    ])

    console.log(`    Original: ${original.success ? '✅' : '❌'} (${original.status}, ${original.responseTime}ms)`)
    console.log(`    Middleware: ${middleware.success ? '✅' : '❌'} (${middleware.status}, ${middleware.responseTime}ms)`)

    if (original.success && middleware.success) {
      // Compare response structure (IDs will be different)
      const originalContract = original.data?.contract
      const middlewareContract = middleware.data?.contract

      if (originalContract && middlewareContract) {
        const fieldsMatch =
          originalContract.clientName === middlewareContract.clientName &&
          originalContract.projectName === middlewareContract.projectName &&
          originalContract.totalValue === middlewareContract.totalValue

        console.log(`    Contract data matches: ${fieldsMatch ? '✅' : '❌'}`)
        console.log(`    Original ID: ${originalContract.id}`)
        console.log(`    Middleware ID: ${middlewareContract.id}`)
      }
    } else {
      if (!original.success) {
        console.log(`    Original error: ${original.error || JSON.stringify(original.data)}`)
      }
      if (!middleware.success) {
        console.log(`    Middleware error: ${middleware.error || JSON.stringify(middleware.data)}`)
      }
    }
  }
}

/**
 * Test validation and error handling
 */
async function testValidationAndErrors(): Promise<void> {
  console.log('\n🚨 Testing validation and error handling...')

  const invalidContracts = [
    {
      name: 'Missing required fields',
      data: { clientName: 'Test Client' } // Missing projectName, totalValue
    },
    {
      name: 'Invalid data types',
      data: {
        clientName: 'Test Client',
        projectName: 'Test Project',
        totalValue: 'not-a-number', // Should be number
        signedDate: '2025-01-01'
      }
    },
    {
      name: 'Empty strings',
      data: {
        clientName: '',
        projectName: '',
        totalValue: 50000,
        signedDate: '2025-01-01'
      }
    }
  ]

  for (const testCase of invalidContracts) {
    console.log(`\n  Testing: ${testCase.name}`)

    const [original, middleware] = await Promise.all([
      makeRequest('/api/contracts', 'POST', testCase.data),
      makeRequest('/api/contracts-middleware-poc', 'POST', testCase.data),
    ])

    console.log(`    Original: ${original.success ? '⚠️ Accepted' : '✅ Rejected'} (${original.status})`)
    console.log(`    Middleware: ${middleware.success ? '⚠️ Accepted' : '✅ Rejected'} (${middleware.status})`)

    // Both should reject invalid data
    const bothRejected = !original.success && !middleware.success
    const statusMatch = original.status === middleware.status

    console.log(`    Both rejected: ${bothRejected ? '✅' : '❌'}`)
    console.log(`    Status codes match: ${statusMatch ? '✅' : '❌'}`)
  }
}

/**
 * Performance comparison
 */
async function performanceComparison(): Promise<void> {
  console.log('\n⏱️  Performance comparison...')

  const iterations = 5
  const originalTimes: number[] = []
  const middlewareTimes: number[] = []

  for (let i = 0; i < iterations; i++) {
    const [original, middleware] = await Promise.all([
      makeRequest('/api/contracts'),
      makeRequest('/api/contracts-middleware-poc'),
    ])

    if (original.responseTime) originalTimes.push(original.responseTime)
    if (middleware.responseTime) middlewareTimes.push(middleware.responseTime)
  }

  if (originalTimes.length > 0 && middlewareTimes.length > 0) {
    const avgOriginal = originalTimes.reduce((a, b) => a + b, 0) / originalTimes.length
    const avgMiddleware = middlewareTimes.reduce((a, b) => a + b, 0) / middlewareTimes.length
    const improvement = ((avgOriginal - avgMiddleware) / avgOriginal) * 100

    console.log(`  Average response times:`)
    console.log(`    Original: ${avgOriginal.toFixed(1)}ms`)
    console.log(`    Middleware: ${avgMiddleware.toFixed(1)}ms`)
    console.log(`    Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`)
  }
}

/**
 * Main test runner
 */
async function runContractsAPITests(): Promise<void> {
  console.log('🧪 Contracts API Middleware Validation')
  console.log('=' .repeat(50))

  try {
    await testEndpointAvailability()
    await testGetOperations()
    await testPostOperations()
    await testValidationAndErrors()
    await performanceComparison()

    console.log('\n' + '=' .repeat(50))
    console.log('✅ All tests completed!')

    console.log('\n📋 Manual Testing Instructions:')
    console.log('If you have authentication set up, you can also test manually:')
    console.log('')
    console.log('1. GET contracts:')
    console.log('   curl "http://localhost:3007/api/contracts" -H "Cookie: your-session-cookie"')
    console.log('   curl "http://localhost:3007/api/contracts-middleware-poc" -H "Cookie: your-session-cookie"')
    console.log('')
    console.log('2. POST contract:')
    console.log('   curl -X POST "http://localhost:3007/api/contracts" \\')
    console.log('     -H "Content-Type: application/json" \\')
    console.log('     -H "Cookie: your-session-cookie" \\')
    console.log('     -d \'{"clientName":"Test Client","projectName":"Test Project","totalValue":50000,"signedDate":"2025-01-01"}\'')
    console.log('')
    console.log('3. Compare responses - they should be identical!')

  } catch (error) {
    console.error('\n❌ Test runner failed:', error)
    process.exit(1)
  }
}

// Export for potential use
export { runContractsAPITests }

// Run tests if this script is executed directly
if (require.main === module) {
  runContractsAPITests()
    .then(() => {
      console.log('\n🎉 Test suite completed successfully!')
    })
    .catch(error => {
      console.error('\n💥 Test suite crashed:', error)
      process.exit(1)
    })
}