# ArqCashflow - Completed Work Archive

**Purpose**: Historical record of completed epics and major features
**Note**: This file contains ONLY completed epic-level work. Task-level completions remain within their epics in BACKLOG.md.
**Maintenance**: When adding a new DONE epic to BACKLOG.md, move the previous one here (newest first).

---

## ✅ DONE (Historical Completed Epics)
*Newest first, for reference.*

### **Fix: Floating Chat Appearing on Landing Page** ✅ COMPLETE (2025-10-15)
**Impact**: Security and UX fix - chat now only visible to authenticated users
**Time Spent**: ~15 minutes (investigation + fix + testing)
**Status**: Production-ready, proper authentication gating

**Problem**:
- Floating chat with AI (Arnaldo) was appearing on public landing page
- GlobalChat component rendered globally in `app/layout.tsx` without authentication check
- Chat should only be accessible in logged-in area

**Root Cause**:
- `GlobalChat` component in `app/layout.tsx:46` had no authentication logic
- Rendered unconditionally for all routes, including public landing page

**Solution**:
- Added `useSession()` hook from next-auth to GlobalChat component
- Return `null` when user is not authenticated or session is loading
- Chat FAB and panel only render for authenticated users

**Implementation**:
- Added authentication check: `if (status === 'loading' || !session) return null`
- Follows same pattern as main dashboard (`app/page.tsx`)
- Zero impact on existing functionality for logged-in users

**Technical Implementation**:
```typescript
// Added to GlobalChat.tsx
const { data: session, status } = useSession()

// Only render chat when user is authenticated
if (status === 'loading' || !session) {
  return null
}
```

**Strategic Value**:
- Proper security boundary for authenticated features
- Cleaner public landing page experience
- Consistent with application authentication patterns

**Files Modified**:
- `app/components/chat/GlobalChat.tsx` (added authentication check)

**Build Status**: ✅ Compiled successfully (4.3s, zero errors)

**Completed**: 2025-10-15

---

### **Change Floating Chat Icon to AI Sparkles Symbol** ✅ COMPLETE (2025-10-15)
**Impact**: Better visual communication of AI-powered assistant
**Time Spent**: ~1 hour (research + iterations + implementation)
**Status**: Production-ready, using mainstream AI iconography

**Implementation Highlights**:
- ✅ **Gemini-Style Sparkle**: Four-pointed diamond-arm sparkle (mainstream standard)
- ✅ **3-Sparkle Composition**: 1 large center + 2 small (30% size) for visual interest
- ✅ **Symmetric Design**: All arms bulge equally in middle, taper at ends
- ✅ **Research-Driven**: Based on Google Gemini icon analysis (industry leader)
- ✅ **Build Successful**: Zero errors, fully functional

**Design Evolution**:
1. Started with sharp-pointed star (too thin)
2. Tried thick rounded plus (opposite direction)
3. Analyzed actual Gemini icon from saved image
4. Implemented diamond-arm sparkle with proper bulge
5. Made fully symmetric
6. Added 2 smaller sparkles for composition

**Technical Implementation**:
- Diamond-shaped arms that bulge wide in middle
- SVG paths with proper geometry
- Maintains gradient blue-purple button background
- Positioned strategically (top-right and bottom-left small sparkles)

**Strategic Value**:
- Aligns with mainstream AI iconography (Google, Gemini standard)
- "Sparkles = AI" is recognized pattern across industry
- Better communicates AI capability than generic chat bubble
- Professional, modern aesthetic

**Files Modified**:
- `app/components/chat/ArnaldoChatFAB.tsx` (icon SVG replacement)
- `gemini_star.png` (reference image used for design)

**Build Status**: ✅ Compiled successfully (5.0s, zero errors)

**Completed**: 2025-10-15

---

### **2E. AI Natural Language Filtering** ✅ COMPLETE (2025-10-08)
**Impact**: 10x faster filtering for power users, supports complex boolean queries without UI complexity
**Time Spent**: ~10 hours (within 8-12h estimate)
**Status**: Fully implemented across all 3 entity tabs with instant apply

**Architecture**:
- **Trust-the-LLM approach**: Schema context + user input → Prisma query object
- **Backend**: FilterAgentService + `/api/filters/ai` endpoint
- **Frontend**: AdvancedFilterModal with glassy-blurred backdrop
- **Integration**: [+ Mais] dropdown → "🤖 Filtros Avançados (IA)" in all tabs

