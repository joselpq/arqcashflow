# ArqCashflow Development Backlog

**Purpose**: Central source of truth for project priorities and development status
**Last Updated**: 2025-09-29 (Complete reorganization for clarity and functionality)
**Update Frequency**: Every LLM session MUST update this document when completing tasks or discovering new requirements

## 🚨 CRITICAL INSTRUCTIONS FOR LLM AGENTS

### Documentation Responsibilities
This backlog document **DOES NOT** replace other documentation update requirements:
- **STILL UPDATE** technical documentation when implementing features
- **STILL UPDATE** decision records when making architectural choices
- **STILL UPDATE** README files when changing functionality
- **STILL MAINTAIN** the documentation health score at 100%

### When Starting a Session
1. **ALWAYS** read this document AFTER reading `LLM_AGENT_GUIDE.md`
2. **CHECK** the DOING section to understand work in progress
3. **REVIEW** the TO DO section for immediate priorities
4. **AVOID** starting BACKLOG items unless explicitly requested

### When Working on Tasks
1. **MOVE** items from TO DO to DOING when starting work
2. **TRACK SUB-TASKS** within DOING items using checkboxes
3. **UPDATE IN REAL-TIME** as you complete each sub-task
4. **MOVE** completed items from DOING to DONE
5. **ADD** discovered issues or requirements to TO DO or BACKLOG

## 📊 Status Categories

### 🔄 DOING (Currently In Progress)
*Active work with real-time progress tracking. Can persist between sessions if work is incomplete.*

---

### 📋 TO DO (Immediate Priorities)
*Ready to implement. Start here unless directed otherwise.*

#### Performance & Reliability

#### 1. **Claude API Rate Limiting for Multi-Sheet Processing - MEDIUM PRIORITY**
- **Problem**: Multi-sheet Excel files may trigger Claude API rate limits due to larger content size
- **Context**: Combined multi-sheet content creates larger prompts that could hit rate limits faster
- **Solution**: Implement intelligent rate limiting and retry strategies for large Excel files
- **Priority**: **MEDIUM** (Performance & reliability)
- **Architecture**:
  - Enhanced retry logic for large multi-sheet files
  - Consider sheet-by-sheet processing for very large workbooks
  - Better error messages for rate limit scenarios
  - Exponential backoff strategies
- **Success Criteria**: Large multi-sheet Excel files process reliably without rate limit failures
- **Files**: `SetupAssistantService.ts`, rate limiting logic
- **Added**: 2025-09-29 from multi-sheet implementation observations

---

### 🗂️ BACKLOG (Future Work)
*Important but not immediate. Do not start unless specifically requested.*

#### User Experience Improvements

#### 1. **Receivable Title Enhancement**
- **Problem**: Receivables imported through setup assistant use project name as title, could be more descriptive
- **Context**: When Claude extracts receivables from documents, the title defaults to project name
- **Solution**: Enhance receivable title generation to include more context (e.g., "Payment for [Project] - Milestone 1")
- **Priority**: **MEDIUM** (UX improvement)
- **Files**: `SetupAssistantService.ts`, receivable creation logic
- **Added**: 2025-09-27 from manual testing feedback

#### 2. **Multi-File Processing - Hybrid Batch Evolution**
- **Problem**: Sequential processing works but could be faster for multiple files
- **Context**: Current system processes files one by one, users may want faster processing
- **Solution**: Implement hybrid batch processing (2-3 files at a time)
- **Priority**: **MEDIUM** (Performance improvement after current foundation)
- **Files**: `SetupAssistantService.ts`, progress tracking system
- **Added**: 2025-09-27 from Phase 2 planning

#### 3. **Real-Time Progress Updates**
- **Problem**: Current polling progress is functional but not as smooth as real-time
- **Context**: Current system uses polling, could upgrade to real-time for better UX
- **Solution**: Implement WebSocket or Server-Sent Events for live progress updates
- **Priority**: **LOW** (Nice to have after core functionality works)
- **Files**: Progress tracking infrastructure, UI components
- **Added**: 2025-09-27 from Phase 2 planning

#### 4. **User Review Before Creation**
- **Problem**: No way for users to review extracted data before it's created in database
- **Context**: Would improve data accuracy but adds complexity to workflow
- **Solution**: Review step showing all extracted entities with edit/approve options
- **Priority**: **MEDIUM** (Data quality improvement)
- **Files**: UI review components, temporary data storage
- **Added**: 2025-09-27 from Phase 2 planning

