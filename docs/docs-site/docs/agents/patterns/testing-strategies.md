---
title: "Testing Strategies Pattern Library"
type: "pattern"
audience: ["agent"]
contexts: ["testing", "quality-assurance", "automation", "reliability"]
complexity: "advanced"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["test-engineer", "qa-developer", "backend-developer", "frontend-developer"]
related:
  - agents/contexts/debugging-approach.md
  - developer/testing/strategies.md
  - developer/testing/standardized-test-port.md
dependencies: ["jest", "react-testing-library", "playwright", "prisma"]
---

# Testing Strategies Pattern Library

## Context for LLM Agents

**Scope**: Comprehensive testing patterns for ArqCashflow covering unit, integration, end-to-end, and specialized financial data testing
**Prerequisites**: Understanding of testing principles, Jest, React Testing Library, database testing, and financial data validation
**Key Patterns**:
- Team-isolated test environments
- Financial data precision testing
- Authentication and authorization testing
- API contract testing
- End-to-end user journey testing

## Testing Philosophy for Financial Applications

**Core Principle**: Financial applications require higher testing standards due to the critical nature of financial data integrity.

### Testing Pyramid for ArqCashflow

```
    🔺 E2E Tests (10%)
   🔺🔺 Integration Tests (20%)
  🔺🔺🔺 Unit Tests (70%)
```

**Unit Tests (70%)**: Fast, isolated tests for business logic, utilities, and pure functions
**Integration Tests (20%)**: API routes, database operations, external service integration
**End-to-End Tests (10%)**: Critical user journeys and cross-system workflows

## Unit Testing Patterns

### 1. **Financial Logic Testing**

```typescript
// tests/unit/financial-calculations.test.ts
import { DecimalMath, FinancialCalculations } from '@/lib/utils/decimal-math';
import { addDays } from 'date-fns';

describe('Financial Calculations', () => {
  describe('DecimalMath', () => {
    it('should handle floating point precision correctly', () => {
      // Test precision issues that JavaScript normally has
      expect(DecimalMath.add(0.1, 0.2)).toBe(0.3);
      expect(DecimalMath.subtract(1.1, 0.1)).toBe(1.0);
      expect(DecimalMath.multiply(0.1, 3)).toBe(0.3);
      expect(DecimalMath.divide(0.3, 0.1)).toBe(3.0);
    });

    it('should calculate percentages accurately', () => {
      expect(DecimalMath.percentage(1000, 15)).toBe(150);
      expect(DecimalMath.percentage(1234.56, 10)).toBe(123.46);
      expect(DecimalMath.percentage(0, 50)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(() => DecimalMath.divide(10, 0)).toThrow('Division by zero');
      expect(DecimalMath.add(0, 0)).toBe(0);
      expect(DecimalMath.multiply(1000000, 0.01)).toBe(10000);
    });
  });

  describe('Contract Installments', () => {
    it('should calculate installments with proper rounding', () => {
      const installments = FinancialCalculations.calculateInstallments(
        10000, // Total value
        3,     // 3 installments
        new Date('2025-01-15')
      );

      expect(installments).toHaveLength(3);
      expect(installments[0].amount).toBe(3333.33);
      expect(installments[1].amount).toBe(3333.33);
      expect(installments[2].amount).toBe(3333.34); // Rounding difference

      // Verify total adds up exactly
      const total = installments.reduce((sum, inst) => sum + inst.amount, 0);
      expect(total).toBe(10000);
    });

    it('should set correct due dates', () => {
      const startDate = new Date('2025-01-15');
      const installments = FinancialCalculations.calculateInstallments(
        10000,
        3,
        startDate
      );

      expect(installments[0].dueDate).toEqual(new Date('2025-01-15'));
      expect(installments[1].dueDate).toEqual(new Date('2025-02-15'));
      expect(installments[2].dueDate).toEqual(new Date('2025-03-15'));
    });
  });
});
```

### 2. **Validation Testing**

