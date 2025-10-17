---
title: "ADR-017: Chat-First Onboarding Redesign"
type: "decision"
audience: ["developer", "agent", "designer"]
contexts: ["onboarding", "ux", "chat-interface", "user-experience", "ai-assistant", "setup-assistant"]
complexity: "advanced"
last_updated: "2025-10-17"
version: "1.0"
status: "proposed"
decision_date: "2025-10-17"
agent_roles: ["ux-developer", "onboarding-specialist", "chat-interface-developer"]
related:
  - decisions/016-setup-assistant-simple-extraction-attempt.md
  - decisions/008-ai-agent-strategy.md
dependencies: ["setup-assistant-v2", "global-chat", "claude-api", "streaming-messages"]
---

# ADR-017: Chat-First Onboarding Redesign

## Context for LLM Agents

**Scope**: Complete redesign of user onboarding flow to prioritize conversational AI-first experience with smooth transition to dashboard. This ADR covers the full user journey from registration through first dashboard interaction.

**Prerequisites**: Understanding of:
- SetupAssistantService architecture (file upload and extraction)
- Global Chat system (floating chat component)
- Streaming message UI patterns
- React state management and animations
- User registration and authentication flow

**Key Patterns**:
- **Chat-first philosophy**: Introduce Arnaldo (AI assistant) as primary interaction method from day 1
- **Educational onboarding**: Each step teaches users how to use the platform while collecting data
- **Progressive disclosure**: Start simple (file upload), gradually reveal capabilities
- **Visual continuity**: Onboarding chat morphs into floating chat to show persistence
- **Chip-based navigation**: Guided conversation flow with button responses (not open chat)

---

## Status

**Status**: Proposed
**Date**: 2025-10-17
**Decision Makers**: Product Team, Development Team
**Context**: Current onboarding is functional but doesn't showcase AI-first platform nature. Users with existing spreadsheets need faster, more intuitive onboarding.

---

## Context

### Problem Statement

**Current Onboarding Limitations:**
1. **Doesn't showcase AI capabilities**: Users manually fill forms, don't experience Arnaldo until later
2. **Multiple disconnected steps**: Registration → Form fill → File upload feel like separate tools
3. **No education**: Users don't learn how to use chat/AI features during onboarding
4. **Abrupt transition**: Suddenly redirected to dashboard with no connection to setup process
5. **Not optimized for primary use case**: Users with existing spreadsheets (80%+ of new users)

**User Journey Pain Points:**
- "Where did my setup go?" - Onboarding chat disappears after completion
- "How do I add more data?" - Don't understand Arnaldo is always available
- "Is this AI-powered?" - AI capabilities not evident during onboarding

### Current State

**Existing Onboarding Flow:**
```
1. Registration form → Email/password
2. Redirect to /onboarding → Multi-step wizard
3. Step 1: Welcome message
4. Step 2: File upload (optional)
5. Step 3: Processing → Results
6. Auto-redirect to dashboard (3 second timer)
```

**Problems:**
- Form-based, not conversational
- No connection between onboarding and persistent chat
- Users don't understand Arnaldo's ongoing availability
- File upload feels like one-time import tool

### Requirements

**Functional Requirements:**
1. User registration and auto-login flow
2. Basic user profile collection (business type, size, revenue tier)
3. File upload with multiple file support
4. Entity extraction and creation (contracts, receivables, expenses)
5. Smooth transition to dashboard showing chat persistence

**Non-Functional Requirements:**
1. **Educational**: User learns platform capabilities during onboarding
2. **Fast**: Optimized for users with existing data (primary use case)
3. **Engaging**: Conversational, friendly, human-like interaction
4. **Discoverable**: Chat persistence and availability made obvious
5. **Accessible**: Works on mobile and desktop
6. **Scalable**: Foundation for future onboarding enhancements

