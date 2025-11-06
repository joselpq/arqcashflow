# ADR-021 Phase 2: Implementation Guide

**Status**: 📋 **READY FOR IMPLEMENTATION**
**Decision**: Option A - Migrate to Unified Validation
**Decision Date**: November 5, 2025
**Estimated Effort**: 2-3 days
**Related**: [ADR-021: Validation and Audit System Simplification](docs/docs-site/docs/decisions/021-validation-audit-simplification.md)

---

## 🎯 **Objective**

Migrate 6 API routes from inline Zod schemas to centralized unified validation layer for consistency and single source of truth.

**Important**: This is **pure refactoring** with **ZERO behavior changes**. API functionality remains identical.

---

## 📋 **Prerequisites**

Before starting:
- ✅ Phase 1 complete (context-aware validation removed, business rules loosened)
- ✅ All tests passing
- ✅ Current code works correctly

---

## 🗺️ **Migration Checklist**

### **Routes to Migrate** (6 total):

- [ ] 1. `app/api/contracts/route.ts` (POST - create)
- [ ] 2. `app/api/contracts/[id]/route.ts` (PUT - update)
- [ ] 3. `app/api/receivables/route.ts` (POST - create)
- [ ] 4. `app/api/expenses/route.ts` (POST - create)
- [ ] 5. `app/api/auth/register/route.ts` (POST - register)
- [ ] 6. `app/api/expenses/[id]/recurring-action/route.ts` (POST - bulk action)

**Estimated**: ~4 hours per route (30 min migration + 3.5 hours testing)

---

## 📝 **Migration Pattern**

### **Step 1: Identify Current Schema**

**Example**: `app/api/contracts/route.ts`

```typescript
// BEFORE (inline schema)
const ContractSchema = z.object({
  clientName: z.string(),
  projectName: z.string(),
  description: z.string().optional(),
  totalValue: z.number(),
  signedDate: z.string(),
  status: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
})
```

### **Step 2: Check Unified Equivalent**

```typescript
// lib/validation/financial.ts
export const ContractSchemas = {
  create: (profession?: string | null) => z.object({
    clientName: BaseFieldSchemas.name,
    projectName: BaseFieldSchemas.name,
    description: BaseFieldSchemas.description,
    totalValue: BaseFieldSchemas.amount,  // ← Handles profession-aware logic
    signedDate: RefinedFieldSchemas.signedDate,
    status: EnumSchemas.contractStatus.optional().default('draft'),
    category: BaseFieldSchemas.optionalCategory,
    notes: BaseFieldSchemas.notes,
  })
}
```

**Note**: Unified schemas are **more robust** (profession-aware, refined validation, enum types).

### **Step 3: Migrate the Route**

```typescript
// AFTER (unified validation)
import { ContractSchemas } from '@/lib/validation'

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    const body = await request.json()

    // Get profession for profession-aware validation
    const profession = context.user.team.profession

    // Use unified schema
    const validatedData = ContractSchemas.create(profession).parse(body)

    const contractService = new ContractService({ ...context, request })
    const contract = await contractService.create(validatedData)

    return { contract }
  })
}
```

**Changes**:
- ❌ Remove: Inline `ContractSchema` definition (~20 lines)
- ✅ Add: Import from `@/lib/validation` (1 line)
- ✅ Add: Get profession from context (1 line)
- ✅ Update: Use `ContractSchemas.create(profession).parse()` (1 line)

**Net**: -17 lines per route

### **Step 4: Test Identical Behavior**

```bash
# Test the route works identically
curl -X POST http://localhost:3010/api/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Test Client",
    "projectName": "Test Project",
    "totalValue": 50000,
    "signedDate": "2025-11-05"
  }'

# Should succeed with same response as before
```

---

## 🔄 **Migration Sequence**

Migrate routes **one at a time**, testing after each:

### **Day 1: Contracts (2 routes)**
1. ✅ Migrate `app/api/contracts/route.ts` (POST)
2. ✅ Test create contract works
3. ✅ Migrate `app/api/contracts/[id]/route.ts` (PUT)
4. ✅ Test update contract works
5. ✅ Commit: "refactor: migrate contracts API to unified validation"

### **Day 2: Receivables & Expenses (2 routes)**
1. ✅ Migrate `app/api/receivables/route.ts` (POST)
2. ✅ Test create receivable works
3. ✅ Migrate `app/api/expenses/route.ts` (POST)
4. ✅ Test create expense works
5. ✅ Commit: "refactor: migrate receivables and expenses API to unified validation"

