---
title: "Debugging Workflow Example"
type: "example"
audience: ["developer", "agent"]
contexts: ["debugging-approach", "error-handling", "testing"]
complexity: "intermediate"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["debugger", "problem-solver"]
related:
  - agents/contexts/debugging-approach.md
  - agents/patterns/error-handling.md
  - agents/patterns/testing-strategies.md
---

# Debugging Workflow Example

## Context for LLM Agents

**Scope**: Complete debugging workflow example showing systematic problem-solving approach for ArqCashflow issues
**Prerequisites**: Understanding of systematic debugging, logging patterns, testing strategies, and financial application constraints
**Key Patterns Applied**:
- Systematic debugging methodology with evidence collection
- Multi-layer error isolation (frontend, API, database)
- Team isolation validation for security-critical bugs
- Financial data integrity verification
- Test-driven debugging approach

## Overview

This example demonstrates a real debugging scenario: investigating why receivable payments are not being recorded correctly, following ArqCashflow's systematic debugging approach.

## Complete Debugging Workflow

### 1. Problem Report and Initial Assessment

```typescript
// Initial bug report
const bugReport = {
  title: "Receivable payments not being recorded",
  description: "Users report that when they mark receivables as paid, the payment is not saved and the status remains 'pending'",
  reporter: "User from Team ID 12",
  severity: "High (financial data integrity)",
  environment: "Production",
  steps: [
    "1. Go to Receivables page",
    "2. Click 'Mark as Paid' on a pending receivable",
    "3. Fill in payment details and save",
    "4. Page refreshes but receivable still shows as 'pending'"
  ]
}

// Step 1: Systematic Information Gathering
async function gatherSystematicEvidence() {
  console.log("🔍 STEP 1: SYSTEMATIC INFORMATION GATHERING")

  // 1.1 Reproduce the issue
  console.log("\n📋 Attempting to reproduce the issue...")

  // 1.2 Check recent deployments
  console.log("🚀 Recent deployments:")
  // git log --oneline --since="7 days ago"

  // 1.3 Check error logs
  console.log("📊 Error logs from the last 24 hours:")
  // Check application logs, database logs, API logs

  // 1.4 Check monitoring metrics
  console.log("📈 System metrics:")
  // Check API response times, error rates, database performance

  return {
    reproduced: true,
    recentChanges: ["Payment API updated 3 days ago", "Database migration 5 days ago"],
    errorPatterns: ["Multiple 400 errors on /api/receivables/*/payment endpoint"],
    metrics: { errorRate: "5% increase", responseTime: "Normal" }
  }
}
```

### 2. Layer-by-Layer Investigation

```typescript
// Step 2: Frontend Layer Investigation
async function debugFrontendLayer() {
  console.log("🎨 STEP 2: FRONTEND LAYER DEBUGGING")

  // Check browser dev tools
  const frontendChecks = {
    // 2.1 Network requests
    networkRequests: await checkNetworkRequests(),
    // 2.2 JavaScript errors
    jsErrors: await checkJavaScriptErrors(),
    // 2.3 Form validation
    formValidation: await checkFormValidation(),
    // 2.4 State management
    stateManagement: await checkStateManagement()
  }

  return frontendChecks
}

async function checkNetworkRequests() {
  // Simulate checking network tab
  return {
    paymentRequest: {
      url: "/api/receivables/123/payment",
      method: "PUT",
      status: 400,
      response: {
        error: "Validation failed",
        details: {
          fieldErrors: {
            amount: ["Invalid amount format"]
          }
        }
      }
    },
    finding: "⚠️ API returning 400 error due to amount validation"
  }
}

async function checkJavaScriptErrors() {
  return {
    errors: [
      "TypeError: Cannot read property 'toFixed' of undefined at formatCurrency",
      "Warning: Form submission with invalid amount format"
    ],
    finding: "🐛 JavaScript error in currency formatting function"
  }
}

async function checkFormValidation() {
  // Check form component
  return {
    clientValidation: "Passing - form shows as valid",
    serverValidation: "Failing - amount format rejected by API",
    finding: "💥 Mismatch between client and server validation"
  }
}

async function checkStateManagement() {
  return {
    formState: "Updated correctly",
    optimisticUpdate: "Applied but reverted on API error",
    finding: "✅ State management working correctly, issue is API validation"
  }
}
```