```typescript
// tests/unit/validation.test.ts
import { ContractCreateSchema, FinancialValidation } from '@/lib/validation';
import { FinancialValidator } from '@/lib/utils/financial-validation';

describe('Validation Patterns', () => {
  describe('Financial Amount Validation', () => {
    it('should validate positive amounts', () => {
      const result = FinancialValidator.validateAmount(1234.56);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative amounts', () => {
      const result = FinancialValidator.validateAmount(-100);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('amount cannot be negative');
    });

    it('should reject excessive decimal places', () => {
      const result = FinancialValidator.validateAmount(123.456);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('amount cannot have more than 2 decimal places');
    });

    it('should reject amounts that are too large', () => {
      const result = FinancialValidator.validateAmount(999999999);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('amount exceeds maximum allowed value');
    });
  });

  describe('Zod Schema Validation', () => {
    it('should validate correct contract data', () => {
      const validData = {
        clientName: 'Test Client',
        projectName: 'Test Project',
        totalValue: 50000,
        signedDate: '2025-01-15T00:00:00.000Z',
      };

      const result = ContractCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid contract data', () => {
      const invalidData = {
        clientName: '', // Empty string
        totalValue: -1000, // Negative amount
        signedDate: 'invalid-date',
      };

      const result = ContractCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.errors).toHaveLength(3);
        expect(result.error.errors.find(e => e.path[0] === 'clientName')).toBeDefined();
        expect(result.error.errors.find(e => e.path[0] === 'totalValue')).toBeDefined();
        expect(result.error.errors.find(e => e.path[0] === 'signedDate')).toBeDefined();
      }
    });
  });

  describe('Precision Bug Detection', () => {
    it('should detect suspicious incremental changes', () => {
      const result = FinancialValidator.detectPrecisionBug(1000, 1001, 100);
      expect(result.isSuspicious).toBe(true);
      expect(result.patterns.incrementalChange).toBe(true);
      expect(result.patterns.rapidChange).toBe(true);
    });

    it('should not flag legitimate changes', () => {
      const result = FinancialValidator.detectPrecisionBug(1000, 1500, 5000);
      expect(result.isSuspicious).toBe(false);
    });

    it('should flag rapid changes on large amounts', () => {
      const result = FinancialValidator.detectPrecisionBug(5000000, 5000001, 100);
      expect(result.isSuspicious).toBe(true);
      expect(result.patterns.largeNumber).toBe(true);
    });
  });
});
```

### 3. **Component Testing**

```typescript
// tests/unit/components/NumberInput.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NumberInput } from '@/lib/components/ui/NumberInput';

describe('NumberInput Component', () => {
  describe('Precision Bug Prevention', () => {
    it('should blur input on wheel event', () => {
      const mockOnChange = jest.fn();
      render(
        <NumberInput
          value={1000}
          onChange={mockOnChange}
          data-testid="number-input"
        />
      );

      const input = screen.getByTestId('number-input');
      input.focus();

      expect(input).toHaveFocus();

      // Simulate wheel event
      fireEvent.wheel(input, { deltaY: 100 });

      expect(input).not.toHaveFocus();
    });

    it('should not change value on wheel event', () => {
      const mockOnChange = jest.fn();
      render(
        <NumberInput
          value={1000}
          onChange={mockOnChange}
          data-testid="number-input"
        />
      );

      const input = screen.getByTestId('number-input');
      fireEvent.wheel(input, { deltaY: 100 });

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Value Formatting', () => {
    it('should format currency values correctly', () => {
      render(
        <NumberInput
          value={1234.56}
          onChange={jest.fn()}
          prefix="R$"
          data-testid="currency-input"
        />
      );

      const input = screen.getByTestId('currency-input');
      expect(input).toHaveValue('1234.56');

      // Should show currency symbol
      expect(screen.getByText('R$')).toBeInTheDocument();
    });

    it('should limit decimal places', () => {
      const mockOnChange = jest.fn();
      render(
        <NumberInput
          value={0}
          onChange={mockOnChange}
          maxDecimals={2}
          data-testid="decimal-input"
        />
      );

      const input = screen.getByTestId('decimal-input');
      fireEvent.change(input, { target: { value: '123.456' } });

      // Should limit to 2 decimal places
      expect(mockOnChange).toHaveBeenCalledWith(123.45);
    });
  });

  describe('Validation', () => {
    it('should apply min/max constraints', () => {
      const mockOnChange = jest.fn();
      render(
        <NumberInput
          value={50}
          onChange={mockOnChange}
          min={0}
          max={100}
          data-testid="constrained-input"
        />
      );

      const input = screen.getByTestId('constrained-input');

      // Test below minimum
      fireEvent.change(input, { target: { value: '-10' } });
      expect(mockOnChange).toHaveBeenCalledWith(0);

      // Test above maximum
      fireEvent.change(input, { target: { value: '150' } });
      expect(mockOnChange).toHaveBeenCalledWith(100);
    });
  });
});
```

