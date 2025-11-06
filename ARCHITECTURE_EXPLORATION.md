# File Import Architecture Exploration

**Date**: 2025-11-06
**Goal**: Explore fundamentally better architectures for faster, more accurate file import

---

## 🏗️ **Current Architecture (Baseline)**

```
Phase 1: Analysis (5s Haiku)
  └─> Analyze all sheets → extraction plan (column mappings, types)

Phase 2: Sheet Extraction (12-20s per sheet × N sheets in parallel)
  ├─> Sheet 1: Extract all rows → JSON (12-20s)
  ├─> Sheet 2: Extract all rows → JSON (12-20s)
  └─> Sheet N: Extract all rows → JSON (12-20s)

Post-Process (1-2s)
  └─> Add defaults, filter invalid → validated JSON

Bulk Create (1-2s)
  └─> createMany → database

Total: 5s + 20s (bottleneck sheet) + 3s = 28s (best case with Haiku)
```

**Bottleneck**: Phase 2 extraction (80% of time)
- Large context window (full sheet CSV)
- Complex reasoning (extract + transform all rows)
- Single API call per sheet (no parallelization within sheet)

---

## 🎯 **Option 1: Tool-Based Agent Architecture**

### **Architecture**
```
Phase 1: Analysis (same)

Phase 2: Agent with createEntities Tool
  Claude: "I found 10 contracts in this CSV"
  ├─> Tool call: createContracts([{...}, {...}])
  │   └─> Server: Creates entities, returns success/failure
  ├─> Claude sees tool result, continues
  └─> Tool call: createReceivables([{...}])

No Post-Process or Bulk Create (done within tools)
```

### **Prompt Changes**
```xml
<tools>
<tool name="createContracts">
<description>Create multiple contracts in the database</description>
<parameters>
  <contracts>Array of contract objects matching schema</contracts>
</parameters>
</tool>
<tool name="createReceivables">...</tool>
<tool name="createExpenses">...</tool>
</tools>

Your task: Extract entities from this sheet and CREATE them using the tools above.
Call the tools as you extract data - you can make multiple tool calls.
```

### **Pros**
- ✅ **Error handling in real-time**: Claude sees "Contract 5 failed: duplicate" and can retry/fix
- ✅ **Streaming creation**: Creates entities as it extracts (feels faster to user)
- ✅ **Self-correcting**: Claude can adapt based on tool results
- ✅ **No post-processing needed**: Tools handle validation

### **Cons**
- ❌ **MUCH SLOWER**: Each tool call = round trip to API
  - Extract 10 → tool call → wait → extract 10 more → tool call
  - Estimate: 10-20 tool calls per sheet × 2-3s per call = **20-60s overhead per sheet**
- ❌ **No bulk optimization**: Loses createMany efficiency
- ❌ **Higher cost**: Multiple API calls instead of one
- ❌ **Complex state management**: Track partial success/failure across tool calls

### **Timing Estimate**
```
Phase 1: 5s
Phase 2 (with tools):
  - Extract batch 1 (5s) + tool call (2s) + Create (1s) = 8s
  - Extract batch 2 (5s) + tool call (2s) + Create (1s) = 8s
  - × 5 batches = 40s per sheet
Total: 5s + 40s = 45s (SLOWER than current)
```

### **Verdict**: ❌ **DON'T DO THIS**
- Worse in every dimension (speed, cost, complexity)
- Tool calls add massive latency overhead
- Bulk operations are much faster than iterative

---

## 🎯 **Option 2: Single-Phase Extraction (No Analysis)**

### **Architecture**
```
Single Phase: Analyze + Extract Everything (25-35s)
  └─> Send ALL sheet previews + full data
  └─> Claude: Analyze structure AND extract all entities in one call

Post-Process (1-2s)
Bulk Create (1-2s)

Total: 30s + 3s = 33s
```

### **Prompt Changes**
```
Here are ALL sheets from this Excel file:

Sheet 1 "Contratos" (full data):
[1000 rows CSV]

Sheet 2 "Recebíveis" (full data):
[500 rows CSV]

Your task:
1. Identify what type of data each sheet contains
2. Extract ALL entities from ALL sheets
3. Return complete JSON with all data

Output format:
{
  "contracts": [...],
  "receivables": [...],
  "expenses": [...]
}
```

### **Pros**
- ✅ **Simpler architecture**: One API call instead of N+1
- ✅ **No coordination overhead**: No need to merge results
- ✅ **Better context**: Claude sees all sheets together (can resolve references)

