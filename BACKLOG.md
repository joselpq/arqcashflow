# ArqCashflow Development Backlog

**Purpose**: Central source of truth for project priorities and development status
**Last Updated**: 2025-11-05 (Chat streaming & latency optimization complete - Phases 1 & 2)
**Update Frequency**: Every LLM session MUST update this document when completing tasks

---

## 🎯 QUICK START FOR NEXT AGENT (2025-11-05)

**We just completed**: Chat Streaming & Latency Optimization ✅ (Phases 1 & 2)
- ✅ Optimistic UI with "Arnaldo está pensando 💭" indicator
- ✅ Prompt caching for 90% cost reduction on repeat requests
- ✅ Full streaming implementation with `streamText()` - 90% perceived latency reduction
- ✅ Time-to-first-token: 3-8s → <1s (expected)

**Previous completions**:
- ✅ Domain migration cleanup - Complete rebrand to "Arnaldo"
- ✅ Landing page professional redesign - Modern SaaS aesthetic
- ✅ Profession-Based Modularization (Weeks 1-2) - Doctors MVP complete

**Current state**: Chat now streams responses in real-time
- Users see thinking indicator immediately (no more "Is this working?" moments)
- Tokens appear as Claude generates them (real-time streaming)
- Backward compatible with non-streaming mode
- Ready for production testing and metrics collection

**Next priorities** (see TO DO section):
1. **File Import Speed Optimization** (HIGH) - 6-8 hours to reduce 2-3min → 1-1.5min
2. **Landing Page Pricing Section** (MEDIUM) - 4-6 hours to complete redesign

**See details**: Check "Chat Streaming & Latency Optimization" in DONE section

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

*No active work in progress*

---

## 📋 TO DO (Immediate Priorities)

### **User Feedback Improvements - Performance** (HIGH PRIORITY)

#### **File Import & Upload Speed Optimization** (6-8 hours)
- **Problem**: Import and upload are slow (2-3 minutes for files)
- **Status**: Reliability ✅ FIXED, Speed ❌ NEEDS WORK
- **Scope**: Performance profiling, Claude API optimization, parallel processing
- **Priority**: HIGH (affects onboarding experience)
- **Goal**: Reduce processing time by 40-50% (2-3 min → 1-1.5 min)

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

**Last Updated**: 2025-11-05
**Status**: DOING (none), TO DO (2 items - file speed + landing page), BACKLOG (22+ items), DONE (1 recent - Chat-First Onboarding)
