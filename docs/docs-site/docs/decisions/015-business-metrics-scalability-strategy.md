---
title: "Business Metrics Scalability & Long-Term Strategy"
type: "decision"
audience: ["developer", "agent", "product", "architect"]
contexts: ["business-metrics", "analytics", "scalability", "ai-agents", "etl", "data-pipeline", "charting", "customization", "kpi-dashboard"]
complexity: "advanced"
last_updated: "2025-10-09"
version: "1.0"
status: "strategic-planning"
decision_date: "2025-10-09"
agent_roles: ["metrics-architect", "data-engineer", "dashboard-developer", "ai-agent-developer"]
related:
  - decisions/014-dashboard-strategy-and-metrics.md
  - decisions/008-ai-agent-strategy.md
  - decisions/006-service-layer-migration-plan.md
dependencies: ["business-metrics-service", "service-layer", "prisma", "claude-api"]
---

# ADR-015: Business Metrics Scalability & Long-Term Strategy

## Context for LLM Agents

**Scope**: Comprehensive strategy for evolving ArqCashflow's business metrics infrastructure from current state to AI-powered, customizable, scalable analytics platform

**Prerequisites**: Understanding of:
- Current BusinessMetricsService implementation (Phase 1 & 2 complete)
- Database query performance optimization
- React charting libraries (Recharts, Chart.js, Victory)
- ETL pipeline concepts
- AI agent architecture (ADR-008)

**Key Patterns**:
- Progressive enhancement (working features → scalable → customizable → AI-powered)
- Database-level aggregation (push filtering to Prisma/PostgreSQL)
- Flexible time-series data (custom date ranges, grouping intervals)
- Agent-accessible metrics API (standardized interface for LLMs)
- ETL for performance at scale (separate analytics database)

---

## Problem Statement

### Current State (2025-10-09)

**✅ What We Have: BusinessMetricsService (Phases 1 & 2)**

**Implemented Methods** (6 metrics):
1. `getMonthMetrics()` - Current month revenue, expenses, profit, contracts
2. `getPendingAmounts(days)` - Pending receivables/expenses within N days
3. `getOverdueAnalysis()` - Overdue items with amounts and details
4. `getCashFlowHealth()` - Health status assessment (good/warning/critical)
5. `getUpcomingItems(days)` - Next 7 days receivables/expenses (top 5)
6. `getMonthlyTrend(months)` - Last 6 months revenue/expenses/profit

**Implementation Achievement**:
- ✅ Dashboard API refactored (218 → 70 lines, **68% code reduction**)
- ✅ Single source of truth for metrics calculation
- ✅ Type-safe interfaces
- ✅ Team-scoped security by default
- ✅ Zero caching (real-time data)

**📊 How It's Used Today**:
```typescript
// Dashboard API (/api/dashboard/route.ts)
const metricsService = new BusinessMetricsService(context)
const [monthMetrics, pendingAmounts, overdueAnalysis, cashFlowHealth, upcomingItems, monthlyTrend] =
  await Promise.all([
    metricsService.getMonthMetrics(),
    metricsService.getPendingAmounts(90),
    metricsService.getOverdueAnalysis(),
    metricsService.getCashFlowHealth(),
    metricsService.getUpcomingItems(7),
    metricsService.getMonthlyTrend(6)
  ])
```

**Visualization**:
- Simple bar charts (custom CSS horizontal bars)
- No charting library installed
- Dashboard only (no separate analytics page)

---

### ❌ Critical Limitations (Scalability Bottlenecks)

#### **1. Hardcoded Time Periods**
```typescript
// Current implementation - inflexible
async getMonthMetrics(): Promise<MonthMetrics> {
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1) // ← Hardcoded
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  // ...
}
```

**Problem**: Cannot support custom date ranges
- ❌ "Show me profit for Q1 2024"
- ❌ "Compare July vs August"
- ❌ "Last 90 days trend"

#### **2. In-Memory Filtering (Not Scalable)**
```typescript
// Current approach - fetches ALL data, filters in JavaScript
const receivables = await this.context.teamScopedPrisma.receivable.findMany() // ← Fetches EVERYTHING
const filtered = receivables.filter(r => /* filter logic */) // ← Filters in JS
```

**Problem**: Performance degrades with data volume
- 100 contracts = OK (~100ms)
- 1,000 contracts = Slow (~500ms)
- 10,000 contracts = **Timeout** (~5s+)

#### **3. Fixed Grouping Intervals**
```typescript
// getMonthlyTrend(months: 6) - only supports monthly grouping
```

**Problem**: Cannot support different time granularities
- ❌ Daily profit trend (last 30 days)
- ❌ Weekly revenue comparison
- ❌ Quarterly expense breakdown

#### **4. No Charting Library**
```typescript
// Current visualization - custom CSS bars
<div className="bg-green-600 h-4 rounded-full" style={{ width: `${revenue * scale}%` }}></div>
```

**Problem**: Limited visualization capabilities
- ❌ No line charts (trends)
- ❌ No pie charts (category breakdown)
- ❌ No stacked area charts (cash flow)
- ❌ No interactive tooltips/zoom

