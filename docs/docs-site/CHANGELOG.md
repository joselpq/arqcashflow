---
title: "Changelog"
type: "reference"
audience: ["developer", "user", "agent"]
contexts: ["releases", "changes", "history"]
complexity: "beginner"
last_updated: "2025-09-22"
version: "1.0"
agent_roles: ["release-manager", "change-tracker"]
related:
  - developer/architecture/overview.md
dependencies: []
---

# Changelog

All notable changes to ArqCashflow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Context for LLM Agents

**Scope**: Complete project change history with semantic versioning and conventional commits
**Prerequisites**: Understanding of semantic versioning and conventional commit standards
**Key Patterns**:
- Conventional commit categorization (feat, fix, docs, etc.)
- Breaking change identification
- Version number generation based on change types
- Automated generation from git history

## [v2025.09.22-feat] - 2025-09-22

### ✨ Features

- Phase 2 - Content migration and LLM agent optimization ([a334e82](../../commit/a334e82))
- Implement Phase 1 of LLM-Agent-Optimized Documentation Framework ([db7c78f](../../commit/db7c78f))
- Add enhanced recurring expense management with smart scope selection ([b2e7c46](../../commit/b2e7c46))
- Add complete recurring expense functionality to Projetos tab ([76bee2d](../../commit/76bee2d))
- Implement comprehensive audit trail system for all entities ([59d1255](../../commit/59d1255))
- Add standalone receivables (not associated to contracts) ([86e0491](../../commit/86e0491))
- ✨ Implement Phase 2 UX improvements: urgency indicators and quick actions ([048de71](../../commit/048de71))
- Implement responsive hamburger navigation menu ([808b0b0](../../commit/808b0b0))
- Implement Phase 1 PDF and image support for AI setup assistant ([88a1994](../../commit/88a1994))
- Add wow onboarding experience for new users ([f042cf8](../../commit/f042cf8))
- Add comprehensive LGPD-compliant legal pages in Portuguese ([9392366](../../commit/9392366))
- Add beautiful responsive landing page and improve auth forms ([13a8d50](../../commit/13a8d50))
- Add AI setup assistant with Excel/CSV processing capabilities ([a08e09b](../../commit/a08e09b))
- Implement smart FormData/JSON upload strategy for large PDF support ([559ee67](../../commit/559ee67))
- Revert "Implement Vercel Blob storage for large PDF uploads to bypass 4MB limit" ([70acc8b](../../commit/70acc8b))
- Implement Vercel Blob storage for large PDF uploads to bypass 4MB limit ([ad49c87](../../commit/ad49c87))
- Revert "Implement direct Claude API processing for large files to bypass Vercel limits" ([a2910ea](../../commit/a2910ea))
- Implement direct Claude API processing for large files to bypass Vercel limits ([32319db](../../commit/32319db))
- Implement enhanced AI assistant with document processing capabilities ([daeb237](../../commit/daeb237))
- Major UI/UX improvements: Modern design system implementation ([1ed1a84](../../commit/1ed1a84))
- Implement comprehensive Smart Dashboard for non-finance users ([ba9503c](../../commit/ba9503c))
- Implement team-based data segregation ([46cb791](../../commit/46cb791))
- Add authentication system with NextAuth.js ([b1e01ed](../../commit/b1e01ed))
- Implement simplified Google Sheets export via CSV ([84ae0a0](../../commit/84ae0a0))
- Add Google Drive API scope for Google Sheets export ([643ffe2](../../commit/643ffe2))
- Add comprehensive expense management, enhanced receivables, and UX improvements ([b6fca6a](../../commit/b6fca6a))

### 🐛 Bug Fixes

