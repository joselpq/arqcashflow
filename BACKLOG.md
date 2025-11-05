# ArqCashflow Development Backlog

**Purpose**: Central source of truth for project priorities and development status
**Last Updated**: 2025-11-04 (ADR-020 Chat Streaming created, ready for implementation)
**Update Frequency**: Every LLM session MUST update this document when completing tasks

---

## 🎯 QUICK START FOR NEXT AGENT (2025-11-03)

**We just completed**: Week 1 of Profession-Based Modularization (Doctors MVP)
- ✅ Database, validation, services, AI prompts, onboarding all profession-aware
- ✅ Tested and fixed 4 bugs found during manual testing
- ✅ Patient creation via AI works, navigation terminology works

**Current state**: System is WORKING and ready for Week 2
- Doctors can onboard, select "Medicina" profession
- OperationsAgent can create patients with optional fields (totalValue, signedDate)
- NavBar shows "Pacientes" for doctors, "Contratos" for architects

**Next work**: Week 2 - UI Components & Forms (Days 6-10)
- Update ContractForm.tsx to use profession-aware labels
- Update Dashboard to use terminology system
- Create useTerminology() React hook for easy component usage
- Update all hardcoded "Projeto" / "Contrato" text to dynamic terminology

**See details**: Scroll to "Profession-Based Modularization" section in DOING

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

### **Profession-Based Modularization - Phase 1 (Doctors MVP)** 🚀 IN PROGRESS (Started 2025-11-03)
**Goal**: Enable doctors to use ArqCashflow with medical terminology and validation
**Status**: ✅ Week 1 COMPLETE - Core infrastructure working, tested, and bug-fixed (2025-11-03)
**Priority**: HIGH (multi-vertical expansion, 3-5x TAM potential)
**Estimated Time**: 2-3 weeks (Phase 1 only)
**Related**: ADR-019 Profession-Based Application Modularization

**Strategic Context**:
- Doctors interested in platform → validate demand fast
- Hybrid approach: Phase 1 MVP (2-3 weeks) → Phase 2 config system (if validated)
- Keep validation layer adapted per profession (quality + flexibility)

**Week 1: Core Infrastructure (Days 1-5)** ✅ COMPLETE + POST-TESTING FIXES (2025-11-03)
- [x] Day 1-2: Database & Validation ✅ COMPLETE (2025-11-03)
  - [x] Migrate `totalValue: Float?` and `signedDate: DateTime?` (optional fields)
  - [x] Create `lib/professions/` directory structure
  - [x] Implement `medicina.ts` (doctor-specific config)
  - [x] Implement `terminology.ts` (label mappings)
  - [x] Update validation layer with profession parameter
  - [x] Update ContractService to use profession-aware validation
  - [x] Test backward compatibility - ✅ WORKING

- [x] Day 3-4: AI Prompts & Services ✅ COMPLETE (2025-11-03)
  - [x] Update `OperationsAgentService.buildSystemPrompt()` with profession context
  - [x] Add medical terminology to AI prompts (OperationsAgent)
  - [x] Create arquitetura.ts config for backward compatibility
  - [x] Add `getProfessionConfig()` helper function
  - [x] Fix TypeScript errors (TeamScopedPrisma access)
  - [x] Update `SetupAssistantService` for medical spreadsheets (3 locations: lines 349, 668, 815)
  - [x] Add `businessContext` to arquitetura.ts and medicina.ts configs
  - [x] Test AI understanding - ✅ Patient creation working via OperationsAgent

- [x] Day 5: Onboarding ✅ COMPLETE (2025-11-03)
  - [x] Add "Medicina" to profession options (2 locations: line 140 logic, line 490 UI)
  - [x] Implement profession-aware file upload questions with `getOnboardingMessages()`
  - [x] Verify profession is saved to Team model (already implemented in API route)
  - [x] Test onboarding flow - ✅ WORKING

**Post-Testing Bug Fixes** (2025-11-03 evening)
- [x] **Issue #1**: Onboarding questions not profession-specific
  - [x] Updated medicina.ts: "Você controla suas consultas e finanças em alguma planilha?"
  - [x] Added `hasContractsQuestion` for follow-up prompt differentiation
  - [x] Updated app/onboarding/page.tsx to use profession-aware messages (3 locations)

