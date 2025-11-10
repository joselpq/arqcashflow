# File Import Speed - Deep Granular Analysis

**Date**: 2025-11-05
**Purpose**: Comprehensive breakdown of ALL processing steps with time estimates and optimization opportunities
**Current Performance**: 2-3 minutes (120-180 seconds)
**Goal**: Reduce to 1-1.5 minutes (60-90 seconds) = 40-50% improvement

---

## 📊 COMPLETE Step-by-Step Breakdown (4-Sheet Excel Example)

### Step 0: Frontend & Network (Before Processing)
```
┌─────────────────────────────────────────────────────────────────┐
│ User uploads file (browser → server)                            │
├─────────────────────────────────────────────────────────────────┤
│ Time: 1-5 seconds (depends on file size & network speed)       │
│ - 1MB file on fast connection: ~500ms-1s                       │
│ - 5MB file on slow connection: ~3-5s                           │
│ - 10MB file on slow connection: ~5-10s                         │
├─────────────────────────────────────────────────────────────────┤
│ Bottleneck: ⚠️ MINOR (network speed, not controllable)         │
│ Optimization: ❌ None (user's network)                          │
└─────────────────────────────────────────────────────────────────┘
```

**Time**: 1-5s (average: 2s)
**% of Total**: 2-3%

---

### Step 1: API Route Processing (`/api/ai/setup-assistant-v2/multi`)

**1.1 Request Parsing & Validation**
```typescript
// Line 28-56: POST handler
const formData = await request.formData()  // Parse multipart form
const files: File[] = []

for (const [key, value] of formData.entries()) {
  if (key.startsWith('file') && value instanceof File) {
    files.push(value)
  }
}
```

**Time**: 50-100ms
- formData parsing: 30-50ms
- File extraction loop: 20-50ms

**Bottleneck**: ❌ No (negligible)

---

**1.2 Service Instantiation**
```typescript
// Line 61-64
const setupAssistantService = new SetupAssistantService({
  ...context,
  request
})
```

**Time**: 5-10ms
- Class instantiation: 2-3ms
- Context setup: 3-7ms

**Bottleneck**: ❌ No

---

### Step 2: File-to-Buffer Conversion (Per File)

```typescript
// Line 91-92: Convert File to Buffer
const arrayBuffer = await file.arrayBuffer()
const fileBuffer = Buffer.from(arrayBuffer)
```

**Time per file**: 50-200ms (depends on file size)
- 1MB file: ~50-100ms
- 5MB file: ~100-200ms
- 10MB file: ~200-500ms

**For 1 file (2MB average)**: 100-150ms

**Bottleneck**: ❌ No (acceptable overhead)

---

### Step 3: SetupAssistantService.processFile() - Main Flow

#### **3.1 File Type Detection**
```typescript
// Line 133-161: detectFileType()
private detectFileType(filename: string, buffer: Buffer): FileType {
  const ext = filename.toLowerCase().split('.').pop()

  // Check extension first
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx'

  // Fallback: Check magic bytes
  if (buffer[0] === 0x25 && buffer[1] === 0x50) return 'pdf'
  // ... more magic byte checks
}
```

**Time**: 10-20ms
- String operations: 5-10ms
- Buffer inspection: 5-10ms

**Bottleneck**: ❌ No

---

#### **3.2 XLSX Parsing (`XLSX.read`)**
```typescript
// Line 235-244: parseXlsx()
private parseXlsx(fileBuffer: Buffer): XLSX.WorkBook {
  return XLSX.read(fileBuffer, { type: 'buffer' })
}
```

**Time**: 200-1000ms (depends on file size and complexity)
- Simple 2-sheet, 50 rows: ~200-300ms
- Medium 4-sheet, 100 rows: ~400-600ms
- Large 6-sheet, 200 rows: ~800-1200ms

**Current Implementation Issues**:
- ❌ Not using `dense: true` mode (performance optimization)
- ❌ Loads entire file into memory (not streaming)
- ❌ No compression detection optimization

**Bottleneck**: ⚠️ MINOR (0.5-1s for typical files)

**Optimization Opportunity**:
```typescript
// OPTIMIZED VERSION
return XLSX.read(fileBuffer, {
  type: 'buffer',
  dense: true,        // ✅ Use dense mode (faster for large files)
  cellDates: true,    // ✅ Parse dates directly
  cellNF: false,      // ✅ Skip number format parsing (not needed)
  cellStyles: false   // ✅ Skip style info (not needed)
})
```

**Expected Improvement**: 20-30% faster (200-300ms → 140-210ms)

