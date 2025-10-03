# Operations Agent Step 6: Structured Tool Use Migration - Implementation Checklist

**Date Started**: 2025-10-03
**Estimated Duration**: 9-10 hours
**Goal**: Migrate from text-based JSON extraction to Anthropic's official Structured Tool Use pattern

---

## Overview

**Problem**: Claude sometimes exposes JSON actions/SQL queries to users despite prompt instructions.
**Root Cause**: Plain text responses mix conversation with tool calls.
**Solution**: Use structured `tool_use` / `tool_result` content blocks that architecturally separate concerns.

---

## Phase 1: Preparation (1 hour)

### ✅ Backup & Documentation
- [x] Backup current implementation → `OperationsAgentService-old.ts`
- [x] Document migration plan in ADR-012 Step 6
- [x] Update BACKLOG.md with Step 6 priority
- [x] Create this implementation checklist

**Status**: ✅ COMPLETE

---

## Phase 2: Implementation (6-8 hours)

### Task 1: Add Tool Definitions (~1 hour)

**Location**: `OperationsAgentService.ts` line ~360 (Anthropic API request)

**Checklist**:
- [ ] Define `query_database` tool with input schema
  ```typescript
  {
    name: 'query_database',
    description: 'Execute SELECT query on PostgreSQL database',
    input_schema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'The SQL SELECT query' }
      },
      required: ['sql']
    }
  }
  ```

- [ ] Define `call_service` tool with input schema
  ```typescript
  {
    name: 'call_service',
    description: 'Execute CRUD operations on financial entities',
    input_schema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          enum: ['ExpenseService', 'ContractService', 'ReceivableService', 'RecurringExpenseService']
        },
        method: {
          type: 'string',
          enum: ['create', 'update', 'delete', 'bulkCreate', 'bulkUpdate', 'bulkDelete']
        },
        params: { type: 'object', description: 'Parameters for the operation' }
      },
      required: ['service', 'method', 'params']
    }
  }
  ```

- [ ] Add `tools` parameter to both Anthropic API calls
  - Line ~360 (initial request)
  - Line ~523 (follow-up after query)

**Testing**: API accepts tools parameter without errors

---

### Task 2: Refactor Response Handling (~2 hours)

**Location**: Lines 365-450 (current JSON extraction logic)

**Checklist**:
- [ ] Remove regex-based JSON extraction code (~80 lines)
  - Delete lines 369-450 (Method 1 & Method 2 parsers)

- [ ] Add content block processor
  ```typescript
  const textBlocks: string[] = []
  const toolUseBlocks: Anthropic.ToolUseBlock[] = []

  for (const block of response.content) {
    if (block.type === 'text') {
      textBlocks.push(block.text)
    } else if (block.type === 'tool_use') {
      toolUseBlocks.push(block)
    }
  }
  ```

- [ ] Handle tool execution from structured blocks
  ```typescript
  if (toolUseBlocks.length > 0) {
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const tool of toolUseBlocks) {
      if (tool.name === 'query_database') {
        const results = await this.executeQuery(tool.input.sql)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tool.id,
          content: JSON.stringify(results)
        })
      } else if (tool.name === 'call_service') {
        const result = await this.handleServiceCall(...)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tool.id,
          content: JSON.stringify(result)
        })
      }
    }

    // Call Claude again with tool results...
  }
  ```

- [ ] Update follow-up request with tool results
  ```typescript
  messages: [
    ...structuredHistory,
    { role: 'assistant', content: response.content },
    { role: 'user', content: toolResults }
  ]
  ```

- [ ] Handle no-tools case (direct text response)

**Testing**: Tool execution works, results passed correctly

---

### Task 3: Add History Management Helpers (~2 hours)

**Location**: New private methods before `handleServiceCall`

