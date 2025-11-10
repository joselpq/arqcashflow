---
title: "ADR-025: Mixed Entity Type Sheet Support - Parallel Virtual Sheets Architecture"
status: "proposed"
date: "2025-11-07"
deciders: ["Jose Lyra", "Claude Code"]
consulted: []
informed: []
extends: ["ADR-024"]
---

# ADR-025: Mixed Entity Type Sheet Support - Parallel Virtual Sheets Architecture

## Status

**📋 PROPOSED** (2025-11-07)

**Context**: Extends ADR-024 to handle remaining 10% of use cases (mixed entity type sheets)

**Prerequisites**: SetupAssistantServiceV2 (ADR-024) must be deployed and stable

## Context and Problem Statement

ADR-024's SetupAssistantServiceV2 successfully handles **90% of use cases**: sheets with a single entity type (homogeneous). However, **10% of real-world spreadsheets** contain multiple entity types in the same sheet.

### The Mixed Sheet Challenge

Users create complex spreadsheets with multiple tables in one sheet:

**Pattern 1: Vertical Stacking** (Multiple Tables Vertically)
```
Row 1-2:   [Table 1 Headers: Nome Projeto, Valor, Data]
Row 3-10:  [Contracts data]
Row 11-12: [Blank rows]
Row 13-14: [Table 2 Headers: Parcela, Valor, Vencimento]
Row 15-30: [Receivables data]
```

**Pattern 2: Horizontal Splitting** (Side-by-Side Tables)
```
Col A-C: Contracts          | Col D: Blank | Col E-G: Expenses
Nome | Valor | Status       |              | Descrição | Valor | Data
Proj A | 10k | Ativo        |              | Aluguel | 2k | Jan
Proj B | 15k | Finalizado   |              | Internet | 500 | Jan
```

**Pattern 3: Multiple Regions** (Complex Layout)
```
[Top-Left: Contracts - rows 1-10, cols A-C]
[Top-Right: Receivables - rows 1-15, cols E-H]
[Bottom: Expenses - rows 18-30, cols A-F]
```

### Current Limitation

SetupAssistantServiceV2 assumes:
```typescript
// Current assumption (90% of cases)
const analysis = await this.analyzeSheetUnified(sheet)
// Result: { sheetType: "contracts", columnMapping: {...} }

// Extraction assumes ALL rows are contracts
const entities = rows.map(row => this.extractEntity(row, analysis.columnMapping))
```

**What breaks with mixed sheets**:
- Column mapping might only work for first table
- Rows from second table extracted with wrong mapping
- Data corruption or null values
- Poor accuracy

## Decision Drivers

1. **Coverage**: Handle 100% of sheet types (vs current 90%)
2. **Performance**: Maintain speed for homogeneous sheets (15-25s)
3. **Accuracy**: 95%+ extraction accuracy for mixed sheets
4. **Simplicity**: Minimize complexity and reuse existing code
5. **Cost**: Optimize for cost with prompt caching
6. **Robustness**: Handle edge cases gracefully

## Considered Options

### Option 1: Enhanced Unified Analysis (AI Only)
Extend AI prompt to detect and describe mixed structure in ONE call.

**Pros**: One AI call, AI sees full context
**Cons**: Complex spatial reasoning required, larger response, new prompt engineering needed

### Option 2: Programmatic Detection + Unified Mixed Prompt
Programmatically detect boundaries, send all tables in ONE AI call with hints.

**Pros**: One AI call, programmatic hints improve accuracy
**Cons**: Complex prompt, AI must coordinate multiple table mappings, spatial reasoning

### Option 3: Row-Level Classification (Chunked)
Classify each row's entity type using chunked AI calls.

**Pros**: Handles any pattern, no spatial reasoning
**Cons**: Multiple sequential calls (slow), assumes unified columns

### Option 4: Parallel Virtual Sheets ⭐
Programmatically segment tables, treat each as independent sheet, analyze in parallel.

**Pros**: Reuses existing ADR-024 prompt, parallel execution (no TTFT penalty), simpler AI task, cost-efficient with caching, no spatial reasoning needed
**Cons**: Multiple API calls (but parallel), tables analyzed independently (but this is fine - no cross-dependency needed)

## Decision Outcome

