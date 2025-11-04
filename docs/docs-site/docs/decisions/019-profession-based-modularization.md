---
title: "ADR-019: Profession-Based Application Modularization"
type: "decision"
audience: ["developer", "agent", "product-manager", "designer"]
contexts: ["architecture", "multi-vertical", "professions", "scalability", "validation", "terminology", "onboarding"]
complexity: "advanced"
last_updated: "2025-11-03"
version: "1.0"
status: "proposed"
decision_date: "2025-11-03"
agent_roles: ["architecture-developer", "validation-specialist", "onboarding-developer", "ai-prompt-engineer"]
related:
  - decisions/004-no-regrets-architecture-improvements.md
  - decisions/017-chat-first-onboarding-redesign.md
  - decisions/008-ai-agent-strategy.md
dependencies: ["profession-config-system", "terminology-layer", "validation-refactor", "ai-prompt-templates"]
---

# ADR-019: Profession-Based Application Modularization

## Context for LLM Agents

**Scope**: Transform ArqCashflow from architecture-centric application to multi-profession financial management platform supporting architects, doctors, lawyers, and other service professionals with profession-specific terminology, validation rules, and AI behavior.

**Prerequisites**: Understanding of:
- Current validation layer architecture (`lib/validation/`)
- AI agent prompt system (OperationsAgentService, FilterAgentService)
- Onboarding flow structure
- Prisma schema and database architecture
- Service layer patterns

**Key Patterns**:
- **Hybrid approach**: Start simple with hardcoded adaptations, evolve to configuration-driven system
- **Progressive enhancement**: Phase 1 validates demand, Phase 2 extracts patterns, Phase 3 builds scalable architecture
- **Terminology abstraction**: Separate display labels from underlying data model
- **Profession-aware validation**: Context-dependent validation rules based on profession
- **AI prompt templating**: Profession-specific system prompts and entity descriptions

---

## Status

**Status**: Proposed - Ready for implementation
**Date**: 2025-11-03
**Decision Makers**: Product Team, Engineering Team
**Context**: Doctors expressing interest in ArqCashflow. Need to adapt platform to serve medical professionals while preserving path to multi-vertical expansion.

---

## Context

### Problem Statement

**Current State:**
ArqCashflow is built for architects with:
- Architecture-centric terminology ("Projeto", "Cliente", "Contrato")
- Validation rules assuming project-based work (contract value required)
- AI prompts focused on construction/design projects
- Onboarding flow tailored to architecture spreadsheets

**Opportunity:**
Doctors interested in using platform for financial management, but need:
- Medical terminology ("Paciente" instead of "Projeto")
- Different validation rules (session-based, no fixed contract value)
- AI understanding of medical practice context
- Onboarding adapted to medical spreadsheet formats

**Strategic Question:**
How do we adapt for doctors while preserving scalability for future professions (lawyers, engineers, designers, etc.)?

### Business Context

**Market Opportunity:**
- Doctors: Large market, similar financial management needs
- Service professionals: Lawyers, consultants, therapists share patterns
- Multi-vertical SaaS: 3-5x TAM expansion potential

**Risk Factors:**
- Demand uncertainty: Don't know if doctors will pay/adopt
- Unknown unknowns: May not understand medical profession needs fully
- Development investment: Could be $12-40k depending on approach
- Technical debt: Quick hacks now = maintenance burden later

**Key Constraints:**
- Need fast validation (2-3 weeks to test demand)
- Must preserve scalability (anticipate 3+ professions)
- Cannot break existing architecture users
- Limited development resources

### Current Architecture

**Database Schema** (`prisma/schema.prisma`):
```prisma
model Team {
  id            String    @id @default(cuid())
  name          String
  // ✅ Already exists - unused for architects
  profession    String?   // Will use this!
  contracts     Contract[]
  receivables   Receivable[]
  expenses      Expense[]
}

model Contract {
  id            String    @id @default(cuid())
  clientName    String    // "Cliente" for architects, "Paciente" for doctors
  projectName   String    // "Projeto" for architects, "Paciente" for doctors
  totalValue    Float     // ❌ Required for architects, not applicable for doctors
  signedDate    DateTime  // ❌ Required for architects, optional for doctors
  // ... other fields
}
```

**Validation Layer** (`lib/validation/financial.ts`):
```typescript
export const ContractSchemas = {
  create: z.object({
    clientName: BaseFieldSchemas.name,
    projectName: BaseFieldSchemas.name,
    totalValue: BaseFieldSchemas.amount,    // ❌ Always required
    signedDate: RefinedFieldSchemas.signedDate, // ❌ Always required
    // ...
  })
}
```

**AI Prompts** (`lib/services/OperationsAgentService.ts:273`):
```typescript
return `Você é um assistente financeiro da ArqCashflow...
OPERAÇÕES: Criar, editar ou deletar registros financeiros
   - Contratos (projetos do usuário)        // ❌ Architecture-specific
   - Recebíveis (valores a receber de clientes)
   - Despesas (gastos únicos ou recorrentes)
`
```

