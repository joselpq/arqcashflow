/**
 * Proof of Concept Validation Script
 *
 * This script compares the results of the original budgets API
 * with the new middleware-based implementation to ensure they
 * produce identical results.
 *
 * Usage:
 * 1. Start the development server: npm run dev
 * 2. Run this script: npx tsx lib/middleware/validate-poc.ts
 */

interface ValidationResult {
  endpoint: string
  success: boolean
  data?: any
  error?: string
  responseTime?: number
}

/**
 * Make HTTP request to API endpoint
 */
async function makeRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<ValidationResult> {
  const startTime = Date.now()

  try {
    const response = await fetch(`http://localhost:3007${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const responseTime = Date.now() - startTime
    const data = await response.json()

    if (!response.ok) {
      return {
        endpoint,
        success: false,
        error: `HTTP ${response.status}: ${JSON.stringify(data)}`,
        responseTime,
      }
    }

    return {
      endpoint,
      success: true,
      data,
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      endpoint,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
    }
  }
}

/**
 * Compare two API responses
 */
function compareResponses(
  original: ValidationResult,
  middleware: ValidationResult
): {
  identical: boolean
  differences: string[]
  analysis: any
} {
  const differences: string[] = []

  // Check if both succeeded or both failed
  if (original.success !== middleware.success) {
    differences.push(`Success status differs: original=${original.success}, middleware=${middleware.success}`)
  }

  // If both failed, compare error messages
  if (!original.success && !middleware.success) {
    if (original.error !== middleware.error) {
      differences.push(`Error messages differ: original="${original.error}", middleware="${middleware.error}"`)
    }
    return {
      identical: differences.length === 0,
      differences,
      analysis: { bothFailed: true }
    }
  }

  // If only one succeeded, they're different
  if (original.success !== middleware.success) {
    return {
      identical: false,
      differences,
      analysis: { oneSucceededOneFailed: true }
    }
  }

  // Both succeeded - compare data
  if (original.success && middleware.success) {
    const originalData = JSON.stringify(original.data, null, 2)
    const middlewareData = JSON.stringify(middleware.data, null, 2)

    if (originalData !== middlewareData) {
      differences.push('Response data differs')

      // Try to identify specific differences
      if (Array.isArray(original.data) && Array.isArray(middleware.data)) {
        if (original.data.length !== middleware.data.length) {
          differences.push(`Array length differs: original=${original.data.length}, middleware=${middleware.data.length}`)
        }
      }
    }

    return {
      identical: differences.length === 0,
      differences,
      analysis: {
        originalResponseTime: original.responseTime,
        middlewareResponseTime: middleware.responseTime,
        performanceDiff: (middleware.responseTime || 0) - (original.responseTime || 0),
        dataSize: originalData.length
      }
    }
  }

  return {
    identical: differences.length === 0,
    differences,
    analysis: {}
  }
}

/**
 * Test GET endpoint
 */
async function testGetEndpoint(): Promise<void> {
  console.log('🔍 Testing GET /api/budgets vs /api/budgets-middleware-poc')

  const [original, middleware] = await Promise.all([
    makeRequest('/api/budgets'),
    makeRequest('/api/budgets-middleware-poc'),
  ])

  const comparison = compareResponses(original, middleware)

  console.log('\n📊 GET Results:')
  console.log(`  Original: ${original.success ? '✅' : '❌'} (${original.responseTime}ms)`)
  console.log(`  Middleware: ${middleware.success ? '✅' : '❌'} (${middleware.responseTime}ms)`)
  console.log(`  Identical: ${comparison.identical ? '✅' : '❌'}`)

  if (!comparison.identical) {
    console.log('\n⚠️  Differences found:')
    comparison.differences.forEach(diff => {
      console.log(`    - ${diff}`)
    })
  }

  if (comparison.analysis.performanceDiff) {
    const diff = comparison.analysis.performanceDiff
    console.log(`\n⏱️  Performance: ${diff > 0 ? '+' : ''}${diff}ms difference`)
  }

  // Log errors if any
  if (!original.success) {
    console.log(`\n❌ Original error: ${original.error}`)
  }
  if (!middleware.success) {
    console.log(`\n❌ Middleware error: ${middleware.error}`)
  }
}

/**
 * Test POST endpoint
 */
async function testPostEndpoint(): Promise<void> {
  console.log('\n🔍 Testing POST /api/budgets vs /api/budgets-middleware-poc')

  const testBudget = {
    name: 'Test Budget',
    category: 'Office Supplies',
    budgetAmount: 5000,
    period: 'monthly',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    isActive: true,
    notes: 'Test budget for validation'
  }

  const [original, middleware] = await Promise.all([
    makeRequest('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(testBudget),
    }),
    makeRequest('/api/budgets-middleware-poc', {
      method: 'POST',
      body: JSON.stringify(testBudget),
    }),
  ])

  const comparison = compareResponses(original, middleware)

  console.log('\n📊 POST Results:')
  console.log(`  Original: ${original.success ? '✅' : '❌'} (${original.responseTime}ms)`)
  console.log(`  Middleware: ${middleware.success ? '✅' : '❌'} (${middleware.responseTime}ms)`)
  console.log(`  Identical: ${comparison.identical ? '✅' : '❌'}`)

  if (!comparison.identical) {
    console.log('\n⚠️  Differences found:')
    comparison.differences.forEach(diff => {
      console.log(`    - ${diff}`)
    })
  }

  // Clean up created budgets (if any were created successfully)
  if (original.success && original.data?.id) {
    console.log('\n🧹 Cleaning up test data...')
    // Note: We'd need a DELETE endpoint to clean up
    console.log(`    Created budget ID: ${original.data.id}`)
  }
}

/**
 * Test error scenarios
 */
async function testErrorScenarios(): Promise<void> {
  console.log('\n🚨 Testing error scenarios')

  // Test unauthorized access (this might not work in development)
  console.log('\n  Testing invalid POST data...')

  const invalidBudget = {
    name: '', // Invalid: empty name
    category: 'Test',
    budgetAmount: -100, // Invalid: negative amount
  }

  const [originalError, middlewareError] = await Promise.all([
    makeRequest('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(invalidBudget),
    }),
    makeRequest('/api/budgets-middleware-poc', {
      method: 'POST',
      body: JSON.stringify(invalidBudget),
    }),
  ])

  const errorComparison = compareResponses(originalError, middlewareError)

  console.log('\n📊 Error Handling Results:')
  console.log(`  Original error: ${originalError.success ? '⚠️ No error' : '✅ Properly rejected'}`)
  console.log(`  Middleware error: ${middlewareError.success ? '⚠️ No error' : '✅ Properly rejected'}`)
  console.log(`  Error handling identical: ${errorComparison.identical ? '✅' : '❌'}`)

  if (!errorComparison.identical) {
    console.log('\n⚠️  Error handling differences:')
    errorComparison.differences.forEach(diff => {
      console.log(`    - ${diff}`)
    })
  }
}

/**
 * Main validation function
 */
async function runValidation(): Promise<void> {
  console.log('🧪 Team Context Middleware - Proof of Concept Validation')
  console.log('=' .repeat(60))

  try {
    // Test if server is running
    console.log('\n🌐 Checking if development server is running...')
    const healthCheck = await makeRequest('/api/budgets')

    if (!healthCheck.success && healthCheck.error?.includes('ECONNREFUSED')) {
      console.error('\n❌ Development server is not running!')
      console.error('   Please start it with: npm run dev')
      process.exit(1)
    }

    // Run tests
    await testGetEndpoint()
    await testPostEndpoint()
    await testErrorScenarios()

    console.log('\n' + '=' .repeat(60))
    console.log('✅ Validation completed!')
    console.log('\n📋 Next steps if validation passed:')
    console.log('  1. Review any differences found')
    console.log('  2. If identical, proceed with gradual migration')
    console.log('  3. Update original route to use middleware')
    console.log('  4. Remove proof-of-concept endpoint')

  } catch (error) {
    console.error('\n❌ Validation failed:', error)
    process.exit(1)
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  runValidation()
    .then(() => {
      console.log('\n🎉 Validation script completed successfully!')
    })
    .catch(error => {
      console.error('\n💥 Validation script crashed:', error)
      process.exit(1)
    })
}

export { runValidation }