- Clean: remove debugging code and document precision bug lesson learned ([2558c38](../../commit/2558c38))
- Prevent accidental number input changes on scroll ([78bfd75](../../commit/78bfd75))
- Resolve floating-point precision issues in form components ([16c49a7](../../commit/16c49a7))
- Resolve TypeScript error in ContractsTab categories type inference ([77f208b](../../commit/77f208b))
- Simplify recurring expense date calculations and add daily cron automation ([689103f](../../commit/689103f))
- Resolve recurring expense generation and filtering bugs ([680a670](../../commit/680a670))
- Fix API status field updates for proper overdue display ([5df603f](../../commit/5df603f))
- Fix status filtering inconsistencies for overdue items ([00095e9](../../commit/00095e9))
- Resolve floating-point precision and date handling bugs across forms ([40fe8ef](../../commit/40fe8ef))
- Resolve intermittent dashboard loading bug with comprehensive solution ([0295183](../../commit/0295183))
- Improve receivable form UX and data accuracy ([3ae4a76](../../commit/3ae4a76))
- 🐛 Fix ReceivablesTab loading states and UX consistency ([4a2e63b](../../commit/4a2e63b))
- 🔧 Fix modal backdrop: Replace Tailwind v4 incompatible classes with CSS ([75f61f8](../../commit/75f61f8))
- 🎨 Fix modal responsiveness and Dashboard navigation ([1f491f7](../../commit/1f491f7))
- 🔧 Fix Vercel build: Add Suspense boundary to projetos page ([9c41e97](../../commit/9c41e97))
- Fix TypeScript issues in AI assistant route for better type safety ([8ab8712](../../commit/8ab8712))
- Clean up legacy alerts system and fix Next.js 15 compatibility ([96c7e21](../../commit/96c7e21))
- Update documentation: contract team assignment bug resolved ([cd17b14](../../commit/cd17b14))
- Remove dark mode CSS to fix unwanted theme switching ([b6c3bf0](../../commit/b6c3bf0))
- Fix onboarding file upload to work with existing API ([29efc86](../../commit/29efc86))
- Improve company activity field and fix text width ([cb99161](../../commit/cb99161))
- Fix onboarding UX issues ([3052258](../../commit/3052258))
- Fix onboarding page responsive design ([c7e572a](../../commit/c7e572a))
- Fix Prisma import in onboarding API routes ([d87a0ad](../../commit/d87a0ad))
- Fix responsive design issues in login and registration forms ([d3f5ed9](../../commit/d3f5ed9))
- Add test and debug files to gitignore ([09b6aa8](../../commit/09b6aa8))
- Fix form input text contrast for accessibility compliance ([16078bf](../../commit/16078bf))
- Fix HTTP 413 payload size error with better file size validation ([6512030](../../commit/6512030))
- Fix document upload processing with comprehensive debugging ([2d57d7a](../../commit/2d57d7a))
- Add receivable creation and fix date processing issues ([4ee70e8](../../commit/4ee70e8))
- Fix JSON parsing error in AI assistant API ([c3a824d](../../commit/c3a824d))
- Fix text contrast issues in dropdown selectors ([83fb4a8](../../commit/83fb4a8))
- Improve accessibility and fix date consistency issues ([b614e36](../../commit/b614e36))
- Fix AI contract creation with 'hoje' (today) date parsing ([aadfce8](../../commit/aadfce8))
- Fix contracts page client-side exception after supervisor removal ([5878f4e](../../commit/5878f4e))
- CRITICAL FIX: Wrap supervisor calls in individual try-catch blocks ([9ab0f91](../../commit/9ab0f91))
- Add comprehensive debugging to Quality Supervisor ([35e65ba](../../commit/35e65ba))
- Fix Quality Supervisor and AI assistant issues ([05471a7](../../commit/05471a7))
- Fix AI Assistant PostgreSQL compatibility issue ([bc90553](../../commit/bc90553))
- Fix Prisma query syntax causing 500 errors in production ([6765cf3](../../commit/6765cf3))
- Fix critical multi-tenant authentication bugs in AI routes ([fc26347](../../commit/fc26347))
- Complete documentation update and clean up debug code ([f4dee86](../../commit/f4dee86))
- Fix critical security vulnerabilities in receivables and budgets APIs ([2722dde](../../commit/2722dde))
- Add enhanced session validation and debugging ([2e228c6](../../commit/2e228c6))
- Add debug logging for contract team assignment issue ([b5ee371](../../commit/b5ee371))
- Fix client-side error handling for unauthorized access ([a0fccfd](../../commit/a0fccfd))
- CRITICAL: Fix team data isolation across all APIs ([91e63f1](../../commit/91e63f1))
- Fix team segregation issues ([d3fd792](../../commit/d3fd792))
- Fix production authentication issues ([af16ea0](../../commit/af16ea0))
- Fix private key handling and add authentication debug ([6280bea](../../commit/6280bea))
- Add debug error handling for Google Sheets API ([e97548c](../../commit/e97548c))
- Fix useSearchParams Suspense boundaries for expenses and receivables pages ([29dcc56](../../commit/29dcc56))
- Fix useSearchParams Suspense boundary issue for Vercel deployment ([151483e](../../commit/151483e))
- Configure Next.js to ignore ESLint and TypeScript errors during build ([485e3b1](../../commit/485e3b1))
- Fix duplicate variable name in Excel export ([2dab92e](../../commit/2dab92e))

### 📚 Documentation

