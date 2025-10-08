---
title: "Dashboard Strategy: Financial Intelligence & Daily Decision Support"
type: "decision"
audience: ["developer", "agent", "product", "designer"]
contexts: ["dashboard", "metrics", "kpis", "financial-intelligence", "user-experience", "business-insights", "cash-flow", "architecture", "recurring-expenses"]
complexity: "intermediate"
last_updated: "2025-10-07"
version: "1.3"
status: "phase-1-complete-ai-tab-complete-recurring-expenses-complete"
decision_date: "2025-10-04"
phase_1_completed: "2025-10-04"
ai_tab_completed: "2025-10-06"
recurring_expenses_completed: "2025-10-07"
agent_roles: ["dashboard-developer", "metrics-specialist", "ux-designer"]
related:
  - decisions/008-ai-agent-strategy.md
  - decisions/006-service-layer-migration-plan.md
  - decisions/003-strategic-architecture-evolution.md
dependencies: ["service-layer", "dashboard-api", "business-metrics-service", "recurring-expenses-service"]
---

# ADR-014: Dashboard Strategy & Financial Metrics System

## Context for LLM Agents

**Scope**: Comprehensive dashboard evolution strategy for ArqCashflow, defining key financial metrics, UX patterns, and scalable architecture for business intelligence

**Prerequisites**: Understanding of:
- Architecture firm financial pain points (cash flow, profitability, collections)
- Current dashboard implementation (`app/page.tsx`)
- Service layer patterns
- Business metrics requirements

**Key Patterns**:
- Separation of daily vs periodic metrics
- Scalable business metrics service (reusable across dashboard, AI agents, reports)
- Progressive disclosure of complexity
- Actionable insights over raw data

---

## Problem Statement

### Current State (2025-10-04)

The current dashboard (`app/page.tsx`) provides basic financial visibility:

**✅ Working Well**:
- Health indicator (good/warning/critical status)
- Monthly metrics (revenue, expenses, profit, active contracts)
- Pending amounts (receivables, expenses)
- Overdue alerts with action buttons
- Upcoming receivables and expenses
- 6-month trend chart
- Quick action links

**❌ Critical Gaps** (Based on Architecture Firm Research):

| Architect Pain Point | Current Dashboard | Industry Need |
|---------------------|-------------------|---------------|
| **Cash flow forecasting** | ❌ Missing | 30/60/90 day projections |
| **Project profitability** | ❌ Missing | Per-project profit margins |
| **Receivables aging** | ⚠️ Basic (overdue only) | 0-30/31-60/61-90/90+ aging buckets |
| **Expense categorization** | ❌ Missing | Spending breakdown by category |
| **Client revenue analysis** | ❌ Missing | Top clients, concentration risk |
| **Overhead monitoring** | ❌ Missing | Target: 150-175% of labor |
| **Days Sales Outstanding** | ❌ Missing | Average collection time |

### Research Findings (Industry Data 2024-2025)

**Top 3 Architect Concerns**:
1. **Increasing revenue** (30.3% of firms) → Need: Project profitability visibility
2. **Managing rising costs** (21.8%) → Need: Expense tracking & categorization
3. **Negotiating fees** (20.1%) → Need: Understand true cost of business

**Cash Flow Crisis**:
- **82% of businesses fail due to cash flow problems**
- Average collection period: **81 days** (2.7 months!)
- Project-based payments = irregular cash flow
- Architects need **predictive visibility**, not just historical data

**Daily Questions Architects Ask**:
- "Do I have enough cash to pay bills this month?"
- "When will clients actually pay me?"
- "Which projects are profitable vs losing money?"
- "Who owes me money and for how long?"
- "Can I afford this new expense?"
- "Are my costs out of control?"

---

## Decision: Phased Dashboard Evolution

### Design Philosophy

**1. Separation of Concerns**: Daily vs Periodic Metrics

```
┌─────────────────────────────────────────────────────────┐
│  DAILY DASHBOARD (Default View)                         │
│  - Cash flow health                                     │
│  - Urgent actions (overdue items, cash gaps)            │
│  - This month's cash reality                            │
│  - Quick actions                                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ANALYTICS (Separate Page/Modal)                        │
│  - 6-month trends                                       │
│  - Project profitability deep-dive                      │
│  - Client revenue analysis                              │
│  - Expense category breakdown                           │
│  - Cash flow projections (30/60/90 days)               │
└─────────────────────────────────────────────────────────┘
```

**Rationale**:
- Architects open dashboard **multiple times per day** → need speed and focus
- Trend analysis is **weekly/monthly** activity → separate to avoid clutter
- Modal/separate page allows richer visualizations without overwhelming main view

**2. Actionable Intelligence over Raw Data**

❌ **Bad**: "Total overdue: R$ 45.000"
✅ **Good**: "R$ 20.000 overdue 90+ days → Priority: Chase João Silva (R$ 12k)"

**Rationale**:
- Architects need to **act**, not just **know**
- Every metric should answer "What should I do?"

**3. Scalable Metrics Architecture**

```typescript
// Reusable across dashboard, AI agents, exports
class BusinessMetricsService extends BaseService {
  async calculateCashFlowForecast(days: 30 | 60 | 90)
  async getReceivablesAging()
  async getProjectProfitability()
  async getExpenseBreakdown()
  // ... 10+ metrics
}

// Usage in Dashboard
const metrics = new BusinessMetricsService(context)
const aging = await metrics.getReceivablesAging()

// Usage in Financial Query Agent
"Quais recebíveis estão atrasados há mais de 90 dias?"
→ Agent calls metrics.getReceivablesAging()

// Usage in Operations Agent (future)
"This R$10k expense will create a cash gap in 60 days - recommend delaying"
→ Agent calls metrics.calculateCashFlowForecast(60)
```

**Rationale**:
- Don't duplicate metric logic across dashboard, agents, reports
- Single source of truth for business calculations
- AI agents can provide intelligent recommendations based on metrics

---

## Short-Term Tactical Improvements (Parallel Track)

While planning dashboard Phases 2-4, several immediate UI/UX improvements have been identified across the application. These are quick wins that improve clarity and user experience without architectural changes.

### **Assistente IA Tab Improvements** ✅ COMPLETE (2025-10-06)

**Context**: The AI assistant interface has evolved since initial implementation. The unified agent (Arnaldo) now handles all operations, making separate tabs redundant. Simplified and humanized the interface for non-technical users.

**Issues Identified**:
1. ❌ ~~Three separate tabs (Chat Inteligente, Comandos, IA Unificado) - confusing and redundant~~
2. ❌ ~~Generic name "IA Unificado" - impersonal, doesn't build user connection~~
3. ❌ ~~Technical messaging with colors/buttons - intimidating for non-technical users~~
4. ❌ ~~Setup Assistant mentions "multi-arquivo" - should be expected behavior, not a feature callout~~
5. ❌ ~~"Voltar ao início" button - wastes valuable screen space~~
6. ❌ ~~Page title "Assistente IA" - unnecessary vertical space usage~~

**Implemented Changes**:

#### **1. Removed Page Title** ✅
**Action**: Delete "🤖 Assistente IA" h1 header
- **Result**: Saves ~80px vertical space, tabs are self-explanatory
- **Files**: `app/ai-chat/enhanced-page.tsx:127`

#### **2. Consolidated Tabs** ✅
**Action**: Removed "Chat Inteligente" and "Comandos" tabs
- **Before**: 4 tabs (Chat Inteligente | Comandos | IA Unificado | Configuração Rápida)
- **After**: 2 tabs (🤖 Arnaldo AI | 📊 Configuração Rápida)
- **Result**: 50% reduction in navigation complexity
- **Files**: `app/ai-chat/enhanced-page.tsx`

