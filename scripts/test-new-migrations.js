#!/usr/bin/env node

/**
 * Test the newly migrated APIs with authenticated users
 * Focus on: Dashboard, contracts/[id], receivables/[id]
 */

const BASE_URL = 'http://localhost:3010';

// Test users from dev-seed.ts
const TEST_USERS = [
  {
    email: 'test@example.com',
    password: 'password123',
    teamName: 'Team Alpha'
  },
  {
    email: 'test2@example.com',
    password: 'password123',
    teamName: 'Team Beta'
  }
];

/**
 * Login and get session cookie
 */
async function loginUser(email, password) {
  console.log(`🔐 Logging in as ${email}...`);

  // Get CSRF token
  const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfResponse.json();
  const csrfCookie = csrfResponse.headers.get('set-cookie') || '';

  // Perform login
  const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
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
  });

  const setCookieHeader = loginResponse.headers.get('set-cookie');
  if (!setCookieHeader) {
    throw new Error('No session cookie received');
  }

  const cookies = setCookieHeader.split(',').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.includes('next-auth.session-token') || c.includes('__Secure-next-auth.session-token'));

  if (!sessionCookie) {
    throw new Error('Session token not found');
  }

  // Verify session
  const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { 'Cookie': sessionCookie },
  });

  const session = await sessionResponse.json();
  if (!session.user) {
    throw new Error('Login failed');
  }

  console.log(`✅ Logged in as ${session.user.email}`);
  return {
    cookie: sessionCookie,
    userId: session.user.id,
    teamId: session.user.teamId,
    email: session.user.email
  };
}

/**
 * Test authenticated API request
 */
async function testAuthenticatedAPI(endpoint, session, method = 'GET') {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': session.cookie,
      },
    });

    const data = await response.json();

    return {
      endpoint,
      status: response.status,
      success: response.ok,
      dataLength: Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : 1),
      hasTeamData: !!data
    };
  } catch (error) {
    return {
      endpoint,
      status: 0,
      success: false,
      error: error.message
    };
  }
}

async function runAuthenticatedTests() {
  console.log('🧪 Testing Newly Migrated APIs with Authentication');
  console.log('=' .repeat(60));

  try {
    // Login both users
    const [session1, session2] = await Promise.all([
      loginUser(TEST_USERS[0].email, TEST_USERS[0].password),
      loginUser(TEST_USERS[1].email, TEST_USERS[1].password)
    ]);

    console.log(`\n📊 Team IDs: ${session1.teamId} vs ${session2.teamId}`);

    if (session1.teamId === session2.teamId) {
      console.log('⚠️  WARNING: Both users have same team ID - cannot test isolation');
    }

    // Test newly migrated APIs
    const apisToTest = [
      '/api/dashboard',
      '/api/contracts/non-existent-id', // Should return 404
      '/api/receivables/non-existent-id' // Should return 404
    ];

    console.log('\n🔍 Testing newly migrated APIs...');

    for (const api of apisToTest) {
      console.log(`\nTesting ${api}:`);

      const [result1, result2] = await Promise.all([
        testAuthenticatedAPI(api, session1),
        testAuthenticatedAPI(api, session2)
      ]);

      console.log(`  Team A (${session1.email}): ${result1.status} ${result1.success ? '✅' : '❌'} ${result1.error || `(${result1.dataLength} items)`}`);
      console.log(`  Team B (${session2.email}): ${result2.status} ${result2.success ? '✅' : '❌'} ${result2.error || `(${result2.dataLength} items)`}`);

      // For dashboard, both should succeed with team-specific data
      if (api === '/api/dashboard') {
        if (result1.success && result2.success) {
          console.log(`  ✅ Dashboard working for both teams`);
        } else {
          console.log(`  ❌ Dashboard issues: Team A ${result1.status}, Team B ${result2.status}`);
        }
      }

      // For non-existent IDs, both should return 404
      if (api.includes('non-existent-id')) {
        if (result1.status === 404 && result2.status === 404) {
          console.log(`  ✅ Proper 404 handling for both teams`);
        } else {
          console.log(`  ⚠️  Expected 404s, got: Team A ${result1.status}, Team B ${result2.status}`);
        }
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Authenticated testing completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check server and run tests
fetch(`${BASE_URL}/api/auth/session`)
  .then(() => {
    console.log('✅ Server is running\n');
    return runAuthenticatedTests();
  })
  .catch(() => {
    console.error('❌ Server not running on port 3010');
    console.error('   Please start with: PORT=3010 npm run dev');
    process.exit(1);
  });