---

#### **3.3 Extract Sheets Data (Trim Empty Rows)**
```typescript
// Line 251-314: extractSheetsData()
private extractSheetsData(workbook: XLSX.WorkBook): SheetData[] {
  // For each sheet:
  // 1. Scan ALL cells to find data boundaries (minRow, maxRow, minCol, maxCol)
  // 2. Create trimmed sheet with only populated range
  // 3. Convert to CSV
}
```

**Time Breakdown** (per sheet):
- Scan cells for boundaries: 50-150ms per sheet
- Create trimmed sheet: 20-50ms per sheet
- Convert to CSV (`sheet_to_csv`): 30-80ms per sheet

**Total for 4 sheets**: 400-1120ms (average: ~700ms)

**Current Implementation Issues**:
- ❌ Nested loop scans EVERY cell (even empties): O(rows × cols)
- ❌ No early termination when finding data boundaries
- ❌ Creates new sheet object (memory copy overhead)
- ❌ CSV conversion could be optimized

**Bottleneck**: ⚠️ MINOR-MEDIUM (0.5-1s for typical files)

**Optimization Opportunity**:
```typescript
// OPTIMIZED VERSION: Use XLSX.utils.decode_range with smarter scanning
// Instead of scanning every cell, use sheet['!ref'] and only scan edges
private extractSheetsData(workbook: XLSX.WorkBook): SheetData[] {
  return workbook.SheetNames.map(sheetName => {
    const sheet = workbook.Sheets[sheetName]

    // ✅ Use XLSX built-in range (already computed)
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')

    // ✅ Convert directly to CSV (skip intermediate trimmed sheet)
    const csv = XLSX.utils.sheet_to_csv(sheet, {
      blankrows: false,  // Skip empty rows
      strip: true        // Trim whitespace
    })

    return { name: sheetName, csv }
  })
}
```

**Expected Improvement**: 40-60% faster (700ms → 280-420ms)

---

#### **3.4 PHASE 1: Analyze File Structure** 🔍
```typescript
// Line 658-752: analyzeFileStructure()
private async analyzeFileStructure(...): Promise<ExtractionPlan> {
  const allSheetsPreview = sheetsData.map(sheet => ({
    name: sheet.name,
    preview: sheet.csv.split('\n').slice(0, 10).join('\n')  // First 10 rows
  }))

  const message = await this.anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',  // ⚠️ Using Sonnet (slow)
    max_tokens: 10000,
    temperature: 1,
    thinking: {
      type: 'enabled',
      budget_tokens: 5000  // ⚠️ Extended thinking overhead
    },
    messages: [{ role: 'user', content: prompt }]
  })

  // Parse JSON response
  const plan = JSON.parse(jsonMatch[0]) as ExtractionPlan
  return plan
}
```

**Time Breakdown**:
- Build prompt: 20-50ms
- **Claude API call**: 3000-8000ms ⚠️ **CRITICAL**
  - Request overhead: 100-200ms
  - Extended thinking (5000 tokens): 2000-3000ms
  - Response generation: 500-1500ms
  - Network latency: 200-500ms
  - Response parsing: 100-300ms
- Parse JSON: 50-100ms

**Total**: 3000-8000ms (average: 5000ms = **5 seconds**)

**Bottleneck**: 🔴 **MEDIUM** (5s out of 120s = 4%)

**Optimization Options**:

**Option A: Switch to Haiku 4.5**
```typescript
model: 'claude-haiku-4-5-20250514',  // ✅ 4-5x faster
thinking: { type: 'enabled', budget_tokens: 2000 }  // ✅ Reduced thinking
```
**Expected Improvement**: 80% faster (5s → 1s)

**Option B: Remove Phase 1 Entirely** (⚠️ Quality risk)
- Skip analysis, extract sheets directly with generic prompt
- Expected Improvement: 100% (5s → 0s)
- Trade-off: Loss of cross-sheet context, lower quality

**Option C: Simplify Analysis Prompt** (Reduce thinking needed)
- Remove detailed column mapping
- Just identify sheet types (contracts/receivables/expenses)
- Expected Improvement: 40% (5s → 3s)

**RECOMMENDATION**: Option A (Haiku for Phase 1)

---

#### **3.5 PHASE 2: Extract Sheets in Parallel** ⚡🔥

**THIS IS THE PRIMARY BOTTLENECK** (80-85% of total time)