- [x] **Issue #2**: Navigation tab showing "Contratos" instead of "Pacientes"
  - [x] Updated NavBar.tsx to fetch team profession from new API endpoint
  - [x] Created `/api/user/team` route to return team data including profession
  - [x] NavBar now shows profession-aware terminology (Pacientes vs Contratos)

- [x] **Issue #3**: OperationsAgent patient creation failure
  - [x] Fixed ContractService.ts line 88: `raw.team.findUnique()` Prisma access
  - [x] Fixed ContractService.ts line 342: Null handling for optional `totalValue`

- [x] **Issue #4**: Build error "Cannot read properties of null (reading 'toString')"
  - [x] Fixed ContractsTab.tsx lines 225-231: Null check before `.toString()`
  - [x] Fixed ContractsTab.tsx lines 833-843: Display "-" when `totalValue` is null
  - [x] Fixed ContractsTab.tsx line 930: Display "-" when `signedDate` is null

**Files Modified (Week 1 + Bug Fixes)**:
- Database: `prisma/schema.prisma`
- Profession configs: `lib/professions/medicina.ts`, `arquitetura.ts`, `index.ts`, `terminology.ts`
- Services: `OperationsAgentService.ts`, `SetupAssistantService.ts`, `ContractService.ts`
- Validation: `lib/validation/contracts.ts`
- Onboarding: `app/onboarding/page.tsx`
- Navigation: `app/components/NavBar.tsx`
- Pages: `app/projetos/components/ContractsTab.tsx`
- API: `app/api/user/team/route.ts` (NEW)
- Docs: `ADR-019` (renamed from ADR-018)

**Testing Results**:
- ✅ Medicina onboarding: Profession selection works
- ✅ Profession-aware questions: Displays correct terminology
- ✅ AI patient creation: OperationsAgent successfully creates patients with optional fields
- ✅ Navigation terminology: Shows "Pacientes" for medicina users
- ✅ Projetos page: Handles null values gracefully (displays "-")
- ✅ Backward compatibility: Architects still see "Contratos" and required fields

**📍 NEXT STEPS (Week 2)**: ⏭️ UI Components & Forms (Days 6-10)

**IMPORTANT CONTEXT FOR NEXT AGENT**:
- Week 1 is COMPLETE ✅ - all core infrastructure working
- Week 2 Days 6-9 COMPLETE ✅ - all UI components profession-aware
- Patient creation via AI works (tested with OperationsAgent)
- Navigation terminology works (NavBar fetches profession dynamically)
- Optional fields (totalValue, signedDate) handled properly for medicina
- All bugs from testing fixed

**Current System State**:
- Profession configs: `lib/professions/medicina.ts` and `arquitetura.ts` fully configured
- Terminology system: `getProfessionTerminology(profession)` + `useTerminology()` hook available
- Onboarding: Profession-aware questions working
- Services: ContractService, SetupAssistantService, OperationsAgent all profession-aware
- Database: Optional fields for medicina contracts
- **UI Components: ALL forms, modals, tables, filters now profession-aware** ✅

**Week 2 Implementation Complete**:
- ✅ 6 commits across 4 days (Day 6-7, Day 8, Day 8-9, Day 9)
- ✅ 19 files modified with profession-aware functionality
- ✅ 18+ hardcoded instances replaced with dynamic terminology
- ✅ useTerminology() React hook with localStorage caching
- ✅ Profession-aware form options (categories, statuses)
- ✅ Dynamic VALOR column calculation (profession-based logic)
- ✅ All UI components profession-aware (forms, modals, chat, tables)
- ✅ Manual testing completed (medicina & arquitetura)
- ✅ Bug fixes from user testing (3 critical fixes)

**Key Technical Achievements**:
- Profession-based logic (not inference-based) for VALOR column
- Client-side calculation using existing API data (zero API changes)
- Optional field handling for medicina (totalValue, signedDate)
- Form validation adapts per profession (required vs optional)
- Chat interface fully customized per profession