**Checklist**:
- [ ] Implement `buildStructuredMessages()` helper
  ```typescript
  private buildStructuredMessages(
    history: ConversationMessage[],
    newMessage: string
  ): Anthropic.MessageParam[] {
    const structured: Anthropic.MessageParam[] = []

    for (const msg of history) {
      if (msg.role === 'user') {
        structured.push({ role: 'user', content: msg.content })
      } else {
        // Check for legacy markers
        if (msg.content.startsWith('[QUERY_RESULTS]')) {
          // Convert to tool_result
          const results = this.extractQueryResults(msg.content)
          structured.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: msg.toolUseId || 'legacy',
              content: results
            }]
          })
        } else if (Array.isArray(msg.content)) {
          // Already structured
          structured.push({ role: 'assistant', content: msg.content })
        } else {
          // Plain text
          structured.push({ role: 'assistant', content: msg.content })
        }
      }
    }

    structured.push({ role: 'user', content: newMessage })
    return structured
  }
  ```

- [ ] Implement `extractText()` helper
  ```typescript
  private extractText(content: Anthropic.ContentBlock | Anthropic.ContentBlock[]): string {
    const blocks = Array.isArray(content) ? content : [content]
    return blocks
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('\n')
  }
  ```

- [ ] Implement `buildDisplayHistory()` helper
  ```typescript
  private buildDisplayHistory(messages: Anthropic.MessageParam[]): ConversationMessage[] {
    return messages
      .filter(msg => {
        if (msg.role === 'user' && Array.isArray(msg.content)) {
          // Filter out tool_result messages
          return !msg.content.some(block =>
            typeof block === 'object' && block.type === 'tool_result'
          )
        }
        return true
      })
      .map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string'
          ? msg.content
          : this.extractText(msg.content)
      }))
  }
  ```

- [ ] Implement `extractQueryResults()` helper (for legacy support)
  ```typescript
  private extractQueryResults(content: string): string {
    const match = content.match(/\[QUERY_RESULTS\](.*?)\[\/QUERY_RESULTS\]/s)
    return match ? match[1] : content
  }
  ```

**Testing**: History conversion works, backward compatibility maintained

---

### Task 4: Update System Prompt (~1 hour)

**Location**: Lines 61-358 (systemPrompt template literal)

**Checklist**:
- [ ] Remove JSON format examples
  - Delete lines showing `{"action": "query_database", ...}` format
  - Remove "Return ONLY JSON" instructions
  - Remove "REGRAS CRÍTICAS PARA AÇÕES" section (lines 96-121)

- [ ] Add tool usage instructions
  ```
  COMO USAR FERRAMENTAS:

  Para consultas ao database:
  - Use a ferramenta query_database
  - Forneça a query SQL como parâmetro
  - Os resultados serão fornecidos para você formatar

  Para operações (criar/editar/deletar):
  - Use a ferramenta call_service
  - Especifique: service, method, params
  - Confirme com o usuário antes de executar

  Você nunca verá JSON nas suas respostas - as ferramentas
  são executadas automaticamente em segundo plano.
  ```

- [ ] Simplify workflow descriptions
  - Keep: "Para CRIAR", "Para ATUALIZAR/DELETAR", "Para CONSULTAS"
  - Remove: JSON output format examples

- [ ] Keep schema and API documentation (no changes)

**Testing**: Claude uses tools correctly without JSON in responses

---

### Task 5: Update Types (~30 min)

**Location**: Lines 18-21 (ConversationMessage interface)

**Checklist**:
- [ ] Update ConversationMessage interface
  ```typescript
  export interface ConversationMessage {
    role: 'user' | 'assistant'
    content: string | Anthropic.ContentBlock[]  // Support both formats
    toolUseId?: string  // Track tool use IDs for linking
  }
  ```

- [ ] Import Anthropic types
  ```typescript
  import Anthropic from '@anthropic-ai/sdk'
  import type {
    ContentBlock,
    MessageParam,
    ToolUseBlock,
    ToolResultBlockParam
  } from '@anthropic-ai/sdk/resources/messages'
  ```

