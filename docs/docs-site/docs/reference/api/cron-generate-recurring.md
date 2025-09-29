---
title: "Generate-recurring API"
type: "reference"
audience: ["developer", "agent"]
contexts: ["api", "generate-recurring", "rest", "database"]
complexity: "intermediate"
last_updated: "2025-09-29"
version: "1.0"
agent_roles: ["api-developer", "integration-engineer"]
related:
  - developer/architecture/overview.md
  - agents/contexts/contract-management.md
dependencies: ["next.js", "prisma", "zod"]
---

# Generate-recurring API

Comprehensive API reference for generate-recurring management operations.

## Context for LLM Agents

**Scope**: Complete generate-recurring API operations including CRUD, filtering, sorting, and business logic
**Prerequisites**: Understanding of REST APIs, Next.js App Router, Prisma ORM, and team-based data isolation
**Key Patterns**:
- RESTful endpoint design with standard HTTP methods
- Team-based data isolation for multi-tenant security
- Zod validation for type-safe request/response handling
- Consistent error handling and response formats
- Session-based authentication required for all operations

## Endpoint Overview

**Base URL**: `/api/cron/generate-recurring`
**Methods**: GET, POST
**Authentication**: Required
**Team Isolation**: No


## GET /api/cron/generate-recurring

Retrieve generate-recurring records with optional filtering and sorting.

### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|


### Example Request

```bash
curl -X GET "http://localhost:3000/api/cron/generate-recurring?status=active&sortBy=createdAt&sortOrder=desc" \
  -H "Content-Type: application/json"
```

### Response Format

```typescript
interface Generate-recurringResponse {
  data: Generate-recurring[];
  total: number;
  filters: {
    status: string;
    category?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}
```



## POST /api/cron/generate-recurring

Create a new generate-recurring record.

### Request Body



### Example Request

```bash
curl -X POST "http://localhost:3000/api/cron/generate-recurring" \
  -H "Content-Type: application/json" \
  -d '{
    "example": "Request body will be populated based on the specific generate-recurring schema"
  }'
```

### Response

```typescript
interface CreateResponse {
  data: Generate-recurring;
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