**Files Modified Summary**:
- Profession configs: 2 files (medicina.ts, arquitetura.ts)
- Forms: 4 files (ContractForm, ExpenseForm, EnhancedExpenseForm, ReceivableForm)
- Tables/Tabs: 3 files (ContractsTab, ExpensesTab, ReceivablesTab)
- Modals: 3 files (DashboardEmptyState, ContractDeletionModal, ContractDetailsModal)
- Chat: 2 files (ChatInput, MessageList)
- Onboarding: 2 files (SetupAssistantModal, MultiFileSetupAssistant)
- Filters: 2 files (AdvancedFilterModal, despesas/page.tsx)
- Docs: 1 file (BACKLOG.md)

**Next**: Week 3 - Pilot Launch (if validated) or pivot based on feedback

---

**Week 2: UI Components (Days 6-10)** ✅ COMPLETE (2025-11-04)
- [x] Day 6-7: useTerminology Hook & Core Forms ✅ COMPLETE
  - [x] Create `useTerminology()` React hook with localStorage caching
  - [x] Update `ContractForm.tsx` labels to use terminology (projectName → terminology.projectName)
  - [x] Update Dashboard metrics with terminology (contracts → terminology.contracts)
  - [x] Update table headers in ContractsTab.tsx ("Projeto / Cliente" → terminology)
  - [x] Update modal titles ("Adicionar Contrato" → `Adicionar ${terminology.contract}`)

- [x] Day 8-9: All Remaining UI Components ✅ COMPLETE
  - [x] HIGH Priority (5 files): ReceivableForm, ExpenseForm, EnhancedExpenseForm, ReceivablesTab, ExpensesTab
  - [x] MEDIUM Priority (3 files): DashboardEmptyState, ContractDeletionModal, ContractDetailsModal
  - [x] LOW Priority (4 files): SetupAssistantModal, MultiFileSetupAssistant, AdvancedFilterModal, despesas/page.tsx
  - [x] Total: 18 instances across 12 files updated with profession-aware terminology

- [x] Day 9: Testing & UX Refinement ✅ COMPLETE
  - [x] Manual testing with both professions (arquitetura & medicina)
  - [x] Fixed: Field labels (Nome do Paciente vs Nome do Responsável)
  - [x] Fixed: Optional field indicators (removed asterisks for medicina)
  - [x] Added: Profession-aware form options (categories & statuses)
  - [x] Added: Profession-aware chat examples (medicina vs arquitetura)
  - [x] Fixed: VALOR column calculation (profession-based, not inference-based)
  - [x] Fixed: Chat welcome message (profession-aware)
  - [x] Fixed: "Recebido" label bug (only shows for values > 0)

**Testing Results (Day 9):**
- ✅ Medicina: All forms show correct terminology ("Paciente", "Responsável")
- ✅ Medicina: Optional fields work (totalValue, signedDate)
- ✅ Medicina: Categories show medical options (Consulta de Rotina, Procedimento, etc.)
- ✅ Medicina: Status shows medical terms (Em Tratamento, Alta Médica)
- ✅ Medicina: VALOR column shows sum of received payments (even with totalValue filled)
- ✅ Medicina: Chat examples relevant to medical practice
- ✅ Arquitetura: All existing behavior preserved (regression testing passed)
- ✅ Backward compatibility: 100% maintained for arquitetura users

**Week 3: Pilot Launch (Days 11-15)**
- [ ] Day 11-13: Documentation & Deployment
  - [ ] Update user documentation for doctors
  - [ ] Create doctor-specific onboarding guide
  - [ ] Deploy to staging for pilot testing
  - [ ] Recruit 5-10 pilot doctors
  - [ ] Deploy to production
- [ ] Day 14-15: Support & Iteration
  - [ ] Monitor pilot doctor usage
  - [ ] Collect feedback and pain points
  - [ ] Fix urgent issues
  - [ ] Document learnings for Phase 2

**Success Criteria (3 months)**:
- 5+ paying doctor customers
- Doctor onboarding completion rate ≥ 80%
- Doctor retention rate ≥ 70% after 30 days
- Support ticket rate < 2x architect baseline

**Decision Point (Month 3)**: GO/NO-GO for Phase 2 (pattern extraction)

**Files to Create**:
- `lib/professions/index.ts` - Exports
- `lib/professions/medicina.ts` - Doctor-specific config
- `lib/professions/terminology.ts` - Terminology mappings
- `prisma/migrations/XXX_optional_contract_fields.sql` - Migration

