---
title: "Complete API"
type: "reference"
audience: ["developer", "agent"]
contexts: ["api", "complete", "rest", "database"]
complexity: "intermediate"
last_updated: "2025-09-26"
version: "1.0"
agent_roles: ["api-developer", "integration-engineer"]
related:
  - developer/architecture/overview.md
  - agents/contexts/contract-management.md
dependencies: ["next.js", "prisma", "zod"]
---

# Complete API

Comprehensive API reference for complete management operations.

## Context for LLM Agents

**Scope**: Complete complete API operations including CRUD, filtering, sorting, and business logic
**Prerequisites**: Understanding of REST APIs, Next.js App Router, Prisma ORM, and team-based data isolation
**Key Patterns**:
- RESTful endpoint design with standard HTTP methods
- Team-based data isolation for multi-tenant security
- Zod validation for type-safe request/response handling
- Consistent error handling and response formats
- Session-based authentication required for all operations

## Endpoint Overview

**Base URL**: `/api/onboarding/complete`
**Methods**: POST
**Authentication**: Required
**Team Isolation**: No




## POST /api/onboarding/complete

Create a new complete record.

### Request Body



### Example Request

```bash
curl -X POST "http://localhost:3000/api/onboarding/complete" \
  -H "Content-Type: application/json" \
  -d '{
    "example": "Request body will be populated based on the specific complete schema"
  }'
```

### Response

```typescript
interface CreateResponse {
  data: Complete;
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