#### 5. **Cross-File Duplicate Detection**
- **Problem**: When processing multiple files, duplicate entities might be created
- **Context**: Users might upload overlapping data in different files
- **Solution**: Detect and merge/warn about potential duplicates across files
- **Priority**: **LOW** (Nice to have, depends on user patterns)
- **Files**: Duplicate detection algorithms, UI for resolution
- **Added**: 2025-09-27 from Phase 2 planning

#### Architecture & Performance

#### 6. **CUID to UUID Migration Analysis**
- **Problem**: Current system uses CUID, might benefit from UUID migration
- **Context**: Assess benefits and costs of migrating from CUID to UUID
- **Solution**:
  - Consider database performance implications
  - Evaluate compatibility with external systems
  - Review impact on existing data and migrations
- **Priority**: **MEDIUM**
- **Added**: 2025-09-26

#### 7. **Frontend Modularization Assessment**
- **Problem**: Potential redundant UI components and code duplication
- **Context**: Identify redundant UI components (especially modals)
- **Solution**:
  - Create centralized, reusable component library
  - Reduce code duplication in forms and dialogs
  - Implement consistent UX patterns across the application
- **Priority**: **MEDIUM**
- **Added**: 2025-09-26

#### 8. **Latency Optimization Initiative**
- **Problem**: Application performance could be optimized
- **Context**: Profile current application performance bottlenecks
- **Solution**:
  - Optimize database queries (add indexes, reduce N+1)
  - Implement caching strategies (Redis, in-memory)
  - Optimize API response times
  - Consider edge caching and CDN for static assets
  - Reduce bundle sizes and improve initial load time
- **Priority**: **HIGH**
- **Added**: 2025-09-26

#### Platform Features

#### 9. **Real-time Dashboard Updates**
- **Problem**: Dashboard data not updated in real-time
- **Solution**: Integrate event system with UI for live updates using WebSocket or Server-Sent Events
- **Priority**: **LOW**

#### 10. **Advanced Caching Strategy**
- **Problem**: No distributed caching system
- **Solution**: Implement Redis for session and query caching to reduce database load for frequently accessed data
- **Priority**: **LOW**

#### 11. **Performance Monitoring**
- **Problem**: No application performance monitoring
- **Solution**: Add APM to track service layer performance metrics
- **Priority**: **LOW**

#### AI & Automation (Future Phases)

#### 12. **Business Insights Agent**
- **Problem**: Users need strategic CFO-level business intelligence and recommendations
- **Solution**: Strategic insights with trend analysis, performance insights, competitive intelligence
- **Priority**: **MEDIUM** (Future Phase 2)
- **Dependencies**: Core system stability

#### 13. **Agent Coordinator**
- **Problem**: Need intelligent routing between multiple AI agents
- **Solution**: AI Traffic Controller for optimal agent routing with intent classification and context transfer
- **Priority**: **MEDIUM** (Future Phase 2)
- **Dependencies**: Multiple agents implemented

#### 14. **Tax Intelligence Agent**
- **Problem**: Users need proactive tax planning and compliance management
- **Solution**: Tax optimization recommendations and calculations
- **Priority**: **LOW** (Future Phase 3)
- **Dependencies**: Core agents established

#### User Experience & Mobile

#### 15. **Mobile Responsive Design**
- **Problem**: UI not optimized for mobile devices
- **Solution**: Optimize UI components for mobile devices and touch-friendly interfaces for tablets
- **Priority**: **MEDIUM**

#### 16. **Advanced Reporting**
- **Problem**: Limited reporting capabilities
- **Solution**: Customizable report builder with export to PDF with branding
- **Priority**: **LOW**

#### Security & Compliance

#### 17. **Two-Factor Authentication**
- **Problem**: No 2FA for user accounts
- **Solution**: Implement 2FA with support for authenticator apps
- **Priority**: **MEDIUM**

#### 18. **Audit Trail Enhancement**
- **Problem**: Audit logging could be more comprehensive
- **Solution**: Complete audit logging for all operations with compliance report generation
- **Priority**: **MEDIUM**

#### 19. **Data Encryption at Rest**
- **Problem**: Sensitive fields not encrypted in database
- **Solution**: Encrypt sensitive fields with key management system implementation
- **Priority**: **LOW**

---

### ✅ DONE (Completed Items)
*Completed work for reference. Newest first.*

#### September 29, 2025 (Evening) - Contract UX Bug Fixes Complete

#### Contract Management Bug Fixes

