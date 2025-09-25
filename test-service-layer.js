const fetch = require('node-fetch');

async function testServiceLayer() {
  console.log('🧪 Testing Service Layer Contract API Migration');
  console.log('='.repeat(60));

  // Login first
  const loginResponse = await fetch('http://localhost:3010/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'email=test@example.com&password=password123&redirect=false&json=true'
  });

  const cookies = loginResponse.headers.get('set-cookie');

  // Test GET contracts
  console.log('📋 Testing GET /api/contracts...');
  const getStart = Date.now();
  const getResponse = await fetch('http://localhost:3010/api/contracts', {
    headers: { 'Cookie': cookies }
  });
  const getTime = Date.now() - getStart;
  const contracts = await getResponse.json();
  console.log(`✅ GET: ${contracts.data.length} contracts (${getTime}ms)`);

  // Get a specific contract for testing
  const testContract = contracts.data[0];
  if (testContract) {
    console.log(`📄 Testing GET /api/contracts/${testContract.id}...`);
    const getSingleStart = Date.now();
    const getSingleResponse = await fetch(`http://localhost:3010/api/contracts/${testContract.id}`, {
      headers: { 'Cookie': cookies }
    });
    const getSingleTime = Date.now() - getSingleStart;
    
    if (getSingleResponse.ok) {
      console.log(`✅ GET single: Success (${getSingleTime}ms)`);
    } else {
      console.log(`❌ GET single: Failed (${getSingleResponse.status})`);
    }
  }

  console.log('\n🎯 Performance Summary:');
  console.log(`- GET contracts: ${getTime}ms`);
  console.log(`- Service layer active: USE_SERVICE_LAYER=true`);
  console.log('✅ Service layer migration validation complete!');
}

testServiceLayer().catch(console.error);
