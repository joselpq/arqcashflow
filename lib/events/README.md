# ArqCashflow Event System Foundation

**Status**: ✅ Complete - Phase 1 Implementation
**Created**: September 25, 2025
**Last Updated**: September 25, 2025

## Overview

The ArqCashflow Event System Foundation provides a robust, type-safe, event-driven architecture for the financial management system. This foundation enables AI automation, cross-service communication, audit trails, and real-time business process optimization.

## Context for LLM Agents

**Scope**: Complete event-driven architecture foundation with business logic, AI integration, and audit capabilities
**Prerequisites**: Understanding of service layer patterns, unified validation system, and team context middleware
**Key Patterns**:
- Event bus implementation for inter-service communication
- Business event definitions for financial operations
- AI agent coordination through event-driven workflows
- Team-isolated event processing with security boundaries
- Comprehensive audit trail and compliance logging

## 🏗️ Architecture Overview

```
Event System Architecture
┌─────────────────────────────────────────────────────────────────────┐
│                           Event Bus Core                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   Business      │    │   AI Processing │    │   Audit &       │ │
│  │   Logic         │    │   & Automation  │    │   Security      │ │
│  │   Handlers      │    │   Handlers      │    │   Monitoring    │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                      Validation Middleware                          │
│                    Team Context Middleware                          │
├─────────────────────────────────────────────────────────────────────┤
│                        Event Persistence                            │
│                     (Database + Audit Trail)                        │
└─────────────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
lib/events/
├── index.ts                    # Main export and initialization
├── bus.ts                      # Core event bus implementation
├── types.ts                    # Event type definitions and schemas
├── handlers/                   # Event handler implementations
│   ├── index.ts               # Handler registry and exports
│   ├── business.ts            # Business logic event handlers
│   ├── ai.ts                  # AI processing event handlers
│   └── audit.ts               # Audit and compliance handlers
├── middleware/                 # Event middleware components
│   ├── index.ts               # Middleware exports and utilities
│   ├── validation.ts          # Event validation middleware
│   └── team-context.ts        # Team isolation middleware
└── README.md                  # This documentation
```

## 🚀 Quick Start for LLM Agents

### Basic Usage

```typescript
import {
  getEventBus,
  createTeamEventBus,
  EventTypes,
  initializeEventSystem
} from '@/lib/events'

// Initialize the event system (call once during startup)
initializeEventSystem()

// Create team-scoped event bus
const teamEventBus = createTeamEventBus('team-123', 'user-456')

// Emit a business event
await teamEventBus.emit({
  type: EventTypes.CONTRACT_CREATED,
  source: 'service',
  payload: {
    contractId: 'contract-789',
    clientName: 'ACME Corp',
    projectName: 'Office Renovation',
    totalValue: 50000,
    status: 'active'
  }
})
```

### Service Layer Integration

```typescript
import { ServiceEventIntegration } from '@/lib/events'

// In your service methods
export class ContractService {
  async create(teamId: string, data: ContractCreateData, userId?: string) {
    // Create the contract
    const contract = await this.teamScopedPrisma.contract.create({ data })

    // Emit event for business automation
    const eventEmitter = ServiceEventIntegration.createServiceEventEmitter(teamId, userId)
    await eventEmitter.emitContractCreated(contract.id, contract)

    return contract
  }
}
```

### Event Handling

```typescript
import { getEventBus, EventTypes } from '@/lib/events'

const eventBus = getEventBus()

// Listen for contract events
eventBus.on(EventTypes.CONTRACT_CREATED, async (event, context) => {
  console.log(`New contract created: ${event.payload.clientName}`)

  // Trigger additional business logic
  // - Generate initial receivables
  // - Send welcome email
  // - Update dashboards
})

// Listen to all contract events with wildcard
eventBus.on('contract.*', async (event, context) => {
  console.log(`Contract event: ${event.type}`)
})
```

## 📋 Event Types Reference

### Financial Operations Events

#### Contract Events
- `contract.created` - New contract established
- `contract.updated` - Contract modified
- `contract.completed` - Contract finished
- `contract.cancelled` - Contract terminated

#### Receivable Events
- `receivable.created` - New receivable established
- `receivable.updated` - Receivable modified
- `receivable.payment_received` - Payment processed
- `receivable.overdue` - Payment overdue
- `receivable.cancelled` - Receivable cancelled