**Onboarding Flow** (`app/onboarding/page.tsx:134`):
```typescript
const professionOptions = [
  { label: 'Arquitetura', value: 'arquitetura' },
  { label: 'Engenharia Civil', value: 'engenharia-civil' },
  { label: 'Design de Interiores', value: 'design-interiores' },
  { label: 'Paisagismo', value: 'paisagismo' },
  { label: 'Urbanismo', value: 'urbanismo' },
  { label: 'Outros', value: 'outros' }
]
// ❌ No "Medicina" option
// ❌ Same questions for all professions
// ❌ Same file upload messaging
```

### Requirements

**Functional Requirements - Phase 1 (Doctors MVP):**
1. Medical terminology throughout UI ("Paciente" vs "Projeto")
2. Optional contract value validation (session-based billing)
3. Optional signed date (ongoing relationships)
4. AI prompts understand medical context
5. Onboarding includes "Medicina" option
6. Dashboard metrics use appropriate terminology

**Non-Functional Requirements:**
1. **Fast validation**: Ship MVP in 2-3 weeks
2. **Scalable foundation**: Don't block future professions
3. **Maintainable**: Avoid spaghetti conditional logic
4. **Backwards compatible**: Don't break existing architects
5. **Performance**: No degradation from profession logic

**Future Requirements (Phase 2+):**
1. Support 3+ professions without major refactoring
2. Self-service profession configuration (partners/resellers)
3. Profession-specific features (e.g., medical codes, legal case tracking)
4. Industry-specific templates and suggestions

---

## Decision

### What We Decided

**Adopt a three-phase hybrid approach** that starts with targeted hardcoded adaptations for doctors (Phase 1), extracts patterns into lightweight configuration system (Phase 2), and evolves to full config-driven architecture (Phase 3) once demand is validated and patterns understood.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Doctors MVP (2-3 weeks)                                    │
│ Goal: Validate demand with minimal investment                       │
│                                                                      │
│ Team.profession field → Controls behavior                           │
│ Hardcoded conditionals in isolated locations:                       │
│   • lib/professions/medicina.ts - Doctor-specific helpers           │
│   • lib/professions/terminology.ts - Label mappings                 │
│   • Validation: if (profession === 'medicina') { relax rules }     │
│   • AI prompts: Include profession context in system message        │
│   • Onboarding: Add medicina to profession options                  │
│                                                                      │
│ Trade-off: Technical debt OK for validation phase                   │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
                    [Validate with 5-10 pilot doctors]
                                ↓
                         [Demand validated?]
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Extract Patterns (2-3 weeks)                               │
│ Goal: Build lightweight config system based on learnings            │
│                                                                      │
│ ProfessionConfig interface:                                         │
│   • Terminology mappings (contract → patient)                       │
│   • Validation rule overrides (required → optional)                 │
│   • AI prompt templates                                             │
│   • Onboarding question variants                                    │
│                                                                      │
│ Refactor Phase 1 hardcoded logic → Use configs                     │
│ Add 1-2 test professions (lawyers, engineers)                      │
│                                                                      │
│ Trade-off: Some duplication OK while exploring patterns             │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
                    [Learn from 2-3 profession patterns]
                                ↓
                         [Multi-vertical validated?]
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Full Configuration System (4-6 weeks)                      │
│ Goal: Production-ready multi-profession platform                    │
│                                                                      │
│ Complete config-driven architecture:                                │
│   • Database-stored profession configs                              │
│   • Admin UI for profession management                              │
│   • Partner/reseller customization API                              │
│   • Profession-specific feature flags                               │
│   • Analytics per profession vertical                               │
│                                                                      │
│ Benefits: Unlimited professions, self-service, fully scalable       │
└─────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Doctors MVP - Detailed Implementation

#### 1. Database Schema Changes

**Make profession-specific fields optional:**

```prisma
// prisma/schema.prisma
model Contract {
  id            String    @id @default(cuid())
  clientName    String
  projectName   String    // UI shows "Nome do Paciente" for doctors
  totalValue    Float?    // ✅ Now optional (was Float)
  signedDate    DateTime? // ✅ Now optional (was DateTime)
  // ... rest unchanged
}
```

**Migration strategy:**
- Existing architect contracts keep required fields (backward compatible)
- Doctor contracts can omit these fields
- No data migration needed

#### 2. Profession Helpers (Isolated Files)

**New file: `lib/professions/medicina.ts`**
```typescript
/**
 * Medical profession-specific helpers
 * Phase 1: Hardcoded for doctors
 * Phase 2: Will migrate to config system
 */

export const medicinaProfession = {
  id: 'medicina',
  label: 'Medicina',

  // Validation overrides
  validation: {
    contractValueRequired: false,
    signedDateRequired: false,
    sessionFrequencyTracking: true
  },

  // Terminology mappings
  terminology: {
    contract: 'Paciente',
    contracts: 'Pacientes',
    project: 'Paciente',
    projects: 'Pacientes',
    client: 'Paciente',
    projectName: 'Nome do Paciente',
    totalValue: 'Valor Médio por Sessão',
    signedDate: 'Data da Primeira Consulta'
  },

  // Onboarding customization
  onboarding: {
    hasSpreadsheetQuestion: 'Você controla seus pacientes e consultas em alguma planilha?',
    fileUploadMessage: 'Envie sua(s) planilha(s) de pacientes e consultas'
  }
} as const

export function isMedicalProfession(profession: string | null | undefined): boolean {
  return profession === 'medicina'
}
```