- [ ] Update return type signatures if needed

**Testing**: TypeScript compiles without errors

---

## Phase 3: Testing & Validation (2-3 hours)

### Functional Testing

**Checklist**:
- [ ] Test CREATE operations
  - [ ] "Cria uma despesa de R$50 em almoço" → Creates expense
  - [ ] "Cria um contrato da Mari de R$5000" → Creates contract
  - [ ] "Cria 3 recebíveis de R$1000" → Creates receivables

- [ ] Test UPDATE operations
  - [ ] "Atualiza a despesa para R$75" → Queries, previews, updates
  - [ ] "Muda o valor do contrato para R$6000" → Updates contract

- [ ] Test DELETE operations
  - [ ] "Deleta a despesa" → Queries, confirms, deletes
  - [ ] "Deleta o contrato" → Asks about receivables, deletes

- [ ] Test BULK operations
  - [ ] "Deleta as 3 despesas com Notion" → Bulk delete
  - [ ] "Atualiza todos para R$100" → Bulk update

- [ ] Test QUERY operations
  - [ ] "Quais despesas tenho?" → Lists expenses
  - [ ] "Contratos ativos?" → Lists contracts

### Leakage Prevention Testing

**Checklist**:
- [ ] **Verify NO JSON in user responses**
  - [ ] Check all responses for `{"action":`
  - [ ] Check all responses for `SELECT ... FROM`
  - [ ] Check all responses for `[QUERY_RESULTS]`
  - [ ] Check all responses for tool IDs

- [ ] **Verify context preservation**
  - [ ] Multi-turn operations work (query → update using IDs)
  - [ ] Claude remembers previous tool results
  - [ ] Follow-up questions work correctly

### Edge Cases

**Checklist**:
- [ ] Error handling
  - [ ] Invalid SQL → Error message (no SQL shown to user)
  - [ ] Service error → Error message (no stack trace shown)
  - [ ] Missing displayHistory → Fixed (was Bug #7)

- [ ] Confirmations
  - [ ] Preview shown before destructive operations
  - [ ] "Confirma?" workflow still works
  - [ ] Cancellation works

- [ ] Backward compatibility
  - [ ] Load old conversation → Still works
  - [ ] Mix of old/new messages → Converts correctly

### Performance Testing

**Checklist**:
- [ ] Response time maintained (~2-5 seconds)
- [ ] Large operations (100+ IDs) complete successfully
- [ ] No memory leaks with long conversations

---

## Rollback Plan

**If critical issues found**:

1. [ ] Restore old version
   ```bash
   cp lib/services/OperationsAgentService-old.ts lib/services/OperationsAgentService.ts
   ```

2. [ ] Document issues found
3. [ ] Update ADR-012 with lessons learned
4. [ ] Plan fixes before re-attempting

---

## Success Criteria

**All must pass**:
- [ ] ✅ All CRUD operations working (create, update, delete, bulk)
- [ ] ✅ **Zero JSON/SQL leakage** in user responses (validated manually & automated)
- [ ] ✅ Context preservation (Claude sees full tool history)
- [ ] ✅ Backward compatible (old conversations still work)
- [ ] ✅ Performance maintained (response time ≤ current)
- [ ] ✅ Code quality improved (~40 line reduction)
- [ ] ✅ TypeScript compilation succeeds
- [ ] ✅ No console errors in browser

---

## Completion

**When all tasks complete**:

1. [ ] Update ADR-012 Step 6 status to ✅ COMPLETE
2. [ ] Move Step 6 from TO DO to DONE in BACKLOG.md
3. [ ] Document any deviations from plan
4. [ ] Commit changes with detailed message
5. [ ] Push to remote
6. [ ] Consider deleting `-old.ts` backup (after 1 week stable)

---

## Notes & Discoveries

*Document any unexpected findings, challenges, or improvements discovered during implementation*

-

---

**Last Updated**: 2025-10-03
