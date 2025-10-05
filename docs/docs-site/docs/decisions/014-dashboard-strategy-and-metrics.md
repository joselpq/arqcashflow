---
title: "Dashboard Strategy: Financial Intelligence & Daily Decision Support"
type: "decision"
audience: ["developer", "agent", "product", "designer"]
contexts: ["dashboard", "metrics", "kpis", "financial-intelligence", "user-experience", "business-insights", "cash-flow", "architecture"]
complexity: "intermediate"
last_updated: "2025-10-04"
version: "1.1"
status: "phase-1-complete"
decision_date: "2025-10-04"
phase_1_completed: "2025-10-04"
agent_roles: ["dashboard-developer", "metrics-specialist", "ux-designer"]
related:
  - decisions/008-ai-agent-strategy.md
  - decisions/006-service-layer-migration-plan.md
  - decisions/003-strategic-architecture-evolution.md
dependencies: ["service-layer", "dashboard-api", "business-metrics-service"]
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
