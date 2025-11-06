---
title: "ADR-022: File Import Speed Optimization"
type: "decision"
date: "2025-11-05"
status: "accepted"
contexts: ["setup-assistant", "performance", "api", "database"]
related:
  - 016-setup-assistant-simple-extraction-attempt.md
  - 020-chat-streaming-latency.md
---

# ADR-022: File Import Speed Optimization

## Status
**ACCEPTED** - 2025-11-05

## Context

### Problem Statement

File import processing through SetupAssistantService takes 2-3 minutes for typical files (4-sheet Excel with 100 entities), significantly impacting user onboarding experience. Analysis identified two critical bottlenecks:

1. **Phase 2 Claude API extraction** (80-85% of time): 60-100 seconds
2. **Database bulk creation** (15-20% of time): 10-28 seconds

### Current Performance Baseline

**Time Breakdown (4-sheet Excel, 100 entities):**
- Upload: 2s (2%)
- XLSX parsing: 0.5s (<1%)
- Sheet extraction: 0.7s (1%)
- **Phase 1 Analysis**: 5s (4%)
- **Phase 2 Extraction**: 60-100s (80-85%) ⚠️ **CRITICAL BOTTLENECK**
- Post-processing: 0.7s (1%)
- **Bulk Creation**: 19s (15-20%) ⚠️ **MEDIUM BOTTLENECK**
- Contract mapping: 0.25s (<1%)
- Response: 0.1s (<1%)

**Total**: 90-130 seconds (1.5-2.2 minutes)

**Goal**: Reduce to 60-90 seconds (40-50% improvement)

### Analysis Documents

Complete analysis in:
- `FILE_IMPORT_SPEED_ANALYSIS.md` - Initial high-level analysis
- `FILE_IMPORT_DEEP_ANALYSIS.md` - Detailed step-by-step breakdown

### Bottleneck Root Causes

#### Bottleneck 1: Phase 2 Claude API (80-85% of time)
```typescript
// Current implementation per sheet
await this.anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',  // Slow but accurate
  max_tokens: 16000,
  thinking: { type: 'enabled', budget_tokens: 10000 }  // Heavy thinking
})
```

**Issues:**
- Sonnet 4 is slow (15-30s per sheet)
- 10,000 thinking tokens per sheet (adds 5-10s)
- No prompt caching (full 3000-5000 token prompt per sheet)

#### Bottleneck 2: Database Bulk Creation (15-20% of time)
```typescript
// Current implementation
for (const item of items) {
  await this.validateBusinessRules(item)  // 50-150ms + DB query
  await model.create({ data: item })       // 20-50ms
  await auditLog.create({ data: audit })   // 30-80ms
}
```

**Issues:**
- Sequential creation (100-280ms per entity)
- Per-entity validation with duplicate checks (DB queries)
- Per-entity audit logging (N database inserts)
- Not using Prisma `createMany` batch optimization

## Decision

Implement three optimizations in prioritized phases:

### Phase 1: Core Optimizations (Tier 1)

#### 1A. Switch Phase 2 to Claude Haiku 4.5
**Model**: `claude-haiku-4-5-20250514`
**Thinking Budget**: 5000 tokens (reduced from 10000)

**Rationale:**
- Haiku 4.5 is 4-5x faster than Sonnet 4
- Achieves 73.3% on SWE-bench (sufficient for structured extraction)
- 67% cost reduction ($3/M → $1/M input tokens)
- Drop-in replacement (same API)

**Risk Mitigation:**
- Feature flag for Haiku vs Sonnet toggle
- A/B testing with 10% of users initially
- Manual validation with 10-20 diverse files
- Gradual rollout: 10% → 25% → 50% → 100%
- Auto-fallback to Sonnet if accuracy < 85%
- Monitor extraction accuracy metrics

**Expected Improvement:**
- Per sheet: 15-30s → 3-6s (75-80% faster)
- 4 sheets parallel: 60-100s → 12-20s
- **Total impact**: 48-80 seconds saved

#### 1B. Implement Prisma `createMany` for Bulk Operations
**Replace**: Sequential `create()` calls
**With**: Batch `createMany()` operations

**Implementation:**
```typescript
// Validate all entities upfront (parallel)
await Promise.all(
  items.map(item => this.validateBusinessRules(item))
)

// Batch insert entities
await model.createMany({
  data: items,
  skipDuplicates: true
})

// Batch insert audit logs
await auditLog.createMany({
  data: auditLogs
})
```