**User Experience Goals:**
- First impression: "This is an AI-first platform"
- Mental model: "Arnaldo is always here to help"
- Confidence: "I know how to use this platform"
- Delight: Smooth animations and thoughtful UX details

---

## Decision

### What We Decided

**Redesign onboarding as a chat-first, educational conversation flow** that introduces users to Arnaldo (AI assistant) from the start and creates mental model of persistent AI availability through visual transition animation.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Registration                                       │
│ - Standard form (email/password)                            │
│ - Auto-login after successful registration                  │
│ - Redirect to /onboarding (new chat-based flow)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Profile Collection (Chat Interface)               │
│ - "Olá! Sou Arnaldo, seu assistente financeiro 👋"         │
│ - Chip buttons for business type selection                 │
│ - Chip buttons for business size tier                      │
│ - Chip buttons for revenue tier                            │
│ - Conversational, friendly tone throughout                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: File Upload (Chat Interface)                      │
│ - "Controla seus projetos, recebíveis e despesas em        │
│    alguma planilha?" [Sim] [Não]                           │
│ - If Yes: Show file upload interface                       │
│ - Process file → Show entity counts                        │
│ - "Tem outros arquivos?" [Sim] [Não]                       │
│ - Loop until user says "Não"                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: Education (Streaming Messages)                    │
│ - Streaming: "Se precisar de mim para criar ou editar      │
│   contratos, recebíveis ou despesas, estarei logo aqui."   │
│ - [Ok] button or auto-advance after 3s                     │
│ - Streaming: "Ah, e pode contar comigo para responder      │
│   perguntas sobre seus projetos ou finanças"               │
│ - [Continuar] button                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: Transition Animation                              │
│ - Onboarding chat container shrinks and moves to           │
│   bottom-right corner                                       │
│ - Transforms into floating chat FAB                        │
│ - Dashboard fades in behind/around the morphing chat       │
│ - Final state: Dashboard visible + floating chat ready     │
│ - User clearly sees "Ah! The chat is always here!"         │
└─────────────────────────────────────────────────────────────┘
```

### Rationale

**Why This Approach:**

1. **Showcases AI-first nature immediately**: User meets Arnaldo in first 10 seconds
2. **Educational by design**: Each step teaches platform capabilities while collecting data
3. **Optimized for primary use case**: File upload is central, not hidden in Step 2
4. **Creates mental model**: Transition animation shows chat persistence
5. **Reduces friction**: Chip buttons faster than typing, guided conversation
6. **Builds trust**: Friendly conversation vs. intimidating forms
7. **Mobile-friendly**: Chat interface works great on all devices
8. **Scalable**: Easy to add new onboarding steps or questions

**Key Design Decisions:**

- **Chip buttons instead of open chat**: Guided flow prevents confusion, ensures data quality
- **Streaming messages**: Creates human-like interaction, holds attention
- **Multiple file upload loop**: Accommodates users with scattered data
- **Transition animation**: Critical for connecting onboarding to persistent chat
- **Dashboard reveal timing**: After education, so users understand capabilities first

---

## Alternatives Considered

### Option 1: Keep Current Multi-Step Wizard
- **Description**: Improve existing form-based onboarding, add AI chat later
- **Pros**: Less development effort, familiar pattern
- **Cons**: Doesn't showcase AI-first platform, users don't learn chat capabilities, disconnected experience
- **Why Not Chosen**: Doesn't solve core problem - users need to experience AI from start

### Option 2: Pure Open Chat Onboarding
- **Description**: Completely free-form conversation, no chip buttons
- **Pros**: Most AI-native experience, ultimate flexibility
- **Cons**: Too open-ended for onboarding, data quality issues, users may get lost, high error handling complexity
- **Why Not Chosen**: Too risky for first-time users, chip buttons provide necessary guardrails

### Option 3: Skip Profile Collection
- **Description**: Go straight to file upload, collect profile data later
- **Pros**: Faster to value, less friction upfront
- **Cons**: Loses opportunity to personalize experience, no business context for future features
- **Why Not Chosen**: Profile data enables future personalization (industry-specific features, benchmarks)

### Option 4: Instant Dashboard After File Upload
- **Description**: Skip education phase, show dashboard immediately
- **Pros**: Faster onboarding, less waiting
- **Cons**: Users don't learn how to use platform, miss opportunity to showcase capabilities, abrupt transition
- **Why Not Chosen**: Education phase is crucial for user success and retention

---

## Implementation

### Phase 1: Registration Auto-Login to Existing Onboarding (1 day)

**Scope**: Seamless entry to existing onboarding flow (no changes to onboarding yet).

**Incremental Strategy**: Connect registration to existing onboarding first, then enhance onboarding incrementally.

**Changes Needed:**
1. Update registration API to create session after successful signup
2. Auto-login after registration success
3. Redirect to existing `/onboarding` (unchanged) instead of `/login`
4. Handle edge cases (email already exists, validation errors)

**Files to Modify:**
- `app/api/auth/register/route.ts` - Add auto-login logic
- `app/register/page.tsx` - Handle redirect to onboarding

**Acceptance Criteria:**
- ✅ User registers → automatically logged in
- ✅ Redirects to existing `/onboarding` welcome screen
- ✅ Session persists across redirect
- ✅ Error handling for duplicate emails
- ✅ Existing onboarding flow unchanged (validates incremental approach)

---

### Phase 2: Convert Step 2 (Setup Screen) to Chat Interface (2-3 days)

**Scope**: Replace Step 2 profile form with chat interface using chip buttons.

**Incremental Strategy**: Transform only Step 2 of existing onboarding, keep rest of flow intact.

**UI Components to Create:**
```typescript
// OnboardingChatContainer.tsx - Main chat wrapper
interface OnboardingChatContainerProps {
  children: React.ReactNode
}

