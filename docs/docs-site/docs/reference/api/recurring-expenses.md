---
title: "Recurring-expenses API"
type: "reference"
audience: ["developer", "agent"]
contexts: ["api", "recurring-expenses", "rest", "database"]
complexity: "intermediate"
last_updated: "2025-09-25"
version: "1.0"
agent_roles: ["api-developer", "integration-engineer"]
related:
  - developer/architecture/overview.md
  - agents/contexts/contract-management.md
dependencies: ["next.js", "prisma", "zod"]
---

# Recurring-expenses API

Comprehensive API reference for recurring-expenses management operations.

## Context for LLM Agents

**Scope**: Complete recurring-expenses API operations including CRUD, filtering, sorting, and business logic
**Prerequisites**: Understanding of REST APIs, Next.js App Router, Prisma ORM, and team-based data isolation
**Key Patterns**:
- RESTful endpoint design with standard HTTP methods
- Team-based data isolation for multi-tenant security
- Zod validation for type-safe request/response handling
- Consistent error handling and response formats
- Session-based authentication required for all operations

## Endpoint Overview

**Base URL**: `/api/recurring-expenses`
**Methods**: GET, POST
**Authentication**: Required
**Team Isolation**: Yes


## GET /api/recurring-expenses

Retrieve recurring-expenses records with optional filtering and sorting.

### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `sortBy` | string | Sort field | `createdAt` |
| `sortOrder` | string | Sort direction (`asc`/`desc`) | `desc` |
| `status` | string | Filter by status | `all` |
| `category` | string | Filter by category | `all` |

### Example Request

```bash
curl -X GET "http://localhost:3000/api/recurring-expenses?status=active&sortBy=createdAt&sortOrder=desc" \
  -H "Content-Type: application/json"
```

### Response Format

```typescript
interface Recurring-expensesResponse {
  data: Recurring-expenses[];
  total: number;
  filters: {
    status: string;
    category?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}
```



## POST /api/recurring-expenses

Create a new recurring-expenses record.

### Request Body


Schema validation using Zod:

```typescript
const RecurringExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'annual'], {
    errorMap: () => ({ message: 'Frequency must be weekly, monthly, quarterly, or annual' });
```


### Example Request

```bash
curl -X POST "http://localhost:3000/api/recurring-expenses" \
  -H "Content-Type: application/json" \
  -d '{
    "example": "Request body will be populated based on the specific recurring-expenses schema"
  }'
```

### Response

```typescript
interface CreateResponse {
  data: Recurring-expenses;
  alerts?: AIAlert[];
}
```






## Error Handling

### Standard Error Responses

```typescript
interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request data |
| 401 | UNAUTHORIZED | Authentication required |
| 403 | FORBIDDEN | Access denied |
| 404 | NOT_FOUND | Resource not found |
| 500 | INTERNAL_ERROR | Server error |


## Team Isolation

All recurring-expenses operations are automatically filtered by team context:

```typescript
// All queries include team isolation
const where = {
  teamId: session.user.teamId,
  ...additionalFilters
};
```

This ensures complete data separation between teams in the multi-tenant system.


## Implementation Notes

### Business Logic
- **Team Isolation**: Enforced at API level
- **Authentication**: Required for all operations
- **Validation**: Zod schemas ensure type safety
- **Error Handling**: Consistent error responses across all endpoints

### Performance Considerations
- **Pagination**: Consider implementing for large result sets
- **Indexing**: Ensure database indexes for filtered fields
- **Caching**: Consider response caching for frequently accessed data

### Related Documentation
- [Architecture Overview](../../developer/architecture/overview.md)
- [Database Schema](../../developer/architecture/database.md)
- [Authentication Guide](../../developer/authentication.md)

---

*This documentation is auto-generated from the codebase. For updates, modify the source API routes and regenerate.*