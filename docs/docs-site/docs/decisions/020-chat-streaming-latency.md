---
title: "020: Chat Streaming for Sub-Second Response Latency"
type: "decision"
audience: ["developer", "agent"]
contexts: ["architecture", "performance", "ai-integration", "user-experience"]
complexity: "intermediate"
last_updated: "2025-11-04"
version: "1.0"
agent_roles: ["architecture-reviewer", "performance-specialist", "ai-integration-specialist"]
decision_status: "accepted"
decision_date: "2025-11-04"
related:
  - decisions/002-claude-migration.md
  - decisions/008-ai-agent-strategy.md
  - decisions/017-chat-first-onboarding-redesign.md
dependencies: ["vercel-ai-sdk", "anthropic-sdk", "claude-api"]
---

# 020: Chat Streaming for Sub-Second Response Latency

## Context for LLM Agents

**Scope**: This ADR covers the critical performance optimization for chat response latency, transforming the user experience from blocking waits to real-time streaming interactions
**Prerequisites**: Understanding of Vercel AI SDK, streaming APIs, React state management, and Claude API capabilities
**Key Patterns**:
- Streaming text responses with ReadableStream
- Prompt caching for cost and latency optimization
- Optimistic UI patterns for perceived performance
- Progressive enhancement of system prompts

## Status

**Status**: Accepted
**Date**: 2025-11-04
**Decision Makers**: Core development team
**Supersedes**: N/A (initial chat performance optimization)

## Context

### Problem Statement

Users experience 3-8 second blocking waits when interacting with Arnaldo (AI assistant) in the chat interface. During this time, they see only a loading spinner with no feedback, leading to:
- Perceived system lag ("Is this working?")
- User anxiety during wait time
- Poor first impression after onboarding
- Reduced engagement with AI-first features
- Higher abandonment rates (~40% for quick actions)

The current architecture uses `generateText()` which blocks until the entire response is complete, preventing users from seeing Claude's response as it's generated.

### Current Architecture Analysis

**Frontend → Backend Flow:**
```
User sends message
  ↓
ChatContext.sendMessage() (app/contexts/ChatContext.tsx:120)
  ↓
POST /api/ai/operations (app/api/ai/operations/route.ts)
  ↓
OperationsAgentService.processCommand() (lib/services/OperationsAgentService.ts:56)
  ↓
generateText() [Vercel AI SDK] - BLOCKING CALL ⚠️
  ↓ (waits for complete response 2-6 seconds)
Response returned to frontend
  ↓
Message displayed
```

**Latency Breakdown:**
```
User hits send
  ↓ [Frontend processing: ~10ms]
  ↓ [Network to server: ~50-100ms]
  ↓ [Auth + team context: ~50ms]
  ↓ [System prompt generation: ~50-100ms]
    ├── DB query for profession: ~30-50ms
    └── String building: ~20-50ms
  ↓ [Claude API call initiation: ~200-400ms]
  ↓ [Claude processing + generation: ~2-6 seconds] ⚠️ BLOCKING
    ├── Initial thinking: ~500ms-1s
    ├── Response generation: ~1.5-5s
    └── Tool calls (if needed): +1-3s
  ↓ [Network response: ~50-100ms]
  ↓ [Frontend render: ~10-20ms]
  ↓ USER SEES RESPONSE

TOTAL PERCEIVED LATENCY: ~3-8 seconds ⚠️
```

### Key Bottlenecks Identified

1. **No Streaming (CRITICAL)**: Uses `generateText()` instead of `streamText()`, forcing users to wait for complete response
2. **Long System Prompt (MEDIUM)**: ~635 lines generated dynamically on every request without caching
3. **No Prompt Caching (MEDIUM)**: Claude API supports prompt caching but implementation doesn't use it (90% cost + latency reduction opportunity)
4. **Database Queries in Prompt (LOW)**: Queries team data on each request (~50-100ms latency before Claude API call starts)

