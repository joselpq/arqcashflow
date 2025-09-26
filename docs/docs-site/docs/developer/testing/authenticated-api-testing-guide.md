---
title: "How to Build Authenticated API Test Scripts"
type: "guide"
audience: ["developer", "agent"]
contexts: ["testing", "authentication", "api-testing", "nextauth", "session-management", "automated-testing"]
complexity: "intermediate"
last_updated: "2025-09-26"
version: "1.0"
agent_roles: ["test-implementer", "api-validator", "feature-tester"]
related:
  - testing/authenticated-testing.md
  - testing/strategies.md
dependencies: ["next-auth", "prisma", "test-users", "port-3010"]
---

# How to Build Authenticated API Test Scripts

A step-by-step guide for LLM agents to create their own authenticated test scripts for ArqCashflow APIs.

## Context for LLM Agents

**When to use this guide**: You need to test API endpoints that require authentication, validate feature functionality end-to-end, or verify business logic with real data.

**Prerequisites**:
- Development server running on port 3010
- Test users seeded in database
- Understanding of NextAuth.js session flow
- Basic knowledge of fetch API and promises

**Key Patterns**:
- Proper NextAuth CSRF token handling
- Session cookie extraction and management
- Authenticated API request patterns
- Test result validation techniques

## Overview

This guide teaches you to build test scripts that:
- ✅ **Authenticate properly** using NextAuth.js flow
- ✅ **Test real API endpoints** with actual authentication
- ✅ **Validate business logic** with meaningful data
- ✅ **Provide clear feedback** on success/failure
- ✅ **Follow established patterns** from existing validation scripts

## Step 1: Basic Test Script Structure

### Template Structure

```typescript
/**
 * [Feature Name] Authentication Test
 *
 * Tests [describe what you're testing] with authenticated users
 */

import { formatDateForInput } from './lib/date-utils' // If needed

const BASE_URL = 'http://localhost:3010'

interface AuthSession {
  cookie: string
  userId: string
  teamId: string
  email: string
}

// Your authentication function (Step 2)
async function loginUser(email: string, password: string): Promise<AuthSession> {
  // Implementation in Step 2
}

// Your test functions (Step 3)
async function testYourFeature(session: AuthSession, testName: string) {
  // Implementation in Step 3
}

// Main test runner (Step 4)
async function main() {
  console.log('\n🧪 [YOUR FEATURE] AUTHENTICATION TEST')
  console.log('=' .repeat(60))

  try {
    // Login
    const session = await loginUser('test@example.com', 'password123')

    // Run tests
    await testYourFeature(session, 'Test Description')

    console.log('\n✅ Test completed successfully!')

  } catch (error) {
    console.error(`❌ Test failed: ${error}`)
    process.exit(1)
  }
}

// Run the test
main().catch(console.error)
```

## Step 2: Authentication Function (COPY THIS EXACTLY)

**⚠️ CRITICAL**: Use this EXACT authentication pattern. Do not modify it.

```typescript
/**
 * Login and get session cookie (EXACT pattern from validate-with-auth.ts)
 * DO NOT MODIFY - This is the proven working pattern
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
```

## Step 3: API Testing Functions

### Basic API Test Pattern

```typescript
async function testApiEndpoint(session: AuthSession, testName: string, endpoint: string, expectedBehavior: string) {
  console.log(`\n🧪 Testing: ${testName}`)
  console.log(`📡 Request: ${BASE_URL}${endpoint}`)

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Cookie': session.cookie
      }
    })

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`   Error details: ${errorText}`)
      return { success: false, status: response.status }
    }

    const data = await response.json()
    console.log(`✅ ${expectedBehavior}`)

    // Add your specific validation logic here
    return { success: true, data }

  } catch (error) {
    console.error(`❌ Error testing ${testName}: ${error}`)
    return { success: false, error }
  }
}
```

### POST Request Pattern

```typescript
async function testCreateEndpoint(session: AuthSession, endpoint: string, payload: any) {
  console.log(`\n📝 Testing POST to: ${endpoint}`)

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': session.cookie
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Created successfully`)
      return { success: true, data }
    } else {
      const error = await response.text()
      console.log(`❌ Creation failed: ${error}`)
      return { success: false, error }
    }
  } catch (error) {
    console.log(`❌ Error creating: ${error}`)
    return { success: false, error }
  }
}
```

### Data Validation Pattern

```typescript
async function validateResults(session: AuthSession, testName: string, endpoint: string, validationFn: (data: any) => boolean) {
  console.log(`\n🔍 Validating: ${testName}`)

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Cookie': session.cookie }
  })

  if (!response.ok) {
    console.error(`❌ Validation failed: ${response.status}`)
    return false
  }

  const data = await response.json()
  const isValid = validationFn(data)

  if (isValid) {
    console.log(`✅ Validation passed: ${testName}`)
  } else {
    console.error(`❌ Validation failed: ${testName}`)
  }

  return isValid
}

