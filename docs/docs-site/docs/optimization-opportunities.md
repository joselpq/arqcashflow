---
title: "Code Optimization Opportunities"
type: "reference"
audience: ["developer", "agent"]
contexts: ["code-quality", "refactoring", "technical-debt"]
complexity: "intermediate"
last_updated: "2025-01-03"
version: "1.0"
status: "reference"
related:
  - decisions/012-operations-agent-incremental-rebuild.md
  - BACKLOG.md
---

# Code Optimization Opportunities

## Context for LLM Agents

**Purpose**: Track potential code improvements discovered during iterative development
**Scope**: Operations Agent implementation (Steps 1-4)
**Status**: Reference only - NOT immediate priorities
**When to Use**: Consider these for future "Polish and Production" phase (potential Step 11)

## Overview

During Steps 1-4 of the Operations Agent rebuild, we prioritized **working code over perfect code** following the incremental approach from ADR-012. This document captures optimization opportunities discovered through iteration.

**Key Principle**: "Make it work, make it right, make it fast" - we're at "make it work" ✅

---

## 🎯 High-Impact Optimizations

### 1. System Prompt Organization

**Current State** (lines 39-300 in OperationsAgentService.ts):
- ~260 lines of inline system prompt
- Mix of schema documentation, rules, examples, workflows
- Built incrementally through bug fixes
- Works perfectly but could be more maintainable

**Opportunity**:
```typescript
// Current: Inline template literal
const systemPrompt = `
  Você é um assistente...
  [260 lines of prompt]
`

// Potential: Modular prompt composition
const systemPrompt = composePrompt({
  role: OPERATIONS_AGENT_ROLE,
  schemas: DATABASE_SCHEMAS,
  apis: API_DOCUMENTATION,
  rules: OPERATIONAL_RULES,
  examples: EXAMPLE_INTERACTIONS,
  workflows: WORKFLOW_PATTERNS
})
```

**Benefits**:
- Easier to test individual prompt sections
- Better reusability across agents
- Cleaner version control diffs
- Easier to A/B test prompt variations

**Effort**: Medium (2-3 hours)
**Risk**: Low (just refactoring, same output)
**Priority**: Nice-to-have (current approach is working fine)

---

### 2. Multi-JSON Parser Simplification

**Current State** (lines 340-400):
- Custom brace-counting algorithm
- Handles nested objects correctly
- ~60 lines of parsing logic
- Works reliably but complex

**Context**: Built to handle Claude's multiple JSON outputs in single response

**Opportunity**:
```typescript
// Current: Custom parser with brace counting
let braceCount = 0
for (let i = jsonStart; i < responseText.length; i++) {
  if (responseText[i] === '{') braceCount++
  if (responseText[i] === '}') {
    braceCount--
    if (braceCount === 0) { /* found complete JSON */ }
  }
}

// Potential: Use JSON streaming parser library
import { JSONParser } from '@streamparser/json'
const parser = new JSONParser()
const actions = parser.parseChunked(responseText)
```

**Benefits**:
- Less custom code to maintain
- Battle-tested parsing logic
- Handles edge cases automatically

**Tradeoffs**:
- New dependency (adds ~50KB)
- Might be overkill for simple use case
- Current implementation is well-tested

**Effort**: Low (1 hour)
**Risk**: Low (can keep fallback)
**Priority**: Low (current works well, "if it ain't broke...")

---

### 3. Service Map Scalability

**Current State** (line 512):
```typescript
const serviceMap: Record<string, any> = {
  ExpenseService: this.expenseService
  // Step 5 will add: ContractService, ReceivableService, RecurringExpenseService
}
```