#### **5. Not Agent-Accessible**
**Problem**: AI agents cannot easily request metrics
- Financial Query Agent: Manual SQL queries instead of reusable metrics
- Operations Agent: No predictive warnings (e.g., "This expense creates a cash gap")
- Future Insights Agent: Cannot access profitability/aging calculations

---

## Decision: Phased Evolution Strategy

### Vision Statement

**6 Months**: Flexible metrics with custom periods, rich charting, separate analytics page
**12 Months**: AI agents provide intelligent recommendations using metrics infrastructure
**18-24 Months**: Customizable KPI dashboards, ETL pipeline for scale, real-time analytics

---

## Phase 1: Scalable Metrics Refactor (2-3 Days) 🎯 PRIORITY

### Goal
Transform BusinessMetricsService from fixed periods to flexible, database-optimized queries

### Architecture Changes

#### **1.1: Add Flexible Time Range Parameters**

**Before (Hardcoded)**:
```typescript
async getMonthMetrics(): Promise<MonthMetrics>
```

**After (Flexible)**:
```typescript
interface TimeRange {
  startDate: Date
  endDate: Date
}

async getMetrics(range: TimeRange): Promise<Metrics> {
  // Push filtering to database
  const receivables = await this.context.teamScopedPrisma.receivable.findMany({
    where: {
      teamId: this.context.teamId,
      receivedDate: { gte: range.startDate, lte: range.endDate } // ← Database filter
    }
  })
  // Aggregate in database when possible
}
```

**Benefits**:
- ✅ Custom date ranges: "2024-07-01 to 2024-09-30"
- ✅ Relative periods: "Last 90 days", "This quarter"
- ✅ Comparison periods: "This month vs last month"

#### **1.2: Add Time-Series Grouping**

**New Method**:
```typescript
interface TimeSeriesOptions {
  startDate: Date
  endDate: Date
  groupBy: 'day' | 'week' | 'month' | 'quarter' | 'year'
  metrics: ('revenue' | 'expenses' | 'profit')[]
}

interface TimeSeriesData {
  period: string       // "2024-07-15", "2024-W30", "Jul 2024"
  revenue: number
  expenses: number
  profit: number
}

async getTimeSeries(options: TimeSeriesOptions): Promise<TimeSeriesData[]> {
  // 1. Fetch data with date range filter (database-level)
  // 2. Group by interval (use date-fns or PostgreSQL date_trunc)
  // 3. Aggregate metrics per period
  // 4. Return ordered array (oldest → newest)
}
```

**Example Usage**:
```typescript
// Daily profit for last 30 days
const daily = await metricsService.getTimeSeries({
  startDate: thirtyDaysAgo,
  endDate: today,
  groupBy: 'day',
  metrics: ['profit']
})

// Monthly revenue for last 12 months
const monthly = await metricsService.getTimeSeries({
  startDate: twelveMonthsAgo,
  endDate: today,
  groupBy: 'month',
  metrics: ['revenue', 'expenses']
})
```

#### **1.3: Database Optimization Patterns**

**Push Aggregation to Database**:
```typescript
// ❌ BAD: Fetch all, aggregate in JS
const expenses = await prisma.expense.findMany()
const total = expenses.reduce((sum, e) => sum + e.amount, 0)

// ✅ GOOD: Aggregate in database
const result = await prisma.expense.aggregate({
  where: { teamId, dueDate: { gte: startDate, lte: endDate } },
  _sum: { amount: true },
  _count: true
})
const total = result._sum.amount || 0
```

**Use Prisma Grouping**:
```typescript
// Group by month in database
const monthlyExpenses = await prisma.expense.groupBy({
  by: ['dueDate'],
  where: { teamId, dueDate: { gte: startDate, lte: endDate } },
  _sum: { amount: true }
})
```

**Add Database Indexes** (future optimization):
```prisma
// prisma/schema.prisma
model Receivable {
  @@index([teamId, receivedDate])
  @@index([teamId, expectedDate])
  @@index([teamId, status])
}
```

### Implementation Plan

**Day 1: Refactor Core Methods** (6-8 hours)
- [ ] Add `TimeRange` parameter to `getMonthMetrics()` → `getMetrics(range)`
- [ ] Update `getMonthlyTrend()` to use database filtering
- [ ] Implement `getTimeSeries()` method
- [ ] Update `getPendingAmounts()` to accept custom date range
- [ ] Test with different date ranges

**Day 2: Dashboard API Integration** (4-6 hours)
- [ ] Update `/api/dashboard/route.ts` to use flexible methods
- [ ] Maintain backward compatibility (default to current month if no range)
- [ ] Add new endpoint `/api/metrics/time-series` for chart data
- [ ] Test with existing dashboard (zero regressions)

**Day 3: Testing & Performance** (4-6 hours)
- [ ] Unit tests for date range calculations
- [ ] Integration tests with different grouping intervals
- [ ] Performance testing with 1000+ entities
- [ ] Database query profiling (EXPLAIN ANALYZE)