**Chosen: Option 4 - Parallel Virtual Sheets Architecture**

### Core Philosophy

**"Programmatically segment tables, analyze independently in parallel, reuse proven prompts"**

Key Insights:
1. **Tables are independent**: Contracts don't need context from receivables during column mapping
2. **Parallel = No latency penalty**: N parallel calls have same TTFT as 1 call (~1.5s)
3. **Prompt reuse**: Each virtual sheet uses existing ADR-024 prompt (no new engineering needed)
4. **Cost with caching**: System prompt cached after first call, additional calls only pay for table data
5. **Simpler AI task**: Classify one table type (not coordinate multiple with spatial reasoning)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: Table Segmentation (<0.5s, pure code)                │
│  ────────────────────────────────────────────────────────────   │
│  ✅ Excel metadata reading (existing from ADR-024)              │
│  🆕 Blank row sequence detection (Filled → Blank → Filled)      │
│  🆕 Blank column sequence detection (side-by-side tables)       │
│  🆕 Table segmentation based on boundaries                      │
│  ✅ Header detection per table (existing scoreAsHeaderRow)      │
│                                                                  │
│  Output: List of DetectedTable regions with headers identified  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                   ┌────────┴────────┐
                   │  Table Count?    │
                   └────────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   (count = 1)         (count = 2-3)      (count = 4+)
        │                   │                   │
        ↓                   ↓                   ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ FAST PATH    │    │ PARALLEL     │    │ PARALLEL     │
│ (90% cases)  │    │ (8% cases)   │    │ (2% cases)   │
│              │    │              │    │              │
│ Use existing │    │ 2-3 virtual  │    │ 4+ virtual   │
│ ADR-024      │    │ sheets       │    │ sheets       │
│ prompt       │    │              │    │              │
│              │    │ Parallel     │    │ Parallel     │
│ 1 AI call    │    │ AI calls     │    │ AI calls     │
│              │    │              │    │              │
│ 15-25s       │    │ 15-28s       │    │ 20-35s       │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: AI Analysis (parallel for mixed)                     │
│  ────────────────────────────────────────────────────────────   │
│  🤖 Each virtual sheet analyzed with EXISTING ADR-024 prompt    │
│  🤖 Promise.all() for parallel execution                        │
│  🤖 No spatial reasoning needed (each table independent)        │
│  🤖 System prompt cached across calls (cost optimization)       │
│                                                                  │
│  TTFT: ~1.5s (parallel calls start simultaneously)              │
│  Total: max(call1, call2, ..., callN) ≈ 15-25s per call        │
│                                                                  │
│  Output: Array of SheetAnalysis (one per virtual sheet)         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: Deterministic Extraction (<1s, pure code)            │
│  ────────────────────────────────────────────────────────────   │
│  ✅ Same transformations as ADR-024 (currency, date, status)    │
│  ✅ Apply per virtual sheet analysis                            │
│  ✅ Combine results into single ExtractionResult                │
│                                                                  │
│  Output: {contracts: [...], receivables: [...], expenses: [...]}│
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 4: Post-Processing & Bulk Creation (1-2s)               │
│  ────────────────────────────────────────────────────────────   │
│  ✅ Contract ID mapping (project names → UUIDs)                 │
│  ✅ Validation & filtering                                      │
│  ✅ Bulk creation (same as ADR-024)                             │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Design

### 1. Programmatic Boundary Detection

#### 1.1 Blank Row Sequence Detection

**Algorithm**: Detect Filled → Blank → Filled patterns

