---
title: "Operations Agent Incremental Rebuild"
type: "decision"
audience: ["developer", "agent"]
contexts: ["ai-agents", "architecture", "incremental-development", "simplicity"]
complexity: "intermediate"
last_updated: "2025-10-02"
version: "1.0"
status: "active"
decision_date: "2025-10-02"
related:
  - decisions/008-ai-agent-strategy.md
  - decisions/004-no-regrets-architecture-improvements.md
---

# ADR-012: Operations Agent Incremental Rebuild

## Context for LLM Agents

**Scope**: Complete rebuild of Operations Agent using incremental development approach
**Prerequisites**: Understanding of Claude API, service layer architecture, conversation state management
**Key Patterns**:
- Start with absolute minimum viable implementation
- Add one capability at a time
- Test thoroughly before adding next feature
- Trust Claude's capabilities, minimize custom code
- Keep code simple and readable

## Status

**ACCEPTED** - 2025-10-02

**Current Implementation**: Step 1 Complete - Basic conversation with context
**Next Step**: Step 2 - Simple expense creation

## Problem Statement

### What Went Wrong

The Operations Agent had become over-engineered to **2,049 lines of code** with:

❌ **Over-engineering**:
- Manual state machines for conversation tracking
- Fuzzy matching libraries for entity lookup
- Multi-phase intent classification
- Complex query delegation system
- Extensive custom inference logic

❌ **Still Broken**:
- Could not maintain context across multi-turn conversations
- Confirmation workflow was fragile
- Reference resolution ("o primeiro", "esse contrato") unreliable
- Too much code to debug effectively

❌ **Fighting Claude Instead of Trusting It**:
- Built custom date parsing when Claude can do this naturally
- Created fuzzy matching when Claude can query the database
- Implemented state tracking when Claude can use conversation history
- Added intent classification when Claude can understand naturally

### Root Cause Analysis

**Core Mistake**: We tried to control what Claude does instead of giving it context and letting it decide.

**Example of the Problem**:
```typescript
// WRONG: 330 lines of smart-inference.ts
function parseDate(text: string): string {
  if (text === 'ontem') return yesterday()
  if (text === 'hoje') return today()
  if (text === 'amanhã') return tomorrow()
  // ... 300+ more lines
}

// RIGHT: Just ask Claude
const prompt = `Today is ${today}. Extract the date from "${text}"`
```

## Decision

**Rebuild the Operations Agent incrementally from scratch** following these principles:

### Core Principles

1. **Start Extremely Simple** (~45 lines)
   - Prove conversation context works first
   - No CRUD operations until context is solid

2. **Add One Capability at a Time**
   - Each step builds on previous steps
   - Test thoroughly before moving forward
   - Never break what already works

3. **Trust Claude, Not Code**
   - Give Claude full context (conversation, schema, current date)
   - Let Claude make decisions (dates, categories, entities)
   - Minimize custom logic between user and Claude

4. **Keep It Simple**
   - Resist the urge to add "nice to have" features
   - Every line of code must justify its existence
   - If Claude can do it, don't code it

### Implementation Strategy: 10-Step Roadmap

#### ✅ **Step 1: Conversation Context** (COMPLETE - 2025-10-02)

**Goal**: Prove Claude can remember conversation history

**Implementation**: 45 lines total
```typescript
class OperationsAgentService {
  async processCommand(message: string, history: ConversationMessage[] = []) {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: 'Você é um assistente financeiro. Seja amigável e mostre que lembra do contexto.',
      messages: [...history, { role: 'user', content: message }]
    })

    return {
      success: true,
      message: content.text,
      conversationHistory: [...history, userMsg, assistantMsg]
    }
  }
}
```

**What It Has**:
- ✅ Conversation history (all previous messages)
- ✅ Team context (teamId, userId from ServiceContext)
- ✅ Claude Sonnet 4 integration

**What It Does NOT Have** (yet):
- ❌ CRUD operations
- ❌ Database access
- ❌ Entity tracking
- ❌ Confirmations
- ❌ Query Agent integration