**New file: `lib/professions/terminology.ts`**
```typescript
/**
 * Terminology system for profession-specific labels
 * Phase 1: Switch-based lookup
 * Phase 2: Config-driven
 */

import { medicinaProfession } from './medicina'

export interface ProfessionTerminology {
  contract: string
  contracts: string
  project: string
  projects: string
  client: string
  projectName: string
  totalValue: string
  signedDate: string
}

const defaultTerminology: ProfessionTerminology = {
  contract: 'Contrato',
  contracts: 'Contratos',
  project: 'Projeto',
  projects: 'Projetos',
  client: 'Cliente',
  projectName: 'Nome do Projeto',
  totalValue: 'Valor Total',
  signedDate: 'Data de Assinatura'
}

export function getProfessionTerminology(profession: string | null | undefined): ProfessionTerminology {
  // Phase 1: Hardcoded switch
  if (profession === 'medicina') {
    return medicinaProfession.terminology
  }

  // Default to architecture terminology
  return defaultTerminology
}

// React hook for components
export function useTerminology(profession: string | null | undefined) {
  return getProfessionTerminology(profession)
}
```

**New file: `lib/professions/index.ts`**
```typescript
/**
 * Profession system entry point
 * Central export for all profession-related functionality
 */

export { medicinaProfession, isMedicalProfession } from './medicina'
export { getProfessionTerminology, useTerminology } from './terminology'
export type { ProfessionTerminology } from './terminology'

// Phase 2: Will add
// export { getProfessionConfig } from './config'
// export { ProfessionConfigProvider } from './context'
```

#### 3. Validation Layer Updates

**Modified: `lib/validation/financial.ts`**
```typescript
import { z } from 'zod'
import { BaseFieldSchemas, EnumSchemas, RefinedFieldSchemas } from './schemas'

/**
 * Profession-aware validation schemas
 * Phase 1: Simple function wrapper
 * Phase 2: Config-driven validation builder
 */

// Base schemas remain unchanged for backward compatibility
export const ContractSchemas = {
  // ✅ NEW: Profession-aware create schema
  create: (profession?: string | null) => {
    const baseSchema = z.object({
      clientName: BaseFieldSchemas.name,
      projectName: BaseFieldSchemas.name,
      description: BaseFieldSchemas.description,
      status: EnumSchemas.contractStatus.optional().default('draft'),
      category: BaseFieldSchemas.optionalCategory,
      notes: BaseFieldSchemas.notes,
    })

    // Medical profession: make value and date optional
    if (profession === 'medicina') {
      return baseSchema.extend({
        totalValue: BaseFieldSchemas.amount.optional(),
        signedDate: RefinedFieldSchemas.signedDate.optional(),
      })
    }

    // Default (architecture): require value and date
    return baseSchema.extend({
      totalValue: BaseFieldSchemas.amount,
      signedDate: RefinedFieldSchemas.signedDate,
    })
  },

  // ✅ NEW: Profession-aware update schema
  update: (profession?: string | null) => {
    const baseSchema = z.object({
      clientName: BaseFieldSchemas.name.optional(),
      projectName: BaseFieldSchemas.name.optional(),
      description: BaseFieldSchemas.description,
      status: EnumSchemas.contractStatus.optional(),
      category: BaseFieldSchemas.optionalCategory,
      notes: BaseFieldSchemas.notes,
    })

    // All optional for updates regardless of profession
    return baseSchema.extend({
      totalValue: BaseFieldSchemas.amount.optional(),
      signedDate: RefinedFieldSchemas.signedDate.optional(),
    })
  },

  // Filters and deletion unchanged
  filters: z.object({
    status: EnumSchemas.contractStatus.optional(),
    category: BaseFieldSchemas.shortName.optional(),
    clientName: BaseFieldSchemas.name.optional(),
    projectName: BaseFieldSchemas.name.optional(),
    signedAfter: BaseFieldSchemas.dateString.optional(),
    signedBefore: BaseFieldSchemas.dateString.optional(),
    sortBy: z.enum(['clientName', 'projectName', 'totalValue', 'signedDate', 'createdAt']).optional().default('createdAt'),
    sortOrder: EnumSchemas.sortOrder.optional(),
  }),

  deleteOptions: z.object({
    mode: z.enum(['contract-only', 'contract-and-receivables']).describe('Deletion mode: unlink receivables or delete everything')
  }),

  deletionInfo: z.object({
    canDelete: z.boolean().describe('Whether the contract can be deleted'),
    hasReceivables: z.boolean().describe('Whether the contract has associated receivables'),
    receivablesCount: z.number().min(0).describe('Number of associated receivables'),
    receivables: z.array(z.object({
      id: BaseFieldSchemas.id,
      title: BaseFieldSchemas.name,
      amount: BaseFieldSchemas.amount,
      expectedDate: z.date().describe('Expected date for the receivable')
    })).describe('List of receivables that would be affected')
  }),
}

// Backward compatibility: Export non-function version for existing code
export const LegacyContractSchemas = {
  create: ContractSchemas.create(),
  update: ContractSchemas.update(),
  filters: ContractSchemas.filters,
  deleteOptions: ContractSchemas.deleteOptions,
  deletionInfo: ContractSchemas.deletionInfo,
}
```