```typescript
interface TableBoundary {
  type: 'vertical' | 'horizontal'
  position: number      // Row or column index where boundary starts
  confidence: number    // 0-1 score based on blank sequence length
  blankLength: number   // Number of consecutive blank rows/columns
}

/**
 * Detect vertical table boundaries (blank rows between filled sections)
 *
 * Pattern:
 *   Rows 1-10: Data (filled)
 *   Rows 11-12: Empty
 *   Rows 13-25: Data (filled)
 *
 * Result: Boundary at row 11 (confidence based on blank length)
 */
private detectBlankRows(rows: string[][]): TableBoundary[] {
  const boundaries: TableBoundary[] = []
  let lastFilledRow = -1
  let blankSequenceStart = -1

  for (let i = 0; i < rows.length; i++) {
    const isBlank = this.isRowBlank(rows[i])

    if (!isBlank) {
      // Current row has data
      if (blankSequenceStart !== -1) {
        // We just exited a blank sequence
        // This is a boundary if we had filled rows before the blank
        if (lastFilledRow !== -1 && lastFilledRow < blankSequenceStart - 1) {
          const blankLength = i - blankSequenceStart
          boundaries.push({
            type: 'vertical',
            position: blankSequenceStart,
            confidence: Math.min(1.0, blankLength / 2),  // 2+ blank rows = high confidence
            blankLength
          })
        }
        blankSequenceStart = -1
      }
      lastFilledRow = i
    } else {
      // Current row is blank
      if (blankSequenceStart === -1 && lastFilledRow !== -1) {
        // Starting a new blank sequence after filled rows
        blankSequenceStart = i
      }
    }
  }

  return boundaries.filter(b => b.confidence >= 0.5)  // Filter low-confidence boundaries
}

/**
 * Check if row is completely blank
 */
private isRowBlank(row: string[]): boolean {
  return row.every(cell => {
    const cleaned = cell.trim()
    return cleaned === '' || cleaned === ',' || /^,+$/.test(cleaned)
  })
}
```

#### 1.2 Blank Column Sequence Detection

**Algorithm**: Same pattern, but for columns

```typescript
/**
 * Detect horizontal table boundaries (blank columns between filled sections)
 *
 * Pattern:
 *   Cols A-C: Data (filled)
 *   Col D: Empty
 *   Cols E-G: Data (filled)
 *
 * Result: Boundary at col 3 (D)
 */
private detectBlankColumns(rows: string[][]): TableBoundary[] {
  if (rows.length === 0) return []

  const numCols = Math.max(...rows.map(r => r.length))
  const boundaries: TableBoundary[] = []

  let lastFilledCol = -1
  let blankSequenceStart = -1

  for (let col = 0; col < numCols; col++) {
    const isBlank = this.isColumnBlank(rows, col)

    if (!isBlank) {
      if (blankSequenceStart !== -1) {
        if (lastFilledCol !== -1 && lastFilledCol < blankSequenceStart - 1) {
          const blankLength = col - blankSequenceStart
          boundaries.push({
            type: 'horizontal',
            position: blankSequenceStart,
            confidence: Math.min(1.0, blankLength / 1.5),  // Even 1 blank col is significant
            blankLength
          })
        }
        blankSequenceStart = -1
      }
      lastFilledCol = col
    } else {
      if (blankSequenceStart === -1 && lastFilledCol !== -1) {
        blankSequenceStart = col
      }
    }
  }

  return boundaries.filter(b => b.confidence >= 0.5)
}

/**
 * Check if column is blank across all rows
 */
private isColumnBlank(rows: string[][], colIndex: number): boolean {
  // A column is blank if >95% of rows have empty cells in that column
  const blankCount = rows.filter(row => {
    const cell = row[colIndex] || ''
    return cell.trim() === ''
  }).length

  return blankCount / rows.length >= 0.95
}
```

#### 1.3 Table Segmentation

**Algorithm**: Partition sheet into regions based on boundaries

