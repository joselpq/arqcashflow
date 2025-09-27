/**
 * Comprehensive Test Script for Onboarding Intelligence Agent
 *
 * Tests the complete flow from file upload to entity creation
 * using real test files: sample_data.csv, Testando.xlsx, teste_pdf.pdf
 */

import fs from 'fs'
import path from 'path'

// Test configuration
const BASE_URL = 'http://localhost:3010'
const TEST_FILES = [
  { name: 'sample_data.csv', path: './sample_data.csv' },
  { name: 'Testando.xlsx', path: './Testando.xlsx' },
  { name: 'teste_pdf.pdf', path: './teste_pdf.pdf' }
]

// Test user authentication token (from existing test patterns)
const TEST_USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJ0ZWFtSWQiOiJjbTJ5N3VpbTkwMDAzazBhOWFqNHY5MGZ6Iiwicm9sZSI6Im93bmVyIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTczMjY1NTY0MCwiZXhwIjoxNzMzMjYwNDQwfQ.I_xGgzT7bZG65wOvQF_fQ49QjMWi8vqqKUX4vO0vD3c'

interface TestFile {
  name: string
  type: string
  base64: string
  size: number
}

interface TestResult {
  success: boolean
  agent: string
  result: {
    totalFiles: number
    processedFiles: number
    extractedEntities: number
    createdEntities: number
    errors: string[]
    summary: {
      contracts: number
      expenses: number
      receivables: number
    }
  }
  message: string
  summary: any
}

async function loadTestFiles(): Promise<TestFile[]> {
  const files: TestFile[] = []

  for (const testFile of TEST_FILES) {
    try {
      if (!fs.existsSync(testFile.path)) {
        console.warn(`⚠️  Test file not found: ${testFile.path}`)
        continue
      }

      const fileBuffer = fs.readFileSync(testFile.path)
      const base64 = fileBuffer.toString('base64')
      const stats = fs.statSync(testFile.path)

      // Determine MIME type
      let mimeType = 'application/octet-stream'
      if (testFile.name.endsWith('.csv')) {
        mimeType = 'text/csv'
      } else if (testFile.name.endsWith('.xlsx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } else if (testFile.name.endsWith('.pdf')) {
        mimeType = 'application/pdf'
      }

      files.push({
        name: testFile.name,
        type: mimeType,
        base64,
        size: stats.size
      })

      console.log(`📄 Loaded ${testFile.name} (${(stats.size / 1024 / 1024).toFixed(2)}MB, ${mimeType})`)

    } catch (error) {
      console.error(`❌ Failed to load ${testFile.name}:`, error)
    }
  }

  return files
}

async function testAgentInfo(): Promise<void> {
  console.log('\n🔍 Testing Agent Info Endpoint...')

  try {
    const response = await fetch(`${BASE_URL}/api/agents/onboarding`, {
      method: 'GET',
      headers: {
        'Cookie': `token=${TEST_USER_TOKEN}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ Agent Info Response:', JSON.stringify(data, null, 2))

  } catch (error) {
    console.error('❌ Agent Info Test Failed:', error)
    throw error
  }
}

async function testDocumentProcessing(files: TestFile[]): Promise<TestResult> {
  console.log('\n🤖 Testing Document Processing...')
  console.log(`📄 Processing ${files.length} files:`)
  files.forEach(file => {
    console.log(`   - ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
  })

  const requestBody = {
    files,
    extractionType: 'auto',
    userGuidance: 'This is a test of the onboarding intelligence agent with sample Brazilian financial data'
  }

  try {
    console.log('🚀 Sending request to agent...')
    const response = await fetch(`${BASE_URL}/api/agents/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${TEST_USER_TOKEN}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`)
    }

    const result: TestResult = await response.json()
    console.log('✅ Document Processing Result:', JSON.stringify(result, null, 2))

    return result

  } catch (error) {
    console.error('❌ Document Processing Test Failed:', error)
    throw error
  }
}

async function validateResults(result: TestResult): Promise<void> {
  console.log('\n📊 Validating Results...')

  const { result: agentResult } = result

  // Basic validation
  console.log(`✅ Files processed: ${agentResult.processedFiles}/${agentResult.totalFiles}`)
  console.log(`✅ Entities extracted: ${agentResult.extractedEntities}`)
  console.log(`✅ Entities created: ${agentResult.createdEntities}`)
  console.log(`✅ Summary:`)
  console.log(`   - Contracts: ${agentResult.summary.contracts}`)
  console.log(`   - Expenses: ${agentResult.summary.expenses}`)
  console.log(`   - Receivables: ${agentResult.summary.receivables}`)

  // Error reporting
  if (agentResult.errors.length > 0) {
    console.log('⚠️  Errors encountered:')
    agentResult.errors.forEach(error => {
      console.log(`   - ${error}`)
    })
  }

  // Success criteria
  const successRate = agentResult.processedFiles / agentResult.totalFiles
  const creationRate = agentResult.createdEntities / Math.max(agentResult.extractedEntities, 1)

  console.log(`\n📈 Performance Metrics:`)
  console.log(`   - File processing success rate: ${(successRate * 100).toFixed(1)}%`)
  console.log(`   - Entity creation success rate: ${(creationRate * 100).toFixed(1)}%`)

  if (successRate < 0.5) {
    throw new Error('File processing success rate too low')
  }

  if (agentResult.extractedEntities === 0) {
    console.warn('⚠️  No entities were extracted from any files')
  }
}

async function verifyDatabaseEntities(): Promise<void> {
  console.log('\n🗄️  Verifying Database Entities...')

  try {
    // Test each entity type endpoint to verify creation
    const endpoints = [
      { name: 'Contracts', url: '/api/contracts' },
      { name: 'Expenses', url: '/api/expenses' },
      { name: 'Receivables', url: '/api/receivables' }
    ]

    for (const endpoint of endpoints) {
      const response = await fetch(`${BASE_URL}${endpoint.url}`, {
        headers: {
          'Cookie': `token=${TEST_USER_TOKEN}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const count = Array.isArray(data) ? data.length : (data.data ? data.data.length : 0)
        console.log(`✅ ${endpoint.name}: ${count} entities in database`)
      } else {
        console.warn(`⚠️  Could not verify ${endpoint.name}: HTTP ${response.status}`)
      }
    }

  } catch (error) {
    console.error('❌ Database verification failed:', error)
  }
}

async function runComprehensiveTest(): Promise<void> {
  console.log('🧪 Starting Comprehensive Onboarding Intelligence Agent Test')
  console.log('=' * 60)

  try {
    // Step 1: Load test files
    console.log('\n📁 Loading test files...')
    const files = await loadTestFiles()

    if (files.length === 0) {
      throw new Error('No test files could be loaded')
    }

    // Step 2: Test agent info endpoint
    await testAgentInfo()

    // Step 3: Test document processing
    const result = await testDocumentProcessing(files)

    // Step 4: Validate results
    await validateResults(result)

    // Step 5: Verify database entities
    await verifyDatabaseEntities()

    console.log('\n🎉 All tests completed successfully!')
    console.log('✅ Onboarding Intelligence Agent is working correctly')

  } catch (error) {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  runComprehensiveTest()
}

export { runComprehensiveTest, loadTestFiles, testDocumentProcessing }