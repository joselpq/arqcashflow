#!/usr/bin/env node

/**
 * Test contracts API response structure for frontend compatibility
 */

const BASE_URL = 'http://localhost:3010';

async function loginAndTestContracts() {
  try {
    // Login as test user
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const { csrfToken } = await csrfResponse.json();
    const csrfCookie = csrfResponse.headers.get('set-cookie') || '';

    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': csrfCookie,
      },
      body: new URLSearchParams({
        csrfToken,
        email: 'test@example.com',
        password: 'password123',
        redirect: 'false',
        json: 'true'
      }),
      redirect: 'manual'
    });

    const setCookieHeader = loginResponse.headers.get('set-cookie');
    const sessionCookie = setCookieHeader?.split(',').find(c =>
      c.includes('next-auth.session-token') || c.includes('__Secure-next-auth.session-token')
    );

    if (!sessionCookie) {
      throw new Error('Failed to get session cookie');
    }

    // Test contracts API
    console.log('🔍 Testing /api/contracts response structure...');

    const contractsResponse = await fetch(`${BASE_URL}/api/contracts`, {
      headers: { 'Cookie': sessionCookie },
    });

    const contractsData = await contractsResponse.json();

    console.log('📊 Response Status:', contractsResponse.status);
    console.log('📋 Response Type:', Array.isArray(contractsData) ? 'Array' : typeof contractsData);

    if (Array.isArray(contractsData)) {
      console.log('✅ FRONTEND COMPATIBLE: Returns array as expected');
      console.log(`📦 Array length: ${contractsData.length}`);
    } else {
      console.log('❌ FRONTEND ISSUE: Returns object instead of array');
      console.log('🔧 Structure:', Object.keys(contractsData));
    }

    // Also test if it has error structure
    if (contractsData.error) {
      console.log('⚠️  Error response:', contractsData.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check server and run test
fetch(`${BASE_URL}/api/auth/session`)
  .then(() => {
    console.log('✅ Server is running\n');
    return loginAndTestContracts();
  })
  .catch(() => {
    console.error('❌ Server not running on port 3010');
    process.exit(1);
  });