```typescript
interface DetectedTable {
  rowRange: [number, number]
  colRange: [number, number]
  headerRow?: number          // Detected header within this region
  sampleRows: string[][]      // First 10 rows for AI context
  confidence: number          // Overall confidence in this table
}

/**
 * Segment sheet into discrete tables based on detected boundaries
 */
private segmentTables(
  rows: string[][],
  verticalBoundaries: TableBoundary[],
  horizontalBoundaries: TableBoundary[]
): DetectedTable[] {

  // If no boundaries detected, entire sheet is one table (homogeneous case)
  if (verticalBoundaries.length === 0 && horizontalBoundaries.length === 0) {
    return [{
      rowRange: [0, rows.length - 1],
      colRange: [0, Math.max(...rows.map(r => r.length)) - 1],
      sampleRows: rows.slice(0, 20),
      confidence: 1.0
    }]
  }

  // Create partition boundaries (include start/end)
  const rowPartitions = [
    0,
    ...verticalBoundaries.map(b => b.position),
    rows.length
  ].sort((a, b) => a - b)

  const numCols = Math.max(...rows.map(r => r.length))
  const colPartitions = [
    0,
    ...horizontalBoundaries.map(b => b.position),
    numCols
  ].sort((a, b) => a - b)

  const tables: DetectedTable[] = []

  // Create table for each region (Cartesian product of partitions)
  for (let v = 0; v < rowPartitions.length - 1; v++) {
    for (let h = 0; h < colPartitions.length - 1; h++) {
      const rowStart = rowPartitions[v]
      const rowEnd = rowPartitions[v + 1] - 1
      const colStart = colPartitions[h]
      const colEnd = colPartitions[h + 1] - 1

      // Skip if this region overlaps with a blank boundary
      if (this.isBlankRegion(rows, rowStart, rowEnd, colStart, colEnd)) {
        continue
      }

      // Extract region data
      const regionRows = rows.slice(rowStart, rowEnd + 1).map(row =>
        row.slice(colStart, colEnd + 1)
      )

      // Check if region has meaningful data (not just headers)
      const dataRowCount = regionRows.filter(r => !this.isRowBlank(r)).length
      if (dataRowCount < 2) continue  // Need at least 2 rows (header + data)

      // Detect header row within this region
      const headerRow = this.detectHeaderInRegion(regionRows)

      tables.push({
        rowRange: [rowStart, rowEnd],
        colRange: [colStart, colEnd],
        headerRow: headerRow !== -1 ? rowStart + headerRow : undefined,
        sampleRows: regionRows.slice(0, 20),
        confidence: this.calculateRegionConfidence(regionRows, headerRow)
      })
    }
  }

  return tables.filter(t => t.confidence >= 0.3)  // Filter very low confidence regions
}

/**
 * Check if region is entirely blank
 */
private isBlankRegion(
  rows: string[][],
  rowStart: number,
  rowEnd: number,
  colStart: number,
  colEnd: number
): boolean {
  for (let r = rowStart; r <= rowEnd; r++) {
    const row = rows[r] || []
    for (let c = colStart; c <= colEnd; c++) {
      const cell = row[c] || ''
      if (cell.trim() !== '') return false
    }
  }
  return true
}

/**
 * Detect header row within a region using existing scoring heuristic
 */
private detectHeaderInRegion(regionRows: string[][]): number {
  let bestScore = 0
  let bestRow = -1

  // Check first 5 rows for header pattern
  for (let i = 0; i < Math.min(5, regionRows.length); i++) {
    const score = this.scoreAsHeaderRow(regionRows[i].map(c => String(c)))
    if (score >= 3 && score > bestScore) {
      bestScore = score
      bestRow = i
    }
  }

  return bestRow
}

/**
 * Calculate confidence score for a detected table
 */
private calculateRegionConfidence(regionRows: string[][], headerRow: number): number {
  let confidence = 0.3  // Base confidence

  // Has detected header = +0.3
  if (headerRow !== -1) confidence += 0.3

  // Has multiple data rows = +0.2
  const dataRowCount = headerRow !== -1
    ? regionRows.length - headerRow - 1
    : regionRows.length
  if (dataRowCount >= 3) confidence += 0.2

  // Has meaningful column count = +0.2
  const avgCellsPerRow = regionRows.reduce((sum, r) =>
    sum + r.filter(c => c.trim() !== '').length, 0
  ) / regionRows.length
  if (avgCellsPerRow >= 3) confidence += 0.2

  return Math.min(1.0, confidence)
}
```

### 2. Virtual Sheet Creation and Parallel Analysis

#### 2.1 Virtual Sheet Extraction

**Core Concept**: Treat each detected table as if it were its own independent sheet.

