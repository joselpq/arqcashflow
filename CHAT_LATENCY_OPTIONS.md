# Chat Latency Optimization - Options Analysis

> **📋 STATUS UPDATE (2025-11-04)**: This analysis has been formalized into **[ADR-020: Chat Streaming for Sub-Second Response Latency](docs/docs-site/docs/developer/architecture/decisions/adr-020-chat-streaming-latency.md)**
>
> **Next Steps**: Refer to ADR-020 for the official decision, rationale, and implementation plan. This document is preserved for reference and detailed technical analysis.

**Date**: 2025-11-03 (Formalized: 2025-11-04)
**Current Status**: Chat works but users perceive lag (no streaming, blocking response)
**Goal**: Sub-second time-to-first-token, improved perceived responsiveness
**Decision**: Accepted (see ADR-020)

---

## 🔍 **Current Architecture Analysis**

### **How It Works Now**

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
generateText() [Vercel AI SDK] - BLOCKING CALL
  ↓ (waits for complete response)
Response returned to frontend
  ↓
Message displayed
```

**Key Bottlenecks Identified:**

1. **No Streaming** ⚠️ CRITICAL
   - Uses `generateText()` instead of `streamText()`
   - Frontend waits for entire response before showing anything
   - User sees loading spinner for 3-8 seconds

2. **Long System Prompt** ⚠️ MEDIUM
   - ~635 lines of system prompt generated dynamically
   - Includes full database schema, API documentation, examples
   - Built on EVERY request (no caching)
   - Profession-aware (fetches team data from DB on each request)

3. **Database Queries in Prompt Generation** ⚠️ LOW
   - Line 343: `team.findUnique()` to get profession
   - Adds ~50-100ms latency before Claude API call even starts

4. **No Prompt Caching** ⚠️ MEDIUM
   - Claude API supports prompt caching (first 1024 tokens cached)
   - Current implementation doesn't use it
   - Could reduce cost 90% + improve latency for repeat users

5. **Synchronous Tool Calls** ℹ️ INFO
   - Tool calls happen sequentially (expected behavior)
   - Not a bottleneck (happens during streaming theoretically)

---

## 🎯 **Latency Breakdown Estimate**

Current user experience timeline:
```
User hits send
  ↓
[Frontend processing: ~10ms]
  ↓
[Network to server: ~50-100ms]
  ↓
[Auth + team context: ~50ms]
  ↓
[System prompt generation: ~50-100ms]
  ├── DB query for profession: ~30-50ms
  └── String building: ~20-50ms
  ↓
[Claude API call initiation: ~200-400ms]
  ↓
[Claude processing + generation: ~2-6 seconds] ⚠️ BLOCKING
  ├── Initial thinking: ~500ms-1s
  ├── Response generation: ~1.5-5s
  └── Tool calls (if needed): +1-3s
  ↓
[Network response: ~50-100ms]
  ↓
[Frontend render: ~10-20ms]
  ↓
USER SEES RESPONSE

TOTAL PERCEIVED LATENCY: ~3-8 seconds
```

**Target after optimization:**
```
Time to first token: <1 second (ideally 300-500ms)
Streaming tokens visible: Immediate after first token
Total completion: 2-5 seconds (but perceived as instant)
```

---

## 💡 **OPTION 1: Implement Streaming (HIGHEST IMPACT)**

### **What It Means**
Replace `generateText()` with `streamText()` and stream response tokens to frontend as they arrive.

### **Implementation Changes**

**Backend (OperationsAgentService.ts):**
```typescript
// BEFORE (current)
const result = await generateText({
  model: this.anthropic('claude-sonnet-4-20250514'),
  system: systemPrompt,
  messages: [...history, { role: 'user', content: message }],
  tools: { query_database, call_service }
})
return { success: true, message: result.text }

// AFTER (streaming)
import { streamText } from 'ai'