**Features Implemented**:
- ✅ Boolean logic (OR, AND, NOT) - "recorrentes OU canceladas"
- ✅ Sorting (asc/desc) - "ordenados por valor desc"
- ✅ Date ranges (relative + absolute) - "últimos 30 dias", "depois de janeiro"
- ✅ Numeric comparisons - "acima de 20k", "entre 5k e 10k"
- ✅ Text search (case-insensitive) - "João Silva" matches project or client
- ✅ Instant apply - Auto-closes modal and shows results immediately
- ✅ State tracking - "× Limpar" button shows when AI filter active
- ✅ Normalized sorting - Case & accent-insensitive (José, MARIA, joão sort correctly)

**Files Created**:
- `lib/services/FilterAgentService.ts` (328 lines)
- `app/api/filters/ai/route.ts` (128 lines)
- `app/components/AdvancedFilterModal.tsx` (366 lines)

**Build**: ✅ Successful (4.9s, zero errors)
**Cost**: ~$0.01 per query, ~$10/month estimated (100 users, 10 queries/user)

---

### **2D. Mobile Filter Drawer** ✅ COMPLETE (2025-10-08)
**Impact**: 100-150px vertical space saved on mobile, improved touch-friendly UX
**Time Spent**: ~2 hours
**Status**: Fully implemented across all 3 entity tabs

**Implemented**:
- ✅ **Desktop filters hidden on mobile** (<md breakpoint)
- ✅ **Collapsed mobile view**: Search + "Filtros" button with badge count
- ✅ **Bottom sheet modal** with:
  - Sticky header with title + close button
  - All filter options (Status, Category, Type, etc.)
  - Touch-friendly controls (44-48px tap targets)
  - Sticky footer with "Limpar" and "Aplicar" buttons
  - 80vh max height with scroll
  - Backdrop overlay (tap to close)
- ✅ **Active filter count badge** on button
- ✅ **Applied to all tabs**:
  - Expenses (Status, Category, Type, Recurring)
  - Receivables (Status, Category, Projeto)
  - Contratos (Status, Category)

**Files Modified**:
- `app/expenses/page.tsx` (added mobile drawer + filter count logic)
- `app/receivables/page.tsx` (added mobile drawer + filter count logic)
- `app/projetos/components/ContractsTab.tsx` (added mobile drawer + filter count logic)

**Build**: ✅ Successful (5.2s compile, zero errors)

---

### **2C. Quick Filter Chips with [+ Mais] Dropdown** ✅ COMPLETE (2025-10-08)
**Impact**: One-click access to common filter combinations, 40px vertical space saved
**Time Spent**: ~1 hour total
**Status**: Fully implemented across all 3 entity tabs

**Implemented (All Tabs)**:
- ✅ **Merged layout**: Chips + Add button on same row (saves ~40px vertical space)
- ✅ **[+ Mais] dropdown** with additional presets:
  - **Expenses**: Últimos 7 Dias, Últimos 30 Dias, Cancelados, Sem Categoria
  - **Receivables**: Últimos 7 Dias, Últimos 30 Dias, Recebidos Este Mês, Cancelados
  - **Contratos**: Concluídos Este Mês, Últimos 30 Dias, Cancelados
- ✅ **Visual active state**: Selected options show blue highlight + checkmark (✓)
- ✅ **Toggle behavior**: Click again to deselect
- ✅ **Fixed "× Limpar" button**: Shows when ANY quick filter is active (including [+ Mais] filters)
- ✅ **Fixed "Copiar Link" button**: Includes quick filter state in URL
- ✅ **Date-range logic**: Implemented for "Últimos 7 Dias", "Últimos 30 Dias", "Recebidos Este Mês", etc.

**Files Modified**:
- `app/expenses/page.tsx` (complete with dropdown)
- `app/receivables/page.tsx` (complete with dropdown)
- `app/projetos/components/ContractsTab.tsx` (complete with dropdown)

**Build**: ✅ Successful (5.0s compile, zero errors)

**Technical Implementation**:
```typescript
// State management
const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null)
const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)

// Date-range filtering for "Últimos 7 Dias"
if (activeQuickFilter === 'last-7-days') {
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  filtered = filtered.filter((expense: any) => {
    const dueDate = new Date(expense.dueDate)
    return dueDate >= sevenDaysAgo && dueDate <= today
  })
}

// Visual active state in dropdown
className={`... ${
  activeQuickFilter === 'last-7-days'
    ? 'bg-blue-50 text-blue-700 font-medium'
    : 'hover:bg-neutral-50'
}`}
```

