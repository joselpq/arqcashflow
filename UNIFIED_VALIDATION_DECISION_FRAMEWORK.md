# Unified Validation: Decision Framework & Tradeoffs

**Date**: November 5, 2025
**Related ADR**: [ADR-021: Validation and Audit System Simplification](docs/docs-site/docs/decisions/021-validation-audit-simplification.md)
**Decision Required**: Phase 2 - Migrate to unified validation OR remove it?

---

## 🎯 **The Question**

You have a well-designed unified validation layer (`lib/validation/`) that is **currently unused**. You must decide:

**Option A**: Migrate 6 API routes to use the unified validation layer (consolidate)
**Option B**: Delete the unified validation layer, keep inline schemas (simplify)

Both are valid. Which is better for **your specific situation**?

---

## 📊 **Current State**

### **What Exists**:

```typescript
// lib/validation/ (1,596 lines, unused)
├── schemas.ts (277 lines)
│   └── BaseFieldSchemas (32 reusable validators)
│   └── EnumSchemas (8 enum validators)
│   └── RefinedFieldSchemas (advanced validators)
├── financial.ts (331 lines)
│   └── ContractSchemas.create()
│   └── ReceivableSchemas.create()
│   └── ExpenseSchemas.create()
└── api.ts (~300 lines)
    └── AuthSchemas, AISchemas, QuerySchemas, etc.
```

### **What's Actually Used**:

```typescript
// app/api/contracts/route.ts (INLINE SCHEMA - duplicated)
const ContractSchema = z.object({
  clientName: z.string(),
  projectName: z.string(),
  totalValue: z.number(),
  signedDate: z.string(),
  // ... 20 lines of validation logic
})

// Duplicates exist in:
- app/api/contracts/route.ts
- app/api/contracts/[id]/route.ts
- app/api/receivables/route.ts
- app/api/expenses/route.ts
- app/api/auth/register/route.ts
- app/api/expenses/[id]/recurring-action/route.ts
```

### **The Problem**:

You've built a **single source of truth** (`lib/validation/`) but **nobody is using it**. API routes still use **inline, duplicated schemas**.

This is **wasted effort** (building it) and **ongoing waste** (maintaining both).

---

## 🔀 **Option A: Migrate to Unified Validation**

### **What It Means**:

Migrate the 6 API routes to import from `lib/validation/` instead of defining inline schemas.

**Before**:
```typescript
// app/api/contracts/route.ts
import { z } from 'zod'

const ContractSchema = z.object({
  clientName: z.string(),
  projectName: z.string(),
  totalValue: z.number(),
  signedDate: z.string(),
  status: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const validatedData = ContractSchema.parse(body)
  // ...
}
```

**After**:
```typescript
// app/api/contracts/route.ts
import { ContractSchemas } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Get profession from team context
  const profession = context.user.team.profession

  // Use unified validation
  const validatedData = ContractSchemas.create(profession).parse(body)
  // ...
}
```

### **Work Required**:

**Effort**: 2-3 days (6 API routes)

**Changes Per Route**:
1. Remove inline `z.object()` schema (~20 lines)
2. Import from `lib/validation` (1 line)
3. Call unified schema (1 line)
4. Test endpoint works identically

**Example Migration** (contracts route):
```diff
- import { z } from 'zod'
+ import { ContractSchemas } from '@/lib/validation'

- const ContractSchema = z.object({
-   clientName: z.string(),
-   projectName: z.string(),
-   totalValue: z.number(),
-   signedDate: z.string(),
-   status: z.string().optional(),
-   category: z.string().optional(),
-   notes: z.string().optional(),
- })

export async function POST(request: NextRequest) {
  return withTeamContext(async (context) => {
    const body = await request.json()
+   const profession = context.user.team.profession
-   const validatedData = ContractSchema.parse(body)
+   const validatedData = ContractSchemas.create(profession).parse(body)

    const contractService = new ContractService({ ...context, request })
    const contract = await contractService.create(validatedData)
    return { contract }
  })
}
```

**Total Changes**: ~150 lines removed, ~20 lines added across 6 files

---

### **Pros of Option A**:

✅ **Single Source of Truth**:
- All validation logic in one place (`lib/validation/`)
- Change validation rules once, applies everywhere
- No duplication between API routes

✅ **Better for Future Multi-Client Scenarios**:
- If you build a mobile app: reuse validation
- If you build third-party API: reuse validation
- If you build admin dashboard: reuse validation