## Integration Testing Patterns

### 1. **API Route Testing with Team Isolation**

```typescript
// tests/integration/api/contracts.test.ts
import { createMocks } from 'node-mocks-http';
import { POST, GET } from '@/app/api/contracts/route';
import { createTestDatabase, createTestTeam, createTestUser } from '@/tests/utils/test-helpers';

describe('/api/contracts', () => {
  let testDb: TestDatabase;
  let testTeam: TestTeam;
  let testUser: TestUser;
  let otherTeam: TestTeam;

  beforeAll(async () => {
    testDb = await createTestDatabase();
  });

  beforeEach(async () => {
    testTeam = await createTestTeam(testDb);
    testUser = await createTestUser(testDb, testTeam.id);
    otherTeam = await createTestTeam(testDb);
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  describe('POST /api/contracts', () => {
    it('should create contract with proper team isolation', async () => {
      const contractData = {
        clientName: 'Test Client',
        projectName: 'Test Project',
        totalValue: 50000,
        signedDate: '2025-01-15T00:00:00.000Z',
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: contractData,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Mock authentication
      jest.spyOn(require('@/lib/auth'), 'requireAuth').mockResolvedValue({
        user: testUser,
        teamId: testTeam.id,
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData.teamId).toBe(testTeam.id);
      expect(responseData.clientName).toBe(contractData.clientName);

      // Verify contract was created in database
      const contract = await testDb.contract.findFirst({
        where: { id: responseData.id },
      });

      expect(contract).toBeDefined();
      expect(contract.teamId).toBe(testTeam.id);
    });

    it('should enforce team isolation in queries', async () => {
      // Create contracts in both teams
      await testDb.contract.create({
        data: {
          clientName: 'Team 1 Client',
          projectName: 'Team 1 Project',
          totalValue: 10000,
          teamId: testTeam.id,
          createdBy: testUser.id,
        },
      });

      await testDb.contract.create({
        data: {
          clientName: 'Team 2 Client',
          projectName: 'Team 2 Project',
          totalValue: 20000,
          teamId: otherTeam.id,
          createdBy: 'other-user-id',
        },
      });

      const { req, res } = createMocks({
        method: 'GET',
      });

      // Mock authentication for testTeam
      jest.spyOn(require('@/lib/auth'), 'requireAuth').mockResolvedValue({
        user: testUser,
        teamId: testTeam.id,
      });

      await GET(req);

      expect(res._getStatusCode()).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData.contracts).toHaveLength(1);
      expect(responseData.contracts[0].clientName).toBe('Team 1 Client');
      expect(responseData.contracts[0].teamId).toBe(testTeam.id);
    });

    it('should validate input data', async () => {
      const invalidData = {
        clientName: '', // Invalid: empty
        totalValue: -1000, // Invalid: negative
        signedDate: 'invalid-date', // Invalid: bad format
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidData,
      });

      jest.spyOn(require('@/lib/auth'), 'requireAuth').mockResolvedValue({
        user: testUser,
        teamId: testTeam.id,
      });

      await POST(req);

      expect(res._getStatusCode()).toBe(400);

      const responseData = JSON.parse(res._getData());
      expect(responseData.error.category).toBe('validation');
      expect(responseData.error.validation).toBeDefined();
      expect(responseData.error.validation.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      // Mock no authentication
      jest.spyOn(require('@/lib/auth'), 'requireAuth').mockRejectedValue(
        new Error('Authentication required')
      );

      await GET(req);

      expect(res._getStatusCode()).toBe(401);
    });

    it('should reject requests from users without team access', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      // Mock user without team
      jest.spyOn(require('@/lib/auth'), 'requireAuth').mockResolvedValue({
        user: { ...testUser, teamId: null },
        teamId: null,
      });

      await GET(req);

      expect(res._getStatusCode()).toBe(403);
    });
  });
});
```