### Constraints

- **Technical**: Must work with existing Vercel AI SDK and Anthropic API
- **UX**: Cannot break existing chat history and conversation state management
- **Performance**: Target time-to-first-token < 1 second (ideally 300-500ms)
- **Cost**: Should not significantly increase API costs (ideally reduce them)
- **Team**: 4-6 hours implementation time for core fix
- **Compatibility**: Must handle tool calls during streaming gracefully

### Requirements

- **Functional Requirements**:
  - Stream response tokens to frontend as they arrive
  - Maintain conversation history correctly during streaming
  - Handle streaming interruptions gracefully
  - Support tool calls during streaming (execute, then continue streaming)
  - Preserve all existing chat functionality

- **Non-functional Requirements**:
  - Time to first token < 1 second (90% improvement from current 3-8s)
  - Perceived responsiveness improvement of 10x
  - Cost reduction of ~90% through prompt caching
  - No breaking changes to existing API contracts
  - Graceful degradation if streaming fails

## Decision

### What We Decided

Implement a **three-phase streaming optimization strategy**:

**Phase 1 (Quick Wins - 1 hour):**
1. **Optimistic UI**: Show "Arnaldo está pensando... 💭" with animated dots immediately
2. **Prompt Caching**: Enable Claude's ephemeral prompt caching (1-line change)

**Phase 2 (Core Fix - 4-6 hours):**
3. **Streaming Implementation**: Replace `generateText()` → `streamText()` for real-time token streaming

**Phase 3 (Optional Polish - 2-3 hours):**
4. **System Prompt Optimization**: Cache profession config and pre-build static sections

### Rationale

**Why Streaming is Critical:**
- **90% perceived latency reduction** (3-8s → <1s to first token)
- **Industry standard**: ChatGPT, Claude Web, and all modern AI chats use streaming
- **Psychological impact**: Seeing response appear immediately transforms experience from "Is this broken?" to "Wow, it's thinking live!"
- **Built-in SDK support**: Vercel AI SDK makes this straightforward
- **Works with tools**: Tool calls execute seamlessly during streaming

**Why Prompt Caching is Essential:**
- **1-hour implementation** (single line change)
- **90% cost reduction** for cached tokens (~400 tokens of system prompt)
- **200-350ms latency reduction** for repeat users (within 5-minute cache TTL)
- **Perfect complement**: Works with both blocking and streaming approaches
- **Official feature**: Well-supported by Anthropic

**Why Optimistic UI Matters:**
- **30-minute implementation** (quick perception win)
- **20-30% perceived improvement** immediately
- **No backend changes**: Can deploy while working on streaming
- **Shows intent**: Transforms wait from "broken?" to "processing"

**Why Phased Approach:**
- **Immediate value**: Phase 1 delivers results in 1 hour
- **Core transformation**: Phase 2 provides 90% of total improvement
- **Diminishing returns**: Phase 3 only adds ~5% (can defer)
- **Risk management**: Test each phase independently

## Alternatives Considered

### Option 1: Keep Blocking with Prompt Optimization Only
- **Description**: Optimize system prompt generation without implementing streaming
- **Pros**: Simple, low risk, no frontend changes
- **Cons**: Only saves ~100ms (5% improvement), doesn't solve core UX problem
- **Impact**: Time to first token 3-8s → 2.9-7.9s
- **Why Not Chosen**: Doesn't address fundamental issue of blocking waits; users still experience poor UX

### Option 2: Parallel Prompt Generation + API Call
- **Description**: Start Claude API call with minimal prompt, upgrade to full prompt mid-stream
- **Pros**: Theoretically saves ~100ms by parallelizing work
- **Cons**: Very high complexity, Vercel AI SDK doesn't support "prompt swapping", quality degradation risk
- **Implementation Complexity**: VERY HIGH (8-12 hours)
- **Why Not Chosen**: Complexity far exceeds benefit (~100ms gain); high risk of response quality issues