**Service layer integration:**
```typescript
// lib/services/ContractService.ts
async create(data: any): Promise<Contract> {
  // Get team to determine profession
  const team = await this.getTeam()

  // ✅ Use profession-aware validation
  const validatedData = ContractSchemas.create(team.profession).parse(data)

  // Rest of create logic...
}
```

#### 4. AI Prompt Adaptation

**Modified: `lib/services/OperationsAgentService.ts`**
```typescript
import { getProfessionTerminology } from '@/lib/professions'

private buildSystemPrompt(today: string): string {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const teamId = this.context.teamId

  // ✅ Get team profession for terminology
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { profession: true }
  })

  const terminology = getProfessionTerminology(team?.profession)

  // ✅ Profession-aware system prompt
  return `Você é um assistente financeiro da ArqCashflow com acesso ao database e APIs do sistema.
Seu objetivo é ajudar o usuário a gerenciar suas finanças de forma amigável, objetiva e precisa.

CONTEXTO ATUAL:
- Data de hoje: ${today}
- Team ID: ${teamId}
- Área de atuação: ${team?.profession || 'arquitetura'}
- Moeda: Real brasileiro (R$)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAPACIDADES:

Você pode atender dois tipos de solicitação:

1. CONSULTAS: Responder perguntas sobre o negócio do usuário
   - "Quanto gastei em setembro?"
   - "Quais ${terminology.contracts.toLowerCase()} estão ativos?"
   - "Qual o total a receber este mês?"

2. OPERAÇÕES: Criar, editar ou deletar registros financeiros
   - ${terminology.contracts} (${terminology.projects.toLowerCase()} do usuário)
   - Recebíveis (valores a receber de ${terminology.client.toLowerCase()}s)
   - Despesas (gastos únicos ou recorrentes)

${team?.profession === 'medicina' ? `
IMPORTANTE: Para profissionais de medicina:
- ${terminology.contracts} podem não ter valor fixo (sessões com valor variável)
- Foque em registrar sessões/consultas como recebíveis individuais
- A data de início pode ser mais relevante que um "contrato" formal
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...
`
}
```

#### 5. Onboarding Updates

**Modified: `app/onboarding/page.tsx`**
```typescript
// Add medicina to profession options
const professionOptions = [
  { label: 'Arquitetura', value: 'arquitetura' },
  { label: 'Engenharia Civil', value: 'engenharia-civil' },
  { label: 'Design de Interiores', value: 'design-interiores' },
  { label: 'Paisagismo', value: 'paisagismo' },
  { label: 'Urbanismo', value: 'urbanismo' },
  { label: 'Medicina', value: 'medicina' },        // ✅ NEW
  { label: 'Outros', value: 'outros' }
]

// Profession-aware file upload question
const getFileUploadQuestion = (profession: string) => {
  if (profession === 'medicina') {
    return 'Você controla seus pacientes e consultas em alguma planilha?'
  }
  return 'Tem alguma planilha onde controla seus projetos?'
}

// Usage in component
setChatMessages(prev => [...prev, {
  role: 'assistant',
  content: getFileUploadQuestion(profileData.profession || 'arquitetura')
}])
```

#### 6. UI Component Updates

**Pattern: Terminology Hook in Components**

```typescript
// app/components/forms/ContractForm.tsx
import { useTerminology } from '@/lib/professions'

export default function ContractForm({ team }: { team: Team }) {
  const t = useTerminology(team.profession)

  return (
    <form>
      <label>{t.projectName}</label>  {/* "Nome do Paciente" for doctors */}
      <input name="projectName" />

      <label>{t.totalValue}</label>   {/* "Valor Médio por Sessão" for doctors */}
      <input name="totalValue" type="number" required={team.profession !== 'medicina'} />

      {/* ... rest of form */}
    </form>
  )
}
```

**Dashboard terminology:**
```typescript
// app/page.tsx
import { useTerminology } from '@/lib/professions'

export default function Dashboard({ team }: { team: Team }) {
  const t = useTerminology(team.profession)

  return (
    <>
      <h2>{t.contracts} Ativos</h2>  {/* "Pacientes Ativos" for doctors */}
      <MetricCard
        label={`Total de ${t.contracts}`}
        value={contractCount}
      />
    </>
  )
}
```

### Phase 2: Pattern Extraction (After Validation)

**When**: After 5-10 doctors successfully use MVP for 2+ weeks

**Goals**:
1. Identify common abstraction patterns
2. Build lightweight config interface
3. Refactor Phase 1 hardcoded logic
4. Add 1-2 additional test professions

**Config Interface Design:**
```typescript
// lib/professions/config.ts
export interface ProfessionConfig {
  id: string
  label: string

  terminology: {
    contract: string
    contracts: string
    project: string
    projects: string
    client: string
    projectName: string
    totalValue: string
    signedDate: string
    // ... extensible for profession-specific terms
  }

  validation: {
    contractValueRequired: boolean
    signedDateRequired: boolean
    customRules?: Record<string, z.ZodType>
  }

