---
title: "LLM Agent Guide: ArqCashflow Project"
type: "guide"
audience: ["agent"]
contexts: ["llm-optimization", "documentation", "context-management", "agent-workflows"]
complexity: "intermediate"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["documentation-navigator", "context-provider", "workflow-optimizer"]
related:
  - index.md
  - contexts/contract-management.md
  - patterns/testing-strategies.md
dependencies: []
---

# LLM Agent Guide: ArqCashflow Project

**Quick Context**: ArqCashflow is a financial management system for architects built with Next.js, TypeScript, and Claude AI, optimized for LLM-agent collaborative development.

## Context for LLM Agents

> **🚨 For Current Project Status & Health Protocols**: See `/LLM_AGENT_GUIDE.md` in the project root for live operational status, Phase 4 progress (90%), health verification protocols, and immediate context.
>
> **📖 This Document**: Provides comprehensive patterns, methodologies, and educational content for understanding the project deeply.

**Scope**: Complete guide for LLM agents working on ArqCashflow project with optimized context paths and priority reading orders
**Prerequisites**: Understanding of software development, Next.js architecture, and LLM agent workflows
**Key Patterns**:
- Context-first documentation reading strategy
- Task-specific documentation paths
- Efficient context management for limited token budgets
- Project structure navigation optimized for AI agents

## 🎯 For LLM Agents: How to Use This Documentation Efficiently

### Priority Reading Order (Limited Context Optimization)

#### 1. **Immediate Context (Read First - 2 docs)**
Start with these for any task:
```
1. DOCUMENTATION_STRATEGY_PROPOSAL.md - Understand the documentation system
2. docs/docs-site/docs/index.md - Navigation hub and project overview
```

#### 2. **Task-Specific Context**
Based on your assigned task, read ONLY the relevant section:

**For Bug Investigation/Fixes:**
```
- DEVELOPMENT.md → "Lessons Learned" section (precision bug case study)
- docs/docs-site/docs/developer/architecture/overview.md
- Relevant API route file (e.g., app/api/contracts/route.ts)
```

**For Feature Development:**
```
- docs/docs-site/docs/developer/setup.md
- docs/docs-site/docs/developer/architecture/overview.md
- Look for similar existing features in codebase
```

**For UI/UX Changes:**
```
- DESIGN_PRINCIPLES.md (or future: docs/design/principles.md)
- app/components/forms/* (examine existing patterns)
- lib/styles/* (design system utilities)
```

**For Documentation Tasks:**
```
- docs/docs-site/docs/meta/templates/document-template.md
- docs/docs-site/docs/meta/templates/adr-template.md
- docs/README.md (documentation structure guide)
```

### Efficient Navigation Strategy

#### Pattern 1: Metadata-First Reading
Every document has YAML frontmatter. Check these fields first:
- `audience`: Is this for you? (agent/developer/user)
- `contexts`: What domains does this cover?
- `complexity`: Do you need prerequisites?
- `related`: What else connects to this?

#### Pattern 2: Context Sections for Agents
Look for "Context for LLM Agents" sections in docs:
```markdown
## Context for LLM Agents
**Scope**: [What this covers]
**Prerequisites**: [What you need to know first]
**Key Patterns**: [Reusable approaches]
```

#### Pattern 3: Use Grep/Search First
Instead of reading entire files:
```bash
# Search for specific patterns
grep -r "precision bug" docs/
grep -r "contract.*create" app/api/
grep -r "TODO\|FIXME" app/

# Find similar implementations
grep -r "useForm\|handleSubmit" app/components/
```

## 📚 Documentation Access Methods

### For Users
- **Web Access**: `http://localhost:3002/docs` (when running locally)
- **Production**: Will be at GitHub Pages URL
- **Start Point**: `/docs/user/getting-started`

### For Developers
- **Local Files**: Read markdown directly in `docs/docs-site/docs/`
- **IDE Integration**: Most IDEs render markdown with navigation
- **Start Point**: `/docs/developer/setup`

### For LLM Agents
- **Direct File Access**: Use Read tool on specific files
- **Metadata Extraction**: Parse YAML frontmatter for context
- **Pattern Matching**: Use the templates for consistent output

