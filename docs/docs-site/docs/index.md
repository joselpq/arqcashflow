---
title: "ArqCashflow Documentation Hub"
type: "index"
audience: ["user", "developer", "agent", "designer"]
contexts: ["overview", "navigation"]
complexity: "beginner"
last_updated: "2025-09-22"
version: "1.0"
agent_roles: ["navigation-assistant", "context-provider"]
related:
  - user/getting-started.md
  - developer/setup.md
dependencies: []
---

# ArqCashflow Documentation Hub

Welcome to the comprehensive documentation for ArqCashflow - the LLM-agent-optimized financial management system for architects.

## Context for LLM Agents

**Scope**: Navigation hub and context map for all documentation
**Prerequisites**: None - this is the entry point
**Key Patterns**:
- Documentation structure patterns
- Audience-specific navigation
- Context-aware document discovery

## Quick Navigation

### 👥 **For Users**
New to ArqCashflow? Start here to learn how to manage your architectural business finances.

**[🚀 Getting Started Guide →](./user/getting-started.md)**

Key Topics:
- Account setup and onboarding
- Creating contracts and tracking receivables
- Managing expenses and budgets
- Using AI assistant features
- Exporting reports and data

### ⚡ **For Developers**
Technical documentation for implementing, extending, and maintaining ArqCashflow.

**[🛠️ Development Setup →](./developer/setup.md)**

Key Topics:
- Local development environment
- Architecture and system design
- API reference and integration
- **Testing strategies with authenticated test users**
- Database schema and migrations

### 🤖 **For LLM Agents**
Structured contexts, patterns, and decision records optimized for AI-assisted development.

**[🎯 Agent Templates →](./meta/templates/document-template.md)**

Key Topics:
- Document structure templates
- Architecture Decision Records (ADRs)
- Development patterns and contexts
- Code examples and best practices
- Decision history and rationale

## Documentation Philosophy

This documentation system is designed for **human-AI collaborative development**:

### **Structured Metadata**
Every document includes machine-readable frontmatter with:
- Audience targeting (user/developer/agent/designer)
- Context classification (feature areas, complexity levels)
- Cross-references and dependencies
- Agent role definitions

### **Pattern-Driven Content**
- **Executable Examples**: All code examples are tested and working
- **Decision Traceability**: ADRs preserve why decisions were made
- **Context Preservation**: Background and rationale for future reference
- **Progressive Disclosure**: Information organized by complexity level

### **LLM-Optimized Structure**
- **Context Boundaries**: Clear scope definitions for each document
- **Cross-References**: Explicit relationships between concepts
- **Pattern Libraries**: Reusable approaches for common tasks
- **Version Control**: Track evolution of patterns and decisions

## Project Overview

**ArqCashflow** is a Next.js application built for architects to manage:

- **📝 Contracts**: Client agreements and project management
- **💰 Receivables**: Payment tracking and cash flow optimization
- **💸 Expenses**: Cost management and vendor payments
- **🤖 AI Assistant**: Natural language document processing and queries
- **📊 Reporting**: Excel and Google Sheets export capabilities

### Technology Stack
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Prisma ORM + PostgreSQL
- **AI**: Claude API for document processing and natural language understanding
- **Authentication**: NextAuth.js with team-based isolation

## Getting Help

### **Quick References**
- **[User Guide](./user/getting-started.md)**: Learn to use ArqCashflow effectively
- **[API Reference](./developer/architecture/overview.md)**: Technical implementation details
- **[Templates](./meta/templates/document-template.md)**: Documentation standards and patterns

### **For Different Roles**
- **Business Users**: Start with [Getting Started](./user/getting-started.md)
- **Developers**: Begin with [Development Setup](./developer/setup.md)
- **LLM Agents**: Use [Document Templates](./meta/templates/document-template.md) for consistent output

### **Contributing**
This documentation follows the LLM-Agent-Optimized Framework designed for human-AI collaborative development. All contributions should follow the established templates and metadata structure found in the [Document Template](./meta/templates/document-template.md).

---

*This documentation hub serves as the single source of truth for all ArqCashflow knowledge, optimized for both human comprehension and LLM agent assistance.*