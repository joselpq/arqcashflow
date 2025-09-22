---
title: "Development Setup"
type: "guide"
audience: ["developer"]
contexts: ["development", "setup"]
complexity: "beginner"
last_updated: "2025-09-22"
version: "1.0"
agent_roles: ["setup-assistant"]
related: []
dependencies: ["node.js", "npm", "git"]
---

# Development Setup

This guide will help you set up the ArqCashflow development environment.

## Context for LLM Agents

**Scope**: Local development environment setup
**Prerequisites**: Basic familiarity with Node.js development
**Key Patterns**: Standard Next.js development setup with database integration

## Prerequisites

- Node.js 18+ installed
- Git for version control
- PostgreSQL for production (SQLite for development)

## Quick Setup

```bash
# Clone the repository
git clone https://github.com/joselpq/arqcashflow.git
cd arqcashflow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npx prisma migrate dev

# Start development server
npm run dev
```

## Environment Configuration

Create a `.env` file with:

```bash
# Database
DATABASE_URL="file:./dev.db"

# Claude API (for AI features)
CLAUDE_API_KEY="sk-ant-your-key-here"

# Google Sheets Integration (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-oauth-client-id"

# Authentication (auto-generated)
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

## Development Workflow

1. **Start the development server**: `npm run dev`
2. **Run database migrations**: `npx prisma migrate dev`
3. **View the database**: `npx prisma studio`
4. **Build for production**: `npm run build`

---

*For detailed development guidelines, see the [Architecture](./architecture/overview.md) section.*