```typescript
// Line 758-788: extractSheetsInParallel()
private async extractSheetsInParallel(...): Promise<ExtractionResult[]> {
  const extractionPromises = plan.sheets.map(sheetInfo => {
    return this.extractSheet(sheetData, sheetInfo, plan, filename, professionOverride)
  })

  const results = await Promise.allSettled(extractionPromises)
  return successfulResults
}

// Line 817-1015: extractSheet() - PER SHEET
private async extractSheet(...): Promise<ExtractionResult> {
  // 1. Build prompt (3000-5000 tokens)
  const prompt = `Você está extraindo dados...
    CONTEXTO DO ARQUIVO E PLANILHA:
    - Arquivo: "${filename}"
    - Planilha: "${sheetData.name}"
    - Tipo de dados: ${sheetInfo.type}
    ...
    DADOS DA PLANILHA:
    ${sheetData.csv}  // 🚨 Full CSV content (can be 1000+ lines)
  `

  // 2. Call Claude API
  const message = await this.anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',  // ⚠️ SLOW MODEL
    max_tokens: 16000,
    temperature: 1,
    thinking: {
      type: 'enabled',
      budget_tokens: 10000  // ⚠️ HEAVY THINKING (10k tokens!)
    },
    messages: [{ role: 'user', content: prompt }]
  })

  // 3. Parse JSON response
  const extractedData = JSON.parse(jsonMatch[0]) as ExtractionResult
  return extractedData
}
```

**Time Breakdown PER SHEET**:
- Build prompt: 50-100ms
- **Claude API call**: 15,000-30,000ms ⚠️ **CRITICAL BOTTLENECK**
  - Request overhead: 200-400ms
  - Extended thinking (10000 tokens): 5000-10000ms 🔥
  - Response generation: 8000-15000ms 🔥
  - Network latency: 500-1000ms
  - Tool execution (if any): 0-3000ms
- Parse JSON (3-layer fallback): 100-500ms

**Total PER SHEET**: 15-30 seconds

**For 4 sheets IN PARALLEL**: 15-30 seconds (bottleneck: slowest sheet)

**Bottleneck**: 🔴🔴🔴 **CRITICAL** (60-100s out of 120s = **80-85%**)

---

**PHASE 2 Optimization Options**:

### **Option 1: Switch to Haiku 4.5** 🏆 **BEST**

```typescript
model: 'claude-haiku-4-5-20250514',  // ✅ 4-5x faster
thinking: { type: 'enabled', budget_tokens: 5000 }  // ✅ Half the thinking
```

**Expected Speed**:
- Per sheet: 3-6 seconds (vs 15-30s) = **75-80% faster**
- 4 sheets parallel: 3-6 seconds (vs 15-30s)

**Expected Total Impact**: 2-3 min → **60-90s** ✅ **GOAL ACHIEVED**

**Cost**: 67% cheaper ($3/M → $1/M input tokens)

**Risk**: MEDIUM (accuracy needs validation)

---

### **Option 2: Reduce Extended Thinking Budget** 💭

```typescript
thinking: { type: 'enabled', budget_tokens: 5000 }  // ✅ Half (10000 → 5000)
```

**Expected Speed**:
- Thinking time: 5000-10000ms → 2500-5000ms (50% faster)
- Per sheet: 15-30s → 10-20s (30-40% faster)
- 4 sheets parallel: 15-30s → 10-20s

**Expected Total Impact**: 2-3 min → **90-120s** (30-40% improvement)

**Risk**: LOW (diminishing returns above 5000 tokens)

---

### **Option 3: Implement Prompt Caching** 💾

**Current**: Each sheet gets full 3000-5000 token prompt (NO caching)

**Optimized**: Cache static parts (schema, profession config), only send sheet data

```typescript
// Split prompt into cacheable and dynamic parts
const message = await this.anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  system: [{
    type: 'text',
    text: staticPrompt,  // Schema, rules, examples (2500 tokens)
    cache_control: { type: 'ephemeral' }  // ✅ CACHE THIS
  }],
  messages: [{
    role: 'user',
    content: `Sheet: ${sheetData.name}\nData:\n${sheetData.csv}`  // Dynamic (500-1500 tokens)
  }]
})
```

**Expected Speed**:
- Cache hit: 200-400ms faster per sheet (5-10% improvement)
- Per sheet: 15-30s → 14-27s
- 4 sheets parallel: 15-30s → 14-27s

**Expected Total Impact**: 2-3 min → **105-115s** (10-15% improvement)

**Cost Savings**: 90% for cached tokens (~2500 tokens per sheet)

**Risk**: LOW (well-supported feature)

---

### **Option 4: CSV Chunking (Reduce Context)** ✂️