```typescript
interface VirtualSheet {
  name: string              // e.g., "Sheet1_table0", "Sheet1_table1"
  csv: string              // CSV data for just this table
  originalSheet: string     // Original sheet name
  tableIndex: number        // Index within original sheet
  rowRange: [number, number]
  colRange: [number, number]
  headerRow: number         // Pre-detected header row
}

/**
 * Extract a table region as a standalone virtual sheet
 */
private extractTableAsSheet(
  sheet: SheetData,
  table: DetectedTable,
  tableIndex: number
): VirtualSheet {

  const allRows = this.parseCSVToArray(sheet.csv)

  // Extract rows for this table region
  const tableRows = allRows.slice(table.rowRange[0], table.rowRange[1] + 1)

  // Extract columns for this table region (if horizontal split)
  const tableData = tableRows.map(row =>
    row.slice(table.colRange[0], table.colRange[1] + 1)
  )

  // Header is the first row (already identified by headerRow detection)
  const headers = tableData[table.headerRow - table.rowRange[0]]
  const dataRows = tableData.slice(table.headerRow - table.rowRange[0] + 1)

  // Convert back to CSV format
  const csv = [
    headers.join(','),
    ...dataRows.map(row => row.join(','))
  ].join('\n')

  return {
    name: `${sheet.name}_table${tableIndex}`,
    csv,
    originalSheet: sheet.name,
    tableIndex,
    rowRange: table.rowRange,
    colRange: table.colRange,
    headerRow: table.headerRow
  }
}
```

#### 2.2 Parallel Analysis with Existing Prompt

**Key Insight**: Reuse the existing ADR-024 `analyzeSheetUnified()` method!

```typescript
/**
 * Process sheet with automatic table detection
 */
async processSheet(sheet: SheetData, filename: string, profession?: string) {

  // Step 1: Detect table boundaries
  const detectedTables = this.segmentTablesWithHeaders(sheet)

  if (detectedTables.length === 1) {
    // FAST PATH (90%): Homogeneous sheet
    // Use existing ADR-024 analysis directly
    console.log(`   ✅ Single table detected - fast path`)
    const analysis = await this.analyzeSheetUnified(sheet, filename, profession)
    return this.extractHomogeneousSheet(sheet, analysis)
  }

  // MIXED PATH (10%): Multiple tables
  console.log(`   🔀 ${detectedTables.length} tables detected - parallel analysis`)

  // Step 2: Create virtual sheet for each table
  const virtualSheets = detectedTables.map((table, idx) =>
    this.extractTableAsSheet(sheet, table, idx)
  )

  // Step 3: Analyze ALL virtual sheets in parallel
  // Each uses the EXISTING analyzeSheetUnified() with no modifications!
  const analyses = await Promise.all(
    virtualSheets.map(vs =>
      this.analyzeSheetUnified(
        { name: vs.name, csv: vs.csv },
        filename,
        profession
      )
    )
  )

  // Step 4: Combine analyses and extract
  return this.extractFromMultipleAnalyses(virtualSheets, analyses)
}
```

#### 2.3 Analysis Result Structure

**Simple**: We reuse the existing `SheetAnalysis` interface from ADR-024!

```typescript
// Each virtual sheet returns standard ADR-024 analysis
interface SheetAnalysis {
  entityType: 'contracts' | 'receivables' | 'expenses' | 'skip'
  columnMapping: ColumnMapping
}

// ColumnMapping is unchanged from ADR-024
interface ColumnMapping {
  [csvColumn: string]: {
    field: string
    transform: 'date' | 'currency' | 'status' | 'text' | 'number' | 'enum'
    enumValues?: string[]
  }
}

// No complex SheetAnalysisResult with mixed structure needed!
// Just an array of standard analyses: SheetAnalysis[]
```

#### 2.4 Why This Approach Works

**1. Parallel Execution = No Latency Penalty**
```typescript
// Time for 3 tables:
// Sequential: 15s + 15s + 15s = 45s ❌
// Parallel: max(15s, 15s, 15s) = 15s ✅

await Promise.all([
  analyzeVirtualSheet1(),  // Starts at t=0
  analyzeVirtualSheet2(),  // Starts at t=0
  analyzeVirtualSheet3()   // Starts at t=0
])
// All complete at t=~15s
```

**2. Cost Optimization with Prompt Caching**
```typescript
// With Anthropic prompt caching:
// Call 1: System prompt (2000 tokens) + Table 1 data (2000) = 4000 tokens
// Call 2: System prompt CACHED + Table 2 data (2000) = 2000 tokens charged
// Call 3: System prompt CACHED + Table 3 data (2000) = 2000 tokens charged
// Total: 8000 tokens (same as one large call!)
```