### **Cons**
- ❌ **Massive token usage**: All sheets × all rows = huge input
  - 4 sheets × 1000 rows each = 20K-40K input tokens
  - Exceeds Haiku's 200K context? Maybe not, but expensive
- ❌ **Output token limit**: 16K max tokens
  - 500 entities × 20 tokens each = 10K output tokens (close to limit!)
- ❌ **No parallelization**: Can't process sheets in parallel
- ❌ **Higher chance of truncation**: Claude might stop mid-extraction

### **Timing Estimate**
```
Single Phase:
  - Input: 30K tokens (all sheets)
  - Processing: 25-35s (large context, complex task)
  - Output: 10K tokens (might hit limit)
Total: 30s (similar to current best case)
```

### **Verdict**: ⚠️ **MARGINAL - ONLY FOR SMALL FILES**
- Good for: Small files (<200 entities across all sheets)
- Bad for: Large files (token limits, truncation risk)
- Loses parallelization benefit

---

## 🎯 **Option 3: Row-Level Parallelization (Chunking)**

### **Architecture**
```
Phase 1: Analysis (5s)

Phase 2: Row Chunks in Parallel (8-12s per chunk × M chunks in parallel)
  Sheet 1 (300 rows):
    ├─> Chunk 1 (rows 1-100): Extract → JSON (10s) ┐
    ├─> Chunk 2 (rows 101-200): Extract → JSON (10s) ├─> Parallel
    └─> Chunk 3 (rows 201-300): Extract → JSON (10s) ┘

  Sheet 2 (150 rows):
    ├─> Chunk 1 (rows 1-100): Extract → JSON (8s) ┐
    └─> Chunk 2 (rows 101-150): Extract → JSON (8s) ┘

Merge Results (0.5s)
Post-Process (1-2s)
Bulk Create (1-2s)

Total: 5s + 12s (longest chunk) + 4s = 21s
```

### **Implementation Strategy**

**Smart Chunking**:
```typescript
function chunkSheet(sheet: SheetData, chunkSize: number = 100) {
  const chunks = []
  const rows = sheet.csv.split('\n')
  const header = rows[0] // Keep header for context

  for (let i = 1; i < rows.length; i += chunkSize) {
    chunks.push({
      name: sheet.name,
      csv: header + '\n' + rows.slice(i, i + chunkSize).join('\n'),
      rowRange: [i, Math.min(i + chunkSize - 1, rows.length - 1)]
    })
  }
  return chunks
}
```

**Prompt for Chunk**:
```
CONTEXT:
- Sheet: "Recebíveis" (rows 101-200 of 300 total)
- Type: receivables
- Columns: {...}

IMPORTANT: This is a CHUNK of a larger sheet. Extract ONLY the rows you see below.

DATA (rows 101-200):
[100 rows CSV]

Extract all entities from these 100 rows only.
```

### **Pros**
- ✅ **Massive parallelization**: 10 chunks across 4 sheets = 40 parallel API calls
- ✅ **Smaller contexts**: 100 rows vs 1000 rows = faster per-chunk processing
- ✅ **Better latency**: Longest chunk = bottleneck (not longest sheet)
- ✅ **Scalable**: Works for any file size

### **Cons**
- ⚠️ **Context loss**: Each chunk doesn't see other chunks
  - Problem: Receivable in chunk 2 references contract from chunk 1
  - Solution: Pass project names from Phase 1 to all chunks
- ⚠️ **More API calls**: 40 calls vs 4 calls = higher cost
  - But: Cheaper per call (smaller context)
  - Net: Probably similar total cost
- ⚠️ **Merge complexity**: Need to combine results from 40 chunks
  - But: Simple array concatenation

### **Timing Estimate**
```
Phase 1: 5s (same)
Phase 2 (chunked, 100 rows per chunk):
  - 4 sheets × 3 chunks each = 12 chunks
  - Process in parallel (assume 4 concurrent)
  - Chunk processing: 8-12s (smaller context = faster)
  - 3 batches × 12s = 36s... wait, that's worse!

Actually with unlimited parallelization:
  - All 12 chunks start at once
  - Longest chunk = bottleneck = 12s
Total: 5s + 12s + 4s = 21s ✅ (25% faster!)
```

### **Rate Limiting Consideration**
```
Anthropic Rate Limits (Tier 2):
- 50 requests per minute
- 40K tokens per minute input

With 12 chunks starting at once:
- 12 requests in 1 second = OK (under 50/min)
- 12 × 3K tokens = 36K tokens = OK (under 40K/min)

✅ Rate limits not a problem for typical files
```