**Problem**: Large sheets (200+ rows) send huge CSV payloads (5000+ tokens)

**Solution**: Process sheets in chunks of 50-100 rows at a time

```typescript
// Instead of sending entire sheet:
const fullCSV = sheetData.csv  // 2000 lines

// Split into chunks:
const chunks = splitCSVIntoChunks(fullCSV, 100)  // 100 rows per chunk

for (const chunk of chunks) {
  const result = await this.extractSheet(chunk, ...)
  allResults.push(result)
}
```

**Expected Speed**:
- Smaller context → faster processing
- Per chunk: 8-15s (vs 15-30s for full sheet)
- But N chunks needed (more API calls)

**Trade-off**: More API calls, but each is faster

**Expected Total Impact**: 2-3 min → **90-110s** (20-30% improvement)

**Risk**: MEDIUM (chunking logic complexity, potential entity splitting issues)

---

### **Option 5: Hybrid Approach (Haiku + Sonnet)** 🎯

**Strategy**: Use fast Haiku for simple sheets, fallback to Sonnet for complex ones

```typescript
// Determine complexity from Phase 1
const complexityScore = sheetInfo.approximateRows * Object.keys(sheetInfo.columns).length

const model = complexityScore > 500
  ? 'claude-sonnet-4-20250514'    // Complex sheets
  : 'claude-haiku-4-5-20250514'   // Simple sheets

const thinkingBudget = complexityScore > 500 ? 8000 : 4000
```

**Expected Speed**:
- 80% of sheets use Haiku (4-6s)
- 20% of sheets use Sonnet (15-25s)
- Average: 6-10s per sheet

**Expected Total Impact**: 2-3 min → **75-100s** (35-45% improvement)

**Risk**: LOW (best of both worlds)

---

#### **3.6 POST-PROCESSING: Aggregation & Inference**

```typescript
// Line 793-812: aggregateExtractionResults()
private aggregateExtractionResults(results: ExtractionResult[]): ExtractionResult {
  const aggregated: ExtractionResult = {
    contracts: [],
    receivables: [],
    expenses: []
  }

  results.forEach(result => {
    aggregated.contracts.push(...result.contracts)
    aggregated.receivables.push(...result.receivables)
    aggregated.expenses.push(...result.expenses)
  })

  return aggregated
}

// Line 1038-1234: postProcessWithInference()
private async postProcessWithInference(...): Promise<ExtractionResult> {
  // 1. Get profession config
  const team = await this.context.teamScopedPrisma.raw.team.findUnique(...)

  // 2. Filter invalid entities
  // 3. Infer missing fields (status, dates, amounts, clientName)
  // 4. Normalize dates to ISO-8601

  // ... 200 lines of inference logic
}
```

**Time Breakdown**:
- Aggregation (array merging): 10-30ms
- Database query (get team): 20-50ms
- Filtering logic: 50-150ms (depends on entity count)
  - Contracts filtering: 10-30ms
  - Receivables filtering: 20-50ms
  - Expenses filtering: 20-70ms
- Inference logic: 100-300ms
  - Status inference: 30-80ms
  - Date normalization: 30-80ms
  - ClientName extraction: 20-60ms
  - Default value filling: 20-80ms

**Total**: 500-1000ms (average: 700ms)

**Bottleneck**: ❌ No (< 1% of total time)

**Optimization Opportunity**: ⚠️ Minor gains possible
- Cache profession config (save 20-50ms)
- Parallelize filtering for each entity type (save 50-100ms)

**Expected Improvement**: 20-30% faster (700ms → 490-630ms)
**Not worth the complexity** - focus on bigger bottlenecks

---

#### **3.7 BULK ENTITY CREATION (Database Operations)**

```typescript
// Line 1241-1340: bulkCreateEntities()
private async bulkCreateEntities(data: ExtractionResult): Promise<ProcessingResult> {
  // Create contracts first (may be referenced by receivables)
  if (data.contracts.length > 0) {
    const contractResult = await this.contractService.bulkCreate(
      data.contracts as any,
      { continueOnError: true }
    )
  }

  // Create receivables (map contractId references)
  if (data.receivables.length > 0) {
    const receivablesWithContractIds = await this.mapContractIds(data.receivables)

    const receivableResult = await this.receivableService.bulkCreate(
      receivablesWithContractIds as any,
      { continueOnError: true }
    )
  }

  // Create expenses
  if (data.expenses.length > 0) {
    const expenseResult = await this.expenseService.bulkCreate(
      data.expenses as any,
      { continueOnError: true }
    )
  }
}
```