const result = streamText({
  model: this.anthropic('claude-sonnet-4-20250514'),
  system: systemPrompt,
  messages: [...history, { role: 'user', content: message }],
  tools: { query_database, call_service }
})

return result.toDataStreamResponse() // Returns ReadableStream
```

**Frontend (ChatContext.tsx):**
```typescript
// BEFORE (current)
const response = await fetch('/api/ai/operations', {...})
const result = await response.json()
setMessages([...newMessages, { role: 'assistant', content: result.message }])

// AFTER (streaming)
const response = await fetch('/api/ai/operations', {...})
const reader = response.body?.getReader()
const decoder = new TextDecoder()

// Create assistant message container
const assistantMessage = { role: 'assistant', content: '', timestamp: new Date() }
setMessages([...newMessages, assistantMessage])

// Stream tokens as they arrive
while (true) {
  const { done, value } = await reader!.read()
  if (done) break

  const chunk = decoder.decode(value)
  assistantMessage.content += chunk
  setMessages(prev => [...prev.slice(0, -1), { ...assistantMessage }])
}
```

### **Pros**
- ✅ **MASSIVE perceived latency reduction** (3-8s → <1s to first token)
- ✅ Users see response immediately as Claude thinks
- ✅ Vercel AI SDK has built-in streaming support (easy integration)
- ✅ Works seamlessly with tool calls (tools execute, then streaming continues)
- ✅ Industry standard pattern (ChatGPT, Claude Web, etc. all use this)
- ✅ No infrastructure changes needed

### **Cons**
- ⚠️ Frontend complexity increases (need to handle streaming state)
- ⚠️ Conversation history management slightly more complex
- ⚠️ Need to handle streaming errors/interruptions gracefully
- ⚠️ ~4-6 hours implementation time

### **Complexity**
- **Backend**: LOW (Vercel AI SDK makes this easy)
- **Frontend**: MEDIUM (need streaming UI patterns)
- **Testing**: MEDIUM (need to test interruptions, tool calls during streaming)

### **Estimated Impact**
- **Time to first token**: 3-8s → **300-700ms** (90% improvement)
- **Perceived responsiveness**: **10x better**
- **Actual completion time**: Same (2-5s)

---

## 💡 **OPTION 2: Implement Prompt Caching (COST + LATENCY)**

### **What It Means**
Use Claude's prompt caching feature to cache the system prompt (database schema, API docs, rules).

### **How It Works**
```typescript
// Mark system prompt as cacheable
const result = streamText({
  model: this.anthropic('claude-sonnet-4-20250514'),
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' } // ✅ Cache this!
    }
  ],
  messages: [...history, { role: 'user', content: message }]
})
```

**Caching Behavior:**
- First request: Full prompt processed (~400ms)
- Subsequent requests (same user, within 5 min): Cached prompt used (~50ms)
- Cache TTL: 5 minutes
- Cost reduction: 90% for cached tokens

### **Pros**
- ✅ Reduces API latency by ~200-350ms for repeat requests
- ✅ Reduces cost by ~90% for cached portion
- ✅ Easy to implement (~1 hour)
- ✅ Works with both `generateText()` and `streamText()`
- ✅ Official Anthropic feature (well-supported)

### **Cons**
- ⚠️ Only helps repeat users within 5-minute window
- ⚠️ Doesn't help first-time user experience
- ⚠️ Cache invalidation if profession changes (edge case)
- ⚠️ Still doesn't solve the "no streaming" problem

### **Complexity**
- **Implementation**: VERY LOW (1-line change + testing)
- **Testing**: LOW

### **Estimated Impact**
- **Time to first token**: 3-8s → **2.5-7s** (15-20% improvement for repeat users)
- **Cost reduction**: **~90% for cached tokens**
- **Best combined with**: Option 1 (streaming)

---

## 💡 **OPTION 3: Optimize System Prompt (BUILD TIME)**

### **What It Means**
Reduce system prompt generation time by caching or pre-building parts of it.

### **Current Bottleneck**
```typescript
// EVERY request does this (line 338-635)
private async buildSystemPrompt(today: string): Promise<string> {
  // 1. DB query to get team profession (~30-50ms)
  const team = await this.context.teamScopedPrisma.raw.team.findUnique(...)

  // 2. Get profession config
  const professionConfig = getProfessionConfig(team?.profession)

  // 3. Build 635-line string with template literals
  return `Você é um assistente financeiro...` // Long string
}
```

### **Optimization Approach**

**Strategy A: Cache profession config per team**
```typescript
// Cache profession config in memory (per request lifecycle)
private professionConfigCache = new Map<string, ProfessionConfig>()

