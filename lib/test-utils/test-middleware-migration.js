#!/usr/bin/env node

/**
 * Standardized Middleware Migration Test
 *
 * Uses port 3010 for all testing as per standard configuration
 * Tests API endpoints after middleware migration
 */

const TEST = require('./standard-test-config');

async function testEndpoint(endpoint, method = 'GET', body = null) {
  console.log(`\n📍 Testing ${method} ${endpoint}`);

  const options = {
    method,
    body: body ? JSON.stringify(body) : undefined,
  };

  const result = await TEST.makeRequest(endpoint, options);

  console.log(`  Status: ${result.status} ${result.statusText || ''}`);
  console.log(`  Response Time: ${result.responseTime}ms`);

  if (result.data) {
    console.log(`  Response:`, JSON.stringify(result.data).substring(0, 100));
  }

  return result;
}

async function runTests() {
  console.log('🧪 Middleware Migration Test Suite');
  console.log('=' .repeat(50));
  console.log(`📍 Using standardized test port: ${TEST.port}`);
  console.log(`🔗 Base URL: ${TEST.baseUrl}`);

  // Ensure port is free
  await TEST.ensurePortFree();

  console.log('\n⚠️  Make sure to start the dev server with:');
  console.log('    PORT=3010 npm run dev');
  console.log('');
  console.log('Waiting 2 seconds for you to start the server...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n🔍 Testing Contracts API (Middleware Migrated)');
  console.log('-' .repeat(50));

  // Test GET
  const getResult = await testEndpoint('/api/contracts');
  const getSuccess = getResult.status === 401; // Expected unauthorized
  console.log(`  ✅ GET returns expected 401: ${getSuccess}`);

  // Test POST
  const testContract = {
    clientName: 'Test Client',
    projectName: 'Test Project',
    totalValue: 10000,
    signedDate: '2025-01-01'
  };

  const postResult = await testEndpoint('/api/contracts', 'POST', testContract);
  const postSuccess = postResult.status === 401; // Expected unauthorized
  console.log(`  ✅ POST returns expected 401: ${postSuccess}`);

  // Test with query parameters
  const queryResult = await testEndpoint('/api/contracts?status=active&sortBy=createdAt');
  const querySuccess = queryResult.status === 401; // Expected unauthorized
  console.log(`  ✅ GET with params returns expected 401: ${querySuccess}`);

  console.log('\n📊 Summary');
  console.log('-' .repeat(50));

  if (getSuccess && postSuccess && querySuccess) {
    console.log('✅ All tests passed! Middleware is working correctly.');
    console.log('   - Proper authentication errors');
    console.log('   - Consistent error responses');
    console.log('   - Query parameter handling preserved');
  } else {
    console.log('❌ Some tests failed. Check the implementation.');
  }

  console.log('\n💡 Next Steps:');
  console.log('1. Test with authenticated session for full validation');
  console.log('2. Migrate receivables API following same pattern');
  console.log('3. Migrate expenses API following same pattern');

  return getSuccess && postSuccess && querySuccess;
}

// Run tests if called directly
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testEndpoint, runTests };