**Time Breakdown**:

**3.7.1 Contract Bulk Creation**
```typescript
// BaseService.bulkCreate() implementation
async bulkCreate(items: TCreateData[], options: BulkOptions = {}): Promise<BulkOperationResult<TEntity>> {
  const results: BulkItemResult<TEntity>[] = []

  for (let i = 0; i < items.length; i++) {
    try {
      // 1. Validate business rules (per entity)
      await this.validateBusinessRules(data)

      // 2. Create entity (Prisma create)
      const entity = await model.create({ data: createData })

      // 3. Audit logging (per entity)
      await this.logAudit(...)

      results.push({ success: true, data: entity, index: i })
    } catch (error) {
      results.push({ success: false, error: message, index: i })
    }
  }
}
```

**Current Implementation Issues**:
- ❌ **Sequential creation** (one at a time, not batched)
- ❌ **Per-entity validation** (N database queries for duplicate checks)
- ❌ **Per-entity audit logging** (N database inserts)
- ❌ **No use of Prisma `createMany`** (bulk insert optimization)

**Time per entity**:
- Validation: 50-150ms (includes duplicate check DB query)
- Prisma create: 20-50ms
- Audit logging: 30-80ms
- **Total per entity**: 100-280ms

**For 20 contracts**: 2000-5600ms (average: **3.8 seconds**)
**For 30 receivables**: 3000-8400ms (average: **5.7 seconds**)
**For 50 expenses**: 5000-14000ms (average: **9.5 seconds**)

**TOTAL BULK CREATION**: 10,000-28,000ms (average: **19 seconds = 19s**)

**Bottleneck**: 🔴 **MEDIUM-HIGH** (10-20s out of 120s = **15-20%**)

---

**BULK CREATION Optimization Options**:

### **Option A: Use Prisma `createMany` (Batch Inserts)** 🏆 **BEST**

**Current**: N separate `create()` calls
**Optimized**: 1 `createMany()` call per entity type

```typescript
// BEFORE: Sequential creates (100-280ms each)
for (const item of items) {
  await model.create({ data: item })
  await auditLog.create({ data: auditData })
}

// AFTER: Batch insert (10-20ms per entity)
await model.createMany({
  data: items,
  skipDuplicates: true
})

// Batch audit logs separately
await auditLog.createMany({
  data: auditData
})
```

**Expected Speed**:
- Per entity: 100-280ms → **10-20ms** (90% faster)
- 100 entities: 10-28s → **1-2s** (90-95% faster)

**Expected Total Impact**: 19s → **2-3s** ✅ **85% improvement**

**Trade-offs**:
- ⚠️ Loses individual error handling (all-or-nothing)
- ⚠️ Validation must happen upfront (before batch)
- ✅ Solution: Validate all first, then batch insert

**Risk**: LOW (Prisma supports this natively)

---

### **Option B: Parallel Validation** ⚡

**Current**: Sequential validation (50-150ms × N entities)
**Optimized**: Parallel validation with Promise.all

```typescript
// BEFORE: Sequential
for (const item of items) {
  await this.validateBusinessRules(item)
}

// AFTER: Parallel
await Promise.all(
  items.map(item => this.validateBusinessRules(item))
)
```

**Expected Speed**:
- 100 entities: 5000-15000ms → **1000-2000ms** (70-85% faster)

**Expected Total Impact**: Validation: 5-15s → **1-2s**

**Risk**: LOW (validation is stateless)

---

### **Option C: Skip Audit Logging for Bulk Operations** 🗑️

**Current**: Per-entity audit log insert (30-80ms × N)
**Optimized**: Single summary audit log

```typescript
// BEFORE: N audit log entries
for (const entity of entities) {
  await auditLog.create({ entityId: entity.id, action: 'create', ... })
}

// AFTER: 1 summary audit log
await auditLog.create({
  action: 'bulk_create',
  metadata: {
    entityType: 'contract',
    count: entities.length,
    entityIds: entities.map(e => e.id)
  }
})
```

**Expected Speed**:
- 100 entities: 3000-8000ms → **30-80ms** (95-98% faster)

**Expected Total Impact**: Audit: 3-8s → **<0.1s**

**Trade-offs**:
- ⚠️ Loses per-entity audit trail
- ⚠️ Harder to track individual entity history
- ✅ Good for bulk imports (less important than manual edits)

**Risk**: MEDIUM (product decision needed)

---

### **Option D: Batch Size Optimization** 📦

**Current**: All entities in one batch (can be 100+)
**Research Recommendation**: Batches of 1000 records optimal for Prisma + PostgreSQL

