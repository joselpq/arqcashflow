---
title: "Architecture Overview"
type: "reference"
audience: ["developer", "agent"]
contexts: ["architecture", "system-design", "service-layer", "phase3-migration"]
complexity: "intermediate"
last_updated: "2025-09-25"
version: "1.0"
agent_roles: ["architecture-reviewer", "system-analyzer"]
related:
  - developer/setup.md
  - decisions/006-service-layer-migration-plan.md
dependencies: ["next.js", "prisma", "postgresql", "service-layer"]
---

# Architecture Overview

ArqCashflow is a full-stack financial management system built with Next.js, featuring AI integration, multi-tenant architecture, and LLM-agent-optimized development patterns.

## Context for LLM Agents

**Scope**: Complete system architecture including API patterns, database design, and AI integration
**Prerequisites**: Understanding of Next.js, Prisma ORM, multi-tenant systems, and RESTful APIs
**Key Patterns**:
- Full-stack Next.js with App Router
- Database-first design with team-based isolation
- API-driven architecture with type safety
- AI-powered document processing and NLP
- Multi-tenant data segregation

## Technology Stack

### Frontend Layer
- **Next.js 15**: Full-stack React framework with App Router
- **TypeScript**: Type safety across the entire application
- **Tailwind CSS**: Utility-first CSS framework for styling
- **React 19**: Latest React features and concurrent rendering
- **ExcelJS**: Excel file generation with charts and formatting

### Backend Layer
- **Next.js API Routes**: Serverless API endpoints with edge runtime
- **Prisma ORM**: Type-safe database operations and migrations
- **PostgreSQL**: Production database (Neon/Railway)
- **SQLite**: Development database (file-based)
- **Zod**: Runtime type validation and parsing

### AI Integration
- **Claude API (Anthropic)**: Advanced document processing and natural language understanding
- **Vision Capabilities**: Direct PDF and image analysis up to 32MB
- **Smart Upload Strategy**: Automatic method selection based on file size
- **Intent Classification**: Claude Haiku 3.5 for fast categorization
- **Document Analysis**: Claude Sonnet 3.5 for advanced reasoning

### Authentication & Security
- **NextAuth.js**: Credential-based authentication with JWT sessions
- **Team-based isolation**: Complete multi-tenant data segregation
- **Route protection**: Middleware-based authentication guards
- **API security**: All endpoints require authentication and filter by team

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer     │    │   Database      │    │   AI Services   │
│   (Next.js)     │◄──►│   (Next.js)     │◄──►│   (PostgreSQL)  │    │   (Claude)      │
│                 │    │                 │    │                 │    │                 │
│ - React UI      │    │ - REST APIs     │    │ - Prisma Schema │◄──►│ - Document Proc │
│ - TypeScript    │    │ - Authentication│    │ - Team Isolation│    │ - NLP Queries   │
│ - Tailwind CSS  │    │ - Data Validation│   │ - Audit Logging │    │ - Vision API    │
│ - Forms/Tables  │    │ - Export APIs   │    │ - Relationships │    │ - Classification│
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │                       │
          └─── Authentication ────┴─── Session Management ──┴─── Team Context ────┘
```

### Data Flow Architecture

```
User Request → Middleware (Auth) → API Route → Zod Validation → Prisma (Team Filter) → Database
     ↓                                           ↓                        ↓
UI Update ← JSON Response ← Business Logic ← Team-Filtered Data ← PostgreSQL
```

## Core Architectural Patterns

### API Routes Pattern
All API routes follow this standardized structure:
```typescript
// app/api/[resource]/route.ts - Collection operations
export async function GET(request: NextRequest) {
  // Parse query params for filtering/sorting
  // Build Prisma where clause with team isolation
  // Return JSON response
}

export async function POST(request: NextRequest) {
  // Validate with Zod schema
  // Create resource with Prisma (team-scoped)
  // Return created resource + AI supervisor alerts
}

// app/api/[resource]/[id]/route.ts - Item operations
export async function GET/PUT/DELETE(request, { params }) {
  // Use params.id for specific resource operations
  // Always filter by teamId for security
}
```

### UI Component Pattern
All pages follow this consistent structure:
```typescript
'use client'
import { useState, useEffect } from 'react'

