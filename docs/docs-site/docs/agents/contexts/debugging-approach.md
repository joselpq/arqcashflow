---
title: "Debugging Approach Context for LLM Agents"
type: "context"
audience: ["agent"]
contexts: ["debugging", "troubleshooting", "investigation", "problem-solving"]
complexity: "intermediate"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["debugger", "bug-investigator", "problem-solver"]
related:
  - decisions/001-precision-bug-investigation.md
  - developer/testing/strategies.md
  - developer/architecture/overview.md
dependencies: ["next.js", "prisma", "react"]
---

# Debugging Approach Context for LLM Agents

## Context for LLM Agents

**Scope**: Systematic debugging methodology for ArqCashflow with focus on financial data integrity and user experience issues
**Prerequisites**: Understanding of Next.js architecture, React debugging, database queries, and user behavior analysis
**Key Patterns**:
- User-first bug investigation methodology
- Data integrity debugging for financial systems
- Progressive issue isolation techniques
- Evidence-based problem solving
- Documentation-driven debugging

## Debugging Philosophy

**Core Principle**: Start with the user impact, then work backwards to the technical cause.

ArqCashflow handles sensitive financial data where bugs can have serious consequences. Our debugging approach prioritizes:
1. **User Impact Assessment** - What exactly is the user experiencing?
2. **Data Integrity Verification** - Is financial data being corrupted?
3. **Systematic Investigation** - Follow evidence, not assumptions
4. **Root Cause Analysis** - Find the underlying cause, not just symptoms
5. **Prevention Strategy** - How do we prevent this class of bugs?

## The ArqCashflow Debugging Methodology

### Phase 1: User Impact Assessment

**Goal**: Understand exactly what users are experiencing and the potential business impact.

```typescript
interface BugReport {
  // User Experience
  userDescription: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;

  // Impact Assessment
  dataIntegrityRisk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  businessImpact: 'none' | 'minor' | 'moderate' | 'major' | 'critical';
  affectedUsers: number | 'unknown';

  // Technical Context
  browserInfo?: string;
  deviceType?: string;
  teamId?: string;
  userId?: string;
  timestamp: string;
}

const assessUserImpact = (report: BugReport): Priority => {
  // Financial data corruption = Critical
  if (report.dataIntegrityRisk === 'critical') return 'critical';

  // Business operations blocked = High
  if (report.businessImpact === 'major' || report.businessImpact === 'critical') {
    return 'high';
  }

  // UI/UX issues affecting multiple users = Medium
  if (report.affectedUsers > 10) return 'medium';

  return 'low';
};
```

### Phase 2: Evidence Collection

**Goal**: Gather all available evidence before forming hypotheses.

#### 2.1 Application Logs

```typescript
// Enable comprehensive logging for debugging
const debugLogger = {
  userAction: (action: string, context: any) => {
    console.log(`[USER_ACTION] ${action}:`, {
      timestamp: new Date().toISOString(),
      ...context,
      sessionId: getSessionId(),
      teamId: getCurrentTeamId(),
    });
  },

  dataOperation: (operation: string, data: any) => {
    console.log(`[DATA_OP] ${operation}:`, {
      timestamp: new Date().toISOString(),
      operation,
      tableName: data.table,
      recordId: data.id,
      changes: data.changes,
      teamId: data.teamId,
    });
  },

  apiCall: (endpoint: string, method: string, status: number, duration: number) => {
    console.log(`[API] ${method} ${endpoint}:`, {
      timestamp: new Date().toISOString(),
      status,
      duration,
      teamId: getCurrentTeamId(),
    });
  },
};
```

#### 2.2 Database State Investigation