// ChipButtons.tsx - Reusable guided response buttons
interface ChipButtonsProps {
  options: Array<{ label: string; value: string }>
  onSelect: (value: string) => void
}

// ProfileQuestion interface
interface ProfileQuestion {
  question: string
  field: 'businessType' | 'businessSize' | 'revenueRange'
  options: Array<{ label: string; value: string }>
}

const profileQuestions: ProfileQuestion[] = [
  {
    question: "Você é um profissional individual ou tem uma empresa?",
    field: 'businessType',
    options: [
      { label: "Profissional Individual", value: "individual" },
      { label: "Pequena Empresa", value: "small_business" }
    ]
  },
  {
    question: "Qual o porte do seu negócio?",
    field: 'businessSize',
    options: [
      { label: "1-5 pessoas", value: "1-5" },
      { label: "6-20 pessoas", value: "6-20" },
      { label: "20+ pessoas", value: "20+" }
    ]
  },
  {
    question: "Faixa de faturamento mensal?",
    field: 'revenueRange',
    options: [
      { label: "Até R$ 50k", value: "0-50k" },
      { label: "R$ 50k - R$ 200k", value: "50k-200k" },
      { label: "R$ 200k+", value: "200k+" }
    ]
  }
]
```

**Chat Message Types:**
```typescript
interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp: Date
  type: 'text' | 'chip-response'
  chipOptions?: Array<{ label: string; value: string }>
}
```

**Database Schema:**
```prisma
model UserProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  businessType  String?  // 'individual' | 'small_business'
  businessSize  String?  // '1-5' | '6-20' | '20+'
  revenueRange  String?  // '0-50k' | '50k-200k' | '200k+'
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Files to Modify/Create:**
- **Modify**: `app/onboarding/page.tsx` - Replace Step 2 with chat interface
- **New**: `app/components/onboarding/OnboardingChatContainer.tsx` - Chat wrapper
- **New**: `app/components/onboarding/ChipButtons.tsx` - Reusable chip button component
- **New**: `app/api/user-profile/route.ts` - Save profile data
- **Schema**: `prisma/schema.prisma` - Add UserProfile model
- **New**: `prisma/migrations/xxx_add_user_profile.sql` - Database migration

