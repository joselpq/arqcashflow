---
title: "Validation Layer Context for LLM Agents"
type: "context"
audience: ["agent", "developer"]
contexts: ["validation", "schemas", "unified-validation", "zod", "type-safety", "cuid-validation", "id-format-validation"]
complexity: "intermediate"
last_updated: "2025-09-26"
version: "1.0"
agent_roles: ["validation-architect", "api-developer", "schema-maintainer"]
related:
  - decisions/004-no-regrets-architecture-improvements.md
  - agents/patterns/error-handling.md
  - developer/architecture/overview.md
dependencies: ["zod", "typescript", "unified-validation-layer", "cuid", "base-field-schemas"]
---

# Validation Layer Context for LLM Agents

## Context for LLM Agents

**Scope**: Complete validation schema centralization and standardization across ArqCashflow
**Prerequisites**: Understanding of Zod validation library, TypeScript, and financial data validation requirements
**Key Patterns**:
- Centralized schema definitions in `lib/validation/`
- Reusable field validation with business rule enforcement
- Consistent error handling and type inference
- Financial precision validation (precision bug prevention)

## 🎯 Primary Agent Directive

**CRITICAL**: When working with any data validation, schemas, or form validation:

1. **ALWAYS check `lib/validation/` first** before creating new validation schemas
2. **NEVER create inline Zod schemas** when equivalent exists in unified layer
3. **USE existing BaseFieldSchemas** for common field types
4. **IMPORT from `@/lib/validation`** instead of importing `z` from `zod` directly

## 📁 Unified Validation Structure

```
lib/validation/
├── index.ts          # Main exports, utilities, error handling
├── schemas.ts        # BaseFieldSchemas, EnumSchemas, common patterns
├── financial.ts      # Business entity schemas (contracts, receivables, expenses)
├── api.ts           # API-specific schemas (auth, queries, responses)
└── README.md        # Comprehensive documentation
```

## 🔧 Common Agent Tasks & Patterns

### Task: "Add validation to new API endpoint"

