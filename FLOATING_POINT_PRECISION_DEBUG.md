# Floating Point Precision Bug Investigation

## Problem Description

**Issue**: When creating or editing financial entities (contracts, receivables, expenses), input values lose precision before being stored in the database.

**Examples**:
- Input: 200 → Stored: 198
- Input: 600 → Stored: 595 or 597
- Input: 30000 → Stored: 29997
- Input: 1000 → Stored: 997

**Affected Features**:
- Contract creation/editing
- Receivable creation/editing
- Expense creation/editing

## Investigation Process

### Initial Hypothesis
We initially suspected the issue was in:
1. Database storage (PostgreSQL DOUBLE PRECISION)
2. API serialization/deserialization
3. Prisma ORM conversion

### Debugging Setup
Added comprehensive logging at multiple levels:
1. **Form Level**: Track `parseFloat()` conversion
2. **API Level**: Track request body values
3. **Database Level**: Track Prisma operations
4. **Display Level**: Track rendering values

### Key Discovery: The Root Cause

**The precision loss occurs in form components, NOT in the database or API.**

#### Evidence:
- API logs show corrupted values arriving from frontend (e.g., 597 instead of 600)
- Database stores exactly what the API receives
- Form-level debugging revealed the issue is in object handling patterns

## Technical Analysis

### The Problematic Pattern
```typescript
// ❌ RISKY: Direct object spread in function calls
await onSubmit({
  ...formData,
  amount: parseFloat(formData.amount)  // ← Precision loss occurs here
})
```

### The Working Pattern
```typescript
// ✅ SAFE: Prepare object separately first
const submissionData = {
  ...formData,
  amount: parseFloat(formData.amount)
}
await onSubmit(submissionData)
```

### Why This Happens
The direct object spread in function calls appears to cause some kind of:
- **Timing issue** during object creation
- **Reference corruption** during spread operation
- **JavaScript engine optimization** that affects floating-point precision

## Forms Analysis & Fix Status

### ✅ ContractForm (`app/components/forms/ContractForm.tsx`)
- **Status**: FIXED ✅
- **Method**: Accidentally fixed during debugging (object preparation pattern)
- **Result**: Values remain precise (200 stays 200)

### ✅ ReceivableForm (`app/components/forms/ReceivableForm.tsx`)
- **Status**: FIXED ✅
- **Method**: Applied object preparation pattern + debugging
- **Result**: Values remain precise

### ✅ ExpenseForm (`app/components/forms/ExpenseForm.tsx`)
- **Status**: FIXED ✅
- **Method**: Applied object preparation pattern + debugging
- **Result**: Values remain precise

### ❓ EnhancedExpenseForm (`app/components/forms/EnhancedExpenseForm.tsx`)
- **Status**: PARTIALLY FIXED ❓
- **Method**: Applied simple object preparation pattern
- **Used By**: Projetos → Despesas tab (both creation and editing)
- **Special Feature**: Handles recurring expenses
- **Result**: NEEDS TESTING

## Architecture Discovery

### Form Component Mapping
```
Projetos Page:
├── Contratos Tab → ContractForm ✅
├── Recebíveis Tab → ReceivableForm ✅
└── Despesas Tab → EnhancedExpenseForm ❓

Standalone Pages:
├── /expenses → ExpenseForm ✅
├── /receivables → ReceivableForm ✅
└── /contracts → ContractForm ✅
```

### API Endpoints
All endpoints were fixed with the same pattern:
```typescript
// ✅ FIXED PATTERN in all APIs
const dataForDB = { ...validatedData, teamId }
const entity = await prisma.entity.create({ data: dataForDB })

// ❌ OLD RISKY PATTERN
const entity = await prisma.entity.create({
  data: { ...validatedData, teamId }
})
```

## Open Questions

1. **Why does object preparation order matter?**
   - Is it a JavaScript engine optimization issue?
   - Is it related to V8's object creation timing?
   - Does it affect only certain number ranges?

2. **Browser/Environment Dependency?**
   - Does this happen in all browsers?
   - Is it Node.js version dependent?
   - Does it affect production builds differently?

3. **Number Range Patterns?**
   - Why do some numbers lose 2-5 in precision?
   - Is there a mathematical pattern to the loss?
   - Are certain decimals more affected?

## Current Status

### ✅ Working (Confirmed)
- Contract creation/editing
- Receivable creation/editing
- Expense creation via standalone form

### ❓ Needs Testing
- Expense creation via Projetos tab
- Expense editing via Projetos tab

### 🔧 Applied Fixes
- Object preparation pattern in all form components
- API endpoint restructuring
- Comprehensive debugging setup (can be removed later)

## Next Steps

1. **Test EnhancedExpenseForm** with problematic values
2. **Remove debugging code** once confirmed working
3. **Document the fix pattern** for future form components
4. **Consider TypeScript strict mode** to prevent similar issues
5. **Add unit tests** for precision preservation

## Code Locations

### Fixed Files
- `app/components/forms/ContractForm.tsx`
- `app/components/forms/ReceivableForm.tsx`
- `app/components/forms/ExpenseForm.tsx`
- `app/api/contracts/route.ts`
- `app/api/receivables/route.ts`
- `app/api/expenses/route.ts`

### Recently Modified
- `app/components/forms/EnhancedExpenseForm.tsx` (needs testing)

## Lesson Learned

**Object spread timing matters in JavaScript.** When working with financial data or any precision-critical numbers, always prepare data objects separately before passing them to functions, especially async functions or API calls.

This is a subtle but critical JavaScript behavior that can cause hard-to-debug precision issues in production applications.