**Files to Modify**:
- `lib/services/BusinessMetricsService.ts` (add methods, update signatures)
- `app/api/dashboard/route.ts` (use flexible methods)
- `app/api/metrics/time-series/route.ts` (new endpoint)

**Success Criteria**:
- ✅ All methods accept custom date ranges
- ✅ `getTimeSeries()` works with day/week/month/quarter/year grouping
- ✅ Performance <500ms for 1000 entities
- ✅ Zero regressions in existing dashboard

---

## Phase 2: Charts & Analytics Page (1-2 Days) 🎯 QUICK WIN

### Goal
Create rich, interactive visualizations using Recharts library

### Architecture

#### **2.1: Install Recharts**
```bash
npm install recharts
```

**Why Recharts**:
- ✅ React-native (built for React)
- ✅ TypeScript support
- ✅ Responsive by default
- ✅ Rich component library (Line, Bar, Area, Pie, Scatter, etc.)
- ✅ Interactive tooltips/legends
- ✅ 30KB gzipped (acceptable)

#### **2.2: Create Reusable Chart Components**

**`app/components/charts/TimeSeriesChart.tsx`**:
```typescript
interface TimeSeriesChartProps {
  data: TimeSeriesData[]
  metrics: ('revenue' | 'expenses' | 'profit')[]
  height?: number
}

export function TimeSeriesChart({ data, metrics, height = 400 }: TimeSeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Legend />
        {metrics.includes('revenue') && (
          <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Receita" />
        )}
        {metrics.includes('expenses') && (
          <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Despesas" />
        )}
        {metrics.includes('profit') && (
          <Line type="monotone" dataKey="profit" stroke="#3b82f6" name="Lucro" />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
```

**`app/components/charts/ExpenseBreakdownChart.tsx`**:
```typescript
export function ExpenseBreakdownChart({ data }: { data: ExpenseBreakdown }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={data.categories}
          dataKey="amount"
          nameKey="category"
          cx="50%"
          cy="50%"
          outerRadius={120}
          label={(entry) => `${entry.category}: ${entry.percentage}%`}
        >
          {data.categories.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(value)} />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

#### **2.3: Create Analytics Page**

**Route**: `/metricas` or `/analytics`

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│  📊 Métricas e Análises                                  │
├──────────────────────────────────────────────────────────┤
│  [Últimos 30 dias ▼] [Comparar com ▼] [Exportar PDF]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Evolução do Lucro (Últimos 6 meses)              │ │
│  │  [Line chart: Revenue, Expenses, Profit]          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │  Despesas por         │  │  Recebíveis Atrasados│  │
│  │  Categoria (Este Mês) │  │  (Aging Analysis)    │  │
│  │  [Pie chart]          │  │  [Funnel chart]      │  │
│  └───────────────────────┘  └───────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Lucratividade por Projeto (Top 10)              │ │
│  │  [Bar chart: Profit margin % per contract]        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// app/metricas/page.tsx
export default function MetricsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>(last30Days)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      const data = await fetch('/api/metrics/time-series', {
        method: 'POST',
        body: JSON.stringify({
          startDate: timeRange.startDate,
          endDate: timeRange.endDate,
          groupBy: 'month',
          metrics: ['revenue', 'expenses', 'profit']
        })
      }).then(r => r.json())

      setTimeSeries(data)
      setLoading(false)
    }

    fetchMetrics()
  }, [timeRange])

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto p-8">
        <h1>📊 Métricas e Análises</h1>

        {/* Time range selector */}
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />

        {/* Charts */}
        <div className="space-y-8">
          <Card title="Evolução do Lucro">
            <TimeSeriesChart
              data={timeSeries}
              metrics={['revenue', 'expenses', 'profit']}
            />
          </Card>

          <div className="grid grid-cols-2 gap-8">
            <Card title="Despesas por Categoria">
              <ExpenseBreakdownChart data={expenseBreakdown} />
            </Card>
            <Card title="Recebíveis Atrasados">
              <ReceivablesAgingChart data={aging} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Implementation Plan

**4 Hours: Setup & Core Charts**
- [ ] Install Recharts: `npm install recharts`
- [ ] Create `TimeSeriesChart` component
- [ ] Create `ExpenseBreakdownChart` component
- [ ] Create `/metricas` page with basic layout

**4 Hours: Integration & Polish**
- [ ] Fetch data from `/api/metrics/time-series`
- [ ] Add time range selector component
- [ ] Responsive design (mobile collapse to tabs)
- [ ] Loading states, error handling

**Files to Create**:
- `app/components/charts/TimeSeriesChart.tsx`
- `app/components/charts/ExpenseBreakdownChart.tsx`
- `app/components/charts/ReceivablesAgingChart.tsx`
- `app/components/TimeRangeSelector.tsx`
- `app/metricas/page.tsx`

**Success Criteria**:
- ✅ 3+ chart types working (line, pie, bar)
- ✅ Interactive tooltips/legends
- ✅ Responsive on mobile
- ✅ Loading <2s on typical data

---

## Phase 3: Customizable KPI Dashboard (3-4 Weeks) 🔮 MEDIUM-TERM

### Goal
Users can create personalized dashboards with drag-and-drop widgets

### Architecture

#### **3.1: Widget System**

**Widget Catalog**:
```typescript
interface Widget {
  id: string
  type: 'metric' | 'chart' | 'table' | 'alert'
  component: React.ComponentType<WidgetProps>
  config: WidgetConfig
  defaultSize: { w: number, h: number }
}

