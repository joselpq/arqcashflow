# ArqCashflow Development Backlog

**Purpose**: Central source of truth for project priorities and development status
**Last Updated**: 2025-10-27 (Phase 5 complete - crossfade animation + file upload improvements)
**Update Frequency**: Every LLM session MUST update this document when completing tasks

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

### **Chat-First Onboarding Redesign** 🚀 IN PROGRESS (Started 2025-10-17)
**Goal**: Transform onboarding into AI-first conversational experience
**Status**: Phase 5 COMPLETE ✅ - Moving to Phase 6 (Polish & Testing)
**Related**: ADR-017 Chat-First Onboarding Redesign
**Estimated Time**: 15-20 days (phased)

**Phase 5 Complete - Crossfade Animation Approach:**
- [x] Replaced complex diagonal movement with elegant crossfade
- [x] Shrink to FAB in center (1200ms) with blur effect
- [x] Dramatic pause (600ms) - FAB visible in center
- [x] Simultaneous crossfade (1600ms):
  - Center FAB fades out
  - Corner FAB fades in ON onboarding page (seamless handoff)
- [x] Final pause (400ms) before dashboard redirect
- [x] Total: 3.8 seconds (currently doubled for analysis)
- [x] Fixed loading screen flash during transition
- [x] Smooth, intentional handoff emphasizing chat persistence
- **Result**: Clean, bug-free animation with no position conflicts

**File Upload Workflow Improvements:**
- [x] Updated spreadsheet question: "e/ou" for clarity
- [x] Added "Voltar" button to file upload screen (questions 1-6)
- [x] New contract upload flow for users without spreadsheets:
  - Ask: "Você tem contratos ou propostas dos seus projetos?"
  - If Yes → Upload contracts with message: "Ótimo! Envie seu(s) contrato(s) abaixo:"
  - If No → Education phase
- [x] Separate upload tracking for spreadsheets vs contracts
- [x] Full back navigation support throughout all flows
- **Result**: More flexible onboarding covering spreadsheets OR contracts

**Loading Experience Enhancement:**
- [x] Expanded loading messages from 7 → 13 phrases
- [x] Added fun/engaging Brazilian Portuguese phrases:
  - "Tomando um cafézinho enquanto processamos... ☕"
  - "Conversando com a Inteligência Artificial... 🤖"
  - "Fazendo mágica com seus dados... ✨"
  - "Preparando tudo com carinho... 💙"
  - "Deixando tudo nos trinques... 🎨"
  - "Conferindo os últimos detalhes... 🔍"
- **Result**: 52-second cycle (vs 28s), less repetition, more engaging

**Strategic Vision**:
- Introduce Arnaldo (AI assistant) as primary interaction from day 1
- Optimize for users with existing spreadsheets (80%+ of new users)
- Educational onboarding that teaches platform capabilities
- Visual transition showing chat persistence

**Phase 1: Registration Auto-Login** ✅ COMPLETE (2025-10-17)
- [x] Update registration to auto-login after signup
- [x] Redirect to existing `/onboarding` instead of `/login`
- [x] Fix NavBar flash on auth pages
- [x] Prevent authenticated users from accessing registration
- **Result**: Seamless entry, zero flash on registration flow

**Phase 2: Chat Interface for Profile Questions** ✅ COMPLETE (2025-10-22)
- [x] Create `OnboardingChatContainer` component with auto-scroll
- [x] Create `ChipButtons` component for guided responses
- [x] Enhanced `ChipButtons` with `selectedValue` prop for pre-selection
- [x] Replace Step 2 form with 5-question chat flow (business type → profession → employee count → revenue → has spreadsheet)
- [x] Implement back/undo navigation (← Voltar button on questions 1-4)
- [x] Store answers: business type → profession → employee count → revenue → has spreadsheet
- [x] Uses existing database fields (employeeCount, revenueTier, profession)
- [x] Fixed chip button positioning (stay at bottom)
- **Files**: `app/onboarding/page.tsx`, `OnboardingChatContainer.tsx`, `ChipButtons.tsx`
- **Result**: Conversational profile collection with excellent UX and back navigation

