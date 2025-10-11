---
title: "Business Metrics Service Reference"
type: "reference"
audience: ["developer", "agent"]
contexts: ["business-metrics", "dashboard", "analytics", "service-layer", "financial-intelligence"]
complexity: "intermediate"
last_updated: "2025-10-08"
version: "1.0"
agent_roles: ["dashboard-developer", "analytics-engineer", "ai-agent"]
related:
  - ../developer/architecture/overview.md
  - ../developer/services/service-layer-guide.md
dependencies: ["service-layer", "prisma", "team-context"]
---

# Business Metrics Service Reference

Centralized service providing reusable financial metrics calculations for dashboard, AI agents, and reports.

## Context for LLM Agents

**Scope**: Complete reference for all available business metrics in the system
**Prerequisites**: Understanding of service layer patterns, team-based isolation, financial concepts
**Key Patterns**:
- All metrics are team-scoped by default
- Methods return typed interfaces for type safety
- Designed for reusability across dashboard, AI agents, and exports
- No caching in current implementation (add later if needed)

## Overview

The `BusinessMetricsService` provides a single source of truth for all business intelligence calculations in ArqCashflow. It extracts complex metric logic from API routes into testable, reusable methods.

**Location**: `lib/services/BusinessMetricsService.ts`

**Design Principles**:
- ✅ Single source of truth for metrics
- ✅ Team-scoped security by default
- ✅ Type-safe interfaces
- ✅ Comprehensive unit test coverage
- ✅ Optimized with parallel execution where possible

## Quick Start

```typescript
import { BusinessMetricsService } from '@/lib/services/BusinessMetricsService'

// In an API route with team context
export async function GET(request: NextRequest) {
  return withTeamContext(async (context) => {
    const metricsService = new BusinessMetricsService(context)

    // Get month metrics
    const metrics = await metricsService.getMonthMetrics()

    return { metrics }
  })
}
```

## Available Metrics

### Phase 1 & 2: Core Dashboard Metrics (Available Now)

#### 1. `getMonthMetrics()` - Monthly Financial Summary

Returns current month revenue, expenses, profit, and contract counts.

**Signature**:
```typescript
async getMonthMetrics(): Promise<MonthMetrics>
```

**Returns**:
```typescript
interface MonthMetrics {
  thisMonthRevenue: number        // Sum of received receivables this month
  thisMonthExpenses: number        // Sum of paid expenses this month
  thisMonthProfit: number          // Revenue - Expenses for this month
  totalProfit: number              // All-time profit (total received - total paid)
  activeContracts: number          // Count of contracts with status='active'
  totalContracts: number           // Total count of all contracts
}
```

**Example Usage**:
```typescript
const metrics = await metricsService.getMonthMetrics()
console.log(`This month profit: R$ ${metrics.thisMonthProfit.toFixed(2)}`)
console.log(`Active contracts: ${metrics.activeContracts}`)
```

**Business Logic**:
- Revenue calculated from receivables with `status='received'` and `receivedDate` within current month
- Uses `receivedAmount` if available, otherwise falls back to `amount`
- Expenses calculated from expenses with `status='paid'` and `paidDate` within current month
- Uses `paidAmount` if available, otherwise falls back to `amount`

---

#### 2. `getPendingAmounts(days?)` - Outstanding Financial Commitments

Returns pending receivables and expenses within specified time horizon.

**Signature**:
```typescript
async getPendingAmounts(days: number = 90): Promise<PendingAmounts>
```

**Parameters**:
- `days` (optional): Time horizon in days (default: 90)

**Returns**:
```typescript
interface PendingAmounts {
  pendingReceivables: number       // Sum of unpaid receivables (due within N days)
  pendingExpenses: number          // Sum of unpaid expenses (due within N days)
  horizon: number                  // Number of days used for calculation
}
```

**Example Usage**:
```typescript
// Get pending amounts for next 90 days (default)
const pending = await metricsService.getPendingAmounts()

// Get pending amounts for next 30 days
const shortTerm = await metricsService.getPendingAmounts(30)

console.log(`Pending to receive (90 days): R$ ${pending.pendingReceivables}`)
console.log(`Pending to pay (90 days): R$ ${pending.pendingExpenses}`)
```

**Business Logic**:
- Filters receivables with `status='pending'` and `expectedDate` between today and (today + N days)
- Filters expenses with `status='pending'` and `dueDate` between today and (today + N days)
- Excludes overdue items (use `getOverdueAnalysis()` for those)

---

#### 3. `getOverdueAnalysis()` - Critical Alerts and Risk Assessment

Returns detailed analysis of overdue receivables and expenses.

**Signature**:
```typescript
async getOverdueAnalysis(): Promise<OverdueAnalysis>
```