  ai: {
    systemContextAddition: string  // Added to base system prompt
    entityDescriptions: {
      contracts: string
      receivables: string
      expenses: string
    }
  }

  onboarding: {
    fileUploadQuestion: string
    specificQuestions?: OnboardingQuestion[]
  }

  features?: {
    sessionTracking?: boolean
    caseManagement?: boolean
    // ... profession-specific features
  }
}

// Profession registry
export const professionConfigs: Record<string, ProfessionConfig> = {
  arquitetura: { /* ... */ },
  medicina: { /* ... */ },
  advocacia: { /* ... */ },  // Add lawyers in Phase 2
}

export function getProfessionConfig(profession: string): ProfessionConfig {
  return professionConfigs[profession] || professionConfigs.arquitetura
}
```

### Phase 3: Full Configuration System (Future)

**When**: After validating 3+ profession verticals

**Features**:
- Database-stored configs (not hardcoded)
- Admin UI for profession management
- A/B testing different configs per profession
- Partner API for custom profession creation
- Analytics dashboards per profession vertical
- Profession-specific feature flags

**Not detailed in this ADR** - will be covered in future ADR when ready

---

## Rationale

### Why Hybrid Approach?

**1. Validates Demand Before Heavy Investment**
- Phase 1: 2 weeks → test with doctors → learn
- Avoid $40k investment if doctors don't adopt
- Real usage data > assumptions

**2. Learn Before Abstracting**
- Don't know what doctors need yet
- Phase 1 hardcoding reveals patterns
- "Make it work, make it right, make it fast"

**3. Preserves Scalability Path**
- Phase 1 isolated in specific files (easy to refactor)
- Phase 2 builds on learnings (not blind guessing)
- Phase 3 only happens if multi-vertical proves valuable

**4. Manages Technical Debt Intentionally**
- Accepting Phase 1 debt with clear Phase 2 payoff plan
- Alternative: Over-engineer now for uncertain future
- Better: Ship, learn, iterate

### Why Not Pure Configuration System Immediately?

**Premature abstraction risks:**
- 4-6 weeks upfront before validating demand
- May build wrong abstractions (don't understand patterns yet)
- Over-engineered for possibly single profession expansion
- Higher cost with no guarantee of ROI

**Joel Spolsky's Law**: "Good abstractions come from looking at multiple concrete implementations"
- Need 2-3 professions working before extracting perfect config schema
- Phase 1 + Phase 2 gives us that experience

### Why Not Quick Hardcoded Hack Forever?

**Technical debt compounds:**
- 3rd profession with hardcoded conditionals = unmaintainable
- Code scattered across 50+ files
- Every new feature requires profession conditionals
- Bug risk increases exponentially

**Phase 2 prevents this** by refactoring before debt becomes crushing

---

## Alternatives Considered

### Alternative 1: Full Configuration System Immediately

**Approach**: Build complete config-driven system from day 1

**Pros**:
- Clean architecture immediately
- Easy to add unlimited professions
- No technical debt
- Professional/scalable from start

**Cons**:
- 4-6 weeks development time
- High upfront cost ($25-40k)
- Risk of wrong abstractions (don't understand patterns yet)
- Over-engineered if doctors don't adopt
- Violates YAGNI principle

**Why Not Chosen**: Too much investment before demand validation

---

### Alternative 2: Complete Separate Application

**Approach**: Build "MedCashflow" as separate codebase

**Pros**:
- No risk to existing platform
- Medical-specific from ground up
- Separate brand positioning
- No compromise on either vertical

**Cons**:
- 10x development cost
- Duplicate code maintenance
- Lost learnings between verticals
- Separate marketing/sales efforts
- Can't share improvements

**Why Not Chosen**: Overkill for validation phase, limits shared value

---

### Alternative 3: Stay Architecture-Only

**Approach**: Don't expand to other professions

**Pros**:
- Zero development cost
- No complexity added
- Focus on core market
- Avoid multi-vertical challenges

**Cons**:
- Miss TAM expansion opportunity (3-5x potential)
- Doctors go to competitors
- Limited growth trajectory
- Single vertical risk

**Why Not Chosen**: Business opportunity too valuable to ignore

---

### Alternative 4: Remove Validation Layer Entirely

**Approach**: Eliminate validation to maximize flexibility

**Pros**:
- Maximum flexibility per profession
- Faster iteration (no schema changes)
- Users define own constraints
- Simple implementation

**Cons**:
- Data quality issues
- Harder debugging
- Less professional feeling
- May need cleanup later
- Security/integrity risks

**Why Not Chosen**: See "Validation Layer Strategy" section below for detailed analysis

---

## Validation Layer Strategy

### The Critical Question

**Should we keep, modify, or remove the validation layer for multi-profession support?**

### Option A: Keep & Adapt Validation Layer (RECOMMENDED)

**Approach**: Profession-aware validation schemas

**Implementation**:
```typescript
ContractSchemas.create(profession)  // Returns appropriate schema
```

**Pros**:
- ✅ Data integrity maintained
- ✅ Clear rules prevent confusion
- ✅ Professional/enterprise quality
- ✅ Catches errors early
- ✅ Type safety benefits preserved

**Cons**:
- ⚠️ Engineering overhead per profession
- ⚠️ May block unknown valid use cases
- ⚠️ Slower iteration (schema changes needed)

**Why Recommended**:
1. **Database constraints still exist** - validation layer makes them explicit
2. **Error messages guide users** - better UX than cryptic DB errors
3. **Type safety benefits** - catch issues at compile time
4. **Minimal complexity** - simple function wrapper adds profession context

---

### Option B: Remove Validation Layer

**Approach**: Let database constraints handle validation

**Implementation**:
```typescript
// Just pass data through to Prisma
await prisma.contract.create({ data })
```

**Pros**:
- ✅ Maximum flexibility
- ✅ Faster iteration
- ✅ Simpler code
- ✅ Learn organically

**Cons**:
- ❌ Poor error messages (database errors are cryptic)
- ❌ No compile-time safety
- ❌ Harder to debug issues
- ❌ Less professional feeling
- ❌ May allow confusing data states

**Why Not Recommended**:
- Trade-off favors speed over quality
- ArqCashflow positioning is professional tool (not scrappy startup)
- Database errors confuse users without validation layer guidance
- Type safety benefits too valuable to lose

---

### Option C: Hybrid Validation (Middle Ground)

**Approach**: Required validations only, warnings for optional

**Implementation**:
```typescript
const result = schema.safeParse(data)
if (!result.success) {
  const critical = filterCriticalErrors(result.error)
  if (critical.length > 0) throw critical

  // Log warnings but continue
  logValidationWarnings(result.error)
}
```

**Pros**:
- ✅ Critical integrity maintained
- ✅ Flexibility for profession differences
- ✅ Learn from warning patterns
- ✅ Progressive tightening possible

**Cons**:
- ⚠️ Complex validation logic
- ⚠️ Warning fatigue risk
- ⚠️ Unclear which errors block vs warn

**Evaluation**: Interesting but over-complex for Phase 1

---

### Decision: Option A (Keep & Adapt)

**Rationale**:

1. **Small Implementation Cost**
   - Simple function wrapper: `ContractSchemas.create(profession)`
   - ~2 hours development time
   - Clear, maintainable pattern

2. **Large User Experience Benefit**
   - Good error messages guide users
   - Type safety catches bugs early
   - Professional quality maintained

3. **Aligns With Product Positioning**
   - ArqCashflow is professional financial tool
   - Quality > Speed for financial data
   - Trust built through reliability

4. **Flexibility Preserved**
   - Profession parameter allows unlimited variations
   - Can relax rules per profession as needed
   - Phase 2 config system makes rules data-driven

**Implementation Pattern**:
```typescript
// Critical validations ALWAYS enforced
BaseFieldSchemas.teamId  // Required - security
BaseFieldSchemas.amount  // Type-safe numbers
BaseFieldSchemas.dateString  // Valid dates