### 2. **Database Integration Testing**

```typescript
// tests/integration/database/contract-service.test.ts
import { ContractService } from '@/lib/services/contract.service';
import { createTestDatabase, createTestTeam } from '@/tests/utils/test-helpers';

describe('ContractService Database Integration', () => {
  let testDb: TestDatabase;
  let testTeam: TestTeam;
  let otherTeam: TestTeam;

  beforeAll(async () => {
    testDb = await createTestDatabase();
  });

  beforeEach(async () => {
    testTeam = await createTestTeam(testDb);
    otherTeam = await createTestTeam(testDb);
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  afterAll(async () => {
    await testDb.destroy();
  });

  describe('Team Isolation', () => {
    it('should only return contracts for the specified team', async () => {
      // Create contracts in different teams
      await Promise.all([
        testDb.contract.create({
          data: {
            clientName: 'Team 1 Client',
            projectName: 'Project 1',
            totalValue: 10000,
            teamId: testTeam.id,
            createdBy: 'user-1',
          },
        }),
        testDb.contract.create({
          data: {
            clientName: 'Team 2 Client',
            projectName: 'Project 2',
            totalValue: 20000,
            teamId: otherTeam.id,
            createdBy: 'user-2',
          },
        }),
      ]);

      const contracts = await ContractService.findMany(testTeam.id);

      expect(contracts).toHaveLength(1);
      expect(contracts[0].clientName).toBe('Team 1 Client');
      expect(contracts[0].teamId).toBe(testTeam.id);
    });

    it('should throw error when accessing contract from different team', async () => {
      const contract = await testDb.contract.create({
        data: {
          clientName: 'Other Team Contract',
          projectName: 'Other Project',
          totalValue: 15000,
          teamId: otherTeam.id,
          createdBy: 'other-user',
        },
      });

      await expect(
        ContractService.findById(contract.id, testTeam.id)
      ).rejects.toThrow('Contract not found or access denied');
    });
  });

  describe('Business Logic', () => {
    it('should prevent duplicate contracts', async () => {
      const contractData = {
        clientName: 'Test Client',
        projectName: 'Test Project',
        totalValue: 50000,
        signedDate: '2025-01-15T00:00:00.000Z',
      };

      // Create first contract
      await ContractService.create(contractData, testTeam.id, 'user-1');

      // Try to create duplicate
      await expect(
        ContractService.create(contractData, testTeam.id, 'user-1')
      ).rejects.toThrow('A contract with this client and project already exists');
    });

    it('should validate business rules on update', async () => {
      const contract = await testDb.contract.create({
        data: {
          clientName: 'Test Client',
          projectName: 'Test Project',
          totalValue: 50000,
          status: 'active',
          teamId: testTeam.id,
          createdBy: 'user-1',
        },
      });

      await expect(
        ContractService.update(
          contract.id,
          { signedDate: '2025-12-31T00:00:00.000Z' }, // Future date
          testTeam.id
        )
      ).rejects.toThrow('Signed date cannot be in the future');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity', async () => {
      const contract = await ContractService.create(
        {
          clientName: 'Test Client',
          projectName: 'Test Project',
          totalValue: 50000,
          signedDate: '2025-01-15T00:00:00.000Z',
        },
        testTeam.id,
        'user-1'
      );

      // Create related receivables
      await testDb.receivable.create({
        data: {
          contractId: contract.id,
          amount: 25000,
          dueDate: new Date('2025-02-15'),
          teamId: testTeam.id,
          createdBy: 'user-1',
        },
      });

      // Should not be able to delete contract with active receivables
      await expect(
        ContractService.delete(contract.id, testTeam.id)
      ).rejects.toThrow('Cannot delete contract with active receivables');
    });
  });
});
```