**3. No Cross-Table Dependencies**
```typescript
// Contracts analysis doesn't need receivables context
const contractAnalysis = {
  entityType: "contracts",
  columnMapping: { "Nome Projeto": { field: "projectName", ... } }
}

// Receivables analysis doesn't need contracts context
const receivableAnalysis = {
  entityType: "receivables",
  columnMapping: { "Valor Parcela": { field: "amount", ... } }
}

// Contract ID mapping happens in post-processing (as it does in ADR-024)
await this.mapContractIds(receivables)  // Maps project names → UUIDs
```

### 3. Extraction Logic

#### 3.1 Simplified Extraction (Reuses ADR-024 Logic)

**Key Insight**: Because we analyze virtual sheets independently, extraction is identical to ADR-024!

```typescript
/**
 * Extract from multiple analyses (mixed sheets)
 */
private extractFromMultipleAnalyses(
  virtualSheets: VirtualSheet[],
  analyses: SheetAnalysis[]
): ExtractionResult {

  const result: ExtractionResult = {
    contracts: [],
    receivables: [],
    expenses: []
  }

  // Process each virtual sheet with its analysis
  for (let i = 0; i < virtualSheets.length; i++) {
    const virtualSheet = virtualSheets[i]
    const analysis = analyses[i]

    // Skip non-financial sheets
    if (analysis.entityType === 'skip') continue

    console.log(`   📋 ${virtualSheet.name}: ${analysis.entityType}`)

    // Use existing ADR-024 extraction logic!
    const rows = this.parseCSV(virtualSheet.csv)
    const entities = rows
      .map(row => this.extractEntity(row, analysis.columnMapping))
      .filter(e => e !== null)

    // Accumulate entities by type
    result[`${analysis.entityType}s`].push(...entities)
  }

  console.log(`   ✅ Mixed extraction complete: ${result.contracts.length}c, ${result.receivables.length}r, ${result.expenses.length}e`)

  return result
}

/**
 * Main extraction method (homogeneous path unchanged)
 */
private extractSheetData(
  sheet: SheetData,
  analysis: SheetAnalysis
): ExtractionResult {

  // Existing ADR-024 logic - no changes needed!
  const rows = this.parseCSV(sheet.csv)
  const entityType = analysis.entityType

  if (entityType === 'skip') {
    return { contracts: [], receivables: [], expenses: [] }
  }

  const entities = rows
    .map(row => this.extractEntity(row, analysis.columnMapping))
    .filter(e => e !== null)

  const result: ExtractionResult = {
    contracts: [],
    receivables: [],
    expenses: []
  }

  result[`${entityType}s`] = entities

  return result
}
```

**Simplification Benefits**:
- ✅ No new extraction logic needed
- ✅ No spatial reasoning in extraction
- ✅ Same deterministic transformations (currency, date, status)
- ✅ Same post-processing pipeline
- ✅ Reuses all existing `extractEntity()` and transformation code

## Performance Analysis

### Expected Performance by Case

| Case | Tables | Frequency | Current V2 | With ADR-025 | Change |
|------|--------|-----------|------------|--------------|--------|
| **Homogeneous** | 1 | 90% | 15-25s | 15-25s | **No change** ⭐ |
| **Mixed (2 tables)** | 2 | 6% | ❌ Broken | 15-25s | **No change** ✅ |
| **Mixed (3 tables)** | 3 | 3% | ❌ Broken | 18-28s | +3s ✅ |
| **Mixed (4 tables)** | 4 | 0.8% | ❌ Broken | 20-30s | +5s ✅ |
| **Mixed (5+ tables)** | 5+ | 0.2% | ❌ Broken | 25-35s | +10s ✅ |

### Phase Breakdown (Mixed Sheet with 3 Tables)

| Phase | Time | Method | Notes |
|-------|------|--------|-------|
| 1. File Structure | 0.3s | Code | Same as ADR-024 |
| 1a. Boundary Detection | 0.2s | Code | NEW: Blank row/col detection |
| 1b. Table Segmentation | 0.1s | Code | NEW: Region partitioning |
| 1c. Virtual Sheet Creation | 0.1s | Code | NEW: Extract table as CSV |
| **2. AI Analysis (parallel)** | **15-20s** | **AI** | **3 parallel calls = same as 1 call!** ⭐ |
| 3. Deterministic Extraction | 0.5-1s | Code | Same per-table logic as ADR-024 |
| 4. Post-processing | 0.5-1s | Code | Contract ID mapping |
| 5. Bulk Creation | 1-2s | DB | Same as ADR-024 |
| **Total** | **18-28s** | - | **Only +3s for 3 tables!** ✅ |