**Acceptance Criteria:**
- ✅ Step 1 (Welcome) unchanged - shows existing welcome screen
- ✅ Step 2 replaced with chat interface
- ✅ Arnaldo introduces himself: "Olá! Sou Arnaldo, seu assistente financeiro 👋"
- ✅ Three questions asked in sequence with chip button responses
- ✅ User selections saved to database
- ✅ After questions → proceeds to existing file upload screen (Step 3)
- ✅ Smooth transitions between questions
- ✅ Responsive design (mobile + desktop)

---

### Phase 3: Integrate File Upload in Chat Interface (2-3 days)

**Scope**: Bring file upload into chat conversation, reuse existing components.

**Incremental Strategy**: Reuse existing `MultiFileSetupAssistant` drop zone, integrate into chat flow.

**UI Flow:**
```typescript
interface FileUploadChatStepProps {
  onComplete: (results: UploadResults[]) => void
}

interface UploadResults {
  filename: string
  contracts: number
  receivables: number
  expenses: number
  success: boolean
}
```

**Conversation Flow (Reuses Existing Components):**
```
[After profile questions in chat]

Arnaldo: "Controla seus projetos, recebíveis e despesas em alguma planilha?"
User: [Sim] [Não]

IF Sim:
  → Show existing "Arraste múltiplos arquivos..." upload zone in chat
  → User uploads file(s) using existing MultiFileSetupAssistant
  → Processing with existing rotating messages
  → Results shown in chat: "Encontrei 37 contratos, 120 recebíveis e 45 despesas!"

  Arnaldo: "Tem outros arquivos para importar?"
  User: [Sim, tenho mais] [Não, estou pronto(a)]

  IF "Sim, tenho mais":
    → Show upload zone again (loop)

  IF "Não, estou pronto(a)":
    → Continue to education phase

IF Não (from first question):
  → Continue to education phase (skip upload)
```

**Processing Messages (Rotating):**
```typescript
const processingMessages = [
  "Analisando a estrutura do arquivo...",
  "Identificando contratos e projetos...",
  "Extraindo recebíveis...",
  "Processando despesas...",
  "Organizando os dados..."
]
```

**Files to Modify:**
- **Modify**: `app/onboarding/page.tsx` - Integrate upload into chat flow
- **Reuse**: `app/components/setup-assistant/MultiFileSetupAssistant.tsx` - Existing drop zone
- **New**: Minimal wrapper to show upload zone in chat context (if needed)

**Acceptance Criteria:**
- ✅ Clear question about spreadsheet management
- ✅ Reuses existing "Arraste múltiplos arquivos..." upload component
- ✅ File upload zone appears in chat only when user says "Sim"
- ✅ Processing shows existing rotating messages
- ✅ Success message shows entity counts in chat
- ✅ Multi-file loop works: "Tem outros arquivos?" → [Sim] loops, [Não] continues
- ✅ Can skip file upload entirely by clicking [Não] on first question

---

### Phase 4: Education Messages (1-2 days)

**Scope**: Streaming messages that teach users about platform capabilities.

**Incremental Strategy**: Add education step after file upload completes or is skipped.

**Streaming Message Implementation:**
```typescript
interface StreamingMessageProps {
  content: string
  speed?: number // characters per interval
  interval?: number // milliseconds between characters
  onComplete?: () => void
}

const StreamingMessage: React.FC<StreamingMessageProps> = ({
  content,
  speed = 2,
  interval = 30,
  onComplete
}) => {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    let currentIndex = 0
    const timer = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedText(content.slice(0, currentIndex + speed))
        currentIndex += speed
      } else {
        setIsComplete(true)
        clearInterval(timer)
        onComplete?.()
      }
    }, interval)

    return () => clearInterval(timer)
  }, [content, speed, interval, onComplete])

  return (
    <div className="streaming-message">
      {displayedText}
      {!isComplete && <span className="cursor-blink">|</span>}
    </div>
  )
}
```