```typescript
// Database debugging utilities
class DatabaseInvestigator {
  async investigateDataInconsistency(
    tableName: string,
    recordId: string,
    teamId: string
  ): Promise<InvestigationResult> {
    // Check current state
    const currentRecord = await prisma[tableName].findFirst({
      where: { id: recordId, teamId },
      include: this.getRelationsForTable(tableName),
    });

    // Check audit trail (if exists)
    const auditTrail = await prisma.auditLog.findMany({
      where: { entityId: recordId, entityType: tableName, teamId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Analyze data integrity
    const integrityIssues = await this.checkDataIntegrity(currentRecord, tableName);

    return {
      currentRecord,
      auditTrail,
      integrityIssues,
      recommendations: this.generateRecommendations(integrityIssues),
    };
  }

  private async checkDataIntegrity(record: any, tableName: string): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    // Financial data integrity checks
    if (tableName === 'contract' || tableName === 'receivable' || tableName === 'expense') {
      // Check for impossible values
      if (record.amount < 0) {
        issues.push({
          type: 'negative_amount',
          severity: 'high',
          description: `${tableName} has negative amount: ${record.amount}`,
          field: 'amount',
        });
      }

      // Check for suspiciously large values (possible precision bug)
      if (record.amount > 100000000) { // > R$ 100M
        issues.push({
          type: 'suspicious_amount',
          severity: 'medium',
          description: `${tableName} has unusually large amount: ${record.amount}`,
          field: 'amount',
        });
      }

      // Check date consistency
      if (tableName === 'receivable' && record.dueDate < record.createdAt) {
        issues.push({
          type: 'invalid_date_sequence',
          severity: 'medium',
          description: 'Due date is before creation date',
          field: 'dueDate',
        });
      }
    }

    return issues;
  }
}
```

#### 2.3 User Behavior Analysis

```typescript
// Track user interactions for debugging
class UserBehaviorTracker {
  trackInteraction(element: string, action: string, value?: any) {
    const interaction = {
      timestamp: Date.now(),
      element,
      action,
      value,
      url: window.location.href,
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
    };

    // Store for debugging analysis
    this.storeInteraction(interaction);

    // Special tracking for precision bug indicators
    if (element.includes('number-input') && action === 'wheel') {
      console.warn('[PRECISION_BUG_INDICATOR] Wheel event on number input:', interaction);
    }
  }

  async analyzeUserSession(sessionId: string): Promise<SessionAnalysis> {
    const interactions = await this.getSessionInteractions(sessionId);

    return {
      totalInteractions: interactions.length,
      wheelEventsOnNumberInputs: interactions.filter(
        i => i.element.includes('number-input') && i.action === 'wheel'
      ).length,
      suspiciousPatterns: this.detectSuspiciousPatterns(interactions),
      userFlow: this.reconstructUserFlow(interactions),
    };
  }

  private detectSuspiciousPatterns(interactions: UserInteraction[]): SuspiciousPattern[] {
    const patterns: SuspiciousPattern[] = [];

    // Pattern: Multiple rapid value changes (possible precision bug)
    const rapidChanges = interactions.filter(
      i => i.action === 'change' && i.element.includes('amount')
    );

    if (rapidChanges.length > 5) {
      const timeSpan = rapidChanges[rapidChanges.length - 1].timestamp - rapidChanges[0].timestamp;
      if (timeSpan < 5000) { // 5 seconds
        patterns.push({
          type: 'rapid_value_changes',
          description: `${rapidChanges.length} amount changes in ${timeSpan}ms`,
          severity: 'high',
          possibleCause: 'precision_bug_scroll_wheel',
        });
      }
    }

    return patterns;
  }
}
```

### Phase 3: Hypothesis Formation

**Goal**: Form testable hypotheses based on evidence, not assumptions.

#### 3.1 Evidence-Based Hypothesis Generation

```typescript
class HypothesisGenerator {
  generateHypotheses(evidence: Evidence): Hypothesis[] {
    const hypotheses: Hypothesis[] = [];

    // Pattern matching against known issues
    if (evidence.wheelEventsOnNumberInputs > 0 && evidence.suspiciousValueChanges > 0) {
      hypotheses.push({
        name: 'precision_bug_scroll_wheel',
        confidence: 'high',
        description: 'User accidentally changed values by scrolling over number inputs',
        testablePredicition: 'Adding onWheel blur will prevent the issue',
        evidence: ['wheel events detected', 'rapid value changes'],
        testPlan: this.generatePrecisionBugTestPlan(),
      });
    }

    if (evidence.apiErrors.length > 0) {
      const errorPatterns = this.analyzeErrorPatterns(evidence.apiErrors);
      hypotheses.push({
        name: 'api_integration_issue',
        confidence: this.calculateConfidence(errorPatterns),
        description: 'API calls failing due to integration issues',
        testablePredicition: 'Fixing API integration will resolve errors',
        evidence: errorPatterns.map(p => p.description),
        testPlan: this.generateAPITestPlan(errorPatterns),
      });
    }

    return hypotheses.sort((a, b) => this.confidenceScore(b.confidence) - this.confidenceScore(a.confidence));
  }

  private generatePrecisionBugTestPlan(): TestPlan {
    return {
      steps: [
        'Create a form with number input',
        'Enter a valid value (e.g., 1000)',
        'Scroll mouse wheel over the input field',
        'Observe if value changes accidentally',
        'Apply fix: onWheel={(e) => e.currentTarget.blur()}',
        'Repeat test to verify fix',
      ],
      expectedResults: [
        'Without fix: Value changes on scroll',
        'With fix: Value remains unchanged on scroll',
      ],
      successCriteria: 'No accidental value changes when scrolling over input',
    };
  }
}
```