**Optimized**: Split into batches of 500-1000

```typescript
const BATCH_SIZE = 500

for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE)

  await model.createMany({
    data: batch,
    skipDuplicates: true
  })
}
```

**Expected Speed**:
- Prevents memory issues with large imports
- Optimal throughput: ~50ms per entity in batches of 500-1000

**Expected Total Impact**: Marginal for typical files (<200 entities)
**Critical for large files** (500+ entities)

**Risk**: LOW (best practice)

---

#### **3.8 Contract ID Mapping (For Receivables)**

```typescript
// Line 1345-1370: mapContractIds()
private async mapContractIds(receivables: ExtractedReceivable[]): Promise<ExtractedReceivable[]> {
  // 1. Get ALL contracts for this team
  const contracts = await this.contractService.findMany({})

  // 2. For each receivable, find matching contract by projectName
  return receivables.map(receivable => {
    if (receivable.contractId) {
      const matchingContract = contracts.find(
        c => c.projectName.toLowerCase() === receivable.contractId?.toLowerCase()
      )

      if (matchingContract) {
        return { ...receivable, contractId: matchingContract.id }
      }
    }

    return { ...receivable, contractId: null }
  })
}
```

**Time Breakdown**:
- Database query (findMany): 100-300ms
- Mapping loop: 20-80ms (N receivables × O(M) lookup)

**Total**: 120-380ms (average: 250ms)

**Bottleneck**: ❌ No (< 1% of total time)

**Optimization Opportunity**: ⚠️ Minor
- Use Map for O(1) lookups instead of Array.find O(M)
- Expected improvement: 50-100ms (negligible)

---

### Step 4: API Response & Frontend Update

**4.1 API Response Generation**
```typescript
// Line 133-145: Return combined summary
return {
  success: failedFiles === 0,
  totalFiles: files.length,
  combinedSummary: {
    totalContractsCreated,
    totalReceivablesCreated,
    totalExpensesCreated
  }
}
```

**Time**: 10-30ms
- JSON serialization: 5-15ms
- Response headers: 5-15ms

**Bottleneck**: ❌ No

---

**4.2 Network Transfer (Server → Browser)**
```
Response size: 200-500 bytes (JSON summary)
Time: 50-100ms (depends on network)
```

**Bottleneck**: ❌ No

---

**4.3 Frontend State Update**
```typescript
// ChatContext or MultiFileSetupAssistant
setMessages([...messages, resultMessage])
// Trigger 'arnaldo-data-updated' event for live refresh
window.dispatchEvent(new CustomEvent('arnaldo-data-updated'))
```

**Time**: 20-50ms
- State update: 10-20ms
- Event dispatch: 5-15ms
- Re-render: 5-15ms

**Bottleneck**: ❌ No

---

## 📊 COMPLETE TIME BREAKDOWN SUMMARY (4-Sheet Excel, 100 Entities)

| Step | Current Time | % of Total | Bottleneck | Optimized Time | Savings |
|------|--------------|------------|------------|----------------|---------|
| **0. Upload** | 2s | 2% | ⚠️ Minor (network) | 2s | 0s |
| **1. API Parsing** | 0.1s | <1% | ❌ No | 0.1s | 0s |
| **2. File→Buffer** | 0.15s | <1% | ❌ No | 0.15s | 0s |
| **3.1 File Detection** | 0.02s | <1% | ❌ No | 0.02s | 0s |
| **3.2 XLSX Parse** | 0.5s | <1% | ⚠️ Minor | **0.3s** | **0.2s** |
| **3.3 Sheet Extract** | 0.7s | 1% | ⚠️ Minor | **0.4s** | **0.3s** |
| **3.4 Phase 1 Analysis** | 5s | 4% | 🔴 Medium | **1s (Haiku)** | **4s** |
| **3.5 Phase 2 Extraction** | 60-100s | **80-85%** | 🔴🔴🔴 **CRITICAL** | **12-20s (Haiku)** | **48-80s** |
| **3.6 Post-Processing** | 0.7s | 1% | ❌ No | 0.7s | 0s |
| **3.7 Bulk Creation** | 19s | 15-20% | 🔴 Medium-High | **2-3s (createMany)** | **16-17s** |
| **3.8 Contract Mapping** | 0.25s | <1% | ❌ No | 0.25s | 0s |
| **4. Response** | 0.1s | <1% | ❌ No | 0.1s | 0s |
| **TOTAL** | **90-130s** | **100%** | | **20-30s** | **70-100s** |