### 3. API Layer Investigation

```typescript
// Step 3: API Layer Investigation
async function debugAPILayer() {
  console.log("🔌 STEP 3: API LAYER DEBUGGING")

  // 3.1 Check API logs
  const apiLogs = await checkAPILogs()

  // 3.2 Test API endpoint directly
  const directAPITest = await testAPIEndpoint()

  // 3.3 Check middleware
  const middlewareCheck = await checkMiddleware()

  // 3.4 Check validation schemas
  const validationCheck = await checkValidationSchemas()

  return { apiLogs, directAPITest, middlewareCheck, validationCheck }
}

async function testAPIEndpoint() {
  // Simulate API testing with curl/Postman
  const testRequest = {
    method: "PUT",
    url: "/api/receivables/123/payment",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer <token>"
    },
    body: {
      amount: 1500.50, // This is what the frontend is sending
      paymentDate: "2024-12-20T10:30:00Z",
      method: "bank_transfer",
      notes: "Payment via Pix"
    }
  }

  // Simulated response
  return {
    status: 400,
    response: {
      error: "Validation failed",
      details: {
        fieldErrors: {
          amount: ["Expected string, received number"]
        }
      }
    },
    finding: "🎯 ROOT CAUSE: API expects amount as string, frontend sending as number"
  }
}

async function checkValidationSchemas() {
  // Check the Zod schema used for validation
  const currentSchema = `
    const paymentSchema = z.object({
      amount: z.string().min(1, "Amount is required"), // ❌ Expecting string
      paymentDate: z.string().datetime(),
      method: z.enum(['cash', 'bank_transfer', 'check', 'pix']),
      notes: z.string().optional()
    })
  `

  const frontendData = `
    // Frontend is sending:
    {
      amount: 1500.50, // ❌ Number instead of string
      paymentDate: "2024-12-20T10:30:00Z",
      method: "bank_transfer",
      notes: "Payment via Pix"
    }
  `

  return {
    issue: "Type mismatch between frontend and backend",
    schema: "Expecting amount as string",
    frontend: "Sending amount as number",
    finding: "🔥 VALIDATION SCHEMA MISMATCH FOUND"
  }
}
```

### 4. Database Layer Investigation

```typescript
// Step 4: Database Layer Investigation (Verify team isolation)
async function debugDatabaseLayer() {
  console.log("🗄️ STEP 4: DATABASE LAYER DEBUGGING")

  // 4.1 Check database connectivity
  const dbConnection = await checkDatabaseConnection()

  // 4.2 Verify team isolation (CRITICAL for financial data)
  const teamIsolationCheck = await verifyTeamIsolation()

  // 4.3 Check data integrity
  const dataIntegrityCheck = await checkDataIntegrity()

  // 4.4 Check recent migrations
  const migrationCheck = await checkRecentMigrations()

  return { dbConnection, teamIsolationCheck, dataIntegrityCheck, migrationCheck }
}

async function verifyTeamIsolation() {
  // CRITICAL: Ensure team isolation is working correctly
  const testQueries = {
    // Verify user can only access their team's data
    userReceivables: `
      SELECT COUNT(*) FROM receivables
      WHERE team_id = 12 AND id = 123
    `,
    // Verify payment records are team-isolated
    paymentRecords: `
      SELECT COUNT(*) FROM payments p
      JOIN receivables r ON p.receivable_id = r.id
      WHERE r.team_id = 12
    `,
    // Check for any cross-team data leakage
    crossTeamCheck: `
      SELECT DISTINCT team_id FROM receivables
      WHERE id IN (SELECT receivable_id FROM user_sessions WHERE user_id = current_user)
    `
  }

  return {
    userDataAccess: "✅ User can only see team 12 data",
    paymentIsolation: "✅ Payment records properly isolated",
    crossTeamLeakage: "✅ No cross-team data access detected",
    finding: "🔒 Team isolation working correctly"
  }
}

async function checkDataIntegrity() {
  // Verify financial data integrity
  const integrityChecks = {
    // Check for orphaned payment records
    orphanedPayments: `
      SELECT COUNT(*) FROM payments p
      LEFT JOIN receivables r ON p.receivable_id = r.id
      WHERE r.id IS NULL
    `,
    // Check for amount mismatches
    amountMismatches: `
      SELECT COUNT(*) FROM receivables r
      JOIN payments p ON r.id = p.receivable_id
      WHERE r.amount != p.amount AND r.status = 'paid'
    `,
    // Check for duplicate payments
    duplicatePayments: `
      SELECT receivable_id, COUNT(*) FROM payments
      GROUP BY receivable_id HAVING COUNT(*) > 1
    `
  }

  return {
    orphanedPayments: 0,
    amountMismatches: 0,
    duplicatePayments: 0,
    finding: "✅ Data integrity checks passed"
  }
}
```