## 🗺️ Project Structure Summary

```
arqcashflow/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (contracts, receivables, expenses)
│   ├── components/        # React components (forms, tables, charts)
│   └── (pages)           # Page components
├── lib/                   # Utilities and helpers
│   ├── auth.ts           # Authentication logic
│   ├── db.ts            # Database utilities
│   └── utils/           # Date, currency, validation utilities
├── prisma/               # Database schema and migrations
├── docs/                 # NEW documentation system
│   └── docs-site/       # Docusaurus application
└── [backup docs]        # Original docs (README, DEVELOPMENT, etc.)
```

## 🔑 Key Concepts to Understand

### 1. **Team-Based Isolation**
All data is filtered by `teamId`. Every API call includes team context.

### 2. **The Precision Bug Pattern**
Users scrolling over number inputs accidentally changed values. Solution: `onWheel={(e) => e.currentTarget.blur()}`

### 3. **AI Integration**
Claude API processes documents, natural language queries, and assists with data entry.

### 4. **Documentation-First Development**
Write/update docs before implementing features. LLM agents should follow templates.

## 📋 Common Agent Tasks & Required Context

### Task: "Fix a bug in contracts"
```
Read Order:
1. app/api/contracts/route.ts
2. app/components/forms/ContractForm.tsx
3. DEVELOPMENT.md → "Lessons Learned"
```

### Task: "Add new feature to expenses"
```
Read Order:
1. app/api/expenses/route.ts (understand current implementation)
2. app/components/forms/ExpenseForm.tsx (UI pattern)
3. prisma/schema.prisma (database structure)
```

### Task: "Improve documentation"
```
Read Order:
1. DOCUMENTATION_STRATEGY_PROPOSAL.md
2. docs/docs-site/docs/meta/templates/*
3. Target document to improve
```

### Task: "Update UI component"
```
Read Order:
1. DESIGN_PRINCIPLES.md
2. Target component file
3. Similar components for pattern consistency
```

## 🚀 Quick Commands for Agents

### Development
```bash
# Start development
npm run dev

# Database operations
npx prisma studio         # View database
npx prisma migrate dev     # Run migrations

# Testing
npm run build             # Test production build
npm run lint              # Check code quality
```

### Documentation
```bash
# Documentation development
cd docs/docs-site && npm start

# Build documentation
cd docs/docs-site && npm run build
```

## ⚠️ Critical Rules for Agents

1. **NEVER modify existing documentation files** in root directory (keep as backup)
2. **NEVER change application code** when working on documentation
3. **ALWAYS use templates** when creating new documentation
4. **ALWAYS preserve frontmatter** when editing docs
5. **ALWAYS test builds** before committing

## 📝 Effective Context Template for New Agents

When briefing a new LLM agent about ArqCashflow, use this template:

```
You're working on ArqCashflow, a Next.js financial management system for architects.

IMMEDIATE CONTEXT:
- Read: LLM_AGENT_GUIDE.md (this file)
- Technology: Next.js 15, TypeScript, Prisma, PostgreSQL, Claude AI
- Key Pattern: Team-based data isolation (all queries filter by teamId)

YOUR TASK: [Specific task description]

RELEVANT FILES:
- [List 2-3 most relevant files for the task]

CONSTRAINTS:
- Don't modify files outside your task scope
- Follow existing patterns in similar components
- Update documentation if you change functionality

SUCCESS CRITERIA:
- [Specific measurable outcomes]
```

## 🔄 Phase 2 Context (Starting Now)

**Current Status**: Phase 1 complete, Phase 2 beginning
**Phase 2 Goal**: Migrate and enhance existing documentation
**Approach**:
1. Copy content to new structure
2. Add structured metadata
3. Create cross-references
4. Enhance with LLM context sections

**Files to Migrate**:
- README.md → user guides + developer setup
- DEVELOPMENT.md → architecture + testing + deployment
- DESIGN_PRINCIPLES.md → design system documentation
- GOOGLE_SHEETS_SIMPLE.md → integration guide

---

*This guide provides the minimum context needed for any LLM agent to effectively work on ArqCashflow. Start here, then read only what's needed for your specific task.*