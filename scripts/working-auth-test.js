#!/usr/bin/env node

/**
 * Working Authentication Test
 *
 * Creates a proper session and tests the middleware
 */

// Simple cookie jar implementation
class SimpleCookieJar {
  constructor() {
    this.cookies = [];
  }

  addCookie(cookieString) {
    const cookies = cookieString.split(',').map(c => c.trim());
    this.cookies.push(...cookies);
  }

  getCookieHeader() {
    return this.cookies.map(cookie => {
      const [nameValue] = cookie.split(';');
      return nameValue;
    }).join('; ');
  }
}

async function testAuthentication() {
  console.log('🔐 Working Authentication Test');
  console.log('=' .repeat(50));

  const baseUrl = 'http://localhost:3010';
  const cookieJar = new SimpleCookieJar();

  try {
    // Step 1: Get CSRF token
    console.log('\n1️⃣ Getting CSRF token...');
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    console.log(`✅ CSRF token: ${csrfData.csrfToken.substring(0, 10)}...`);

    // Step 2: Attempt login with proper session handling
    console.log('\n2️⃣ Attempting login...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
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

    console.log(`Login response status: ${loginResponse.status}`);

    // Capture cookies
    const setCookie = loginResponse.headers.get('set-cookie');
    if (setCookie) {
      cookieJar.addCookie(setCookie);
      console.log('✅ Cookies captured');
    } else {
      console.log('❌ No cookies in login response');
    }

    // Step 3: Check session with cookies
    console.log('\n3️⃣ Checking session...');
    const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {
        'Cookie': cookieJar.getCookieHeader(),
      },
    });

    const sessionData = await sessionResponse.json();
    console.log('Session data:', JSON.stringify(sessionData, null, 2));

    if (sessionData.user) {
      console.log('✅ Session established!');

      // Step 4: Test protected endpoint
      console.log('\n4️⃣ Testing protected endpoint...');
      const contractsResponse = await fetch(`${baseUrl}/api/contracts`, {
        headers: {
          'Cookie': cookieJar.getCookieHeader(),
        },
      });

      console.log(`Contracts endpoint status: ${contractsResponse.status}`);
      const contractsData = await contractsResponse.json();
      console.log('Contracts response:', JSON.stringify(contractsData, null, 2));

      if (contractsResponse.status === 200) {
        console.log('🎉 MIDDLEWARE WORKING WITH AUTHENTICATION!');

        // Step 5: Test creating a contract
        console.log('\n5️⃣ Testing contract creation...');
        const createResponse = await fetch(`${baseUrl}/api/contracts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieJar.getCookieHeader(),
          },
          body: JSON.stringify({
            clientName: 'Authenticated Test Client',
            projectName: 'Middleware Validation Project',
            description: 'Testing middleware with real authentication',
            totalValue: 99999,
            signedDate: '2025-01-20',
            status: 'active',
          }),
        });

        console.log(`Create response status: ${createResponse.status}`);
        const createData = await createResponse.json();
        console.log('Create response:', JSON.stringify(createData, null, 2));

        return {
          authenticated: true,
          canQuery: contractsResponse.status === 200,
          canCreate: createResponse.status === 201,
          newContractId: createData.contract?.id,
        };
      }
    } else {
      console.log('❌ No session established');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  return { authenticated: false };
}

// Install tough-cookie if needed
async function ensureDependencies() {
  try {
    require('tough-cookie');
  } catch {
    console.log('Installing tough-cookie...');
    const { execSync } = require('child_process');
    execSync('npm install tough-cookie', { stdio: 'inherit' });
  }
}

if (require.main === module) {
  testAuthentication()
    .then(result => {
      console.log('\n' + '=' .repeat(50));
      console.log('🎯 Final Result:', JSON.stringify(result, null, 2));
    })
    .catch(console.error);
}