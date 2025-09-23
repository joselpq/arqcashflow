#!/usr/bin/env node

/**
 * Simple Authentication Test
 *
 * Tests step by step to isolate the authentication issue
 */

async function testStep(description, test) {
  console.log(`\n🧪 ${description}`);
  console.log('-'.repeat(40));
  try {
    const result = await test();
    console.log('✅ Success:', result);
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Simple Authentication Debug');
  console.log('=' .repeat(50));

  const baseUrl = 'http://localhost:3010';

  // Step 1: Check if server is responding
  await testStep('Server Basic Response', async () => {
    const response = await fetch(`${baseUrl}/api/auth/csrf`);
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const data = await response.json();
    return `CSRF token received: ${data.csrfToken?.substring(0, 10)}...`;
  });

  // Step 2: Check signin endpoint exists
  await testStep('Signin Endpoint Exists', async () => {
    const response = await fetch(`${baseUrl}/api/auth/signin/credentials`, {
      method: 'GET',
    });
    return `Signin endpoint responds with: ${response.status}`;
  });

  // Step 3: Try actual login
  await testStep('Login Attempt', async () => {
    // Get CSRF token first
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();

    // Try to login
    const loginResponse = await fetch(`${baseUrl}/api/auth/signin/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'test1@test.com',
        password: '123456',
        csrfToken: csrfData.csrfToken,
        redirect: 'false',
        json: 'true',
      }),
      redirect: 'manual',
    });

    const responseText = await loginResponse.text();
    return `Login response: ${loginResponse.status} - ${responseText.substring(0, 100)}`;
  });

  // Step 4: Check session endpoint
  await testStep('Session Endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/auth/session`);
    const data = await response.json();
    return `Session: ${JSON.stringify(data)}`;
  });

  console.log('\n📋 Next: Start server with:');
  console.log('  NEXTAUTH_URL=http://localhost:3010 npm run dev:test');
  console.log('  Then run this script in another terminal');
}

main().catch(console.error);