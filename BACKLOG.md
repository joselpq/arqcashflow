# ArqCashflow Development Backlog

**Purpose**: Central source of truth for project priorities and development status
**Last Updated**: 2025-10-17 (Cleaned up: removed strategies, simplified structure)
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
**Status**: Phase 1 complete, Phase 2 starting
**Related**: ADR-017 Chat-First Onboarding Redesign
**Estimated Time**: 15-20 days (phased)

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

**Phase 2: Chat Interface for Profile Questions** ⏱️ NEXT (2-3 days)
- [ ] Create `OnboardingChatContainer` component
- [ ] Create `ChipButtons` component for guided responses
- [ ] Replace Step 2 form with chat: "Você é profissional individual ou tem uma empresa?"
- [ ] Store answers: business type → size → revenue
- [ ] Create `UserProfile` model in database
- [ ] API endpoint: `/api/user-profile`
- **Files**: `app/onboarding/page.tsx`, new components, `prisma/schema.prisma`

**Phase 3: File Upload in Chat** ⏱️ PENDING (2-3 days)
- [ ] After profile questions, ask: "Controla seus projetos em alguma planilha?"
- [ ] Reuse `MultiFileSetupAssistant` component in chat
- [ ] Multi-file loop: "Tem outros arquivos para importar?"
- [ ] Proceed to education phase

**Phase 4: Education Messages** ⏱️ PENDING (1-2 days)
- [ ] Create `StreamingMessage` component (letter-by-letter)
- [ ] Show AI capabilities messages
- [ ] Auto-advance or manual button

**Phase 5: Transition Animation** ⏱️ PENDING (3-4 days)
- [ ] CSS animations: shrink → move → morph to FAB
- [ ] Dashboard fades in during animation
- [ ] Mobile + desktop testing

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

**Last Updated**: 2025-10-17
**Status**: DOING (1 active), TO DO (7 items), BACKLOG (20+ items), DONE (1 recent)