**Opportunity** (when reaching 4+ services):
```typescript
// Option A: Auto-registration pattern
class OperationsAgentService {
  private services: Map<string, BaseService>

  constructor(context: ServiceContext) {
    this.services = new Map([
      ['ExpenseService', new ExpenseService(context)],
      ['ContractService', new ContractService(context)],
      ['ReceivableService', new ReceivableService(context)],
      ['RecurringExpenseService', new RecurringExpenseService(context)]
    ])
  }

  private getService(name: string): BaseService {
    const service = this.services.get(name)
    if (!service) throw new Error(`Service ${name} not found`)
    return service
  }
}

// Option B: Service registry pattern (if services grow to 10+)
class ServiceRegistry {
  static register(name: string, factory: (ctx: ServiceContext) => BaseService) {
    // ...
  }
  static get(name: string, ctx: ServiceContext): BaseService {
    // ...
  }
}
```

**Benefits**:
- Cleaner addition of new services
- Type-safe service access
- Easier to mock for testing

**When to Consider**: After Step 5 (when we have 4 services)
**Effort**: Medium (2 hours)
**Priority**: Medium (will become valuable at scale)

---

### 4. Error Response Formatting

**Current State**: Error messages scattered across try/catch blocks
```typescript
catch (error) {
  console.error('[Operations] Query error:', error)
  return {
    success: false,
    message: `❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    // ...
  }
}
```

**Opportunity**:
```typescript
// Centralized error formatter
class OperationsErrorFormatter {
  static format(error: unknown, context: string): string {
    if (error instanceof PrismaClientKnownRequestError) {
      return this.formatPrismaError(error, context)
    }
    if (error instanceof Error) {
      return `❌ Erro ao ${context}: ${error.message}`
    }
    return `❌ Erro desconhecido ao ${context}`
  }

  private static formatPrismaError(error: PrismaClientKnownRequestError, context: string): string {
    switch (error.code) {
      case 'P2010': return '❌ Query inválida. Verifique os nomes das colunas.'
      case 'P2025': return '❌ Registro não encontrado.'
      // etc.
    }
  }
}

// Usage
catch (error) {
  console.error('[Operations] Query error:', error)
  return {
    success: false,
    message: OperationsErrorFormatter.format(error, 'executar consulta'),
    // ...
  }
}
```

**Benefits**:
- Consistent error messages
- Better user experience (helpful error messages)
- Easier to localize later

**Effort**: Low (1-2 hours)
**Priority**: Medium (improves UX)

---

### 5. Success Message Templates

**Current State** (lines 601-694): Large if/else chain for message formatting
```typescript
if (method === 'bulkCreate') {
  successMessage = `✅ Criação em lote concluída!\n\n📊 Total: ${result.totalItems}...`
} else if (method === 'bulkUpdate') {
  successMessage = `✅ Atualização em lote concluída!\n\n📊 Total: ${result.totalItems}...`
} else if (method === 'bulkDelete') {
  successMessage = `✅ Exclusão em lote concluída!\n\n📊 Total: ${result.totalItems}...`
} else if (method === 'delete') {
  successMessage = `✅ Registro deletado com sucesso!`
} else if (result) {
  if ('description' in result && 'amount' in result && 'dueDate' in result) {
    // Expense formatting
  } else if ('clientName' in result && 'projectName' in result) {
    // Contract formatting
  }
  // etc...
}
```

**Opportunity**:
```typescript
// Template-based formatting
const SUCCESS_TEMPLATES = {
  bulk: (operation: string, result: BulkResult) => `
    ✅ ${operation} em lote concluída!

    📊 Total: ${result.totalItems} itens
    ✅ Sucesso: ${result.successCount}
    ${result.failureCount > 0 ? `❌ Falhas: ${result.failureCount}` : ''}
  `,

  expense: (operation: string, expense: Expense) => `
    ✅ Despesa ${operation}!

    📝 ${expense.description}
    💰 R$ ${expense.amount.toFixed(2)}
    📅 ${formatDate(expense.dueDate)}
    🏷️ ${expense.category}
  `,

  // etc...
}

// Usage
const successMessage = result.totalItems
  ? SUCCESS_TEMPLATES.bulk(getOperationName(method), result)
  : SUCCESS_TEMPLATES[getEntityType(result)](getOperationName(method), result)
