---
title: "Auto-number API"
type: "reference"
audience: ["developer", "agent"]
contexts: ["api", "auto-number", "rest", "database"]
complexity: "intermediate"
last_updated: "2025-09-29"
version: "1.0"
agent_roles: ["api-developer", "integration-engineer"]
related:
  - developer/architecture/overview.md
  - agents/contexts/contract-management.md
dependencies: ["next.js", "prisma", "zod"]
---

# Auto-number API

Comprehensive API reference for auto-number management operations.

## Context for LLM Agents

**Scope**: Complete auto-number API operations including CRUD, filtering, sorting, and business logic
**Prerequisites**: Understanding of REST APIs, Next.js App Router, Prisma ORM, and team-based data isolation
**Key Patterns**:
- RESTful endpoint design with standard HTTP methods
- Team-based data isolation for multi-tenant security
- Zod validation for type-safe request/response handling
- Consistent error handling and response formats


## Endpoint Overview

**Base URL**: `/api/contracts/auto-number`
**Methods**: POST
**Authentication**: None
**Team Isolation**: No




## POST /api/contracts/auto-number

Create a new auto-number record.

### Request Body


Schema validation using Zod:

```typescript
const AutoNumberSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  projectName: z.string().min(1, 'Project name is required'),
  excludeId: z.string().optional(), // For updates
});
```


### Example Request

```bash
curl -X POST "http://localhost:3000/api/contracts/auto-number" \
  -H "Content-Type: application/json" \
  -d '{
    "example": "Request body will be populated based on the specific auto-number schema"
  }'
```

### Response

```typescript
interface CreateResponse {
  data: Auto-number;
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



## Implementation Notes

### Business Logic
- **Team Isolation**: Not applicable
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