### Phase 4: Systematic Testing

**Goal**: Test hypotheses systematically to isolate the root cause.

#### 4.1 Hypothesis Testing Framework

```typescript
class BugInvestigationFramework {
  async testHypothesis(hypothesis: Hypothesis): Promise<TestResult> {
    console.log(`\n🔬 Testing Hypothesis: ${hypothesis.name}`);
    console.log(`Description: ${hypothesis.description}`);
    console.log(`Confidence: ${hypothesis.confidence}`);

    const results: TestResult = {
      hypothesis: hypothesis.name,
      tests: [],
      conclusion: 'inconclusive',
    };

    for (const testStep of hypothesis.testPlan.steps) {
      console.log(`\n📝 Test Step: ${testStep}`);

      const testResult = await this.executeTestStep(testStep, hypothesis);
      results.tests.push(testResult);

      // Stop testing if critical failure
      if (testResult.status === 'failed' && testResult.critical) {
        break;
      }
    }

    results.conclusion = this.evaluateTestResults(results.tests, hypothesis);
    console.log(`\n✅ Conclusion: ${results.conclusion}`);

    return results;
  }

  private async executeTestStep(step: string, hypothesis: Hypothesis): Promise<SingleTestResult> {
    // Example: Testing precision bug hypothesis
    if (hypothesis.name === 'precision_bug_scroll_wheel') {
      return this.testPrecisionBugStep(step);
    }

    // Example: Testing API integration hypothesis
    if (hypothesis.name === 'api_integration_issue') {
      return this.testAPIIntegrationStep(step);
    }

    return { step, status: 'skipped', reason: 'No test implementation' };
  }

  private async testPrecisionBugStep(step: string): Promise<SingleTestResult> {
    switch (step) {
      case 'Create a form with number input':
        // Implementation for creating test form
        return { step, status: 'passed', details: 'Test form created' };

      case 'Scroll mouse wheel over the input field':
        // Implementation for simulating wheel event
        const wheelResult = await this.simulateWheelEvent();
        return {
          step,
          status: wheelResult.valueChanged ? 'failed' : 'passed',
          details: `Value ${wheelResult.valueChanged ? 'changed' : 'unchanged'}: ${wheelResult.before} → ${wheelResult.after}`,
        };

      default:
        return { step, status: 'skipped' };
    }
  }
}
```

#### 4.2 Reproduction Environment