## End-to-End Testing Patterns

### 1. **Critical User Journey Testing**

```typescript
// tests/e2e/contract-lifecycle.spec.ts
import { test, expect } from '@playwright/test';
import {
  loginAsTestUser,
  createTestTeam,
  navigateToContracts,
  fillContractForm,
  expectContractInList
} from './utils/e2e-helpers';

test.describe('Contract Lifecycle E2E', () => {
  test.beforeEach(async ({ page }) => {
    await createTestTeam();
    await loginAsTestUser(page);
  });

  test('should create, view, and edit contract successfully', async ({ page }) => {
    // 1. Navigate to contracts page
    await navigateToContracts(page);

    // 2. Create new contract
    await page.click('text=Novo Contrato');

    await fillContractForm(page, {
      clientName: 'Cliente Teste E2E',
      projectName: 'Projeto Teste E2E',
      totalValue: '75000',
      signedDate: '15/01/2025',
    });

    await page.click('button[type="submit"]');

    // 3. Verify contract appears in list
    await expect(page).toHaveURL(/\/contracts/);
    await expectContractInList(page, 'Cliente Teste E2E', 'Projeto Teste E2E');

    // 4. View contract details
    await page.click('text=Cliente Teste E2E');
    await expect(page.locator('h1')).toContainText('Cliente Teste E2E');
    await expect(page.locator('text=R$ 75.000,00')).toBeVisible();

    // 5. Edit contract
    await page.click('text=Editar');
    await page.fill('input[name="totalValue"]', '80000');
    await page.click('button[type="submit"]');

    // 6. Verify changes
    await expect(page.locator('text=R$ 80.000,00')).toBeVisible();
  });

  test('should prevent precision bug when scrolling over amount input', async ({ page }) => {
    await navigateToContracts(page);
    await page.click('text=Novo Contrato');

    // Fill form
    await page.fill('input[name="clientName"]', 'Cliente Scroll Test');
    await page.fill('input[name="projectName"]', 'Projeto Scroll Test');

    const totalValueInput = page.locator('input[name="totalValue"]');
    await totalValueInput.fill('50000');

    // Get initial value
    const initialValue = await totalValueInput.inputValue();
    expect(initialValue).toBe('50000');

    // Simulate scroll over the input (this should not change the value)
    await totalValueInput.hover();
    await page.mouse.wheel(0, 120); // Scroll down

    // Value should remain the same (precision bug prevention)
    const valueAfterScroll = await totalValueInput.inputValue();
    expect(valueAfterScroll).toBe(initialValue);

    // Input should lose focus (blur behavior)
    await expect(totalValueInput).not.toBeFocused();
  });

  test('should handle validation errors gracefully', async ({ page }) => {
    await navigateToContracts(page);
    await page.click('text=Novo Contrato');

    // Submit form with invalid data
    await page.fill('input[name="totalValue"]', '-1000'); // Negative value
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=Amount must be positive')).toBeVisible();

    // Should not navigate away from form
    await expect(page).toHaveURL(/.*contracts.*new/);

    // Fix the error and submit successfully
    await page.fill('input[name="totalValue"]', '50000');
    await page.fill('input[name="clientName"]', 'Cliente Válido');
    await page.fill('input[name="projectName"]', 'Projeto Válido');
    await page.fill('input[name="signedDate"]', '15/01/2025');

    await page.click('button[type="submit"]');

    // Should navigate to contracts list
    await expect(page).toHaveURL(/\/contracts$/);
    await expectContractInList(page, 'Cliente Válido', 'Projeto Válido');
  });
});
```

### 2. **Cross-System Integration Testing**

