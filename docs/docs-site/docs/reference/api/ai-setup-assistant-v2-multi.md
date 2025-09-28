---
title: "Setup Assistant V2 Multi-File API"
type: "reference"
audience: ["developer", "agent"]
contexts: ["api", "multi-file", "setup-assistant", "ai", "document-processing", "phase2"]
complexity: "intermediate"
last_updated: "2025-09-28"
version: "1.0"
agent_roles: ["api-developer", "ai-integration-engineer", "setup-assistant-developer"]
related:
  - reference/api/ai-setup-assistant-v2.md
  - developer/architecture/overview.md
  - agents/examples/ai-document-processing.md
dependencies: ["next.js", "prisma", "anthropic-ai", "xlsx", "team-context-middleware"]
---

# Setup Assistant V2 Multi-File API

API endpoint for processing multiple files simultaneously through the Setup Assistant V2 service layer.

## Context for LLM Agents

**Scope**: Multi-file batch processing for financial document extraction using Claude AI with sequential processing
**Prerequisites**: Understanding of Setup Assistant V2 architecture, service layer integration, and team-based data isolation
**Key Patterns**:
- Sequential file processing for reliability
- Smart retry logic for rate limiting
- Combined results aggregation
- Progress tracking support
- Team context middleware integration
- Service layer with audit logging

## Endpoint Overview

**Base URL**: `/api/ai/setup-assistant-v2/multi`
**Methods**: POST, GET
**Authentication**: Required
**Team Isolation**: No


## GET /api/ai/setup-assistant-v2/multi

Retrieve multi records with optional filtering and sorting.

### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|


### Example Request

```bash
curl -X GET "http://localhost:3000/api/ai/setup-assistant-v2/multi?status=active&sortBy=createdAt&sortOrder=desc" \
  -H "Content-Type: application/json"
```

### Response Format

```typescript
interface MultiResponse {
  data: Multi[];
  total: number;
  filters: {
    status: string;
    category?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}
```



## POST /api/ai/setup-assistant-v2/multi

Create a new multi record.

### Request Body



### Example Request

```bash
curl -X POST "http://localhost:3000/api/ai/setup-assistant-v2/multi" \
  -H "Content-Type: application/json" \
  -d '{
    "example": "Request body will be populated based on the specific multi schema"
  }'
```

### Response

```typescript
interface CreateResponse {
  data: Multi;
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