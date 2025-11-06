# ArqCashflow Development Backlog

**Purpose**: Central source of truth for project priorities and development status
**Last Updated**: 2025-11-06 (File import speed Phase 1A & 1B implementation complete)
**Update Frequency**: Every LLM session MUST update this document when completing tasks

---

## 🎯 QUICK START FOR NEXT AGENT (2025-11-06)

**Current work**: File Import Speed Optimization - Phase 1 COMPLETE, Testing Needed 🚀
- ✅ Analysis complete (ADR-022 created)
- ✅ Phase 1A: Prisma createMany implemented (BaseService.ts)
- ✅ Phase 1B: Haiku 4.5 feature flag implemented (SetupAssistantService.ts)
- 🔄 **NEXT**: Testing & validation (prepare test files, measure performance)

**What Was Implemented (Nov 6)**:
- ✅ **Bulk Creation**: Parallel validation + `createMany()` + batch audit logs
- ✅ **Haiku Feature Flag**: `SETUP_ASSISTANT_USE_HAIKU` env var with model switching
- ✅ **Expected Performance**: 90-130s → 18-30s (75-85% improvement)
- ✅ **Cost Savings**: $0.38 → $0.09 per file (76% reduction)

**What's Next**:
1. **Testing**: Validate with 15 diverse test files (accuracy + speed)
2. **Phase 2**: Prompt caching (5-10% speed + 90% cost on cached tokens)
3. **Phase 3**: Monitoring & instrumentation

**Recent completions**:
- ✅ File Import Speed Phase 1A & 1B - Implementation complete
- ✅ ADR-021 Phase 1 - Validation simplification deployed
- ✅ Chat Streaming & Latency Optimization - TESTED & WORKING

**See details**:
- ADR-022 (decision record)
- FILE_IMPORT_DEEP_ANALYSIS.md (complete breakdown)
- DOING section (tracked tasks)

---

## 🚨 CRITICAL INSTRUCTIONS FOR LLM AGENTS

### When Starting a Session
1. **ALWAYS** read this document AFTER reading `CLAUDE.md`
2. **CHECK** the DOING section to understand work in progress
3. **REVIEW** the TO DO section for immediate priorities
4. **AVOID** starting BACKLOG items unless explicitly requested

### When Working on Tasks
1. **MOVE** items from TO DO to DOING when starting work
2. **TRACK SUB-TASKS** within DOING items using checkboxes
3. **UPDATE IN REAL-TIME** as you complete each sub-task
4. **MOVE** completed items from DOING to DONE (then to DONE.md)
5. **ADD** discovered issues or requirements to TO DO or BACKLOG

### Documentation Responsibilities
This backlog **DOES NOT** replace other documentation:
- **STILL UPDATE** technical docs when implementing features
- **STILL UPDATE** ADRs when making architectural choices
- **STILL MAINTAIN** documentation health score at 100%

---

## 📊 Status Categories

**🔄 DOING (Currently In Progress)**
- Work actively being implemented RIGHT NOW
- Can persist between sessions if incomplete
- Should have only 1-2 items maximum
- ❌ DO NOT add items unless actively working on them

**📋 TO DO (Immediate Priorities - Decided Work)**
- Tasks explicitly decided and prioritized to be done soon
- Ready to implement with clear scope
- These are commitments, not possibilities
- ❌ DO NOT add speculative or "nice to have" items

**🗂️ BACKLOG (Future Work - Not Yet Prioritized)**
- Ideas and enhancements that MAY be done later
- No commitment to implementation
- Needs prioritization discussion before moving to TO DO
- ✅ DO ADD discovered improvements or ideas here

**✅ DONE (Recently Completed)**
- Keep ONLY the most recent completed epic here
- Older items move to DONE.md for historical reference

---

## 🔄 DOING (Currently In Progress)