const AVAILABLE_WIDGETS: Widget[] = [
  // Metrics
  { type: 'metric', name: 'Receita Mensal', component: MonthRevenueWidget },
  { type: 'metric', name: 'Despesas Mensal', component: MonthExpensesWidget },

  // Charts
  { type: 'chart', name: 'Evolução do Lucro', component: ProfitTrendChart },
  { type: 'chart', name: 'Despesas por Categoria', component: ExpenseBreakdownChart },

  // Tables
  { type: 'table', name: 'Recebíveis Atrasados', component: OverdueReceivablesTable },

  // Alerts
  { type: 'alert', name: 'Alertas de Fluxo de Caixa', component: CashFlowAlerts }
]
```

#### **3.2: Layout Engine (React Grid Layout)**

```bash
npm install react-grid-layout
```

**Dashboard Configuration**:
```typescript
interface DashboardConfig {
  userId: string
  layouts: LayoutItem[]
}

interface LayoutItem {
  i: string           // Widget ID
  x: number           // Grid column (0-11)
  y: number           // Grid row
  w: number           // Width (columns)
  h: number           // Height (rows)
  widgetType: string  // "metric", "chart", etc.
  config: any         // Widget-specific config
}

// Example user dashboard
const userDashboard: DashboardConfig = {
  userId: "user123",
  layouts: [
    { i: "w1", x: 0, y: 0, w: 3, h: 2, widgetType: "metric", config: { metric: "monthRevenue" } },
    { i: "w2", x: 3, y: 0, w: 3, h: 2, widgetType: "metric", config: { metric: "monthExpenses" } },
    { i: "w3", x: 0, y: 2, w: 12, h: 4, widgetType: "chart", config: { type: "profitTrend", months: 6 } }
  ]
}
```

#### **3.3: Dashboard Builder UI**

**Features**:
- Drag-and-drop widget placement
- Resize widgets
- Add/remove widgets from catalog
- Save layouts to database (per user)
- Export/import dashboard configs

**Components**:
```typescript
// app/dashboard-builder/page.tsx
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'

export default function DashboardBuilder() {
  const [layout, setLayout] = useState<LayoutItem[]>([])
  const [widgetCatalogOpen, setWidgetCatalogOpen] = useState(false)

  async function saveLayout() {
    await fetch('/api/dashboard-config', {
      method: 'PUT',
      body: JSON.stringify({ layouts: layout })
    })
  }

  return (
    <div>
      <h1>Personalizar Dashboard</h1>

      <button onClick={() => setWidgetCatalogOpen(true)}>
        + Adicionar Widget
      </button>

      <GridLayout
        className="layout"
        layout={layout}
        onLayoutChange={(newLayout) => setLayout(newLayout)}
        cols={12}
        rowHeight={60}
        width={1200}
        isDraggable
        isResizable
      >
        {layout.map((item) => (
          <div key={item.i} className="widget-container">
            <WidgetRenderer config={item} />
            <button onClick={() => removeWidget(item.i)}>×</button>
          </div>
        ))}
      </GridLayout>

      <button onClick={saveLayout}>💾 Salvar Dashboard</button>

      <WidgetCatalog
        isOpen={widgetCatalogOpen}
        onClose={() => setWidgetCatalogOpen(false)}
        onSelectWidget={(widget) => addWidget(widget)}
      />
    </div>
  )
}
```

#### **3.4: State Persistence**

**Database Schema**:
```prisma
// prisma/schema.prisma
model DashboardConfig {
  id        String   @id @default(cuid())
  userId    String
  layouts   Json     // Array of LayoutItem
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
  @@unique([userId])
}
```

**API Endpoints**:
- `GET /api/dashboard-config` - Fetch user's dashboard layout
- `PUT /api/dashboard-config` - Save updated layout
- `POST /api/dashboard-config/reset` - Reset to default layout

### Implementation Plan

**Week 1: Widget System & Layout Engine** (5 days)
- Day 1-2: Install react-grid-layout, create widget system architecture
- Day 3-4: Build 5-10 reusable widgets (metrics, charts, tables)
- Day 5: Test drag-and-drop, resize, basic layouts

**Week 2: Dashboard Builder UI** (5 days)
- Day 1-2: Widget catalog modal, add/remove widgets
- Day 3-4: Save/load layouts from database
- Day 5: Polish, responsive design, error handling

**Week 3: Widget Catalog Expansion** (5 days)
- Day 1-2: Build 10+ additional widgets
- Day 3-4: Widget configuration UI (time ranges, metric selection)
- Day 5: Testing, performance optimization

**Week 4: Polish & Launch** (5 days)
- Day 1-2: User testing, feedback iteration
- Day 3-4: Documentation, help tooltips
- Day 5: Production deployment

**Success Criteria**:
- ✅ 20+ widgets available
- ✅ Drag-and-drop working smoothly
- ✅ Layouts persist per user
- ✅ Mobile-friendly (stacked layout on small screens)
- ✅ Performance <2s load time

---

## Phase 4: AI Agent Integration (6-8 Weeks) 🔮 LONG-TERM

### Goal
AI agents leverage metrics infrastructure for intelligent recommendations

### Architecture

#### **4.1: Agent-Accessible Metrics API**

**Standardized Interface**:
```typescript
// lib/services/BusinessMetricsService.ts