**System Prompt**: `"Você é um assistente financeiro. Seja amigável e mostre que lembra do contexto."`

**Testing**: Works in "AI Unificado" tab at `/ai-chat`

**Success Criteria**: ✅
- User can have multi-turn conversation
- Claude remembers previous messages
- No crashes or errors

---

#### 📋 **Step 2: Simple Expense Creation** (NEXT)

**Goal**: Add ability to create expenses from natural language

**What to Add**:
- Enhanced system prompt with database schema for expenses
- ExpenseService integration
- Extract expense data from command
- Create expense (no confirmation yet)

**Example System Prompt Enhancement**:
```
Você é um assistente financeiro para ArqCashflow.

CONTEXTO:
- Data de hoje: ${currentDate}
- Team ID: ${teamId}

BANCO DE DADOS - Expense:
- description: string (obrigatório)
- amount: decimal (obrigatório, positivo)
- date: YYYY-MM-DD (obrigatório)
- category: string (Alimentação|Transporte|Materiais|Serviços|Escritório|Outros)
- notes: string (opcional)

CAPACIDADES ATUAIS:
- Criar despesas a partir de comandos como "R$50 em gasolina ontem"

Quando o usuário pedir para criar uma despesa, extraia os dados e responda com JSON:
{"action": "create_expense", "data": {...}}

Caso contrário, apenas converse normalmente.
```

**Implementation Estimate**: +40 lines (~85 lines total)

**Success Criteria**:
- "R$50 em gasolina" → Creates expense
- "R$30 em almoço ontem" → Creates expense with yesterday's date
- Conversation context still works for non-expense messages

---

#### 📋 **Step 3: Confirmation Workflow**

**Goal**: Preview and confirm before creating

**What to Add**:
- Return pending operation instead of immediate execution
- Handle confirmation responses ("sim", "não")
- Execute on "sim", cancel on "não"

**Success Criteria**:
- User: "R$50 em gasolina"
- Agent: "Vou criar despesa de R$50. Confirma?"
- User: "sim"
- Agent: "✅ Despesa criada!"

---

#### 📋 **Step 4: Update and Delete Expenses**

**Goal**: Modify and remove expenses

**What to Add**:
- Update operation handling
- Delete operation handling
- Query Agent integration for finding expenses

**Success Criteria**:
- "Atualiza a despesa de gasolina para R$60" → Updates
- "Deleta a despesa de almoço" → Deletes after confirmation

---

#### 📋 **Step 5: Contracts and Receivables**

**Goal**: Expand to other entity types

**What to Add**:
- ContractService integration
- ReceivableService integration
- Enhanced schema in system prompt

---

#### 📋 **Step 6: Batch Operations**

**Goal**: Handle multiple entities at once

**What to Add**:
- Batch create detection
- Date progression logic
- Batch preview and confirmation

---

#### 📋 **Step 7: Advanced Context**

**Goal**: Entity tracking and reference resolution

**What to Add**:
- Track recently created entities
- Reference resolution ("o primeiro", "esse contrato")
- Multi-match handling

---

#### 📋 **Step 8: Query Agent Integration**

**Goal**: Delegate read queries

**What to Add**:
- Intent detection (query vs operation)
- FinancialQueryService integration

---

#### 📋 **Step 9: Setup Assistant Integration**

**Goal**: Handle document uploads

**What to Add**:
- File upload detection
- Setup Assistant routing

---

#### 📋 **Step 10: Polish and Production**

**Goal**: Production-ready features

**What to Add**:
- Comprehensive error handling
- Rate limiting
- Performance optimization
- User feedback mechanisms

## Consequences

### Positive

✅ **Dramatically Simpler**: 45 lines vs 2,049 lines
✅ **Actually Works**: Conversation context proven functional
✅ **Easier to Debug**: Can understand entire codebase at once
✅ **Faster to Extend**: Clear path for adding capabilities
✅ **Trust in Claude**: Leverage AI capabilities instead of fighting them
✅ **Testable**: Each step has clear success criteria
✅ **Safe**: Never break previous steps