#### **3. Humanized Agent Name** ✅
**Action**: Renamed "IA Unificado" → "🤖 Arnaldo AI"
- **Tab label**: "🤖 Arnaldo AI" (clear it's AI, but friendly)
- **Greeting**: "Olá, sou Arnaldo, seu assistente financeiro 👋"
- **Rationale**: Personal name builds trust; emoji adds warmth
- **Files**: `app/ai-chat/enhanced-page.tsx:139-160`

#### **4. Simplified Messaging with Examples** ✅
**Action**: Replaced technical info box with compact, friendly blue box

**Final Implementation** (After user feedback refinement):
```
┌──────────────────────────────────────────────────────────┐
│ Olá, sou Arnaldo, seu assistente financeiro 👋          │
│                                                          │
│ Faça perguntas sobre suas finanças ("Quanto faturei    │
│ em setembro?"), adicione novos projetos, despesas e     │
│ recebíveis ("recebi 500 reais do projeto João e Maria", │
│ "salário Pedro R$5k todo dia 5") ou atualize/delete-os  │
│ ("aumentar o salário do Pedro para 5500 a partir de     │
│ Janeiro").                                               │
└──────────────────────────────────────────────────────────┘
```

**Key Features**:
- ✅ Greeting gets special attention (separate line with emoji)
- ✅ Comprehensive CRUD examples with realistic scenarios
- ✅ Natural language inline examples (not bullet points)
- ✅ Compact: 2 lines vs 10+ lines in original design
- ✅ Blue bg-blue-50 box (engaging, consistent with brand)

**Empty Chat State**:
- Before: "👋 Olá! Como posso ajudá-lo hoje? Converse naturalmente comigo..."
- After: "Converse naturalmente comigo sobre suas finanças. Posso responder perguntas ou fazer ações por você."
- More concise and direct

#### **5. Simplified Setup Assistant** ✅
**Action**: Streamlined Configuração Rápida messaging

**Final Implementation**:
```
┌──────────────────────────────────────────────────────────┐
│ Importação rápida de dados. Envie seus arquivos Excel, │
│ CSV ou PDF com contratos, despesas ou recebíveis.      │
│ Vamos ler e registrar tudo automaticamente para você.   │
│ Leva alguns segundos ou minutos dependendo do tamanho   │
│ do arquivo.                                              │
└──────────────────────────────────────────────────────────┘
```

**Key Changes**:
- ✅ Blue bg-blue-50 box (consistent, engaging)
- ✅ Removed redundant "multi-arquivo" info box from component
- ✅ Time expectation: "alguns segundos ou minutos dependendo do tamanho" (accurate)
- ✅ Changed "e" → "ou" (despesas ou recebíveis - clearer)
- ✅ Removed legacy blue box from `MultiFileSetupAssistant.tsx` (no duplication)

#### **6. Removed "Voltar ao início" Button** ✅
**Action**: Deleted unnecessary navigation button
- **Result**: Input field now full width, cleaner interface
- **Files**: `app/ai-chat/enhanced-page.tsx:126`

---

#### **Implementation Results** ✅

**Completion Date**: 2025-10-06
**Time**: ~1 hour (faster than 2-3h estimate)
**Risk**: LOW ✅ - No issues encountered

**Code Impact**:
- `app/ai-chat/enhanced-page.tsx`: 1,196 → 236 lines (**80% reduction**)
- `app/components/setup-assistant/MultiFileSetupAssistant.tsx`: Removed legacy info box
- Build: ✅ Successful, zero errors

**Testing Results**:
- ✅ Only 2 tabs visible (🤖 Arnaldo AI | 📊 Configuração Rápida)
- ✅ Tab labels updated with friendly emoji
- ✅ Greeting gets prominence ("Olá, sou Arnaldo, seu assistente financeiro 👋")
- ✅ Comprehensive CRUD examples inline (not bullet points)
- ✅ Setup Assistant: accurate time estimate, blue box consistency
- ✅ No page title (saved ~80px vertical space)
- ✅ No "Voltar ao início" button (full-width input)
- ✅ Mobile responsive, compact messaging

**UX Improvements Achieved**:
- **Space efficiency**: ~270px vertical space saved
- **Navigation clarity**: 50% fewer tabs (4 → 2)
- **Approachability**: Personal name "Arnaldo AI" vs generic "IA Unificado"
- **Comprehension**: Realistic inline examples vs technical explanations
- **Consistency**: Blue boxes on both tabs (brand-aligned, engaging)
- **Accuracy**: Time expectation reflects reality ("segundos ou minutos dependendo do tamanho")

**User Feedback Integration** (Iterative refinement):
1. ✅ Greeting separated to own line for visual impact
2. ✅ Added variety: CRUD examples (create, update, delete)
3. ✅ Time accuracy: Reflects file size dependency
4. ✅ Visual consistency: All info boxes use blue theme
5. ✅ No duplication: Removed redundant box from component

---

### **Projetos Tab Restructuring** ✅ COMPLETE (2025-10-06)

**Context**: The current tab structure had "Projetos" as a parent with sub-tabs (Contratos, Recebíveis, Despesas). This created unnecessary nesting and didn't reflect that "Contratos" IS projects. Implemented flattened hierarchy and configurable business terminology.

**Issues Resolved**:
1. ✅ ~~Confusing hierarchy - "Projetos" with "Contratos" subtab (they're the same thing)~~
2. ✅ ~~Filters and search take too much vertical space (especially on smaller screens)~~
3. ✅ ~~Hard-coded "Projetos" terminology - doesn't fit all business types (doctors, construction, etc.)~~

**Implemented Changes**:

#### **1. Flattened Tab Hierarchy** ✅
**Action**: Promoted sub-tabs to main navigation

**Before** (Nested):
```
[Dashboard] [Projetos ▼] [Assistente IA]
              ↓
            [Contratos | Recebíveis | Despesas]
```

**After** (Flat):
```
[Dashboard] [📋 Projetos] [💰 Recebíveis] [💸 Despesas] [🤖 Assistente IA]
```

**Implementation**:
- ✅ Updated `app/components/NavBar.tsx` with 5 flat tabs
- ✅ Created `/recebiveis` route (alias to `/receivables`)
- ✅ Created `/despesas` route (alias to `/expenses`)
- ✅ Updated `/projetos` to show contracts directly (removed sub-tab logic)
- ✅ Database/API layer unchanged (`Contract` model, `/api/contracts` routes)
- ✅ Only presentation layer affected

**Results**:
- **Navigation**: One click instead of two (50% faster)
- **Clarity**: No more "Projetos > Contratos" confusion
- **Mobile UX**: No dropdown menus, all tabs visible
- **Mental model**: Each entity is a top-level peer

**Files Changed**:
- `app/components/NavBar.tsx` (navigation items updated)
- `app/projetos/page.tsx` (simplified, direct ContractsTab)
- `app/recebiveis/page.tsx` (new, alias to receivables)
- `app/despesas/page.tsx` (new, alias to expenses)

---

#### **2. Compact Filter Component** ✅
**Action**: Created reusable compact filter component for all list views

**Current Problem**:
```
┌────────────────────────────────────────────────────────────┐
│ [Search: _________________________________]  [🔍 Buscar]   │ ← 60-80px height
├────────────────────────────────────────────────────────────┤
│ Filtros:                                                   │
│ [Status ▼] [Cliente ▼] [Data início] [Data fim] [Limpar] │ ← 60-80px height
├────────────────────────────────────────────────────────────┤
│ [Data table starts here...]                               │
└────────────────────────────────────────────────────────────┘

Total filter height: 120-160px (wastes valuable screen real estate)
```

**Proposed Solution A: Single-Row Compact Filters** (Recommended)
```
┌────────────────────────────────────────────────────────────┐
│ [🔍 Search...] [Status ▼] [Cliente ▼] [📅 Período ▼] [×]  │ ← 40-50px height
├────────────────────────────────────────────────────────────┤
│ [Data table starts here - 70-120px more space!]           │
└────────────────────────────────────────────────────────────┘

Space saved: 70-120px vertical (15-25% more table rows visible)
```

**Key Features**:
- ✅ Search field inline with filters (no separate row)
- ✅ Search icon inside field (no separate button)
- ✅ Compact dropdowns with icons
- ✅ "Período" dropdown combines date range (one field instead of two)
- ✅ Single clear button (×) at end
- ✅ Auto-submit on change (no manual "Buscar" button needed)

**Proposed Solution B: Collapsible Advanced Filters** (Alternative)
```
┌────────────────────────────────────────────────────────────┐
│ [🔍 Search...] [Filtros avançados ▼] [× Limpar]          │ ← 40-50px when collapsed
├────────────────────────────────────────────────────────────┤
│ [Data table - maximum space]                              │
└────────────────────────────────────────────────────────────┘

When expanded:
┌────────────────────────────────────────────────────────────┐
│ [🔍 Search...] [Filtros avançados ▲] [× Limpar]          │
├────────────────────────────────────────────────────────────┤
│ Status: [Todos ▼]  Cliente: [Todos ▼]  Período: [30d ▼] │ ← Only when needed
├────────────────────────────────────────────────────────────┤
│ [Data table]                                              │
└────────────────────────────────────────────────────────────┘
```

**Key Features**:
- ✅ Search always visible (most common action)
- ✅ Filters hidden by default (power users expand when needed)
- ✅ Remembers last filter state
- ✅ Visual indicator when filters active (e.g., badge count)

**Recommendation**: **Solution A** (Single-Row Compact)
- Simpler implementation
- Filters always visible = no hidden functionality
- Better for users who frequently filter
- Architects likely filter by client/status often

**Mobile Responsive Pattern**:
```
Desktop (>768px):
[🔍 Search] [Status ▼] [Cliente ▼] [📅 Período ▼] [×]

Tablet (481-768px):
[🔍 Search________________________] [Filtros ▼] [×]
  ↓ (when expanded)
[Status ▼] [Cliente ▼] [📅 Período ▼]

Mobile (<480px):
[🔍 Search_______________]
[Filtros ▼] [× Limpar]
  ↓ (modal/drawer with filter options)
```

**Apply Pattern To**:
- ✅ Projetos (contracts) tab
- ✅ Recebíveis tab
- ✅ Despesas tab
- ✅ Any future entity tables

**Technical Implementation**:
- Shared filter component (`components/CompactFilters.tsx`)
- Reusable across all entity tabs
- Props: `searchPlaceholder`, `filterOptions`, `onFilterChange`
- State management: URL query params (shareable filtered views)

**Files to Modify**:
- `app/components/CompactFilters.tsx` (new shared component)
- `app/projetos/page.tsx` (use CompactFilters)
- `app/recebíveis/page.tsx` (use CompactFilters)
- `app/despesas/page.tsx` (use CompactFilters)

---

#### **3. Flexible Business Terminology** ✅
**Action**: Made "Projetos" terminology configurable for different industries

**Problem Solved**: Hard-coded "Projetos" didn't fit all users:
- ✅ ~~Doctors need "Pacientes" (patients)~~ → Now configurable
- ✅ ~~Construction companies need "Obras" (construction sites)~~ → Now configurable
- ✅ ~~Consultants might prefer "Clientes" (clients)~~ → Now configurable
- ✅ ~~Event planners might use "Eventos" (events)~~ → Now configurable

**Implementation**: Environment Variable Proof of Concept (Option C) ✅

**Created `lib/terminology.ts`**:
```typescript
// Industry presets
const industryPresets = {
  architecture: { projects: 'Projetos', project: 'Projeto', receivables: 'Recebíveis', expenses: 'Despesas' },
  medical: { projects: 'Pacientes', project: 'Paciente', receivables: 'Honorários', expenses: 'Custos' },
  construction: { projects: 'Obras', project: 'Obra', receivables: 'Recebimentos', expenses: 'Despesas' },
  law: { projects: 'Casos', project: 'Caso', receivables: 'Honorários', expenses: 'Despesas' }
}

// Reads from NEXT_PUBLIC_BUSINESS_TYPE env variable
export const terminology = getBusinessTerminology()
```

**Updated `app/components/NavBar.tsx`**:
```typescript
import { terminology } from "@/lib/terminology"

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/projetos", label: `📋 ${terminology.projects}` },  // "Projetos" or "Pacientes" etc.
  { href: "/recebiveis", label: `💰 ${terminology.receivables}` },
  { href: "/despesas", label: `💸 ${terminology.expenses}` },
  { href: "/ai-chat", label: "🤖 Assistente IA" }
]
```

**Usage**: Set in `.env`:
```bash
NEXT_PUBLIC_BUSINESS_TYPE=architecture  # Default
# NEXT_PUBLIC_BUSINESS_TYPE=medical     # For doctors
# NEXT_PUBLIC_BUSINESS_TYPE=construction # For construction firms
# NEXT_PUBLIC_BUSINESS_TYPE=law         # For law firms
```

**Results**:
- ✅ Same codebase serves multiple industries
- ✅ Navigation labels automatically adapt
- ✅ Easy to test different industries (change env var)
- ✅ Foundation for future team-level configuration

**Files Created**:
- `lib/terminology.ts` (presets + getter function)

**Files Modified**:
- `app/components/NavBar.tsx` (uses terminology)

**Future Enhancement**: Migrate to Team-Level Configuration (Option A below) for true multi-tenancy

---

#### **Architecture Options for Future** (Reference)

**Option A: Team-Level Configuration** (Recommended for Production)
```typescript
// prisma/schema.prisma
model Team {
  id          String
  name        String
  // ... existing fields

  // New fields for terminology customization
  entityLabels Json? // { "contract": "Projeto", "receivable": "Recebível", ... }
  businessType String? // "architecture" | "medical" | "construction" | "consulting"
}

// Default labels by business type
const BUSINESS_TYPE_LABELS = {
  architecture: {
    contract: { singular: "Projeto", plural: "Projetos" },
    receivable: { singular: "Recebível", plural: "Recebíveis" },
    expense: { singular: "Despesa", plural: "Despesas" }
  },
  medical: {
    contract: { singular: "Paciente", plural: "Pacientes" },
    receivable: { singular: "Recebível", plural: "Recebíveis" },
    expense: { singular: "Despesa", plural: "Despesas" }
  },
  construction: {
    contract: { singular: "Obra", plural: "Obras" },
    receivable: { singular: "Recebível", plural: "Recebíveis" },
    expense: { singular: "Despesa", plural: "Despesas" }
  },
  consulting: {
    contract: { singular: "Cliente", plural: "Clientes" },
    receivable: { singular: "Recebível", plural: "Recebíveis" },
    expense: { singular: "Despesa", plural: "Despesas" }
  }
}
```

**Usage in Components**:
```typescript
// app/hooks/useEntityLabels.ts
export function useEntityLabels() {
  const { team } = useTeam()

  // Get labels from team config or default to architecture
  const businessType = team.businessType || 'architecture'
  const customLabels = team.entityLabels

  return customLabels || BUSINESS_TYPE_LABELS[businessType]
}

// In navigation component
function Navigation() {
  const labels = useEntityLabels()

  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/projetos">{labels.contract.plural}</Link>  // "Projetos" or "Pacientes"
      <Link href="/recebíveis">{labels.receivable.plural}</Link>
      <Link href="/despesas">{labels.expense.plural}</Link>
    </nav>
  )
}
```

**Option B: User Preference** (Future Enhancement)
```typescript
// Each user can override team defaults
model User {
  // ... existing fields
  preferredLabels Json? // Optional override
}
```

**Option C: Environment Variable** (Quick Prototype)
```typescript
// .env
NEXT_PUBLIC_BUSINESS_TYPE=architecture

// lib/constants/labels.ts
export const ENTITY_LABELS = BUSINESS_TYPE_LABELS[
  process.env.NEXT_PUBLIC_BUSINESS_TYPE || 'architecture'
]
```

**Recommendation**: Start with **Option C** (environment variable) for quick testing, migrate to **Option A** (team-level config) for production multi-tenancy.

**Implementation Phases**:

**Phase 1: Proof of Concept** (2-3 hours)
1. Create `lib/constants/entityLabels.ts` with business type presets
2. Create `useEntityLabels()` hook reading from env variable
3. Update navigation to use labels
4. Update 3 main tabs (Projetos, Recebíveis, Despesas) page titles

**Phase 2: Team Configuration** (4-6 hours)
1. Add `businessType` and `entityLabels` to Team schema
2. Create onboarding step: "What type of business are you?"
3. Update `useEntityLabels()` to read from team context
4. Add settings page for label customization

**Phase 3: Full Localization** (8-12 hours)
1. Extend to all UI text (buttons, forms, tooltips)
2. Update AI agent prompts with business-specific terminology
3. Add bulk find-replace for existing data (if needed)

**Files to Modify (Phase 1 - Proof of Concept)**:
- `lib/constants/entityLabels.ts` (new - label presets)
- `lib/hooks/useEntityLabels.ts` (new - hook)
- Navigation component (use hook)
- `app/projetos/page.tsx` (use hook for title/breadcrumbs)
- `app/recebíveis/page.tsx` (use hook)
- `app/despesas/page.tsx` (use hook)

**Benefits**:
- ✅ Better user adoption (speaks their language)
- ✅ Easier onboarding (familiar terminology)
- ✅ Market expansion (serve multiple industries)
- ✅ Professional appearance (not generic software)

**Example Use Cases**:

**Architect** (Default):
```
[Dashboard] [Projetos] [Recebíveis] [Despesas]
             ↓
          "Residência João Silva"
```

**Doctor**:
```
[Dashboard] [Pacientes] [Recebíveis] [Despesas]
             ↓
          "Maria Santos - Tratamento Ortodôntico"
```

**Construction**:
```
[Dashboard] [Obras] [Recebíveis] [Despesas]
             ↓
          "Edifício Comercial - Centro"
```

---

### **Implementation Plan - Projetos Tab Restructuring**

**Effort**: 6-10 hours total
- Tab restructuring: 3-4 hours
- Compact filters: 2-3 hours
- Flexible terminology (Phase 1): 2-3 hours

**Risk**: MEDIUM
- Tab restructuring: Navigation changes affect user muscle memory
- Filter condensing: Must maintain usability while reducing space
- Flexible labels: Text changes throughout UI (easy to miss spots)

**Impact**: HIGH
- Better information architecture
- More screen space for actual data
- Scalable to multiple industries

**Dependencies**:
- None (can be done independently)
- Recommendation: Do in order (1 → 2 → 3)

**Testing Checklist**:
- [ ] All tabs accessible from main navigation
- [ ] No "Projetos" dropdown/nested tabs
- [ ] "Contratos" internally, "Projetos" in UI (or configured label)
- [ ] Filters condensed to single row (or collapsible)
- [ ] Search auto-submits on input
- [ ] Filter changes update table immediately
- [ ] Clear button resets all filters
- [ ] Mobile responsive (stacked or drawer)
- [ ] Business type labels work (if implemented)
- [ ] All entity references use label system

**User Validation**:
- Test with architect: "Where do I find my projects?"
- Test filter discoverability: Can they find status/client filters?
- Test mobile: Filters still accessible and usable?
- Test label change: Switch to "medical" - does it make sense?

---

### **2E: AI Natural Language Filtering** 🚧 IN PROGRESS (2025-10-08)

**Context**: Users need a fast, intuitive way to filter complex data without learning filter syntax or clicking through multiple dropdowns. Natural language filtering powered by AI allows users to type queries like "atrasados do João Silva acima de 10k ordenados por valor" and get instant results.

**Status**: 2C (Compact Filters + [+ Mais] dropdown) ✅ Complete, 2D (Mobile Filter Drawer) ✅ Complete, **2E (AI Filtering) 🚧 In Progress**

**Issues Addressed**:
1. ✅ Complex filtering requires multiple clicks and dropdowns
2. ✅ Boolean logic (OR, AND) not supported in UI
3. ✅ Sorting requires separate interaction
4. ✅ No way to combine multiple conditions efficiently
5. ✅ Power users want faster workflows

**Design Decision: Trust the LLM**

**Core Philosophy**:
- No fuzzy matching, no preprocessing, no custom handlers
- LLM receives database schema + user input → returns Prisma query object
- Direct execution, zero complexity

---

#### **Architecture: Prisma Query Generation**

**Flow**:
```
User Input → FilterAgentService → Claude (with schema context) →
Prisma Query Object → Execute → Return Results
```

**Why Prisma Query Object?**
- ✅ Type-safe (Prisma validates structure)
- ✅ No SQL injection risk
- ✅ Supports OR, AND, NOT natively
- ✅ Direct execution, zero preprocessing
- ✅ LLM is trained on Prisma syntax

**Example Input/Output**:
```typescript
// User: "atrasados do João Silva acima de 10k desc"
{
  where: {
    status: "overdue",
    amount: { gt: 10000 },
    contract: {
      OR: [
        { projectName: { contains: "Silva", mode: "insensitive" } },
        { clientName: { contains: "Silva", mode: "insensitive" } }
      ]
    }
  },
  orderBy: { amount: "desc" },
  interpretation: "Recebíveis atrasados de projetos 'Silva' acima de R$10k, ordenados por valor (maior → menor)"
}
```

---

#### **Implementation Plan**

**Phase 1: Backend Service** (4-6 hours)

**1. Create `lib/services/FilterAgentService.ts`**:
```typescript
interface FilterContext {
  entity: 'contracts' | 'receivables' | 'expenses'
  teamId: string
}

interface FilterResult {
  where: any           // Prisma where clause
  orderBy?: any        // Prisma orderBy clause
  interpretation: string  // Human-readable explanation
}

class FilterAgentService extends BaseService {
  async parseFilter(input: string, context: FilterContext): Promise<FilterResult> {
    const systemPrompt = this.buildSystemPrompt(context)

    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: 'user', content: input }]
    })

    return JSON.parse(response.content[0].text)
  }

  private buildSystemPrompt(context: FilterContext): string {
    return `You are a Prisma query generator for ${context.entity}.

DATABASE SCHEMA:
${this.getPrismaSchema(context.entity)}

CONTEXT:
- Team isolation handled by middleware (don't include teamId)
- Available statuses: ${this.getAvailableStatuses(context.entity)}

EXAMPLES:
[... see examples below ...]

Return ONLY valid JSON with "where", "orderBy" (optional), and "interpretation".`
  }
}
```

**2. Create API Endpoint `/api/filters/ai`**:
```typescript
export async function POST(req: Request) {
  const { input, entity } = await req.json()
  const context = await withTeamContext(req)

  const filterService = new FilterAgentService(context)
  const parsed = await filterService.parseFilter(input, { entity, teamId: context.teamId })

  // Execute Prisma query
  const results = await executeQuery(entity, parsed.where, parsed.orderBy, context)

  return Response.json({
    query: parsed,
    results,
    count: results.length
  })
}

async function executeQuery(entity: string, where: any, orderBy: any, context: TeamContext) {
  const baseWhere = { teamId: context.teamId, ...where }

  switch (entity) {
    case 'receivables':
      return prisma.receivable.findMany({ where: baseWhere, orderBy, include: { contract: true } })
    case 'expenses':
      return prisma.expense.findMany({ where: baseWhere, orderBy })
    case 'contracts':
      return prisma.contract.findMany({ where: baseWhere, orderBy })
  }
}
```

**Phase 2: Frontend Integration** (3-4 hours)

**1. Add to [+ Mais] Dropdown** (Desktop & Mobile):
```tsx
<button
  onClick={() => setAdvancedFilterModalOpen(true)}
  className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-50"
>
  🤖 Filtros Avançados (IA)
</button>
```

**2. Create Modal Component `app/components/AdvancedFilterModal.tsx`**:
```tsx
export function AdvancedFilterModal({ entity, isOpen, onClose, onResultsReceived }: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleFilter = async () => {
    setLoading(true)
    const response = await fetch('/api/filters/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, entity })
    })
    const data = await response.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">🤖 Filtros Avançados com Arnaldo</h2>

        <textarea
          placeholder="Descreva o que você quer filtrar...

Exemplos:
• atrasados do João Silva acima de 10k
• despesas recorrentes OU canceladas nos últimos 30 dias
• contratos finalizados este mês ordenados por valor"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          className="w-full p-3 border rounded-lg mb-4"
        />

        <button onClick={handleFilter} disabled={loading}>
          {loading ? '🔄 Processando...' : '🤖 Filtrar'}
        </button>

        {result && (
          <>
            <div className="p-3 bg-blue-50 rounded-lg mb-4">
              <strong>✓ Interpretado como:</strong><br/>
              {result.query.interpretation}
            </div>

            <div className="p-3 bg-green-50 rounded-lg mb-4">
              <strong>📊 Resultado:</strong> {result.count} item(ns) encontrado(s)
            </div>

            {/* Preview results */}
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {result.results.map((item: any) => (
                <div key={item.id} className="p-3 border-b hover:bg-neutral-50">
                  {/* Item preview */}
                </div>
              ))}
            </div>

            <button onClick={() => {
              onResultsReceived(result.results)
              onClose()
            }}>
              ✓ Usar Estes Resultados
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
```

---

#### **LLM Context: Prisma Schema**

**What to provide to Claude**:
- Full Prisma schema for relevant entity
- Available status/category values
- Relationship structure
- Team isolation note (handled by middleware)

**Example System Prompt**:
```
DATABASE SCHEMA:
model Receivable {
  id            String
  amount        Float
  status        String  // "pending" | "received" | "overdue" | "cancelled"
  expectedDate  DateTime
  receivedDate  DateTime?
  category      String?
  description   String?
  contractId    String
  contract      Contract @relation(...)
  teamId        String
}

model Contract {
  id           String
  projectName  String
  clientName   String
  status       String  // "active" | "completed" | "cancelled"
  totalValue   Float?
  receivables  Receivable[]
  teamId       String
}

EXAMPLES:
User: "atrasados acima de 10k"
Output: {
  where: { status: "overdue", amount: { gt: 10000 } },
  orderBy: { amount: "desc" },
  interpretation: "Recebíveis atrasados acima de R$10.000, ordenados por valor"
}

User: "recebíveis do João Silva nos últimos 30 dias"
Output: {
  where: {
    contract: {
      OR: [
        { projectName: { contains: "João Silva", mode: "insensitive" } },
        { clientName: { contains: "João Silva", mode: "insensitive" } }
      ]
    },
    expectedDate: { gte: "2024-09-08T00:00:00.000Z" }
  },
  orderBy: { expectedDate: "asc" },
  interpretation: "Recebíveis de projetos/clientes 'João Silva' dos últimos 30 dias"
}

User: "despesas recorrentes OU canceladas"
Output: {
  where: {
    OR: [
      { recurringExpenseId: { not: null } },
      { status: "cancelled" }
    ]
  },
  interpretation: "Despesas recorrentes ou canceladas"
}
```

---

#### **Features Supported**

**1. Boolean Logic**:
- ✅ OR conditions: "recorrentes OU canceladas"
- ✅ AND conditions: "atrasados E acima de 10k"
- ✅ NOT conditions: "não recorrentes"

**2. Sorting**:
- ✅ Descending: "ordenar por valor decrescente" → `{ amount: "desc" }`
- ✅ Ascending: "ordenar por data" → `{ expectedDate: "asc" }`

**3. Date Ranges**:
- ✅ Relative: "últimos 30 dias", "este mês"
- ✅ Absolute: "depois de janeiro 2024"

**4. Numeric Comparisons**:
- ✅ Greater than: "acima de 10k" → `{ gt: 10000 }`
- ✅ Less than: "abaixo de 5k" → `{ lt: 5000 }`
- ✅ Range: "entre 5k e 10k" → `{ gte: 5000, lte: 10000 }`

**5. Text Search**:
- ✅ Case-insensitive: `{ contains: "Silva", mode: "insensitive" }`
- ✅ Nested relations: Contract name/client search

---

#### **UI/UX Pattern**

**Placement**:
- Desktop: In [+ Mais] dropdown → "🤖 Filtros Avançados (IA)"
- Mobile: In filter drawer, [+ Mais] section → Same button

**Modal Workflow**:
1. User clicks "Filtros Avançados (IA)"
2. Modal opens with textarea + examples
3. User types natural language query
4. Click "Filtrar" → Shows interpretation + result count
5. Preview results in modal
6. Click "Usar Estes Resultados" → Apply to table

**Feedback**:
- ✓ Interpretation shown (transparency)
- 📊 Count shown (confidence)
- Preview results (verify before applying)
- Option to refine query

---

#### **Technical Implementation**

**Files to Create**:
- `lib/services/FilterAgentService.ts` (new)
- `app/api/filters/ai/route.ts` (new)
- `app/components/AdvancedFilterModal.tsx` (new)

**Files to Modify**:
- `app/expenses/page.tsx` (add modal trigger in [+ Mais])
- `app/receivables/page.tsx` (add modal trigger)
- `app/projetos/components/ContractsTab.tsx` (add modal trigger)

**Dependencies**:
- Anthropic SDK (already installed)
- Prisma (already installed)
- Team context middleware (already exists)

---

#### **Performance & Cost**

**Performance**:
- Single LLM call: ~500-800ms
- Prisma query execution: ~100-300ms
- **Total**: ~600-1100ms (acceptable for advanced feature)

**Cost**:
- Input tokens: ~1500 (schema + examples)
- Output tokens: ~200 (query object)
- **Per request**: ~$0.01 (Claude Sonnet 3.5)
- **Monthly** (100 users, 10 queries/user): ~$10

**Caching**:
- Cache Prisma schema in memory (static)
- No query result caching (real-time data)

---

#### **Security Considerations**

**✅ Safe**:
- No SQL injection (Prisma validates structure)
- Team isolation enforced by middleware
- LLM can't access other teams' data
- Prisma query object validated before execution

**⚠️ Rate Limiting**:
- Implement per-user rate limit (10 queries/minute)
- Prevent abuse/excessive costs

---

#### **Testing Strategy**

**Unit Tests**:
- FilterAgentService prompt generation
- Prisma query object validation
- Edge cases (malformed input, invalid queries)

**Integration Tests**:
- End-to-end: Input → Query → Results
- All entity types (receivables, expenses, contracts)
- Boolean logic (OR, AND, NOT)
- Sorting variations
- Date range calculations

**User Testing**:
- 5-10 test queries per entity
- Verify interpretation accuracy
- Validate result correctness
- Measure response time

---

#### **Rollout Plan**

**Phase 1: Expenses Tab Only** (1 week)
- Implement full stack (service + API + modal)
- Deploy to staging
- Internal testing (10+ test queries)
- Iterate based on accuracy

**Phase 2: All Tabs** (3-5 days)
- Roll out to Receivables, Contracts
- Consistent UX across tabs
- Production deployment

**Phase 3: Enhancements** (Future)
- Query history (save favorite filters)
- Query suggestions (autocomplete)
- Multi-entity queries ("projetos ativos com recebíveis atrasados")

---

#### **Success Metrics**

**Accuracy**:
- 95%+ queries return expected results
- User confirms interpretation matches intent

**Adoption**:
- 30%+ of power users try AI filtering
- 10%+ use it regularly (5+ times/month)

**Performance**:
- 90%+ queries complete under 1 second
- Zero errors in production

**User Satisfaction**:
- Positive feedback in surveys
- Feature request: "Add to X page"

---

#### **Open Questions & Decisions**

1. **Multi-entity queries**: Support "projetos com recebíveis atrasados"?
   - **Decision**: Phase 3 enhancement (complex joins)

2. **Query history**: Save/bookmark favorite filters?
   - **Decision**: Phase 3 enhancement (requires user preferences storage)

3. **Mobile UX**: Full modal or simplified drawer?
   - **Decision**: Same modal, responsive design

4. **Error handling**: What if LLM returns invalid query?
   - **Decision**: Catch Prisma validation error, show friendly message, ask user to rephrase

5. **Fallback**: What if API is down?
   - **Decision**: Graceful degradation, show "AI filtering temporarily unavailable, use manual filters"

---

**Status**: Architecture finalized ✅, Implementation pending 🔜
**Estimated Effort**: 8-12 hours total
**Risk**: LOW-MEDIUM (depends on LLM accuracy, but safe architecture)
**Impact**: HIGH (power users gain 10x faster filtering)

---

### **Next Tactical Improvements** 🔜

**Status**: Ready to document more tabs

Areas available for improvement:
- Dashboard tab (Phase 1 complete ✅)
- Projetos tab (2C/2D complete ✅)
- Recebíveis tab (2C/2D complete ✅)
- Despesas tab (2C/2D complete ✅)
- **2E AI Filtering (all tabs)** 🚧 In Progress
- Assistente IA tab (documented ✅)
- Other tabs (settings, profile, exports, etc.)

**Process**: Continue documenting each tactical improvement as user provides input, then batch implementation.

---

## Implementation Phases

### **Phase 1: Quick Wins - Dashboard Minor Tweaks** ✅ COMPLETE (2025-10-04)

**Status**: ✅ **DEPLOYED TO PRODUCTION**
**Completion Date**: 2025-10-04
**Time Spent**: 2 hours (as estimated)
**Commits**: `b2ac071`, `4216a68`

**Rationale**: Immediate improvements to existing dashboard, zero architectural changes

**Changes Implemented**:

1. **Metric Row 1: Active Contracts Display**
   - **Before**: `5/10 contratos` (active/total)
   - **After**: `5 contratos ativos` (just active count)
   - **Why**: Total contracts is noise; active count is what matters daily

2. **Metric Row 2: 90-Day Focus for Pending Amounts**
   - **Before**: "A Receber (Pendente)" / "A Pagar (Pendente)" (all future)
   - **After**: "A Receber (próximos 90 dias)" / "A Pagar (próximos 90 dias)"
   - **Why**: 90 days = actionable horizon; 5 years out = irrelevant for daily cash management

3. **Overdue Section: Split by Type**
   - **Before**: Single "Itens em Atraso" block (mixed receivables + expenses)
   - **After**: Two separate blocks:
     - "Recebimentos Atrasados" → Total overdue amount
     - "Pagamentos Atrasados" → Total overdue amount
   - **Why**: Different actions needed (chase clients vs pay vendors)

4. **Subtitle Fix: Upcoming Expenses**
   - **Before**: "Pagamentos programados"
   - **After**: "Pagamentos a fazer"
   - **Why**: More natural Brazilian Portuguese

**Implementation Details**:

**Files Modified**:
- `app/page.tsx` - Dashboard UI components (+52 lines, -26 lines)
  - Updated `DashboardData` interface with `overdueReceivablesAmount`, `overdueExpensesAmount`
  - Changed active contracts display from "5/10" to "5 contratos ativos"
  - Updated pending amounts labels to "próximos 90 dias"
  - Replaced single overdue block with two-column grid layout
  - Added amber styling for receivables, red for expenses
  - Updated subtitle to "Pagamentos a fazer"

- `app/api/dashboard/route.ts` - Metrics calculation (+9 lines, -7 lines)
  - Added `next90Days` date calculation
  - Updated `pendingReceivables` filter with `isDateInRange(r.expectedDate, today, next90Days)`
  - Updated `pendingExpenses` filter with `isDateInRange(e.dueDate, today, next90Days)`
  - Added `overdueReceivablesAmount` metric calculation
  - Added `overdueExpensesAmount` metric calculation

**Build Status**: ✅ Compiled successfully, zero regressions

**User Impact**:
- Clearer metrics labels and context (90-day actionable horizon)
- Better visual hierarchy (separate colors for receivables vs expenses)
- Improved Brazilian Portuguese phrasing
- Clear separation of actions needed (chase clients vs pay vendors)

**Actual Effort**: 2 hours
**Risk**: LOW (cosmetic changes only) ✅ No issues

---

### **Phase 2: UX/UI Strategy - Design Exploration** 🔄 NEXT

**Goal**: Define how to separate daily vs periodic metrics without overwhelming users

**Options to Explore**:

**Option A: Tabs within Dashboard**
```
┌─────────────────────────────────────────────────────────┐
│  [Visão Geral] [Análises] [Projeções]                  │
│                                                         │
│  Visão Geral Tab:                                      │
│  - Health indicator                                    │
│  - This month metrics                                  │
│  - Urgent actions                                      │
│  - Quick actions                                       │
│                                                         │
│  Análises Tab:                                         │
│  - 6-month trends                                      │
│  - Project profitability                               │
│  - Expense breakdown                                   │
│                                                         │
│  Projeções Tab:                                        │
│  - Cash flow forecast                                  │
│  - Revenue projections                                 │
└─────────────────────────────────────────────────────────┘
```
**Pros**: Single page, easy navigation
**Cons**: Tabs may hide valuable info

**Option B: Separate Pages**
```
/dashboard          → Daily view (default)
/dashboard/analytics → Trends, breakdowns
/dashboard/forecast  → Projections, what-if
```
**Pros**: Clear separation, URL-addressable
**Cons**: More clicks, navigation overhead

**Option C: Dashboard + Expandable Cards/Modals**
```
┌─────────────────────────────────────────────────────────┐
│  Daily Metrics (always visible)                         │
│                                                         │
│  ┌─────────────────────────────────────┐               │
│  │ 📊 Ver Análises Detalhadas [Expand] │               │
│  └─────────────────────────────────────┘               │
│  (Opens modal with rich charts)                        │
└─────────────────────────────────────────────────────────┘
```
**Pros**: Progressive disclosure, no navigation
**Cons**: Limited space for rich visualizations

**Decision Point**: Requires user feedback and design mockups

**Effort**: 1-2 weeks (design + implementation)
**Risk**: MEDIUM (UX decisions affect adoption)

---

### **Phase 3: Business Metrics Service** 🔮 FUTURE

**Goal**: Create reusable, scalable metrics calculation layer

**Architecture**:

```typescript
// lib/services/BusinessMetricsService.ts

interface ServiceContext {
  teamId: string
  userId: string
  prisma: PrismaClient
}

class BusinessMetricsService extends BaseService {
  constructor(context: ServiceContext) {
    super(context)
  }

  // === TIER 1: CRITICAL METRICS ===

  /**
   * Calculate cash flow forecast for next N days
   * Shows projected balance based on expected receivables/expenses
   */
  async calculateCashFlowForecast(days: 30 | 60 | 90): Promise<CashFlowForecast> {
    // 1. Get all receivables expected in next N days
    // 2. Get all expenses due in next N days
    // 3. Calculate running balance day-by-day
    // 4. Identify cash gaps (negative balance days)
    // 5. Return forecast with warnings
  }

  /**
   * Get receivables aging buckets (0-30, 31-60, 61-90, 90+ days overdue)
   * Returns DSO (Days Sales Outstanding) metric
   */
  async getReceivablesAging(): Promise<ReceivablesAging> {
    // 1. Find all unpaid receivables
    // 2. Calculate days overdue for each
    // 3. Group into aging buckets
    // 4. Calculate DSO = (Total AR / Total Credit Sales) × Days
    // 5. Flag items >90 days as critical
  }

  /**
   * Calculate profit/loss for each project/contract
   * Shows which clients/projects are profitable
   */
  async getProjectProfitability(contractId?: string): Promise<ProjectProfitability[]> {
    // 1. For each contract, sum total receivables (revenue)
    // 2. Sum expenses allocated to contract
    // 3. Calculate profit = revenue - expenses
    // 4. Calculate margin % = (profit / revenue) × 100
    // 5. Classify: profitable (over 15%), breakeven (0-15%), loss (under 0%)
  }

  /**
   * This month's cash reality check
   * Expected vs actual, gap to cover, burn rate
   */
  async getMonthCashReality(): Promise<MonthCashReality> {
    // 1. Sum all receivables expected this month (by expectedDate)
    // 2. Sum all already received (paidDate exists)
    // 3. Calculate gap = expected - received
    // 4. Calculate burn rate = total expenses / days in month
    // 5. Calculate runway = current cash / burn rate
  }

  // === TIER 2: IMPORTANT METRICS ===

  async getExpenseBreakdown(period: 'month' | 'quarter' | 'year'): Promise<ExpenseBreakdown>
  async getClientRevenueRanking(limit: number = 10): Promise<ClientRevenue[]>
  async getOverheadRate(): Promise<OverheadMetrics>

  // === TIER 3: ADVANCED METRICS ===

  async getUtilizationRate(): Promise<UtilizationMetrics>  // For firms with employees
  async getNetMultiplier(): Promise<number>  // Revenue / Direct Labor Cost

  // === UTILITY METHODS ===

  /**
   * Get specific metric by name (used by AI agents)
   */
  async getMetricByName(metricName: string, params?: any): Promise<any> {
    const metricMap: Record<string, Function> = {
      'cash_flow_forecast': this.calculateCashFlowForecast,
      'receivables_aging': this.getReceivablesAging,
      'project_profitability': this.getProjectProfitability,
      // ... etc
    }
    return await metricMap[metricName]?.call(this, params)
  }

  /**
   * Get list of urgent action items
   * Used for dashboard "Ações Urgentes" section
   */
  async getUrgentActions(): Promise<ActionItem[]> {
    // 1. Get receivables 90+ days overdue
    // 2. Get cash gaps in next 30 days
    // 3. Get projects with negative profit margin
    // 4. Get expenses overdue
    // 5. Rank by urgency and financial impact
  }
}

// === TYPE DEFINITIONS ===

interface CashFlowForecast {
  currentBalance: number
  projectedBalances: {
    days30: number
    days60: number
    days90: number
  }
  expectedInflows: Array<{
    date: string
    amount: number
    description: string
  }>
  expectedOutflows: Array<{
    date: string
    amount: number
    description: string
  }>
  cashGaps: Array<{
    startDate: string
    endDate: string
    deficit: number
    severity: 'warning' | 'critical'
  }>
}

interface ReceivablesAging {
  buckets: {
    current: number        // 0-30 days overdue
    days31to60: number
    days61to90: number
    days90plus: number     // CRITICAL
  }
  totalOverdue: number
  daysSalesOutstanding: number  // DSO metric (industry avg: 81 days)
  agingItems: Array<{
    contractId: string
    clientName: string
    projectName: string
    amount: number
    expectedDate: string
    daysOverdue: number
    priority: 'low' | 'medium' | 'high' | 'critical'  // Based on age + amount
  }>
}

interface ProjectProfitability {
  contractId: string
  projectName: string
  clientName: string
  totalRevenue: number
  totalExpenses: number
  profit: number
  profitMargin: number  // Percentage
  status: 'profitable' | 'breakeven' | 'loss'
  trend: 'improving' | 'stable' | 'worsening'
}

interface MonthCashReality {
  expectedRevenue: number    // Sum of receivables expected this month
  actualReceived: number     // Sum of already paid
  gap: number               // expectedRevenue - actualReceived
  percentageReceived: number
  burnRate: number          // Avg expenses per day
  runway: number            // Days until cash out (if no new revenue)
}

interface ExpenseBreakdown {
  total: number
  categories: Array<{
    category: string
    amount: number
    percentage: number
    trend: 'increasing' | 'stable' | 'decreasing'
  }>
}

interface ClientRevenue {
  clientName: string
  totalRevenue: number
  percentageOfTotal: number
  contractCount: number
  averageProjectValue: number
  concentrationRisk: 'low' | 'medium' | 'high'  // >40% = high risk
}

interface ActionItem {
  type: 'overdue_receivable' | 'cash_gap' | 'unprofitable_project' | 'overdue_expense'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  amount?: number
  actionUrl?: string  // Link to relevant page
  metadata: any
}
```

**Integration Points**:

1. **Dashboard** (`app/page.tsx`)
   ```typescript
   const metricsService = new BusinessMetricsService(context)
   const aging = await metricsService.getReceivablesAging()
   const actions = await metricsService.getUrgentActions()
   ```

2. **Financial Query Agent** (ADR-008)
   ```typescript
   // In system prompt
   "You have access to business metrics via getMetricByName():
   - cash_flow_forecast
   - receivables_aging
   - project_profitability
   ..."

   // In tool execution
   const metric = await metricsService.getMetricByName('receivables_aging')
   ```

3. **Operations Agent** (Future Enhancement)
   ```typescript
   // Before executing expense creation
   const forecast = await metricsService.calculateCashFlowForecast(60)
   if (forecast.cashGaps.length > 0) {
     return "⚠️ Warning: This expense will create a cash gap in 45 days. Recommend delaying."
   }
   ```

4. **Export/Reporting**
   ```typescript
   // Generate financial report
   const allMetrics = {
     aging: await metricsService.getReceivablesAging(),
     profitability: await metricsService.getProjectProfitability(),
     expenses: await metricsService.getExpenseBreakdown('month')
   }
   exportToPDF(allMetrics)
   ```

**Effort**: 3-4 weeks
**Risk**: MEDIUM (complex business logic, needs testing)
**Dependencies**: Service layer ✅, Database schema ✅

---

### **Phase 4: Advanced Visualizations** 🔮 FUTURE

**Goal**: Rich, interactive charts for trend analysis

**Potential Enhancements**:
- Interactive cash flow waterfall chart
- Project profitability matrix (bubble chart)
- Expense category pie/donut charts
- Receivables aging funnel visualization
- Client revenue concentration risk chart

**Technology Options**:
- Recharts (current ecosystem)
- Chart.js
- D3.js (most flexible, higher complexity)
- Victory Charts
- Nivo (built on D3)

**Effort**: 2-3 weeks (after Phase 3 metrics exist)
**Risk**: LOW (pure presentation layer)

---

## Current Status & Next Actions

### ✅ Phase 1: Quick Wins - COMPLETE
**Status**: ✅ **DEPLOYED TO PRODUCTION** (2025-10-04)
**Time Spent**: 2 hours (on target)
**Result**: 4 dashboard improvements live, zero issues
**Commits**: `b2ac071` (implementation), `4216a68` (documentation)
**Files Modified**:
- `app/page.tsx` (+52, -26 lines)
- `app/api/dashboard/route.ts` (+9, -7 lines)

**Key Achievements**:
- ✅ Active contracts display simplified
- ✅ 90-day actionable horizon for pending amounts
- ✅ Overdue items split by type with totals
- ✅ Natural Brazilian Portuguese phrasing

### 🔄 Phase 2: UX/UI Strategy - NEXT PRIORITY
**Status**: Awaiting design exploration and user feedback
**Next Action**: Create design mockups for 3 options (Tabs, Pages, Modals)
**Decision Point**: User preference + technical feasibility
**Prerequisites**: Phase 1 complete ✅

### 🔮 Phase 3: Business Metrics Service - FUTURE
**Status**: Architecture defined, awaiting Phase 2 completion
**Prerequisites**: Phase 1 complete ✅, Phase 2 design finalized ⏳

### 🔮 Phase 4: Advanced Visualizations - FUTURE
**Status**: Exploratory
**Prerequisites**: Phase 3 metrics service complete

---

## Metrics Tier Classification

### Tier 1: Critical (Daily Decisions) - Priority 1
1. **Cash Flow Forecast** (30/60/90 days)
2. **Receivables Aging** (0-30/31-60/61-90/90+)
3. **Project Profitability** (per contract)
4. **Month Cash Reality** (expected vs actual)

**Rationale**: Directly address top 3 architect pain points (revenue, costs, collections)

### Tier 2: Important (Weekly Review) - Priority 2
5. **Expense Breakdown** (by category)
6. **Client Revenue Ranking** (top 10, concentration risk)
7. **Overhead Rate** (target: 150-175%)

**Rationale**: Strategic insights for business health monitoring

### Tier 3: Advanced (Monthly/Quarterly) - Priority 3
8. **Utilization Rate** (for firms with employees)
9. **Net Multiplier** (revenue/labor cost)
10. **Budget vs Actual** (project-level)

**Rationale**: Nice-to-have for mature firms with complex operations

---

## Key Decisions

### Decision 1: Separation of Daily vs Periodic Metrics ✅
**Chosen**: Separate daily dashboard from analytics
**Rationale**: Architects open dashboard multiple times per day; trends are weekly activity
**Implementation**: TBD (Phase 2 design exploration)

### Decision 2: Scalable Metrics Architecture ✅
**Chosen**: BusinessMetricsService extending BaseService
**Rationale**: Reusable across dashboard, AI agents, exports; single source of truth
**Implementation**: Phase 3

### Decision 3: Actionable Intelligence Philosophy ✅
**Chosen**: Every metric must answer "What should I do?"
**Rationale**: Architects need decisions, not just data
**Implementation**: All phases

### Decision 4: Quick Wins First ✅
**Chosen**: Phase 1 minor tweaks before major refactor
**Rationale**: Deliver immediate value while planning larger evolution
**Implementation**: Phase 1 (approved)

---

## Success Metrics

**Phase 1**:
- ✅ Dashboard clarity improved (active contracts, 90-day focus)
- ✅ Overdue items actionable (split by type)
- ✅ Zero regressions

**Phase 2**:
- User satisfaction with new UX (survey or feedback)
- Reduced time to find key metrics (under 5 seconds)
- Increased dashboard engagement (analytics tracking)

**Phase 3**:
- BusinessMetricsService reused in 3+ places (dashboard, agents, exports)
- AI agents provide intelligent recommendations based on metrics
- Metric calculation performance under 500ms per metric

**Phase 4**:
- User engagement with visualizations (interaction tracking)
- Insights derived from charts (user feedback)

---

## Technical Constraints

**Performance**:
- Dashboard load time under 2s (current: ~1.5s)
- Metric calculations under 500ms each
- Total dashboard data fetch under 3s

**Scalability**:
- Support teams with 100+ contracts
- Support 5+ years of historical data
- Handle concurrent metric requests (multiple users)

**Browser Compatibility**:
- Modern browsers (last 2 versions)
- Mobile responsive (current dashboard is ✅)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Metrics performance slow** | MEDIUM | HIGH | Cache calculations, optimize queries, add indexes |
| **UX decisions wrong** | MEDIUM | MEDIUM | User testing, iterative design, fallback to current |
| **Scope creep** | HIGH | MEDIUM | Phased approach, clear priorities, Phase 1 → 2 → 3 |
| **Duplicate logic** | LOW | HIGH | BusinessMetricsService enforces single source of truth |
| **Breaking changes** | LOW | HIGH | Maintain backward compatibility, feature flags |

---

## Open Questions

1. **Phase 2 Design**: Tabs, Pages, or Modals?
   - Needs: User research, mockups, prototype testing

2. **Chart Library**: Which visualization framework?
   - Needs: Technical evaluation, performance testing

3. **Metrics Caching**: How long to cache expensive calculations?
   - Needs: Performance profiling, business requirements (real-time vs eventual consistency)

4. **AI Agent Integration**: When to add metric-based recommendations?
   - Needs: Phase 3 complete, user feedback on value

---

## References

### Industry Research
- Deltek: "8 Key Performance Indicators for Architecture Firms"
- GrowthForce: "Top 10 Cash Flow Tips for Architecture Firms"
- Monograph: "10 Key Financial Performance Indicators"
- EntreArchitect: "7 Key Financial Performance Indicators"

### Internal Documentation
- ADR-008: AI Agent Strategy (Financial Query Agent can use metrics)
- ADR-006: Service Layer Migration (BaseService pattern)
- ADR-003: Strategic Architecture Evolution (AI-first vision)

### Code References
- Current Dashboard: `app/page.tsx`
- Dashboard API: `app/api/dashboard/route.ts`
- Service Layer: `lib/services/`

---

**Status**: Phase 1 complete (2025-10-04), Phase 2 planning in progress
**Next Review**: After Phase 2 design decision + user feedback on Phase 1 changes
**Owner**: Product + Engineering

---

### **Recurring Expenses UX Improvements** ✅ COMPLETE (2025-10-07)

**Context**: The recurring expenses feature had several UX bugs that made frequency editing difficult and confusing. Users needed a simple, consistent interface for managing recurring expense parameters.

**Issues Resolved**:
1. ✅ ~~Inconsistent modals - different forms for creating vs editing expenses~~
2. ✅ ~~Intervalo field affected by scroll wheel (changed values accidentally)~~
3. ✅ ~~Frequency parameter changes didn't persist for future installments~~
4. ✅ ~~Duplicate entries when editing with scope="future"~~
5. ✅ ~~Wrong start dates when editing with scope="all"~~

**Implemented Changes**:

#### **1. Unified Expense Form Modal** ✅
**Action**: Single form component handles all use cases
- **Creating new expense**: Checkbox visible and enabled
- **Editing non-recurring expense**: Checkbox visible, can check to make it recurring
- **Editing recurring expense**: Checkbox checked and disabled, shows scope info banner

**Code**: `app/components/forms/ExpenseForm.tsx:204-213`
```typescript
// Checkbox always visible, disabled only when editing recurring with scope
disabled={loading || (expense && expense._recurringExpense && expense._recurringScope)}
```

#### **2. Fixed Intervalo Field Input Behavior** ✅
**Action**: Changed from `type="number"` to `type="text"` with numeric validation
- **No more scroll wheel changes**: Added `onWheel={(e) => e.currentTarget.blur()}`
- **No more spinner arrows**: CSS hides webkit spin buttons
- **Proper deletion**: Allows empty string during editing, validates on blur
- **Applied to**: Intervalo, Máximo de Ocorrências fields

**Code**: `app/components/forms/ExpenseForm.tsx:239-267`

#### **3. Frequency Change Logic - Simple CRUD Approach** ✅
**Problem**: When frequency/interval changed, existing future expenses kept old schedule

**Solution**: Delete + Recreate pattern
- **Step 1**: Delete future/all expenses via `/api/expenses/[id]/recurring-action`
- **Step 2**: Create new RecurringExpense with new parameters via `/api/recurring-expenses`
- **No cron jobs, no complexity** - just existing CRUD endpoints

**Scope Behavior**:
- **scope="all"**: Preserves original start date, recreates entire series with new frequency
- **scope="future"**: Starts from current expense date, only affects future installments

**Code**: `app/expenses/page.tsx:215-284`

#### **4. Fixed Duplication and Start Date Issues** ✅
**scope="future" duplication fix**:
```typescript
// Start from current expense date (which gets deleted and recreated)
startDate = new Date(editingExpense.dueDate)
```

**scope="all" start date fix**:
```typescript
// Preserve original series start date
startDate = new Date(editingExpense._recurringExpense.startDate)
```

**Example Flow**:
- **Original**: Monthly (Oct, Nov, Dec, Jan...)
- **Edit Dec + future → bi-monthly**:
  1. Deletes: Dec, Jan, Feb, Mar...
  2. Creates: New series starting Dec with interval=2
  3. Result: Oct, Nov (old), Dec, Feb, Apr... (new)
  4. ✅ No duplication, correct dates

**Files Modified**:
- `app/components/forms/ExpenseForm.tsx`
- `app/expenses/page.tsx`

**Technical Quality**:
- ✅ Build successful (4.0s compile time)
- ✅ TypeScript types validated
- ✅ Zero regressions
- ✅ Responsive design maintained
- ✅ Proper error handling and user feedback

**User Experience Improvements**:
- **Consistency**: Same modal for all expense operations
- **Safety**: Clear scope info banners ("Alterações serão aplicadas a...")
- **Predictability**: No accidental changes via scroll wheel
- **Reliability**: Frequency changes always work correctly
- **Simplicity**: Delete + Create pattern is easy to understand and debug

---

## Implementation Log

### Phase 1 Completion (2025-10-04)

**Planned Effort**: 2-3 hours
**Actual Effort**: 2 hours ✅

**Changes Delivered**:
1. ✅ Active contracts: "5 contratos ativos" (removed total)
2. ✅ Pending amounts: "próximos 90 dias" filter + label
3. ✅ Overdue split: Two blocks (amber receivables, red expenses) + totals
4. ✅ Subtitle: "Pagamentos a fazer"

**Technical Quality**:
- ✅ Build successful (npm run build)
- ✅ TypeScript types updated
- ✅ Zero regressions
- ✅ Responsive design maintained
- ✅ Proper singular/plural handling

**Deployment**:
- ✅ Committed: `b2ac071`, `4216a68`
- ✅ Pushed to production (main branch)
- ✅ Documentation updated (BACKLOG.md, ADR-014)

**User Feedback**: Pending (awaiting production usage)