**Phase 3: File Upload in Chat** ✅ COMPLETE (2025-10-21)
- [x] After profile questions, ask: "Tem alguma planilha onde controla seus projetos?"
- [x] Created `ChatFileUpload` component (simplified for chat)
- [x] Multi-file loop: "Tem outros arquivos para importar?"
- [x] Shows results as chat messages
- [x] Fun loading messages (coffee, water, stretching)
- [x] Uses existing SetupAssistant API endpoint
- **Files**: `app/onboarding/page.tsx`, `ChatFileUpload.tsx`
- **Result**: Seamless file upload within chat conversation

**Phase 2 & 3: Completed Improvements** ✅
- [x] **Animated loading text**: Rotate through 7 phrases every 4 seconds with streaming effect
- [x] **Missing business type question**: Added profession question (6 options: Arquitetura, Engenharia Civil, Design de Interiores, Paisagismo, Urbanismo, Outros)
- [x] **Integrated file upload UI**: Complete chat-native redesign with collapsible file list, auto-scroll, compact design (~57% space reduction)
- [x] **Back/undo functionality**: Users can go back to previous questions (1-4) and change answers with pre-selected values highlighted (2025-10-22)

**Phase 4: Education Messages** ✅ COMPLETE (2025-10-22)
- [x] Create `StreamingMessage` component (letter-by-letter typing)
- [x] Create `EducationPhase` component (message sequence manager)
- [x] Create `TypingIndicator` component (animated dots)
- [x] Show AI capabilities messages with streaming effect
- [x] Fixed streaming double-write bug (useRef pattern)
- [x] Fixed runtime error with guard clauses
- [x] Optimized timing: 2s typing indicator → 1s delay → button
- [x] Custom blinking cursor animation (step-end infinite)
- [x] Auto-scroll during streaming and transitions
- [x] Updated message texts per user feedback
- **Files**: `StreamingMessage.tsx`, `EducationPhase.tsx`, `TypingIndicator.tsx`, `app/onboarding/page.tsx`
- **Messages**:
  1. "Se precisar de mim para criar ou editar contratos, recebíveis ou despesas, é só me mandar uma mensagem." (2s typing indicator)
  2. "Ah, e também pode contar comigo para responder perguntas sobre seus projetos e finanças, como o lucro de um mês específico, receita média por projeto etc. Estarei logo ali!" (1s delay → "Continuar" button)
- **Result**: Polished, engaging user education with perfect timing and smooth UX

**Phase 5: Transition Animation** ✅ COMPLETE (2025-10-27)
- [x] Create `useOnboardingTransition` hook with state machine
- [x] Replaced complex diagonal movement with elegant crossfade approach
- [x] Destination FAB appears on onboarding page during crossfade (not after redirect)
- [x] Animation timeline: Shrink (1.2s) → Pause (0.6s) → Crossfade (1.6s) → Final Pause (0.4s)
- [x] Fixed loading screen flash during transition
- [x] SessionStorage coordination between onboarding and dashboard
- [x] Reduced-motion accessibility fallback
- [x] GlobalChat automatic handoff (seamless appearance)
- **Files**: `useOnboardingTransition.ts`, `OnboardingChatContainer.tsx`, `GlobalChat.tsx`, `page.tsx` (dashboard), `onboarding/page.tsx`
- **Result**: Smooth 3.8s crossfade animation with no position conflicts, emphasizing chat persistence

**Phase 6: Polish & Testing** ⏱️ PENDING (2-3 days)
- [ ] E2E tests, unit tests
- [ ] Accessibility audit
- [ ] Performance optimization

**Success Criteria**:
- Onboarding completion rate ≥ 85%
- Total time < 3 minutes
- Chat usage in first month ≥ 60%

---

## 📋 TO DO (Immediate Priorities)

### **User Feedback Improvements - Performance** (HIGH PRIORITY)