### **File Import Speed Optimization** (ADR-022) 🔥
**Goal**: Reduce file processing time from 2-3 minutes to <1 minute (75-85% improvement)
**Status**: ✅ Phase 1 Complete - Testing Needed
**Related**: ADR-022, FILE_IMPORT_DEEP_ANALYSIS.md, commit c101d85
**Timeline**: Testing (2-3 days), then Phase 2 (2-3h)

**Current Status**:
- ✅ Phase 2 Claude API bottleneck addressed (Haiku 4.5 feature flag)
- ✅ Database bulk creation optimized (parallel validation + createMany)

**Phase 1A: Prisma createMany (Bulk Creation)** ✅ COMPLETE
- ✅ Refactor BaseService.bulkCreate() - lines 273-380
  - ✅ Replace sequential `create()` with `createMany()`
  - ✅ Implement parallel validation with `Promise.allSettled()`
  - ✅ Batch audit logs (1 summary per batch)
  - ✅ Expected: 10-28s → 1-2s (85-90% faster)
- [ ] Test bulk creation (30min) - **NEXT STEP**
  - Test with 100-entity file
  - Verify entity creation accuracy
  - Check audit log batching

**Phase 1B: Switch to Haiku 4.5 (Claude API)** ✅ COMPLETE
- ✅ Implement Haiku with feature flag - lines 121-156
  - ✅ Add env var: `SETUP_ASSISTANT_USE_HAIKU`
  - ✅ Update models + thinking budgets
  - ✅ Feature flag toggle logic in `getModelConfig()`
  - ✅ Expected: 60-100s → 12-20s (75-80% faster)
- [ ] Testing & validation (2-3h) - **NEXT STEP**
  - Prepare 15 diverse test files
  - Manual validation: entity counts, accuracy
  - Compare Haiku vs Sonnet baseline
  - Document accuracy metrics
- [ ] Gradual rollout (2-3 days)
  - Enable 10% → 25% → 50% → 100%
  - Monitor metrics continuously
  - Rollback ready if accuracy < 85%

**Phase 2: Prompt Caching (Cost Optimization)** - Ready to Implement
- [ ] Implement prompt caching (1-2h)
  - Split prompts: static (cached) vs dynamic
  - Add cache_control to system messages
  - Track cache hit rates
  - Expected: 5-10% speed + 90% cost savings
- [ ] Validation (30min)
  - Verify cost reduction in API logs
  - Compare speed with/without caching

**Phase 3: Monitoring**
- [ ] Add performance instrumentation (1h)
  - console.time() for major steps
  - Track metrics per file type
- [ ] Create dashboards (1h)
  - Processing time, accuracy, cost, cache hits

**Expected Result**: 90-130s → **18-30s** (75-85% improvement) ✅
**Cost Savings**: $0.38 → $0.09 per file (76% reduction) ✅

---

## 📋 TO DO (Immediate Priorities)

---

### 🎯 **Validation Simplification - Phase 2** (HIGH PRIORITY) - 📋 **Ready for Implementation**
**Status**: Decided - Implementation Pending
**Decision Date**: November 5, 2025
**Effort**: 2-3 days
**Related**: ADR-021 Phase 2

**Objective**: Migrate 6 API routes to unified validation (pure refactoring, zero behavior changes)

**Context**:
- Phase 1 ✅ Complete: Context-aware validation removed (-487 lines), business rules loosened, audit disabled
- Decision: Option A (Migrate to unified validation)
- Rationale: Multi-profession support in use, service layer consistency, future-proofing

**Routes to Migrate** (6 total):
1. `app/api/contracts/route.ts` (POST)
2. `app/api/contracts/[id]/route.ts` (PUT)
3. `app/api/receivables/route.ts` (POST)
4. `app/api/expenses/route.ts` (POST)
5. `app/api/auth/register/route.ts` (POST)
6. `app/api/expenses/[id]/recurring-action/route.ts` (POST)

**Implementation Guide**: `ADR-021-PHASE2-IMPLEMENTATION-GUIDE.md` (complete step-by-step instructions)

**Expected Outcome**:
- ✅ Single source of truth for validation
- ✅ ~100 lines removed (inline schemas → imports)
- ✅ Zero behavior changes (pure refactoring)
- ✅ Easy to rollback (each route commits independently)