class BusinessMetricsService extends BaseService {
  // ... existing methods

  /**
   * Generic metric accessor for AI agents
   * Allows agents to request any metric by name with parameters
   */
  async getMetricByName(
    metricName: string,
    params?: Record<string, any>
  ): Promise<any> {
    const metricMap: Record<string, (params?: any) => Promise<any>> = {
      'month_metrics': (p) => this.getMetrics(p?.range || currentMonth),
      'time_series': (p) => this.getTimeSeries(p),
      'cash_flow_forecast': (p) => this.calculateCashFlowForecast(p?.days || 30),
      'receivables_aging': () => this.getReceivablesAging(),
      'project_profitability': (p) => this.getProjectProfitability(p?.contractId),
      'expense_breakdown': (p) => this.getExpenseBreakdown(p?.period || 'month')
    }

    const metricFn = metricMap[metricName]
    if (!metricFn) {
      throw new Error(`Unknown metric: ${metricName}`)
    }

    return await metricFn(params)
  }

  /**
   * List available metrics for agent discovery
   */
  getAvailableMetrics(): MetricDefinition[] {
    return [
      {
        name: 'cash_flow_forecast',
        description: 'Project cash flow for next 30/60/90 days',
        params: { days: 'number (30|60|90)' },
        returns: 'CashFlowForecast'
      },
      // ... all metrics
    ]
  }
}
```

#### **4.2: Financial Query Agent Enhancement**

**System Prompt Update**:
```typescript
const systemPrompt = `
You have access to BusinessMetricsService with the following metrics:

${metricsService.getAvailableMetrics().map(m =>
  `- ${m.name}: ${m.description}`
).join('\n')}

To use a metric, call getMetricByName(metricName, params).

Examples:
- "Qual meu fluxo de caixa nos próximos 60 dias?"
  → getMetricByName('cash_flow_forecast', { days: 60 })

- "Quais projetos estão dando prejuízo?"
  → getMetricByName('project_profitability')
     .filter(p => p.profit < 0)
`
```

**Tool Definition**:
```typescript
{
  query_metric: tool({
    description: 'Query business metrics and KPIs',
    inputSchema: z.object({
      metricName: z.string().describe('Metric to query (e.g., "cash_flow_forecast")'),
      params: z.any().optional().describe('Metric parameters')
    }),
    execute: async ({ metricName, params }) => {
      const metricsService = new BusinessMetricsService(context)
      return await metricsService.getMetricByName(metricName, params)
    }
  })
}
```

#### **4.3: Operations Agent Predictive Warnings**

**Enhancement**: Warn about cash flow impacts before creating expenses

**Implementation**:
```typescript
// In OperationsAgentService.executeServiceCall()

// Before creating expense, check cash flow impact
if (service === 'ExpenseService' && method === 'create') {
  const expenseAmount = params.amount
  const dueDate = params.dueDate

  // Calculate cash flow forecast
  const metricsService = new BusinessMetricsService(this.context)
  const forecast = await metricsService.calculateCashFlowForecast(90)

  // Check if expense creates cash gap
  const daysTillDue = Math.floor((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24))
  const projectedBalance = forecast.projectedBalances[`days${Math.min(daysTillDue, 90)}`]

  if (projectedBalance - expenseAmount < 0) {
    // Return warning to user
    return {
      warning: true,
      message: `⚠️ Esta despesa de ${formatCurrency(expenseAmount)} pode criar um gap de caixa em ${daysTillDue} dias. Saldo projetado: ${formatCurrency(projectedBalance)}. Deseja continuar?`
    }
  }
}

// Proceed with expense creation if user confirms
await serviceInstance[method](params)
```

#### **4.4: New Agent: Business Insights Agent**

**Purpose**: Proactive CFO-level strategic intelligence

**Capabilities**:
- Analyze profitability trends across projects
- Identify clients with declining revenue
- Detect expense category anomalies (spending spikes)
- Recommend pricing adjustments based on margins
- Predict cash flow shortages before they happen

**System Prompt**:
```typescript
const systemPrompt = `
You are a strategic financial advisor for an architecture firm.

You have access to:
1. BusinessMetricsService - All financial metrics and KPIs
2. Historical data - Trends over time
3. Industry benchmarks - Architecture firm standards

Your goal: Provide CFO-level strategic insights

Examples:
- "Your average project profit margin is 12%, industry avg is 18%. Recommend 15% fee increase."
- "Client 'João Silva' revenue down 40% this quarter. Risk of churn - schedule check-in."
- "Office supplies spending up 300% this month. Investigate Expense ID xyz123."
```

