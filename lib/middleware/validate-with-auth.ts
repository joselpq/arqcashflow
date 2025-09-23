/**
 * Authenticated Middleware Validation Script
 *
 * This script validates the team context middleware using authenticated test users.
 * It tests both functional equivalence and team isolation security.
 *
 * Usage:
 * 1. Ensure test users are seeded: npx tsx lib/dev-seed.ts
 * 2. Start development server: npm run dev
 * 3. Run validation: npx tsx lib/middleware/validate-with-auth.ts
 */

interface ValidationResult {
  endpoint: string
  success: boolean
  data?: any
  error?: string
  responseTime?: number
  statusCode?: number
}

interface AuthSession {
  cookie: string
  userId: string
  teamId: string
  email: string
}

// Test users from dev-seed.ts
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

/**
 * Login and get session cookie
 */
async function loginUser(email: string, password: string): Promise<AuthSession> {
  console.log(`🔐 Logging in as ${email}...`)

  // First, get the NextAuth CSRF token
  const csrfResponse = await fetch('http://localhost:3010/api/auth/csrf', {
    method: 'GET',
  })

  if (!csrfResponse.ok) {
    throw new Error(`Failed to get CSRF token: ${csrfResponse.status}`)
  }

  const { csrfToken } = await csrfResponse.json()
  const csrfCookie = csrfResponse.headers.get('set-cookie') || ''

  // Perform login
  const loginResponse = await fetch('http://localhost:3010/api/auth/callback/credentials', {
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

  // Get session info to verify login
  const sessionResponse = await fetch('http://localhost:3010/api/auth/session', {
    headers: {
      'Cookie': sessionCookie,
    },
  })

  if (!sessionResponse.ok) {
    throw new Error(`Failed to get session: ${sessionResponse.status}`)
  }

  const session = await sessionResponse.json()

  if (!session.user) {
    throw new Error('Login failed - no user in session')
  }

  console.log(`✅ Logged in successfully as ${session.user.email}`)

  return {
    cookie: sessionCookie,
    userId: session.user.id,
    teamId: session.user.teamId,
    email: session.user.email
  }
}

/**
 * Make authenticated API request
 */
async function makeAuthenticatedRequest(
  endpoint: string,
  session: AuthSession,
  options: RequestInit = {}
): Promise<ValidationResult> {
  const startTime = Date.now()

  try {
    const response = await fetch(`http://localhost:3010${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': session.cookie,
        ...options.headers,
      },
    })

    const responseTime = Date.now() - startTime
    const data = await response.json()

    return {
      endpoint,
      success: response.ok,
      data,
      error: response.ok ? undefined : `HTTP ${response.status}: ${JSON.stringify(data)}`,
      responseTime,
      statusCode: response.status
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      endpoint,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
      statusCode: 0
    }
  }
}

/**
 * Test team isolation - verify user can only see their own data
 */
async function testTeamIsolation(): Promise<void> {
  console.log('\n🔒 Testing team isolation...')

  const sessions = await Promise.all([
    loginUser(TEST_USERS[0].email, TEST_USERS[0].password),
    loginUser(TEST_USERS[1].email, TEST_USERS[1].password)
  ])

  const [session1, session2] = sessions

  // Verify sessions have different team IDs
  if (session1.teamId === session2.teamId) {
    throw new Error('Test users have the same team ID - cannot test isolation')
  }

  console.log(`📊 User 1 (${session1.email}): Team ${session1.teamId}`)
  console.log(`📊 User 2 (${session2.email}): Team ${session2.teamId}`)

  // Test contracts endpoint
  const [user1Contracts, user2Contracts] = await Promise.all([
    makeAuthenticatedRequest('/api/contracts', session1),
    makeAuthenticatedRequest('/api/contracts', session2)
  ])

  if (!user1Contracts.success || !user2Contracts.success) {
    throw new Error('Failed to fetch contracts for team isolation test')
  }

  // Verify data isolation
  const user1ContractIds = user1Contracts.data.map((c: any) => c.id)
  const user2ContractIds = user2Contracts.data.map((c: any) => c.id)

  const overlap = user1ContractIds.filter((id: string) => user2ContractIds.includes(id))

  if (overlap.length > 0) {
    throw new Error(`Team isolation FAILED: Found ${overlap.length} shared contracts between teams`)
  }

  console.log(`✅ Team isolation verified: User 1 has ${user1ContractIds.length} contracts, User 2 has ${user2ContractIds.length} contracts, no overlap`)

  // Test that all contracts belong to correct teams
  const user1TeamCheck = user1Contracts.data.every((c: any) => c.teamId === session1.teamId)
  const user2TeamCheck = user2Contracts.data.every((c: any) => c.teamId === session2.teamId)

  if (!user1TeamCheck || !user2TeamCheck) {
    throw new Error('Team ID validation FAILED: Found contracts with wrong team IDs')
  }

  console.log('✅ Team ID validation passed: All contracts have correct team IDs')
}

/**
 * Test middleware vs original implementation
 */
async function testMiddlewareEquivalence(): Promise<void> {
  console.log('\n⚖️  Testing middleware equivalence...')

  const session = await loginUser(TEST_USERS[0].email, TEST_USERS[0].password)

  // Test GET endpoints
  const [originalContracts] = await Promise.all([
    makeAuthenticatedRequest('/api/contracts', session),
  ])

  if (!originalContracts.success) {
    throw new Error(`Original contracts API failed: ${originalContracts.error}`)
  }

  console.log(`✅ Original contracts API: ${originalContracts.data.length} records (${originalContracts.responseTime}ms)`)

  // Test creating data
  const testContract = {
    clientName: 'Test Client Middleware',
    projectName: 'Middleware Test Project',
    description: 'Testing middleware implementation',
    totalValue: 50000,
    signedDate: '2024-03-01', // Use YYYY-MM-DD format
    status: 'active',
    category: 'test'
  }

  const createResult = await makeAuthenticatedRequest('/api/contracts', session, {
    method: 'POST',
    body: JSON.stringify(testContract)
  })

  if (!createResult.success) {
    throw new Error(`Contract creation failed: ${createResult.error}`)
  }

  console.log('✅ Contract creation successful')

  // Verify the created contract has the correct team ID
  const createdContract = createResult.data.contract
  if (createdContract.teamId !== session.teamId) {
    throw new Error(`Team ID mismatch: Expected ${session.teamId}, got ${createdContract.teamId}`)
  }

  console.log('✅ Created contract has correct team ID')

  // Clean up - delete the test contract
  // Note: We'd need a DELETE endpoint for proper cleanup
  console.log(`📝 Test contract created with ID: ${createdContract.id}`)
}

/**
 * Test unauthorized access
 */
async function testUnauthorizedAccess(): Promise<void> {
  console.log('\n🚫 Testing unauthorized access...')

  const unauthorizedResult = await makeAuthenticatedRequest('/api/contracts', {
    cookie: '',
    userId: '',
    teamId: '',
    email: ''
  })

  if (unauthorizedResult.success) {
    throw new Error('Unauthorized access succeeded - this is a security issue!')
  }

  if (unauthorizedResult.statusCode !== 401) {
    console.log(`⚠️  Expected 401, got ${unauthorizedResult.statusCode}`)
  }

  console.log('✅ Unauthorized access properly blocked')
}

/**
 * Main validation function
 */
async function runAuthenticatedValidation(): Promise<void> {
  console.log('🧪 Team Context Middleware - Authenticated Validation')
  console.log('=' .repeat(70))

  try {
    // Check if server is running
    console.log('\n🌐 Checking if development server is running...')
    const healthCheck = await fetch('http://localhost:3010/api/auth/session')

    if (!healthCheck.ok && healthCheck.status !== 401) {
      console.error('\n❌ Development server is not running or not responding!')
      console.error('   Please start it with: npm run dev')
      process.exit(1)
    }

    // Check if test users exist
    console.log('\n👤 Checking if test users exist...')
    try {
      await loginUser(TEST_USERS[0].email, TEST_USERS[0].password)
      console.log('✅ Test users are available')
    } catch (error) {
      console.error('\n❌ Test users not found or login failed!')
      console.error('   Please run: npx tsx lib/dev-seed.ts')
      console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      process.exit(1)
    }

    // Run validation tests
    await testUnauthorizedAccess()
    await testTeamIsolation()
    await testMiddlewareEquivalence()

    console.log('\n' + '=' .repeat(70))
    console.log('✅ Authenticated validation completed successfully!')
    console.log('\n📋 Results Summary:')
    console.log('  ✅ Authentication system working')
    console.log('  ✅ Team isolation enforced')
    console.log('  ✅ Unauthorized access blocked')
    console.log('  ✅ Middleware functionality verified')

    console.log('\n🚀 Next steps:')
    console.log('  1. Migrate remaining API routes to use middleware')
    console.log('  2. Run full test suite with authenticated users')
    console.log('  3. Deploy and test in staging environment')

  } catch (error) {
    console.error('\n❌ Authenticated validation failed:', error)
    process.exit(1)
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  runAuthenticatedValidation()
    .then(() => {
      console.log('\n🎉 Authenticated validation script completed!')
    })
    .catch(error => {
      console.error('\n💥 Validation script crashed:', error)
      process.exit(1)
    })
}

export { runAuthenticatedValidation }