```

**Benefits**:
- More maintainable (templates in one place)
- Easier to customize messages
- Consistent formatting

**Effort**: Medium (2-3 hours)
**Priority**: Low (current works well)

---

## 🔧 Code Quality Improvements

### 6. Type Safety for Action Detection

**Current State**: Action detection uses runtime checks
```typescript
if (action.action === 'query_database' && action.sql) {
  // ...
}
if (action.action === 'call_service' && action.service && action.method && action.params) {
  // ...
}
```

**Opportunity**:
```typescript
// Type-safe action handlers
type QueryDatabaseAction = {
  action: 'query_database'
  sql: string
}

type CallServiceAction = {
  action: 'call_service'
  service: string
  method: string
  params: any
}

type Action = QueryDatabaseAction | CallServiceAction

function isQueryDatabaseAction(action: Action): action is QueryDatabaseAction {
  return action.action === 'query_database'
}

// Usage with type narrowing
if (isQueryDatabaseAction(action)) {
  // TypeScript knows action.sql exists
  const results = await this.executeQuery(action.sql)
}
```

**Benefits**:
- Compile-time type checking
- Better IDE autocomplete
- Prevents runtime errors

**Effort**: Low (1 hour)
**Priority**: Medium (good TypeScript practice)

---

### 7. Logging Abstraction

**Current State**: Direct console.log throughout
```typescript
console.log('[Operations] Executing query_database...')
console.log('[Operations] Query returned', results.length, 'rows')
console.error('[Operations] Query error:', error)
```

**Opportunity**:
```typescript
// Structured logging
class OperationsLogger {
  private prefix = '[Operations]'

  action(message: string, data?: any) {
    console.log(`${this.prefix} ${message}`, data)
  }

  result(message: string, count: number) {
    console.log(`${this.prefix} ${message}: ${count} items`)
  }

  error(message: string, error: unknown) {
    console.error(`${this.prefix} ERROR: ${message}`, error)
  }
}

// Usage
this.logger.action('Executing query_database')
this.logger.result('Query returned', results.length)
this.logger.error('Query failed', error)
```

**Benefits**:
- Easy to add structured logging (JSON, OpenTelemetry)
- Consistent log format
- Easy to disable in production

**Effort**: Low (1 hour)
**Priority**: Low (unless debugging becomes frequent)

---

## 📊 Performance Optimizations

### 8. System Prompt Caching

**Current State**: System prompt built on every request
```typescript
const systemPrompt = `
  Você é um assistente...
  ${teamId}
  ${today}
  ${yesterday}
  // ... 260 lines
`
```

**Opportunity**:
```typescript
// Cache static parts, only insert dynamic values
class PromptCache {
  private static template: string

  static getPrompt(context: { teamId: string, today: string, yesterday: string }): string {
    if (!this.template) {
      this.template = this.buildTemplate()
    }
    return this.interpolate(this.template, context)
  }
}
```

**Benefits**:
- Faster request processing
- Reduced memory allocations

**Effort**: Low (1 hour)
**Impact**: Minimal (template strings are fast)
**Priority**: Very Low (premature optimization)

---

### 9. Parallel Service Initialization

**Current State**: Services initialized synchronously
```typescript
constructor(context: ServiceContext) {
  this.anthropic = new Anthropic({ apiKey })
  this.expenseService = new ExpenseService(context)
  // Future: 3 more services
}
```

**Opportunity**: Not needed - service constructors are synchronous

**Verdict**: Skip this optimization (no async work in constructors)

---

## 🧪 Testing Infrastructure

### 10. Prompt Testing Framework

**Current State**: No automated prompt testing

**Opportunity**:
```typescript
// Test prompt effectiveness
describe('OperationsAgentPrompt', () => {
  test('extracts correct SQL for simple query', async () => {
    const response = await simulateClaudeResponse(
      'Quais minhas despesas com Notion?',
      systemPrompt
    )
    expect(response).toContain('SELECT')
    expect(response).toContain('"description"')
    expect(response).toContain('ILIKE')
  })

  test('shows preview before executing update', async () => {
    const history = [
      queryResultMessage, // Previous query with IDs
      { role: 'user', content: 'Pode alterar para R$25?' }
    ]
    const response = await simulateClaudeResponse(history, systemPrompt)
    expect(response).toMatch(/prévia/i)
    expect(response).not.toContain('call_service') // Should wait for confirmation
  })
})
```

**Benefits**:
- Catch prompt regressions
- Document expected behavior
- Faster iteration on prompts

**Effort**: High (4-6 hours to set up infrastructure)
**Priority**: Medium (valuable for prompt evolution)

---

## 📝 Documentation Improvements

### 11. Code Comments & JSDoc

**Current State**: Minimal inline documentation

**Opportunity**:
```typescript
/**
 * Filters out internal messages that should not be displayed to users.
 *
 * Internal messages are used to pass context between API calls (like query results)
 * but should not be rendered in the UI. They are marked with special prefixes:
 * - [QUERY_RESULTS]: Database query results for Claude's context
 * - [INTERNAL]: System messages for debugging
 * - [DEBUG]: Development-only messages
 *
 * @param history - Full conversation history including internal messages
 * @returns Filtered history with only user-facing messages
 *
 * @example
 * ```typescript
 * const full = [
 *   { role: 'user', content: 'Show my expenses' },
 *   { role: 'assistant', content: '[QUERY_RESULTS]...' }, // Filtered out
 *   { role: 'assistant', content: 'Here are your expenses' } // Kept
 * ]
 * const display = filterInternalMessages(full)
 * // display.length === 2
 * ```
 */