```typescript
// Create isolated environment for bug reproduction
class BugReproductionEnvironment {
  async setupTestEnvironment(bugReport: BugReport): Promise<TestEnvironment> {
    // Create isolated database state
    const testTeamId = await this.createTestTeam();
    await this.seedTestData(testTeamId, bugReport.context);

    // Configure test environment
    const testEnv: TestEnvironment = {
      teamId: testTeamId,
      baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3010',
      browser: await this.launchTestBrowser(),
      user: await this.createTestUser(testTeamId),
    };

    // Setup monitoring
    await this.setupEnvironmentMonitoring(testEnv);

    return testEnv;
  }

  async reproduceIssue(testEnv: TestEnvironment, bugReport: BugReport): Promise<ReproductionResult> {
    console.log('\n🔄 Attempting to reproduce issue...');

    try {
      // Follow user's steps exactly
      for (let i = 0; i < bugReport.stepsToReproduce.length; i++) {
        const step = bugReport.stepsToReproduce[i];
        console.log(`Step ${i + 1}: ${step}`);

        await this.executeUserStep(testEnv, step);

        // Capture state after each step
        const state = await this.captureApplicationState(testEnv);

        // Check if issue manifested
        const issueDetected = await this.detectIssue(state, bugReport.expectedBehavior, bugReport.actualBehavior);

        if (issueDetected) {
          return {
            reproduced: true,
            stepsToReproduce: i + 1,
            capturedState: state,
            evidence: await this.gatherEvidence(testEnv),
          };
        }
      }

      return {
        reproduced: false,
        reason: 'Could not reproduce following provided steps',
        capturedState: await this.captureApplicationState(testEnv),
      };

    } catch (error) {
      return {
        reproduced: false,
        reason: 'Error during reproduction attempt',
        error: error.message,
      };
    }
  }
}
```

### Phase 5: Solution Development

**Goal**: Develop and test the fix, ensuring it doesn't introduce new issues.

#### 5.1 Fix Development Pattern

```typescript
class FixDevelopmentFramework {
  async developFix(hypothesis: Hypothesis, testResult: TestResult): Promise<Fix> {
    if (hypothesis.name === 'precision_bug_scroll_wheel') {
      return this.developPrecisionBugFix();
    }

    // Generic fix development
    return this.developGenericFix(hypothesis, testResult);
  }

  private async developPrecisionBugFix(): Promise<Fix> {
    return {
      name: 'precision_bug_scroll_wheel_fix',
      description: 'Prevent accidental value changes when scrolling over number inputs',
      implementation: {
        pattern: 'Add onWheel blur to all number inputs',
        code: `
// Add to all number input components:
<input
  type="number"
  onWheel={(e) => e.currentTarget.blur()}
  // ... other props
/>

// Or create a wrapper component:
const PrecisionNumberInput = ({ onWheel, ...props }) => (
  <input
    {...props}
    type="number"
    onWheel={(e) => {
      e.currentTarget.blur();
      onWheel?.(e);
    }}
  />
);`,
      },
      testing: {
        unit: [
          'Test that onWheel event calls blur()',
          'Test that custom onWheel handlers still work',
        ],
        integration: [
          'Test all forms with number inputs',
          'Verify no regression in form submission',
        ],
        userAcceptance: [
          'Users can no longer accidentally change values by scrolling',
          'Normal input behavior remains unchanged',
        ],
      },
      rollback: {
        plan: 'Remove onWheel handlers if unexpected side effects occur',
        indicators: [
          'Users report unable to interact with inputs',
          'Form submission errors increase',
        ],
      },
    };
  }

  async validateFix(fix: Fix, testEnvironment: TestEnvironment): Promise<ValidationResult> {
    console.log(`\n🧪 Validating Fix: ${fix.name}`);

    const results: ValidationResult = {
      fix: fix.name,
      unitTests: await this.runUnitTests(fix),
      integrationTests: await this.runIntegrationTests(fix, testEnvironment),
      regressionTests: await this.runRegressionTests(fix, testEnvironment),
      performanceImpact: await this.measurePerformanceImpact(fix),
    };

    // Validate fix resolves original issue
    const originalIssueResolved = await this.verifyOriginalIssueResolved(fix, testEnvironment);
    results.originalIssueResolved = originalIssueResolved;

    return results;
  }
}
```

### Phase 6: Prevention Strategy

**Goal**: Implement measures to prevent this class of bugs in the future.

#### 6.1 Prevention Pattern Library

```typescript
// Build patterns to prevent similar issues
const PreventionPatterns = {
  precision_bugs: {
    pattern: 'Always blur number inputs on wheel events',
    implementation: `
// Use this component for all number inputs
const SafeNumberInput = ({ onWheel, ...props }) => (
  <input
    {...props}
    type="number"
    onWheel={(e) => {
      e.currentTarget.blur();
      onWheel?.(e);
    }}
  />
);`,
    linting: `