**Message Sequence:**
```typescript
const educationMessages = [
  {
    content: "Se precisar de mim para criar ou editar contratos, recebíveis ou despesas, estarei logo aqui.",
    buttonLabel: "Ok",
    autoAdvanceDelay: 3000 // Auto-advance after 3s if no click
  },
  {
    content: "Ah, e pode contar comigo para responder perguntas sobre seus projetos ou finanças",
    buttonLabel: "Continuar",
    autoAdvanceDelay: null // Wait for user click
  }
]
```

**Files to Create:**
- `app/components/onboarding/StreamingMessage.tsx`
- `app/components/onboarding/EducationPhase.tsx`

**Acceptance Criteria:**
- ✅ Messages appear letter-by-letter at readable speed
- ✅ Cursor blink animation during streaming
- ✅ First message auto-advances after 3 seconds OR button click
- ✅ Second message waits for user click
- ✅ Smooth transitions between messages

---

### Phase 5: Transition Animation (3-4 days)

**Scope**: Visual morphing of onboarding chat into floating chat, revealing dashboard.

**Animation Strategy:**

```typescript
// useOnboardingTransition.ts
interface TransitionState {
  phase: 'onboarding' | 'shrinking' | 'morphing' | 'complete'
  progress: number // 0-1
}

const useOnboardingTransition = () => {
  const [state, setState] = useState<TransitionState>({
    phase: 'onboarding',
    progress: 0
  })

  const startTransition = async () => {
    // Phase 1: Shrink onboarding chat (500ms)
    setState({ phase: 'shrinking', progress: 0 })
    await animateProgress(500, (progress) => {
      setState({ phase: 'shrinking', progress })
    })

    // Phase 2: Move to bottom-right (700ms)
    setState({ phase: 'morphing', progress: 0 })
    await animateProgress(700, (progress) => {
      setState({ phase: 'morphing', progress })
    })

    // Phase 3: Reveal dashboard (300ms)
    await animateProgress(300, (progress) => {
      setState({ phase: 'complete', progress })
    })

    // Redirect to dashboard
    router.push('/')
  }

  return { state, startTransition }
}
```

**CSS Animation:**
```scss
.onboarding-chat-container {
  &.shrinking {
    animation: shrinkChat 500ms ease-out forwards;
  }

  &.morphing {
    animation: moveToCorner 700ms ease-in-out forwards;
  }
}

@keyframes shrinkChat {
  from {
    width: 600px;
    height: 800px;
    transform: translate(-50%, -50%);
  }
  to {
    width: 400px;
    height: 600px;
    transform: translate(-50%, -50%);
  }
}

@keyframes moveToCorner {
  from {
    width: 400px;
    height: 600px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  to {
    width: 60px;
    height: 60px;
    top: auto;
    bottom: 24px;
    right: 24px;
    left: auto;
    transform: none;
    border-radius: 50%;
  }
}
```

**Dashboard Reveal:**
```typescript
// Fade in dashboard content behind the morphing chat
<div className={cn(
  "dashboard-content transition-opacity duration-300",
  transitionState.phase === 'complete' ? 'opacity-100' : 'opacity-0'
)}>
  {/* Existing dashboard content */}
</div>
```

**Files to Modify:**
- `app/onboarding/page.tsx` - Add transition logic
- `app/page.tsx` - Handle transition entry state
- `app/components/chat/GlobalChat.tsx` - Coordinate with transition
- `app/components/onboarding/OnboardingTransition.tsx` - New component