**Tool Access**:
```typescript
{
  analyze_metric: tool({
    description: 'Analyze a metric for trends, anomalies, and recommendations',
    inputSchema: z.object({
      metricName: z.string(),
      analysisType: z.enum(['trend', 'anomaly', 'benchmark', 'forecast'])
    }),
    execute: async ({ metricName, analysisType }) => {
      const metricsService = new BusinessMetricsService(context)
      const data = await metricsService.getMetricByName(metricName)

      // Perform analysis (trend detection, anomaly detection, etc.)
      return analyzeData(data, analysisType)
    }
  })
}
```

### Implementation Plan

**Weeks 1-2: Agent-Accessible API** (10 days)
- Implement `getMetricByName()` and `getAvailableMetrics()`
- Update Financial Query Agent with metric tool
- Test integration with existing queries

**Weeks 3-4: Operations Agent Enhancement** (10 days)
- Add cash flow forecast check before expense creation
- Implement warning system with user confirmation
- Test predictive warnings with various scenarios

**Weeks 5-6: Business Insights Agent** (10 days)
- Design agent architecture and system prompt
- Implement analysis tools (trend detection, anomaly detection)
- Build recommendation engine

**Weeks 7-8: Testing & Refinement** (10 days)
- User testing with all 3 enhanced agents
- Feedback iteration
- Performance optimization
- Production deployment

**Success Criteria**:
- ✅ Financial Query Agent uses metrics (not raw SQL)
- ✅ Operations Agent warns about cash gaps
- ✅ Business Insights Agent provides 3+ valuable recommendations/week
- ✅ <1s response time for metric queries

---

## Phase 5: ETL Pipeline for Scale (3-6 Months) 🔮 FUTURE

### Goal
Separate analytics database for fast, efficient queries at massive scale

### Architecture

#### **5.1: Problem Statement**

**Current Bottleneck (Projected)**: With 10,000+ entities per team
- Real-time Prisma queries become slow (>2s)
- Aggregation queries tax production database
- No pre-computed metrics or rollups
- Concurrent dashboard access causes DB load spikes

#### **5.2: ETL Solution Architecture**

**Separation of Concerns**:
```
┌─────────────────────────┐        ┌─────────────────────────┐
│  Production Database    │        │  Analytics Database     │
│  (PostgreSQL)           │        │  (PostgreSQL or         │
│                         │        │   ClickHouse)           │
│  - Contracts            │   ETL  │  - Pre-aggregated       │
│  - Receivables          │  ───→  │    metrics              │
│  - Expenses             │        │  - Time-series          │
│  - Users, Teams         │        │    rollups              │
│                         │        │  - Materialized views   │
│  (Normalized, OLTP)     │        │  (Denormalized, OLAP)   │
└─────────────────────────┘        └─────────────────────────┘
```

**ETL Pipeline**:
```typescript
// lib/etl/MetricsETL.ts

class MetricsETL {
  /**
   * Run nightly: Extract → Transform → Load
   * Pre-compute expensive aggregations
   */
  async runNightly() {
    console.log('[ETL] Starting nightly metrics aggregation...')

    // 1. Extract: Fetch all teams
    const teams = await prisma.team.findMany()

    for (const team of teams) {
      // 2. Transform: Calculate all metrics for this team
      const metricsService = new BusinessMetricsService({ teamId: team.id, ... })

      const metrics = {
        monthlyRevenue: await metricsService.getTimeSeries({ ... }),
        profitability: await metricsService.getProjectProfitability(),
        aging: await metricsService.getReceivablesAging(),
        // ... all metrics
      }

      // 3. Load: Store in analytics database
      await analyticsDB.metrics.upsert({
        where: { teamId: team.id, date: today },
        create: { teamId: team.id, date: today, data: metrics },
        update: { data: metrics }
      })
    }

    console.log('[ETL] Nightly aggregation complete ✓')
  }

  /**
   * Run hourly: Incremental updates for real-time-ish data
   */
  async runHourly() {
    // Update only changed data in last hour
    const since = new Date(Date.now() - 3600000) // 1 hour ago

    const changedContracts = await prisma.contract.findMany({
      where: { updatedAt: { gte: since } }
    })

    // Invalidate affected team metrics
    for (const contract of changedContracts) {
      await analyticsDB.invalidateTeamCache(contract.teamId)
    }
  }
}
```

**Analytics Database Schema**:
```prisma
// prisma/schema-analytics.prisma

model TeamMetrics {
  id        String   @id @default(cuid())
  teamId    String
  date      DateTime // Date of snapshot
  metrics   Json     // Pre-computed metrics object
  createdAt DateTime @default(now())

  @@unique([teamId, date])
  @@index([teamId, date])
}

model TimeSeriesRollup {
  id        String   @id @default(cuid())
  teamId    String
  period    String   // "2024-07-15", "2024-W30", "Jul 2024"
  granularity String // "day", "week", "month"
  revenue   Float
  expenses  Float
  profit    Float

  @@unique([teamId, period, granularity])
  @@index([teamId, granularity, period])
}
```