**Returns**:
```typescript
interface OverdueAnalysis {
  overdueReceivablesAmount: number // Total overdue receivables
  overdueExpensesAmount: number    // Total overdue expenses
  overdueReceivables: number       // Count of overdue receivables
  overdueExpenses: number          // Count of overdue expenses
  overdueItems: OverdueItem[]      // List of overdue items with details
}

interface OverdueItem {
  type: 'receivable' | 'expense'
  id: string
  description: string              // User-friendly description
  dueDate: string                  // ISO date string
  amount: number
  entityType: 'receivable' | 'expense'
  entityId: string
  entityData?: any                 // Full entity data for detailed views
}
```

**Example Usage**:
```typescript
const analysis = await metricsService.getOverdueAnalysis()

if (analysis.overdueReceivables > 0) {
  console.log(`⚠️ ${analysis.overdueReceivables} overdue receivables`)
  console.log(`Total overdue: R$ ${analysis.overdueReceivablesAmount}`)

  analysis.overdueItems
    .filter(item => item.type === 'receivable')
    .forEach(item => {
      console.log(`- ${item.description} (${item.dueDate})`)
    })
}
```

**Business Logic**:
- Receivables: `status='pending'` AND `expectedDate < today`
- Expenses: `status='pending'` AND `dueDate < today`
- Includes contract relations for receivables (for client name display)
- Description format for receivables: "Receber R$X de [ClientName]"
- Description format for expenses: "Pagar R$X - [Description]"

---

#### 4. `getCashFlowHealth()` - Financial Health Status

Assesses overall cash flow health based on overdue items and monthly profit.

**Signature**:
```typescript
async getCashFlowHealth(): Promise<CashFlowHealth>
```

**Returns**:
```typescript
interface CashFlowHealth {
  status: 'good' | 'warning' | 'critical'
  message: string                  // Localized Portuguese message
}
```

**Example Usage**:
```typescript
const health = await metricsService.getCashFlowHealth()

const statusEmoji = {
  good: '✅',
  warning: '⚠️',
  critical: '🔴'
}

console.log(`${statusEmoji[health.status]} ${health.message}`)
```

**Business Logic** (in priority order):

1. **CRITICAL**: Any overdue items exist
   - Message: "\{N\} itens em atraso precisam de atenção"

2. **WARNING**: Negative profit this month
   - Message: "Despesas superiores à receita este mês"

3. **WARNING**: More pending expenses than receivables
   - Message: "Mais dinheiro a pagar do que a receber"

4. **GOOD**: All indicators healthy
   - Message: "Fluxo de caixa saudável"

**Dependencies**:
- Calls `getOverdueAnalysis()` for overdue check
- Calls `getMonthMetrics()` for profit check
- Calls `getPendingAmounts(90)` for balance check

---

#### 5. `getUpcomingItems(days?)` - Near-Term Cash Flow Visibility

Returns upcoming receivables and expenses within next N days.

**Signature**:
```typescript
async getUpcomingItems(days: number = 7): Promise<UpcomingItems>
```

**Parameters**:
- `days` (optional): Time window in days (default: 7)

**Returns**:
```typescript
interface UpcomingItems {
  receivables: UpcomingReceivable[]
  expenses: UpcomingExpense[]
  days: number                     // Time window used
}

interface UpcomingReceivable {
  id: string
  client: string
  project: string
  amount: number
  expectedDate: string             // ISO date string
  entityType: 'receivable'
  entityId: string
}

interface UpcomingExpense {
  id: string
  description: string
  vendor: string | null
  amount: number
  dueDate: string                  // ISO date string
  entityType: 'expense'
  entityId: string
}
```

**Example Usage**:
```typescript
// Get next 7 days (default)
const upcoming = await metricsService.getUpcomingItems()

// Get next 14 days
const twoWeeks = await metricsService.getUpcomingItems(14)

console.log(`Next ${upcoming.days} days:`)
upcoming.receivables.forEach(r => {
  console.log(`📥 Receive R$ ${r.amount} from ${r.client} on ${r.expectedDate}`)
})

upcoming.expenses.forEach(e => {
  console.log(`📤 Pay R$ ${e.amount} - ${e.description} on ${e.dueDate}`)
})
```

**Business Logic**:
- **Receivables**: `status='pending'`, NOT overdue, `expectedDate` within next N days
- **Expenses**: `status='pending'`, NOT overdue, `dueDate` within next N days
- Sorted by date (earliest first)
- Limited to 5 items per type (top 5 soonest)
- Includes contract relations for receivables (for client/project names)

---

#### 6. `getMonthlyTrend(months?)` - Historical Performance Analysis

Returns last N months of revenue, expenses, and profit data.