**User Benefits**:
- Faster navigation to frequently viewed data subsets
- Visual feedback with color-coded states
- Space efficiency (merged layout)
- More preset options without cluttering main UI
- Clear visual indication of active filters

**Build Status**: ✅ Compiled successfully (5.0s)

---

### **2A. URL Persistence for Filters** ✅ COMPLETE (2025-10-07)
**Impact**: Shareable filtered views, bookmarkable searches, improved UX continuity

**Implemented**:
- ✅ URL query parameter sync for all filter states (status, category, sort, search)
- ✅ Browser back/forward button support (filter state restoration)
- ✅ "Copiar Link" button for sharing filtered views
- ✅ Clean URL format (skips defaults to avoid clutter)
- ✅ Applied to all three entity tabs (Projetos, Recebíveis, Despesas)
- ✅ Preserves edit mode parameters when present

**Files Modified**:
- `app/expenses/page.tsx` - URL persistence + Copy Link button
- `app/receivables/page.tsx` - URL persistence + Copy Link button
- `app/projetos/components/ContractsTab.tsx` - URL persistence + Copy Link button

**Technical Implementation**:
```typescript
// Initialize filters from URL params
const [filters, setFilters] = useState({
  status: searchParams.get('status') || 'pending',
  category: searchParams.get('category') || 'all',
  sortBy: searchParams.get('sortBy') || 'dueDate',
  sortOrder: searchParams.get('sortOrder') || 'asc',
})

// Sync to URL on change (skip defaults)
useEffect(() => {
  const params = new URLSearchParams()
  if (filters.status !== 'pending') params.set('status', filters.status)
  if (searchQuery) params.set('search', searchQuery)
  router.replace(`${pathname}?${params.toString()}`, { scroll: false })
}, [filters, searchQuery])
```

**Example URLs**:
- `/despesas?status=paid&category=Salários&search=pedro`
- `/recebiveis?status=overdue&sortBy=amount&sortOrder=desc`
- `/projetos?status=completed&category=Residencial`

**User Benefits**:
- Share filtered views with team members
- Bookmark frequently used filters
- Browser back/forward works as expected
- Better workflow continuity (filters persist across sessions)

**Build Status**: ✅ Compiled successfully (5.1s)

---

### **Compact Filters Implementation** ✅ COMPLETE (2025-10-07)
**Impact**: 45-125px vertical space saved per page (2-5 additional table rows visible)

**Implemented**:
- ✅ Removed filter labels (self-documenting dropdowns with "Status: Ativos" format)
- ✅ Merged search + filters into single row layout
- ✅ Search icon integrated inside input field
- ✅ Sortable column headers (click to sort, standard UX pattern)
- ✅ Removed sort dropdowns from filter bar (moved to table headers)
- ✅ Conditional "× Limpar" button (only shows when filters active)
- ✅ Absolute positioned Add button (separate row, right-aligned)
- ✅ Responsive behavior (mobile text truncation, wrapping on small screens)
- ✅ Accessibility enhancements (aria-labels, focus states with ring)

**Files Modified**:
- `app/projetos/components/ContractsTab.tsx` - Projetos/Contratos
- `app/receivables/page.tsx` - Recebíveis
- `app/expenses/page.tsx` - Despesas

**UX Pattern Established**:
```
┌──────────────────────────────────────────────┐
│                    [+ Adicionar Button]      │  40px
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ [🔍 Search] [Filter ▼] [Filter ▼] [× Limpar]│  50px
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ [Sortable Column Headers with ↑/↓ icons]    │
│ Table data rows...                           │
└──────────────────────────────────────────────┘
```

**Sortable Columns**:
- Projetos: Cliente/Projeto, Valor, Status, Data, Categoria
- Recebíveis: Valor, Status, Data Prevista, Categoria
- Despesas: Descrição, Valor, Status, Vencimento, Categoria

**Benefits**:
- 60-70% reduction in filter bar height
- Industry-standard sortable columns (Gmail/Airtable pattern)
- Cleaner visual hierarchy (less chrome, more content)
- Better mobile experience (fewer controls to wrap)
- Consistent UX across all entity tabs

---

### ✅ **Recurring Expenses UX Improvements - COMPLETE** (2025-10-07)

