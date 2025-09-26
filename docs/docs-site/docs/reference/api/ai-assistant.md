---
title: "Assistant API"
type: "reference"
audience: ["developer", "agent"]
contexts: ["api", "assistant", "rest", "database"]
complexity: "intermediate"
last_updated: "2025-09-26"
version: "1.0"
agent_roles: ["api-developer", "integration-engineer"]
related:
  - developer/architecture/overview.md
  - agents/contexts/contract-management.md
dependencies: ["next.js", "prisma", "zod"]
---

# Assistant API

Comprehensive API reference for assistant management operations.

## Context for LLM Agents

**Scope**: Complete assistant API operations including CRUD, filtering, sorting, and business logic
**Prerequisites**: Understanding of REST APIs, Next.js App Router, Prisma ORM, and team-based data isolation
**Key Patterns**:
- RESTful endpoint design with standard HTTP methods
- Team-based data isolation for multi-tenant security
- Zod validation for type-safe request/response handling
- Consistent error handling and response formats
- Session-based authentication required for all operations

## Endpoint Overview

**Base URL**: `/api/ai/assistant`
**Methods**: POST
**Authentication**: Required
**Team Isolation**: Yes




## POST /api/ai/assistant

Create a new assistant record.

### Request Body


Schema validation using Zod:

```typescript
const AssistantRequestSchema = z.object({
  message: z.string().optional(),
  files: z.array(z.object({
    name: z.string(),
    type: z.string(),
    base64: z.string()
  });
```


### Example Request

```bash
curl -X POST "http://localhost:3000/api/ai/assistant" \
  -H "Content-Type: application/json" \
  -d '{
    "example": "Request body will be populated based on the specific assistant schema"
  }'
```

### Response

```typescript
interface CreateResponse {
  data: Assistant;
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

All assistant operations are automatically filtered by team context:

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