### 5. Root Cause Analysis and Fix

```typescript
// Step 5: Root Cause Analysis
function performRootCauseAnalysis() {
  console.log("🎯 STEP 5: ROOT CAUSE ANALYSIS")

  const evidence = {
    frontend: "Sending amount as number (1500.50)",
    api: "Expecting amount as string per Zod schema",
    database: "Ready to accept data, but validation fails before reaching DB",
    teamIsolation: "Working correctly",
    dataIntegrity: "No corruption detected"
  }

  const rootCause = {
    category: "Data Type Validation Mismatch",
    description: "Frontend component sends payment amount as number, but API validation schema expects string",
    impact: "High - prevents all payment recording",
    affectedUsers: "All teams trying to record payments",
    timeline: "Introduced 3 days ago with payment API update"
  }

  return rootCause
}

// Step 6: Implement Fix
async function implementFix() {
  console.log("🔧 STEP 6: IMPLEMENTING FIX")

  // Option 1: Update frontend to send string (safer for financial data)
  const frontendFix = `
    // Before (incorrect):
    const paymentData = {
      amount: parseFloat(formData.amount), // ❌ Number
      paymentDate: formData.paymentDate,
      method: formData.method,
      notes: formData.notes
    }

    // After (correct):
    const paymentData = {
      amount: formData.amount.toString(), // ✅ String
      paymentDate: formData.paymentDate,
      method: formData.method,
      notes: formData.notes
    }
  `

  // Option 2: Update API schema to accept number (but convert to string)
  const apiSchemaFix = `
    const paymentSchema = z.object({
      amount: z.union([
        z.string().min(1, "Amount is required"),
        z.number().positive("Amount must be positive")
      ]).transform((val) => {
        // Always store as string for precision
        return typeof val === 'number' ? val.toString() : val
      }),
      paymentDate: z.string().datetime(),
      method: z.enum(['cash', 'bank_transfer', 'check', 'pix']),
      notes: z.string().optional()
    })
  `

  // Choose frontend fix for consistency and financial precision
  return {
    chosenSolution: "Frontend fix - send amount as string",
    reasoning: "Maintains financial precision and consistency with string-based currency handling",
    implementation: frontendFix
  }
}
```

### 6. Testing and Verification