### **Day 3: Auth & Bulk Operations (2 routes)**
1. ✅ Migrate `app/api/auth/register/route.ts` (POST)
2. ✅ Test user registration works
3. ✅ Migrate `app/api/expenses/[id]/recurring-action/route.ts` (POST)
4. ✅ Test bulk expense actions work
5. ✅ Commit: "refactor: migrate auth and bulk operations to unified validation"

---

## 📊 **Detailed Route Guides**

### **Route 1: Contracts (POST)**

**File**: `app/api/contracts/route.ts`

**Current Inline Schema**:
```typescript
const ContractSchema = z.object({
  clientName: z.string(),
  projectName: z.string(),
  description: z.string().optional(),
  totalValue: z.number(),
  signedDate: z.string(),
  status: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
})
```

**Unified Replacement**:
```typescript
import { ContractSchemas } from '@/lib/validation'

// In POST handler:
const profession = context.user.team.profession
const validatedData = ContractSchemas.create(profession).parse(body)
```

**Test Case**:
```typescript
// Should accept valid contract
const validContract = {
  clientName: 'ACME Corp',
  projectName: 'Office Renovation',
  totalValue: 50000,
  signedDate: '2025-11-05'
}

// Should reject invalid contract
const invalidContract = {
  clientName: '', // Empty - should fail
  projectName: 'Test',
  totalValue: -100, // Negative - should fail
  signedDate: 'invalid-date' // Bad format - should fail
}
```

---

### **Route 2: Contracts (PUT)**

**File**: `app/api/contracts/[id]/route.ts`

**Unified Replacement**:
```typescript
import { ContractSchemas } from '@/lib/validation'

// In PUT handler:
const profession = context.user.team.profession
const validatedData = ContractSchemas.update(profession).parse(body)
```

**Note**: Use `.update()` not `.create()` for updates.

---

### **Route 3: Receivables (POST)**

**File**: `app/api/receivables/route.ts`

**Unified Replacement**:
```typescript
import { ReceivableSchemas } from '@/lib/validation'

// In POST handler:
const validatedData = ReceivableSchemas.create.parse(body)
```

**Note**: Receivables don't have profession-aware validation, simpler than contracts.

---

### **Route 4: Expenses (POST)**

**File**: `app/api/expenses/route.ts`

**Unified Replacement**:
```typescript
import { ExpenseSchemas } from '@/lib/validation'

// In POST handler:
const validatedData = ExpenseSchemas.create.parse(body)
```

---

### **Route 5: Auth Register (POST)**

**File**: `app/api/auth/register/route.ts`

**Current Inline Schema**:
```typescript
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
})
```

**Unified Replacement**:
```typescript
import { AuthSchemas } from '@/lib/validation'

// In POST handler:
const validatedData = AuthSchemas.register.parse(body)
```

---

### **Route 6: Bulk Expense Actions (POST)**

**File**: `app/api/expenses/[id]/recurring-action/route.ts`

**Current Inline Schema**:
```typescript
const actionSchema = z.object({
  action: z.enum(['update_this', 'update_future', 'update_all']),
  scope: z.string(),
  updatedData: z.object({...}).optional()
})
```

**Unified Replacement**:
```typescript
import { RecurringExpenseSchemas } from '@/lib/validation'

// In POST handler:
const validatedData = RecurringExpenseSchemas.action.parse(body)
```

---

## 🧪 **Testing Strategy**

### **For Each Route Migration**:

1. **Unit Test**: Schema validation
```typescript
describe('Contract API with unified validation', () => {
  it('should validate valid contract data', () => {
    const valid = { clientName: 'Test', projectName: 'Project', ... }
    expect(() => ContractSchemas.create().parse(valid)).not.toThrow()
  })

  it('should reject invalid contract data', () => {
    const invalid = { clientName: '', projectName: 'Project', ... }
    expect(() => ContractSchemas.create().parse(invalid)).toThrow()
  })
})
```

2. **Integration Test**: API endpoint
```bash
# Test POST /api/contracts
curl -X POST http://localhost:3010/api/contracts \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"clientName":"Test","projectName":"Project","totalValue":1000,"signedDate":"2025-11-05"}'

# Should return 200 with contract object
```

3. **Regression Test**: Existing functionality
```bash
# Run full test suite
npm test

# Should pass all existing tests
```

---

## ✅ **Success Criteria**

Phase 2 is complete when:

