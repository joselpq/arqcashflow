---
title: "Architecture Overview"
type: "reference"
audience: ["developer", "agent"]
contexts: ["architecture", "system-design"]
complexity: "intermediate"
last_updated: "2025-09-22"
version: "1.0"
agent_roles: ["architecture-reviewer", "system-analyzer"]
related:
  - developer/setup.md
dependencies: ["next.js", "prisma", "postgresql"]
---

# Architecture Overview

ArqCashflow is built using modern web technologies optimized for developer productivity and LLM-agent assistance.

## Context for LLM Agents

**Scope**: High-level system architecture and technology choices
**Prerequisites**: Understanding of modern web development patterns
**Key Patterns**:
- Full-stack Next.js application pattern
- Database-first design with Prisma ORM
- API-driven architecture with type safety

## Technology Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type safety throughout the application
- **Tailwind CSS**: Utility-first styling
- **React 19**: Latest React features

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **Prisma ORM**: Type-safe database operations
- **PostgreSQL**: Production database
- **SQLite**: Development database

### AI Integration
- **Claude API**: Document processing and natural language understanding
- **Anthropic SDK**: Official SDK for Claude integration

### Authentication
- **NextAuth.js**: Authentication and session management
- **Team-based isolation**: Multi-tenant data separation

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer     │    │   Database      │
│   (Next.js)     │◄──►│   (Next.js)     │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ - React UI      │    │ - REST APIs     │    │ - Prisma Schema │
│ - TypeScript    │    │ - Claude AI     │    │ - Team Isolation│
│ - Tailwind CSS  │    │ - NextAuth      │    │ - Data Integrity│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key Design Decisions

### Database Schema
- **Team-based isolation**: All data filtered by `teamId`
- **Soft relationships**: Contracts can exist without receivables
- **Flexible categorization**: Extensible category system

### API Design
- **RESTful endpoints**: Standard HTTP methods and status codes
- **Type-safe validation**: Zod schemas for request/response validation
- **Consistent error handling**: Standardized error responses

### AI Integration
- **Context-aware processing**: Document type detection and smart extraction
- **Conversation memory**: Multi-turn interactions with context retention
- **Fallback strategies**: Graceful degradation when AI services are unavailable

---

*For detailed implementation guides, see the specific architecture documents in this section.*