```typescript
// Step 7: Comprehensive Testing
async function testFix() {
  console.log("✅ STEP 7: TESTING THE FIX")

  // 7.1 Unit tests
  const unitTests = await runUnitTests()

  // 7.2 Integration tests
  const integrationTests = await runIntegrationTests()

  // 7.3 End-to-end tests
  const e2eTests = await runE2ETests()

  // 7.4 Team isolation verification
  const isolationTests = await verifyTeamIsolationAfterFix()

  // 7.5 Manual testing
  const manualTests = await performManualTesting()

  return { unitTests, integrationTests, e2eTests, isolationTests, manualTests }
}

async function runUnitTests() {
  // Test currency formatting functions
  const tests = [
    {
      name: "formatCurrency handles string input",
      input: "1500.50",
      expected: "R$ 1.500,50",
      result: "✅ PASS"
    },
    {
      name: "formatCurrency handles number input",
      input: 1500.50,
      expected: "R$ 1.500,50",
      result: "✅ PASS"
    },
    {
      name: "Payment validation accepts string amount",
      input: { amount: "1500.50", method: "pix" },
      expected: "Valid",
      result: "✅ PASS"
    }
  ]

  return {
    totalTests: tests.length,
    passed: tests.filter(t => t.result.includes("PASS")).length,
    failed: 0
  }
}

async function verifyTeamIsolationAfterFix() {
  // Ensure fix doesn't break team isolation
  const tests = [
    {
      name: "Payment creation respects team boundaries",
      test: "Create payment for receivable from different team",
      expected: "403 Forbidden",
      result: "✅ PASS - Access denied"
    },
    {
      name: "Payment listing filtered by team",
      test: "List payments for current user",
      expected: "Only team 12 payments returned",
      result: "✅ PASS - Proper filtering"
    }
  ]

  return { isolationMaintained: true, tests }
}
```

### 7. Documentation and Prevention

```typescript
// Step 8: Documentation and Prevention
function documentFindings() {
  console.log("📝 STEP 8: DOCUMENTATION AND PREVENTION")

  const documentation = {
    bugReport: {
      rootCause: "Data type mismatch between frontend and API",
      fix: "Updated frontend to send amount as string",
      testingPerformed: "Unit, integration, e2e, and manual testing",
      teamIsolationVerified: true
    },

    preventionMeasures: {
      // Add to testing checklist
      testingImprovements: [
        "Add contract tests for API endpoints",
        "Include data type validation in CI pipeline",
        "Add automated testing for financial data precision"
      ],

      // Code review checklist updates
      reviewChecklist: [
        "Verify data types match between frontend and API",
        "Test financial calculations with edge cases",
        "Validate team isolation for all data operations"
      ],

      // Monitoring improvements
      monitoring: [
        "Add alerts for 400 errors on payment endpoints",
        "Monitor payment success/failure rates by team",
        "Add logging for data type validation failures"
      ]
    }
  }

  return documentation
}

// Create debugging summary report
function createDebuggingReport() {
  return {
    title: "Payment Recording Bug - Debugging Report",
    summary: "Systematic debugging identified data type mismatch causing payment validation failures",
    timeline: "3 hours from report to fix deployment",
    methodology: "Layer-by-layer investigation following ArqCashflow debugging patterns",
    outcome: "Issue resolved with 100% team isolation maintained",
    lessonsLearned: [
      "Always verify data type consistency between frontend and API",
      "Financial data requires special attention to precision and validation",
      "Team isolation verification is critical for every financial bug fix"
    ]
  }
}
```

## Key Debugging Principles Applied

### 1. Systematic Approach
- **Evidence Collection**: Gather all relevant information before theorizing
- **Layer-by-Layer**: Isolate issues by investigating each system layer
- **Reproduction**: Always reproduce the issue before attempting fixes

### 2. Financial Data Focus
- **Team Isolation**: Always verify team boundaries are maintained
- **Data Integrity**: Check for financial data corruption or inconsistencies
- **Precision Handling**: Pay special attention to currency and decimal handling

### 3. Testing Methodology
- **Multi-Level Testing**: Unit, integration, e2e, and manual testing
- **Security Validation**: Ensure fixes don't break security measures
- **Regression Prevention**: Add tests to prevent similar issues

### 4. Documentation and Learning
- **Root Cause Analysis**: Document the underlying cause, not just symptoms
- **Prevention Measures**: Implement safeguards against similar issues
- **Knowledge Sharing**: Update debugging guides and checklists

---

*This example demonstrates ArqCashflow's systematic debugging approach, emphasizing financial data integrity and team isolation while following a methodical problem-solving process.*