#### **File Import Performance & Reliability** (6-8 hours)
- **Problem**: Import slow and failing with multiple files
- **Scope**: Debug logs, error handling, performance profiling
- **Priority**: HIGH (affects onboarding experience)

#### **Chat with Arnaldo Latency** (4-6 hours)
- **Problem**: User perceives lag
- **Goal**: Sub-second response start
- **Needs**: Claude API latency profiling, streaming optimization

#### **Make Chat with Arnaldo More Evident** (2-3 hours)
- **Problem**: FAB not prominent enough
- **Ideas**: Onboarding tooltips, empty state CTAs
- **Goal**: Users discover chat as primary interaction method

---

### **Dashboard "Resolver" Modals Simplification** (3-4 hours) (HIGH PRIORITY - First Interaction)

**Problem**: "Resolver" button modals may be one of the first user interactions with the platform after onboarding
**Current State**: Modals might be too complex or overwhelming for new users
**Goals**:
- Review all "Resolver" button modals on Dashboard page
- Simplify forms and reduce cognitive load
- Ensure clear, friendly copy for first-time users
- Streamline workflows (fewer steps/clicks)
- Consider progressive disclosure patterns

**Impact**: Critical for first impression and user confidence with the platform
**Location**: `app/page.tsx` (Dashboard), related modal components

---

### **Landing Page Redesign** (8-12 hours)

**Current Issues**:
- Too wordy, needs more objective content
- Missing pricing information
- Doesn't emphasize conversational AI
- Too many sections dilute message

**Goals**:
- More professional look (modern, clean design)
- Add pricing section with clear tiers
- Focus on conversational AI (Arnaldo as primary method)
- Reduce content, remove redundant sections
- Show agent in action (demo/video)

**Location**: `app/components/LandingPage.tsx`

---

### **Setup Assistant Production Enhancements**

#### **Improve File Upload Loading Experience** (3-4 hours)
- **Current**: Generic loading spinner during 2-3 minute processing
- **Goal**: Phase-specific progress ("Analyzing file structure...", "Extracting contracts...")
- **Add**: Funny/engaging Brazilian Portuguese messages
- **Show**: Entity count as discovered: "Found 37 contracts, 120 receivables so far..."
- **Location**: `app/components/onboarding/OnboardingFileUpload.tsx`, `app/components/ai/MultiFileSetupAssistant.tsx`

#### **PDF Processing Implementation** (1-2 days) - OPTIONAL
- **Status**: `pdf-parse` installed but NOT integrated
- **Current**: PDFs fail with "Invalid Excel file"
- **Options**: Claude Vision (85-95% accuracy, 1-2 days) OR text-based (60-75%, 4-6 hours)
- **Priority**: MEDIUM (based on user demand)
- **Location**: `SetupAssistantService.ts`

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

### **Phase 1: Registration Auto-Login to Onboarding** ✅ COMPLETE (2025-10-17)
**Impact**: Seamless entry from registration to onboarding with zero UI flash
**Time Spent**: ~2 hours (implementation + edge case fixes)
**Status**: Production-ready, all flash issues resolved

**Implementation**:
- [x] Auto-login after successful registration
- [x] Redirect to `/onboarding` instead of `/login`
- [x] Handle edge cases (duplicate emails, validation errors)
- [x] Prevent authenticated users from accessing registration (back button fix)
- [x] Hide NavBar on `/login`, `/register`, `/onboarding` regardless of auth status
- [x] Hide GlobalChat on onboarding page
- [x] Fix auth page flash with early return when authenticated

**Files Modified**:
- `app/register/page.tsx` (auto-login + anti-flash logic)
- `app/login/page.tsx` (auth check + early return)
- `app/components/NavBar.tsx` (simplified conditional)
- `app/components/chat/GlobalChat.tsx` (hide on onboarding)

**Result**: Seamless registration → auto-login → onboarding flow with zero flash

**Related**: ADR-017 Chat-First Onboarding, Part of Phase 1

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

**Last Updated**: 2025-10-27
**Status**: DOING (1 active - Phase 6 pending), TO DO (8 items), BACKLOG (20+ items), DONE (1 recent)