// Add ESLint rule to catch unsafe number inputs
'no-unsafe-number-input': {
  rule: 'input[type="number"] must have onWheel handler that calls blur()',
  fix: 'Add onWheel={(e) => e.currentTarget.blur()}',
}`,
    testing: 'Always include scroll-wheel tests for number inputs',
  },

  data_integrity: {
    pattern: 'Validate financial data constraints',
    implementation: `
const validateFinancialAmount = (amount: number, field: string): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (amount < 0) {
    errors.push({ field, message: 'Amount cannot be negative' });
  }

  if (amount > 100000000) { // R$ 100M
    errors.push({ field, message: 'Amount exceeds maximum allowed value' });
  }

  if (!Number.isFinite(amount)) {
    errors.push({ field, message: 'Amount must be a valid number' });
  }

  return errors;
};`,
    database: 'Add database constraints for financial fields',
    monitoring: 'Alert on suspicious data changes',
  },
};
```

## Debugging Tools and Utilities

### 1. **Debug Console Helper**

```typescript
// Add to global window for debugging
declare global {
  interface Window {
    debugArq: DebugHelper;
  }
}

class DebugHelper {
  async investigateUser(teamId: string, userId?: string) {
    console.group('🕵️ User Investigation');

    const team = await this.getTeamInfo(teamId);
    console.log('Team Info:', team);

    if (userId) {
      const user = await this.getUserInfo(userId);
      console.log('User Info:', user);

      const recentActivity = await this.getRecentActivity(userId);
      console.log('Recent Activity:', recentActivity);
    }

    console.groupEnd();
  }

  async investigateData(tableName: string, recordId: string, teamId: string) {
    console.group(`🔍 Data Investigation: ${tableName}:${recordId}`);

    const investigator = new DatabaseInvestigator();
    const result = await investigator.investigateDataInconsistency(tableName, recordId, teamId);

    console.log('Current Record:', result.currentRecord);
    console.log('Audit Trail:', result.auditTrail);
    console.log('Integrity Issues:', result.integrityIssues);
    console.log('Recommendations:', result.recommendations);

    console.groupEnd();

    return result;
  }

  simulatePrecisionBug() {
    console.group('🐛 Precision Bug Simulation');

    // Find number inputs on current page
    const numberInputs = document.querySelectorAll('input[type="number"]');
    console.log(`Found ${numberInputs.length} number inputs`);

    numberInputs.forEach((input, index) => {
      const hasWheelProtection = input.getAttribute('onwheel') !== null;
      console.log(`Input ${index + 1}:`, {
        id: input.id || 'no-id',
        value: input.value,
        hasWheelProtection,
        risk: hasWheelProtection ? '✅ Protected' : '⚠️ Vulnerable',
      });
    });

    console.groupEnd();
  }
}

// Initialize debug helper
if (process.env.NODE_ENV === 'development') {
  window.debugArq = new DebugHelper();
  console.log('🔧 Debug helper available at window.debugArq');
}
```

## Case Study: Precision Bug Investigation

This methodology was successfully applied to resolve the precision bug issue:

### 1. **User Impact Assessment**
- Users reported unexpected value changes in financial fields
- High data integrity risk - financial amounts being corrupted
- Business impact: Users lost trust in data accuracy

### 2. **Evidence Collection**
- Identified pattern: Changes occurred when users scrolled over forms
- Browser logs showed wheel events on number inputs
- No code changes in relevant time period

### 3. **Hypothesis Formation**
- Primary hypothesis: Wheel events changing number input values
- Alternative: Browser-specific behavior

### 4. **Systematic Testing**
- Reproduced issue by scrolling over number inputs
- Confirmed wheel events increment/decrement values
- Tested fix: onWheel blur prevents the behavior

### 5. **Solution Implementation**
- Applied onWheel={(e) => e.currentTarget.blur()} pattern
- Validated fix across all forms
- No negative side effects detected

### 6. **Prevention Strategy**
- Created SafeNumberInput component
- Added to component library for reuse
- Documented pattern for future reference

## Related Documentation

- [Precision Bug Investigation ADR](../decisions/001-precision-bug-investigation.md) - Detailed case study
- [Testing Strategies](../developer/testing/strategies.md) - Testing methodologies
- [Architecture Overview](../developer/architecture/overview.md) - System understanding for debugging

---

*This systematic approach ensures thorough investigation of issues while protecting financial data integrity and user trust.*