// Example usage:
await validateResults(
  session,
  'Date filtering returns correct range',
  '/api/expenses?startDate=2025-09-01&endDate=2025-09-30',
  (data) => {
    const expenses = data.expenses || []
    const startDate = new Date('2025-09-01')
    const endDate = new Date('2025-09-30')

    return expenses.every((exp: any) => {
      const expDate = new Date(exp.dueDate)
      return expDate >= startDate && expDate <= endDate
    })
  }
)
```

## Step 4: Main Test Runner Pattern

```typescript
async function main() {
  console.log('\n🧪 [YOUR FEATURE] AUTHENTICATION TEST')
  console.log('=' .repeat(60))

  try {
    // Step 1: Login
    console.log('🔐 Authenticating...')
    const session = await loginUser('test@example.com', 'password123')
    console.log(`✅ Logged in as: ${session.email} (Team: ${session.teamId})`)

    // Step 2: Test basic functionality
    console.log('\n📋 Testing basic API access...')
    const basicTest = await testApiEndpoint(
      session,
      'Basic endpoint access',
      '/api/your-endpoint',
      'API responds correctly'
    )

    if (!basicTest?.success) {
      throw new Error('Basic API test failed')
    }

    // Step 3: Test your specific feature
    console.log('\n🧪 TESTING YOUR FEATURE FUNCTIONALITY')
    console.log('=' .repeat(50))

    // Add your specific tests here
    await testYourSpecificFeature(session)

    // Step 4: Validation tests
    console.log('\n🔍 VALIDATION TESTS')
    console.log('=' .repeat(30))

    const isValid = await validateResults(
      session,
      'Your validation description',
      '/api/your-endpoint',
      (data) => {
        // Your validation logic
        return true
      }
    )

    if (!isValid) {
      throw new Error('Validation failed')
    }

    console.log('\n✅ All tests completed successfully!')
    console.log('\n💡 Manual UI Test Instructions:')
    console.log('   1. Go to http://localhost:3010')
    console.log('   2. Login with: test@example.com / password123')
    console.log('   3. Navigate to [your feature location]')
    console.log('   4. Test [your feature functionality]')

  } catch (error) {
    console.error(`❌ Test failed: ${error}`)
    process.exit(1)
  }
}
```

## Real-World Example: Date Filtering Test

Here's a complete working example based on the date filtering feature:

```typescript
/**
 * Date Filtering Authentication Test
 * Tests expense date filtering with authenticated users
 */

import { formatDateForInput } from './lib/date-utils'

const BASE_URL = 'http://localhost:3010'

interface AuthSession {
  cookie: string
  userId: string
  teamId: string
  email: string
}

// [Include the exact loginUser function from Step 2]

async function testDateFiltering(session: AuthSession, testName: string, startDate?: string, endDate?: string) {
  console.log(`\n🧪 Testing: ${testName}`)

  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)

  const url = `/api/expenses?${params.toString()}`
  console.log(`📡 Request: ${BASE_URL}${url}`)

  const response = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Cookie': session.cookie }
  })

  if (!response.ok) {
    console.error(`❌ API Error: ${response.status}`)
    return { success: false }
  }

  const data = await response.json()
  const expenses = data.expenses || []

  console.log(`✅ Found ${expenses.length} expenses`)

  // Validate date filtering worked
  if (startDate || endDate) {
    const startFilter = startDate ? new Date(startDate) : null
    const endFilter = endDate ? new Date(endDate) : null

    const validCount = expenses.filter((exp: any) => {
      const expDate = new Date(exp.dueDate)
      if (startFilter && expDate < startFilter) return false
      if (endFilter && expDate > endFilter) return false
      return true
    }).length

    if (validCount === expenses.length) {
      console.log(`✅ Date filtering validation: All ${expenses.length} expenses are within range`)
    } else {
      console.log(`❌ Date filtering validation: Only ${validCount}/${expenses.length} expenses are within range`)
    }
  }

  return { success: true, count: expenses.length, expenses }
}

async function main() {
  console.log('\n🧪 DATE FILTERING AUTHENTICATION TEST')
  console.log('=' .repeat(60))

  try {
    const session = await loginUser('test@example.com', 'password123')

    // Test various date ranges
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    await testDateFiltering(
      session,
      'This month only',
      formatDateForInput(startOfMonth),
      formatDateForInput(endOfMonth)
    )

    console.log('\n✅ Date filtering test completed!')

  } catch (error) {
    console.error(`❌ Test failed: ${error}`)
    process.exit(1)
  }
}