### Negative

⚠️ **Slower Initial Progress**: Must implement features one at a time
⚠️ **Requires Discipline**: Temptation to add features before testing
⚠️ **More Iterations**: May discover issues requiring backtracking

### Neutral

🔄 **Learning Process**: Each step teaches us what Claude can/can't do
🔄 **Flexible**: Can adjust roadmap based on what we learn

## Implementation Notes

### Current Files

**Core Implementation** (45 lines):
- `lib/services/OperationsAgentService.ts` - Minimal service
- `app/api/ai/operations/route.ts` - Simple API endpoint

**UI Integration**:
- `app/ai-chat/enhanced-page.tsx` - "AI Unificado" tab calls Operations directly (no router)

**Documentation**:
- `OPERATIONS-AGENT-ROADMAP.md` - Complete 10-step plan
- `OPERATIONS-AGENT-STEP1-COMPLETE.md` - Step 1 testing guide

### Testing Strategy

Each step must have:
1. ✅ Clear success criteria
2. ✅ Manual testing in browser (AI Unificado tab)
3. ✅ Test script (optional but recommended)
4. ✅ Documentation of what works

### Router Integration

**Current State**: AI Unificado tab calls Operations Agent directly

**Future**: Once Operations Agent has more capabilities (Step 5+), we can:
- Option A: Keep direct integration (simpler)
- Option B: Re-introduce router for multi-agent coordination

**Decision**: Deferred until Step 5 complete

## Alternatives Considered

### Alternative 1: Fix the Existing 2,049-Line Implementation

**Rejected** because:
- Code was too complex to debug effectively
- Unclear which parts were necessary vs over-engineered
- Would take longer to fix than rebuild
- No guarantee fixes would work

### Alternative 2: Build All Features at Once

**Rejected** because:
- Previous approach proved this doesn't work
- Can't test intermediate states
- High risk of over-engineering again
- Harder to identify what's essential

### Alternative 3: Use a Different AI Model

**Rejected** because:
- Problem wasn't the model (Claude Sonnet 4 is excellent)
- Problem was our architecture fighting the model
- Changing models doesn't address root cause

## References

- **Original Problem**: Operations Agent at 2,049 lines, broken context handling
- **Inspiration**: Financial Query Agent success with minimal implementation (288 lines, working perfectly)
- **ADR-008**: AI Agent Strategy (original Operations Agent design)
- **OPERATIONS-AGENT-ROADMAP.md**: Complete 10-step incremental plan

## Success Metrics

### Step 1 (Current)
- ✅ Build succeeds
- ✅ Conversation context works in browser
- ✅ No crashes or errors
- ✅ Code is readable and maintainable

### Overall Project Success (All Steps Complete)
- 🎯 <500 lines total (vs 2,049)
- 🎯 >95% success rate for operations
- 🎯 <3s response time (P95)
- 🎯 Positive user feedback
- 🎯 All features from original spec working

## Lessons Learned

### What We Learned

1. **Start Simple Always Wins**: 45 working lines > 2,049 broken lines
2. **Trust AI Capabilities**: Claude can do date parsing, entity matching, intent classification
3. **Conversation History Is Powerful**: Simpler than custom state machines
4. **Test Immediately**: Don't build more until current step works
5. **Resist Feature Creep**: Every "nice to have" adds complexity

### What We'll Apply Going Forward

1. ✅ **One capability at a time** - No exceptions
2. ✅ **Test before extending** - Each step must work perfectly
3. ✅ **Trust Claude** - If Claude can do it, don't code it
4. ✅ **Keep prompts simple** - Add context, not instructions
5. ✅ **Document as we go** - Each step gets documentation

---

**Next Steps**: Proceed to Step 2 (Simple Expense Creation) when ready.

**Status**: Step 1 ✅ Complete and working in production (AI Unificado tab)