✅ **Profession-Aware Validation Already Built**:
- `ContractSchemas.create(profession)` handles medicina vs arquitetura
- Don't need to rebuild this per route

✅ **Type Inference Benefits**:
```typescript
import type { ContractCreateData } from '@/lib/validation'

// TypeScript knows exact shape
function createContract(data: ContractCreateData) {
  // IntelliSense works perfectly
}
```

✅ **Consistency Across Codebase**:
- Service layer already uses unified schemas
- API routes would match service layer
- Less cognitive overhead (one pattern everywhere)

✅ **Easier to Add New Validations**:
```typescript
// Add new field to all contract routes:
// BEFORE: Update 3 different inline schemas
// AFTER: Update 1 schema in lib/validation/financial.ts
```

✅ **Investment Already Made**:
- Code is written, tested, documented
- Just need to use it
- Don't waste the work already done

---

### **Cons of Option A**:

❌ **Migration Effort**:
- 2-3 days of engineering time
- Risk of breaking something during migration
- Need comprehensive testing

❌ **Indirection in Code**:
```typescript
// BEFORE: Validation visible in file
const ContractSchema = z.object({ ... }) // ← See exactly what's validated

// AFTER: Need to jump to other file
import { ContractSchemas } from '@/lib/validation' // ← Where is this defined?
```

❌ **Overkill for Simple API**:
- If you only have 6 API routes, centralization less valuable
- If validation rarely changes, duplication less problematic
- Small codebase doesn't need enterprise patterns

❌ **Cognitive Overhead**:
- Developers need to remember to use unified schemas
- Might accidentally create inline schemas
- Need code review to catch violations

❌ **Harder to Customize Per Route**:
```typescript
// What if one route needs slightly different validation?
// BEFORE: Just change inline schema
// AFTER: Add option to unified schema or override
```

❌ **Dependency Management**:
- API routes now depend on `lib/validation/`
- Changes to validation affect multiple routes
- Need to think about breaking changes

---

## 🗑️ **Option B: Remove Unified Validation**

### **What It Means**:

Delete the unused unified validation layer, keep inline schemas in API routes.

**Changes**:
```bash
# Delete unused files
rm lib/validation/schemas.ts      # -277 lines
rm lib/validation/financial.ts    # -331 lines
rm lib/validation/api.ts         # ~-300 lines
rm lib/validation/context.ts     # -487 lines (already planned)

# Keep only:
lib/validation/
├── index.ts (minimal - just types and utilities)
└── README.md (document inline schema standard)
```

**What Stays**:
- ✅ Service layer validation (in services)
- ✅ Inline API route schemas (current approach)
- ✅ Type exports used by services
- ✅ Validation utilities if needed

---

### **Pros of Option B**:

✅ **Maximum Simplicity**:
- ~900 lines of code deleted
- Less files to navigate
- Smaller mental model

✅ **Zero Migration Effort**:
- No changes to API routes
- No risk of breaking things
- Can ship other features instead

✅ **Validation Co-Located with Use**:
```typescript
// app/api/contracts/route.ts
const ContractSchema = z.object({ ... }) // ← See validation right here

export async function POST(request: NextRequest) {
  const validatedData = ContractSchema.parse(body)
  // Validation and usage in same file
}
```

✅ **Easier for New Developers**:
- Open API route file, see everything
- No jumping between files
- Less abstraction to understand

✅ **Fast Iteration**:
```typescript
// Need to change contract validation? Just edit this file.
// No need to think about other consumers
```

✅ **No Duplication Risk Going Forward**:
- Clear standard: "use inline schemas"
- Can't accidentally use wrong approach
- One way to do things

✅ **Matches Current Reality**:
- This is what you're already doing
- Just formalizing current practice
- No change to workflow

---

### **Cons of Option B**:

❌ **Duplication Across API Routes**:
```typescript
// ContractSchema defined in 3 places:
- app/api/contracts/route.ts (create)
- app/api/contracts/[id]/route.ts (update)
- app/api/contracts/auto-number/route.ts (validation)

// Change validation = update 3 files
```

❌ **Inconsistency Risk**:
```typescript
// app/api/contracts/route.ts
clientName: z.string()

// app/api/contracts/[id]/route.ts
clientName: z.string().min(1) // ← Oops, different validation!
```