// Profession-specific validations CONTEXTUAL
totalValue: profession === 'medicina'
  ? BaseFieldSchemas.amount.optional()
  : BaseFieldSchemas.amount  // Required for architects
```

---

## Implementation

### Phase 1: Doctors MVP Implementation (2-3 weeks)

#### Week 1: Core Infrastructure

**Day 1-2: Database & Validation**
- [ ] Migrate `totalValue: Float?` and `signedDate: DateTime?`
- [ ] Create `lib/professions/` directory structure
- [ ] Implement `medicina.ts` and `terminology.ts` helpers
- [ ] Update validation layer with profession parameter
- [ ] Test backward compatibility with existing contracts

**Day 3-4: AI Prompts & Services**
- [ ] Update `OperationsAgentService.buildSystemPrompt()`
- [ ] Add profession context to system messages
- [ ] Test AI understanding of medical terminology
- [ ] Update `SetupAssistantService` for medical spreadsheets

**Day 5: Onboarding**
- [ ] Add "Medicina" to profession options
- [ ] Implement profession-aware file upload questions
- [ ] Save profession to Team model on registration
- [ ] Test onboarding flow end-to-end

#### Week 2: UI Components

**Day 6-8: Forms & Terminology**
- [ ] Create `useTerminology()` hook
- [ ] Update `ContractForm.tsx` with terminology
- [ ] Update Dashboard metrics with terminology
- [ ] Update table headers and column labels
- [ ] Update modal titles and buttons

**Day 9-10: Testing & Refinement**
- [ ] Unit tests for profession helpers
- [ ] Integration tests for validation
- [ ] E2E test for doctor onboarding flow
- [ ] Manual testing with 2-3 internal "doctors"
- [ ] Fix bugs and polish UX

#### Week 3: Pilot Launch

**Day 11-13: Documentation & Deployment**
- [ ] Update user documentation for doctors
- [ ] Create doctor-specific onboarding guide
- [ ] Deploy to staging for pilot testing
- [ ] Recruit 5-10 pilot doctors
- [ ] Deploy to production

**Day 14-15: Support & Iteration**
- [ ] Monitor pilot doctor usage
- [ ] Collect feedback and pain points
- [ ] Fix urgent issues
- [ ] Document learnings for Phase 2

### Files to Create (Phase 1)

**New files:**
```
lib/professions/
  ├── index.ts                 # Exports
  ├── medicina.ts              # Doctor-specific config
  └── terminology.ts           # Terminology mappings