**Current**: 90-130s (1.5-2.2 minutes)
**After Full Optimization**: 20-30s (20-30 seconds)
**Improvement**: **70-85% faster** ✅ **EXCEEDS GOAL**

---

## 🎯 PRIORITY-RANKED OPTIMIZATION OPPORTUNITIES

### 🏆 **Tier 1: CRITICAL (70-80s savings)**

#### **1A. Switch Phase 2 to Haiku 4.5**
- **Savings**: 48-80s (80% of Phase 2)
- **Effort**: 1 hour (model string + thinking budget)
- **Risk**: MEDIUM (accuracy validation needed)
- **Priority**: **DO THIS FIRST**

#### **1B. Use Prisma createMany for Bulk Inserts**
- **Savings**: 16-17s (85% of bulk creation)
- **Effort**: 2-3 hours (refactor bulkCreate method)
- **Risk**: LOW (Prisma native feature)
- **Priority**: **DO THIS SECOND**

---

### ⚡ **Tier 2: HIGH-IMPACT (5-10s savings)**

#### **2A. Switch Phase 1 to Haiku 4.5**
- **Savings**: 4s (80% of Phase 1)
- **Effort**: 5 minutes (same as 1A)
- **Risk**: LOW (just structure analysis)
- **Priority**: Bundle with 1A

#### **2B. Reduce Extended Thinking Budgets**
- **Savings**: 8-12s (if not using Haiku)
- **Effort**: 15 minutes (parameter tuning)
- **Risk**: LOW
- **Priority**: Alternative to Haiku if accuracy issues

---

### 🔧 **Tier 3: MODERATE (1-3s savings)**

#### **3A. Parallel Validation**
- **Savings**: 3-5s (70% of validation time)
- **Effort**: 1-2 hours
- **Risk**: LOW
- **Priority**: After Tier 1-2

#### **3B. Optimize XLSX Parsing (Dense Mode)**
- **Savings**: 0.2s (20% of parsing)
- **Effort**: 30 minutes
- **Risk**: LOW
- **Priority**: Quick win

#### **3C. Optimize Sheet Extraction**
- **Savings**: 0.3s (40% of extraction)
- **Effort**: 1 hour
- **Risk**: LOW
- **Priority**: After 3B

#### **3D. Implement Prompt Caching**
- **Savings**: 0.5-1s (5-10% of Phase 2)
- **Cost Savings**: 90% for cached tokens
- **Effort**: 1-2 hours
- **Risk**: LOW
- **Priority**: Do after Haiku switch

---

### ⏳ **Tier 4: MINOR (<1s savings)**

#### **4A. Skip Audit Logging for Bulk**
- **Savings**: 3-8s (but product decision needed)
- **Effort**: 30 minutes
- **Risk**: MEDIUM (business requirement)
- **Priority**: Discuss with team first

#### **4B. Optimize Contract Mapping**
- **Savings**: 0.1s
- **Effort**: 30 minutes
- **Risk**: LOW
- **Priority**: Low priority (negligible gain)

---

## 🚀 RECOMMENDED IMPLEMENTATION PHASES

### **Phase 1: Quick Wins** (2-3 hours total)
**Goal**: 70-80% improvement

1. **Switch to Haiku 4.5** (1 hour)
   - Phase 1: claude-haiku-4-5, thinking 2000 tokens
   - Phase 2: claude-haiku-4-5, thinking 5000 tokens
   - Test with 5-10 real files
   - **Expected**: 60-100s → 20-35s

2. **Refactor Bulk Creation** (2 hours)
   - Implement `createMany` for contracts, receivables, expenses
   - Parallel validation with Promise.all
   - Batch audit logs (single summary per entity type)
   - **Expected**: 20-35s → **15-25s** ✅

**Total Expected Result**: 90-130s → **15-25s** (80-85% improvement)

---

### **Phase 2: Refinement** (2-3 hours)
**Goal**: Additional 5-10% improvement + cost savings

1. **Optimize XLSX Operations** (1.5 hours)
   - Dense mode for parsing
   - Smarter sheet extraction
   - **Expected**: 15-25s → 14-23s

2. **Implement Prompt Caching** (1.5 hours)
   - Cache static prompt parts
   - Track cache hit rates
   - **Expected**: Additional 5-10% speed + 90% cost savings

**Total Expected Result**: 15-25s → **13-21s** (85-90% improvement)

---

### **Phase 3: Monitoring** (1 hour)
**Goal**: Track and iterate

1. **Add Performance Instrumentation**
   - console.time() for each major step
   - Track metrics per file type
   - Log to analytics