**Signature**:
```typescript
async getMonthlyTrend(months: number = 6): Promise<MonthlyTrendData[]>
```

**Parameters**:
- `months` (optional): Number of months to include (default: 6)

**Returns**:
```typescript
interface MonthlyTrendData {
  month: string                    // Formatted as "jan 2025" (Portuguese)
  revenue: number
  expenses: number
  profit: number                   // revenue - expenses
}
```

**Example Usage**:
```typescript
// Get last 6 months (default)
const trend = await metricsService.getMonthlyTrend()

// Get last 12 months
const yearTrend = await metricsService.getMonthlyTrend(12)

// Chart data ready to use
trend.forEach(month => {
  console.log(`${month.month}: R$ ${month.profit.toFixed(2)} profit`)
})
```

**Visualization Example**:
```jsx
// Use directly in chart libraries (Recharts)
<LineChart data={trend}>
  <Line dataKey="revenue" stroke="#10b981" />
  <Line dataKey="expenses" stroke="#ef4444" />
  <Line dataKey="profit" stroke="#3b82f6" />
</LineChart>
```

**Business Logic**:
- Calculates data for each of the last N months
- Revenue: Sum of receivables with `status='received'` and `receivedDate` within month
- Expenses: Sum of expenses with `status='paid'` and `paidDate` within month
- Returns array ordered from oldest to newest month
- Month names formatted in Portuguese using `toLocaleDateString('pt-BR')`

---

### Phase 3: Advanced Metrics (Planned)

These metrics are designed but not yet implemented. Documentation serves as specification.

#### `calculateCashFlowForecast(days)` - Predictive Cash Flow

**Purpose**: Project future cash flow based on pending items and historical patterns.

**Planned Return**:
```typescript
interface CashFlowForecast {
  projectedBalance: number[]       // Daily balance projections
  cashGaps: CashGap[]             // Periods with negative balance
  inflows: CashFlow[]             // Expected incoming payments
  outflows: CashFlow[]            // Expected outgoing payments
  daysAnalyzed: number
}
```

**Use Cases**:
- Identify upcoming cash shortfalls
- Plan financing needs
- Optimize payment timing

---

#### `getReceivablesAging()` - Collections Intelligence

**Purpose**: Analyze receivables by aging buckets for collection prioritization.

**Planned Return**:
```typescript
interface ReceivablesAging {
  buckets: {
    current: number              // 0-30 days
    thirtyDays: number          // 31-60 days
    sixtyDays: number           // 61-90 days
    ninetyPlus: number          // 90+ days
  }
  dso: number                    // Days Sales Outstanding
  totalOutstanding: number
}
```

**Use Cases**:
- Prioritize collection efforts
- Measure collection efficiency
- Identify problematic clients

---

#### `getProjectProfitability(contractId?)` - Project Performance

**Purpose**: Calculate profit margin per project/contract.

**Planned Return**:
```typescript
interface ProjectProfitability {
  contractId: string
  projectName: string
  clientName: string
  revenue: number
  expenses: number
  profit: number
  profitMargin: number           // Percentage
}
```

**Use Cases**:
- Identify most profitable projects
- Set better pricing
- Resource allocation decisions

---

#### `getExpenseBreakdown(period)` - Spending Analysis

**Purpose**: Break down expenses by category for budget analysis.

**Planned Return**:
```typescript
interface ExpenseBreakdown {
  period: 'month' | 'quarter' | 'year'
  categories: {
    name: string
    amount: number
    percentage: number
    count: number
  }[]
  total: number
}
```

**Use Cases**:
- Budget planning
- Cost reduction opportunities
- Category-level insights

---

#### `getClientRevenueRanking(limit?)` - Client Value Analysis

**Purpose**: Rank clients by revenue to identify key accounts.

**Planned Return**:
```typescript
interface ClientRevenue {
  clientName: string
  totalRevenue: number
  contractCount: number
  averageContractValue: number
  concentrationRisk: number      // Percentage of total revenue
}
```

**Use Cases**:
- Identify top clients
- Assess client concentration risk
- Account management priorities

---

## Integration Examples

### Dashboard API Route

```typescript
// app/api/dashboard/route.ts
import { NextRequest } from 'next/server'
import { withTeamContext } from '@/lib/middleware/team-context'
import { BusinessMetricsService } from '@/lib/services/BusinessMetricsService'

export async function GET(request: NextRequest) {
  return withTeamContext(async (context) => {
    const metricsService = new BusinessMetricsService(context)

    // Fetch all metrics in parallel for performance
    const [monthMetrics, pendingAmounts, overdueAnalysis, cashFlowHealth, upcomingItems, monthlyTrend] =
      await Promise.all([
        metricsService.getMonthMetrics(),
        metricsService.getPendingAmounts(90),
        metricsService.getOverdueAnalysis(),
        metricsService.getCashFlowHealth(),
        metricsService.getUpcomingItems(7),
        metricsService.getMonthlyTrend(6)
      ])

    return {
      metrics: { ...monthMetrics, ...pendingAmounts, ...overdueAnalysis },
      cashFlowHealth,
      upcoming: upcomingItems,
      monthlyTrend
    }
  })
}
```

