---
title: "Operations Agent Incremental Rebuild"
type: "decision"
audience: ["developer", "agent"]
contexts: ["ai-agents", "architecture", "incremental-development", "simplicity", "multi-entity-operations", "token-limits"]
complexity: "intermediate"
last_updated: "2025-10-03"
version: "1.2"
status: "active"
decision_date: "2025-10-02"
agent_roles: ["operations-agent-developer", "ai-integration-specialist", "incremental-builder"]
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
**UPDATED** - 2025-10-03

**Current Implementation**: ✅ Steps 1-5 Complete (2025-10-03)
- Step 1: ✅ Basic conversation with context
- Step 2: ✅ Simple expense creation
- Step 3: ✅ Confirmation workflow (Claude-powered)
- Step 4: ✅ Update and Delete operations (with bulkUpdate API integration)
- Step 5: ✅ Multi-entity support (Contract, Receivable, RecurringExpense)

**Current Status**: All entity types supported, production bugs fixed, max_tokens optimized

**Next Priority**: **Step 6 - Structured Tool Use Migration** (Architecture refactor to eliminate JSON/Query leakage)

**Roadmap Update**: Steps renumbered after inserting Step 6 (Structured Tool Use) as priority

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

#### ✅ **Step 2: Simple Expense Creation** (COMPLETE - 2025-10-02)

**Goal**: Add ability to create expenses from natural language

**Implementation**: ~150 lines total (final with Step 3)

**What Was Added**:
- ✅ Enhanced system prompt with database schema for expenses
- ✅ ExpenseService integration
- ✅ JSON-based action extraction
- ✅ Date inference (ontem, hoje, amanhã)
- ✅ Category inference from description
- ✅ Amount parsing (R$50, 50 reais, etc.)

**Key Decision**: Let Claude handle everything through conversation context
- No manual state tracking
- No separate confirmation detection methods
- Single system prompt with full workflow instructions

**Success Criteria**: ✅ All passed
- "R$50 em gasolina" → Creates expense
- "R$30 em almoço ontem" → Creates expense with yesterday's date
- Conversation context maintained for non-expense messages

---

#### ✅ **Step 3: Confirmation Workflow** (COMPLETE - 2025-10-02)

**Goal**: Preview and confirm before creating

**Final Implementation**: ~150 lines (integrated with Step 2)

**What Was Added**:
- ✅ System prompt includes full workflow: preview → confirm → create
- ✅ Claude handles confirmation detection naturally (no hardcoded words)
- ✅ Preview format with emojis (📝 💰 📅 🏷️)
- ✅ Cancellation support
- ✅ JSON extraction handles text before/after JSON

**Key Innovation**: **No separate state management**
- Removed `PendingOperation` interface entirely
- Removed `pendingOperation` parameter
- Claude uses conversation history to know context
- Claude decides when to preview vs when to create

**Workflow**:
1. User: "R$50 em gasolina"
2. Claude: Shows preview "Vou criar uma despesa: ... Confirma?"
3. User: "sim" (or "ok", "pode", "vai", etc.)
4. Claude: Returns `{"action": "create_expense", ...}`
5. Service: Creates expense

**Success Criteria**: ✅ All passed
- Shows preview before creating
- Confirms on "sim", "ok", "pode", "vai lá", etc.
- Cancels on "não", "cancela", etc.
- Can start new conversation while preview is shown

---

#### ✅ **Step 4: Update and Delete Expenses** (COMPLETE - 2025-01-03)

**Goal**: Modify and remove expenses using native bulk APIs

**Implementation**: ~650 lines total (including comprehensive system prompt + bug fixes)