**Files to Modify**:
- `lib/validation/financial.ts` - Profession-aware validation
- `lib/services/OperationsAgentService.ts` - AI prompt updates
- `lib/services/ContractService.ts` - Use profession-aware validation
- `app/onboarding/page.tsx` - Add medicina option
- `app/components/forms/ContractForm.tsx` - Terminology
- `app/page.tsx` - Dashboard terminology
- `prisma/schema.prisma` - Optional fields

---

### **Chat with Arnaldo Latency Optimization** 🚀 IN PROGRESS (Started 2025-10-28)
**Goal**: Achieve sub-second response start with streaming
**Status**: ✅ ADR-020 created, ready for implementation
**Priority**: HIGH (critical for AI-first positioning)
**Related**: ADR-020 Chat Streaming for Sub-Second Response Latency
**Estimated Time**: 5-7 hours total (phased implementation)

**Problem**: Users experience 3-8 second blocking waits with only a loading spinner
**Solution**: Three-phase streaming optimization strategy

**Implementation Plan** (from ADR-020):
- **Phase 1 (1 hour)**: Quick wins - Optimistic UI + Prompt caching
  - 20-30% perceived improvement + 90% cost reduction for cached tokens
- **Phase 2 (4-6 hours)**: Core fix - Streaming implementation
  - 90% perceived latency reduction (3-8s → <1s to first token)
  - `generateText()` → `streamText()` with frontend streaming handler
- **Phase 3 (2-3 hours)**: Optional polish - System prompt optimization
  - Additional ~5% improvement + cleaner code

**Success Criteria**:
- Time to first token < 1 second for 95% of queries (currently 3-8s)
- 90% perceived latency reduction
- 90% cost reduction for cached tokens (~400 tokens)
- Streaming error rate < 1%
- Chat engagement increase ≥ 30%

**Files to Modify**:
- `lib/services/OperationsAgentService.ts` - Add streaming + caching
- `app/api/ai/operations/route.ts` - Add streaming endpoint
- `app/contexts/ChatContext.tsx` - Implement streaming handler
- `app/components/chat/ThinkingIndicator.tsx` (NEW) - Optimistic UI

**Documentation**: See `/CHAT_LATENCY_OPTIONS.md` for detailed analysis

---

### **Chat-First Onboarding Redesign** 🚀 IN PROGRESS (Started 2025-10-17)
**Goal**: Transform onboarding into AI-first conversational experience
**Status**: Phase 5 & 7 COMPLETE ✅ - Phase 6 skipped (manual testing done)
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

#### **File Import & Upload Speed Optimization** (6-8 hours)
- **Problem**: Import and upload are slow (2-3 minutes for files)
- **Status**: Reliability ✅ FIXED, Speed ❌ NEEDS WORK
- **Scope**: Performance profiling, Claude API optimization, parallel processing
- **Priority**: HIGH (affects onboarding experience)
- **Goal**: Reduce processing time by 40-50% (2-3 min → 1-1.5 min)

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

### **Chat Visibility & Onboarding Integration** ✅ COMPLETE (2025-10-27)
**Impact**: Chat now prominently featured throughout user journey
**Result**: Onboarding redesign made Arnaldo the primary interaction method

**Improvements:**
- ✅ Chat-first onboarding (Phases 1-5)
- ✅ File upload integrated into chat conversation
- ✅ GlobalChat FAB appears immediately after onboarding transition
- ✅ Expense reinforcement via AI proactive messaging
- ✅ Users now discover chat naturally as part of core flow

**Related**: ADR-017, Onboarding redesign PR #5

---

### **File Import Reliability & PDF Processing** ✅ COMPLETE (2025-10-27)
**Impact**: Robust file handling across all formats
**Result**: PDF processing working, import reliability at production quality

**Improvements:**
- ✅ PDF processing implemented and working
- ✅ Excel/spreadsheet import reliability fixed
- ✅ Error handling improved
- ✅ Multi-file upload stability achieved

**Status**: Reliability complete, speed optimization remains in TO DO

---