### AI Agent Integration

```typescript
// Example: Financial Query Agent using metrics
import { BusinessMetricsService } from '@/lib/services/BusinessMetricsService'

async function answerFinancialQuestion(question: string, context: ServiceContext) {
  const metricsService = new BusinessMetricsService(context)

  if (question.includes('lucro') || question.includes('profit')) {
    const metrics = await metricsService.getMonthMetrics()
    return `Seu lucro este mês foi de R$ ${metrics.thisMonthProfit.toFixed(2)}`
  }

  if (question.includes('atrasado') || question.includes('overdue')) {
    const overdue = await metricsService.getOverdueAnalysis()
    return `Você tem ${overdue.overdueReceivables} recebíveis atrasados totalizando R$ ${overdue.overdueReceivablesAmount.toFixed(2)}`
  }

  // ... more intelligent responses using metrics
}
```

### Export Service Integration

```typescript
// Example: Excel export with business metrics
import { BusinessMetricsService } from '@/lib/services/BusinessMetricsService'
import ExcelJS from 'exceljs'

async function generateFinancialReport(context: ServiceContext) {
  const metricsService = new BusinessMetricsService(context)

  const [monthMetrics, trend] = await Promise.all([
    metricsService.getMonthMetrics(),
    metricsService.getMonthlyTrend(12)
  ])

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Financial Report')

  // Add summary metrics
  sheet.addRow(['This Month Revenue', monthMetrics.thisMonthRevenue])
  sheet.addRow(['This Month Expenses', monthMetrics.thisMonthExpenses])
  sheet.addRow(['This Month Profit', monthMetrics.thisMonthProfit])

  // Add trend data
  sheet.addRow([])
  sheet.addRow(['Month', 'Revenue', 'Expenses', 'Profit'])
  trend.forEach(month => {
    sheet.addRow([month.month, month.revenue, month.expenses, month.profit])
  })

  return workbook
}
```

## Performance Considerations

### Parallel Execution

When fetching multiple metrics, always use `Promise.all` for better performance:

```typescript
// ❌ BAD: Sequential execution (slower)
const metrics = await metricsService.getMonthMetrics()
const pending = await metricsService.getPendingAmounts()
const overdue = await metricsService.getOverdueAnalysis()

// ✅ GOOD: Parallel execution (faster)
const [metrics, pending, overdue] = await Promise.all([
  metricsService.getMonthMetrics(),
  metricsService.getPendingAmounts(),
  metricsService.getOverdueAnalysis()
])
```

### Caching Strategy

Currently, no caching is implemented. If performance becomes an issue:

**Potential caching approaches**:
1. In-memory caching with TTL (5-10 minutes)
2. Redis caching for multi-instance deployments
3. Request-level caching (cache for duration of single request)

**Recommended caching candidates**:
- `getMonthlyTrend()` - Historical data rarely changes
- `getMonthMetrics()` - Can cache for 5-10 minutes
- `getOverdueAnalysis()` - Real-time critical, avoid caching

## Testing

### Unit Tests

Comprehensive unit tests are available in:
`lib/services/__tests__/BusinessMetricsService.test.ts`

**Test coverage includes**:
- All 6 implemented metrics methods
- Edge cases (empty data, zero values)
- Business logic validation
- Team scoping verification
- Mock data scenarios

### Integration Testing

To test metrics in a real environment:

```typescript
// test-metrics.ts
import { BusinessMetricsService } from '@/lib/services/BusinessMetricsService'
import { createServiceContext } from '@/lib/test-utils'

async function testMetrics() {
  const context = await createServiceContext('team-id-here')
  const metricsService = new BusinessMetricsService(context)

  const metrics = await metricsService.getMonthMetrics()
  console.log('Month Metrics:', metrics)

  const health = await metricsService.getCashFlowHealth()
  console.log('Cash Flow Health:', health)
}

testMetrics()
```

## Related Documentation

- [Architecture Overview](../developer/architecture/overview.md) - System architecture
- [Dashboard API](../reference/api/dashboard.md) - Dashboard API documentation

<!-- TODO: Add links when these docs are created:
- Service Layer Guide - Service architecture patterns
- Team Context Middleware - Team isolation patterns
-->

---

*This service provides the foundation for all business intelligence in ArqCashflow. All metrics are team-scoped, type-safe, and thoroughly tested.*