---

### **Landing Page Redesign** (PARTIALLY COMPLETE - Pricing Section Remaining)

**✅ Completed (2025-11-05)**:
- Professional modern design with SVG icons
- Rotating interactive mockups (3 examples)
- Auto-rotation every 10 seconds for engagement
- Streamlined content (removed redundant features section)
- Consistent background color pattern
- "Arnaldo" branding throughout

**❌ Remaining**:
- Add pricing section with clear tiers (4-6 hours)
- Demo video or interactive agent showcase (optional)

**Location**: `app/components/LandingPage.tsx`

---

---

## 🗂️ BACKLOG (Future Work)

### UX Improvements

#### **Chat File Upload Features**
- **Custom Instructions**: User can guide extraction ("Only import expenses from July")
- **Token Usage Counter**: Show API cost estimates to users

#### **Multi-File Processing Enhancements**
- **True Parallel Processing**: Process 3 files at a time (4-5 hours)
- **Real-Time Progress**: WebSocket/SSE for live updates
- **User Review Before Creation**: Review extracted data before database creation
- **Cross-File Duplicate Detection**: Warn about duplicates across files

#### **System Message Standardization** (1 week)
- Replace browser `alert()`/`confirm()` with toast notifications
- Standardize deletion confirmations
- Consistent UX patterns across all flows
- **Priority**: LOW (UX polish)

#### **Receivable Title Enhancement** (2-3 days)
- Enhance receivable titles from Setup Assistant
- Include more context: "Payment for [Project] - Milestone 1"
- **Priority**: MEDIUM

#### **AI Filter Results Interactivity** (MEDIUM priority)
- **Problem**: AI-filtered tables don't respond to additional sorting/filtering
- **Current**: AI query creates static snapshot
- **Expected**: AI-filtered results should work with all table controls
- **Solution**: Store AI filter criteria and apply alongside UI filters

---

### Dashboard & Analytics

#### **BusinessMetricsService Phase 3** (2-3 hours) - ADR-014
- **New Metrics**: Cash flow forecast, receivables aging, project profitability, expense breakdown
- **Prerequisites**: Phase 1 & 2 complete ✅
- **Related**: Dashboard strategy (tabs vs pages vs cards) needs decision

#### **Dashboard UX Strategy Decision** (4-6 hours) - ADR-014
- **Options**: Tabs within dashboard, separate pages, expandable cards
- **Tasks**: Create mockups, gather user feedback, document decision
- **Dependencies**: User feedback required

#### **Scalable Metrics Refactor** (2-3 days) - ADR-015 Phase 1
- **Problem**: Hardcoded time periods, in-memory filtering (not scalable)
- **Solution**: Flexible date ranges, database-optimized queries, time-series grouping
- **Capabilities**: Custom date ranges, day/week/month/quarter/year grouping
- **Priority**: Foundation for all analytics features

#### **Custom KPI Dashboard Builder** (3-4 weeks)
- AI-powered custom dashboards
- Natural language KPI selection
- Drag-and-drop customization
- **Prerequisites**: BusinessMetricsService ✅, Dashboard UX complete
- **Related**: ADR-015 Phases 3-4

---

### AI & Automation

#### **AI Agent Error Handling Standardization** (3-4 days)
- Define error categories and handling patterns
- User-friendly error messages (PT/EN)
- Retry logic with exponential backoff
- Error monitoring integration
- **Priority**: MEDIUM (quality improvement)

#### **Setup Assistant XLSX Single-Phase Extraction** (4-6 hours)
- **Opportunity**: Use extended thinking for single API call (like PDF flow)
- **Benefits**: Faster, lower cost, simpler architecture
- **Needs**: Testing with complex multi-sheet files
- **Priority**: MEDIUM (performance optimization)

#### **Phase 2 AI Agents** - ADR-008
- **Financial Audit Agent** (5-7 days): Proactive error detection, data validation
- **Business Insights Agent** (2-3 weeks): CFO-level strategic intelligence
- **Prerequisites**: Mature user data needed