- **Contract Deletion Modal - Responsive Design Fix - HIGH PRIORITY** ✅
  - **Problem**: Modal displayed but was extremely thin and not responsive on smaller screens
  - **Root Cause**: Missing responsive width constraints (`min-w-[480px]`) that other modals have
  - **Solution**: Applied same responsive pattern as RecurringExpenseActionModal and Modal.tsx
  - **Implementation**:
    - Updated modal container from `max-w-md` to `max-w-2xl min-w-[480px]`
    - Matched responsive pattern used in RecurringExpenseActionModal:54
    - Modal now displays properly on all screen sizes
  - **Results**: Modal now has proper width (480px minimum, 672px maximum) and is fully responsive
  - **Files**: `app/components/ContractDeletionModal.tsx:113`
  - **Completed**: 2025-09-29

- **Contract Edit Auto-Numbering Implementation - MEDIUM PRIORITY** ✅
  - **Problem**: When editing a contract to have duplicate client+project name, allowed duplicate without auto-numbering
  - **Root Cause**: `ContractService.update()` didn't call `generateUniqueProjectName()` like `create()` does
  - **Solution**: Added auto-numbering logic to update method before validation
  - **Implementation**:
    - Fetch current contract to detect if clientName or projectName changed
    - Only auto-number if values changed and would create a duplicate
    - Call `generateUniqueProjectName()` with `excludeId` to exclude current contract
    - Apply unique project name before validation
    - Preserved all existing validation and business rule logic
  - **Results**: Contract editing now auto-numbers duplicates consistently with creation flow
  - **Files**: `lib/services/ContractService.ts:261-308` (update method)
  - **Build Status**: ✅ Compiled successfully (no TypeScript errors)
  - **Completed**: 2025-09-29

#### September 29, 2025 (Morning) - Contract Deletion & Multi-File Processing Complete

#### Contract Management Bug Fixes

- **Contract Creation Auto-Numbering Not Working - HIGH PRIORITY** ✅
  - **Problem**: When creating a contract with duplicate client+project name, shows "Failed to create contract" error instead of auto-numbering
  - **Context**: Auto-numbering should generate "Project Name (2)", "Project Name (3)", etc. for duplicates
  - **Root Cause**: Business rule validation was happening BEFORE auto-numbering, causing duplicate validation to fail before auto-numbering could resolve it
  - **Solution**: Fixed sequence in ContractService.create method to do auto-numbering first, then validation
  - **Implementation**:
    - Moved `generateUniqueProjectName` call before business rule validation
    - Updated validation to use the auto-numbered project name
    - Preserved all existing validation logic for other business rules
    - Maintained proper date processing and audit logging
  - **Results**: Contract creation now works with duplicate names, automatically generating numbered variants
  - **Files**: `lib/services/ContractService.ts` (create method lines 230-256)
  - **Completed**: 2025-09-29

- **Contract Deletion Modal Not Showing - HIGH PRIORITY** ✅
  - **Problem**: When deleting a contract with existing receivables, system shows generic message about deleting receivables instead of the user choice modal
  - **Expected**: Modal with two options: "Delete contract only" / "Delete contract and receivables"
  - **Solution**: Created proper ContractDeletionModal component and integrated with both frontend interfaces
  - **Implementation**:
    - Created `ContractDeletionModal` component following existing modal patterns
    - Fetches deletion info from backend API to show affected receivables
    - Provides user choice between "contract-only" and "contract-and-receivables" deletion modes
    - Updated both `ContractsTab.tsx` and `contracts/page.tsx` to use new modal system
    - Replaced simple confirm() dialogs with proper modal implementation
  - **Results**: Users now see proper modal with deletion options and can make informed choices about receivables
  - **Files**: `app/components/ContractDeletionModal.tsx`, `app/projetos/components/ContractsTab.tsx`, `app/contracts/page.tsx`
  - **Completed**: 2025-09-29

#### Setup Assistant Incremental Upgrade - ALL PHASES COMPLETED
- **Setup Assistant Phase 1: Service Layer Integration** ✅
  - **Problem**: Setup assistant used direct Prisma calls, missing audit logging and service layer benefits
  - **Solution**: Extracted SetupAssistantService class using existing service patterns
  - **Implementation**:
    - Created `SetupAssistantService` extending `BaseService` (33KB implementation)
    - Integrated with `ContractService`, `ExpenseService`, `ReceivableService`
    - Preserved ALL existing Claude prompts and business logic
    - Maintained processing performance (~60s per file)
    - Added automatic audit logging through service layer
    - Deployed as `/api/ai/setup-assistant-v2` alongside existing
  - **Results**: Zero functional regression achieved, modern architecture with better error handling
  - **Files**: `lib/services/SetupAssistantService.ts`, `app/api/ai/setup-assistant-v2/route.ts`
  - **Completed**: 2025-09-28

