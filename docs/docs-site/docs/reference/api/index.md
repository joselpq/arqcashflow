---
title: "API Reference"
type: "reference"
audience: ["developer", "agent"]
contexts: ["api", "rest", "documentation"]
complexity: "intermediate"
last_updated: "2025-09-28"
version: "1.0"
agent_roles: ["api-developer", "integration-engineer"]
---

# API Reference

Comprehensive API documentation for ArqCashflow REST endpoints.

## Available APIs

- [Agents-onboarding API](./agents-onboarding.md)
- [Ai-assistant API](./ai-assistant.md)
- [Ai-query API](./ai-query.md)
- [Ai-setup-assistant-direct API](./ai-setup-assistant-direct.md)
- [Ai-setup-assistant-v2-multi API](./ai-setup-assistant-v2-multi.md)
- [Ai-setup-assistant-v2 API](./ai-setup-assistant-v2.md)
- [Auth-[...nextauth] API](./auth-[...nextauth].md)
- [Auth-register API](./auth-register.md)
- [Contracts-by-id API](./contracts-by-id.md)
- [Contracts API](./contracts.md)
- [Cron-generate-recurring API](./cron-generate-recurring.md)
- [Dashboard API](./dashboard.md)
- [Expenses-by-id-recurring-action API](./expenses-by-id-recurring-action.md)
- [Expenses-by-id API](./expenses-by-id.md)
- [Expenses API](./expenses.md)
- [Export-excel API](./export-excel.md)
- [Export-google-sheets API](./export-google-sheets.md)
- [Export-sheets-data API](./export-sheets-data.md)
- [Monitoring-health API](./monitoring-health.md)
- [Onboarding-complete API](./onboarding-complete.md)
- [Onboarding-profile API](./onboarding-profile.md)
- [Onboarding-status API](./onboarding-status.md)
- [Receivables-by-id API](./receivables-by-id.md)
- [Receivables API](./receivables.md)
- [Recurring-expenses-by-id-generate API](./recurring-expenses-by-id-generate.md)
- [Recurring-expenses-by-id API](./recurring-expenses-by-id.md)
- [Recurring-expenses-by-id-series API](./recurring-expenses-by-id-series.md)
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

---

*This documentation is auto-generated from the codebase. Last updated: 2025-09-28*