❌ **Lose Profession-Aware Validation**:
- `ContractSchemas.create(profession)` won't exist
- Need to rebuild per route if medicina needs different rules
- More code duplication

❌ **Harder to Add Multi-Client Support Later**:
```typescript
// If you later build mobile app:
// BEFORE (unified): import { ContractSchemas } from 'shared-lib'
// AFTER (inline): Copy all inline schemas to mobile app (duplicate)
```

❌ **Waste of Past Effort**:
- Well-designed validation layer built
- Comprehensive, tested, documented
- Throw it all away

❌ **Miss Type Inference Benefits**:
```typescript
// No centralized types
import type { ContractCreateData } from '@/lib/validation' // ← Doesn't exist
// Need to use z.infer<typeof ContractSchema> everywhere
```

---

## ⚖️ **Direct Comparison**

| Criterion | Option A (Migrate) | Option B (Remove) | Winner |
|-----------|-------------------|-------------------|--------|
| **Effort Required** | 2-3 days migration | 0 days (delete files) | 🅱️ Option B |
| **Code Reduction** | ~130 lines (inline schemas removed) | ~900 lines (whole layer deleted) | 🅱️ Option B |
| **Long-Term Maintainability** | Single source of truth | Duplication across routes | 🅰️ Option A |
| **Validation Consistency** | Guaranteed (one schema) | Manual (can diverge) | 🅰️ Option A |
| **New Developer Onboarding** | More to learn | Less to learn | 🅱️ Option B |
| **Multi-Client Ready** | ✅ Ready | ❌ Need to rebuild | 🅰️ Option A |
| **Profession-Aware** | ✅ Built-in | ❌ Need to add per route | 🅰️ Option A |
| **Type Safety** | ✅ Centralized types | ⚠️ z.infer per file | 🅰️ Option A |
| **Change Velocity (Small Changes)** | Slower (more abstraction) | Faster (direct) | 🅱️ Option B |
| **Change Velocity (Large Changes)** | Faster (one place) | Slower (many files) | 🅰️ Option A |
| **Risk of Breaking Things** | Medium (migration risk) | Low (delete unused) | 🅱️ Option B |

**Score**: Option A = 7 wins, Option B = 5 wins

**But**: Depends on **your priorities** (see decision criteria below).

---

## 🎯 **Decision Criteria**

### **Choose Option A (Migrate) If**:

✅ **You plan to build multiple clients**:
- Mobile app coming soon
- Admin dashboard planned
- Third-party API in roadmap

✅ **You have validation changing frequently**:
- Business rules evolving
- Need consistency across routes
- Many updates to validation logic

✅ **You value consistency over simplicity**:
- Team prefers "one way to do things"
- Code review can catch violations
- Willing to invest time for long-term benefit

✅ **You have multi-profession complexity**:
- medicina vs arquitetura rules already different
- More professions planned (lawyers, engineers, etc.)
- Profession-aware validation needed

✅ **Team size growing**:
- More developers = more important to have single source of truth
- Onboarding overhead worth it for consistency

---

### **Choose Option B (Remove) If**:

✅ **You're staying single web app for foreseeable future**:
- No mobile app planned
- No third-party API needed
- Just one client (web)

✅ **Your API is stable**:
- Validation rules rarely change
- Minimal duplication updates needed
- Business rules mostly finalized