```typescript
// tests/e2e/financial-workflow.spec.ts
test.describe('Financial Workflow E2E', () => {
  test('should complete full financial cycle: contract → receivable → payment', async ({ page }) => {
    await loginAsTestUser(page);

    // 1. Create contract
    await navigateToContracts(page);
    await page.click('text=Novo Contrato');

    await fillContractForm(page, {
      clientName: 'Cliente Ciclo Completo',
      projectName: 'Projeto Ciclo Completo',
      totalValue: '90000',
      signedDate: '15/01/2025',
    });

    await page.click('button[type="submit"]');

    // 2. Navigate to receivables and create receivable for the contract
    await page.click('nav >> text=Recebíveis');
    await page.click('text=Novo Recebível');

    await page.selectOption('select[name="contractId"]', { label: 'Cliente Ciclo Completo - Projeto Ciclo Completo' });
    await page.fill('input[name="amount"]', '30000'); // First installment
    await page.fill('input[name="dueDate"]', '15/02/2025');
    await page.fill('input[name="description"]', '1ª Parcela');

    await page.click('button[type="submit"]');

    // 3. Verify receivable appears in list
    await expect(page.locator('text=1ª Parcela')).toBeVisible();
    await expect(page.locator('text=R$ 30.000,00')).toBeVisible();

    // 4. Mark receivable as paid
    await page.click('tr:has-text("1ª Parcela") >> text=Marcar como Pago');

    // 5. Verify payment status
    await expect(page.locator('tr:has-text("1ª Parcela") >> text=Pago')).toBeVisible();

    // 6. Check dashboard reflects the changes
    await page.click('nav >> text=Dashboard');

    // Should show updated financial summary
    await expect(page.locator('text=R$ 30.000,00')).toBeVisible(); // Received amount
    await expect(page.locator('text=R$ 60.000,00')).toBeVisible(); // Remaining amount
  });

  test('should handle overdue receivables correctly', async ({ page }) => {
    await loginAsTestUser(page);

    // Create overdue receivable (backdated)
    await page.goto('/receivables/new');

    await fillReceivableForm(page, {
      description: 'Recebível Atrasado',
      amount: '15000',
      dueDate: '15/01/2025', // Past date
    });

    await page.click('button[type="submit"]');

    // Should show overdue indicator
    await expect(page.locator('tr:has-text("Recebível Atrasado") >> .text-red-600')).toBeVisible();

    // Dashboard should show overdue alert
    await page.click('nav >> text=Dashboard');
    await expect(page.locator('text=Em Atraso')).toBeVisible();
    await expect(page.locator('.bg-red-50')).toBeVisible(); // Overdue card
  });
});
```

## Specialized Testing Patterns

### 1. **Performance Testing**

```typescript
// tests/performance/api-performance.test.ts
import { performance } from 'perf_hooks';

describe('API Performance Tests', () => {
  const performanceThresholds = {
    contractsList: 500, // 500ms
    contractCreate: 1000, // 1s
    contractUpdate: 800, // 800ms
    dashboardData: 300, // 300ms
  };

  it('should load contracts list within performance threshold', async () => {
    const startTime = performance.now();

    const response = await fetch('/api/contracts', {
      headers: { Authorization: `Bearer ${testToken}` },
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(response.ok).toBe(true);
    expect(duration).toBeLessThan(performanceThresholds.contractsList);
  });

  it('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = 10;
    const requests = Array(concurrentRequests).fill(null).map(() =>
      fetch('/api/contracts', {
        headers: { Authorization: `Bearer ${testToken}` },
      })
    );

    const startTime = performance.now();
    const responses = await Promise.all(requests);
    const endTime = performance.now();

    const averageResponseTime = (endTime - startTime) / concurrentRequests;

    responses.forEach(response => {
      expect(response.ok).toBe(true);
    });

    expect(averageResponseTime).toBeLessThan(performanceThresholds.contractsList * 1.5);
  });

  it('should handle large datasets efficiently', async () => {
    // Create many contracts for performance testing
    const contractPromises = Array(100).fill(null).map((_, index) =>
      createTestContract({
        clientName: `Performance Client ${index}`,
        projectName: `Performance Project ${index}`,
        totalValue: 10000 + index,
      })
    );

    await Promise.all(contractPromises);

    const startTime = performance.now();

    const response = await fetch('/api/contracts', {
      headers: { Authorization: `Bearer ${testToken}` },
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(response.ok).toBe(true);
    expect(duration).toBeLessThan(performanceThresholds.contractsList * 2); // Allow 2x threshold for large dataset

    const data = await response.json();
    expect(data.contracts.length).toBeGreaterThan(0);
  });
});
```