**Goal**: Fix critical UX bugs in recurring expense editing and ensure consistent, reliable frequency management

**What Was Completed**:

1. ✅ **Unified Expense Form Modal**
   - Before: Different modals for create vs edit (inconsistent UX)
   - After: Single unified form handles all cases (create, edit non-recurring, edit recurring)
   - Checkbox always visible (enabled for create/edit non-recurring, disabled when editing recurring)
   - Clear scope info banner when editing recurring expenses
   - File: `app/components/forms/ExpenseForm.tsx`

2. ✅ **Fixed Intervalo Field Behavior**
   - Problem: Number field affected by scroll wheel (accidental value changes)
   - Solution: Changed to `type="text"` with numeric validation
   - Added `onWheel blur` to prevent scroll changes
   - CSS hides spinner arrows for cleaner UI
   - Allows proper deletion (empty string) with blur validation
   - Applied to: Intervalo, Máximo de Ocorrências fields

3. ✅ **Frequency Change Logic - Simple CRUD Approach**
   - Problem: Frequency/interval changes didn't persist for future expenses
   - Solution: Delete + Recreate pattern using existing CRUD endpoints
   - Step 1: Delete future/all expenses via `/api/expenses/[id]/recurring-action`
   - Step 2: Create new RecurringExpense with new parameters
   - No cron jobs, no complexity - just clean CRUD operations

4. ✅ **Fixed Duplication and Start Date Issues**
   - **scope="all"**: Preserves original start date (Oct → Oct with new frequency)
   - **scope="future"**: Starts from current expense date (edit Dec → new series starts Dec)
   - No duplicate entries
   - Correct date calculations for all frequency types (weekly, monthly, quarterly, annual)

5. ✅ **Removed "Tipo" Field**
   - Removed unused expense type selector from form
   - Simplified form UI
   - Default to 'operational' type in backend

**Example User Flow**:
- User has monthly recurring expense (Oct, Nov, Dec, Jan...)
- Edits December installment + future, changes to bi-monthly
- System deletes Dec, Jan, Feb, Mar...
- Creates new series starting Dec with interval=2
- Result: Oct, Nov (old monthly), Dec, Feb, Apr... (new bi-monthly)
- ✅ No duplication, correct dates, predictable behavior

**Technical Implementation**:
- **Files Modified**:
  - `app/components/forms/ExpenseForm.tsx` (unified form logic)
  - `app/expenses/page.tsx` (delete + create flow)
- **Build**: ✅ Successful (4.0s compile time)
- **TypeScript**: ✅ Zero errors
- **Testing**: ✅ Verified all scopes (this, future, all)

**UX Improvements Achieved**:
- **Consistency**: Same modal for all expense operations
- **Safety**: Clear scope info banners prevent confusion
- **Predictability**: No accidental scroll changes
- **Reliability**: Frequency changes always work correctly
- **Simplicity**: Delete + Create is easy to understand and debug

**Documentation Updated**:
- ✅ ADR-014: Added "Recurring Expenses UX Improvements" section
- ✅ BACKLOG.md: Added to DONE with implementation details

---

### ✅ **Projetos Tab Restructuring - COMPLETE** (2025-10-06)

**Goal**: Flatten tab hierarchy and enable business-specific terminology

**What Was Completed**:

1. ✅ **Flattened Navigation Hierarchy**
   - Before: `[Dashboard] [Projetos ▼] → [Contratos | Recebíveis | Despesas]` (nested, 2 clicks)
   - After: `[Dashboard] [📋 Projetos] [💰 Recebíveis] [💸 Despesas] [🤖 Assistente IA]` (flat, 1 click)
   - Eliminated confusing "Projetos > Contratos" nesting
   - 50% faster navigation (one click instead of two)

2. ✅ **Created Portuguese Route Aliases**
   - `/recebiveis` → alias to `/receivables`
   - `/despesas` → alias to `/expenses`
   - `/projetos` → simplified to show contracts directly

3. ✅ **Updated NavBar** (app/components/NavBar.tsx)
   - Added 3 new tabs (Projetos, Recebíveis, Despesas)
   - Removed dropdown/sub-tab logic
   - Mobile responsive (no dropdowns needed)

4. ✅ **Simplified /projetos Page** (app/projetos/page.tsx)
   - Removed sub-tab navigation component
   - Shows ContractsTab directly
   - Added Suspense boundary for useSearchParams()