private async buildSystemPrompt(today: string): Promise<string> {
  const teamId = this.context.teamId

  if (!this.professionConfigCache.has(teamId)) {
    const team = await this.context.teamScopedPrisma.raw.team.findUnique(...)
    this.professionConfigCache.set(teamId, getProfessionConfig(team?.profession))
  }

  const professionConfig = this.professionConfigCache.get(teamId)!
  // ... build prompt
}
```

**Strategy B: Move static parts to constants**
```typescript
// Pre-build static sections at module load time
const STATIC_PROMPT_SECTIONS = {
  introduction: `Você é um assistente financeiro...`,
  capabilities: `CAPACIDADES:\n\n1. CONSULTAS:...`,
  databaseSchema: `DATABASE SCHEMA:\n\nContract:...`,
  // etc.
}

// Only build dynamic parts (today, teamId, profession terms)
private async buildSystemPrompt(today: string): Promise<string> {
  const professionConfig = await this.getProfessionConfig()

  return [
    STATIC_PROMPT_SECTIONS.introduction,
    `Data de hoje: ${today}`,
    `Team ID: ${this.context.teamId}`,
    // ... inject profession-specific terms
  ].join('\n\n')
}
```

### **Pros**
- ✅ Reduces prompt build time from ~100ms → ~10-20ms
- ✅ Reduces DB queries (profession lookup cached)
- ✅ More maintainable code (sections separated)
- ✅ Easy to implement (~2-3 hours)

### **Cons**
- ⚠️ Only saves ~80-100ms
- ⚠️ Still doesn't solve the "no streaming" problem
- ⚠️ Cache invalidation complexity if profession changes mid-session

### **Complexity**
- **Implementation**: MEDIUM
- **Testing**: LOW

### **Estimated Impact**
- **Time to first token**: 3-8s → **2.9-7.9s** (~5% improvement)
- **Not worth it alone**, but good hygiene for Option 1+2

---

## 💡 **OPTION 4: Parallel Prompt Generation + API Call (ADVANCED)**

### **What It Means**
Start Claude API call before system prompt is fully built by using a two-phase approach.

### **Implementation Strategy**
```typescript
async processCommand(message: string, history: CoreMessage[]) {
  // Phase 1: Start with minimal prompt, upgrade later
  const minimalPrompt = this.buildMinimalPrompt() // ~10ms

  // Phase 2: Build full prompt in background
  const fullPromptPromise = this.buildSystemPrompt(today)

  // Start streaming with minimal prompt
  const result = streamText({
    model: this.anthropic('claude-sonnet-4-20250514'),
    system: minimalPrompt,
    messages: [...history, { role: 'user', content: message }]
  })

  // ... stream response
}
```

### **Pros**
- ✅ Saves ~100ms by parallelizing work
- ✅ Complex but clever optimization

### **Cons**
- ⚠️ Very complex to implement correctly
- ⚠️ Minimal prompt may not have all context (quality degradation risk)
- ⚠️ Not worth the complexity for ~100ms gain
- ⚠️ Vercel AI SDK doesn't support "prompt swapping" mid-stream

### **Complexity**
- **Implementation**: VERY HIGH
- **Risk**: HIGH (quality degradation)

### **Estimated Impact**
- **Time to first token**: Saves ~100ms
- **NOT RECOMMENDED**: Complexity >> benefit

---

## 💡 **OPTION 5: Client-Side Optimistic UI (UX HACK)**

### **What It Means**
Show "thinking" state immediately with animated dots to make wait feel shorter.

### **Implementation**
```typescript
// When user sends message, immediately show:
"Arnaldo está pensando... 💭"
// With animated dots/spinner