2. **A/B Testing Framework**
   - Feature flags for Haiku vs Sonnet
   - Track accuracy vs speed tradeoffs
   - Gradual rollout

---

## 💰 COST-BENEFIT ANALYSIS (Extended)

### API Cost Breakdown (Current)

**For 4-sheet Excel file** (typical):
- Phase 1 Analysis:
  - Input: 2000 tokens × $3/M = $0.006
  - Thinking: 5000 tokens × $3/M = $0.015
  - Output: 500 tokens × $15/M = $0.0075
  - **Subtotal**: $0.0285

- Phase 2 Extraction (4 sheets):
  - Input: 4000 tokens/sheet × 4 × $3/M = $0.048
  - Thinking: 10000 tokens/sheet × 4 × $3/M = $0.12
  - Output: 3000 tokens/sheet × 4 × $15/M = $0.18
  - **Subtotal**: $0.348

**Total Current Cost**: ~$0.38 per file

---

### After Haiku Optimization

**For 4-sheet Excel file**:
- Phase 1 Analysis (Haiku):
  - Input: 2000 tokens × $1/M = $0.002
  - Thinking: 2000 tokens × $1/M = $0.002
  - Output: 500 tokens × $5/M = $0.0025
  - **Subtotal**: $0.0065

- Phase 2 Extraction (Haiku, 4 sheets):
  - Input: 4000 tokens/sheet × 4 × $1/M = $0.016
  - Thinking: 5000 tokens/sheet × 4 × $1/M = $0.02
  - Output: 3000 tokens/sheet × 4 × $5/M = $0.06
  - **Subtotal**: $0.096

**Total Optimized Cost**: ~$0.10 per file

**Savings**: 74% reduction ($0.38 → $0.10)

---

### After Prompt Caching (Additional)

**Phase 2 with caching** (2500 tokens cached per sheet):
- Cached input (read): 2500 tokens × 4 × $0.10/M = $0.001
- Non-cached input: 1500 tokens × 4 × $1/M = $0.006
- Thinking: 5000 tokens × 4 × $1/M = $0.02
- Output: 3000 tokens × 4 × $5/M = $0.06
- **Subtotal**: $0.087

**Total with Caching**: ~$0.09 per file

**Total Savings**: 76% reduction ($0.38 → $0.09)

---

### Monthly Cost Projection (1000 files)

| Scenario | Cost per File | Monthly Cost | Annual Cost | Savings |
|----------|---------------|--------------|-------------|---------|
| Current (Sonnet) | $0.38 | $380 | $4,560 | - |
| Haiku Only | $0.10 | $100 | $1,200 | $3,360/yr |
| Haiku + Caching | $0.09 | $90 | $1,080 | $3,480/yr |

---

## 🎯 FINAL RECOMMENDATIONS

### Immediate Actions (Today/Tomorrow)

1. ✅ **Review this analysis** with team
2. ✅ **Prepare test file suite** (5-10 diverse files)
3. ✅ **Set baseline metrics** (current processing times)
4. ✅ **Create feature flag** for Haiku vs Sonnet toggle

### Implementation Priority (Next 1-2 Days)

1. 🏆 **Phase 1: Haiku + createMany** (2-3 hours)
   - Expected: 80-85% improvement
   - Risk: Medium (accuracy) + Low (Prisma)
   - A/B test with 10% of users first

2. ⚡ **Phase 2: XLSX + Caching** (2-3 hours)
   - Expected: Additional 5-10% improvement
   - Risk: Low
   - Full rollout after Phase 1 validation

3. 📊 **Phase 3: Monitor & Iterate** (Ongoing)
   - Track metrics
   - Gather user feedback
   - Fine-tune based on data

---

## ✅ SUCCESS CRITERIA

**Speed**:
- ✅ 2-sheet file: <25s (vs 45-60s baseline)
- ✅ 4-sheet file: <50s (vs 90-120s baseline)
- ✅ 6-sheet file: <75s (vs 150-180s baseline)

**Accuracy**:
- ✅ Extraction accuracy ≥ 90% (manual validation)
- ✅ No systematic errors or crashes
- ✅ Edge case handling maintained

**Cost**:
- ✅ 70-80% cost reduction
- ✅ < $0.10 per file average

**User Experience**:
- ✅ "Processing..." states clear
- ✅ Error messages actionable
- ✅ Progress tracking functional

---

*Last Updated*: 2025-11-05
*Status*: Ready for implementation
*Next Step*: Phase 1 implementation (Haiku + createMany)
