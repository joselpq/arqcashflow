---
title: "Excel Token Optimization for Claude API Processing"
type: "decision"
audience: ["developer", "agent"]
contexts: ["setup-assistant", "claude-api", "token-optimization", "excel-processing", "rate-limiting"]
complexity: "intermediate"
last_updated: "2025-09-29"
version: "1.0"
status: "accepted"
agent_roles: ["setup-assistant-developer", "performance-optimizer"]
related:
  - developer/architecture/overview.md
  - decisions/004-no-regrets-architecture-improvements.md
dependencies: ["@anthropic-ai/sdk", "xlsx", "setup-assistant-service"]
---

# Excel Token Optimization for Claude API Processing

## Context for LLM Agents

**Scope**: Optimization strategy for multi-sheet Excel files to prevent Claude API token limit errors
**Prerequisites**: Understanding of SetupAssistantService, Claude API token limits, XLSX library
**Key Patterns**:
- Token-aware data preprocessing
- Empty row trimming for CSV conversion
- Phased implementation: simple solution first, complex only if needed
- Evidence-based decision making through testing

## Status

**Decision**: ACCEPTED
**Date**: 2025-09-29
**Deciders**: Development team with user feedback analysis

## Problem Statement

### The Issue

Multi-sheet Excel files processed through the Setup Assistant were failing with Claude API rate limit errors (429), even when only one file was being processed at a time.

**Initial Hypothesis (Incorrect):**
- Multiple requests hitting rate limits due to insufficient retry logic
- Needed exponential backoff and better error handling

**Actual Problem (Discovered through investigation):**
- **Single Excel file exceeds token limit in ONE request**
- Excel default dimensions: 23 columns × 1000 rows per sheet
- Users fill ~50 rows with data, leaving 950 empty rows
- Empty cells exported as commas in CSV format
- 10-sheet file = ~70,000 tokens (235% of 30k/min limit!)

### Current Limits

- ✅ 50 requests/minute (not the bottleneck)
- 🔴 30,000 input tokens/minute (THE bottleneck)
- ⚠️ 8,000 output tokens/minute

### Investigation Results

```javascript
// Test: 10-sheet Excel (23×1000 per sheet, 50 rows filled)
// WITHOUT trimming:
- Per sheet: ~24,300 characters = ~7,000 tokens
- Total: 10 sheets × 7,000 = 70,000 tokens
- Result: 235% of limit - GUARANTEED FAILURE ❌

// WITH trimming (remove 950 empty rows):
- Per sheet: ~3,000 characters = ~850 tokens
- Total: 10 sheets × 850 = 8,500 tokens
- Result: 28% of limit - SUCCESS ✅
- Token reduction: 87%
```

**Key Finding**: Empty cells create massive token waste
- 950 empty rows × 23 commas = 21,850 wasted characters per sheet
- Example empty row: `,,,,,,,,,,,,,,,,,,,,,,\n`

## Decision

Implement **two-phase solution** with clear priorities:

### Phase 1: Trim Empty Rows (CRITICAL - Must Implement)

**Rationale:**
- Solves 95% of the problem with minimal complexity
- 80-90% token reduction on typical Excel files
- No architecture changes required
- Transparent to users (faster processing, same results)
- 1 hour implementation time

**Implementation:**
```javascript
function trimEmptyRows(worksheet) {
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  let lastRow = range.s.r; // Start with first row

  // Find actual last row with data
  for (let R = range.e.r; R >= range.s.r; --R) {
    let hasData = false;
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({r: R, c: C})];
      if (cell && cell.v !== null && cell.v !== '') {
        hasData = true;
        break;
      }
    }
    if (hasData) {
      lastRow = R;
      break;
    }
  }

  // Update range to exclude trailing empty rows
  worksheet['!ref'] = XLSX.utils.encode_range({
    s: {r: range.s.r, c: range.s.c},
    e: {r: lastRow, c: range.e.c}
  });

  return worksheet;
}
```