#### Expense Events
- `expense.created` - New expense recorded
- `expense.updated` - Expense modified
- `expense.approved` - Expense approved for payment
- `expense.paid` - Expense payment completed
- `expense.cancelled` - Expense cancelled

#### Recurring Expense Events
- `recurring.created` - Recurring expense setup
- `recurring.updated` - Recurring expense modified
- `recurring.generated` - Recurring expense instance created
- `recurring.cancelled` - Recurring expense stopped

### AI Processing Events
- `document.uploaded` - Document uploaded for processing
- `document.processed` - AI analysis completed
- `ai.analysis_complete` - Advanced AI analysis finished
- `ai.suggestion_generated` - AI suggestions available
- `ai.workflow_triggered` - Automated workflow started

### System Events
- `user.onboarded` - New user completed onboarding
- `team.created` - New team established
- `audit.logged` - Audit event recorded
- `validation.failed` - Data validation failure
- `service.error` - System error occurred
- `integration.connected` - External integration established

### Bulk Operation Events
- `bulk.operation_started` - Bulk operation initiated
- `bulk.operation_completed` - Bulk operation finished
- `bulk.operation_failed` - Bulk operation failed

## 🛡️ Security and Team Isolation

### Team Context Enforcement
All events are automatically scoped to teams with strict isolation:

```typescript
// Events are automatically filtered by teamId
const teamEvents = await eventBus.getEventHistory('team-123')

// Team isolation is enforced at middleware level
// Cross-team access is prevented automatically
```

### Security Features
- **Team Isolation**: Events cannot cross team boundaries
- **Access Validation**: User permissions verified for each event
- **Rate Limiting**: Prevents abuse with configurable limits
- **Audit Trail**: Complete logging of all event access
- **Data Sanitization**: Input sanitization prevents injection attacks

## 🤖 AI Integration Patterns

### Document Processing Workflow
```typescript
// 1. Document uploaded
await teamEventBus.emit({
  type: EventTypes.DOCUMENT_UPLOADED,
  source: 'ui',
  payload: { documentId: 'doc-123', fileName: 'invoice.pdf', fileSize: 1024000 }
})

// 2. AI processing triggered automatically
// 3. Results emitted when complete
eventBus.on(EventTypes.AI_ANALYSIS_COMPLETE, async (event, context) => {
  const suggestions = event.payload.suggestions
  // Apply AI suggestions to business data
})
```

### Intelligent Automation
```typescript
// Monitor for patterns that trigger automation
eventBus.on('expense.created', async (event, context) => {
  if (event.payload.amount > 10000) {
    // Trigger approval workflow for high-value expenses
    await teamEventBus.emit({
      type: EventTypes.AI_WORKFLOW_TRIGGERED,
      source: 'ai',
      payload: {
        analysisResult: {
          triggerReason: 'high_value_expense_approval_required',
          recommendedAction: 'require_manager_approval'
        }
      }
    })
  }
})
```

## 📊 Business Logic Examples

### Automated Receivable Generation
```typescript
eventBus.on(EventTypes.CONTRACT_CREATED, async (event, context) => {
  const contract = event.payload

  // Auto-generate receivables based on contract terms
  if (contract.paymentSchedule === 'installments') {
    for (const installment of contract.installments) {
      await createReceivable({
        contractId: contract.contractId,
        amount: installment.amount,
        dueDate: installment.dueDate,
        description: `Installment ${installment.number}`
      })
    }
  }
})
```

### Cash Flow Analysis
```typescript
eventBus.on('receivable.overdue', async (event, context) => {
  // Trigger cash flow analysis when payments are overdue
  const cashFlowAnalysis = await analyzeTeamCashFlow(context.teamId)

  if (cashFlowAnalysis.riskLevel === 'high') {
    // Alert team about potential cash flow issues
    await teamEventBus.emit({
      type: EventTypes.AI_WORKFLOW_TRIGGERED,
      source: 'ai',
      payload: {
        analysisResult: {
          triggerReason: 'cash_flow_risk_detected',
          insights: cashFlowAnalysis.insights,
          recommendedActions: cashFlowAnalysis.recommendations
        }
      }
    })
  }
})
```

## 🔧 Testing and Development

### Health Checks
```typescript
import { EventSystemHealth } from '@/lib/events'

// Comprehensive health check
const health = await EventSystemHealth.performHealthCheck()

if (!health.overall) {
  console.error('Event system unhealthy:', health.details)
}
```