### Option 3: Client-Side Caching Only
- **Description**: Cache previous responses client-side to show instant results for repeated queries
- **Pros**: Extremely fast for cached queries, easy to implement
- **Cons**: Only helps repeated queries, stale data risk, doesn't help first-time users
- **Why Not Chosen**: Doesn't solve the core problem; limited use case (most queries are unique)

### Option 4: Pre-generate Common Responses
- **Description**: Pre-compute responses for common queries during idle time
- **Pros**: Could provide instant responses for frequent questions
- **Cons**: High storage cost, stale data, only helps predictable queries, complex invalidation
- **Why Not Chosen**: Over-engineered solution; most queries are context-specific and unique

### Option 5: Switch to Smaller/Faster Model
- **Description**: Use Claude Haiku instead of Sonnet for faster responses
- **Pros**: Faster response times (~40% reduction), lower costs
- **Cons**: Significant quality degradation, reduced reasoning capability, worse tool usage
- **Why Not Chosen**: Quality trade-off unacceptable for financial operations; streaming provides better UX without quality loss

## Implementation

### Phase 1: Quick Wins (1 hour) - IMMEDIATE

#### 1.1 Optimistic UI with Thinking Indicator (30 minutes)

**Frontend Changes (app/contexts/ChatContext.tsx):**
```typescript
// Add thinking state
const [isThinking, setIsThinking] = useState(false)

// In sendMessage function:
const sendMessage = async (content: string) => {
  // Show thinking indicator immediately
  setIsThinking(true)

  const newMessages = [
    ...messages,
    { role: 'user', content, timestamp: new Date() }
  ]
  setMessages(newMessages)

  try {
    const response = await fetch('/api/ai/operations', {...})
    // ... existing logic
  } finally {
    setIsThinking(false)
  }
}
```

**UI Component (app/components/chat/ThinkingIndicator.tsx):**
```typescript
export const ThinkingIndicator = () => (
  <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
    <span>Arnaldo está pensando</span>
    <div className="flex gap-1">
      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
    </div>
    💭
  </div>
)
```

**Files Modified:**
- `app/contexts/ChatContext.tsx` - Add thinking state
- `app/components/chat/ThinkingIndicator.tsx` (NEW) - Thinking UI component
- `app/components/chat/MessageList.tsx` - Render thinking indicator

**Expected Impact:** 20-30% perceived improvement immediately

---

#### 1.2 Prompt Caching (30 minutes)

**Backend Changes (lib/services/OperationsAgentService.ts):**
```typescript
// BEFORE (line ~500)
const result = await generateText({
  model: this.anthropic('claude-sonnet-4-20250514'),
  system: systemPrompt,
  messages: [...history, { role: 'user', content: message }],
  tools: { query_database, call_service }
})

// AFTER
const result = await generateText({
  model: this.anthropic('claude-sonnet-4-20250514'),
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' } // ✅ Cache this!
    }
  ],
  messages: [...history, { role: 'user', content: message }],
  tools: { query_database, call_service }
})
```

**Caching Behavior:**
- **First request**: Full prompt processed (~400ms)
- **Subsequent requests** (same user, within 5 min): Cached prompt used (~50ms)
- **Cache TTL**: 5 minutes
- **Cost reduction**: 90% for cached portion (~400 tokens)

**Files Modified:**
- `lib/services/OperationsAgentService.ts` - Add cache_control to system prompt

**Expected Impact:**
- Latency: 200-350ms reduction for repeat users
- Cost: 90% reduction for cached tokens

---

### Phase 2: Core Fix - Streaming (4-6 hours) - PRIMARY

#### 2.1 Backend Streaming Implementation

**Backend Changes (lib/services/OperationsAgentService.ts):**