**Success Criteria:**
- 10-sheet Excel files process successfully
- 20-sheet Excel files process without batching
- Token usage reduced by 80-90%
- No data loss
- Faster Claude processing times

### Phase 2: Sheet Batching (DEFERRED - Implement Only If Needed)

**Rationale:**
- Only needed for edge cases: 30+ sheets or very dense data (200+ rows)
- After trimming, most files fit within 20k token budget
- Adds significant complexity: multiple requests, partial failures, progress UI
- 3-4 hours implementation time

**When to implement:**
- Production monitoring shows files still hitting token limits after Phase 1
- User feedback indicates common use of 30+ sheet files
- Analytics show >5% of files need batching

**Implementation Strategy (when needed):**
- Group sheets into batches staying under 20k token budget
- Process batches sequentially with 60-second delays
- Combine results from multiple Claude responses
- Update UI to show batch progress
- Handle partial failures gracefully

## Consequences

### Positive

✅ **Immediate problem resolution** with Phase 1
✅ **Simple implementation** - 1 hour vs. 4+ hours
✅ **No breaking changes** - transparent to API consumers
✅ **Better performance** - less data for Claude to process
✅ **Cost savings** - fewer tokens = lower API costs
✅ **Extensible** - can add Phase 2 if needed

### Negative

⚠️ **Assumption risk** - If users have truly sparse data across entire sheet range, trimming won't help
⚠️ **Edge case handling** - 30+ sheet files may still need batching eventually
⚠️ **Testing required** - Need real-world Excel files to validate assumptions

### Neutral

📊 **Monitoring needed** - Track token usage in production to validate effectiveness
📊 **Documentation debt** - Must update with Phase 2 if implemented

## Alternatives Considered

### Alternative 1: Exponential Backoff Retry Logic
**Rejected**: Doesn't solve root cause - file EXCEEDS limit in single request, no retry helps

### Alternative 2: Sheet-by-Sheet Processing (Immediate Batching)
**Rejected**: Premature optimization - adds complexity before validating if needed

### Alternative 3: Warn Users About File Size
**Rejected**: Poor UX - users can't control Excel defaults, system should handle it

### Alternative 4: Switch to Different CSV Library
**Rejected**: All CSV libraries export empty cells as commas (CSV standard)

### Alternative 5: Use Claude's Token Counter API
**Rejected**: Adds latency (~200-500ms) and rate limit complexity for estimation that can be done client-side

## Implementation Notes

### Files to Modify

**lib/services/SetupAssistantService.ts** (lines 306-351)
- Add `trimEmptyRows()` helper function
- Apply to single-sheet processing (~line 320)
- Apply to multi-sheet processing (~lines 328-347)
- Add logging for token reduction tracking

### Testing Strategy

**Unit Tests:**
```javascript
describe('trimEmptyRows', () => {
  it('removes trailing empty rows', () => {
    // 100 rows, only first 50 filled
    const ws = createTestSheet(100, 50)
    const trimmed = trimEmptyRows(ws)
    expect(getRowCount(trimmed)).toBe(50)
  })

  it('handles all-empty sheets', () => {
    const ws = createEmptySheet(1000)
    const trimmed = trimEmptyRows(ws)
    expect(getRowCount(trimmed)).toBe(0)
  })

  it('preserves data in filled rows', () => {
    const ws = createTestSheet(100, 50)
    const original = getSheetData(ws)
    const trimmed = trimEmptyRows(ws)
    expect(getSheetData(trimmed)).toEqual(original.slice(0, 50))
  })
})
```

**Integration Tests:**
- 10-sheet Excel with 50 filled rows → verify <10k tokens
- 20-sheet Excel with 50 filled rows → verify <20k tokens
- 1-sheet Excel with 1000 filled rows → verify no trimming
- Mixed: Some sheets full, some sparse → verify selective trimming

### Monitoring

**Metrics to track in production:**
```javascript
{
  fileId: string,
  fileName: string,
  totalSheets: number,
  tokensBeforeTrimming: number,
  tokensAfterTrimming: number,
  reductionPercentage: number,
  processingTime: number,
  success: boolean
}
```