---

### Platform & Architecture

#### **Validation & Audit Logging Review** (3-5 days)
- **Problem**: Current validation and audit logging systems add complexity with limited value
- **Scope**: Review and simplify validation rules and audit logging logic
- **Issues Identified**:
  - Overly restrictive validation rules blocking valid use cases (e.g., prepayments, scheduled dates)
  - Audit logging creating foreign key constraints that complicate deletion flows
  - Business rule warnings generating noise without clear actionable insights
  - Validation logic duplicated across multiple layers (schemas, services, database)
- **Potential Solutions**:
  - Simplify validation to critical rules only (security, data integrity)
  - Make audit logging optional or move to separate event log with soft references
  - Remove business rule warnings or convert to passive analytics
  - Consolidate validation into single layer
- **Benefits**:
  - Faster development (less validation to maintain)
  - More flexible system (fewer blocked edge cases)
  - Simpler deletion flows (no audit log constraints)
  - Clearer error messages (only critical validations fail)
- **Priority**: MEDIUM-HIGH (affecting development velocity and UX)
- **Risks**: Need to ensure critical data integrity rules remain enforced

#### **Profession-Based Application Modularization** (6-8 weeks)
- **Problem**: Application is architecture-centric, needs to adapt to different professions
- **Scope**: Make platform adaptable to different professional contexts
- **Features**:
  - Dynamic terminology per profession (Projects → Patients for doctors, Projects → Cases for lawyers, etc.)
  - Profession-specific AI agent prompts and behavior
  - Adapted onboarding flow per profession (questions, file upload expectations)
  - Profession-specific validation rules (e.g., medical codes vs. construction codes)
  - Industry-specific templates and suggestions
  - Configurable entity names and fields
- **Architecture**:
  - Create profession configuration system (JSON/database-driven)
  - Implement i18n-like terminology replacement system
  - Refactor AI prompts to use profession context
  - Build profession-aware validation schema system
  - Update onboarding to branch based on selected profession
- **Priority**: MEDIUM-HIGH (enables multi-vertical expansion)
- **Prerequisites**: Stable core platform, clear multi-profession strategy
- **Related**: Onboarding profession question, validation layer refactor

#### **Logged Area Design Review & Refresh** (2-3 weeks)
- **Problem**: Current logged area design needs polish and modern visual identity
- **Scope**: Comprehensive visual design review of authenticated experience
- **Focus Areas**:
  - Color palette review and modernization (primary, secondary, accent colors)
  - Typography hierarchy and readability
  - Spacing and layout consistency
  - Dark mode preparation (color system foundation)
  - Component visual consistency (buttons, cards, forms, tables)
  - Dashboard visual hierarchy improvements
  - Navigation and sidebar design refinement
- **Deliverables**:
  - Updated design system documentation
  - Tailwind config with new color palette
  - Component library refresh
  - Before/after screenshots
- **Priority**: MEDIUM (quality improvement, brand perception)
- **Related**: Landing page redesign, design principles

#### **Frontend Infrastructure Refactor** (4-6 weeks)
- Component library standardization
- Layout system for customization
- User preferences storage
- State management strategy decision
- Performance optimization
- **Priority**: MEDIUM (foundation for future features)

#### **Customer Journey & UX Optimization** (3-4 weeks)
- User journey mapping (with AI workflows)
- Onboarding flow optimization
- Navigation structure review
- Accessibility audit
- **Priority**: HIGH (retention and adoption)

#### **Financial Automation**
- **Open Finance Integration** (6-8 weeks): Automatic bank sync, payment matching
- **Prerequisites**: Mature user base, legal compliance review, partnership
- **Priority**: LOW (future strategic initiative)

#### **CUID to UUID Migration Analysis**
- Assess benefits/costs of migration
- Database performance implications
- **Priority**: MEDIUM