**Dashboard Query**:
```typescript
// Fast: Query pre-computed metrics from analytics DB
const dashboard = await analyticsDB.teamMetrics.findUnique({
  where: { teamId_date: { teamId, date: today } }
})

// Fallback: If not found, compute real-time (and trigger ETL)
if (!dashboard) {
  const metricsService = new BusinessMetricsService(context)
  dashboard = await metricsService.getAllMetrics()
  await analyticsDB.teamMetrics.create({ teamId, date: today, data: dashboard })
}
```

#### **5.3: Cron Jobs**

**Nightly Aggregation** (2 AM UTC):
```typescript
// lib/etl/cron.ts
import cron from 'node-cron'

// Every day at 2 AM UTC
cron.schedule('0 2 * * *', async () => {
  const etl = new MetricsETL()
  await etl.runNightly()
})
```

**Hourly Incremental Updates**:
```typescript
// Every hour at :05 past the hour
cron.schedule('5 * * * *', async () => {
  const etl = new MetricsETL()
  await etl.runHourly()
})
```

#### **5.4: Technology Options**

**Option A: PostgreSQL (Same DB, Separate Schema)** 👍 RECOMMENDED
- ✅ No new infrastructure
- ✅ Transactions across prod + analytics
- ✅ Familiar tooling (Prisma)
- ⚠️ Shared resources (need read replicas at massive scale)

**Option B: ClickHouse (Separate OLAP Database)**
- ✅ Optimized for analytics (columnar storage)
- ✅ Blazing fast aggregations
- ✅ Handles billions of rows
- ❌ New infrastructure to manage
- ❌ Eventual consistency (not real-time)

**Option C: Materialized Views (PostgreSQL Feature)**
- ✅ Built-in PostgreSQL feature
- ✅ Auto-updated on data change
- ✅ Simple to implement
- ⚠️ Refresh can be slow on large datasets

**Recommendation**: Start with **Materialized Views** (Option C), migrate to **Separate Schema** (Option A) if needed, consider **ClickHouse** (Option B) only at 100,000+ entities scale.

### Implementation Plan

**Month 1-2: Design & Prototype** (8 weeks)
- Week 1-2: Design analytics schema, define metrics to pre-compute
- Week 3-4: Build ETL pipeline prototype (nightly aggregation)
- Week 5-6: Test with production-like data volumes
- Week 7-8: Performance benchmarking, optimization

**Month 3-4: Production Implementation** (8 weeks)
- Week 1-2: Deploy analytics database (separate schema)
- Week 3-4: Implement cron jobs (nightly + hourly)
- Week 5-6: Update dashboard to query analytics DB
- Week 7-8: Monitoring, alerting, fallback mechanisms

**Month 5-6: Refinement & Scale Testing** (8 weeks)
- Week 1-2: Load testing with 100,000+ entities
- Week 3-4: Query optimization, indexing strategy
- Week 5-6: Implement read replicas if needed
- Week 7-8: Documentation, runbooks for ops team

**Success Criteria**:
- ✅ Dashboard load <500ms (from analytics DB)
- ✅ Supports 100,000+ entities per team
- ✅ ETL completes in <1 hour nightly
- ✅ 99.9% uptime for analytics queries

---

## Implementation Priorities

### 🎯 Priority 1: Do Now (Next Sprint)
**Phase 1: Scalable Metrics Refactor** (2-3 days)
- Unblocks all future phases
- Foundation for analytics features
- Improves performance for large datasets

### 🎯 Priority 2: Quick Win (Following Sprint)
**Phase 2: Charts & Analytics Page** (1-2 days)
- High user value, low effort
- Leverages Phase 1 flexible metrics
- No architectural complexity

### 📊 Priority 3: Medium-Term (Q1 2026)
**Phase 3: Customizable Dashboard** (3-4 weeks)
- Major feature, requires user testing
- Depends on Phase 1 & 2 complete
- Competitive advantage

### 🤖 Priority 4: Long-Term (Q2 2026)
**Phase 4: AI Agent Integration** (6-8 weeks)
- Strategic enhancement
- Requires mature metrics infrastructure
- Differentiating AI capabilities

### 🚀 Priority 5: Scale (Q3-Q4 2026)
**Phase 5: ETL Pipeline** (3-6 months)
- Only needed at massive scale (10,000+ entities/team)
- Defer until performance requires it
- Significant engineering investment

---

## Decision Summary

### ✅ Key Decisions Made

**Decision 1: Progressive Enhancement Strategy** ✅
- Start with flexible metrics (Phase 1)
- Add visualizations (Phase 2)
- Build customization (Phase 3)
- Enable AI intelligence (Phase 4)
- Scale with ETL (Phase 5)

**Rationale**: Deliver value incrementally, validate each phase before investing in next

**Decision 2: Recharts for Visualization** ✅
- React-native, TypeScript, responsive
- Rich component library
- 30KB bundle size (acceptable)

**Rationale**: Best balance of features, performance, developer experience