✅ **You value simplicity over abstraction**:
- Small team prefers less files/layers
- Direct code > centralized patterns
- "YAGNI" philosophy (You Aren't Gonna Need It)

✅ **You're staying single profession**:
- Only architects (arquitetura)
- No medicina, lawyer, engineer, etc. planned
- Profession-aware validation not needed

✅ **You want to ship faster right now**:
- Other priorities more important
- Can't afford 2-3 days migration
- Prefer deleting code to migrating it

---

## 🧮 **Quantitative Analysis**

### **Cost-Benefit Analysis**:

**Option A (Migrate)**:
```
Cost:
- 2-3 days engineering time (~$1,500 if contractor)
- Migration risk (small, testable)
- Cognitive overhead (small)

Benefit:
- Single source of truth (save ~30 min every validation change)
- Multi-client ready (save ~1 week if needed later)
- Profession-aware built-in (save ~3 days per new profession)
- Type safety improvements (save ~1 hour debugging type issues)

Break-even: ~4-6 months (if validation changes monthly)
```

**Option B (Remove)**:
```
Cost:
- Lose ~900 lines of well-designed code
- Need to rebuild if multi-client later (~1 week)
- Ongoing duplication maintenance (~30 min per change)

Benefit:
- 0 days effort now
- Simpler codebase immediately
- Faster iteration short-term

Break-even: Immediate (if no multi-client need)
```

### **Decision Matrix**:

```
                    Current Stage   Growth Stage   Enterprise Stage
Option A (Migrate)      ⚠️             ✅              ✅✅
Option B (Remove)       ✅             ⚠️              ❌
```

---

## 🎓 **Recommendation Framework**

### **If You're Uncertain, Ask**:

**Question 1**: "Will we build a mobile app or third-party API in next 12 months?"
- **Yes** → Option A (you'll need unified validation)
- **No** → Continue to Q2

**Question 2**: "Do validation rules change more than once per month?"
- **Yes** → Option A (consolidation saves time)
- **No** → Continue to Q3

**Question 3**: "Are we planning to support >1 profession (medicina, law, etc.)?"
- **Yes** → Option A (profession-aware built-in)
- **No** → Continue to Q4

**Question 4**: "Is team size growing (>3 developers in 6 months)?"
- **Yes** → Option A (consistency matters more)
- **No** → Continue to Q5

**Question 5**: "Can we afford 2-3 days for migration right now?"
- **Yes** → Option A (might as well consolidate)
- **No** → **Option B** (simplify now, can always migrate later)

---

## 💡 **Hybrid Option C: Partial Migration**

**What It Means**: Keep unified validation, migrate only some routes.

**Approach**:
1. Keep `lib/validation/` for **services** (already using it)
2. Migrate only **complex routes** (contracts, receivables)
3. Keep **simple routes** inline (auth, user, team)

**Pros**:
- Best of both worlds
- Less migration effort (1-2 days)
- Flexibility per route

**Cons**:
- Mixed patterns (confusing)
- "When to use which?" question
- Still some duplication

**When to Choose**:
- If you answered "Yes" to Q1-Q3 but "No" to Q5
- Want benefits of A but can't afford full migration
- Complex domains need consistency, simple don't

---

## 📋 **Decision Template**

Use this to document your choice:

```markdown
## Unified Validation Decision

**Date**: YYYY-MM-DD
**Decision Maker**: [Name/Team]
**Option Chosen**: [A: Migrate | B: Remove | C: Hybrid]

### Rationale:
[Why did you choose this option?]

### Key Factors:
- Multi-client plans: [Yes/No - explain]
- Validation change frequency: [Often/Rarely - explain]
- Profession plans: [Multi/Single - explain]
- Team size: [Growing/Stable - explain]
- Available time: [2-3 days ok/Need to ship now]

### Next Steps:
[What happens next?]

### Review Date:
[When to re-evaluate this decision?]
```

---

## 🎯 **My Recommendation**

Based on ArqCashflow's current state:

### **I recommend: Option A (Migrate)**

**Why**:

1. **Multi-profession already in use**:
   - medicina exists, arquitetura exists
   - Profession-aware validation already needed
   - Would need to rebuild this if you remove it

2. **Well-designed code exists**:
   - High quality, tested, documented
   - Throwing away good work is wasteful
   - 2-3 days migration vs 1 week rebuild later

3. **Service layer already uses it**:
   - Services import from lib/validation
   - API routes should match
   - Consistency within codebase

4. **Low migration risk**:
   - Only 6 routes
   - Easy to test
   - Can migrate one at a time

5. **Future-proofing**:
   - ADR-019 Profession-Based Modularization suggests growth
   - Multi-vertical expansion planned
   - Better to have foundation now

**However**: If you need to ship critical features urgently and can't afford 2-3 days, do **Option B** now and migrate later when you have time. The decision is **reversible**.

---

## ✅ **Conclusion**

**There is no wrong answer.** Both options are valid:

- **Option A** = Long-term thinking, consistency, scalability
- **Option B** = Short-term pragmatism, simplicity, velocity

Choose based on:
1. Your current priorities (ship fast vs build foundation)
2. Your future plans (multi-client vs single web app)
3. Your team preferences (abstraction vs directness)

**The most important thing**: **Make a decision and document it**. Don't let the unified validation layer sit unused forever while API routes duplicate logic. That's the worst outcome.

---

**Next Step**: Review this framework, answer the 5 questions, and choose Option A, B, or C. Then update ADR-021 with your decision and rationale.