```typescript
import { streamText } from 'ai'

// NEW METHOD: Process command with streaming
async processCommandStream(
  message: string,
  history: CoreMessage[]
): Promise<ReadableStream> {
  const systemPrompt = await this.buildSystemPrompt(new Date().toISOString())

  const result = streamText({
    model: this.anthropic('claude-sonnet-4-20250514'),
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [...history, { role: 'user', content: message }],
    tools: {
      query_database: {
        description: 'Query database for contracts, receivables, expenses',
        parameters: z.object({...}),
        execute: async (params) => {
          // Tool execution logic
        }
      },
      call_service: {
        description: 'Create, update, or delete entities',
        parameters: z.object({...}),
        execute: async (params) => {
          // Service call logic
        }
      }
    }
  })

  return result.toDataStreamResponse()
}
```

**API Route Changes (app/api/ai/operations/route.ts):**

```typescript
// BEFORE
export async function POST(request: Request) {
  const { message, history } = await request.json()
  const result = await operationsAgent.processCommand(message, history)
  return NextResponse.json(result)
}

// AFTER
export async function POST(request: Request) {
  const { message, history, stream = true } = await request.json()

  if (!stream) {
    // Backward compatibility for non-streaming
    const result = await operationsAgent.processCommand(message, history)
    return NextResponse.json(result)
  }

  // Streaming response
  const stream = await operationsAgent.processCommandStream(message, history)
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
```

**Files Modified:**
- `lib/services/OperationsAgentService.ts` - Add `processCommandStream()` method
- `app/api/ai/operations/route.ts` - Add streaming endpoint support

---

#### 2.2 Frontend Streaming Implementation

**ChatContext Changes (app/contexts/ChatContext.tsx):**

```typescript
import { readDataStream } from 'ai'

const sendMessage = async (content: string) => {
  const userMessage = {
    role: 'user' as const,
    content,
    timestamp: new Date()
  }

  // Optimistically add user message
  const newMessages = [...messages, userMessage]
  setMessages(newMessages)
  setIsThinking(true)

  try {
    const response = await fetch('/api/ai/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        history: conversationHistory,
        stream: true // Enable streaming
      })
    })

    if (!response.ok) throw new Error('Network response was not ok')
    if (!response.body) throw new Error('No response body')

    // Create assistant message container
    const assistantMessage = {
      role: 'assistant' as const,
      content: '',
      timestamp: new Date()
    }

    setMessages([...newMessages, assistantMessage])
    setIsThinking(false)

    // Stream tokens as they arrive
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      assistantMessage.content += chunk

      // Update message in place
      setMessages(prev => [
        ...prev.slice(0, -1),
        { ...assistantMessage }
      ])
    }

    // Update conversation history
    setConversationHistory(prev => [
      ...prev,
      { role: 'user', content },
      { role: 'assistant', content: assistantMessage.content }
    ])

  } catch (error) {
    console.error('Chat error:', error)
    setIsThinking(false)
    // Error handling...
  }
}
```

**Visual Streaming Indicator (optional enhancement):**
```typescript
// Add blinking cursor during streaming
const StreamingCursor = () => (
  <span className="animate-blink">▊</span>
)
```

**Files Modified:**
- `app/contexts/ChatContext.tsx` - Implement streaming response handler
- `app/components/chat/MessageList.tsx` - Add streaming cursor (optional)

**Expected Impact:**
- **Time to first token**: 3-8s → **300-700ms** (90% improvement)
- **Perceived responsiveness**: **10x better**
- **Actual completion time**: Same (2-5s), but user sees progress throughout

---

### Phase 3: Polish - System Prompt Optimization (2-3 hours) - OPTIONAL

#### 3.1 Cache Profession Config Per Team

**Service Changes (lib/services/OperationsAgentService.ts):**