- **Setup Assistant Phase 2: Team Context & Validation** ✅
  - **Problem**: Manual auth checking, inconsistent validation patterns
  - **Solution**: Added `withTeamContext` middleware and validation schemas
  - **Implementation**:
    - Replaced manual auth with `withTeamContext` middleware in all v2 endpoints
    - Integrated existing validation schemas from unified validation layer
    - Enhanced error reporting with service layer patterns
    - Achieved platform architecture compliance
  - **Results**: Consistent with platform patterns, standardized auth and validation
  - **Files**: `app/api/ai/setup-assistant-v2/route.ts`, `app/api/ai/setup-assistant-v2/multi/route.ts`
  - **Completed**: 2025-09-28

- **Setup Assistant Phase 3: Enhanced Multi-File Features** ✅
  - **Problem**: Current system limited to single file, no interactive clarification
  - **Solution**: Added multi-file processing and enhanced UX capabilities
  - **Implementation**:
    - Multi-file processing using proven single-file logic (`/api/ai/setup-assistant-v2/multi`)
    - Progress tracking and better UX feedback with per-file status
    - Sequential processing with retry logic for reliability
    - Combined results aggregation across multiple files
    - Enhanced onboarding flow with multi-file support
  - **Results**: Superior UX with multi-file support, better reliability and user control
  - **Files**: `app/api/ai/setup-assistant-v2/multi/route.ts`, `app/onboarding/page.tsx`, `OnboardingFileUpload.tsx`
  - **Completed**: 2025-09-28

#### Contract Management Enhancements

- **Contract Deletion with Receivables Enhancement** ✅
  - **Problem**: Users got cryptic "Failed to delete contract" errors when contracts have receivables, and could not edit existing contracts due to false duplicate validation
  - **Solution**: Implemented user-choice deletion flow and fixed validation bug
  - **Implementation**:
    - Fixed validation bug - exclude current contract from duplicate check using `contractId` parameter
    - Enhanced deletion flow with `DeleteOptions` and `DeletionInfo` interfaces
    - Auto-numbering feature with `generateUniqueProjectName()` method
    - New API routes for deletion info and enhanced delete with modes
    - Auto-numbering prevents duplicates by generating "Project (2)", "Project (3)" etc.
  - **Results**: Users can now edit contracts without false errors and have full control over receivables handling during deletion
  - **Files**: `lib/services/ContractService.ts`, `app/api/contracts/[id]/route.ts`, `app/api/contracts/[id]/deletion-info/route.ts`
  - **Completed**: 2025-09-29

#### Multi-File & Excel Processing

- **Multi-Sheet Excel Processing Support** ✅
  - **Problem**: Excel files with multiple sheets only processed the first sheet
  - **Solution**: Added comprehensive multi-sheet Excel processing
  - **Implementation**:
    - Enhanced SetupAssistantService Excel processing logic
    - Combines all sheets with clear delimiters for Claude processing
    - Automatic empty sheet detection and skipping
    - UI feedback showing "X/Y planilhas processadas"
    - Enhanced Claude prompt for multi-sheet awareness
    - Sheet processing metadata in results
  - **Results**: Excel files now process all non-empty sheets with detailed user feedback
  - **Files**: `SetupAssistantService.ts`, `MultiFileSetupAssistant.tsx`, `OnboardingFileUpload.tsx`
  - **Completed**: 2025-09-28

- **Onboarding Multi-File Support** ✅
  - **Problem**: Onboarding page used single-file upload while AI chat had multi-file capability
  - **Solution**: Created OnboardingFileUpload component with full multi-file support
  - **Implementation**:
    - Created specialized `OnboardingFileUpload` wrapper component
    - Replaced single-file logic with multi-file sequential processing
    - Added support for Excel, CSV, PDF, and Images
    - Enhanced results display with entity count summaries
    - Maintained onboarding flow progression (Steps 1→2→Results)
    - Uses `/api/ai/setup-assistant-v2/multi` endpoint for consistency
  - **Results**: Users can now upload multiple files during onboarding with same UX as AI chat
  - **Files**: `app/onboarding/page.tsx`, `app/components/onboarding/OnboardingFileUpload.tsx`
  - **Completed**: 2025-09-28

