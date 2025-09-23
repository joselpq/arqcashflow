---
title: "Database Schema"
type: "reference"
audience: ["developer", "agent"]
contexts: ["database", "prisma", "schema", "orm"]
complexity: "intermediate"
last_updated: "2025-09-23"
version: "1.0"
agent_roles: ["database-developer", "backend-engineer", "data-modeler"]
related:
  - developer/architecture/overview.md
  - developer/setup.md
dependencies: ["prisma", "postgresql"]
---

# Database Schema

Comprehensive database schema documentation for ArqCashflow generated from Prisma schema.

## Context for LLM Agents

**Scope**: Complete database schema including models, relationships, constraints, and business logic
**Prerequisites**: Understanding of relational databases, Prisma ORM, and multi-tenant architecture
**Key Patterns**:
- Team-based data isolation with `teamId` fields
- Cascade delete strategies for data integrity
- Timestamp tracking with `createdAt` and `updatedAt`
- Optional relationships for flexible business logic
- Indexed fields for performance optimization

## Configuration

### Datasources

#### db
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```


### Generators

#### client
```prisma
generator client {
  provider = "prisma-client-js"
}
```


## Data Models

### Model Overview

| Model | Purpose | Key Relationships |
|-------|---------|-------------------|
| Contract | Client agreements and project definitions | team, expenses, receivables, recurringExpenses |
| Receivable | Expected payments and cash flow tracking | contract, team |
| Category | Data management entity | None |
| Expense | Project costs and operational spending | contract, team, recurringExpense |
| RecurringExpense | Automated recurring cost management | team, user, contract, expenses |
| AuditLog | System activity tracking and compliance | user, team |
| Team | Multi-tenant team organization | contracts, expenses, receivables, users, auditLogs, recurringExpenses |
| User | User authentication and profile management | team, auditLogs, recurringExpenses |

### Contract



```prisma
model Contract {
  id           String @id @default(cuid()
  clientName   String 
  projectName  String 
  description  String? 
  totalValue   Float 
  signedDate   DateTime 
  status       String @default("active")
  category     String? 
  notes        String? 
  createdAt    DateTime @default(now()
  updatedAt    DateTime @updatedAt
  teamId       String 
  team         Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  expenses     Expense[] 
  receivables  Receivable[] 
  recurringExpenses RecurringExpense[]  // Recurring expenses for this project
  @@index([teamId])
}
```

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, Required, Has Default | - |
| `clientName` | String | Required | - |
| `projectName` | String | Required | - |
| `description` | String? | None | - |
| `totalValue` | Float | Required | - |
| `signedDate` | DateTime | Required | - |
| `status` | String | Required, Has Default | - |
| `category` | String? | None | - |
| `notes` | String? | None | - |
| `createdAt` | DateTime | Required, Has Default | - |
| `updatedAt` | DateTime | Required | - |
| `teamId` | String | Required | - |
| `expenses` | Expense[] | Required | - |
| `receivables` | Receivable[] | Required | - |
| `recurringExpenses` | RecurringExpense[] | Required | Recurring expenses for this project |

#### Relationships

| Field | Type | Relationship | Description |
|-------|------|--------------|-------------|
| `team` | Team | Many-to-One | Related Team records |
| `expenses` | Expense[] | One-to-Many | Related Expense records |
| `receivables` | Receivable[] | One-to-Many | Related Receivable records |
| `recurringExpenses` | RecurringExpense[] | One-to-Many | Recurring expenses for this project |

#### Business Rules
- Must belong to a team (teamId required)
- Total value must be positive
- Signed date cannot be in the future
- Deleting a contract cascades to all receivables

### Receivable



```prisma
model Receivable {
  id           String @id @default(cuid()
  contractId   String? 
  expectedDate DateTime 
  amount       Float 
  status       String @default("pending")
  receivedDate DateTime? 
  receivedAmount Float? 
  invoiceNumber String? 
  category     String? 
  notes        String? 
  createdAt    DateTime @default(now()
  updatedAt    DateTime @updatedAt
  clientName   String? 
  description  String? 
  teamId       String? 
  contract     Contract? @relation(fields: [contractId], references: [id], onDelete: Cascade)
  team         Team? @relation(fields: [teamId], references: [id], onDelete: Cascade)
  @@index([teamId])
  @@index([contractId])
  @@index([expectedDate])
  @@index([status])
}
```

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, Required, Has Default | - |
| `contractId` | String? | None | - |
| `expectedDate` | DateTime | Required | - |
| `amount` | Float | Required | - |
| `status` | String | Required, Has Default | - |
| `receivedDate` | DateTime? | None | - |
| `receivedAmount` | Float? | None | - |
| `invoiceNumber` | String? | None | - |
| `category` | String? | None | - |
| `notes` | String? | None | - |
| `createdAt` | DateTime | Required, Has Default | - |
| `updatedAt` | DateTime | Required | - |
| `clientName` | String? | None | - |
| `description` | String? | None | - |
| `teamId` | String? | None | - |

#### Relationships

| Field | Type | Relationship | Description |
|-------|------|--------------|-------------|
| `contract` | Contract? | Many-to-One | Related Contract records |
| `team` | Team? | Many-to-One | Related Team records |

#### Business Rules
- Must be linked to a contract
- Expected date drives overdue calculations
- Amount must be positive
- Status is calculated based on dates and payments

### Category



```prisma
model Category {
  id           String @id @default(cuid()
  name         String @unique
  color        String? 
  createdAt    DateTime @default(now()
  updatedAt    DateTime @updatedAt

}
```

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, Required, Has Default | - |
| `name` | String | Unique, Required | - |
| `color` | String? | None | - |
| `createdAt` | DateTime | Required, Has Default | - |
| `updatedAt` | DateTime | Required | - |



#### Business Rules
- Standard CRUD operations apply

### Expense



```prisma
model Expense {
  id           String @id @default(cuid()
  contractId   String? 
  description  String 
  amount       Float 
  dueDate      DateTime 
  category     String 
  status       String @default("pending")
  paidDate     DateTime? 
  paidAmount   Float? 
  vendor       String? 
  invoiceNumber String? 
  type         String? 
  isRecurring  Boolean @default(false)
  notes        String? 
  receiptUrl   String? 
  createdAt    DateTime @default(now()
  updatedAt    DateTime @updatedAt
  teamId       String? 
  Recurring    expense  // Recurring expense relation
  recurringExpenseId String? 
  generatedDate DateTime?  // When this was auto-generated
  contract     Contract? @relation(fields: [contractId], references: [id])
  team         Team? @relation(fields: [teamId], references: [id], onDelete: Cascade)
  recurringExpense RecurringExpense? @relation(fields: [recurringExpenseId], references: [id])
  @@index([teamId])
  @@index([contractId])
  @@index([dueDate])
  @@index([status])
  @@index([category])
  @@index([recurringExpenseId])
}
```

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, Required, Has Default | - |
| `contractId` | String? | None | - |
| `description` | String | Required | - |
| `amount` | Float | Required | - |
| `dueDate` | DateTime | Required | - |
| `category` | String | Required | - |
| `status` | String | Required, Has Default | - |
| `paidDate` | DateTime? | None | - |
| `paidAmount` | Float? | None | - |
| `vendor` | String? | None | - |
| `invoiceNumber` | String? | None | - |
| `type` | String? | None | - |
| `isRecurring` | Boolean | Required, Has Default | - |
| `notes` | String? | None | - |
| `receiptUrl` | String? | None | - |
| `createdAt` | DateTime | Required, Has Default | - |
| `updatedAt` | DateTime | Required | - |
| `teamId` | String? | None | - |
| `Recurring` | expense | Required | Recurring expense relation |
| `recurringExpenseId` | String? | None | - |
| `generatedDate` | DateTime? | None | When this was auto-generated |

#### Relationships

| Field | Type | Relationship | Description |
|-------|------|--------------|-------------|
| `contract` | Contract? | Many-to-One | Related Contract records |
| `team` | Team? | Many-to-One | Related Team records |
| `recurringExpense` | RecurringExpense? | Many-to-One | Related RecurringExpense records |

#### Business Rules
- Can be linked to contract (project expense) or standalone (operational)
- Due date drives overdue calculations
- Amount must be positive
- Recurring expenses generate automatic instances

### RecurringExpense



```prisma
model RecurringExpense {
  id           String @id @default(cuid()
  description  String 
  amount       Float 
  category     String 
  vendor       String? 
  frequency    String  // 'weekly', 'monthly', 'quarterly', 'annual'
  interval     Int @default(1)
  dayOfMonth   Int? 
  startDate    DateTime 
  endDate      DateTime? 
  isActive     Boolean @default(true)
  lastGenerated DateTime? 
  nextDue      DateTime 
  notes        String? 
  createdAt    DateTime @default(now()
  updatedAt    DateTime @updatedAt
  tenant       support  // Multi-tenant support
  teamId       String 
  createdBy    String 
  Enhanced     features  // Enhanced features
  contractId   String?  // Optional link to project
  type         String?  // 'operational', 'project', 'administrative'
  maxOccurrences Int?  // Alternative to endDate
  generatedCount Int @default(0)
  lastError    String?  // Track generation errors
  invoiceNumber String?  // Template for invoice numbers
  team         Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user         User @relation(fields: [createdBy], references: [id])
  contract     Contract? @relation(fields: [contractId], references: [id])
  expenses     Expense[]  // Generated expenses from this recurring template
  @@index([teamId])
  @@index([nextDue])
  @@index([isActive])
  @@index([teamId, isActive, nextDue]) // Composite index for efficient queries
}
```

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, Required, Has Default | - |
| `description` | String | Required | - |
| `amount` | Float | Required | - |
| `category` | String | Required | - |
| `vendor` | String? | None | - |
| `frequency` | String | Required | 'weekly', 'monthly', 'quarterly', 'annual' |
| `interval` | Int | Required, Has Default | - |
| `dayOfMonth` | Int? | None | - |
| `startDate` | DateTime | Required | - |
| `endDate` | DateTime? | None | - |
| `isActive` | Boolean | Required, Has Default | - |
| `lastGenerated` | DateTime? | None | - |
| `nextDue` | DateTime | Required | - |
| `notes` | String? | None | - |
| `createdAt` | DateTime | Required, Has Default | - |
| `updatedAt` | DateTime | Required | - |
| `tenant` | support | Required | Multi-tenant support |
| `teamId` | String | Required | - |
| `createdBy` | String | Required | - |
| `Enhanced` | features | Required | Enhanced features |
| `contractId` | String? | None | Optional link to project |
| `type` | String? | None | 'operational', 'project', 'administrative' |
| `maxOccurrences` | Int? | None | Alternative to endDate |
| `generatedCount` | Int | Required, Has Default | - |
| `lastError` | String? | None | Track generation errors |
| `invoiceNumber` | String? | None | Template for invoice numbers |
| `expenses` | Expense[] | Required | Generated expenses from this recurring template |

#### Relationships

| Field | Type | Relationship | Description |
|-------|------|--------------|-------------|
| `team` | Team | Many-to-One | Related Team records |
| `user` | User | Many-to-One | Related User records |
| `contract` | Contract? | Many-to-One | Related Contract records |
| `expenses` | Expense[] | One-to-Many | Generated expenses from this recurring template |

#### Business Rules
- Standard CRUD operations apply

### AuditLog



```prisma
model AuditLog {
  id           String @id @default(cuid()
  timestamp    DateTime @default(now()
  Who          made  // Who made the change
  userId       String 
  userEmail    String  // Cached for resilience if user is deleted
  teamId       String 
  What         entity  // What entity was changed
  entityType   String  // "contract", "receivable", "expense"
  entityId     String  // The ID of the changed entity
  What         kind  // What kind of change
  action       String  // "created", "updated", "deleted"
  What         changed  // What changed (for updates)
  changes      Json  // { "status": { "from": "pending", "to": "received" } }
  Complete     state  // Complete state snapshot (optional, for critical changes)
  snapshot     Json?  // Full entity state after change
  metadata     Json?  // { "api_endpoint": "/api/contracts", "ip": "...", "user_agent": "..." }
  user         User @relation(fields: [userId], references: [id])
  team         Team @relation(fields: [teamId], references: [id])
  @@index([entityType, entityId]) // Query by entity
  @@index([userId])               // Query by user
  @@index([teamId])               // Query by team
  @@index([timestamp])            // Query by time
  @@index([action])               // Query by action type
}
```

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, Required, Has Default | - |
| `timestamp` | DateTime | Required, Has Default | - |
| `Who` | made | Required | Who made the change |
| `userId` | String | Required | - |
| `userEmail` | String | Required | Cached for resilience if user is deleted |
| `teamId` | String | Required | - |
| `What` | entity | Required | What entity was changed |
| `entityType` | String | Required | "contract", "receivable", "expense" |
| `entityId` | String | Required | The ID of the changed entity |
| `What` | kind | Required | What kind of change |
| `action` | String | Required | "created", "updated", "deleted" |
| `What` | changed | Required | What changed (for updates) |
| `changes` | Json | Required | JSON object with before/after values |
| `Complete` | state | Required | Complete state snapshot (optional, for critical changes) |
| `snapshot` | Json? | None | Full entity state after change |
| `metadata` | Json? | None | Request metadata (endpoint, IP, user agent) |

#### Relationships

| Field | Type | Relationship | Description |
|-------|------|--------------|-------------|
| `user` | User | Many-to-One | Related User records |
| `team` | Team | Many-to-One | Related Team records |

#### Business Rules
- Standard CRUD operations apply

### Team



```prisma
model Team {
  id           String @id @default(cuid()
  name         String 
  createdAt    DateTime @default(now()
  updatedAt    DateTime @updatedAt
  companyActivity String? 
  companyName  String? 
  employeeCount String? 
  profession   String? 
  revenueTier  String? 
  type         String @default("individual")
  contracts    Contract[] 
  expenses     Expense[] 
  receivables  Receivable[] 
  users        User[] 
  auditLogs    AuditLog[]  // Audit logs for this team
  recurringExpenses RecurringExpense[]  // Recurring expense templates

}
```

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, Required, Has Default | - |
| `name` | String | Required | - |
| `createdAt` | DateTime | Required, Has Default | - |
| `updatedAt` | DateTime | Required | - |
| `companyActivity` | String? | None | - |
| `companyName` | String? | None | - |
| `employeeCount` | String? | None | - |
| `profession` | String? | None | - |
| `revenueTier` | String? | None | - |
| `type` | String | Required, Has Default | - |
| `contracts` | Contract[] | Required | - |
| `expenses` | Expense[] | Required | - |
| `receivables` | Receivable[] | Required | - |
| `users` | User[] | Required | - |
| `auditLogs` | AuditLog[] | Required | Audit logs for this team |
| `recurringExpenses` | RecurringExpense[] | Required | Recurring expense templates |

#### Relationships

| Field | Type | Relationship | Description |
|-------|------|--------------|-------------|
| `contracts` | Contract[] | One-to-Many | Related Contract records |
| `expenses` | Expense[] | One-to-Many | Related Expense records |
| `receivables` | Receivable[] | One-to-Many | Related Receivable records |
| `users` | User[] | One-to-Many | Related User records |
| `auditLogs` | AuditLog[] | One-to-Many | Audit logs for this team |
| `recurringExpenses` | RecurringExpense[] | One-to-Many | Recurring expense templates |

#### Business Rules
- Provides data isolation boundary
- All user data must reference teamId
- Cannot be deleted if it has associated data

### User



```prisma
model User {
  id           String @id @default(cuid()
  email        String @unique
  name         String? 
  password     String 
  createdAt    DateTime @default(now()
  updatedAt    DateTime @updatedAt
  teamId       String 
  onboardingComplete Boolean @default(false)
  team         Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  auditLogs    AuditLog[]  // Audit logs created by this user
  recurringExpenses RecurringExpense[]  // Recurring expenses created by this user
  @@index([email])
  @@index([teamId])
}
```

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | Primary Key, Required, Has Default | - |
| `email` | String | Unique, Required | - |
| `name` | String? | None | - |
| `password` | String | Required | - |
| `createdAt` | DateTime | Required, Has Default | - |
| `updatedAt` | DateTime | Required | - |
| `teamId` | String | Required | - |
| `onboardingComplete` | Boolean | Required, Has Default | - |
| `auditLogs` | AuditLog[] | Required | Audit logs created by this user |
| `recurringExpenses` | RecurringExpense[] | Required | Recurring expenses created by this user |

#### Relationships

| Field | Type | Relationship | Description |
|-------|------|--------------|-------------|
| `team` | Team | Many-to-One | Related Team records |
| `auditLogs` | AuditLog[] | One-to-Many | Audit logs created by this user |
| `recurringExpenses` | RecurringExpense[] | One-to-Many | Recurring expenses created by this user |

#### Business Rules
- Email must be unique across the system
- Automatically assigned to a team during registration
- Password is hashed using NextAuth.js

## Enumerations



## Relationships Overview

### Entity Relationship Diagram

```
Team ||--|| Contract : belongs to
Contract ||--o{ Expense : has many
Contract ||--o{ Receivable : has many
Contract ||--o{ RecurringExpense : has many
Contract ||--|| Receivable : belongs to
Team ||--|| Receivable : belongs to
Contract ||--|| Expense : belongs to
Team ||--|| Expense : belongs to
RecurringExpense ||--|| Expense : belongs to
Team ||--|| RecurringExpense : belongs to
User ||--|| RecurringExpense : belongs to
Contract ||--|| RecurringExpense : belongs to
RecurringExpense ||--o{ Expense : has many
User ||--|| AuditLog : belongs to
Team ||--|| AuditLog : belongs to
Team ||--o{ Contract : has many
Team ||--o{ Expense : has many
Team ||--o{ Receivable : has many
Team ||--o{ User : has many
Team ||--o{ AuditLog : has many
Team ||--o{ RecurringExpense : has many
Team ||--|| User : belongs to
User ||--o{ AuditLog : has many
User ||--o{ RecurringExpense : has many
```

### Relationship Types

#### One-to-Many Relationships

- **Contract** → **Expense**: One Contract can have multiple Expense records
  - Delete strategy: Cascade
  - Business rule: Deleting Contract removes all related Expense records


- **Contract** → **Receivable**: One Contract can have multiple Receivable records
  - Delete strategy: Cascade
  - Business rule: Deleting Contract removes all related Receivable records


- **Contract** → **RecurringExpense**: One Contract can have multiple RecurringExpense records
  - Delete strategy: Cascade
  - Business rule: Deleting Contract removes all related RecurringExpense records


- **RecurringExpense** → **Expense**: One RecurringExpense can have multiple Expense records
  - Delete strategy: Cascade
  - Business rule: Deleting RecurringExpense removes all related Expense records


- **Team** → **Contract**: One Team can have multiple Contract records
  - Delete strategy: Cascade
  - Business rule: Deleting Team removes all related Contract records


- **Team** → **Expense**: One Team can have multiple Expense records
  - Delete strategy: Cascade
  - Business rule: Deleting Team removes all related Expense records


- **Team** → **Receivable**: One Team can have multiple Receivable records
  - Delete strategy: Cascade
  - Business rule: Deleting Team removes all related Receivable records


- **Team** → **User**: One Team can have multiple User records
  - Delete strategy: Cascade
  - Business rule: Deleting Team removes all related User records


- **Team** → **AuditLog**: One Team can have multiple AuditLog records
  - Delete strategy: Cascade
  - Business rule: Deleting Team removes all related AuditLog records


- **Team** → **RecurringExpense**: One Team can have multiple RecurringExpense records
  - Delete strategy: Cascade
  - Business rule: Deleting Team removes all related RecurringExpense records


- **User** → **AuditLog**: One User can have multiple AuditLog records
  - Delete strategy: Cascade
  - Business rule: Deleting User removes all related AuditLog records


- **User** → **RecurringExpense**: One User can have multiple RecurringExpense records
  - Delete strategy: Cascade
  - Business rule: Deleting User removes all related RecurringExpense records


#### Many-to-One Relationships

- **Contract** → **Team**: Multiple Contract records can belong to one Team
  - Optional: No
  - Business rule: Contract must be linked to Team


- **Receivable** → **Contract**: Multiple Receivable records can belong to one Contract
  - Optional: Yes
  - Business rule: Receivable can exist without Contract


- **Receivable** → **Team**: Multiple Receivable records can belong to one Team
  - Optional: Yes
  - Business rule: Receivable can exist without Team


- **Expense** → **Contract**: Multiple Expense records can belong to one Contract
  - Optional: Yes
  - Business rule: Expense can exist without Contract


- **Expense** → **Team**: Multiple Expense records can belong to one Team
  - Optional: Yes
  - Business rule: Expense can exist without Team


- **Expense** → **RecurringExpense**: Multiple Expense records can belong to one RecurringExpense
  - Optional: Yes
  - Business rule: Expense can exist without RecurringExpense


- **RecurringExpense** → **Team**: Multiple RecurringExpense records can belong to one Team
  - Optional: No
  - Business rule: RecurringExpense must be linked to Team


- **RecurringExpense** → **User**: Multiple RecurringExpense records can belong to one User
  - Optional: No
  - Business rule: RecurringExpense must be linked to User


- **RecurringExpense** → **Contract**: Multiple RecurringExpense records can belong to one Contract
  - Optional: Yes
  - Business rule: RecurringExpense can exist without Contract


- **AuditLog** → **User**: Multiple AuditLog records can belong to one User
  - Optional: No
  - Business rule: AuditLog must be linked to User


- **AuditLog** → **Team**: Multiple AuditLog records can belong to one Team
  - Optional: No
  - Business rule: AuditLog must be linked to Team


- **User** → **Team**: Multiple User records can belong to one Team
  - Optional: No
  - Business rule: User must be linked to Team


## Indexes and Performance

### Primary Indexes
- **Contract**: `id` (String)
- **Receivable**: `id` (String)
- **Category**: `id` (String)
- **Expense**: `id` (String)
- **RecurringExpense**: `id` (String)
- **AuditLog**: `id` (String)
- **Team**: `id` (String)
- **User**: `id` (String)

### Secondary Indexes

- **Contract.status**: Status-based filtering


- **Contract.createdAt**: Performance optimization


- **Contract.updatedAt**: Performance optimization


- **Contract.teamId**: Foreign key relationship


- **Receivable.contractId**: Foreign key relationship


- **Receivable.status**: Status-based filtering


- **Receivable.createdAt**: Performance optimization


- **Receivable.updatedAt**: Performance optimization


- **Receivable.teamId**: Foreign key relationship


- **Category.createdAt**: Performance optimization


- **Category.updatedAt**: Performance optimization


- **Expense.contractId**: Foreign key relationship


- **Expense.status**: Status-based filtering


- **Expense.createdAt**: Performance optimization


- **Expense.updatedAt**: Performance optimization


- **Expense.teamId**: Foreign key relationship


- **Expense.recurringExpenseId**: Foreign key relationship


- **RecurringExpense.createdAt**: Performance optimization


- **RecurringExpense.updatedAt**: Performance optimization


- **RecurringExpense.teamId**: Foreign key relationship


- **RecurringExpense.contractId**: Foreign key relationship


- **AuditLog.userId**: Foreign key relationship


- **AuditLog.teamId**: Foreign key relationship


- **AuditLog.entityId**: Foreign key relationship


- **Team.createdAt**: Performance optimization


- **Team.updatedAt**: Performance optimization


- **User.email**: User authentication lookup


- **User.createdAt**: Performance optimization


- **User.updatedAt**: Performance optimization


- **User.teamId**: Foreign key relationship


### Performance Considerations
- **Team Isolation**: All queries include `teamId` filter for multi-tenant performance
- **Timestamp Indexes**: `createdAt` and `updatedAt` fields are indexed for chronological queries
- **Foreign Key Indexes**: All relationship fields have automatic indexes
- **Composite Indexes**: Consider adding for frequently combined filter conditions

## Business Logic Constraints

### Data Integrity Rules
1. **Team Isolation**: All user data must include `teamId` for multi-tenant security
2. **Cascade Deletes**: Parent entities cascade delete to children where appropriate
3. **Soft Deletes**: Consider implementing for audit trail requirements
4. **Timestamp Tracking**: All entities track creation and modification times

### Validation Patterns
```typescript
// Team isolation enforcement
const where = {
  teamId: session.user.teamId,
  ...additionalFilters
};

// Safe relationship updates
const updateWithRelations = await prisma.model.update({
  where: { id, teamId },
  data: updateData,
  include: { relatedModel: true }
});
```

## Migration Strategy

### Schema Evolution
- **Additive Changes**: New optional fields can be added safely
- **Breaking Changes**: Require migration scripts and version coordination
- **Index Changes**: Can be applied with minimal downtime
- **Relationship Changes**: Require careful data migration planning

### Deployment Checklist
- [ ] Test migrations in development environment
- [ ] Backup production database before deployment
- [ ] Apply migrations with `prisma migrate deploy`
- [ ] Verify data integrity after migration
- [ ] Monitor performance after index changes

## Troubleshooting

### Common Issues

#### "Foreign key constraint violation"
- **Cause**: Attempting to delete parent record with existing children
- **Solution**: Delete children first or use cascade delete strategy

#### "Unique constraint violation"
- **Cause**: Attempting to create duplicate values in unique fields
- **Solution**: Check for existing records before creation

#### "Team isolation failures"
- **Cause**: Missing `teamId` filter in queries
- **Solution**: Always include team context in database operations

### Debugging Queries
```typescript
// Enable query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Check generated SQL
const result = await prisma.model.findMany({
  where: { teamId: 'team123' }
});
```

## Related Documentation

- [Architecture Overview](./overview.md) - System design patterns
- [API Reference](../../reference/api/index.md) - API endpoint documentation
- [Development Setup](../setup.md) - Database setup instructions

---

*This documentation is auto-generated from `prisma/schema.prisma`. For updates, modify the schema file and regenerate.*
*Last generated: 2025-09-23*