// Then replace with actual response when it arrives
```

### **Pros**
- ✅ Extremely easy to implement (~30 minutes)
- ✅ Improves perceived responsiveness
- ✅ Works with current architecture (no backend changes)
- ✅ Can be combined with any other option

### **Cons**
- ⚠️ Doesn't actually reduce latency (just perception)
- ⚠️ Users might still feel it's slow after novelty wears off
- ⚠️ Doesn't solve the core problem

### **Complexity**
- **Implementation**: VERY LOW
- **Impact**: MEDIUM (perception only)

### **Estimated Impact**
- **Actual latency**: No change
- **Perceived latency**: ~20-30% better
- **Best as**: Quick win while implementing Option 1

---

## 📊 **COMPARISON MATRIX**

| Option | Impact | Effort | Cost | Risk | Time |
|--------|--------|--------|------|------|------|
| **1. Streaming** | 🟢🟢🟢🟢🟢 | 🟡🟡🟡 | Free | Low | 4-6h |
| **2. Prompt Caching** | 🟢🟢 | 🟢 | 90% ↓ | Low | 1h |
| **3. Optimize Prompt** | 🟡 | 🟡🟡 | Free | Low | 2-3h |
| **4. Parallel Build** | 🟡 | 🔴🔴🔴🔴 | Free | High | 8-12h |
| **5. Optimistic UI** | 🟡🟡 | 🟢 | Free | None | 30m |

**Legend:**
- 🟢 = Low/Easy/Good
- 🟡 = Medium/Moderate
- 🔴 = High/Hard/Risky

---

## 🎯 **RECOMMENDED APPROACH**

### **Phase 1: Immediate Win (Day 1 - 1 hour)**
✅ **Option 5** - Optimistic UI with "thinking" indicator
✅ **Option 2** - Prompt caching (1-line change)

**Result:** 15-20% improvement + better UX perception

---

### **Phase 2: Core Fix (Day 1-2 - 4-6 hours)**
✅ **Option 1** - Implement streaming (CRITICAL)

**Changes needed:**
1. Backend: Replace `generateText()` → `streamText()`
2. Frontend: Implement streaming response handler
3. Update conversation history management for streaming
4. Test tool calls during streaming
5. Handle streaming errors gracefully

**Result:** 90% perceived latency reduction (3-8s → <1s to first token)

---

### **Phase 3: Polish (Day 3 - 2-3 hours)**
✅ **Option 3** - Optimize system prompt generation (optional)

**Result:** Additional ~5% improvement + cleaner code

---

## 🚀 **IMPLEMENTATION PRIORITY**

**If you can only do ONE thing:**
→ **Implement streaming (Option 1)**

**If you have 1 hour:**
→ **Optimistic UI + Prompt caching (Options 2 + 5)**

**If you have 1 day:**
→ **All of Phase 1 + Phase 2 (Options 1, 2, 5)**

**If you have 3 days:**
→ **Full implementation (Options 1, 2, 3, 5)**

---

## 📋 **NEXT STEPS**

1. **Decision**: Which option(s) to implement?
2. **ADR**: Create ADR-020 to document decision
3. **Implementation**: Follow phased approach above
4. **Testing**: Before/after latency measurements
5. **Deploy**: Gradual rollout with monitoring

---

**Questions to Answer:**
- How much time do we have?
- What's the minimum viable improvement?
- Are we willing to change frontend streaming patterns?
- Should we prioritize cost savings (caching) or UX (streaming)?