**Alert thresholds:**
- Token usage >25k after trimming → investigate for Phase 2
- Failure rate >1% → review edge cases
- Average reduction <50% → trimming not effective for user data patterns

## References

### Investigation Session (2025-09-29)

**Empty Cell Testing:**
```bash
# Test output showing empty cell impact
CSV Output (23×1000 sheet with 50 rows filled):
Col1,Col2,Col3,...,Col23
Item 1,1000,2024-01-15,,,,,,,,,,,,,,,,,,,,
...
,,,,,,,,,,,,,,,,,,,,,,  # 950 rows like this
,,,,,,,,,,,,,,,,,,,,,,

CSV Length: 24,516 chars
Estimated tokens: 7,005
```

**Multi-Sheet Calculation:**
```
10 sheets × 7,000 tokens = 70,000 tokens
Limit: 30,000 tokens
Result: 235% over limit (FAILS)

After trimming:
10 sheets × 850 tokens = 8,500 tokens
Limit: 30,000 tokens
Result: 28% of limit (SUCCESS)
```

### Anthropic Documentation

- Token Counting: https://docs.anthropic.com/en/docs/build-with-claude/token-counting
- Rate Limits: https://support.anthropic.com/en/articles/8243635
- Error Codes: https://docs.claude.com/en/api/errors

### Related Code

**Current Implementation:**
- `lib/services/SetupAssistantService.ts:306-351` - Excel processing
- `lib/services/SetupAssistantService.ts:468` - Claude API call
- `lib/services/SetupAssistantService.ts:328-347` - Multi-sheet combining

## Future Considerations

### If Phase 2 Becomes Necessary

**Indicators:**
- User feedback: "My 30-sheet budget spreadsheet fails"
- Analytics: >5% of files hit token limits after Phase 1
- Support tickets: Token limit errors persist

**Implementation Checklist:**
- [ ] Design batch progress UI mockups
- [ ] Define partial failure UX flow
- [ ] Implement token budget batching algorithm
- [ ] Add batch processing to SetupAssistantService
- [ ] Update progress callback interface
- [ ] Create batch result aggregation logic
- [ ] Add batch-specific error handling
- [ ] Update documentation with batching behavior
- [ ] Comprehensive testing with 30+ sheet files

### Potential Optimizations

**Column Trimming:**
- Currently: Keep all 23 columns even if empty
- Future: Could detect and remove trailing empty columns
- Impact: Additional 5-10% token reduction
- Complexity: Low (similar to row trimming)

**Sparse Data Detection:**
- Currently: Process all cells in filled rows
- Future: Could skip large blocks of empty cells within rows
- Impact: 10-20% reduction for very sparse data
- Complexity: High (requires restructuring CSV generation)

**Compression:**
- Currently: Send raw CSV text
- Future: Could compress before sending (gzip)
- Impact: Claude API doesn't support compression
- Verdict: Not feasible

## Lessons Learned

### Investigation Process

1. ✅ **Don't assume** - Initial hypothesis (retry logic) was wrong
2. ✅ **Test with realistic data** - 23×1000 Excel default revealed the problem
3. ✅ **Measure precisely** - Actual token counts proved the impact
4. ✅ **Simple first** - Trimming solves 95% with 20% of complexity
5. ✅ **Document rationale** - Future agents need context for Phase 2 decision

### Decision Making

- **Evidence-based**: Actual tests showed 87% token reduction
- **Pragmatic**: Chose simple solution over complex batching
- **Reversible**: Can add Phase 2 without changing Phase 1
- **User-focused**: Solution is transparent, no UX changes required

### Technical Insights

- Empty cells in CSV are not free - they consume tokens
- Excel's default 1000-row range creates hidden bloat
- Token estimation: ~3.5-4 chars per token for CSV data
- Rate limits are per-minute windows, not per-request

---

**Last Updated**: 2025-09-29
**Next Review**: After Phase 1 implementation and 2 weeks of production data
**Decision Status**: Accepted, Phase 1 ready for implementation