#### **Frontend Modularization Assessment**
- Identify redundant UI components
- Create reusable component library
- Reduce code duplication
- **Priority**: MEDIUM

---

## ✅ DONE (Recently Completed)

### **Chat Streaming & Latency Optimization (Phases 1 & 2)** ✅ COMPLETE (2025-11-05)
**Impact**: 90% perceived latency reduction + 90% cost reduction for cached tokens
**Time Spent**: ~4-5 hours (Phase 1: 1h, Phase 2: 3-4h)
**Related**: ADR-020 Chat Streaming for Sub-Second Response Latency
**Status**: TESTED & WORKING IN PRODUCTION

**Problem Solved**:
- Users experienced 3-8 second blocking waits with only a loading spinner
- No feedback during AI processing
- Poor first impression after onboarding

**Phase 1: Quick Wins** ✅ COMPLETE (1 hour)
- ✅ Created `ThinkingIndicator` component with "Arnaldo está pensando 💭"
- ✅ Integrated optimistic UI into MessageList
- ✅ Added Anthropic prompt caching with `providerOptions.anthropic.cacheControl`
- ✅ Expected 90% cost reduction for ~400 tokens of cached system prompt

**Phase 2: Core Streaming Implementation** ✅ COMPLETE (3-4 hours)
- ✅ Added `processCommandStream()` method using `streamText()`
- ✅ Updated API route `/api/ai/operations` for streaming support
- ✅ Implemented frontend streaming handler in ChatContext
- ✅ Token-by-token rendering with real-time UI updates
- ✅ Backward compatibility preserved

**Results**:
- ✅ Time-to-first-token: 3-8s → <1s (90% improvement) - VERIFIED
- ✅ Cost reduction: ~90% for cached tokens
- ✅ Streaming works perfectly with tool calls
- ✅ No errors, smooth user experience

**Files Modified**:
- `lib/services/OperationsAgentService.ts` - Added streaming method
- `app/api/ai/operations/route.ts` - Streaming support
- `app/contexts/ChatContext.tsx` - Streaming response handler
- `app/components/chat/ThinkingIndicator.tsx` (NEW)
- `app/components/chat/MessageList.tsx` - Integrated indicator

---

### **Chat-First Onboarding Redesign** ✅ COMPLETE (2025-10-27)
**Goal**: Transform onboarding into AI-first conversational experience
**Status**: Phases 1-5 & 7 COMPLETE ✅ - Phase 6 (Polish & Testing) deferred
**Related**: ADR-017 Chat-First Onboarding Redesign
**Time Spent**: ~15-20 days (phased implementation)

**Strategic Achievement**:
- Transformed onboarding from form-based to conversational AI-first experience
- Arnaldo (AI assistant) now primary interaction from day 1
- 100% file upload functionality integrated into chat
- Seamless registration → onboarding → dashboard flow
- Visual transition emphasizes chat persistence

**Phase 1: Registration Auto-Login** ✅ COMPLETE (2025-10-17)
- ✅ Auto-login after successful registration
- ✅ Redirect to `/onboarding` instead of `/login`
- ✅ Fix NavBar flash on auth pages
- ✅ Prevent authenticated users from accessing registration
- **Result**: Seamless entry, zero flash on registration flow

**Phase 2: Chat Interface for Profile Questions** ✅ COMPLETE (2025-10-22)
- ✅ Created `OnboardingChatContainer` component with auto-scroll
- ✅ Created `ChipButtons` component for guided responses
- ✅ 5-question chat flow (business type → profession → employee count → revenue → has spreadsheet)
- ✅ Implemented back/undo navigation (← Voltar button)
- ✅ Fixed chip button positioning (stay at bottom)
- **Result**: Conversational profile collection with excellent UX

**Phase 3: File Upload in Chat** ✅ COMPLETE (2025-10-21)
- ✅ Created `ChatFileUpload` component (simplified for chat)
- ✅ Multi-file loop: "Tem outros arquivos para importar?"
- ✅ Fun loading messages (13 phrases: coffee, AI, magic, etc.)
- ✅ Uses existing SetupAssistant API endpoint
- **Result**: Seamless file upload within chat conversation

