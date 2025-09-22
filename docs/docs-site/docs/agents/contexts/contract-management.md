---
title: "Contract Management Context"
type: "context"
audience: ["agent"]
contexts: ["contracts", "financial-management", "client-relationships"]
complexity: "intermediate"
last_updated: "2025-09-22"
version: "1.0"
agent_roles: ["contract-manager", "financial-assistant", "client-data-processor"]
related:
  - developer/architecture/overview.md
  - user/features/overview.md
dependencies: ["prisma", "claude-api", "next.js"]
---

# Contract Management Context for LLM Agents

## Context Overview

**Purpose**: Provide comprehensive context for LLM agents working on contract-related functionality in ArqCashflow
**Scope**: Contract lifecycle management, client relationships, revenue tracking, and AI-powered contract creation
**Target Agents**: Contract managers, financial assistants, data processors, and AI conversation handlers

## System Context

### What ArqCashflow Does
ArqCashflow is a financial management system for architects that tracks:
- **Contracts**: Client agreements and project management
- **Receivables**: Payment tracking linked to contracts
- **Expenses**: Project costs and operational expenses
- **AI Processing**: Natural language contract creation and document analysis

### Contract Role in the System
Contracts are the **foundation of the financial system**:
1. **Revenue Pipeline**: Contracts define expected income
2. **Cash Flow Basis**: Receivables are created from contracts
3. **Project Context**: Expenses can be linked to specific contracts
4. **Client Relationships**: Contracts maintain client information and project history

## Data Model Context

### Contract Entity Structure
```typescript
interface Contract {
  id: string                    // Unique identifier (CUID)
  clientName: string           // Client's full name or company
  projectName: string          // Project/service description
  description?: string         // Detailed project description
  totalValue: number          // Total contract value (BRL)
  signedDate: Date            // Contract signature date
  status: 'active' | 'completed' | 'cancelled'
  category?: string           // Project category (Residencial, Comercial, etc.)
  notes?: string             // Additional notes
  teamId: string             // Team isolation (multi-tenant)
  createdAt: Date            // Creation timestamp
  updatedAt: Date            // Last update timestamp

  // Relations
  receivables: Receivable[]   // Associated payment expectations
  expenses: Expense[]         // Associated project costs
  budgets: Budget[]          // Associated budget allocations
}
```

### Key Business Rules
1. **Team Isolation**: All contracts must be filtered by `teamId`
2. **Status Management**:
   - `active`: Contract is ongoing, can have receivables/expenses
   - `completed`: Project finished, typically no new receivables
   - `cancelled`: Contract terminated, handle existing receivables appropriately
3. **Value Constraints**: `totalValue` must be positive, handle currency precision carefully
4. **Date Logic**: `signedDate` should not be in the future (business rule)
5. **Relationships**: Deleting a contract cascades to all receivables (be careful!)

## API Patterns

### Contract CRUD Operations

#### GET /api/contracts
**Purpose**: Retrieve contracts with filtering and sorting
```typescript
// Query parameters
interface ContractQuery {
  status?: 'active' | 'completed' | 'cancelled' | 'all'
  category?: string | 'all'
  sortBy?: 'createdAt' | 'signedDate' | 'clientName' | 'projectName' | 'totalValue' | 'status'
  sortOrder?: 'asc' | 'desc'
}

// Response includes receivables for cash flow calculations
```

#### POST /api/contracts
**Purpose**: Create new contract with validation
```typescript
// Required fields: clientName, projectName, totalValue, signedDate
// Optional fields: description, category, notes
// Returns: { contract, alerts } with AI supervisor validation
```

#### PUT /api/contracts/[id]
**Purpose**: Update contract (all fields optional except id)

#### DELETE /api/contracts/[id]
**Purpose**: Delete contract (cascades to receivables - use carefully!)

### Common Filtering Patterns
```typescript
// Default view: show only active contracts
const defaultFilters = { status: 'active' }

// Team isolation (ALWAYS include)
const where = { teamId: user.teamId, ...filters }

// Smart status filtering
if (status === 'all') {
  // Don't add status filter
} else {
  where.status = status
}
```

## AI Integration Context

### Natural Language Contract Creation
**Endpoint**: `/api/ai/create-contract`

#### Input Processing Patterns
```typescript
// Common input variations
"Projeto João e Maria, residencial, 70m2, R$17k, 1/5/2024"
"Cliente: João Silva, projeto casa 150m2, valor 25 mil, assinado em abril"
"Contrato comercial Loja ABC, R$ 30.000, signed today"
```

#### Parsing Capabilities
- **Client Names**: Extracts from various formats
- **Project Types**: Recognizes "residencial", "comercial", "restaurante", etc.
- **Values**: Parses "17k", "25 mil", "R$ 30.000", etc.
- **Dates**: Understands "1/5/2024", "abril", "today", "amanhã"
- **Missing Info**: Asks follow-up questions for required fields

#### Conversation Flow
1. **Parse Input**: Extract contract information from natural language
2. **Validate Data**: Check for required fields and business rules
3. **Ask for Missing Info**: If required fields are missing
4. **Detect Duplicates**: Check for similar existing contracts
5. **Confirm Creation**: Present parsed data for user confirmation
6. **Create Contract**: Save to database with AI supervisor validation

### Duplicate Detection Logic
```typescript
// Check for similar contracts
const similarContracts = await prisma.contract.findMany({
  where: {
    teamId,
    OR: [
      { clientName: { contains: extractedClientName, mode: 'insensitive' } },
      { projectName: { contains: extractedProjectName, mode: 'insensitive' } }
    ]
  }
});

// If found, ask: "Editar existente ou criar novo?"
```

## Form Handling Context