### Key Performance Insight: Parallel = No TTFT Penalty

```
MISCONCEPTION (Sequential Thinking):
3 AI calls = 1.5s TTFT × 3 + 15s processing × 3 = 49.5s ❌

REALITY (Parallel Execution):
3 AI calls = max(1.5s TTFT, 1.5s TTFT, 1.5s TTFT) + max(15s, 15s, 15s)
           = 1.5s + 15s = 16.5s ✅

All calls start simultaneously!
```

### Cost Analysis with Prompt Caching

**Example: 3-table mixed sheet**

```typescript
// Call 1 (Table 1):
Input:  System prompt (2000) + Table 1 data (2000) = 4000 tokens
Output: 500 tokens
Cost:   4000 × $3/M + 500 × $15/M = $0.012 + $0.0075 = $0.0195

// Call 2 (Table 2) - System prompt CACHED:
Input:  Table 2 data (2000) = 2000 tokens (cache hit!)
Output: 500 tokens
Cost:   2000 × $3/M + 500 × $15/M = $0.006 + $0.0075 = $0.0135

// Call 3 (Table 3) - System prompt CACHED:
Input:  Table 3 data (2000) = 2000 tokens (cache hit!)
Output: 500 tokens
Cost:   2000 × $3/M + 500 × $15/M = $0.006 + $0.0075 = $0.0135

Total: $0.0465 (same as one large unified call!)
```

### Why Performance is Excellent

1. **90% of sheets unchanged**: Homogeneous sheets keep ADR-024 performance
2. **Parallel execution**: Multiple tables processed simultaneously (no sequential penalty)
3. **Cost optimized**: Prompt caching makes multiple calls cost-equivalent to one
4. **Minimal overhead**: <0.5s for boundary detection + virtual sheet creation
5. **Scalable**: Even 4-5 tables only add 5-10s (due to slightly longer AI processing)

## Implementation Plan

### Week 1: Core Programmatic Detection (3 days)

**Day 1: Blank Sequence Detection**
- [ ] Implement `detectBlankRows()`
- [ ] Implement `detectBlankColumns()`
- [ ] Unit tests for various patterns
- [ ] Edge case handling (single blank row, partial blanks)

**Day 2: Table Segmentation**
- [ ] Implement `segmentTables()`
- [ ] Implement `isBlankRegion()`
- [ ] Implement `detectHeaderInRegion()`
- [ ] Implement `calculateRegionConfidence()`
- [ ] Unit tests for segmentation logic

**Day 3: Integration & Testing**
- [ ] Integrate with existing `extractSheetsData()`
- [ ] Create test suite with 15+ mixed sheet scenarios
- [ ] Validate programmatic detection accuracy (target: 85%+)
- [ ] Document false positive patterns

### Week 2: Enhanced AI Analysis (3 days)

**Day 1: Prompt Engineering**
- [ ] Implement `formatDetectedTablesHint()`
- [ ] Extend unified analysis prompt with hints
- [ ] Add validation logic for mixed analysis results
- [ ] Test prompt with diverse mixed sheets

**Day 2: Mixed Sheet Extraction**
- [ ] Implement `extractMixedSheet()`
- [ ] Implement `extractTableRows()`
- [ ] Handle column range slicing for horizontal tables
- [ ] Unit tests for extraction logic

**Day 3: End-to-End Testing**
- [ ] Test complete flow with 20+ mixed sheets
- [ ] Measure accuracy vs expected results
- [ ] Performance benchmarking
- [ ] Edge case validation

### Week 3: Production Rollout (5 days)

**Days 1-2: Comprehensive Testing**
- [ ] Create test suite with 50+ diverse files
  - Vertical mixing (10 files)
  - Horizontal mixing (10 files)
  - Complex layouts (10 files)
  - Edge cases (20 files)
- [ ] Accuracy validation (target: 95%+)
- [ ] Performance validation (target: <35s for mixed)
- [ ] Memory usage testing