**Rationale:**
- Prisma native feature (well-tested)
- Reduces per-entity overhead from 100-280ms → 10-20ms
- Zero accuracy risk (same validation, just batched)
- Easy rollback if issues

**Expected Improvement:**
- 100 entities: 10-28s → 1-2s (85-90% faster)
- **Total impact**: 16-17 seconds saved

### Phase 2: Cost Optimization (Tier 2)

#### 2. Implement Prompt Caching
**Cache**: Static prompt parts (schema, profession config, examples)
**Dynamic**: Only sheet-specific data

**Implementation:**
```typescript
await this.anthropic.messages.create({
  model: 'claude-haiku-4-5-20250514',
  system: [{
    type: 'text',
    text: staticPrompt,  // 2500 tokens
    cache_control: { type: 'ephemeral' }  // ✅ Cache this
  }],
  messages: [{
    role: 'user',
    content: sheetData.csv  // Dynamic 500-1500 tokens
  }]
})
```

**Rationale:**
- 90% cost reduction on cached tokens
- 5-10% speed improvement
- Anthropic native feature (well-supported)
- Works best with Haiku (cache Haiku prompts)

**Expected Improvement:**
- Speed: 0.5-1 second additional improvement
- **Cost**: 90% reduction on ~2500 cached tokens per sheet

## Consequences

### Expected Results

#### Performance
**Before Optimization:**
- 2-sheet file: 45-60s
- 4-sheet file: 90-120s
- 6-sheet file: 150-180s

**After Phase 1 (Haiku + createMany):**
- 2-sheet file: 15-25s ✅ (60-75% improvement)
- 4-sheet file: 20-35s ✅ (75-80% improvement)
- 6-sheet file: 30-50s ✅ (75-80% improvement)

**After Phase 2 (+ Prompt Caching):**
- 2-sheet file: 13-21s ✅ (65-80% improvement)
- 4-sheet file: 18-30s ✅ (75-85% improvement)
- 6-sheet file: 28-45s ✅ (75-85% improvement)

**Goal Achievement**: ✅ Exceeds target of 40-50% improvement

#### Cost Savings

**Current Cost per File** (4-sheet Excel):
- Phase 1: $0.03
- Phase 2: $0.35 (4 sheets with Sonnet)
- **Total**: $0.38

**After Haiku Optimization:**
- Phase 1: $0.007 (Haiku)
- Phase 2: $0.096 (Haiku, 4 sheets)
- **Total**: $0.10 (74% reduction)

**After Prompt Caching:**
- **Total**: $0.09 (76% reduction)

**Monthly Savings** (1000 files):
- Current: $380/month
- Optimized: $90/month
- **Savings**: $290/month ($3,480/year)

### Positive Consequences

1. **Massive Speed Improvement**: 75-85% faster processing
2. **Better User Experience**: Sub-minute onboarding for most files
3. **Cost Reduction**: 76% cheaper per file
4. **Maintained Reliability**: Sequential optimizations with rollback capability
5. **Scalability**: Better handling of large files (10+ sheets)

### Negative Consequences & Risks

1. **Haiku Accuracy Risk** (MEDIUM)
   - Haiku may extract entities with lower accuracy than Sonnet
   - Mitigation: Feature flag, A/B testing, gradual rollout, auto-fallback

2. **Batch Insert Trade-offs** (LOW)
   - Loses individual error handling (all-or-nothing per batch)
   - Mitigation: Validate all upfront, batch sizes of 500-1000 entities

3. **Development Effort** (LOW)
   - 5-6 hours total implementation time
   - 2-3 hours testing and validation
   - Acceptable for 75-85% improvement

4. **Prompt Caching Complexity** (LOW)
   - 5-minute cache TTL
   - Cache invalidation on profession changes
   - Minimal risk (transparent fallback to uncached)

### Monitoring & Success Criteria

#### Performance Metrics
- ✅ Average processing time: < 30s for 4-sheet files
- ✅ 95th percentile: < 50s for 6-sheet files
- ✅ P99: < 90s for complex files (10+ sheets)

#### Accuracy Metrics
- ✅ Extraction accuracy ≥ 90% (manual validation)
- ✅ Entity count within 5% of Sonnet baseline
- ✅ No systematic extraction errors

#### Cost Metrics
- ✅ Average cost: < $0.10 per file
- ✅ Monthly spend: < $100 for 1000 files

#### User Metrics
- ✅ Onboarding completion rate ≥ 85%
- ✅ User satisfaction with import speed ≥ 4/5

## Implementation Plan

### Phase 1: Core Optimizations (Days 1-2)