**What Was Added**:
- ✅ Enhanced system prompt with full database schema (4 tables)
- ✅ Complete API documentation (all CRUD + bulkCreate/bulkUpdate/bulkDelete)
- ✅ Multi-JSON parser for batch operations
- ✅ Native bulk API integration (using BaseService bulk methods)
- ✅ Tool use format parser (handles Claude's XML-like output)
- ✅ Smart update params handling (flexible format support)
- ✅ Conversation history preservation (query results retained)
- ✅ PostgreSQL case sensitivity handling
- ✅ Display vs context history separation

**Key Discoveries & Bug Fixes**:

1. **Bug 1: Missing Bulk Operations** (Fixed 2025-01-03)
   - Problem: Only had bulkUpdate, missing bulkCreate and bulkDelete
   - Solution: Added bulkCreate(items) and bulkDelete(ids) to all services
   - Impact: Can now delete multiple items at once

2. **Bug 2: PostgreSQL Case Sensitivity** (Fixed 2025-01-03)
   - Problem: Query failed with "column duedate does not exist"
   - Root cause: PostgreSQL requires quoted column names
   - Solution: Added explicit rule to ALWAYS quote columns in queries
   - Example: SELECT "id", "dueDate" FROM "Expense"

3. **Bug 3: Display vs Context History** (Fixed 2025-01-03)
   - Problem: Users saw raw [QUERY_RESULTS] JSON in chat
   - Secondary problem: ID hallucination when query results filtered out
   - Root cause: Frontend sent displayHistory back as conversationHistory
   - Solution: Dual history tracking
     - **conversationHistory**: Full context with internal messages (for Claude)
     - **displayHistory**: User-facing only (for UI)
     - **Frontend**: Maintains separate `fullHistory` and `messages` states

**Architecture Evolution**:

**Initial Approach** (Step 4 start):
```typescript
conversationHistory → Frontend → Backend
                   ↓
          Single history for both display and context
```

**Final Approach** (Step 4 complete):
```typescript
Backend returns:
  conversationHistory (full with [QUERY_RESULTS])
  displayHistory (filtered for user)

Frontend maintains:
  fullHistory (send to backend - preserves Claude context)
  messages (render to UI - clean display)
```

**Success Criteria**: ✅ All passed (production tested)
- "Quais minhas 3 menores despesas com Notion?" → Formatted response (no raw JSON)
- "Pode alterar para R$25?" → Shows preview using correct IDs from query
- "Pode" → Executes bulkUpdate with real IDs (no hallucination)
- PostgreSQL queries work with complex filters
- Bulk delete works for multiple items

**Technical Solutions**:

1. **Comprehensive System Prompt** (lines 39-300 in OperationsAgentService.ts):
   - Database schema for all 4 entity types with field types
   - API method signatures: create, bulkCreate, update, bulkUpdate, delete, bulkDelete
   - PostgreSQL case sensitivity rules with examples
   - Inference guidelines (dates, categories, amounts)
   - Workflow instructions (query → preview → confirm → execute)
   - Critical rule: ALWAYS include 'id' in SELECT queries
   - Explicit examples of correct vs incorrect action output

2. **Multi-JSON Parser** (lines 340-400):
   - Brace-counting algorithm for nested JSON extraction
   - Converts multiple update/delete actions to single bulk call
   - Handles both tool use format and inline JSON

3. **Dual History Architecture**:
   - Backend: `filterInternalMessages()` helper (lines 31-41)
   - Backend: All return statements include both histories
   - Frontend: Separate `fullHistory` (context) and `messages` (display)
   - Frontend: Sends fullHistory to API, displays messages to user

**Architecture Decisions**:
- ✅ Chose native bulk APIs over custom batching
- ✅ Trust Claude with minimal code (system prompt > custom logic)
- ✅ Preserve query results in conversation (not server-side state)
- ✅ Separate display from context (clean architecture principle)
- ✅ Filter internal messages on backend (frontend shouldn't know format)

**Performance**: ~650 lines (vs 2,049 in original) - **68% reduction**

---

#### ✅ **Step 5: Multi-Entity Support** (COMPLETE - 2025-10-03)

**Goal**: Expand to all entity types (Contract, Receivable, RecurringExpense)

**Implementation**: ~650 lines maintained (no code bloat)

**What Was Added**:
- ✅ ContractService integration with deletion options
- ✅ ReceivableService integration
- ✅ RecurringExpenseService integration
- ✅ Complete schema documentation for all 4 entities in system prompt
- ✅ Smart defaults for dates and contract fields
- ✅ Contract deletion UX with receivables handling options

**Bug Fixes (Production Testing)**:

**Bug 1: RecurringExpense Schema** ✅ FIXED
- Problem: System prompt documented wrong schema (had `dueDate`, actual is `nextDue`)
- Solution: Updated schema to show correct fields (nextDue, isActive, vendor)
- Added warning: "RecurringExpense NÃO tem campo 'dueDate'!"

**Bug 2: Contract Deletion Missing Receivables Handling** ✅ FIXED
- Problem: Claude deleted contracts without asking about linked receivables
- Solution: Added `options` parameter documentation with two modes:
  - `"contract-only"`: Unlinks receivables (safe default)
  - `"contract-and-receivables"`: Deletes everything (destructive)
- Added workflow rule requiring Claude to always ask user about receivables

**Bug 3: JSON Exposure in User Display** ✅ FIXED
- Problem: Claude echoed `[QUERY_RESULTS]` and `{action:...}` JSON in responses
- Solution: Enhanced system prompt with explicit rules:
  - Line 115: "NUNCA inclua '[QUERY_RESULTS]' ou '\{action:...\}' na resposta"
  - Line 321: Preview must be "em linguagem natural, NUNCA mostre JSON"

**Bug 4: max_tokens Limit for Large Operations** ✅ FIXED
- Problem: 1,500 token limit caused truncated JSON for 108 contract IDs
- Evidence: Response stopped mid-JSON at ID #73, system couldn't parse action
- Analysis: 108 IDs = ~2,700 chars + structure + text = ~2,500 tokens needed
- Solution: Increased max_tokens to **8,192** (supports ~400 IDs)

**max_tokens Decision Rationale**:

**Why 8,192?**
1. ✅ Handles realistic bulk operations (up to ~400 contract IDs)
2. ✅ Avoids Anthropic SDK timeout warning (>10 min for non-streaming)
3. ✅ Cost-efficient (only pay for tokens actually used, not the limit)
4. ✅ 5x increase from original 1,500, covers 99% of use cases

**SDK Constraint**:
- Anthropic TypeScript SDK has `calculateNonstreamingTimeout` check
- Non-streaming requests with max_tokens >~16K trigger 10-minute timeout error
- Error: "Streaming is required for operations that may take longer than 10 minutes"
- Tested: 32K triggers warning, 8K does not

**Future Scaling (if needed)**:
- Claude Sonnet 4 supports up to **64,000 max_tokens**
- To use >16K without warnings, add `timeout: 600000` (10 min) to API calls
- Or enable streaming: `stream: true` (requires response handling changes)
- For >1,000 IDs: Consider "useLastQueryResults" pattern (reference IDs from history)

**Files Modified**:
- `lib/services/OperationsAgentService.ts` (lines 360, 523)

**Success Criteria**: ✅ All passed
- "Cria um contrato da Mari de R$5000" → Creates contract
- "Deleta o contrato Ble" → Asks about receivables, then deletes
- "Lista despesas recorrentes" → Uses correct schema fields
- 108 contract bulk deletion → Complete JSON response, successful execution

---

#### ✅ **Step 6: Structured Tool Use Migration** (COMPLETE - 2025-10-04)

**Goal**: Migrate from text-based JSON extraction to Anthropic's official Structured Tool Use pattern

**Context**: Current implementation suffered from JSON/Query leakage to users despite prompt instructions. Root cause: relying on Claude to format responses correctly in plain text. Solution: Use official `tool_use` / `tool_result` content blocks which structurally separate tools from conversation.

**Problem Being Solved**:
- **Issue**: Claude sometimes includes JSON actions/SQL queries in user-facing responses
- **Current Fix**: Prompt engineering + post-processing (fragile, prompt-dependent)
- **Root Cause**: Plain text responses mix conversation with tool calls
- **Proper Solution**: Structured content blocks separate concerns architecturally

**Migration Strategy**:

**Phase 1: Preparation** (1 hour)
1. ✅ Backup current implementation → `OperationsAgentService-old.ts`
2. ✅ Duplicate to `OperationsAgentService.ts` (working copy)
3. ✅ Document migration plan in ADR-012
4. ✅ Update BACKLOG.md with new priority

**Phase 2: Implementation** (6-8 hours)
1. **Add Tool Definitions** (~1 hour)
   - Define `query_database` tool with input schema
   - Define `call_service` tool with input schema
   - Add to Anthropic API request

2. **Refactor Response Handling** (~2 hours)
   - Remove regex-based JSON extraction (~80 lines)
   - Add content block processor (text vs tool_use)
   - Handle tool execution from structured blocks
   - Implement tool_result formatting

3. **Add History Management Helpers** (~2 hours)
   - `buildStructuredMessages()` - Convert legacy to structured
   - `extractText()` - Get text from content blocks
   - `buildDisplayHistory()` - User-facing messages only
   - Handle backward compatibility with existing conversations

4. **Update System Prompt** (~1 hour)
   - Remove JSON format examples
   - Add tool usage instructions
   - Simplify workflow descriptions

5. **Update Types** (~30 min)
   - Support both string and ContentBlock[] in ConversationMessage
   - Add tool tracking fields

**Phase 3: Testing & Validation** (~2-3 hours)
1. Test all CRUD operations (create, update, delete, bulk)
2. Verify NO JSON/SQL leakage in user responses
3. Confirm context preservation (Claude sees tool history)
4. Test backward compatibility with existing conversations
5. Edge cases: errors, confirmations, multi-turn operations

**Architecture Comparison**:

**Before (Text-Based - Current)**:
```typescript
// Claude response is plain text
{ role: 'assistant', content: '{"action": "query_database", "sql": "SELECT..."}' }

// System extracts JSON using regex
const action = extractJSON(responseText)  // Fragile!

// User might see JSON if extraction fails
```

**After (Structured - Target)**:
```typescript
// Claude response has separated blocks
{
  role: 'assistant',
  content: [
    { type: 'text', text: 'I will query your contracts' },  // User sees
    { type: 'tool_use', id: 'xyz', name: 'query_database', input: {sql: 'SELECT...'} }  // Hidden
  ]
}

// System processes blocks by type
for (const block of content) {
  if (block.type === 'text') → displayToUser()
  if (block.type === 'tool_use') → executeTool()
}
```

**Key Benefits**:
1. ✅ **Architectural Guarantee**: Tools structurally separated from conversation
2. ✅ **No Prompt Dependency**: Works even if Claude "forgets" instructions
3. ✅ **Future-Proof**: Compatible with new Anthropic features
4. ✅ **Official Pattern**: Battle-tested by Anthropic
5. ✅ **Simpler Code**: ~40 net line reduction, cleaner logic
6. ✅ **Better UX**: Zero risk of JSON/SQL exposure to users

**Technical Details**:

Tool Definitions:
```typescript
tools: [
  {
    name: 'query_database',
    description: 'Execute SELECT query on PostgreSQL',
    input_schema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'SQL SELECT query' }
      },
      required: ['sql']
    }
  },
  {
    name: 'call_service',
    description: 'Execute CRUD on financial entities',
    input_schema: {
      type: 'object',
      properties: {
        service: { type: 'string', enum: ['ExpenseService', 'ContractService', ...] },
        method: { type: 'string', enum: ['create', 'update', 'delete', 'bulkCreate', ...] },
        params: { type: 'object', description: 'Operation parameters' }
      },
      required: ['service', 'method', 'params']
    }
  }
]
```

Response Handling:
```typescript
// Process content blocks
const textBlocks = content.filter(b => b.type === 'text')
const toolUseBlocks = content.filter(b => b.type === 'tool_use')

// Execute tools
for (const tool of toolUseBlocks) {
  const result = await executeTool(tool.name, tool.input)

  // Add tool_result to history (hidden from user)
  messages.push({
    role: 'user',
    content: [{
      type: 'tool_result',
      tool_use_id: tool.id,
      content: JSON.stringify(result)
    }]
  })
}

// Call Claude again if tools were used
const followUp = await claude({ messages })

// Return only text to user
return { message: extractText(followUp.content) }
```

**Rollback Plan**:
- Keep `OperationsAgentService-old.ts` as backup
- If critical issues found, restore old version
- Old version remains functional throughout migration

**Implementation Summary** (Complete):

1. ✅ **Tool Definitions Added**:
   - `query_database` with SQL input schema
   - `call_service` with service/method/params schema
   - Both tools registered with Anthropic API

2. ✅ **Response Handling Refactored**:
   - Removed ~200 lines of regex-based JSON extraction
   - Added content block processor (textBlocks vs toolUseBlocks)
   - Implemented tool_result flow with proper history management
   - Added chained tool support (query → query workflows)

3. ✅ **Type System Updated**:
   - `ConversationMessage.content` now supports `ContentBlock[]`
   - Added `extractText()` helper for content block handling
   - Enhanced `filterInternalMessages()` for dual format support

4. ✅ **System Prompt Simplified**:
   - Removed ~90 lines of JSON format instructions
   - Changed from prescriptive workflows to natural guidance
   - Added explicit ID exposure prevention rules
   - Completed API documentation for all 4 services

5. ✅ **Bug Fixes During Migration**:
   - Fixed BigInt serialization in query results
   - Fixed MDX documentation build (escaped curly braces)
   - Added chained tool support for multi-step workflows

**Success Criteria**: ✅ All Met
- ✅ All existing operations work (create, update, delete, bulk, query)
- ✅ **Zero JSON/SQL leakage** in user responses (architectural guarantee)
- ✅ **Zero ID exposure** to users (prompt + examples)
- ✅ Context preservation verified (Claude sees tool history)
- ✅ Chained tool use working (contract deletion with receivable checks)
- ✅ Code complexity reduced (~90 lines net reduction, ~14%)
- ✅ Build succeeds (main app + documentation)

**Known Issues** (To be addressed in future steps):
1. ⚠️ **Missing Follow-Up call_service Handler**:
   - Chained query → query works ✅
   - Chained query → call_service NOT handled in follow-up loop ❌
   - Impact: Some multi-step workflows may fail (see Issue #1 below)

2. ⚠️ **bulkDelete continueOnError Not Defaulted**:
   - Strict mode throws on first missing ID
   - Should default to `continueOnError: true` for resilience
   - Impact: Stale data causes total operation failure (see Issue #2 below)

**Issues Discovered During Testing**:

**Issue 1: Empty Response on Large Bulk Delete** (465 expenses)
- Symptom: 220s timeout, empty response
- Root Cause: Follow-up `call_service` not handled in follow-up loop (lines 554-603)
- Workaround: None - operation fails silently
- Fix Required: Add `else if (followUpTool.name === 'call_service')` to follow-up handler
- Deferred to: Step 7 or hotfix

**Issue 2: Stale Data Causes Total Failure** (383 expenses)
- Symptom: `Entity with ID xxx not found` error, all deletes rolled back
- Root Cause: `bulkDelete` strict mode, missing `continueOnError: true` default
- Workaround: User can retry (but same issue may recur)
- Fix Required: Default `options.continueOnError = true` in handleServiceCall
- Deferred to: Step 7 or hotfix

**Files Modified**:
- `lib/services/OperationsAgentService.ts` (primary implementation)
- `lib/services/OperationsAgentService-old.ts` (backup)
- `docs/docs-site/docs/decisions/012-operations-agent-incremental-rebuild.md` (this file)
- System prompt updated (simplified)

**Commits**:
- `78609a1` - feat: Complete Step 6 - Structured Tool Use Migration
- `d426ce4` - fix: Handle BigInt serialization in database query results
- `265222d` - fix: Escape curly braces in MDX documentation to fix build

**Next Priority**: Address Known Issues (follow-up call_service + continueOnError) before Step 7

---

#### 📋 **Step 7: Batch Operations** (Deferred - After Step 6)

**Goal**: Handle multiple entities at once

**What to Add**:
- Batch create detection
- Date progression logic
- Batch preview and confirmation

---

#### 📋 **Step 8: Advanced Context** (Deferred - After Step 7)

**Goal**: Entity tracking and reference resolution

**What to Add**:
- Track recently created entities
- Reference resolution ("o primeiro", "esse contrato")
- Multi-match handling

---

#### 📋 **Step 9: Query Agent Integration** (Deferred)

**Goal**: Delegate read queries

**What to Add**:
- Intent detection (query vs operation)
- FinancialQueryService integration

---

#### 📋 **Step 10: Setup Assistant Integration** (Deferred)

**Goal**: Handle document uploads

**What to Add**:
- File upload detection
- Setup Assistant routing

---

#### 📋 **Step 11: Polish and Production** (Deferred)

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
- 🎯 &lt;500 lines total (vs 2,049)
- 🎯 >95% success rate for operations
- 🎯 &lt;3s response time (P95)
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