**Acceptance Criteria:**
- ✅ Smooth shrinking animation (no jank)
- ✅ Chat moves from center to bottom-right corner
- ✅ Dashboard fades in smoothly
- ✅ Final state matches floating chat appearance
- ✅ User clearly sees continuity between onboarding and persistent chat
- ✅ Works on mobile and desktop

---

### Phase 6: Polish & Testing (2-3 days)

**Scope**: Refinements, error handling, edge cases, and user testing.

**Testing Scenarios:**
1. Happy path: Complete onboarding with file upload
2. Skip file upload: User selects "Não" for spreadsheet
3. Multiple files: Upload 3-5 files in sequence
4. File upload failure: Handle network errors gracefully
5. Mobile experience: Test all animations on mobile devices
6. Slow connections: Ensure loading states are clear
7. Browser compatibility: Test animations on Safari, Firefox, Chrome
8. Keyboard navigation: Ensure accessibility

**Error Handling:**
- File upload fails → Friendly message + retry option
- Profile save fails → Auto-retry + fallback to dashboard
- Animation performance issues → Fallback to instant transition

**Performance Optimization:**
- Preload dashboard components during education phase
- Use CSS transforms for animations (GPU acceleration)
- Debounce streaming message intervals on slow devices

**Accessibility:**
- ARIA labels for all interactive elements
- Keyboard navigation for chip buttons
- Screen reader announcements for streaming messages
- Reduced motion preferences support

**Files to Create:**
- `cypress/e2e/onboarding-flow.cy.ts` - E2E tests
- `app/components/onboarding/__tests__/` - Unit tests

**Acceptance Criteria:**
- ✅ All happy path scenarios work smoothly
- ✅ Error handling graceful and user-friendly
- ✅ Animations smooth on mobile and desktop
- ✅ Accessibility compliance (keyboard + screen readers)
- ✅ Performance metrics acceptable (transition < 2 seconds total)

---

## Migration Strategy

### Rollout Plan

**Phase 1: Feature Flag (Week 1)**
- Deploy behind feature flag `ENABLE_NEW_ONBOARDING`
- Internal team testing
- Collect feedback and iterate

**Phase 2: Beta Users (Week 2)**
- Invite 10-20 beta users to test new flow
- A/B test: 50% old flow, 50% new flow
- Monitor completion rates and time-to-completion
- Collect qualitative feedback

**Phase 3: Gradual Rollout (Week 3-4)**
- Roll out to 25% of new users
- Monitor metrics: completion rate, time, drop-off points
- Increase to 50%, then 75%, then 100%
- Keep old flow as fallback for 30 days

**Phase 4: Full Deployment (Week 5)**
- All new users see new onboarding
- Remove old onboarding code
- Update documentation and support materials

### Backwards Compatibility

**Existing Users:**
- No changes to existing users who already completed onboarding
- UserProfile table has nullable fields for legacy users
- Dashboard remains unchanged

**Old Onboarding Flow:**
- Keep `/onboarding-legacy` route as backup
- Feature flag can revert to old flow if critical issues found

### Rollback Plan

**If Major Issues Found:**
1. Flip feature flag → revert to old onboarding
2. Investigate and fix issues in development
3. Redeploy with fixes
4. Resume gradual rollout

**Criteria for Rollback:**
- Completion rate drops below 70% (vs 85% baseline)
- Critical bugs preventing onboarding completion
- Negative user feedback exceeds 30%

---

## Timeline

**Total Estimated Time: 15-20 days**

| Phase | Tasks | Duration | Owner |
|-------|-------|----------|-------|
| Phase 1 | Registration & Auto-Login | 1-2 days | Backend Team |
| Phase 2 | Profile Collection Chat | 3-4 days | Frontend + Backend |
| Phase 3 | File Upload Chat Flow | 4-5 days | Full Stack |
| Phase 4 | Education Phase | 2-3 days | Frontend Team |
| Phase 5 | Transition Animation | 3-4 days | Frontend Team |
| Phase 6 | Polish & Testing | 2-3 days | Full Team |

