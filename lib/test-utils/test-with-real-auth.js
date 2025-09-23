#!/usr/bin/env node

/**
 * Real Authentication Test for Middleware
 *
 * This script tests the middleware with actual user credentials
 * by logging in through the auth system and using session cookies.
 */

const TEST = require('./standard-test-config');

/**
 * Login to get session cookie using NextAuth signin
 */
async function login(email, password) {
  console.log(`\n🔐 Logging in as ${email}...`);

  try {
    // First, get CSRF token
    const csrfResponse = await fetch(`${TEST.baseUrl}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;

    // Then sign in with credentials
    const response = await fetch(`${TEST.baseUrl}/api/auth/signin/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email,
        password,
        csrfToken,
        redirect: 'false',
        json: 'true',
      }),
      credentials: 'include',
      redirect: 'manual', // Don't follow redirects
    });

    // Extract cookies from response
    const cookies = response.headers.get('set-cookie');

    if (response.status === 200 && cookies) {
      console.log(`✅ Logged in successfully as ${email}`);
      return cookies;
    } else {
      console.log(`❌ Login failed for ${email}: ${response.status}`);
      const text = await response.text();
      console.log('Response:', text.substring(0, 200));
      return null;
    }
  } catch (error) {
    console.log(`❌ Login error for ${email}:`, error.message);
    return null;
  }
}

/**
 * Make authenticated request with session cookie
 */
async function authenticatedRequest(endpoint, cookie, options = {}) {
  const response = await fetch(`${TEST.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

/**
 * Run comprehensive middleware tests with real authentication
 */
async function runRealAuthTests(user1Creds, user2Creds) {
  console.log('🧪 Real Authentication Middleware Test');
  console.log('=' .repeat(50));

  // Ensure test server is running
  await TEST.ensurePortFree();

  console.log(`📍 Test server: ${TEST.baseUrl}`);
  console.log(`👤 User 1: ${user1Creds.email}`);
  console.log(`👤 User 2: ${user2Creds.email}`);

  // Step 1: Login both users
  const user1Cookie = await login(user1Creds.email, user1Creds.password);
  const user2Cookie = await login(user2Creds.email, user2Creds.password);

  if (!user1Cookie || !user2Cookie) {
    console.log('❌ Failed to login test users');
    return false;
  }

  // Step 2: Create test contracts for each user
  console.log('\n📝 Creating test contracts...');

  const contract1Data = {
    clientName: 'Team A Client',
    projectName: 'Team A Project',
    description: 'Contract created by Team A',
    totalValue: 50000,
    signedDate: '2025-01-01',
    status: 'active',
  };

  const contract2Data = {
    clientName: 'Team B Client',
    projectName: 'Team B Project',
    description: 'Contract created by Team B',
    totalValue: 75000,
    signedDate: '2025-01-02',
    status: 'active',
  };

  // User 1 creates a contract
  const create1 = await authenticatedRequest('/api/contracts', user1Cookie, {
    method: 'POST',
    body: JSON.stringify(contract1Data),
  });

  if (!create1.ok) {
    console.log(`❌ User 1 failed to create contract: ${create1.status}`);
    console.log('Response:', create1.data);
    return false;
  }

  const contract1Id = create1.data?.contract?.id;
  console.log(`✅ User 1 created contract: ${contract1Id}`);

  // User 2 creates a contract
  const create2 = await authenticatedRequest('/api/contracts', user2Cookie, {
    method: 'POST',
    body: JSON.stringify(contract2Data),
  });

  if (!create2.ok) {
    console.log(`❌ User 2 failed to create contract: ${create2.status}`);
    console.log('Response:', create2.data);
    return false;
  }

  const contract2Id = create2.data?.contract?.id;
  console.log(`✅ User 2 created contract: ${contract2Id}`);

  // Step 3: Test team scoping - each user should only see their own contracts
  console.log('\n🔒 Testing team isolation...');

  // User 1 lists contracts
  const list1 = await authenticatedRequest('/api/contracts', user1Cookie);
  const user1Contracts = list1.data || [];
  const user1SeesOwn = user1Contracts.some(c => c.id === contract1Id);
  const user1SeesOther = user1Contracts.some(c => c.id === contract2Id);

  console.log(`User 1 sees their own contract: ${user1SeesOwn ? '✅' : '❌'}`);
  console.log(`User 1 sees other team's contract: ${user1SeesOther ? '❌ FAIL - DATA LEAK!' : '✅ Properly isolated'}`);

  // User 2 lists contracts
  const list2 = await authenticatedRequest('/api/contracts', user2Cookie);
  const user2Contracts = list2.data || [];
  const user2SeesOwn = user2Contracts.some(c => c.id === contract2Id);
  const user2SeesOther = user2Contracts.some(c => c.id === contract1Id);

  console.log(`User 2 sees their own contract: ${user2SeesOwn ? '✅' : '❌'}`);
  console.log(`User 2 sees other team's contract: ${user2SeesOther ? '❌ FAIL - DATA LEAK!' : '✅ Properly isolated'}`);

  // Step 4: Test cross-team access attempts
  console.log('\n🚫 Testing cross-team access prevention...');

  // User 1 tries to access User 2's contract
  const access1to2 = await authenticatedRequest(`/api/contracts/${contract2Id}`, user1Cookie);
  console.log(`User 1 accessing User 2's contract: ${access1to2.status === 404 ? '✅ Blocked (404)' : `❌ Status ${access1to2.status}`}`);

  // User 2 tries to access User 1's contract
  const access2to1 = await authenticatedRequest(`/api/contracts/${contract1Id}`, user2Cookie);
  console.log(`User 2 accessing User 1's contract: ${access2to1.status === 404 ? '✅ Blocked (404)' : `❌ Status ${access2to1.status}`}`);

  // Step 5: Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary');
  console.log('=' .repeat(50));

  const allTestsPassed =
    user1SeesOwn &&
    !user1SeesOther &&
    user2SeesOwn &&
    !user2SeesOther &&
    access1to2.status === 404 &&
    access2to1.status === 404;

  if (allTestsPassed) {
    console.log('✅ All tests passed!');
    console.log('✅ Middleware correctly filters by team');
    console.log('✅ Cross-team isolation verified');
    console.log('✅ Team scoping working as expected');
  } else {
    console.log('❌ Some tests failed');
    console.log('🔍 Check the results above for details');
  }

  return allTestsPassed;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.log('Usage: node test-with-real-auth.js <email1> <password1> <email2> <password2>');
    console.log('Example: node test-with-real-auth.js test@example.com pass123 test2@example.com pass456');
    process.exit(1);
  }

  const user1 = { email: args[0], password: args[1] };
  const user2 = { email: args[2], password: args[3] };

  runRealAuthTests(user1, user2)
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { login, authenticatedRequest, runRealAuthTests };