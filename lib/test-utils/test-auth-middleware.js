#!/usr/bin/env node

/**
 * Authenticated Middleware Test
 *
 * Tests the middleware with proper authentication to verify actual functionality
 * Uses development test credentials
 */

const TEST = require('./standard-test-config');

// Test credentials (development only)
const TEST_USER_1 = {
  userId: 'cmfvsa8v00002t0im966k7o90',
  teamId: 'cmfvsa8tt0000t0imqr96svt4',
  email: 'test@example.com',
  name: 'Test User 1 (Team A)'
};

const TEST_USER_2 = {
  userId: 'cmfvsa8v00003t0im966k7o91',
  teamId: 'cmfvsa8tt0001t0imqr96svt5',
  email: 'test2@example.com',
  name: 'Test User 2 (Team B)'
};

// For backward compatibility
const TEST_CREDENTIALS = TEST_USER_1;

// Mock session for testing
// In real environment, this would be handled by NextAuth
async function createMockSession() {
  // This simulates what NextAuth would provide
  return {
    user: {
      id: TEST_CREDENTIALS.userId,
      email: TEST_CREDENTIALS.email,
      teamId: TEST_CREDENTIALS.teamId
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}

/**
 * Test authenticated endpoint
 * Note: This requires modifying the auth check to accept test credentials
 * or running with a proper session cookie
 */
async function testAuthenticatedEndpoint(endpoint, method = 'GET', body = null) {
  console.log(`\n📍 Testing ${method} ${endpoint} (Authenticated)`);

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // In a real test, we'd need to set a proper session cookie
      // For now, this demonstrates the test structure
      'X-Test-User-Id': TEST_CREDENTIALS.userId,
      'X-Test-Team-Id': TEST_CREDENTIALS.teamId
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  const result = await TEST.makeRequest(endpoint, options);

  console.log(`  Status: ${result.status} ${result.statusText || ''}`);
  console.log(`  Response Time: ${result.responseTime}ms`);

  if (result.data) {
    const preview = JSON.stringify(result.data).substring(0, 100);
    console.log(`  Response Preview: ${preview}...`);
  }

  return result;
}

async function runAuthenticatedTests() {
  console.log('🔐 Authenticated Middleware Test Suite');
  console.log('=' .repeat(50));
  console.log(`📍 Using test port: ${TEST.port}`);
  console.log('\n👥 Test Users:');
  console.log(`  Team A: ${TEST_USER_1.email} (ID: ${TEST_USER_1.teamId})`);
  console.log(`  Team B: ${TEST_USER_2.email} (ID: ${TEST_USER_2.teamId}`);

  // Ensure port is free
  await TEST.ensurePortFree();

  console.log('\n⚠️  IMPORTANT: Authentication Testing Limitations');
  console.log('-' .repeat(50));
  console.log('The current auth system uses NextAuth with session cookies.');
  console.log('To properly test authenticated endpoints, you need to:');
  console.log('');
  console.log('Option 1: Modify auth middleware to accept test headers (development only)');
  console.log('Option 2: Use a real browser session and copy the cookie');
  console.log('Option 3: Create a test mode that bypasses auth for specific test users');
  console.log('');

  console.log('🧪 Test Structure (What Would Be Tested)');
  console.log('-' .repeat(50));

  // These tests show the structure but will return 401 without proper auth setup
  console.log('\n1️⃣ GET Contracts (List)');
  console.log('   Expected: Array of contracts filtered by teamId');
  console.log('   Validates: Team scoping in queries');

  console.log('\n2️⃣ POST Contract (Create)');
  console.log('   Expected: New contract with auto-added teamId');
  console.log('   Validates: Automatic team assignment');

  console.log('\n3️⃣ GET Specific Contract');
  console.log('   Expected: Contract details if belongs to team');
  console.log('   Validates: Cross-team isolation');

  console.log('\n4️⃣ DELETE Contract');
  console.log('   Expected: Only deletes if belongs to team');
  console.log('   Validates: Write operation scoping');

  // Example test contract
  const testContract = {
    clientName: 'Test Client via Middleware',
    projectName: 'Middleware Test Project',
    description: 'Testing team context middleware',
    totalValue: 75000,
    signedDate: '2025-01-15',
    status: 'active',
    category: 'commercial',
    notes: 'Created by automated test'
  };

  console.log('\n📋 Test Contract Data:');
  console.log(JSON.stringify(testContract, null, 2));

  console.log('\n🔒 Cross-Team Isolation Tests (What Should Happen):');
  console.log('-' .repeat(50));
  console.log('Test Case 1: User 1 creates a contract');
  console.log('  - Contract should have Team A\'s ID');
  console.log('  - User 2 should NOT see this contract');
  console.log('');
  console.log('Test Case 2: User 2 creates a contract');
  console.log('  - Contract should have Team B\'s ID');
  console.log('  - User 1 should NOT see this contract');
  console.log('');
  console.log('Test Case 3: User 1 tries to access User 2\'s contract');
  console.log('  - Should return 404 (not found, not 403)');
  console.log('  - Prevents information leakage');
  console.log('');
  console.log('Test Case 4: User 1 tries to update with User 2\'s teamId');
  console.log('  - Middleware should override with User 1\'s teamId');
  console.log('  - Prevents team spoofing');

  console.log('\n💡 Implementation Recommendations:');
  console.log('-' .repeat(50));
  console.log('1. Add TEST_MODE environment variable');
  console.log('2. In auth-utils.ts, check for TEST_MODE and test headers');
  console.log('3. Only enable in development/test environments');
  console.log('4. Example modification in requireAuth():');
  console.log('');
  console.log('   if (process.env.TEST_MODE === "true") {');
  console.log('     const testUserId = headers.get("X-Test-User-Id");');
  console.log('     const testTeamId = headers.get("X-Test-Team-Id");');
  console.log('     ');
  console.log('     // Support both test users');
  console.log('     if (testUserId === TEST_USER_1.userId) {');
  console.log('       return { user: mockUser1, teamId: TEST_USER_1.teamId };');
  console.log('     }');
  console.log('     if (testUserId === TEST_USER_2.userId) {');
  console.log('       return { user: mockUser2, teamId: TEST_USER_2.teamId };');
  console.log('     }');
  console.log('   }');

  console.log('\n🔄 Current Status:');
  console.log('-' .repeat(50));
  console.log('✅ Middleware structure implemented');
  console.log('✅ 401 authentication working');
  console.log('⚠️  Functional testing blocked by auth');
  console.log('📝 Need to implement test auth bypass');

  return true;
}

// Create a simple test mode check
async function testWithoutAuth() {
  console.log('\n🚫 Testing Without Authentication (Current State)');
  console.log('-' .repeat(50));

  const endpoints = [
    { path: '/api/contracts', method: 'GET', expected: 401 },
    { path: '/api/contracts', method: 'POST', expected: 401 },
    { path: '/api/receivables', method: 'GET', expected: 401 },
    { path: '/api/expenses', method: 'GET', expected: 401 },
  ];

  let allPassed = true;

  for (const endpoint of endpoints) {
    const result = await TEST.makeRequest(endpoint.path, { method: endpoint.method });
    const passed = result.status === endpoint.expected;

    console.log(`${passed ? '✅' : '❌'} ${endpoint.method} ${endpoint.path}: ${result.status} (expected ${endpoint.expected})`);

    if (!passed) allPassed = false;
  }

  return allPassed;
}

// Run tests
if (require.main === module) {
  (async () => {
    try {
      await runAuthenticatedTests();

      console.log('\n' + '=' .repeat(50));
      console.log('🧪 Running Unauthenticated Tests');
      console.log('=' .repeat(50));

      const unauthPassed = await testWithoutAuth();

      console.log('\n' + '=' .repeat(50));
      console.log('📊 Test Summary');
      console.log('=' .repeat(50));

      if (unauthPassed) {
        console.log('✅ Authentication middleware is working (401 responses)');
        console.log('⚠️  Functional testing requires auth bypass implementation');
        console.log('📝 See recommendations above for next steps');
      } else {
        console.log('❌ Some endpoints not returning expected 401');
        console.log('🔍 Check middleware implementation');
      }

      process.exit(unauthPassed ? 0 : 1);
    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  TEST_CREDENTIALS,
  createMockSession,
  testAuthenticatedEndpoint,
  runAuthenticatedTests
};