**Day 1 Morning: Prisma createMany (2-3 hours)**
1. Refactor `BaseService.bulkCreate()`:
   - Implement parallel validation with `Promise.all()`
   - Replace sequential creates with `createMany()`
   - Batch audit logs per entity type
2. Test with 100-entity file
3. Verify entity creation accuracy

**Day 1 Afternoon: Haiku Implementation (1 hour)**
1. Add environment variable: `SETUP_ASSISTANT_USE_HAIKU`
2. Update `extractSheet()` and `analyzeFileStructure()`:
   - Model: `claude-haiku-4-5-20250514`
   - Thinking budget: Phase 1 (2000), Phase 2 (5000)
3. Feature flag logic for easy toggle

**Day 2: Testing & Validation (2-3 hours)**
1. Prepare test suite:
   - 5 simple files (2-3 sheets, <50 rows)
   - 5 medium files (4-5 sheets, 100-150 rows)
   - 5 complex files (6+ sheets, cross-references)
2. Manual validation:
   - Compare entity counts (Haiku vs Sonnet baseline)
   - Validate extraction accuracy
   - Check edge cases (dates, amounts, references)
3. Document accuracy metrics

**Day 2-3: Gradual Rollout**
1. Enable for 10% of users
2. Monitor for 1-2 days
3. Increase to 25% → 50% → 100%
4. Rollback plan ready if issues

### Phase 2: Prompt Caching (Day 3-4)

**Day 3: Implementation (1-2 hours)**
1. Refactor prompt structure:
   - Split static (schema, rules) vs dynamic (sheet data)
   - Add cache control to static parts
2. Track cache hit rates
3. Verify cost savings in API logs

**Day 4: Validation**
1. Compare speed with/without caching
2. Verify 90% cost reduction on cached tokens
3. Full production rollout

### Phase 3: Monitoring (Ongoing)

**Instrumentation:**
```typescript
console.time('Phase 1: Analysis')
console.time('Phase 2: Extraction')
console.time('Bulk Creation')
// Track metrics per file type (XLSX, PDF)
```

**Dashboards:**
- Average processing time per file type
- Extraction accuracy rate
- Cost per file over time
- Cache hit rates

## Alternatives Considered

### Alternative 1: Remove Phase 1 Analysis
**Pros**: Saves 5 seconds
**Cons**: Loss of cross-sheet context, lower quality
**Decision**: REJECTED - Phase 1 provides valuable context for only 4% time cost

### Alternative 2: CSV Chunking
**Pros**: Smaller context per request
**Cons**: More API calls, chunking complexity, entity splitting issues
**Decision**: REJECTED - Haiku handles full sheets efficiently

### Alternative 3: Concurrent Limit (p-limit)
**Pros**: Prevents rate limiting for 10+ sheet files
**Cons**: Slows down typical files, solves problem that doesn't exist yet
**Decision**: DEFERRED - Revisit if rate limiting becomes an issue

### Alternative 4: XLSX Pre-processing Optimization
**Pros**: 20-30% faster parsing
**Cons**: Only saves 0.5 seconds (marginal impact)
**Decision**: DEFERRED - Low ROI, focus on bigger bottlenecks first

### Alternative 5: Skip Audit Logging for Bulk
**Pros**: Saves 3-8 seconds
**Cons**: Loses audit trail, product decision needed
**Decision**: DEFERRED - Batch audit logs instead (1 per entity type)

## Related Decisions

- **ADR-016**: Setup Assistant Simple Extraction - Original implementation
- **ADR-020**: Chat Streaming Latency - Similar performance optimization pattern
- **ADR-006**: Service Layer Migration - Foundation for bulk operations

## References

- Anthropic Claude Haiku 4.5 documentation: https://docs.anthropic.com/en/docs/about-claude/models/haiku
- Anthropic Prompt Caching: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- Prisma Bulk Operations: https://www.prisma.io/docs/orm/prisma-client/queries/crud#create-multiple-records
- Performance Analysis: `FILE_IMPORT_DEEP_ANALYSIS.md`

## Timeline

- **2025-11-05**: Decision accepted, analysis complete
- **2025-11-05**: Phase 1 implementation begins
- **2025-11-07**: Phase 1 testing complete, gradual rollout
- **2025-11-08**: Phase 2 implementation (prompt caching)
- **2025-11-09**: Full production rollout, monitoring active

---

**Decision Made By**: Engineering Team
**Approved By**: Product & Engineering
**Implementation Owner**: LLM Agent Team
**Status**: In Progress (Phase 1 implementation)