5. ✅ **Created Compact Filter Component** (app/components/CompactFilters.tsx)
   - Single-row design with inline search + filters
   - Auto-submit with 300ms debounce (no manual button)
   - Reusable props: searchQuery, filters, options, show* flags
   - Saves ~70-120px vertical space vs old multi-row design
   - **Note**: Component created but not yet integrated (can be follow-up)

6. ✅ **Implemented Configurable Business Terminology** (lib/terminology.ts)
   - Environment variable POC: `NEXT_PUBLIC_BUSINESS_TYPE`
   - Industry presets:
     - `architecture`: "Projetos", "Recebíveis", "Despesas" (default)
     - `medical`: "Pacientes", "Honorários", "Custos"
     - `construction`: "Obras", "Recebimentos", "Despesas"
     - `law`: "Casos", "Honorários", "Despesas"
   - Navigation labels automatically adapt
   - Foundation for future team-level configuration

**Technical Implementation**:
- **Files Created**:
  - `app/recebiveis/page.tsx` (alias)
  - `app/despesas/page.tsx` (alias)
  - `app/components/CompactFilters.tsx` (reusable component)
  - `lib/terminology.ts` (industry presets)
- **Files Modified**:
  - `app/components/NavBar.tsx` (5 flat tabs, terminology integration)
  - `app/projetos/page.tsx` (simplified, Suspense wrapper)
- **Build Status**: ✅ Successful, zero errors

**Results**:
- **Navigation**: 50% faster (one click vs two)
- **Clarity**: No more "Projetos > Contratos" confusion
- **Multi-industry**: Same codebase serves architecture, medical, construction, law
- **Mobile UX**: No dropdown menus, all tabs visible
- **Scalability**: Foundation for team-level terminology configuration

**Time**: ~3 hours (faster than 6-10h estimate, filter integration deferred)
**Risk**: MEDIUM ✅ No issues, muscle memory shift minimal
**Impact**: HIGH - Better information architecture, multi-industry scalability

---

### ✅ **Assistente IA Tab Improvements - COMPLETE** (2025-10-06)

**Goal**: Simplify and humanize AI assistant interface for non-technical users

**What Was Completed**:

1. ✅ **Removed Page Title** (app/ai-chat/enhanced-page.tsx:127)
   - Deleted: "🤖 Assistente IA" h1 header
   - Saved: ~80px vertical space (tabs are self-explanatory)

2. ✅ **Consolidated Tabs** (app/ai-chat/enhanced-page.tsx)
   - Deleted: "Chat Inteligente" tab (💬 Chat Inteligente)
   - Deleted: "Comandos" tab (🎯 Comandos)
   - Renamed: "IA Unificado" → "🤖 Arnaldo AI"
   - Reduced from 4 tabs → 2 tabs (50% reduction in navigation complexity)