main().catch(console.error)
```

## Common Patterns and Tips

### 1. Test Users
Always use established test users:
```typescript
// Primary test user
email: 'test@example.com'
password: 'password123'
teamId: 'cmfvsa8tt0000t0imqr96svt4'

// Secondary test user (for team isolation tests)
email: 'test2@example.com'
password: 'password123'
teamId: 'cmfvsa8tt0001t0imqr96svt5'
```

### 2. Error Handling
Always include proper error handling:
```typescript
try {
  const response = await fetch(url, options)

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`❌ API Error: ${response.status} - ${errorText}`)
    return { success: false, error: errorText }
  }

  const data = await response.json()
  return { success: true, data }

} catch (error) {
  console.error(`❌ Network/Parse Error: ${error}`)
  return { success: false, error: error.toString() }
}
```

### 3. Test Data Creation
Create test data when needed:
```typescript
async function createTestData(session: AuthSession) {
  const payload = {
    // Your test data
  }

  const result = await testCreateEndpoint(session, '/api/your-endpoint', payload)

  if (result.success) {
    console.log('✅ Test data created')
    // Wait for async operations if needed
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  return result
}
```

### 4. Validation Helpers
Create reusable validation functions:
```typescript
function validateDateRange(items: any[], startDate?: string, endDate?: string): boolean {
  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate) : null

  return items.every(item => {
    const itemDate = new Date(item.dueDate || item.date)
    if (start && itemDate < start) return false
    if (end && itemDate > end) return false
    return true
  })
}

function validateTeamIsolation(items: any[], expectedTeamId: string): boolean {
  return items.every(item => item.teamId === expectedTeamId)
}
```

## Checklist Before Running Tests

- [ ] Development server running: `PORT=3010 npm run dev`
- [ ] Test users seeded: `npx tsx lib/dev-seed.ts`
- [ ] Database accessible and properly configured
- [ ] Test script uses EXACT authentication pattern from Step 2
- [ ] All API endpoints include proper Cookie headers
- [ ] Error handling implemented for all network requests
- [ ] Validation logic matches your feature requirements

## Common Troubleshooting

### Authentication Fails
```bash
# Check if test users exist
npx tsx -e "
import { prisma } from './lib/prisma.js';
const users = await prisma.user.findMany({
  where: { email: { in: ['test@example.com', 'test2@example.com'] } }
});
console.log('Test users found:', users.length);
"

# Re-seed if needed
npx tsx lib/dev-seed.ts --reset
```

### Server Not Responding
```bash
# Check if server is running on correct port
curl http://localhost:3010/api/auth/session

# Kill existing processes and restart
lsof -ti:3010 | xargs kill -9
PORT=3010 npm run dev
```

### API Errors
- Check server logs for detailed error messages
- Verify your API endpoint exists and is properly implemented
- Ensure your test data meets validation requirements
- Confirm team isolation is working (user can only see their team's data)

## Best Practices for LLM Agents

1. **Always copy the exact authentication pattern** - Don't try to "improve" it
2. **Test incrementally** - Start with basic endpoint access, then add complexity
3. **Include validation logic** - Don't just check for 200 responses, validate data
4. **Use meaningful test names** - Make it clear what each test is validating
5. **Clean up after tests** - Remove test data if it affects other tests
6. **Document expected results** - Include what success looks like in comments
7. **Handle edge cases** - Test with empty results, invalid data, etc.

## Template Files

Save this as your starting template: `test-[feature]-auth.ts`

```typescript
/**
 * [Feature Name] Authentication Test
 * Tests [feature description] with authenticated users
 */

import { formatDateForInput } from './lib/date-utils'

const BASE_URL = 'http://localhost:3010'

interface AuthSession {
  cookie: string
  userId: string
  teamId: string
  email: string
}

// EXACT authentication pattern - DO NOT MODIFY
async function loginUser(email: string, password: string): Promise<AuthSession> {
  // Copy from Step 2 exactly
}

async function testYourFeature(session: AuthSession) {
  // Your feature tests here
}

async function main() {
  console.log('\n🧪 [FEATURE] AUTHENTICATION TEST')
  console.log('=' .repeat(60))

  try {
    const session = await loginUser('test@example.com', 'password123')
    await testYourFeature(session)
    console.log('\n✅ Test completed successfully!')
  } catch (error) {
    console.error(`❌ Test failed: ${error}`)
    process.exit(1)
  }
}

main().catch(console.error)
```

## Running Your Test

```bash
# Create your test file
# Copy template above and customize

# Run your test
cd /path/to/arqcashflow
npx tsx test-your-feature-auth.ts

# Clean up test file when done
rm test-your-feature-auth.ts
```

---

**Remember**: The authentication pattern in Step 2 is proven and tested. Use it exactly as provided. Focus your customization on the test logic, not the authentication flow.

This guide ensures every LLM agent can confidently build authenticated test scripts that actually work! 🚀