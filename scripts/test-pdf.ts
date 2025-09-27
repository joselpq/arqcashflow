/**
 * Test PDF file processing
 */
import fs from 'fs'

async function testPDFProcessing(): Promise<void> {
  try {
    // Check PDF file size first
    const stats = fs.statSync('./teste_pdf.pdf')
    console.log(`📄 PDF file size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`)

    if (stats.size > 32 * 1024 * 1024) {
      console.log('⚠️  PDF too large (>32MB), skipping test')
      return
    }

    // Login
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

    // Load PDF file
    const fileBuffer = fs.readFileSync('./teste_pdf.pdf')
    const base64 = fileBuffer.toString('base64')

    console.log('🧪 Testing PDF processing...')

    const requestBody = {
      files: [{
        name: 'teste_pdf.pdf',
        type: 'application/pdf',
        base64,
        size: fileBuffer.length
      }],
      extractionType: 'auto',
      userGuidance: 'PDF with financial information from Brazilian architecture firm'
    }

    const startTime = Date.now()
    const response = await fetch('http://localhost:3010/api/agents/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify(requestBody)
    })

    const processingTime = Date.now() - startTime

    if (response.ok) {
      const result = await response.json()
      console.log('✅ PDF processing result:')
      console.log(`   Processing time: ${(processingTime / 1000).toFixed(1)}s`)
      console.log(`   Files processed: ${result.result?.processedFiles || 0}`)
      console.log(`   Entities extracted: ${result.result?.extractedEntities || 0}`)
      console.log(`   Entities created: ${result.result?.createdEntities || 0}`)
      if (result.result?.summary) {
        console.log(`   Breakdown: ${result.result.summary.contracts} contracts, ${result.result.summary.expenses} expenses, ${result.result.summary.receivables} receivables`)
      }
    } else {
      console.log(`❌ PDF processing failed: HTTP ${response.status}`)
      console.log(await response.text())
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testPDFProcessing()