#### UX Improvements

- **Enhanced Onboarding File Processing UX** ✅
  - **Problem**: Onboarding auto-redirected to dashboard after processing, missing opportunity for user engagement
  - **Solution**: Matched onboarding UX to AI Chat patterns
  - **Implementation**:
    - Added "Adicionar Mais Arquivos" button after processing completion
    - Added "Concluir e Ir para o Dashboard" button to finish onboarding
    - Enhanced results display with summary cards matching AI Chat UX
    - Removed automatic 3-second redirect - user controls navigation
    - Added cumulative results tracking when adding multiple batches
    - Added action buttons to view created entities (contracts/receivables/expenses)
    - Shows cumulative import progress when returning to add more files
  - **Results**: Users can now review results, add more files, or complete onboarding at their own pace
  - **Files**: `app/onboarding/page.tsx`
  - **Completed**: 2025-09-29

#### Technical Upgrades

- **Claude Sonnet 4 Model Upgrade** ✅
  - **Problem**: System was using Claude 3.5 Sonnet instead of latest Claude Sonnet 4
  - **Solution**: Updated Setup Assistant to use Claude Sonnet 4
  - **Implementation**:
    - Updated model from `claude-3-5-sonnet-latest` to `claude-sonnet-4-20250514`
    - Applied to both SetupAssistantService and legacy setup-assistant-direct route
    - Confirmed API compatibility - no changes needed to existing prompts
    - Claude Sonnet 4 provides better coding capabilities and reasoning
  - **Results**: Setup Assistant now uses latest Claude Sonnet 4 for improved extraction accuracy
  - **Files**: `lib/services/SetupAssistantService.ts`, `app/api/ai/setup-assistant-direct/route.ts`
  - **Completed**: 2025-09-29

#### September 2025 - Foundation Complete

- **Service Layer Migration - All Phases** ✅
  - Achieved 45-65% API route code reduction
  - Complete service architecture with audit logging
  - Team context middleware implementation
  - Unified validation layer
  - References: Multiple architectural commits

- **Event System Foundation** ✅
  - Event-driven architecture implementation
  - Team isolation and audit logging
  - Full testing with authenticated users
  - CUID validation and flexible context awareness

- **Documentation System** ✅
  - Docusaurus site fully operational with local search
  - 100% documentation health score
  - API and schema auto-generation
  - Weekly health checks with issue creation

- **Advanced Filtering & Date Navigation** ✅
  - User-friendly date filtering with preset ranges
  - DateRangePicker component with mobile-friendly interface
  - Integrated into ExpensesTab with proper state management
  - Prevents overwhelming users with 2+ years of future recurring expenses

- **Recurring Expense Full Series Generation** ✅
  - Complete backend for immediate full series generation (2-year cap)
  - Scope-based operations (single, future, all) for updates and deletions
  - Comprehensive API endpoints with authenticated testing
  - Series regeneration for frequency changes with paid expense preservation

---

## 📈 Metrics & Progress

### Current System Status
- **Setup Assistant**: ✅ **COMPLETE** - All phases implemented with service layer, team context, and multi-file support
- **Contract Management**: ✅ **COMPLETE** - All bugs fixed (modal responsive + auto-numbering)
- **Multi-File Processing**: ✅ **COMPLETE** - Sequential processing with retry logic
- **Architecture**: ✅ **COMPLETE** - Service layer, validation, team context all implemented

### Overall Project Health
- **Documentation**: 100% health score
- **Core Features**: 100% complete (all contract bugs resolved)
- **Architecture**: Modern and complete
- **Performance**: Good (service layer optimization complete)
- **Security**: Good (team isolation enforced throughout)

---

## 🔗 Quick Links

### Primary References
- [LLM Agent Guide](/LLM_AGENT_GUIDE.md) - Read FIRST
- [Documentation Strategy](/DOCUMENTATION_STRATEGY_PROPOSAL.md)
- [Architecture Decisions](/docs/docs-site/docs/decisions/)
- [Service Layer](/lib/services/README.md)
- [Validation Layer](/lib/validation/README.md)
- [Event System](/lib/events/README.md)

### Development Commands
```bash
# Start development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Database operations
npx prisma studio
npx prisma migrate dev

# Documentation
cd docs/docs-site && npm start
```

---

*Remember: This document is the single source of truth for development priorities. Keep it updated!*