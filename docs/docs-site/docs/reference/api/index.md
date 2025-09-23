---
title: "API Reference"
type: "reference"
audience: ["developer", "agent"]
contexts: ["api", "rest", "documentation"]
complexity: "intermediate"
last_updated: "2025-09-23"
version: "1.0"
agent_roles: ["api-developer", "integration-engineer"]
---

# API Reference

Comprehensive API documentation for ArqCashflow REST endpoints.

## Available APIs

- [Ai-assistant API](./ai-assistant.md)
- [Ai-query API](./ai-query.md)
- [Ai-setup-assistant-direct API](./ai-setup-assistant-direct.md)
- [Auth-[...nextauth] API](./auth-[...nextauth].md)
- [Auth-register API](./auth-register.md)
- [Contracts-[id] API](./contracts-[id].md)
- [Contracts API](./contracts.md)
- [Cron-generate-recurring API](./cron-generate-recurring.md)
- [Dashboard API](./dashboard.md)
- [Expenses-[id]-recurring-action API](./expenses-[id]-recurring-action.md)
- [Expenses-[id] API](./expenses-[id].md)
- [Expenses API](./expenses.md)
- [Export-excel API](./export-excel.md)
- [Export-google-sheets API](./export-google-sheets.md)
- [Export-sheets-data API](./export-sheets-data.md)
- [Onboarding-complete API](./onboarding-complete.md)
- [Onboarding-profile API](./onboarding-profile.md)
- [Onboarding-status API](./onboarding-status.md)
- [Receivables-[id] API](./receivables-[id].md)
- [Receivables API](./receivables.md)
- [Recurring-expenses-[id]-generate API](./recurring-expenses-[id]-generate.md)
- [Recurring-expenses-[id] API](./recurring-expenses-[id].md)
- [Recurring-expenses API](./recurring-expenses.md)

## General Information

### Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.vercel.app/api
```

### Authentication
Most endpoints require authentication. Include session cookies or use NextAuth.js authentication.

### Content Type
All requests and responses use `application/json` content type.

### Team Isolation
All data operations are automatically filtered by team context for multi-tenant security.

### Migration Status
The following APIs have been migrated to use the team context middleware:
- ✅ Contracts API (29% code reduction)
- ✅ Receivables API (35% code reduction)
- ✅ Expenses API (31% code reduction)
- ✅ Dashboard API (14.5% code reduction)
- ✅ Individual resource APIs ([id] routes)

## LLM Context

**Purpose**: Comprehensive API documentation for ArqCashflow financial management system
**Key Features**: Team-based isolation, NextAuth.js authentication, RESTful endpoints
**Architecture**: Next.js App Router with Prisma ORM and PostgreSQL
**Security**: Multi-tenant team context middleware for data isolation
**Testing**: Authenticated testing framework with pre-configured test users

---

*This documentation is auto-generated from the codebase. Last updated: 2025-09-23*