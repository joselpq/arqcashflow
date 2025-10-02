# Operations Agent - Incremental Development Roadmap

**Philosophy**: Start extremely simple, prove it works, add one capability at a time

**Current Status**: Step 1 Complete ✅

---

## ✅ Step 1: Conversation Context (COMPLETE)

**Goal**: Prove that Claude can remember conversation context

**Implementation**:
- Ultra-minimal service (~90 lines)
- Just chat with Claude
- Pass conversation history back and forth
- No CRUD operations yet

**Files**:
- `lib/services/OperationsAgentService.ts` - Minimal service
- `app/api/ai/operations/route.ts` - Simple API endpoint
- `test-operations-step1.ts` - Test script

**Test**:
```bash
# Get session token from browser console
export SESSION_TOKEN="your-token"
npx tsx test-operations-step1.ts
```

**Success Criteria**: ✅
- Claude remembers previous messages
- Conversation flows naturally
- No crashes or errors

---

## 📋 Step 2: Simple Expense Creation (NEXT)

**Goal**: Add ability to create expenses from natural language

**Capabilities to Add**:
- Extract expense data from commands like "R$50 em gasolina"
- Call ExpenseService.create()
- Return success message

**NO confirmations yet** - just extract and create

**Implementation Plan**:
1. Add expense data extraction method
2. Add ExpenseService integration
3. Update processCommand to detect expense commands
4. Test with simple expense commands

**Success Criteria**:
- "R$50 em gasolina" → Creates expense
- "R$30 em almoço ontem" → Creates expense with yesterday's date
- Conversation context still works

---

## 📋 Step 3: Confirmation Workflow

**Goal**: Add confirmation before creating

**Capabilities to Add**:
- Show preview of what will be created
- Wait for user confirmation
- Track pending operation state

**Implementation Plan**:
1. Add `pendingOperation` to result type
2. Detect confirmation responses ("sim", "não")
3. Execute operation on "sim"
4. Cancel on "não"

**Success Criteria**:
- User: "R$50 em gasolina"
- Agent: "Vou criar despesa de R$50. Confirma?"
- User: "sim"
- Agent: "✅ Despesa criada!"

---

## 📋 Step 4: Update and Delete Expenses

**Goal**: Add update and delete operations

**Capabilities to Add**:
- Update existing expenses
- Delete expenses
- Find expenses by description/date

**Implementation Plan**:
1. Add Query Agent integration for finding expenses
2. Add update operation handling
3. Add delete operation handling
4. Add confirmation for destructive operations

**Success Criteria**:
- "Atualiza a despesa de gasolina para R$60" → Updates expense
- "Deleta a despesa de almoço" → Deletes expense

---

## 📋 Step 5: Contracts and Receivables

**Goal**: Expand to other entity types

**Capabilities to Add**:
- Create contracts
- Create receivables
- Link receivables to contracts

**Implementation Plan**:
1. Add ContractService integration
2. Add ReceivableService integration
3. Enhance data extraction for different entity types
4. Add entity type detection

**Success Criteria**:
- "Contrato de R$100k com ACME" → Creates contract
- "R$5k de RT do projeto ACME para dia 15" → Creates receivable

---

## 📋 Step 6: Batch Operations

**Goal**: Handle multiple entities in one command

**Capabilities to Add**:
- Create multiple expenses/receivables at once
- Date progression ("próximos 3 meses")
- Batch confirmation

**Implementation Plan**:
1. Detect batch operations
2. Generate multiple entities
3. Show batch preview
4. Execute all on confirmation

**Success Criteria**:
- "3 recebíveis de R$1000 nos próximos 3 meses" → Creates 3 receivables

---

## 📋 Step 7: Advanced Context

**Goal**: Smart entity resolution and context awareness

**Capabilities to Add**:
- Reference resolution ("o primeiro", "esse contrato")
- Multi-match handling ("Encontrei 2 projetos Mari...")
- Track recently created entities

**Implementation Plan**:
1. Add entity tracking to conversation state
2. Add reference resolution logic
3. Enhance confirmation to show entity details

**Success Criteria**:
- User: "Contratos com Mari" (finds 2)
- Agent: "Encontrei 2: 1. Mari Silva, 2. Mari Corp"
- User: "Deleta o primeiro"
- Agent: Deletes correct contract

---

## 📋 Step 8: Query Agent Integration

**Goal**: Delegate read queries to Query Agent

**Capabilities to Add**:
- Detect when user is asking a question vs giving a command
- Route questions to Query Agent
- Use query results in operations

**Implementation Plan**:
1. Add intent detection (query vs operation)
2. Integrate FinancialQueryService
3. Use query results for entity lookup

**Success Criteria**:
- "Quanto gastei hoje?" → Routes to Query Agent
- "Deleta as despesas de hoje" → Queries + Deletes

---

## 📋 Step 9: Setup Assistant Integration

**Goal**: Route document uploads to Setup Assistant

**Capabilities to Add**:
- Detect file uploads
- Route to Setup Assistant
- Return results in conversation

**Implementation Plan**:
1. Accept files in API endpoint
2. Detect file presence
3. Call Setup Assistant
4. Format results

**Success Criteria**:
- User uploads invoice.pdf
- Agent processes and creates expense
- Continues conversation

---

## 📋 Step 10: Polish and Production

**Goal**: Production-ready features

**Capabilities to Add**:
- Error handling and retry logic
- Rate limiting
- Performance optimization
- User feedback mechanisms

**Implementation Plan**:
1. Add comprehensive error handling
2. Add logging and monitoring
3. Performance profiling
4. User testing and feedback

**Success Criteria**:
- <3s response time (P95)
- >95% success rate
- Zero crashes
- Positive user feedback

---

## Key Principles

1. **One capability at a time** - Fully test before moving to next step
2. **Never break previous steps** - Each step builds on the last
3. **Test after every change** - Keep test scripts updated
4. **Keep it simple** - Resist the urge to over-engineer
5. **Trust Claude** - Let Claude do the heavy lifting, not our code

---

## Testing Strategy

Each step should have:
1. Unit tests (if applicable)
2. Integration test script (like `test-operations-step1.ts`)
3. Manual testing with real session
4. Documentation of success criteria

---

## Decision Log

**Why this approach?**
- Previous attempt: 2,049 lines, over-engineered, didn't work
- New approach: Start with 90 lines, prove conversation works, build incrementally
- Each step is testable and can be shipped independently

**Why no unified router yet?**
- Focus on making Operations Agent work first
- Router can be added later once we understand the integration patterns
- Simpler to debug and test in isolation