3. ✅ **Humanized Agent with Prominent Greeting** (app/ai-chat/enhanced-page.tsx:159-164)
   - Tab label: "🤖 Arnaldo AI" (clear it's AI, but friendly)
   - Greeting (separate line): "Olá, sou Arnaldo, seu assistente financeiro 👋"
   - Personal name builds trust and connection

4. ✅ **Compact Messaging with CRUD Examples** (app/ai-chat/enhanced-page.tsx:159-164)
   - Before: Technical info box with bullet points (~10+ lines, 250px vertical space)
   - After: Single-paragraph blue box (~3 lines, 60px vertical space)
   - Inline examples: "Faça perguntas sobre suas finanças ("Quanto faturei em setembro?"), adicione novos projetos, despesas e recebíveis ("recebi 500 reais do projeto João e Maria", "salário Pedro R$5k todo dia 5") ou atualize/delete-os ("aumentar o salário do Pedro para 5500 a partir de Janeiro")."
   - Shows comprehensive CRUD capabilities with realistic scenarios
   - Saved: ~190px vertical space

5. ✅ **Simplified Setup Assistant** (app/ai-chat/enhanced-page.tsx:223-228)
   - Blue box consistency (both tabs use bg-blue-50)
   - Accurate time estimate: "Leva alguns segundos ou minutos dependendo do tamanho do arquivo"
   - Changed "e" → "ou" (despesas ou recebíveis - clearer)
   - Removed legacy blue box from MultiFileSetupAssistant.tsx (no duplication)

6. ✅ **Removed "Voltar ao início" Button** (app/ai-chat/enhanced-page.tsx:126)
   - Input field now full width, cleaner interface

7. ✅ **Simplified Empty Chat State** (app/ai-chat/enhanced-page.tsx:171-173)
   - Before: "👋 Olá! Como posso ajudá-lo hoje? Converse naturalmente comigo..."
   - After: "Converse naturalmente comigo sobre suas finanças. Posso responder perguntas ou fazer ações por você."
   - More concise and direct

**Technical Implementation**:
- **Files Modified**:
  - `app/ai-chat/enhanced-page.tsx`: 1,196 → 236 lines (**80% code reduction**)
  - `app/components/setup-assistant/MultiFileSetupAssistant.tsx`: Removed legacy info box
- **Build Status**: ✅ Compiled successfully, zero errors

**Results** (After user feedback iterations):
- **Space efficiency**: ~270px vertical space saved (removed title + compact messaging)
- **Navigation**: 2 tabs vs 4 tabs (50% reduction)
- **Personality**: "🤖 Arnaldo AI" with friendly greeting vs generic "IA Unificado"
- **Comprehension**: Realistic inline CRUD examples vs technical routing explanations
- **Consistency**: Blue boxes on both tabs (engaging, brand-aligned)
- **Accuracy**: Time estimate reflects file size ("segundos ou minutos dependendo do tamanho")
- **Mobile-friendly**: Full-width input, compact messaging

**User Feedback Integration**:
1. ✅ Greeting prominence: Separated to own line with 👋 emoji
2. ✅ Example variety: Added create/update/delete scenarios
3. ✅ Time accuracy: Reflects file size dependency
4. ✅ Visual consistency: All info boxes use blue theme
5. ✅ No duplication: Removed redundant box from MultiFileSetupAssistant

**Time**: ~1 hour (faster than 2-3h estimate)
**Risk**: LOW ✅ No issues
**Impact**: HIGH - Immediate user-facing improvement, much more approachable for non-technical users

---

### ✅ **Dashboard Phase 1: Quick Wins - UI Improvements COMPLETE** (2025-10-04)

**Goal**: Improve dashboard metrics clarity and actionability (ADR-014 Phase 1)

**What Was Completed**:

1. ✅ **Active Contracts Display** (app/page.tsx:491)
   - Changed from: `5/10 contratos` → `5 contratos ativos`
   - Shows only active count (total contracts removed as noise)

2. ✅ **90-Day Focus for Pending Amounts** (app/api/dashboard/route.ts:70-76, app/page.tsx:500-506)
   - Changed labels: "A Receber/Pagar (Pendente)" → "(próximos 90 dias)"
   - Backend filter: Only includes items due within next 90 days
   - Actionable horizon: 90 days vs irrelevant 5-year view

3. ✅ **Split Overdue Items by Type** (app/page.tsx:515-596, app/api/dashboard/route.ts:154-155)
   - Replaced single "Itens em Atraso" block with two separate blocks:
     - "Recebimentos Atrasados" (amber styling) + total amount
     - "Pagamentos Atrasados" (red styling) + total amount
   - Shows top 3 items per type with overflow counter
   - Clear visual separation for different actions (chase vs pay)

4. ✅ **Subtitle Update** (app/page.tsx:629)
   - Changed: "Pagamentos programados" → "Pagamentos a fazer"
   - More natural Brazilian Portuguese

**Technical Implementation**:
- Backend: Added `next90Days` date filtering, `overdueReceivablesAmount`, `overdueExpensesAmount` metrics
- Frontend: Updated `DashboardData` interface, split overdue UI into grid layout
- Build: ✅ Compiled successfully, zero regressions

**Results**:
- Clearer metrics labels and context
- Better visual hierarchy (separate colors for receivables vs expenses)
- Actionable time horizon (90 days)
- Improved Brazilian Portuguese phrasing

**Time**: ~2 hours (as estimated)
**See**: ADR-014 for full dashboard strategy (Phases 2-4 pending)

---

*[Additional historical items continue here...]*
*[All items from BACKLOG.md DONE section prior to 2025-10-08 should be moved here]*

---

**Maintenance Instructions**:
When you complete a new epic and add it to the DONE section in BACKLOG.md, follow these steps:
1. Move the PREVIOUS latest DONE item from BACKLOG.md to this file (at the top, maintaining reverse chronological order)
2. Keep ONLY the newest DONE epic in BACKLOG.md
3. This keeps BACKLOG.md concise for LLM agent contextualization while preserving historical record
