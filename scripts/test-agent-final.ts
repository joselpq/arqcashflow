/**
 * Final Test: Quick validation that agent successfully created entities
 */
import fs from 'fs'

// Test with Excel file
async function testExcelFile(): Promise<void> {
  try {
    // Login (simplified from validate-with-auth.ts)
    const csrfResponse = await fetch('http://localhost:3010/api/auth/csrf')
    const { csrfToken } = await csrfResponse.json()
    const csrfCookie = csrfResponse.headers.get('set-cookie') || ''

    const loginResponse = await fetch('http://localhost:3010/api/auth/callback/credentials', {
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
    })

    const setCookieHeader = loginResponse.headers.get('set-cookie')!
    const sessionCookie = setCookieHeader.split(',').find(c => c.includes('next-auth.session-token'))!

    // Load Excel file
    const fileBuffer = fs.readFileSync('./Testando.xlsx')
    const base64 = fileBuffer.toString('base64')

    console.log('🧪 Testing Onboarding Intelligence Agent with Testando.xlsx')
    console.log(`📄 File size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB`)

    const requestBody = {
      files: [{
        name: 'Testando.xlsx',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        base64,
        size: fileBuffer.length
      }],
      extractionType: 'auto',
      userGuidance: 'Excel file with financial data from Brazilian architecture firm'
    }

    console.log('🚀 Processing Excel file...')
    const response = await fetch('http://localhost:3010/api/agents/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(requestBody)
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Excel processing completed:')
      console.log(`   Files processed: ${result.result?.processedFiles || 0}`)
      console.log(`   Entities extracted: ${result.result?.extractedEntities || 0}`)
      console.log(`   Entities created: ${result.result?.createdEntities || 0}`)
      if (result.result?.summary) {
        console.log(`   Breakdown: ${result.result.summary.contracts} contracts, ${result.result.summary.expenses} expenses, ${result.result.summary.receivables} receivables`)
      }
    } else {
      console.log(`❌ Excel processing failed: HTTP ${response.status}`)
    }

    // Verify total entities
    const contractsResponse = await fetch('http://localhost:3010/api/contracts', {
      headers: { 'Cookie': sessionCookie }
    })

    if (contractsResponse.ok) {
      const contracts = await contractsResponse.json()
      console.log(`📊 Total contracts in database: ${contracts.length}`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testExcelFile()