### **Verdict**: ✅ **PROMISING - TEST THIS**
- 25-40% faster for large files
- Scales well with file size
- Simple implementation (chunk + merge)

---

## 🎯 **Option 4: Hybrid - Column Mapping + Deterministic Extraction**

### **Architecture**
```
Phase 1: Column Mapping Only (3s Haiku)
  └─> For each sheet: Map columns to fields
      {"Projeto": "contractId", "Valor": "amount"}

Phase 2: Row Type Classification (5s Haiku, parallelized)
  └─> For each sheet: "Is row 1 a contract, receivable, or expense?"
      Returns: ["contract", "contract", "receivable", ...]

Phase 3: Deterministic Extraction (0.5s, no AI)
  └─> Use mappings + types to extract JSON directly
      No AI needed - just parse CSV with known structure
```

### **Implementation**

**Phase 1: Column Mapping**
```typescript
// Ultra-simple prompt
const prompt = `
Map these CSV columns to our schema:

Headers: ${headers.join(', ')}
Sheet type: ${sheetType}

Return JSON: {"csvColumn": "schemaField", ...}
`
// Output: {"Projeto": "contractId", "Valor": "amount"}
```

**Phase 2: Row Classification** (only if mixed entity types)
```typescript
const prompt = `
For each row, classify as: "contract", "receivable", "expense", or "skip"

CSV:
${first10Rows}

Return array: ["contract", "receivable", ...]
`
```

**Phase 3: Deterministic Extraction** (pure code)
```typescript
function extractWithMapping(csv: string, mapping: ColumnMapping, types: EntityType[]) {
  const rows = parseCSV(csv)
  return rows.map((row, idx) => {
    const type = types[idx]
    if (type === 'skip') return null

    const entity = {}
    for (const [csvCol, schemaField] of Object.entries(mapping)) {
      entity[schemaField] = transformValue(row[csvCol], schemaField)
    }
    return { type, data: entity }
  }).filter(Boolean)
}

function transformValue(value: string, field: string) {
  if (field.includes('Date')) return parseDate(value)
  if (field.includes('amount') || field.includes('Value')) return parseNumber(value)
  if (field === 'status') return normalizeStatus(value)
  return value
}
```

### **Pros**
- ✅ **MUCH FASTER**: Phase 3 is pure code (no AI)
  - Extraction time: 0.5s for 1000 rows (vs 20s with AI)
- ✅ **100% consistent**: Deterministic = no extraction variance
- ✅ **Cheaper**: Only 2 AI calls per sheet (vs 1 large call)
- ✅ **Scalable**: Extraction time = O(n) with constant factor

### **Cons**
- ⚠️ **Assumes clean data**: No fuzzy matching or inference
  - Problem: "Recebido" → "received" needs mapping
  - Solution: Pre-defined translation dictionaries
- ⚠️ **Rigid structure**: Can't handle weird edge cases
  - Problem: "Apartamento - Fulano (50%)" → needs parsing
  - Solution: Regex patterns for common formats
- ⚠️ **Two-phase complexity**: Need to coordinate mapping + extraction

### **Timing Estimate**
```
Phase 1 (mapping): 3s per sheet × 4 sheets = 12s (parallel) → 3s
Phase 2 (classification): 5s per sheet × 4 sheets = 20s (parallel) → 5s
Phase 3 (deterministic): 0.5s total (pure code)
Post-Process: 1s
Bulk Create: 2s

Total: 3s + 5s + 0.5s + 3s = 11.5s ✅ (60% faster!)
```

### **Verdict**: 🌟 **MOST PROMISING - HIGHEST UPSIDE**
- 60% faster than current
- 100% consistent extraction
- Cheapest option (fewer AI calls)
- **But**: Requires robust deterministic extraction logic

---

## 🎯 **Option 5: Hybrid Chunking + Deterministic**

### **Architecture**
Combine Option 3 (chunking) + Option 4 (deterministic):

```
Phase 1: Column Mapping (3s)
Phase 2: Row Classification - Chunked & Parallelized (3s)
  ├─> Chunk 1 (rows 1-100): Classify (3s) ┐
  ├─> Chunk 2 (rows 101-200): Classify (3s) ├─> Parallel
  └─> Chunk 3 (rows 201-300): Classify (3s) ┘
Phase 3: Deterministic Extraction (0.5s)
Phase 4: Bulk Create (2s)

Total: 3s + 3s + 0.5s + 2s = 8.5s ✅ (70% faster!)
```

