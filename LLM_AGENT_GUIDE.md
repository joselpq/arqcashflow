---
title: "LLM Agent Guide: ArqCashflow Project"
type: "guide"
audience: ["agent", "developer"]
contexts: ["automation", "ci-cd", "documentation", "health-monitoring", "code-validation", "search", "service-layer", "api-migration", "auto-generation"]
complexity: "intermediate"
last_updated: "2025-09-24"
version: "2.0"
agent_roles: ["documentation-maintainer", "automation-specialist", "health-monitor", "service-migration-specialist", "api-developer"]
related:
  - docs/docs-site/docs/agents/llm-agent-guide.md
  - DOCUMENTATION_STRATEGY_PROPOSAL.md
  - docs/docs-site/scripts/README.md
dependencies: ["github-actions", "nodejs", "npm", "typescript", "docusaurus-search-local"]
---

# LLM Agent Guide: ArqCashflow Project

**Quick Context**: ArqCashflow is a financial management system for architects built with Next.js, TypeScript, and Claude AI, optimized for LLM-agent collaborative development.

## ⚠️ CRITICAL: Current Documentation State (September 24, 2025)

**Documentation Implementation**: 99% Complete
- ✅ Phase 1 (Foundation): 100% - Complete including search functionality
- ✅ Phase 2 (Content Migration): 100% - All content migrated
- ✅ Phase 3 (LLM Context): 100% - All agent docs created
- ✅ Phase 4 (Automation): 95% - All major automation features active

**Key Facts:**
- 64 documentation files with 100% health score
- Local search functionality active (2.8MB search index)
- API and schema generation working
- All advanced CI/CD features active (weekly checks, PR comments, issue creation)
- See `/DOCUMENTATION_STRATEGY_PROPOSAL.md` for complete status

## Context for LLM Agents

**Scope**: Complete documentation automation framework with health monitoring, PR automation, and code validation for ArqCashflow financial management system
**Prerequisites**: Understanding of GitHub Actions, Node.js, TypeScript, documentation workflows, and CI/CD automation
**Key Patterns**:
- Health verification protocol before starting work (100% health score currently)
- Multi-job workflow structure (build→deploy→validate→comment)
- Code example validation with smart skipping of documentation snippets
- Weekly automated health checks with issue creation for scores < 80%
- PR comment automation with both documentation and code validation results

## 🎯 For LLM Agents: How to Use This Documentation Efficiently

> **📚 For Comprehensive Patterns & Examples**: See [`/docs/docs-site/docs/agents/llm-agent-guide.md`](docs/docs-site/docs/agents/llm-agent-guide.md) for detailed methodologies, pattern libraries, and educational content.
>
> **🔧 This Document**: Provides current operational status, health protocols, and immediate context for project work.

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

## 📚 Documentation Maintenance Protocol

### Before Making Changes
1. **Read Current State**: Check `/DOCUMENTATION_STRATEGY_PROPOSAL.md` Implementation History section
2. **Run Validation**: `cd docs/docs-site/scripts && npm run docs:validate`
3. **Check Build**: `cd docs/docs-site && npm run build`

### When Working on Documentation
```bash
# Standard maintenance workflow
cd docs/docs-site/scripts

# 1. Validate current state
npm run docs:validate

# 2. If API/schema changed, regenerate
npm run docs:generate

# 3. Test build locally
cd .. && npm run build

# 4. Update last_updated fields
# 5. Ensure "Context for LLM Agents" sections exist
```

### Common Issues & Solutions

**MDX Build Errors**
- Problem: Curly braces `{}` in tables
- Solution: Wrap JSON examples in backticks

**Broken Links**
- Problem: Incorrect relative paths
- Solution: Links must be relative from current file location

**Missing LLM Context**
- Problem: File lacks "Context for LLM Agents" section
- Solution: Add after main heading with Scope, Prerequisites, Key Patterns

## 🩺 Documentation Health Verification Protocol

**CRITICAL**: Every new LLM agent must verify documentation health before starting work.

### Quick Health Check Sequence

**1. Check Current Health Status**
```bash
cd docs/docs-site/scripts
node validate-docs.js
```
Expected Output: `Health score: 100% 🟢`

**2. Verify Recent GitHub Actions**
```bash
# Check recent workflow runs
gh run list --repo joselpq/arqcashflow --limit 5

# Look for any failed runs or health alerts
gh run list --repo joselpq/arqcashflow --status=failure
```

**3. Check for Documentation Issues**
```bash
# Look for automated health alert issues
gh issue list --repo joselpq/arqcashflow --label="documentation,maintenance,automated"
```

**4. One-Liner Quick Check**
```bash
cd docs/docs-site/scripts && node validate-docs.js && gh issue list --repo joselpq/arqcashflow --label="documentation" --state=open || echo "No critical documentation issues found"
```

### Health Score Interpretation

- **100%**: ✅ Perfect - proceed with confidence
- **85-99%**: ⚠️ Minor issues - check validation report
- **70-84%**: 🔶 Moderate issues - fix before major changes
- **<70%**: 🔴 Critical issues - address immediately

### Issue Response Protocol

**If you find health alerts or issues:**
1. **Read validation report** from GitHub Actions artifacts
2. **Fix broken links first** (highest priority)
3. **Update stale content** (check dates > 90 days old)
4. **Fix missing metadata** (YAML frontmatter)
5. **Re-run validation** to confirm fixes
6. **Close automated issue** once resolved

### Weekly Health Reports Location

- **GitHub Actions**: https://github.com/joselpq/arqcashflow/actions
- **Weekly runs**: "Weekly Documentation Health Check" (every Sunday 2 AM UTC)
- **Artifacts**: Download "weekly-docs-health-report" (90-day retention)
- **Issues**: Auto-created if health score < 80%

---

### Next Priority Tasks (for incoming agents)

1. **Service Layer Migration - Phase 2** (Phase 1: ✅ Complete)
   - ✅ Phase 1: Service layer extraction and validation (DEPLOYED)
   - ⏳ Phase 2: Complete migration of remaining API routes
   - ⏳ Phase 3: Remove legacy implementation and feature flags
   - ⏳ Phase 4: Performance optimization and monitoring

2. **Documentation System - Complete** (Phase 4: ✅ 100% Complete)
   - ✅ Weekly health checks with automated issue creation (DONE)
   - ✅ PR comment automation with validation summaries (DONE)
   - ✅ Multi-job workflow structure (build→deploy→validate→comment) (DONE)
   - ✅ Code example validation with syntax checking (DONE)
   - ✅ Code-driven auto-generation (API docs, schema docs, changelog) (DONE)

3. **Optional Future Enhancements**
   - Upgrade to Algolia DocSearch (if external indexing desired)
   - Add component documentation extraction
   - Service layer performance monitoring and analytics

---

*This guide provides the minimum context needed for any LLM agent to effectively work on ArqCashflow. Always check `/DOCUMENTATION_STRATEGY_PROPOSAL.md` for the single source of truth on implementation status.*