prisma/migrations/
  └── XXX_optional_contract_fields.sql  # Make fields optional
```

**Modified files:**
```
lib/validation/financial.ts     # Profession-aware validation
lib/services/OperationsAgentService.ts  # AI prompt updates
lib/services/ContractService.ts  # Use profession-aware validation
app/onboarding/page.tsx         # Add medicina option
app/components/forms/ContractForm.tsx  # Terminology
app/page.tsx                    # Dashboard terminology
prisma/schema.prisma            # Optional fields
```

### Phase 2: Pattern Extraction (2-3 weeks)

**When**: After 5-10 doctors use platform for 2+ weeks

**Tasks**:
1. Analyze learnings from doctor pilot
2. Design `ProfessionConfig` interface
3. Refactor hardcoded logic to use configs
4. Add 1-2 test professions (lawyers, engineers)
5. Validate config pattern works across 3+ professions

### Phase 3: Full System (4-6 weeks)

**When**: After validating 3+ profession verticals successful

**Will be detailed in future ADR**

---

## Migration Strategy

### Rollout Plan

**Weeks 1-2: Internal Testing**
- Team tests as "doctors"
- Iterate on UX and terminology
- Fix critical bugs

**Week 3-4: Pilot Doctors (N=5-10)**
- Recruit through professional networks
- Close support and monitoring
- Weekly feedback sessions
- Rapid iteration on pain points

**Week 5-8: Expanded Beta (N=20-50)**
- Open to more doctors if pilot successful
- Monitor adoption and usage metrics
- Collect data for Phase 2 decisions

**Month 3: Decision Point**
- Evaluate success metrics (below)
- Decide: Scale doctors? Add professions? Iterate?
- Plan Phase 2 if multi-profession validated

### Backward Compatibility

**Existing Architects:**
- ✅ Zero changes - profession defaults to 'arquitetura'
- ✅ All existing validations remain
- ✅ All UI terminology unchanged
- ✅ Database migration adds optional fields (no data change)

**Rollback Plan:**
- Keep feature flag: `ENABLE_MULTI_PROFESSION`
- Can disable for new teams if issues found
- Existing doctor teams continue working
- No data loss - just use default validation

---

## Consequences

### Positive Consequences

**Business:**
- ✅ 3-5x TAM expansion potential
- ✅ Fast validation of doctor market (2-3 weeks)
- ✅ Minimal investment before proof of demand
- ✅ Foundation for multi-vertical strategy
- ✅ Competitive differentiation (if successful)

**Technical:**
- ✅ Clean profession abstraction layer
- ✅ Scalable path to unlimited professions
- ✅ Maintains code quality and type safety
- ✅ Reusable patterns across verticals
- ✅ Validation layer preserved with flexibility

**User Experience:**
- ✅ Doctors see appropriate terminology
- ✅ AI understands medical context
- ✅ Validation matches profession needs
- ✅ Onboarding tailored to medical workflows
- ✅ Professional feeling maintained

### Negative Consequences

**Technical Debt (Phase 1):**
- ⚠️ Hardcoded conditionals in 5-10 files
- ⚠️ Will need refactoring in Phase 2
- ⚠️ Risk of inconsistency if not careful
- **Mitigation**: Isolated in `lib/professions/`, clear refactor plan

**Maintenance:**
- ⚠️ More complexity to maintain
- ⚠️ Testing matrix grows (N professions)
- ⚠️ Documentation needs per-profession sections
- **Mitigation**: Phase 2 config system reduces per-profession code

**Uncertainty:**
- ⚠️ Don't know if doctors will adopt
- ⚠️ May discover unforeseen profession needs
- ⚠️ Could need significant changes in Phase 2
- **Mitigation**: Hybrid approach minimizes waste if pivot needed

### Risks and Mitigation

**Risk 1: Doctors Don't Adopt**
- **Impact**: Wasted 2-3 weeks development
- **Probability**: Medium (30-40%)
- **Mitigation**:
  - Pre-validate with doctor interviews
  - Get 3+ pilot commitments before starting
  - Keep Phase 1 simple (minimize waste)
  - Learn from failure for next vertical

**Risk 2: Phase 1 Technical Debt Grows**
- **Impact**: Hard to refactor, messy codebase
- **Probability**: Low-Medium (20-30%)
- **Mitigation**:
  - Isolate all profession logic in `lib/professions/`
  - Clear TODO comments pointing to Phase 2
  - Code review focus on keeping debt contained
  - Set firm deadline for Phase 2 refactor

**Risk 3: Validation Too Restrictive**
- **Impact**: Blocks valid doctor use cases
- **Probability**: Low (15-20%)
- **Mitigation**:
  - Start with minimal validation for doctors
  - Easy to relax rules (harder to tighten later)
  - Monitor support tickets for validation complaints
  - Add "Override" mechanism if needed

**Risk 4: Terminology Confusing**
- **Impact**: Doctors confused by mixed terminology
- **Probability**: Low (10-15%)
- **Mitigation**:
  - Comprehensive terminology review with doctor
  - User testing before launch
  - Easy to adjust terminology mappings
  - In-app glossary if confusion persists

---

## Validation

### Success Criteria (3 months)

**Quantitative Metrics:**
- ✅ 5+ paying doctor customers
- ✅ Doctor onboarding completion rate ≥ 80%
- ✅ Doctor retention rate ≥ 70% after 30 days
- ✅ Support ticket rate < 2x architect baseline
- ✅ No critical bugs blocking doctor workflows

**Qualitative Metrics:**
- ✅ Doctor feedback sentiment ≥ 75% positive
- ✅ Terminology feels natural (user testing)
- ✅ AI understands medical queries accurately
- ✅ No major profession-specific feature gaps

**Business Metrics:**
- ✅ CAC (Customer Acquisition Cost) < $500 per doctor
- ✅ Break-even on Phase 1 investment (5+ customers)
- ✅ Clear path to 20+ doctors in 6 months

**Technical Metrics:**
- ✅ Zero data corruption incidents
- ✅ Phase 1 code quality maintained (no spaghetti)
- ✅ Performance unchanged for existing architects
- ✅ Test coverage ≥ 80% for profession code

### Go/No-Go Criteria for Phase 2

**GO (Proceed to Phase 2) if:**
- 5+ doctors using successfully for 1+ month
- Clear demand for 1-2 additional professions
- Technical debt manageable (no major issues)
- Business case validated (≥$10k MRR potential)

**NO-GO (Stay Phase 1 or Pivot) if:**
- `<3` doctors adopt after 2 months
- High churn rate (`>50%` drop after 30 days)
- Major unforeseen technical complexity
- Lack of clarity on next profession

**ITERATE (Refine Phase 1) if:**
- Moderate adoption (3-5 doctors)
- Feedback suggests missing features
- Validation rules need adjustment
- More time needed to understand patterns

### Review Schedule

**Weeks 1-4 (Pilot Phase):**
- Weekly sync with pilot doctors
- Daily monitoring of usage and errors
- Rapid iteration on bugs and UX issues

**Month 2-3 (Expansion Phase):**
- Bi-weekly metrics review
- Monthly doctor survey
- Track adoption funnel and churn

**Month 3 (Decision Point):**
- Comprehensive evaluation vs. success criteria
- Go/No-Go decision for Phase 2
- Budget approval for Phase 2 if GO

**Ongoing:**
- Quarterly review of profession verticals
- Annual strategic review of multi-vertical strategy

---

## References

### Related Decisions
- [ADR-004: No-Regrets Architecture Improvements](./004-no-regrets-architecture-improvements.md) - Validation layer foundation
- [ADR-017: Chat-First Onboarding](./017-chat-first-onboarding-redesign.md) - Onboarding profession question
- [ADR-008: AI Agent Strategy](./008-ai-agent-strategy.md) - AI prompt architecture

### Technical Resources
- Stripe Atlas: Multi-vertical platform patterns
- Shopify: Partner customization strategies
- HubSpot: Industry-specific product lines

### Market Research
- TAM analysis: Service professionals (doctors, lawyers, consultants)
- Competitive analysis: Practice management software
- User interviews: 3 doctors, 2 lawyers, 1 consultant

---

## Implementation Tracking

**Status Tracking:**

- [ ] **Phase 1: Doctors MVP** (2-3 weeks)
  - [ ] Week 1: Core infrastructure
    - [ ] Database migration (optional fields)
    - [ ] Profession helpers (`medicina.ts`, `terminology.ts`)
    - [ ] Validation layer updates
    - [ ] AI prompt adaptation
    - [ ] Onboarding profession option
  - [ ] Week 2: UI components
    - [ ] `useTerminology()` hook
    - [ ] ContractForm updates
    - [ ] Dashboard terminology
    - [ ] Testing and refinement
  - [ ] Week 3: Pilot launch
    - [ ] Documentation
    - [ ] Pilot recruitment
    - [ ] Deployment
    - [ ] Monitoring and support

- [ ] **Phase 2: Pattern Extraction** (2-3 weeks)
  - [ ] Analyze doctor pilot learnings
  - [ ] Design ProfessionConfig interface
  - [ ] Refactor hardcoded logic to configs
  - [ ] Add 1-2 test professions
  - [ ] Validate config pattern

- [ ] **Phase 3: Full Configuration System** (4-6 weeks)
  - [ ] Future ADR to be written

**Completion Date**: Not started - awaiting approval

---

**Last Updated**: 2025-11-03
**Version**: 1.0
**Status**: Proposed - Ready for implementation decision

**Decision Summary:**
Adopt three-phase hybrid approach for profession-based modularization. Phase 1 validates doctor demand with minimal hardcoded adaptations (2-3 weeks). Phase 2 extracts patterns into config system after validation (2-3 weeks). Phase 3 builds full scalable architecture if multi-vertical proves valuable (4-6 weeks). Keep profession-aware validation layer for data integrity and professional quality. Total investment: 2-3 weeks for validation, 6-12 weeks total if successful.

*This ADR establishes the strategic approach for transforming ArqCashflow from single-profession platform to multi-vertical financial management system, balancing speed of validation with long-term scalability.*