```typescript
// Add in-memory cache at class level
private professionConfigCache = new Map<string, ProfessionConfig>()

private async getProfessionConfig(): Promise<ProfessionConfig> {
  const teamId = this.context.teamId

  // Return cached config if available
  if (this.professionConfigCache.has(teamId)) {
    return this.professionConfigCache.get(teamId)!
  }

  // Fetch from database
  const team = await this.context.teamScopedPrisma.raw.team.findUnique({
    where: { id: teamId },
    select: { profession: true }
  })

  const config = getProfessionConfig(team?.profession)
  this.professionConfigCache.set(teamId, config)

  return config
}

private async buildSystemPrompt(today: string): Promise<string> {
  const professionConfig = await this.getProfessionConfig()
  // ... rest of prompt building (now ~10-20ms instead of ~100ms)
}
```

#### 3.2 Pre-build Static Prompt Sections

```typescript
// At module level - built once at startup
const STATIC_PROMPT_SECTIONS = {
  introduction: `Você é um assistente financeiro especializado...`,
  capabilities: `
CAPACIDADES:

1. CONSULTAS:
- Buscar contratos, recebíveis e despesas
- Filtrar por data, status, cliente, etc.
...
  `,
  databaseSchema: `
DATABASE SCHEMA:

Contract {
  id: String (CUID)
  projectName: String
  ...
}
...
  `
}

// Dynamic assembly
private async buildSystemPrompt(today: string): Promise<string> {
  const professionConfig = await this.getProfessionConfig()
  const { terminology } = professionConfig

  return [
    STATIC_PROMPT_SECTIONS.introduction,
    `Data de hoje: ${today}`,
    `Team ID: ${this.context.teamId}`,
    `\n## Terminologia (${professionConfig.name}):\n`,
    `- ${terminology.contract}: ${terminology.client}`,
    // ... inject profession-specific terms
    STATIC_PROMPT_SECTIONS.capabilities,
    STATIC_PROMPT_SECTIONS.databaseSchema
  ].join('\n\n')
}
```

**Files Modified:**
- `lib/services/OperationsAgentService.ts` - Cache profession config, pre-build static sections

**Expected Impact:**
- Prompt build time: ~100ms → ~10-20ms (~5% total improvement)
- Cleaner, more maintainable code structure

---

### Migration Strategy

**Rollout Plan:**
1. **Week 1 - Phase 1**: Deploy optimistic UI + prompt caching
   - Low risk, immediate user-facing improvement
   - Gather baseline latency metrics
   - Monitor cost reduction from caching

2. **Week 2 - Phase 2**: Deploy streaming (beta flag)
   - Enable for internal testing first
   - Monitor streaming stability and error rates
   - Validate conversation history integrity
   - Test tool calls during streaming

3. **Week 3 - Phase 2**: Full streaming rollout
   - Enable for all users
   - Monitor time-to-first-token metrics
   - Gather user feedback on responsiveness

4. **Week 4 - Phase 3** (optional): System prompt optimization
   - Deploy if additional optimization needed
   - Otherwise, keep in backlog

**Backward Compatibility:**
- Keep non-streaming endpoint available (`stream: false` parameter)
- Graceful fallback if streaming fails
- Preserve all existing chat functionality

**Testing Strategy:**
- Unit tests for streaming response handling
- Integration tests for tool calls during streaming
- E2E tests for conversation history integrity
- Load tests for concurrent streaming connections
- Error scenario tests (network interruption, streaming failure)

**Monitoring:**
- Track time-to-first-token metrics (target: <1s for 95th percentile)
- Monitor streaming error rates (target: <1%)
- Measure cost reduction from prompt caching (expected: ~90% for cached tokens)
- Track user engagement metrics (session length, messages per session)
- Monitor API latency and success rates

### Timeline

**Phase 1 (1 hour):**
- Day 1 Morning: Optimistic UI (30 min)
- Day 1 Morning: Prompt caching (30 min)
- Day 1 Afternoon: Deploy to production, monitor metrics

**Phase 2 (4-6 hours):**
- Day 1 Afternoon: Backend streaming implementation (2-3 hours)
- Day 2 Morning: Frontend streaming implementation (2-3 hours)
- Day 2 Afternoon: Testing and beta deployment (1-2 hours)
- Day 3: Monitor beta, address issues
- Day 4: Full rollout to all users

**Phase 3 (2-3 hours) - Optional:**
- Week 2+: Prompt optimization if needed
- Otherwise, defer to backlog

## Consequences

### Positive Consequences

**User Experience:**
- ✅ **90% perceived latency reduction** (3-8s → <1s to first token)
- ✅ **10x better perceived responsiveness** - users see response immediately
- ✅ **Reduced anxiety** - no more "Is this working?" moments
- ✅ **Better first impression** - AI feels instant and responsive
- ✅ **Higher engagement** - users more likely to interact with AI features

**Performance:**
- ✅ **Sub-second to first token** (300-700ms vs. 3-8s)
- ✅ **Same total completion time** but perceived as much faster
- ✅ **200-350ms saved** on repeat requests (prompt caching)
- ✅ **Efficient streaming** with minimal server overhead

**Cost:**
- ✅ **90% cost reduction** for cached tokens (~400 tokens of system prompt)
- ✅ **No additional infrastructure cost** (uses existing Vercel AI SDK features)
- ✅ **ROI**: Cost savings pay for implementation time quickly

**Development:**
- ✅ **Industry standard pattern** - aligns with modern AI chat UX
- ✅ **Built-in SDK support** - not reinventing the wheel
- ✅ **Backward compatible** - non-streaming fallback available
- ✅ **Testable** - clear streaming contracts and error handling

### Negative Consequences

**Complexity:**
- ⚠️ **Frontend complexity increases** - need to manage streaming state
- ⚠️ **Conversation history management** slightly more complex during streaming
- ⚠️ **Error handling** must handle streaming interruptions (network issues, timeouts)
- ⚠️ **Testing complexity** - need to test streaming scenarios, tool calls, interruptions

**Edge Cases:**
- ⚠️ **Network interruptions** - must handle gracefully (reconnection strategy)
- ⚠️ **Slow connections** - streaming may appear choppy on slow networks
- ⚠️ **Tool calls mid-stream** - must pause streaming, execute tool, resume (handled by SDK)

**Technical Debt:**
- ⚠️ **Two code paths** - streaming and non-streaming (for backward compatibility)
- ⚠️ **Cache invalidation** - need to handle profession changes (edge case)

### Risks and Mitigation

**Risk 1: Streaming Reliability**
- **Risk**: Network issues cause streaming interruptions
- **Mitigation**:
  - Graceful fallback to non-streaming mode on failure
  - Implement retry logic with exponential backoff
  - Show "Connection lost, retrying..." message to user
  - Store partial response and resume where left off

**Risk 2: Conversation History Corruption**
- **Risk**: Streaming errors cause incomplete messages in history
- **Mitigation**:
  - Only add to history after streaming completes successfully
  - Mark incomplete messages with special flag
  - Implement history validation checks
  - Add rollback mechanism for failed streaming

**Risk 3: Performance Degradation**
- **Risk**: Streaming adds overhead for many concurrent connections
- **Mitigation**:
  - Monitor server resource usage and streaming connection counts
  - Implement connection pooling and rate limiting if needed
  - Use Next.js edge functions for streaming if necessary
  - Load test with realistic concurrent user scenarios

**Risk 4: Tool Call Interruptions**
- **Risk**: Tool calls during streaming cause UI confusion
- **Mitigation**:
  - Show "Executing action..." indicator during tool calls
  - Vercel AI SDK handles tool call pausing/resuming automatically
  - Test thoroughly with multi-tool scenarios
  - Display tool results inline in streaming response

**Risk 5: Prompt Cache Invalidation**
- **Risk**: Profession changes don't invalidate cache, causing wrong terminology
- **Mitigation**:
  - Use cache key that includes profession: `${teamId}-${profession}`
  - Set reasonable TTL (5 minutes matches Claude cache TTL)
  - Implement manual cache clear on profession update
  - Monitor for cache-related bugs in production

## Validation

### Success Criteria

**Performance Metrics (Primary):**
- ✅ Time-to-first-token < 1 second for 95% of requests (currently 3-8s)
- ✅ 90% perceived latency reduction
- ✅ Total response time remains ≤ current levels (2-5s for simple queries)
- ✅ Streaming error rate < 1%

**Cost Metrics:**
- ✅ 90% cost reduction for cached tokens (measured via Anthropic usage dashboard)
- ✅ Overall API cost reduction of ~30-40% (estimate)

**User Experience Metrics:**
- ✅ Chat engagement increases by ≥ 30% (messages per session)
- ✅ Chat completion rate increases to ≥ 95% (vs. ~60% current)
- ✅ User feedback: "Chat feels much faster" (qualitative)
- ✅ Reduced support tickets about "slow AI" or "is chat working?"

**Technical Metrics:**
- ✅ Zero regression in conversation history integrity (automated tests)
- ✅ Tool calls work correctly during streaming (100% success rate)
- ✅ Server CPU/memory usage remains stable (<10% increase)

### Measurement Plan

**Pre-Implementation Baseline (Week 0):**
- Record average time-to-first-response (current: 3-8s)
- Record chat completion rates (current: ~60%)
- Record messages per session (current: ~2-3 for engaged users)
- Record API costs per 1000 messages

**Post-Phase 1 (Week 1):**
- Measure perceived latency improvement (optimistic UI)
- Measure cost reduction from prompt caching
- Gather initial user feedback

**Post-Phase 2 (Week 2-3):**
- Measure time-to-first-token (target: <1s for 95th percentile)
- Measure streaming error rate (target: <1%)
- Measure chat engagement increase (target: +30%)
- Measure completion rate increase (target: ≥95%)

**Ongoing (Monthly):**
- Monitor latency trends (should remain <1s)
- Monitor cost trends (should see sustained reduction)
- Monitor streaming reliability (should maintain >99% success)

### Review Schedule

**Short-term Reviews:**
- **Week 1**: Review Phase 1 metrics, decide Phase 2 timeline
- **Week 3**: Review Phase 2 rollout, validate metrics
- **Month 1**: Comprehensive performance and cost review

**Long-term Reviews:**
- **Quarterly**: Performance and cost optimization review
- **Bi-annually**: Evaluate for new Claude API features (extended thinking, etc.)
- **Trigger Events**:
  - Streaming error rate exceeds 2%
  - Latency regression (>1.5s average time-to-first-token)
  - User complaints about chat responsiveness
  - Significant Claude API pricing or feature changes

## References

### Related Decisions
- [002: Claude Migration](./002-claude-migration.md): Original AI integration architecture
- [008: AI Agent Strategy](./008-ai-agent-strategy.md): Overall AI agent strategy and vision
- [017: Chat-First Onboarding](./017-chat-first-onboarding-redesign.md): Chat-first UX design

### External Resources
- [Vercel AI SDK - Streaming](https://sdk.vercel.ai/docs/ai-sdk-core/streaming): Official streaming documentation
- [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching): Claude prompt caching guide
- [ReadableStream API](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream): Web streams API documentation
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events): SSE pattern for streaming

### Implementation Details
- Backend service: `lib/services/OperationsAgentService.ts`
- API endpoint: `app/api/ai/operations/route.ts`
- Chat context: `app/contexts/ChatContext.tsx`
- UI components: `app/components/chat/MessageList.tsx`, `app/components/chat/ThinkingIndicator.tsx`

### Performance Analysis Source
- Original analysis document: `/CHAT_LATENCY_OPTIONS.md`
- Latency profiling data: Internal testing (October-November 2025)

---

*This ADR transforms the chat experience from blocking waits to real-time streaming, delivering 90% perceived latency reduction and positioning ArqCashflow's AI-first approach as best-in-class for financial management tools.*