- [ ] All 6 routes migrated to unified validation
- [ ] All inline `z.object()` schemas removed
- [ ] All routes tested and working identically
- [ ] No breaking changes to API behavior
- [ ] Documentation updated (lib/validation/README.md)
- [ ] Commit messages clear and descriptive

**Code Metrics**:
- Expected: -120 lines (inline schemas removed)
- Expected: +20 lines (imports and unified calls)
- Net: **-100 lines** across 6 files

---

## 📝 **Commit Strategy**

Use clear, descriptive commits:

```bash
# Day 1
git add app/api/contracts/route.ts app/api/contracts/[id]/route.ts
git commit -m "refactor(validation): migrate contracts API to unified validation

- Remove inline ContractSchema definitions
- Use ContractSchemas.create/update from lib/validation
- Add profession-aware validation support
- No behavior changes, pure refactoring

Related: ADR-021 Phase 2"

# Day 2
git add app/api/receivables/route.ts app/api/expenses/route.ts
git commit -m "refactor(validation): migrate receivables and expenses API to unified validation

- Remove inline schemas for receivables and expenses
- Use ReceivableSchemas and ExpenseSchemas from lib/validation
- No behavior changes, pure refactoring

Related: ADR-021 Phase 2"

# Day 3
git add app/api/auth/register/route.ts app/api/expenses/[id]/recurring-action/route.ts
git commit -m "refactor(validation): migrate auth and bulk operations to unified validation

- Remove inline registerSchema and actionSchema
- Use AuthSchemas and RecurringExpenseSchemas from lib/validation
- Complete unified validation migration (6/6 routes)

Related: ADR-021 Phase 2"
```

---

## 🚨 **Common Pitfalls**

### **Pitfall 1: Forgetting Profession Parameter**

**Wrong**:
```typescript
const validatedData = ContractSchemas.create().parse(body)  // ❌ Missing profession
```

**Right**:
```typescript
const profession = context.user.team.profession
const validatedData = ContractSchemas.create(profession).parse(body)  // ✅
```

### **Pitfall 2: Using .create() for Updates**

**Wrong**:
```typescript
// In PUT handler
const validatedData = ContractSchemas.create(profession).parse(body)  // ❌ Too strict
```

**Right**:
```typescript
// In PUT handler
const validatedData = ContractSchemas.update(profession).parse(body)  // ✅ Allows partial
```

### **Pitfall 3: Breaking Existing Tests**

**Solution**: Run tests after each route migration:
```bash
npm test -- --grep "contracts"  # Test just contracts
npm test                        # Full test suite
```

---

## 🔄 **Rollback Plan**

If issues arise, rollback is simple:

```bash
# Revert specific commit
git revert <commit-hash>

# Or revert all Phase 2 changes
git revert HEAD~3..HEAD  # If 3 commits for Phase 2

# Estimated rollback time: 10 minutes
```

---

## 📚 **Resources**

**Code References**:
- Unified validation: `lib/validation/financial.ts`
- Base schemas: `lib/validation/schemas.ts`
- API schemas: `lib/validation/api.ts`
- Usage examples: `lib/services/ContractService.ts` (already uses unified validation)

**Documentation**:
- `lib/validation/README.md` - Unified validation guide
- `UNIFIED_VALIDATION_DECISION_FRAMEWORK.md` - Decision rationale
- `ADR-021-PHASE1-COMPLETION.md` - Phase 1 completion summary

**Testing**:
- Test port: 3010 (always use this for testing)
- Test commands: See `CLAUDE.md` testing section

---

## ✅ **Completion Checklist**

When Phase 2 is done, update:

- [ ] `ADR-021-PHASE2-COMPLETION.md` - Create completion summary
- [ ] `docs/docs-site/docs/decisions/021-validation-audit-simplification.md` - Update phase status
- [ ] `lib/validation/README.md` - Update adoption status
- [ ] `BACKLOG.md` - Move Phase 2 from DOING to DONE

---

## 🎯 **Next Agent Instructions**

**To implement Phase 2**:

1. Read this guide completely
2. Start with Route 1 (contracts POST)
3. Follow migration pattern exactly
4. Test after each route
5. Commit incrementally (1 commit per day/1-2 routes)
6. Create completion summary when done

**Expected timeline**: 2-3 days
**Risk level**: Low (pure refactoring, well-documented)
**Reversibility**: High (easy to rollback)

---

**Ready to start? Begin with Route 1: `app/api/contracts/route.ts`**