**Day 3: Feature Flag & Monitoring**
- [ ] Add `SETUP_ASSISTANT_SUPPORT_MIXED_SHEETS` flag
- [ ] Add telemetry for mixed sheet detection
- [ ] Add performance metrics per sheet structure type
- [ ] Create alerts for low confidence detections

**Days 4-5: Gradual Rollout**
- [ ] Enable for 10% of users
- [ ] Monitor accuracy and performance metrics
- [ ] Fix critical issues if found
- [ ] Increase to 25% → 50% → 100%

## Success Metrics

### Must Have (Launch Blockers)
- ✅ 95%+ accuracy on mixed sheets
- ✅ <35s processing time for 2-3 table sheets
- ✅ <45s processing time for 4+ table sheets
- ✅ No regression on homogeneous sheets (maintain 15-25s)
- ✅ Error rate <2%

### Nice to Have
- 🎯 97%+ accuracy on mixed sheets
- 🎯 <30s for 2-3 table sheets
- 🎯 Automatic confidence scoring (warn on low confidence)
- 🎯 User feedback mechanism for misclassified tables

## Rollback Plan

**If mixed sheet support causes issues**:

1. **Immediate Rollback** (<5 minutes):
   ```bash
   # Disable mixed sheet detection
   SETUP_ASSISTANT_SUPPORT_MIXED_SHEETS=false
   ```
   Result: All sheets treated as homogeneous (ADR-024 behavior)

2. **Partial Rollback** (disable programmatic hints):
   ```typescript
   // Force AI to analyze without hints
   const detectedTables = [{
     rowRange: [0, rows.length - 1],
     colRange: [0, numCols - 1],
     confidence: 1.0
   }]
   ```
   Result: AI still detects mixed, but without programmatic hints

3. **Code Rollback** (<30 minutes):
   ```bash
   git revert HEAD
   git push
   ```

## Known Limitations

### 1. Horizontal Table Detection Accuracy

**Challenge**: Side-by-side tables with no blank column separator

**Example**:
```
Col A-C: Contracts (no space) Col D-F: Receivables
```

**Mitigation**:
- Programmatic detection will miss this pattern
- AI analysis without hints will still attempt classification
- User can manually separate into different sheets if needed

**Future Enhancement**: Detect semantic column grouping (contracts columns vs receivables columns)

### 2. Complex Nested Structures

**Challenge**: Tables within tables, or irregular layouts

**Example**:
```
[Header row spanning entire width]
[Left: Contracts | Right: Summary table]
[Left continues | Right: Different summary]
```

**Mitigation**:
- Mark as low confidence
- Fall back to homogeneous extraction
- Document unsupported patterns

### 3. Very Large Mixed Sheets

**Challenge**: 10+ tables in one sheet might exceed AI context window

**Mitigation**:
- Limit to first 8 detected tables
- Warn user about potential missed data
- Suggest splitting into multiple sheets

## Future Enhancements

### Phase 2: User Feedback Loop (Future)

Allow users to correct misclassified tables:
```typescript
interface UserFeedback {
  sheetId: string
  correctedStructure: SheetAnalysisResult
  confidence: number
}

// Use feedback to improve future classifications
```

### Phase 3: Semantic Column Grouping (Future)

Detect horizontal tables without blank columns:
```typescript
// Detect when column names change semantically
// "Nome Projeto, Valor, Status" vs "Parcela, Vencimento, Pago"
// → Different semantic groups → Likely different tables
```

### Phase 4: Visual Layout Analysis (Future)

For PDF/image files, use vision API to detect table boundaries visually.

## Related Documents

- [ADR-024: File Import Unified Architecture](./024-file-import-unified-architecture-success.md) - Foundation
- [ADR-023: File Import Architecture V2](./023-file-import-architecture-v2.md) - Planning phase
- [SetupAssistantServiceV2.ts](../../lib/services/SetupAssistantServiceV2.ts) - Implementation base

## Approval

- [ ] Technical Review: _______
- [ ] Product Review: _______
- [ ] Performance Review: _______
- [ ] Ready for Implementation: _______

---

**Author**: Claude Code & Jose Lyra
**Date**: 2025-11-07
**Status**: 📋 Proposed
**Implementation Effort**: 3 weeks
**Expected Impact**: 100% sheet type coverage (vs current 90%)