- Comprehensive documentation cleanup and reorganization ([c4e8d6d](../../commit/c4e8d6d))
- Update documentation to reflect latest platform capabilities ([9b1e3f7](../../commit/9b1e3f7))
- Update documentation to reflect unified Projetos UX structure ([0b5b0be](../../commit/0b5b0be))
- Update documentation to reflect multimodal AI capabilities ([e1c20bf](../../commit/e1c20bf))
- Update documentation to reflect current working state ([d4471ff](../../commit/d4471ff))
- Update documentation with comprehensive onboarding features ([48938d8](../../commit/48938d8))
- Update documentation with latest legal and design improvements ([217950d](../../commit/217950d))
- Update documentation with latest responsive design improvements and platform state ([b765d5f](../../commit/b765d5f))
- Update documentation for AI setup assistant with status mapping ([30338f3](../../commit/30338f3))
- Update documentation for large file upload support ([7e91b60](../../commit/7e91b60))
- Enable native Claude PDF processing with comprehensive document analysis ([8d93871](../../commit/8d93871))
- Migrate AI assistant from OpenAI to Claude for superior document processing ([481f6d8](../../commit/481f6d8))
- Improve AI assistant intelligence and document processing ([9f5389f](../../commit/9f5389f))
- Restore design principles documentation ([8ebf2a7](../../commit/8ebf2a7))
- Update documentation and enhance dashboard visual design ([9b602fe](../../commit/9b602fe))
- Update comprehensive API documentation and data models ([03a62ca](../../commit/03a62ca))
- Update documentation and schema for production deployment ([3fb16af](../../commit/3fb16af))

### 🔨 Refactoring

- Enhance recurring expense UX with unified form interface ([a34fc37](../../commit/a34fc37))
- ✨ Enhance Projetos page UX with Phase 1 improvements across all tabs ([300a8cb](../../commit/300a8cb))
- ✨ Improve modal backdrop with elegant glass effect ([5c62791](../../commit/5c62791))
- ✨ Refactor Projetos tabs to use modal forms ([bfd1058](../../commit/bfd1058))
- Improve AI setup assistant with Portuguese→English status mapping ([bb5553c](../../commit/bb5553c))
- Improve AI expenses and translate interface to Portuguese ([23f4275](../../commit/23f4275))

### 👷 CI/CD

- ✨ Enhance UX with smart forms and professional payment workflow ([71e2d0a](../../commit/71e2d0a))
- ✨ Enhance Recebíveis tab with professional payment workflow ([4245189](../../commit/4245189))

### 🔧 Maintenance

- Update expense categories and simplify expense type field ([664eb8c](../../commit/664eb8c))
- Standardize date handling and centralize overdue calculations ([433b5b3](../../commit/433b5b3))
- Ui: Enhance receivable form aesthetics and user experience ([9019426](../../commit/9019426))
- ✨ Enhance Contracts tab with streamlined UX and status management ([c0258d9](../../commit/c0258d9))
- ✨ Remove redundant title and navigation from Projetos page ([dad7460](../../commit/dad7460))
- Consolidate project management into unified Projetos tab with sub-navigation ([f739f0f](../../commit/f739f0f))
- Remove AI creation options from Contracts, Receivables, and Expenses pages ([f9e8501](../../commit/f9e8501))
- Remove unused legacy chat component ([0d73e5f](../../commit/0d73e5f))
- Hide navigation bar during onboarding for focused experience ([7ebadae](../../commit/7ebadae))
- Tone down step 2 title to avoid over-promising ([8150c53](../../commit/8150c53))
- Update landing page text to include small businesses ([7dc3043](../../commit/7dc3043))
- Enhance color contrast and readability across the platform ([405ce01](../../commit/405ce01))
- Complete AI assistant enhancement: PDF processing, smart naming, and context retention ([c45f9ee](../../commit/c45f9ee))
- Redesign with professional, architect-focused aesthetics ([660b56f](../../commit/660b56f))
- Complete Phase 2: Remove supervisor state from all frontend pages ([e96b2e7](../../commit/e96b2e7))
- Clean slate: Remove supervisor integration from frontend ([11d7bb3](../../commit/11d7bb3))
- Clean slate: Remove all supervisor calls from API endpoints ([1ecb5a2](../../commit/1ecb5a2))
- Make Quality Supervisor more aggressive in detecting issues ([c6e3be5](../../commit/c6e3be5))
- Configure Google Sheets to use shared Drive folder ([3ec1e26](../../commit/3ec1e26))
- Complete ArqCashflow system with AI contract creation ([99dd143](../../commit/99dd143))
- Initial commit from Create Next App ([7be0f08](../../commit/7be0f08))

### 📊 Release Statistics

- **Total commits**: 127
- **Contributors**: 1
- **Features**: 26
- **Bug fixes**: 55
- **Documentation updates**: 17

---

## Previous Releases

*Previous release notes will be preserved when this tool is integrated into the project.*

## Contributing

When making commits, please follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

Examples:
feat(contracts): add AI-powered contract creation
fix(api): resolve team isolation bug
docs(readme): update installation instructions
```

### Commit Types

- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Test additions or changes
- **chore**: Maintenance tasks
- **perf**: Performance improvements
- **ci**: CI/CD changes
- **build**: Build system changes

---

*This changelog is auto-generated from git commit history. Last updated: 2025-09-22*