private filterInternalMessages(history: ConversationMessage[]): ConversationMessage[] {
  return history.filter(msg =>
    !msg.content.startsWith('[QUERY_RESULTS]') &&
    !msg.content.startsWith('[INTERNAL]') &&
    !msg.content.startsWith('[DEBUG]')
  )
}
```

**Benefits**:
- Better IDE tooltips
- Easier onboarding for new developers
- Self-documenting code

**Effort**: Low (30 min per module)
**Priority**: Low (code is already quite readable)

---

## 🎬 Recommendation for Step 11

If a "Polish and Production" step is added, prioritize in this order:

### Phase 1: High-Impact, Low-Risk (First 4 hours)
1. ✅ **System Prompt Organization** (#1) - 2-3 hours
2. ✅ **Type Safety for Actions** (#6) - 1 hour
3. ✅ **Error Response Formatting** (#4) - 1-2 hours

### Phase 2: Scalability Prep (Next 2-3 hours)
4. ✅ **Service Map Scalability** (#3) - 2 hours
   - Do this right after Step 5 when we have 4 services

### Phase 3: Quality of Life (If time permits)
5. ✅ **Success Message Templates** (#5) - 2-3 hours
6. ✅ **Logging Abstraction** (#7) - 1 hour
7. ✅ **Code Comments & JSDoc** (#11) - Ongoing

### Skip for Now
- ❌ Multi-JSON Parser Simplification (#2) - Current works well
- ❌ System Prompt Caching (#8) - Premature optimization
- ❌ Parallel Service Init (#9) - Not applicable

### Consider Later
- 🤔 **Prompt Testing Framework** (#10) - When prompts stabilize (Step 8+)

---

## ⚠️ Important Reminders

### Don't Over-Optimize
- Current code works perfectly (production tested ✅)
- **~650 lines vs 2,049 original** = 68% reduction already achieved
- Follow "Make it work, make it right, make it fast" - we're at step 2
- Premature optimization is the root of all evil

### When to Apply These
- ✅ After Step 5 complete (4 entity types working)
- ✅ When preparing for production at scale
- ✅ When patterns emerge that need abstraction
- ❌ NOT before Step 5 (avoid disrupting working code)

### Trust the Process
From ADR-012:
> "Start Extremely Simple"
> "Add One Capability at a Time"
> "Keep It Simple"
> "Every line of code must justify its existence"

These optimizations are **potential future value**, not current requirements.

---

**Last Updated**: 2025-01-03 after Step 4 bug fixes complete
**Next Review**: After Step 5 implementation (when we have 4 services)