### Development Utilities
```typescript
import { EventSystemUtils } from '@/lib/events'

// Create test events
const testEvent = EventSystemUtils.createTestEvent(
  EventTypes.CONTRACT_CREATED,
  'team-123',
  { contractId: 'test-contract', clientName: 'Test Client' }
)

// Wait for event processing (useful in tests)
const processed = await EventSystemUtils.waitForEventProcessing(testEvent.id)
```

### Testing Event Handlers
```typescript
import { BusinessEventHandlers } from '@/lib/events'

// Test individual handlers
await BusinessEventHandlers.ContractHandlers.onContractCreated(testEvent, testContext)
```

## 📈 Performance and Monitoring

### Event Statistics
```typescript
// Get team event statistics
const stats = await eventBus.getEventStats('team-123')

console.log(`Total events: ${stats.totalEvents}`)
console.log(`Event types:`, stats.eventsByType)
console.log(`Recent activity: ${stats.recentActivity}`)
```

### Performance Monitoring
The system automatically monitors:
- Event processing times
- Handler performance
- Database query performance
- Memory usage patterns
- Error rates and types

## 🏆 Best Practices for LLM Agents

### Event Emission Guidelines
1. **Always use team-scoped event bus** for automatic isolation
2. **Include relevant context** in event payloads
3. **Use appropriate event types** from the EventTypes enum
4. **Emit events after successful operations**, not before
5. **Handle emission errors gracefully**

### Handler Development
1. **Keep handlers focused** on single responsibilities
2. **Use async/await** for all database operations
3. **Log meaningful messages** for debugging
4. **Handle errors without breaking other handlers**
5. **Avoid long-running operations** in handlers

### Performance Optimization
1. **Batch database operations** when possible
2. **Use selective event subscription** (avoid global listeners when possible)
3. **Implement pagination** for event history queries
4. **Monitor handler performance** regularly
5. **Use event middleware** for common operations

## 🚨 Troubleshooting

### Common Issues

**Events not being processed:**
```typescript
// Check if system is initialized
if (!isEventSystemInitialized()) {
  initializeEventSystem()
}
```

**Team isolation errors:**
```typescript
// Ensure teamId matches between event and context
const event = { teamId: 'team-123', ... }
const context = { teamId: 'team-123', ... } // Must match
```

**Handler registration issues:**
```typescript
// Verify handlers are registered
import { verifyHandlerHealth } from '@/lib/events'
const health = await verifyHandlerHealth()
```

### Debug Logging
Set environment variable for detailed logging:
```bash
DEBUG=events:* npm run dev
```

## 🔄 Integration with Service Layer

### Existing Service Pattern
```typescript
// In BaseService or specific services
import { ServiceEventIntegration } from '@/lib/events'

export class ContractService extends BaseService {
  private eventEmitter = ServiceEventIntegration.createServiceEventEmitter(
    this.teamId,
    this.userId
  )

  async create(data: ContractCreateData) {
    const contract = await this.teamScopedPrisma.contract.create({ data })

    // Emit event for downstream processing
    await this.eventEmitter.emitContractCreated(contract.id, contract)

    return contract
  }

  async update(id: string, data: ContractUpdateData) {
    const previous = await this.findById(id)
    const updated = await this.teamScopedPrisma.contract.update({
      where: { id },
      data
    })

    // Emit update event with previous data for comparison
    await this.eventEmitter.emitContractUpdated(updated.id, updated, previous)

    return updated
  }
}
```

## 🎯 Future Enhancements

The event system foundation is designed for extensibility:

### Phase 2: Advanced Features
- Real-time dashboard updates
- Webhook integrations for external services
- Advanced AI workflow automation
- Business process optimization
- Event replay and time-travel debugging

### Phase 3: Enterprise Features
- Multi-region event replication
- Event sourcing for complete audit trails
- Advanced analytics and reporting
- Third-party integration marketplace
- Custom event type definitions

## 📚 Related Documentation

- [Service Layer Architecture](../services/README.md) - Integration patterns
- [Unified Validation Layer](../validation/README.md) - Event payload validation
- [Team Context Middleware](../middleware/team-context.ts) - Security boundaries
- [Architecture Decision Records](../../docs/docs-site/docs/decisions/) - Strategic context

---

*This event system foundation completes Phase 1 of the strategic architecture improvements and enables the transition to AI-first, automation-ready development paradigms.*