**Key Milestones:**
- Day 5: Profile collection working
- Day 10: File upload integration complete
- Day 15: Transition animation working
- Day 20: Beta testing complete, ready for rollout

---

## Consequences

### Positive Consequences

**User Experience:**
- ✅ Immediate exposure to AI-first platform philosophy
- ✅ Faster onboarding for users with existing data (primary use case)
- ✅ Better education on platform capabilities
- ✅ Clear mental model of persistent chat availability
- ✅ More engaging and memorable first impression
- ✅ Reduced cognitive load (chip buttons vs. forms)

**Business Metrics:**
- ✅ Expected 15-20% improvement in onboarding completion rate
- ✅ Reduced time-to-first-value (faster file upload)
- ✅ Better user retention (understand how to use platform)
- ✅ Clearer product differentiation (AI-first positioning)
- ✅ Foundation for future onboarding personalization

**Technical Benefits:**
- ✅ Reusable chat components for other flows
- ✅ Scalable conversation framework
- ✅ Clear separation of concerns (profile, upload, education, transition)
- ✅ Better analytics tracking (granular step completion)

### Negative Consequences

**Development Effort:**
- ⚠️ 15-20 days of development time (vs. 2-3 days for incremental improvements)
- ⚠️ New components and patterns to maintain
- ⚠️ Complex animation logic requiring careful testing

**User Learning Curve:**
- ⚠️ Some users may prefer traditional forms (estimated <5%)
- ⚠️ Chip buttons less flexible than open input (intentional trade-off)
- ⚠️ Streaming messages may feel slow to power users (can be skipped)

**Technical Debt:**
- ⚠️ Animation complexity may cause issues on low-end devices
- ⚠️ Need to maintain both old and new flow during transition period
- ⚠️ Additional state management complexity

### Risks and Mitigation

**Risk 1: Animation Performance Issues**
- **Impact**: Jank or lag on mobile devices
- **Probability**: Medium
- **Mitigation**:
  - Use CSS transforms and GPU acceleration
  - Test on low-end devices early
  - Fallback to instant transition if performance detected
  - Respect reduced-motion preferences

**Risk 2: Lower Completion Rate**
- **Impact**: Fewer users complete onboarding
- **Probability**: Low-Medium
- **Mitigation**:
  - A/B test before full rollout
  - Feature flag for easy rollback
  - Clear skip options at each step
  - Monitor analytics closely

**Risk 3: File Upload Failures**
- **Impact**: Users can't import existing data
- **Probability**: Low
- **Mitigation**:
  - Robust error handling and retry logic
  - Clear error messages with support contact
  - Option to skip and add data later
  - Existing SetupAssistant already proven reliable

**Risk 4: Users Don't Understand Chat Persistence**
- **Impact**: Transition animation fails to convey message
- **Probability**: Low
- **Mitigation**:
  - User testing to validate animation clarity
  - Add tooltip on first dashboard visit pointing to chat
  - In-app guidance tour as backup
  - Analytics to track chat usage post-onboarding

---

## Validation

### Success Criteria

**Quantitative Metrics:**
- ✅ Onboarding completion rate ≥ 85% (vs. 70% baseline)
- ✅ Total onboarding time < 3 minutes from start to finish
- ✅ Chat usage in first month ≥ 60% of users
- ✅ Multi-file upload adoption ≥ 30% of users
- ✅ Animation completion rate ≥ 95% (no crashes/freezes)

**Qualitative Metrics:**
- ✅ User feedback sentiment ≥ 80% positive
- ✅ Users report understanding chat availability (survey)
- ✅ Support tickets about "how to add data" decrease by 50%
- ✅ Users mention AI/chat in testimonials and feedback

**Technical Metrics:**
- ✅ Transition animation FPS ≥ 30 on mobile
- ✅ Onboarding page load time < 2 seconds
- ✅ Error rate < 2% across all onboarding steps
- ✅ Zero critical bugs blocking completion

