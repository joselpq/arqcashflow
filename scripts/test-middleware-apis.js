#!/usr/bin/env node

/**
 * Simple test to verify middleware migrations are working
 * Tests unauthenticated access (should get 401 errors)
 */

const BASE_URL = 'http://localhost:3010';

// List of APIs that should now be using middleware
const APIS_TO_TEST = [
  // Already migrated
  '/api/contracts',
  '/api/receivables',
  '/api/expenses',
  '/api/expenses/test-id',
  '/api/expenses/test-id/recurring-action',

  // Newly migrated
  '/api/dashboard',
  '/api/contracts/test-id',
  '/api/receivables/test-id'
];

async function testAPI(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: endpoint.includes('recurring-action') ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...(endpoint.includes('recurring-action') ? {
        body: JSON.stringify({ action: 'edit', scope: 'this' })
      } : {})
    });

    const status = response.status;
    const statusText = response.statusText;

    // We expect 401 for all APIs since we're not authenticated
    const expectedStatus = 401;
    const passed = status === expectedStatus;

    return {
      endpoint,
      status,
      statusText,
      passed,
      message: passed ? '✅ Middleware working (401 auth required)' : `❌ Expected ${expectedStatus}, got ${status}`
    };
  } catch (error) {
    return {
      endpoint,
      status: 0,
      statusText: 'Error',
      passed: false,
      message: `❌ Error: ${error.message}`
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Middleware API Migrations');
  console.log('=' .repeat(60));
  console.log(`Testing ${APIS_TO_TEST.length} endpoints...\n`);

  const results = [];

  for (const endpoint of APIS_TO_TEST) {
    process.stdout.write(`Testing ${endpoint}... `);
    const result = await testAPI(endpoint);
    results.push(result);
    console.log(result.message);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Results Summary:');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`✅ Passed: ${passed}/${results.length}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${results.length}`);
    console.log('\nFailed endpoints:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.endpoint}: ${r.message}`);
    });
  }

  if (passed === results.length) {
    console.log('\n🎉 All APIs are properly using middleware with authentication!');
  }
}

// Check if server is running
fetch(`${BASE_URL}/api/auth/session`)
  .then(() => {
    console.log('✅ Server is running on port 3010\n');
    return runTests();
  })
  .catch(error => {
    console.error('❌ Server is not running on port 3010');
    console.error('   Please start it with: PORT=3010 npm run dev');
    process.exit(1);
  });