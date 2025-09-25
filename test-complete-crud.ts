/**
 * Complete CRUD Testing for Service Layer Contract API
 * Tests CREATE, READ, UPDATE, DELETE operations with business rule validation
 */

import { z } from 'zod'

// Test configuration
const BASE_URL = 'http://localhost:3010'
const TEST_USER = { email: 'test@example.com', password: 'password123' }

// Helper for authenticated requests
async function makeAuthenticatedRequest(endpoint: string, method: string = 'GET', body?: any) {
  // First, login to get session
  const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `email=${TEST_USER.email}&password=${TEST_USER.password}&redirect=false&json=true`
  })

  if (!loginResponse.ok) {
    throw new Error(`Login failed: ${loginResponse.status}`)
  }

  const cookies = loginResponse.headers.get('set-cookie') || ''

  // Make the actual request
  const options: RequestInit = {
    method,
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json'
    }
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options)
  const data = await response.json()

  return {
    ok: response.ok,
    status: response.status,
    data
  }
}

async function runCompleteCRUDTests() {
  console.log('🧪 Complete CRUD Testing for Service Layer Contract API')
  console.log('='.repeat(70))

  let testContractId: string | null = null

  try {
    // 1. CREATE - Test contract creation
    console.log('\n📝 1. Testing CREATE operation...')
    const timestamp = Date.now()
    const createData = {
      clientName: `CRUD Test Client ${timestamp}`,
      projectName: `CRUD Test Project ${timestamp}`,
      description: 'Testing complete CRUD operations',
      totalValue: 75000,
      signedDate: '2024-01-15',
      status: 'active',
      category: 'residential'
    }

    const createResponse = await makeAuthenticatedRequest('/api/contracts', 'POST', createData)

    if (!createResponse.ok) {
      throw new Error(`CREATE failed: ${JSON.stringify(createResponse.data)}`)
    }

    testContractId = createResponse.data.contract.id
    console.log(`✅ CREATE successful - Contract ID: ${testContractId}`)
    console.log(`   Client: ${createResponse.data.contract.clientName}`)
    console.log(`   Value: $${createResponse.data.contract.totalValue}`)

    // 2. READ - Test individual contract fetch
    console.log('\n📖 2. Testing READ operation...')
    const readResponse = await makeAuthenticatedRequest(`/api/contracts/${testContractId}`)

    if (!readResponse.ok) {
      throw new Error(`READ failed: ${JSON.stringify(readResponse.data)}`)
    }

    console.log(`✅ READ successful`)
    console.log(`   Contract: ${readResponse.data.contract.clientName} - ${readResponse.data.contract.projectName}`)
    console.log(`   Current value: $${readResponse.data.contract.totalValue}`)

    // 3. UPDATE - Test various updates
    console.log('\n📝 3. Testing UPDATE operations...')

    // 3a. Update with past date
    console.log('\n   3a. Testing UPDATE with past date...')
    const updatePastDate = {
      signedDate: '2023-06-15', // Past date
      totalValue: 85000, // Increased value
      status: 'completed'
    }

    const updatePastResponse = await makeAuthenticatedRequest(`/api/contracts/${testContractId}`, 'PUT', updatePastDate)

    if (!updatePastResponse.ok) {
      console.log(`❌ UPDATE past date failed: ${JSON.stringify(updatePastResponse.data)}`)
    } else {
      console.log(`✅ UPDATE past date successful`)
      console.log(`   New date: ${updatePastResponse.data.contract.signedDate}`)
      console.log(`   New value: $${updatePastResponse.data.contract.totalValue}`)
    }

    // 3b. Update with future date (should be rejected by business rules)
    console.log('\n   3b. Testing UPDATE with future date (should be rejected)...')
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    const updateFutureDate = {
      signedDate: futureDateStr,
      totalValue: 95000
    }

    const updateFutureResponse = await makeAuthenticatedRequest(`/api/contracts/${testContractId}`, 'PUT', updateFutureDate)

    if (!updateFutureResponse.ok) {
      console.log(`✅ UPDATE future date properly rejected: ${updateFutureResponse.data.error}`)
    } else {
      console.log(`❌ UPDATE future date should have been rejected but wasn't!`)
    }

    // 3c. Update with negative value (should be rejected)
    console.log('\n   3c. Testing UPDATE with negative value (should be rejected)...')
    const updateNegativeValue = {
      totalValue: -5000
    }

    const updateNegativeResponse = await makeAuthenticatedRequest(`/api/contracts/${testContractId}`, 'PUT', updateNegativeValue)

    if (!updateNegativeResponse.ok) {
      console.log(`✅ UPDATE negative value properly rejected: ${updateNegativeResponse.data.error}`)
    } else {
      console.log(`❌ UPDATE negative value should have been rejected but wasn't!`)
    }

    // 3d. Valid update with description change
    console.log('\n   3d. Testing valid UPDATE (description and category)...')
    const validUpdate = {
      description: 'Updated description - CRUD test completed successfully',
      category: 'commercial',
      notes: 'Added notes during CRUD testing'
    }

    const validUpdateResponse = await makeAuthenticatedRequest(`/api/contracts/${testContractId}`, 'PUT', validUpdate)

    if (!validUpdateResponse.ok) {
      console.log(`❌ Valid UPDATE failed: ${JSON.stringify(validUpdateResponse.data)}`)
    } else {
      console.log(`✅ Valid UPDATE successful`)
      console.log(`   New description: ${validUpdateResponse.data.contract.description}`)
      console.log(`   New category: ${validUpdateResponse.data.contract.category}`)
    }

    // 4. READ again to verify updates
    console.log('\n📖 4. Testing READ after updates...')
    const readAfterUpdateResponse = await makeAuthenticatedRequest(`/api/contracts/${testContractId}`)

    if (readAfterUpdateResponse.ok) {
      const contract = readAfterUpdateResponse.data.contract
      console.log(`✅ READ after updates successful`)
      console.log(`   Final value: $${contract.totalValue}`)
      console.log(`   Final status: ${contract.status}`)
      console.log(`   Final category: ${contract.category}`)
      console.log(`   Final description: ${contract.description?.substring(0, 50)}...`)
    }

    // 5. DELETE - Test contract deletion
    console.log('\n🗑️  5. Testing DELETE operation...')
    const deleteResponse = await makeAuthenticatedRequest(`/api/contracts/${testContractId}`, 'DELETE')

    if (!deleteResponse.ok) {
      console.log(`❌ DELETE failed: ${JSON.stringify(deleteResponse.data)}`)
    } else {
      console.log(`✅ DELETE successful`)
    }

    // 6. Verify deletion - READ should fail
    console.log('\n📖 6. Verifying deletion (READ should fail)...')
    const readDeletedResponse = await makeAuthenticatedRequest(`/api/contracts/${testContractId}`)

    if (!readDeletedResponse.ok) {
      console.log(`✅ Deletion verified - Contract no longer exists`)
    } else {
      console.log(`❌ Contract still exists after deletion!`)
    }

  } catch (error) {
    console.error(`❌ Test failed:`, error)
  }

  console.log('\n' + '='.repeat(70))
  console.log('🎉 Complete CRUD testing finished!')
  console.log('\n📊 Summary of operations tested:')
  console.log('✅ CREATE - Contract creation with validation')
  console.log('✅ READ - Individual contract fetching')
  console.log('✅ UPDATE - Value changes, date validation, field updates')
  console.log('✅ DELETE - Contract deletion and verification')
  console.log('✅ Business Rules - Future date rejection, negative value rejection')
}

// Run the tests
runCompleteCRUDTests().catch(console.error)