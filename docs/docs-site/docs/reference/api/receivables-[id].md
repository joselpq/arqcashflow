---
title: "[id] API"
type: "reference"
audience: ["developer", "agent"]
contexts: ["api", "[id]", "rest", "database"]
complexity: "intermediate"
last_updated: "2025-09-23"
version: "1.0"
agent_roles: ["api-developer", "integration-engineer"]
related:
  - developer/architecture/overview.md
  - agents/contexts/contract-management.md
dependencies: ["next.js", "prisma", "zod"]
---

# [id] API

Comprehensive API reference for [id] management operations.

## Context for LLM Agents

**Scope**: Complete [id] API operations including CRUD, filtering, sorting, and business logic
**Prerequisites**: Understanding of REST APIs, Next.js App Router, Prisma ORM, and team-based data isolation
**Key Patterns**:
- RESTful endpoint design with standard HTTP methods
- Team-based data isolation for multi-tenant security
- Zod validation for type-safe request/response handling
- Consistent error handling and response formats


## Endpoint Overview

**Base URL**: `/api/receivables/\{id\}`
**Methods**: PUT, DELETE
**Authentication**: None
**Team Isolation**: Yes






## PUT /api/receivables/\{id\}

Update an existing [id] record.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | [id] ID |

### Request Body

All fields are optional for updates.

### Example Request

```bash
curl -X PUT "http://localhost:3000/api/receivables/\{id\}/clx123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```



## DELETE /api/receivables/\{id\}

Delete a [id] record.

⚠️ **Warning**: This operation may cascade to related records. Use with caution.

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | [id] ID |

### Example Request

```bash
curl -X DELETE "http://localhost:3000/api/receivables/\{id\}/clx123456789"
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

All [id] operations are automatically filtered by team context:

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
- **Authentication**: Public access
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