export default function PageComponent() {
  // State management
  const [data, setData] = useState([])
  const [filters, setFilters] = useState({ ... })
  const [formData, setFormData] = useState({ ... })
  const [editingItem, setEditingItem] = useState(null)

  // Effects
  useEffect(() => { fetchData() }, [filters])

  // CRUD functions
  async function fetchData() { ... }
  async function handleSubmit() { ... }
  async function editItem() { ... }
  async function deleteItem() { ... }

  // Render with filters + form + list
}
```

### Database Query Patterns
```typescript
// Team-isolated filtering
const where: any = { teamId } // Always include team context
if (status && status !== 'all') where.status = status
if (category && category !== 'all') where.category = category

// Sorting with validation
const orderBy: any = {}
if (validSortFields.includes(sortBy)) {
  orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc'
}

// Query with relations
const results = await prisma.model.findMany({
  where,
  include: { relatedModel: true },
  orderBy,
})
```

## Key Design Decisions

### Multi-Tenant Architecture
- **Team-based isolation**: All data filtered by `teamId` at API level
- **Security by default**: Middleware enforces authentication
- **Data segregation**: Complete isolation between teams
- **Audit trail**: Full change tracking with team context

### Database Design
- **Relational integrity**: Foreign keys with appropriate cascade behavior
- **Flexible relationships**: Contracts can exist without receivables/expenses
- **Calculated fields**: Status fields computed at runtime (overdue, health)
- **Indexed performance**: Strategic indexes on frequently queried fields

### API Design Philosophy
- **RESTful endpoints**: Standard HTTP methods and status codes
- **Type-safe validation**: Zod schemas for all request/response data
- **Consistent error handling**: Standardized error responses across all endpoints
- **Query flexibility**: Comprehensive filtering and sorting options
- **AI integration**: Supervisor system provides intelligent validation

### AI Integration Strategy
- **Dual model approach**: Haiku for speed, Sonnet for complexity
- **Context-aware processing**: Document type detection and smart extraction
- **Conversation memory**: Multi-turn interactions with full context retention
- **Large file support**: Smart upload strategy for files up to 32MB
- **Fallback strategies**: Graceful degradation when AI services unavailable
- **Portuguese optimization**: Native Brazilian Portuguese support

## Project Structure

```
arqcashflow/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── contracts/            # Contract CRUD with filtering/sorting
│   │   ├── receivables/          # Receivable CRUD with payment tracking
│   │   ├── expenses/             # Expense CRUD with vendor management
│   │   ├── budgets/              # Budget management with utilization
│   │   ├── export/               # Excel/Google Sheets generation
│   │   ├── ai/                   # AI-powered features
│   │   ├── audit/                # Audit trail queries
│   │   ├── auth/                 # Authentication endpoints
│   │   └── onboarding/           # User onboarding flow
│   ├── components/               # Reusable UI components
│   ├── (authenticated)/          # Protected page routes
│   └── (public)/                 # Public pages (landing, auth)
├── lib/                          # Shared utilities
│   ├── prisma.ts                 # Database client singleton
│   ├── auth.ts                   # Authentication configuration
│   ├── date-utils.ts             # Date handling utilities
│   └── validation/               # Zod schemas
├── prisma/                       # Database management
│   ├── schema.prisma             # Database schema definition
│   └── migrations/               # Database migration files
└── docs/                         # Documentation system
```

## Performance Considerations

### Database Optimization
- **Strategic indexing**: All frequently queried fields have indexes
- **Query optimization**: Selective includes and efficient where clauses
- **Connection pooling**: Production database connection management
- **Team filtering**: Ensures data isolation while maintaining performance

### Frontend Performance
- **Server-side rendering**: Next.js App Router with RSC
- **Optimistic updates**: Immediate UI feedback for better UX
- **Efficient re-rendering**: Strategic use of React hooks and dependencies
- **Progressive enhancement**: Core functionality works without JavaScript

### AI Integration Performance
- **Smart upload strategy**: Automatic method selection based on file size
- **Model selection**: Haiku for speed, Sonnet for complex reasoning
- **Caching strategies**: Conversation context and document processing results
- **Async processing**: Non-blocking AI operations where possible

## Related Documentation

- [Development Setup](../setup.md) - Environment configuration and workflow
- [Production Deployment](../deployment/production.md) - Deployment strategies and environment setup
- [API Reference](../../reference/api/contracts.md) - Complete API documentation
- [Database Schema](./database.md) - Detailed schema documentation

---

*This architecture supports both human developers and LLM agents through consistent patterns, comprehensive documentation, and type-safe interfaces.*