### Review Schedule

**Week 1 (Internal Testing)**:
- Daily review of analytics and bug reports
- Iterate on UX based on team feedback

**Week 2-3 (Beta Testing)**:
- Weekly review of completion rates and drop-off points
- User interview sessions (5-10 users)
- Iterate on messaging and UX pain points

**Month 1 (Post-Launch)**:
- Weekly metrics review
- Monthly user survey
- Compare old vs. new flow performance

**Month 3 (Evaluation)**:
- Comprehensive evaluation of success criteria
- Decision on rollout completion or adjustments
- Planning for Phase 2 enhancements

**Quarterly Ongoing**:
- Review metrics trends
- Iterate on messaging based on user feedback
- Consider personalization opportunities

---

## References

### Related Decisions
- [ADR-016: Setup Assistant Two-Phase Extraction](./016-setup-assistant-simple-extraction-attempt.md) - File upload implementation
- [ADR-008: AI Agent Strategy](./008-ai-agent-strategy.md) - AI-first product vision
- [Global Chat Implementation](../features/global-chat.md) - Floating chat component

### Design References
- Intercom onboarding flow - Conversational patterns
- Duolingo onboarding - Gamification and engagement
- Notion setup - Progressive disclosure
- Mercury (banking) - Smooth animations

### Technical Resources
- [Framer Motion](https://www.framer.com/motion/) - Animation library option
- [React Spring](https://www.react-spring.dev/) - Alternative animation library
- [Radix UI](https://www.radix-ui.com/) - Accessible components

### User Research
- User interviews (2025-10): 80% of new users have existing spreadsheets
- Support tickets: "How do I add more data?" (top 3 question)
- Session recordings: Users don't discover chat until week 2-3

---

## Implementation Tracking

**Status Tracking:**

- [ ] **Phase 1: Registration & Auto-Login** (1-2 days)
  - [ ] Update registration API for auto-login
  - [ ] Add redirect to `/onboarding`
  - [ ] Test edge cases
  - [ ] Deploy to staging

- [ ] **Phase 2: Profile Collection Chat** (3-4 days)
  - [ ] Create OnboardingChatContainer
  - [ ] Build ProfileChatStep component
  - [ ] Implement ChipButtons component
  - [ ] Create UserProfile database model
  - [ ] Build API endpoint for profile saving
  - [ ] Test on mobile and desktop

- [ ] **Phase 3: File Upload Chat Flow** (4-5 days)
  - [ ] Build FileUploadChatStep component
  - [ ] Integrate SetupAssistant multi-file API
  - [ ] Add processing messages rotation
  - [ ] Implement multi-file loop logic
  - [ ] Test with various file types and sizes

- [ ] **Phase 4: Education Phase** (2-3 days)
  - [ ] Create StreamingMessage component
  - [ ] Build EducationPhase coordinator
  - [ ] Implement auto-advance logic
  - [ ] Test message timing and UX

- [ ] **Phase 5: Transition Animation** (3-4 days)
  - [ ] Build useOnboardingTransition hook
  - [ ] Implement CSS animations
  - [ ] Coordinate with GlobalChat
  - [ ] Test on multiple devices/browsers
  - [ ] Implement fallback for reduced motion

- [ ] **Phase 6: Polish & Testing** (2-3 days)
  - [ ] E2E tests with Cypress
  - [ ] Unit tests for components
  - [ ] Accessibility audit
  - [ ] Performance optimization
  - [ ] Beta user testing

**Completion Date**: TBD (estimated 15-20 days from start)

---

**Last Updated**: 2025-10-17
**Version**: 1.0
**Status**: Proposed - Awaiting implementation start

*This ADR documents the comprehensive redesign of user onboarding to create an AI-first, educational, and engaging first-time user experience that showcases platform capabilities and creates clear mental models for ongoing usage.*