### **Why This Is The Best**
- ✅ **Fastest**: 70% faster than current (28s → 8.5s)
- ✅ **Most scalable**: Chunking + deterministic = O(n) with low constant
- ✅ **Consistent**: Deterministic extraction = 100% reproducible
- ✅ **Cost-effective**: Fewer large AI calls, more small classification calls

---

## 📊 **Comparison Matrix**

| Option | Time (4 sheets, 400 entities) | Cost | Accuracy | Complexity | Scalability |
|--------|-------------------------------|------|----------|------------|-------------|
| **Current (Haiku optimized)** | 28s | $0.10 | 95-100% | Medium | Good |
| **1. Tool-Based** | 45s | $0.15 | 95-100% | High | Poor |
| **2. Single-Phase** | 33s | $0.12 | 90-95% | Low | Poor (token limits) |
| **3. Row Chunking** | 21s | $0.11 | 95-100% | Medium | Excellent |
| **4. Deterministic** | 11.5s | $0.06 | 98-100% | High | Excellent |
| **5. Chunked + Deterministic** | 8.5s | $0.05 | 98-100% | High | Excellent |

---

## 🏆 **Recommendations**

### **Short-Term (This Week)**
✅ **Implement Option 3: Row Chunking**
- **Why**: 25% speed improvement with low complexity
- **Effort**: 4-6 hours
- **Risk**: Low (chunk + merge is simple)
- **Expected**: 28s → 21s

### **Medium-Term (Next 2 Weeks)**
✅ **Implement Option 4: Deterministic Extraction**
- **Why**: 60% speed improvement, 100% consistency
- **Effort**: 1-2 weeks (need robust parsing logic)
- **Risk**: Medium (edge cases in data parsing)
- **Expected**: 28s → 11.5s

### **Long-Term (Phase 3)**
✅ **Implement Option 5: Chunked + Deterministic**
- **Why**: 70% speed improvement, ultimate scalability
- **Effort**: +2-3 days on top of Option 4
- **Risk**: Low (combining two proven approaches)
- **Expected**: 28s → 8.5s

---

## 🧪 **Proof of Concept - Deterministic Extraction**

```typescript
// Example: Deterministic extraction with column mapping

interface ColumnMapping {
  [csvColumn: string]: {
    field: string
    transform: 'date' | 'currency' | 'status' | 'text' | 'number'
  }
}

const mapping: ColumnMapping = {
  'Projeto': { field: 'contractId', transform: 'text' },
  'Valor': { field: 'amount', transform: 'currency' },
  'Data Esperada': { field: 'expectedDate', transform: 'date' },
  'Status': { field: 'status', transform: 'status' }
}

function extractRow(row: CSVRow, mapping: ColumnMapping, entityType: EntityType) {
  const entity: any = {}

  for (const [csvCol, config] of Object.entries(mapping)) {
    const rawValue = row[csvCol]
    entity[config.field] = transformValue(rawValue, config.transform)
  }

  return entity
}

function transformValue(value: string, type: TransformType): any {
  switch (type) {
    case 'currency':
      // "R$ 15.000,50" → 15000.50
      return parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.'))

    case 'date':
      // "15/04/2024" → "2024-04-15"
      const [d, m, y] = value.split('/')
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`

    case 'status':
      // "Recebido" → "received"
      const statusMap = {
        'Recebido': 'received',
        'Pendente': 'pending',
        'Atrasado': 'overdue',
        'Cancelado': 'cancelled'
      }
      return statusMap[value] || value.toLowerCase()

    case 'number':
      return parseFloat(value)

    default:
      return value
  }
}
```

**Testing Strategy**:
1. Use AI to generate column mappings (Phase 1)
2. Use deterministic extraction on 100 test files
3. Compare accuracy vs AI extraction
4. If accuracy ≥ 95%, deploy

---

## 🎯 **Next Steps**

1. **Week 1**: Implement Row Chunking (Option 3)
   - Expected: 25% speed improvement
   - Low risk, immediate results

2. **Week 2-3**: Implement Deterministic Extraction (Option 4)
   - Expected: 60% speed improvement
   - Build robust parsing logic
   - Test extensively

3. **Week 4**: Combine approaches (Option 5)
   - Expected: 70% speed improvement
   - Polish and optimize

**Success Criteria**:
- ✅ Speed: <10s for typical files (400 entities)
- ✅ Accuracy: ≥95% extraction accuracy
- ✅ Cost: <$0.05 per file
- ✅ Scalability: Linear time complexity

---

**What's your preference?** Should we start with Row Chunking (quick win) or go straight for Deterministic Extraction (bigger payoff, more work)?