### 2. **Security Testing**

```typescript
// tests/security/authorization.test.ts
describe('Security Tests', () => {
  describe('Team Isolation Security', () => {
    it('should not allow access to other team data via direct ID manipulation', async () => {
      const { teamA, userA } = await createTestTeam();
      const { teamB, userB } = await createTestTeam();

      // Create contract in Team A
      const contractTeamA = await createTestContract(teamA.id, {
        clientName: 'Team A Client',
        totalValue: 10000,
      });

      // Try to access Team A contract with Team B credentials
      const tokenTeamB = await getAuthToken(userB);

      const response = await fetch(`/api/contracts/${contractTeamA.id}`, {
        headers: { Authorization: `Bearer ${tokenTeamB}` },
      });

      expect(response.status).toBe(404); // Should not reveal existence
    });

    it('should not leak team data in error messages', async () => {
      const { teamA, userA } = await createTestTeam();
      const { teamB, userB } = await createTestTeam();

      const tokenTeamB = await getAuthToken(userB);

      const response = await fetch('/api/contracts/nonexistent-id', {
        headers: { Authorization: `Bearer ${tokenTeamB}` },
      });

      const errorData = await response.json();

      // Should not contain any team-specific information
      expect(errorData.error.message).not.toContain(teamA.id);
      expect(errorData.error.message).not.toContain(teamB.id);
      expect(errorData.error.message).not.toContain('Team');
    });

    it('should prevent SQL injection in query parameters', async () => {
      const maliciousQuery = "'; DROP TABLE contracts; --";

      const response = await fetch(`/api/contracts?clientName=${encodeURIComponent(maliciousQuery)}`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });

      expect(response.ok).toBe(true);

      // Should return empty results, not cause an error
      const data = await response.json();
      expect(data.contracts).toEqual([]);

      // Verify table still exists by making another request
      const verifyResponse = await fetch('/api/contracts', {
        headers: { Authorization: `Bearer ${testToken}` },
      });

      expect(verifyResponse.ok).toBe(true);
    });
  });

  describe('Input Validation Security', () => {
    it('should sanitize HTML in input fields', async () => {
      const maliciousInput = '<script>alert("XSS")</script>';

      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          clientName: maliciousInput,
          projectName: 'Test Project',
          totalValue: 10000,
          signedDate: '2025-01-15T00:00:00.000Z',
        }),
      });

      if (response.ok) {
        const contract = await response.json();
        expect(contract.clientName).not.toContain('<script>');
      } else {
        // Should be rejected by validation
        expect(response.status).toBe(400);
      }
    });
  });
});
```

### 3. **Accessibility Testing**

```typescript
// tests/accessibility/forms.test.ts
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  describe('Contract Form Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<ContractForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form labels', () => {
      render(<ContractForm />);

      expect(screen.getByLabelText(/client name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/total value/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/signed date/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<ContractForm />);

      const clientNameInput = screen.getByLabelText(/client name/i);
      const projectNameInput = screen.getByLabelText(/project name/i);
      const submitButton = screen.getByRole('button', { name: /save contract/i });

      // Should be able to tab through form elements
      clientNameInput.focus();
      expect(clientNameInput).toHaveFocus();

      // Tab to next field
      fireEvent.keyDown(clientNameInput, { key: 'Tab' });
      expect(projectNameInput).toHaveFocus();

      // Should be able to submit with Enter
      fireEvent.keyDown(submitButton, { key: 'Enter' });
      // Verify form submission logic...
    });

    it('should announce errors to screen readers', () => {
      render(<ContractForm />);

      const clientNameInput = screen.getByLabelText(/client name/i);

      // Trigger validation error
      fireEvent.change(clientNameInput, { target: { value: '' } });
      fireEvent.blur(clientNameInput);

      // Error should be associated with input via aria-describedby
      const errorElement = screen.getByText(/client name is required/i);
      expect(errorElement).toHaveAttribute('role', 'alert');
      expect(errorElement).toHaveAttribute('aria-live', 'polite');
    });
  });
});
```

## Test Utilities and Helpers

### 1. **Database Test Helpers**

