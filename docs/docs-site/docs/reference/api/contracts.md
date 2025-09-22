---
title: "Contracts API Reference"
type: "reference"
audience: ["developer", "agent"]
contexts: ["api", "contracts", "backend"]
complexity: "intermediate"
last_updated: "2025-09-22"
version: "1.0"
agent_roles: ["api-developer", "backend-engineer"]
related:
  - reference/api/receivables.md
  - reference/api/expenses.md
  - developer/architecture/overview.md
dependencies: ["next.js", "prisma", "zod"]
---

# Contracts API Reference

RESTful API endpoints for managing contracts with team-based isolation.

## Context for LLM Agents

**Scope**: Contract CRUD operations and API specifications
**Prerequisites**: Understanding of REST APIs, authentication, team-based filtering
**Key Patterns**:
- Team-based data isolation pattern
- Zod validation pattern
- Error handling pattern

## Base URL

```
Development: http://localhost:3000/api/contracts
Production: https://your-domain.vercel.app/api/contracts
```

## Authentication

All endpoints require authentication via NextAuth.js session.

```typescript
// Required headers
{
  "Cookie": "next-auth.session-token=..."
}
```

## Endpoints

### GET /api/contracts

Retrieve all contracts for the authenticated user's team.

**Query Parameters:**
- `status` (optional): Filter by status ("active" | "completed" | "cancelled")
- `category` (optional): Filter by category ID
- `sortBy` (optional): Sort field ("createdAt" | "totalValue" | "signedDate")
- `sortOrder` (optional): Sort direction ("asc" | "desc")

**Response:**
```json
[
  {
    "id": "clxxxxxxxx",
    "clientName": "João Silva",
    "projectName": "Residência Alphaville",
    "totalValue": 150000,
    "signedDate": "2024-01-15T00:00:00.000Z",
    "status": "active",
    "category": "residential",
    "description": "Projeto completo de residência",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "teamId": "clxxxxxxxx",
    "userId": "clxxxxxxxx"
  }
]
```

### GET /api/contracts/:id

Retrieve a specific contract by ID.

**Response:**
```json
{
  "id": "clxxxxxxxx",
  "clientName": "João Silva",
  "projectName": "Residência Alphaville",
  "totalValue": 150000,
  "signedDate": "2024-01-15T00:00:00.000Z",
  "status": "active",
  "category": "residential",
  "description": "Projeto completo de residência",
  "teamId": "clxxxxxxxx",
  "userId": "clxxxxxxxx"
}
```

### POST /api/contracts

Create a new contract.

**Request Body:**
```json
{
  "clientName": "João Silva",
  "projectName": "Residência Alphaville",
  "totalValue": 150000,
  "signedDate": "2024-01-15",
  "status": "active",
  "category": "residential",
  "description": "Projeto completo de residência"
}
```

**Validation Schema (Zod):**
```typescript
const contractSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  projectName: z.string().min(1, "Project name is required"),
  totalValue: z.number().positive("Total value must be positive"),
  signedDate: z.string(),
  status: z.enum(["active", "completed", "cancelled"]).optional(),
  category: z.string().optional(),
  description: z.string().optional()
})
```

**Response:**
```json
{
  "id": "clxxxxxxxx",
  "clientName": "João Silva",
  "projectName": "Residência Alphaville",
  "totalValue": 150000,
  "signedDate": "2024-01-15T00:00:00.000Z",
  "status": "active",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### PUT /api/contracts/:id

Update an existing contract.

**Request Body:**
```json
{
  "clientName": "João Silva",
  "projectName": "Residência Alphaville - Revisão",
  "totalValue": 175000,
  "status": "active"
}
```

**Response:**
```json
{
  "id": "clxxxxxxxx",
  "clientName": "João Silva",
  "projectName": "Residência Alphaville - Revisão",
  "totalValue": 175000,
  "status": "active",
  "updatedAt": "2024-01-16T14:20:00.000Z"
}
```

### DELETE /api/contracts/:id

Delete a contract.

**Response:**
```json
{
  "message": "Contract deleted successfully"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request body",
  "details": {
    "clientName": "Client name is required",
    "totalValue": "Total value must be positive"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "Contract not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch contracts"
}
```

## Data Model

```typescript
interface Contract {
  id: string
  clientName: string
  projectName: string
  totalValue: number
  signedDate: Date
  status: "active" | "completed" | "cancelled"
  category?: string
  description?: string
  createdAt: Date
  updatedAt: Date
  teamId: string
  userId: string

  // Relations
  receivables?: Receivable[]
  expenses?: Expense[]
  auditLogs?: AuditLog[]
}
```

## Implementation Details

### Team Isolation
All queries automatically filter by the authenticated user's teamId:

```typescript
const contracts = await prisma.contract.findMany({
  where: {
    teamId: user.team.id,
    ...additionalFilters
  }
})
```

### Duplicate Handling
When creating contracts with duplicate client/project names:

```typescript
// Auto-increment pattern
"João Silva - Residência" → "João Silva - Residência 2"
```

### Precision Handling
Financial values use proper decimal handling:

```typescript
// Convert to number before storage
const totalValue = parseFloat(formData.totalValue)
```

## Usage Examples

### JavaScript/TypeScript
```typescript
// Fetch contracts
const response = await fetch('/api/contracts', {
  credentials: 'include'
})
const contracts = await response.json()

// Create contract
const response = await fetch('/api/contracts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    clientName: 'João Silva',
    projectName: 'Casa Nova',
    totalValue: 150000,
    signedDate: '2024-01-15',
    status: 'active'
  })
})
```

### cURL
```bash
# Get contracts
curl -X GET http://localhost:3000/api/contracts \
  -H "Cookie: next-auth.session-token=..."

# Create contract
curl -X POST http://localhost:3000/api/contracts \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "clientName": "João Silva",
    "projectName": "Casa Nova",
    "totalValue": 150000,
    "signedDate": "2024-01-15"
  }'
```

## Rate Limiting

Currently no rate limiting implemented. Future considerations:
- 100 requests per minute per user
- 1000 requests per hour per team

## Webhooks

Not currently implemented. Future webhook events:
- `contract.created`
- `contract.updated`
- `contract.deleted`
- `contract.status_changed`

---

*For related API endpoints, see the receivables and expenses API documentation.*