**Phase 4: Education Messages** ✅ COMPLETE (2025-10-22)
- ✅ Created `StreamingMessage` component (letter-by-letter typing)
- ✅ Created `EducationPhase` component (message sequence manager)
- ✅ Created `TypingIndicator` component (animated dots)
- ✅ Optimized timing: 2s typing indicator → 1s delay → button
- ✅ Custom blinking cursor animation
- **Result**: Polished, engaging user education with perfect timing

**Phase 5: Transition Animation** ✅ COMPLETE (2025-10-27)
- ✅ Created `useOnboardingTransition` hook with state machine
- ✅ Elegant crossfade approach: Shrink (1.2s) → Pause (0.6s) → Crossfade (1.6s) → Final Pause (0.4s)
- ✅ Fixed loading screen flash during transition
- ✅ SessionStorage coordination between onboarding and dashboard
- ✅ Reduced-motion accessibility fallback
- ✅ GlobalChat automatic handoff (seamless appearance)
- **Result**: Smooth 3.8s crossfade animation emphasizing chat persistence

**Phase 7: Expense Registration Reinforcement** ✅ COMPLETE (2025-10-27)
- ✅ Dashboard banner for contracts without expenses
- ✅ AI proactive message after 10 seconds (auto-opens chat)
- ✅ Natural language expense creation via OperationsAgent
- **Result**: Multi-touchpoint reinforcement ensuring data completeness

**File Upload Workflow Improvements**:
- ✅ Updated spreadsheet question: "e/ou" for clarity
- ✅ Added "Voltar" button to file upload screen
- ✅ New contract upload flow for users without spreadsheets
- ✅ Separate upload tracking for spreadsheets vs contracts
- ✅ Full back navigation support throughout all flows

**Loading Experience Enhancement**:
- ✅ Expanded loading messages from 7 → 13 phrases
- ✅ Brazilian Portuguese phrases (cafézinho, mágica, carinho, etc.)
- ✅ 52-second cycle (vs 28s), less repetition, more engaging

**Components Created**:
- `OnboardingChatContainer.tsx` - Main chat container
- `ChipButtons.tsx` - Guided response buttons
- `ChatFileUpload.tsx` - File upload in chat
- `StreamingMessage.tsx` - Typing animation
- `EducationPhase.tsx` - Message sequence manager
- `TypingIndicator.tsx` - Animated dots
- `useOnboardingTransition.ts` - Transition state machine
- `ExpenseMissingBanner.tsx` - Dashboard banner
- `useExpenseReinforcement.ts` - Reinforcement hook

**Success Metrics (Target)**:
- Onboarding completion rate ≥ 85%
- Total time < 3 minutes
- Chat usage in first month ≥ 60%

**Phase 6 Status**: DEFERRED (E2E tests, accessibility audit, performance optimization - not critical for launch)

---

**📁 For older completed work, see [DONE.md](DONE.md)**

---

## 📚 Maintenance Instructions

### When Completing Tasks
1. Move item from TO DO → DOING when starting
2. Update checkboxes in real-time as you work
3. When complete, move from DOING → DONE section
4. Move previous DONE item to DONE.md (keep only most recent here)
5. Update "Last Updated" date at top of file

### Task Title Guidelines

**❌ BAD** - Vague:
- "Phase 1" / "Improve performance" / "Add features"

**✅ GOOD** - Specific:
- "Phase 1A: Setup Assistant extraction accuracy with sub-batch splitting"
- "Excel token optimization for multi-sheet Setup Assistant processing"
- "Advanced date filtering for recurring expenses (before/after/month/year)"

**Format**: `[Feature/Area]: [Specific what] with [Key implementation detail]`

---

**Last Updated**: 2025-11-06
**Status**: DOING (1 - file speed optimization Phase 1 complete, testing pending), TO DO (2 items - validation simplification, landing page), BACKLOG (22+ items), DONE (1 recent - Chat Streaming)