**Decision 3: Database-Level Aggregation** ✅
- Push filtering to Prisma/PostgreSQL
- Use `aggregate()` and `groupBy()`
- Add indexes when needed

**Rationale**: Scalable from day 1, no architectural rework needed

**Decision 4: Agent-First API Design** ✅
- `getMetricByName(metricName, params)` interface
- Standardized for LLM tool calls
- Self-documenting with `getAvailableMetrics()`

**Rationale**: AI agents are first-class consumers of metrics API

**Decision 5: Defer ETL Until Needed** ✅
- Phase 1-4 handle up to 10,000 entities/team
- Materialized views sufficient for mid-scale
- Full ETL only at massive scale

**Rationale**: Avoid premature optimization, focus on user value first

---

## Success Metrics

### Phase 1: Scalable Metrics Refactor
- ✅ All methods accept custom date ranges
- ✅ `getTimeSeries()` supports 5 grouping intervals
- ✅ Query performance <500ms for 1000 entities
- ✅ Zero regressions in dashboard

### Phase 2: Charts & Analytics
- ✅ 3+ chart types implemented (line, pie, bar)
- ✅ `/metricas` page with 5+ visualizations
- ✅ Page load <2s
- ✅ User engagement (30%+ users visit /metricas monthly)

### Phase 3: Customizable Dashboard
- ✅ 20+ widgets available
- ✅ Drag-and-drop working smoothly
- ✅ Layouts persist per user
- ✅ User adoption (10%+ customize dashboard)

### Phase 4: AI Agent Integration
- ✅ Financial Query Agent uses metrics API
- ✅ Operations Agent warns about cash gaps (5+ warnings/month)
- ✅ Business Insights Agent generates recommendations
- ✅ <1s metric query response time

### Phase 5: ETL Pipeline
- ✅ Dashboard load <500ms (from analytics DB)
- ✅ Supports 100,000+ entities per team
- ✅ ETL completes <1 hour nightly
- ✅ 99.9% uptime for analytics

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Phase 1 performance regression** | LOW | HIGH | Benchmark before/after, database profiling |
| **Recharts bundle size** | LOW | MEDIUM | Code splitting, lazy loading |
| **User adoption of customization** | MEDIUM | MEDIUM | Simple defaults, guided onboarding |
| **AI agent accuracy** | MEDIUM | HIGH | Comprehensive testing, user feedback loop |
| **ETL complexity** | MEDIUM | HIGH | Defer until needed, start simple (materialized views) |
| **Scope creep** | HIGH | MEDIUM | Phased approach, clear priorities, ship incrementally |

---

## Open Questions

1. **Phase 2 Chart Library**: Recharts confirmed, but evaluate alternatives if issues?
   - **Decision**: Recharts, fallback to Chart.js if needed

2. **Phase 3 Mobile UX**: Drag-and-drop on mobile - stacked layout or simplified?
   - **Decision**: TBD during Phase 3 prototyping

3. **Phase 4 Agent Recommendations**: How often should Insights Agent run?
   - **Decision**: TBD, likely weekly scheduled + on-demand

4. **Phase 5 Database Choice**: PostgreSQL separate schema vs ClickHouse?
   - **Decision**: Start with materialized views, evaluate based on scale

---

## References

### Internal Documentation
- ADR-014: Dashboard Strategy & Metrics (current state)
- ADR-008: AI Agent Strategy (Financial Query, Operations agents)
- ADR-006: Service Layer Migration (BaseService pattern)

### Technical Resources
- Recharts Documentation: https://recharts.org/
- React Grid Layout: https://github.com/react-grid-layout/react-grid-layout
- Prisma Aggregation: https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing
- ClickHouse OLAP: https://clickhouse.com/

### Code References
- Current Metrics: `lib/services/BusinessMetricsService.ts`
- Dashboard: `app/page.tsx`, `app/api/dashboard/route.ts`
- Financial Query Agent: `lib/services/FinancialQueryService.ts`
- Operations Agent: `lib/services/OperationsAgentService.ts`

---

**Status**: Strategic planning complete (2025-10-09)
**Next Action**: Begin Phase 1 implementation (Scalable Metrics Refactor)
**Owner**: Engineering + Product
**Estimated Timeline**: Phase 1-2 (1 month), Phase 3 (3 months), Phase 4 (6 months), Phase 5 (12 months)

---

## Appendix: Future Enhancements (Beyond Phase 5)

### Real-Time Analytics
- WebSocket updates for live dashboard
- Redis pub/sub for metric invalidation
- Server-Sent Events for long-running queries

### Machine Learning
- Revenue forecasting with ML models
- Anomaly detection (spending spikes, churn risk)
- Client lifetime value prediction
- Project profitability prediction

### Advanced Visualizations
- Interactive waterfall charts (cash flow)
- Sankey diagrams (money flow)
- Heat maps (project profitability matrix)
- Network graphs (client relationships)

### Export & Reporting
- PDF report generation (automated monthly reports)
- Excel export with formatting
- Shareable dashboard links (public/private)
- Email digest (weekly metrics summary)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-09
**Review Cycle**: Quarterly (after each phase completion)