### **Dashboard "Resolver" Modals Redesign** ✅ COMPLETE (2025-10-27)
**Impact**: Transformed first-touch experience from overwhelming to delightful
**Time Spent**: ~3 hours (all 5 steps)
**Status**: Production-ready

**Problem Solved**:
Users clicking "Resolver" on overdue items were greeted with 14-21 field forms. This created:
- Analysis paralysis (which fields matter?)
- Slow resolution (30+ seconds)
- High abandonment (~40%)
- Poor first impression after onboarding

**Solution Implemented**: "Quick Actions First" Pattern
- Progressive disclosure: Action selection → Minimal form → Full form (opt-in)
- Task-oriented UX: "What do you want to do?" vs "Fill these fields"
- Smart defaults: Today's date, full amount pre-filled
- Friendly copy: "Quando você recebeu?" vs "Received Date"

**Implementation**:
- [x] QuickResolveModal - Action selection with 2 big buttons + small "editar detalhes" link
- [x] QuickReceiveForm - 2 fields (date + amount) with smart defaults
- [x] QuickPostponeForm - 1 field (new date) with quick +7/+15/+30 day buttons
- [x] Dashboard integration - Seamless flow with back navigation
- [x] Full forms preserved - Accessible via "editar detalhes" link

**Files Created**:
- `app/components/modals/QuickResolveModal.tsx`
- `app/components/modals/QuickReceiveForm.tsx`
- `app/components/modals/QuickPostponeForm.tsx`

**Files Modified**:
- `app/page.tsx` (Dashboard - integrated quick modals, added handlers)

**Expected Impact** (to be measured):
- Time to resolve: 30s → 5s (83% reduction) ⏱️
- Click count: 15+ → 3 clicks ✓
- Completion rate: ~60% → ~95% 📈
- First impression: "This is complicated" → "This is easy!" 😊

**UX Improvements**:
- ✅ Visual hierarchy: Green primary button, blue secondary, small text link
- ✅ Contextual info: Shows entity details, days overdue, amount
- ✅ Progressive complexity: Can go deeper if needed
- ✅ Mobile responsive: Works on all screen sizes
- ✅ Keyboard accessible: Tab navigation, Enter to submit
- ✅ Error handling: Validation, network failures
- ✅ Loading states: Disabled buttons, "Salvando..." text

**Result**: Critical first impression moment transformed from cognitive burden to confidence builder

**Related**: BACKLOG Dashboard Modals entry, User Feedback priorities

---

### **Expense Registration Reinforcement (Phase 7)** ✅ COMPLETE (2025-10-27)
**Impact**: Multi-touchpoint strategy to guide contract-only users to add expenses
**Time Spent**: ~6 hours (all 3 phases)
**Status**: Production-ready

**Implementation**:
- [x] **Phase 7.1: Dashboard Banner** - Detects contracts without expenses, shows dismissible banner
- [x] **Phase 7.2: AI Proactive Message** - 10-second delay, personalized Arnaldo message, auto-opens chat
- [x] **Phase 7.3: Conversational Creation** - Leverages existing OperationsAgent for natural language expense creation

**Files Created/Modified**:
- `app/components/dashboard/ExpenseMissingBanner.tsx` (new component)
- `app/hooks/useExpenseReinforcement.ts` (new hook)
- `app/contexts/ChatContext.tsx` (added `addProactiveMessage` method)
- `app/page.tsx` (integrated banner and hook)
- `app/api/dashboard/route.ts` (added expense count and receivables total)

**Features**:
- ✅ Dashboard banner with contract count and receivables total
- ✅ LocalStorage persistence for banner dismissal
- ✅ SessionStorage for one-time proactive message per session
- ✅ Auto-opens chat after 10 seconds with personalized message
- ✅ Natural language expense creation via existing OperationsAgent
- ✅ Multi-touchpoint reinforcement (visual + conversational)

**Result**: Complete post-onboarding reinforcement system ensuring data completeness

**Related**: ADR-017 Chat-First Onboarding (Phase 7), BACKLOG entry implementation

---

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

**Last Updated**: 2025-11-04
**Status**: DOING (2 active - Profession Modularization Week 3 + Chat Latency ADR ready), TO DO (2 items - file speed + landing page), BACKLOG (22+ items), DONE (4 recent)