**❌ Old Pattern (Don't Do)**:
```typescript
import { z } from 'zod'

const MySchema = z.object({
  amount: z.number().positive(),
  email: z.string().email(),
  status: z.enum(['active', 'inactive'])
})
```

**✅ New Pattern (Correct)**:
```typescript
import { BaseFieldSchemas, EnumSchemas } from '@/lib/validation'

const MySchema = z.object({
  amount: BaseFieldSchemas.amount,  // Includes precision validation
  email: BaseFieldSchemas.email,   // Includes trimming and lowercasing
  status: EnumSchemas.contractStatus  // Standardized enum
})
```

### Task: "Create form validation"

**✅ Correct Approach**:
```typescript
import { ContractSchema, ValidationError } from '@/lib/validation'

// For new entities, extend existing schemas
const MyFormSchema = ContractSchema.pick({
  clientName: true,
  projectName: true,
  totalValue: true
}).extend({
  additionalField: BaseFieldSchemas.description
})
```

### Task: "Handle validation errors"

**✅ Standardized Error Handling**:
```typescript
import { ValidationError } from '@/lib/validation'

try {
  const validData = schema.parse(inputData)
} catch (error) {
  if (ValidationError.isZodError(error)) {
    const formatted = ValidationError.formatZodError(error)
    return NextResponse.json({
      success: false,
      error: formatted
    }, { status: 400 })
  }
}
```

## 📋 Available Schema Categories

### 1. Base Field Schemas (`BaseFieldSchemas`)
Use these for common field validation:

```typescript
import { BaseFieldSchemas } from '@/lib/validation'

BaseFieldSchemas.amount          // Financial amounts (precision handling)
BaseFieldSchemas.email           // Email with normalization
BaseFieldSchemas.name            // Names with length limits
BaseFieldSchemas.description     // Optional descriptions
BaseFieldSchemas.dateString      // Date validation (YYYY-MM-DD)
BaseFieldSchemas.url             // URL validation
BaseFieldSchemas.invoiceNumber   // Invoice/reference numbers

// ✅ CUID ID Validation (Updated 2025-09-26)
BaseFieldSchemas.id              // CUID format (25 chars, /^c[a-z0-9]{24}$/)
BaseFieldSchemas.teamId          // Team CUID validation
BaseFieldSchemas.userId          // User CUID validation
BaseFieldSchemas.contractId      // Contract CUID validation (optional/nullable)
```

### 2. Enum Schemas (`EnumSchemas`)
Use standardized enums:

```typescript
import { EnumSchemas } from '@/lib/validation'

EnumSchemas.contractStatus       // 'draft' | 'active' | 'completed' | 'cancelled'
EnumSchemas.paymentStatus        // 'pending' | 'paid' | 'overdue' | 'cancelled'
EnumSchemas.expenseType          // 'operational' | 'project' | 'administrative'
EnumSchemas.frequency            // 'weekly' | 'monthly' | 'quarterly' | 'annual'
```

### 3. Financial Entity Schemas
Use complete business entity validation:

```typescript
import {
  ContractSchema,
  ReceivableSchema,
  ExpenseSchema
} from '@/lib/validation'

// Full entity validation with business rules
const contract = ContractSchema.parse(data)
```

### 4. API Schemas
For API-specific validation:

```typescript
import { AuthSchemas, QuerySchemas } from '@/lib/validation'

AuthSchemas.login                // Login validation
QuerySchemas.pagination          // Pagination parameters
```

## 🚨 Critical Validation Rules

### Financial Precision Prevention
```typescript
// ❌ Wrong: Allows precision bugs
z.number().positive()

// ✅ Correct: Prevents precision issues
BaseFieldSchemas.amount  // Max 2 decimals, positive, reasonable limits
```

### Business Rule Enforcement
```typescript
import { BusinessRuleValidation } from '@/lib/validation'

// Validate business rules beyond schema
const isValidPayment = BusinessRuleValidation.validateReceivedAmount(
  expectedAmount,
  receivedAmount
)
```

### Type Safety
```typescript
import type { ContractCreateData } from '@/lib/validation'

// Use inferred types from schemas
function processContract(data: ContractCreateData) {
  // TypeScript knows exact structure
}
```

## 🔍 Discovery Patterns for Agents

### Before Creating New Validation:
1. **Search existing schemas**: `grep -r "z.object" lib/validation/`
2. **Check similar entities**: Look at related business objects
3. **Review field patterns**: Use `BaseFieldSchemas` for common fields
4. **Consult documentation**: Read `lib/validation/README.md`

### Schema Extension Pattern:
```typescript
// Extend existing schemas instead of creating from scratch
const ExtendedSchema = ContractSchema.extend({
  customField: BaseFieldSchemas.description
})

// Or pick specific fields
const PartialSchema = ContractSchema.pick({
  clientName: true,
  totalValue: true
})
```

## 📊 Validation Layer Benefits

### For Current System:
- **Consistency**: Standardized validation across all entities
- **Type Safety**: Automatic TypeScript type inference
- **Error Handling**: Unified error formatting
- **Business Rules**: Built-in financial validation logic

### For Future AI Integration:
- **Clear Data Structures**: AI knows exact validation rules
- **Consistent Processing**: Same validation for UI and AI workflows
- **Business Logic**: AI respects financial precision requirements
- **Type Definitions**: AI can generate properly typed responses

## ⚠️ Common Pitfalls to Avoid

### 1. Creating Duplicate Validation
```typescript
// ❌ Don't do this if BaseFieldSchemas.amount exists
const amount = z.number().positive()

// ✅ Do this instead
const amount = BaseFieldSchemas.amount
```

### 2. Ignoring Business Rules
```typescript
// ❌ Basic validation only
z.number()

// ✅ Include business rules
BaseFieldSchemas.amount  // Includes precision, limits, positive validation
```

### 3. Inconsistent Error Handling
```typescript
// ❌ Custom error format
return { error: "Validation failed" }

// ✅ Standardized error format
return ValidationError.formatZodError(error)
```

## 🎯 Success Criteria for Agents

An LLM agent successfully uses the validation layer when:

1. **Zero new inline schemas** created when equivalent exists
2. **Consistent error formatting** using ValidationError utilities
3. **Proper type inference** using schema-derived types
4. **Business rule compliance** using appropriate BaseFieldSchemas
5. **Schema reuse** through extension rather than duplication

## 📚 Quick Reference Links

- **Main Implementation**: `lib/validation/index.ts`
- **Field Schemas**: `lib/validation/schemas.ts`
- **Business Entities**: `lib/validation/financial.ts`
- **API Validation**: `lib/validation/api.ts`
- **Documentation**: `lib/validation/README.md`
- **Architecture Decision**: `docs/decisions/004-no-regrets-architecture-improvements.md`

---

*This validation layer ensures consistency, type safety, and business rule enforcement across all ArqCashflow validation needs, supporting both current operations and future AI integration.*