### Manual Contract Creation
**Location**: Contract management interface with manual form

#### Form Fields and Validation
```typescript
interface ContractForm {
  clientName: string          // Required, trim whitespace
  projectName: string         // Required, trim whitespace
  description?: string        // Optional, multiline text
  totalValue: number         // Required, positive number, no step="0.01"
  signedDate: string         // Required, YYYY-MM-DD format
  category?: string          // Optional, predefined categories
  notes?: string             // Optional, multiline text
}
```

#### Critical Form Patterns
1. **Currency Input**:
   - NO `step="0.01"` attribute (causes precision loss)
   - Use `onWheel={(e) => e.currentTarget.blur()}` to prevent scroll changes
   - Parse as whole numbers to avoid floating-point issues

2. **Date Input**:
   - Use `getTodayDateString()` for defaults (not `new Date().toISOString()`)
   - Format as YYYY-MM-DD for input fields
   - Store using `createDateForStorage()` for timezone safety

3. **Required Field Indicators**:
   - Mark required fields with asterisk (*)
   - Provide immediate validation feedback

## Status Management Context

### Contract Status Lifecycle
```typescript
// Status progression patterns
'active' → 'completed'    // Project finished successfully
'active' → 'cancelled'    // Project terminated
'completed' ← 'active'    // Reopen if needed (rare)

// Status implications
'active': Can create receivables, expenses, show in active lists
'completed': Historical view, typically no new receivables
'cancelled': Handle existing receivables, prevent new ones
```

### UI Display Patterns
- **Active Contracts**: Default view, primary focus
- **All Contracts**: When user explicitly chooses to see completed/cancelled
- **Status Indicators**: Use semantic colors (green=active, gray=completed, red=cancelled)

## Integration Points

### Receivables Integration
```typescript
// When creating receivables, validate against contract
const contract = await prisma.contract.findUnique({
  where: { id: contractId, teamId }
});

// Check contract status
if (contract.status === 'cancelled') {
  // Warn or prevent new receivables
}

// Validate total doesn't exceed contract value (warning, not error)
const totalReceivables = await getTotalReceivables(contractId);
if (expectedAmount + totalReceivables > contract.totalValue) {
  // AI supervisor alert: potential over-billing
}
```

### Expense Integration
```typescript
// Expenses can be linked to contracts (optional)
const expenseWithContract = {
  ...expenseData,
  contractId: selectedContract?.id || null  // null = operational expense
};
```

## Common Development Patterns

### Error Handling
```typescript
try {
  const contract = await prisma.contract.create({
    data: {
      ...contractData,
      teamId: user.teamId  // Always include team context
    }
  });

  // Check for AI supervisor alerts
  const alerts = await aiSupervisor.validateContract(contract);

  return { contract, alerts };
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    return { error: 'Duplicate contract detected' };
  }
  throw error;
}
```

### Query Optimization
```typescript
// Include related data efficiently
const contracts = await prisma.contract.findMany({
  where: { teamId },
  include: {
    receivables: {
      select: { amount: true, status: true }  // Only needed fields
    },
    _count: {
      select: { expenses: true }  // Count instead of full data
    }
  },
  orderBy: { signedDate: 'desc' }
});
```

## Testing Context

### Critical Test Scenarios
1. **Precision Bug Prevention**:
   - Test currency input with scroll wheel
   - Verify exact values are preserved (200 → 200, not 198)

2. **Team Isolation**:
   - Verify contracts are filtered by teamId
   - Test unauthorized access attempts

3. **AI Parsing**:
   - Test various natural language inputs
   - Verify duplicate detection works
   - Test missing information handling

4. **Date Handling**:
   - Test timezone edge cases
   - Verify default dates are correct (today, not tomorrow)

### Example Test Data
```typescript
const testContracts = [
  {
    clientName: "João Silva",
    projectName: "Casa Residencial",
    totalValue: 15000,
    signedDate: "2024-09-15",
    category: "Residencial",
    status: "active"
  },
  {
    clientName: "Maria Santos Ltda",
    projectName: "Loja Comercial",
    totalValue: 45000,
    signedDate: "2024-08-20",
    category: "Comercial",
    status: "completed"
  }
];
```

## Troubleshooting Context

### Common Issues and Solutions

#### "Contract values changing unexpectedly"
- **Cause**: Scroll wheel on number inputs
- **Solution**: Verify `onWheel={(e) => e.currentTarget.blur()}` is applied
- **Test**: Hover over input and scroll - value should not change

#### "Wrong dates being saved"
- **Cause**: Timezone handling issues
- **Solution**: Use `createDateForStorage()` function
- **Test**: Create contract with today's date, verify it shows correctly

#### "AI not parsing contracts correctly"
- **Cause**: Unexpected input format or missing context
- **Solution**: Check conversation history, verify language patterns
- **Test**: Use known working examples first

#### "Duplicate contracts not detected"
- **Cause**: Fuzzy matching logic issues
- **Solution**: Check similarity thresholds and field comparisons
- **Test**: Create contracts with similar names, verify detection

## Business Context

### Architect Workflow Patterns
1. **Contract Creation**: Usually after client meetings and proposals
2. **Project Lifecycle**: Active → milestone payments → completion
3. **Client Relationships**: Long-term relationships, repeat projects
4. **Revenue Planning**: Contracts drive cash flow projections

### Brazilian Business Context
- **Currency**: Real (R$) with format R$ 1.234,56
- **Dates**: DD/MM/YYYY format for display
- **Language**: Portuguese interface and AI processing
- **Legal**: LGPD compliance for client data

---

*This context provides everything needed for LLM agents to effectively work with contract management functionality in ArqCashflow while maintaining data integrity and business logic consistency.*