```typescript
// tests/utils/database.ts
export class TestDatabase {
  private prisma: PrismaClient;
  private testData: { teams: string[], users: string[], contracts: string[] } = {
    teams: [],
    users: [],
    contracts: [],
  };

  constructor() {
    this.prisma = new PrismaClient({
      datasources: { db: { url: process.env.TEST_DATABASE_URL } },
    });
  }

  async cleanup() {
    // Delete test data in reverse dependency order
    await this.prisma.receivable.deleteMany({
      where: { contractId: { in: this.testData.contracts } },
    });

    await this.prisma.contract.deleteMany({
      where: { id: { in: this.testData.contracts } },
    });

    await this.prisma.user.deleteMany({
      where: { id: { in: this.testData.users } },
    });

    await this.prisma.team.deleteMany({
      where: { id: { in: this.testData.teams } },
    });

    // Clear tracking arrays
    this.testData.teams = [];
    this.testData.users = [];
    this.testData.contracts = [];
  }

  async destroy() {
    await this.prisma.$disconnect();
  }

  // Track created records for cleanup
  trackTeam(id: string) { this.testData.teams.push(id); }
  trackUser(id: string) { this.testData.users.push(id); }
  trackContract(id: string) { this.testData.contracts.push(id); }

  get contract() { return this.prisma.contract; }
  get user() { return this.prisma.user; }
  get team() { return this.prisma.team; }
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const testDb = new TestDatabase();

  // Run migrations on test database
  await exec('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  });

  return testDb;
}
```

### 2. **API Test Helpers**

```typescript
// tests/utils/api-helpers.ts
export async function createTestTeam(db?: TestDatabase): Promise<TestTeam> {
  const team = await (db || testDb).team.create({
    data: {
      name: `Test Team ${Date.now()}`,
      id: generateId(),
    },
  });

  if (db) db.trackTeam(team.id);
  return team;
}

export async function createTestUser(db: TestDatabase, teamId: string): Promise<TestUser> {
  const user = await db.user.create({
    data: {
      id: generateId(),
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      teamId,
    },
  });

  db.trackUser(user.id);
  return user;
}

export async function getAuthToken(user: TestUser): Promise<string> {
  // Create JWT token for testing
  return jwt.sign(
    { userId: user.id, teamId: user.teamId },
    process.env.NEXTAUTH_SECRET!
  );
}

export function mockAuthenticatedRequest(user: TestUser) {
  return jest.spyOn(require('@/lib/auth'), 'requireAuth').mockResolvedValue({
    user,
    teamId: user.teamId,
  });
}
```

### 3. **Component Test Helpers**

```typescript
// tests/utils/component-helpers.tsx
export function renderWithProviders(
  ui: React.ReactElement,
  options: {
    user?: TestUser;
    initialState?: Partial<AppState>;
  } = {}
) {
  const { user, initialState = {} } = options;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SessionProvider session={user ? { user, expires: '' } : null}>
        <QueryClientProvider client={createTestQueryClient()}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </QueryClientProvider>
      </SessionProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export async function waitForLoadingToFinish() {
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
}
```

## Testing Configuration

### 1. **Jest Configuration**

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.ts',
    '<rootDir>/tests/setup/test-env.ts',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './lib/utils/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
```

### 2. **Test Environment Setup**

```typescript
// tests/setup/test-env.ts
import { loadEnvConfig } from '@next/env';

// Load test environment variables
loadEnvConfig(process.cwd());

// Set test-specific environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/arqcashflow_test';
process.env.NEXTAUTH_SECRET = 'test-secret';

// Mock external services
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: 'Mocked Claude response' }],
      }),
    },
  })),
}));

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
```

## Related Documentation

- [Debugging Approach Context](../contexts/debugging-approach.md) - Systematic debugging methodology
- [Testing Strategies Guide](../../developer/testing/strategies.md) - Comprehensive testing setup
- [Standardized Test Port](../../developer/testing/standardized-test-port.md) - Port 3010 testing configuration

---

*These testing patterns ensure ArqCashflow maintains high quality, reliability, and security standards appropriate for financial applications.*