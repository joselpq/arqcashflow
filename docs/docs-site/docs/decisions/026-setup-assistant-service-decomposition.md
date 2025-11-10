---
title: "026: SetupAssistant Service Decomposition - SOLID Architecture Refactoring"
type: "decision"
audience: ["developer", "agent", "architect"]
contexts: ["architecture", "refactoring", "service-layer", "solid-principles", "code-quality"]
complexity: "advanced"
last_updated: "2025-11-10"
version: "1.0"
agent_roles: ["architecture-reviewer", "refactoring-specialist", "code-quality-engineer"]
decision_status: "accepted"
decision_date: "2025-11-10"
related:
  - decisions/023-file-import-architecture-v2.md
  - decisions/024-file-import-unified-architecture-success.md
  - decisions/025-mixed-entity-sheet-support.md
  - decisions/004-no-regrets-architecture-improvements.md
dependencies: ["typescript", "exceljs", "anthropic-sdk", "pdf-parse"]
---

# 026: SetupAssistant Service Decomposition - SOLID Architecture Refactoring

## Context for LLM Agents

**Scope**: This ADR documents the strategic refactoring of SetupAssistantServiceV2.ts from a monolithic 2067-line service into a modular, SOLID-compliant architecture with 7 focused components.

**Prerequisites**: Understanding of SOLID principles, service layer architecture, file processing workflows, and the SetupAssistant V2 implementation (ADR-023, ADR-024, ADR-025)

**Key Patterns**:
- Single Responsibility Principle (SRP) enforcement
- Service decomposition strategy
- Facade pattern for orchestration
- Dependency injection for testability
- Interface-based design for modularity

## Status

**Status**: Accepted
**Date**: 2025-11-10
**Decision Makers**: Core development team
**Supersedes**: N/A (Enhancement of existing architecture)

## Context

### Problem Statement

SetupAssistantServiceV2.ts has grown to **2067 lines** with **34 methods**, handling 7 distinct responsibilities:

1. File type detection and validation
2. Excel parsing and data extraction
3. Table boundary detection (ADR-025)
4. AI analysis and column mapping
5. Data transformation and extraction
6. Vision processing (PDF/image)
7. Bulk entity creation and orchestration

**Industry Benchmarks:**
- ✅ **Recommended**: 300-500 lines per class
- ⚠️ **Acceptable**: 500-1000 lines (if single responsibility)
- 🔴 **Code Smell**: 1000+ lines (multiple responsibilities)
- 🚨 **Critical**: 2000+ lines (strong refactoring indicator)

**Current State:**
- SetupAssistantServiceV2: **2067 lines** (4x industry threshold)
- Average service in codebase: **~800 lines**
- SetupAssistantServiceV2: **2.5x larger** than codebase average

### Research Findings

**SOLID Principles Violation:**
> "Don't count lines of code because it depends on the application and context. Count responsibilities instead." - Industry consensus (2024-2025)

**Single Responsibility Principle:**
- Each class should have **one reason to change**
- Service classes can have multiple methods if they operate on the **same type of data**
- File contains 7 distinct domains → **7 reasons to change**

**Refactoring Threshold:**
- Classes over **300-500 lines** are candidates for refactoring
- Focus on **responsibilities**, not just line count
- Large classes often indicate **multiple concerns** that could be divided

### Decision Drivers

**Technical Drivers:**
1. **Maintainability**: 2000+ lines difficult to navigate and understand
2. **Testability**: Multiple responsibilities require complex mocking
3. **Reusability**: Components like TableSegmenter locked inside monolith
4. **Single Responsibility**: 7 distinct concerns violate SRP
5. **Team Velocity**: Large file slows down code reviews and changes

**Business Drivers:**
1. **Future Features**: Need reusable table detection for other imports
2. **Quality**: Easier to test isolated components
3. **Onboarding**: New developers overwhelmed by large file
4. **Risk Mitigation**: Changes in one area shouldn't break others

**Constraints:**
- Must maintain 100% backward compatibility
- Cannot degrade performance (15-25s processing time)
- Must preserve all ADR-025 mixed sheet functionality
- Need to maintain audit logging and error handling

## Decision

### What We Decided

**Decompose SetupAssistantServiceV2 into 7 focused, SOLID-compliant components:**

```
lib/services/setup-assistant/
├── core/
│   ├── FileTypeDetector.ts       (~50 lines)   - File detection
│   ├── ExcelParser.ts             (~150 lines)  - Excel parsing
│   └── DataTransformer.ts         (~400 lines)  - Value transformation
├── analysis/
│   ├── TableSegmenter.ts          (~400 lines)  - Boundary detection
│   └── SheetAnalyzer.ts           (~300 lines)  - AI analysis
├── extraction/
│   ├── VisionExtractor.ts         (~200 lines)  - PDF/image
│   └── BulkEntityCreator.ts       (~200 lines)  - Batch creation
└── SetupAssistantServiceV2.ts      (~300 lines)  - Orchestration
```

**Total: ~2000 lines** (same functionality, better architecture)

### Architecture Pattern: Facade + Strategy

**Main Service (SetupAssistantServiceV2):**
- Acts as **Facade** - single entry point for API routes
- Orchestrates workflow across components
- Handles error boundaries and logging
- Maintains public API compatibility

**Component Classes:**
- Focused, testable, reusable
- Single responsibility each
- Clear interfaces
- Dependency injection ready

## Detailed Refactoring Plan

### Phase 1: Extract File Detection (~50 lines, 30 minutes)

**File**: `lib/services/setup-assistant/core/FileTypeDetector.ts`

**Responsibilities:**
- Detect file type from extension and magic bytes
- Validate supported file types
- Return FileType enum

**Interface:**
```typescript
export class FileTypeDetector {
  detectFileType(filename: string, buffer: Buffer): FileType
  private detectFromExtension(filename: string): FileType | null
  private detectFromMagicBytes(buffer: Buffer): FileType | null
}
```

**Source Lines**: 212-232 (21 lines + docs)

**Testing Strategy:**
- Unit tests for each file type
- Magic byte detection tests
- Error handling tests

---

### Phase 2: Extract Excel Parser (~150 lines, 1 hour)

**File**: `lib/services/setup-assistant/core/ExcelParser.ts`

**Responsibilities:**
- Parse XLSX workbook
- Extract sheet data with normalized formats
- CSV conversion
- Header detection (legacy mode)

**Interface:**
```typescript
interface SheetExtractionOptions {
  supportMixedSheets: boolean
  detectHeaders: boolean
}

export class ExcelParser {
  parseWorkbook(fileBuffer: Buffer): XLSX.WorkBook
  extractSheetsData(
    workbook: XLSX.WorkBook,
    options: SheetExtractionOptions
  ): SheetData[]

  private scoreAsHeaderRow(cells: string[]): number
  private convertToCSV(rows: any[][]): string
  private escapeCsvValue(value: any): string
}
```

**Source Lines**: 234-389 (155 lines)

**Dependencies:**
- `xlsx` library
- `SheetData` interface

**Testing Strategy:**
- Parse various Excel formats
- Test CSV conversion accuracy
- Header detection accuracy tests
- Mixed sheet mode tests

---

### Phase 3: Extract Table Segmenter (~400 lines, 2 hours)

**File**: `lib/services/setup-assistant/analysis/TableSegmenter.ts`

**Responsibilities:**
- Detect table boundaries (vertical and horizontal)
- Segment mixed sheets into virtual sheets
- Calculate confidence scores
- Extract table regions

**Interface:**
```typescript
export interface TableBoundary {
  type: 'vertical' | 'horizontal'
  position: number
  confidence: number
  blankLength: number
}

export interface DetectedTable {
  rowRange: [number, number]
  colRange: [number, number]
  headerRow?: number
  sampleRows: string[][]
  confidence: number
}

export interface VirtualSheet {
  name: string
  csv: string
  originalSheet: string
  tableIndex: number
  rowRange: [number, number]
  colRange: [number, number]
  headerRow?: number
}

export class TableSegmenter {
  // Boundary detection
  detectBlankRows(rows: string[][]): TableBoundary[]
  detectBlankColumns(rows: string[][]): TableBoundary[]

  // Table segmentation
  segmentTables(
    sheet: SheetData,
    options: { minConfidence: number }
  ): DetectedTable[]

  segmentTablesWithHeaders(sheet: SheetData): DetectedTable[]

  // Virtual sheet creation
  extractTableAsSheet(
    sheet: SheetData,
    table: DetectedTable,
    tableIndex: number
  ): VirtualSheet

  // Helper methods
  private isRowBlank(row: string[]): boolean
  private isColumnBlank(rows: string[][], colIndex: number): boolean
  private isBlankRegion(rows: string[][], rowRange: [number, number]): boolean
  private detectHeaderInRegion(regionRows: string[][]): number
  private calculateRegionConfidence(regionRows: string[][], headerRow: number): number
}
```

**Source Lines**: 398-757 (359 lines)

**Key Features:**
- ADR-025 mixed sheet support
- Confidence scoring
- Flexible boundary detection

**Testing Strategy:**
- Test various mixed sheet layouts
- Boundary detection accuracy
- Confidence score validation
- Virtual sheet creation tests

**Reusability**: 🎯 Can be used for future import features!

---

### Phase 4: Extract Sheet Analyzer (~300 lines, 1.5 hours)

**File**: `lib/services/setup-assistant/analysis/SheetAnalyzer.ts`

**Responsibilities:**
- AI-powered sheet analysis (Claude integration)
- Column mapping generation
- Sheet type classification
- Unified analysis orchestration

**Interface:**
```typescript
export interface ColumnMapping {
  [csvColumn: string]: {
    field: string
    transform: 'date' | 'currency' | 'status' | 'text' | 'number' | 'enum'
    enumValues?: string[]
  }
}

export interface SheetAnalysis {
  sheetName: string
  sheetType: 'contracts' | 'receivables' | 'expenses' | 'skip'
  columnMapping: ColumnMapping
}

export interface AnalysisOptions {
  profession: string
  modelConfig: {
    model: string
    thinkingBudget: number
    maxTokens: number
  }
}

export class SheetAnalyzer {
  constructor(private anthropic: Anthropic)

  async analyzeSheet(
    sheet: SheetData,
    options: AnalysisOptions
  ): Promise<SheetAnalysis>

  async analyzeMultipleSheets(
    sheets: SheetData[],
    options: AnalysisOptions
  ): Promise<SheetAnalysis[]>

  private buildAnalysisPrompt(
    csv: string,
    profession: string
  ): string

  private parseAnalysisResponse(response: string): SheetAnalysis
}
```

**Source Lines**: 756-1038 (282 lines)

**Dependencies:**
- Anthropic SDK
- Profession configuration

**Testing Strategy:**
- Mock Claude API responses
- Test prompt generation
- Response parsing validation
- Error handling tests

---

### Phase 5: Extract Data Transformer (~400 lines, 2 hours)

**File**: `lib/services/setup-assistant/core/DataTransformer.ts`

**Responsibilities:**
- Transform raw CSV values to typed entities
- Currency parsing (Brazilian/US formats)
- Date normalization
- Status/enum mapping
- Post-processing logic

**Interface:**
```typescript
export interface TransformOptions {
  targetType: 'date' | 'currency' | 'status' | 'text' | 'number' | 'enum'
  enumValues?: string[]
}

export class DataTransformer {
  // Value transformation
  transformValue(value: string, options: TransformOptions): any

  // Specific transformers
  private transformDate(value: string): string
  private transformCurrency(value: string): number
  private transformStatus(value: string): string
  private transformEnum(value: string, enumValues: string[]): string

  // Entity extraction
  extractEntity(
    row: Record<string, string>,
    mapping: ColumnMapping,
    entityType: 'contract' | 'receivable' | 'expense'
  ): any

  // Post-processing
  postProcessEntities(data: ExtractionResult): ExtractionResult

  // Helper methods
  private normalizeDate(dateInput: string | Date): string
  private parseCSV(csv: string): Record<string, string>[]
  private parseCSVLine(line: string): string[]
}
```

**Source Lines**: 1079-1573 (494 lines)

**Key Features:**
- Brazilian currency format support
- Flexible date parsing
- Enum normalization
- Required field inference

**Testing Strategy:**
- Test all transformation types
- Edge case handling
- Brazilian format tests
- Post-processing validation

---

### Phase 6: Extract Vision Extractor (~200 lines, 1 hour)

**File**: `lib/services/setup-assistant/extraction/VisionExtractor.ts`

**Responsibilities:**
- PDF text extraction and vision analysis
- Image processing and OCR
- Base64 encoding
- Vision-based entity extraction

**Interface:**
```typescript
export interface VisionExtractionOptions {
  profession: string
  modelConfig: {
    model: string
    thinkingBudget: number
    maxTokens: number
  }
}

export class VisionExtractor {
  constructor(private anthropic: Anthropic)

  async extractFromPdf(
    fileBuffer: Buffer,
    filename: string,
    options: VisionExtractionOptions
  ): Promise<ExtractionResult>

  async extractFromImage(
    fileBuffer: Buffer,
    filename: string,
    options: VisionExtractionOptions
  ): Promise<ExtractionResult>

  private async analyzeWithVision(
    content: { type: string; source: any }[],
    prompt: string,
    modelConfig: any
  ): Promise<string>

  private buildVisionPrompt(profession: string): string
  private parseVisionResponse(response: string): ExtractionResult
  private getImageMediaType(filename: string): string
}
```

**Source Lines**: 1726-1919 (193 lines)

**Dependencies:**
- Anthropic SDK (vision API)
- pdf-parse library
- Buffer utilities

**Testing Strategy:**
- Mock vision API responses
- Test various image formats
- PDF parsing tests
- Error handling tests

**Reusability**: 🎯 Can be used for invoice scanning, receipt processing!

---

### Phase 7: Extract Bulk Entity Creator (~200 lines, 1 hour)

**File**: `lib/services/setup-assistant/extraction/BulkEntityCreator.ts`

**Responsibilities:**
- Bulk validation (parallel)
- Batch database inserts
- Contract ID mapping
- Audit logging
- Error aggregation

**Interface:**
```typescript
export interface BulkCreationOptions {
  continueOnError: boolean
  batchSize: number
}

export interface BulkCreationResult {
  contractsCreated: number
  receivablesCreated: number
  expensesCreated: number
  errors: string[]
  warnings: string[]
}

export class BulkEntityCreator {
  constructor(
    private contractService: ContractService,
    private receivableService: ReceivableService,
    private expenseService: ExpenseService
  )

  async createEntities(
    data: ExtractionResult,
    options: BulkCreationOptions
  ): Promise<BulkCreationResult>

  async mapContractIds(
    receivables: ExtractedReceivable[]
  ): Promise<ExtractedReceivable[]>

  private async validateAndCreateContracts(
    contracts: any[]
  ): Promise<{ created: any[], errors: string[] }>

  private async validateAndCreateReceivables(
    receivables: any[]
  ): Promise<{ created: any[], errors: string[] }>

  private async validateAndCreateExpenses(
    expenses: any[]
  ): Promise<{ created: any[], errors: string[] }>
}
```

**Source Lines**: 1574-1725 (151 lines)

**Dependencies:**
- ContractService
- ReceivableService
- ExpenseService

**Testing Strategy:**
- Test parallel validation
- Error handling tests
- Contract ID mapping tests
- Audit logging validation

---

### Phase 8: Refactor Main Service (~300 lines, 2 hours)

**File**: `lib/services/SetupAssistantServiceV2.ts` (refactored)

**New Structure:**
```typescript
/**
 * SetupAssistantServiceV2 - Orchestration Layer
 *
 * This service coordinates the 4-phase file import workflow:
 * Phase 1: File Structure Extraction
 * Phase 2: Unified Analysis
 * Phase 3: Data Extraction
 * Phase 4: Bulk Creation
 *
 * Architecture: Facade pattern with dependency injection
 * Components: Composed from specialized services
 */
export class SetupAssistantServiceV2 extends BaseService<any, any, any, any> {
  // Core dependencies
  private anthropic: Anthropic
  private contractService: ContractService
  private receivableService: ReceivableService
  private expenseService: ExpenseService

  // Composed components
  private fileDetector: FileTypeDetector
  private excelParser: ExcelParser
  private tableSegmenter: TableSegmenter
  private sheetAnalyzer: SheetAnalyzer
  private dataTransformer: DataTransformer
  private visionExtractor: VisionExtractor
  private bulkCreator: BulkEntityCreator

  constructor(context: ServiceContext) {
    super(context, 'setup_assistant_v2', [])

    // Initialize components
    this.fileDetector = new FileTypeDetector()
    this.excelParser = new ExcelParser()
    this.tableSegmenter = new TableSegmenter()
    this.sheetAnalyzer = new SheetAnalyzer(this.anthropic)
    this.dataTransformer = new DataTransformer()
    this.visionExtractor = new VisionExtractor(this.anthropic)
    this.bulkCreator = new BulkEntityCreator(
      this.contractService,
      this.receivableService,
      this.expenseService
    )
  }

  // Main entry points
  async processFile(
    fileBuffer: Buffer,
    filename: string,
    professionOverride?: string
  ): Promise<ProcessingResult>

  // Orchestration methods
  private async processExcelFile(...): Promise<ProcessingResult>
  private async processVisionFile(...): Promise<ProcessingResult>
  private async processSheetWithMixedSupport(...): Promise<ExtractionResult>

  // Configuration
  private get useHaiku(): boolean
  private get supportMixedSheets(): boolean
  private getModelConfig(): ModelConfig
}
```

**Responsibilities:**
- Orchestrate workflow
- Coordinate components
- Performance tracking
- Error boundary handling
- Public API surface

**Source Lines**: Reduced from 2067 → ~300 lines

**Testing Strategy:**
- Integration tests for full workflow
- Component integration tests
- Performance regression tests
- Error handling tests

---

## Implementation Timeline

### Week 1: Foundation (Days 1-3)

**Day 1 (3-4 hours):**
- ✅ Create directory structure
- ✅ Extract FileTypeDetector (30 min)
- ✅ Extract ExcelParser (1 hour)
- ✅ Write unit tests for both
- ✅ Update imports in main service

**Day 2 (4-5 hours):**
- ✅ Extract TableSegmenter (2 hours)
- ✅ Write comprehensive tests
- ✅ Validate ADR-025 functionality
- ✅ Update main service

**Day 3 (4-5 hours):**
- ✅ Extract SheetAnalyzer (1.5 hours)
- ✅ Extract DataTransformer (2 hours)
- ✅ Write unit tests
- ✅ Update main service

### Week 2: Completion (Days 4-5)

**Day 4 (4-5 hours):**
- ✅ Extract VisionExtractor (1 hour)
- ✅ Extract BulkEntityCreator (1 hour)
- ✅ Write unit tests
- ✅ Update main service

**Day 5 (4-6 hours):**
- ✅ Refactor main service orchestration
- ✅ Write integration tests
- ✅ Performance regression testing
- ✅ Documentation updates

**Total Effort:** 8-10 days (1-1.5 weeks)

---

## Testing Strategy

### Unit Testing (Per Component)

**File Type Detector:**
```typescript
describe('FileTypeDetector', () => {
  it('detects XLSX from extension')
  it('detects PDF from magic bytes')
  it('throws error for unsupported types')
})
```

**Excel Parser:**
```typescript
describe('ExcelParser', () => {
  it('parses valid workbook')
  it('extracts sheet data with dates normalized')
  it('converts to CSV correctly')
  it('detects headers in legacy mode')
})
```

**Table Segmenter:**
```typescript
describe('TableSegmenter', () => {
  it('detects vertical boundaries')
  it('detects horizontal boundaries')
  it('segments mixed sheets correctly')
  it('creates virtual sheets with correct ranges')
  it('calculates confidence scores accurately')
})
```

**Sheet Analyzer:**
```typescript
describe('SheetAnalyzer', () => {
  it('analyzes single sheet', async () => {
    // Mock Anthropic response
  })
  it('classifies sheet type correctly')
  it('generates column mapping')
  it('handles AI errors gracefully')
})
```

**Data Transformer:**
```typescript
describe('DataTransformer', () => {
  it('transforms Brazilian currency format')
  it('normalizes dates correctly')
  it('maps status enums')
  it('post-processes required fields')
})
```

**Vision Extractor:**
```typescript
describe('VisionExtractor', () => {
  it('extracts from PDF', async () => {
    // Mock vision API
  })
  it('extracts from image')
  it('handles vision errors')
})
```

**Bulk Entity Creator:**
```typescript
describe('BulkEntityCreator', () => {
  it('validates and creates entities in parallel')
  it('maps contract IDs correctly')
  it('handles partial failures')
  it('aggregates errors correctly')
})
```

### Integration Testing

**Full Workflow:**
```typescript
describe('SetupAssistantServiceV2 Integration', () => {
  it('processes homogeneous XLSX file', async () => {
    // End-to-end test with real file
    // Verify 37c, 305r, 131e created
  })

  it('processes mixed sheet XLSX file', async () => {
    // Test ADR-025 functionality
  })

  it('processes PDF file', async () => {
    // Test vision extraction
  })

  it('handles errors gracefully', async () => {
    // Test error boundary
  })
})
```

### Performance Regression Testing

**Benchmark Suite:**
```typescript
describe('Performance Regression', () => {
  it('processes teste_TH2.xlsx in <30s', async () => {
    const start = Date.now()
    await service.processFile(buffer, 'teste_TH2.xlsx')
    const duration = Date.now() - start
    expect(duration).toBeLessThan(30000)
  })

  it('maintains phase timing targets', async () => {
    // Phase 1: <500ms
    // Phase 2: 10-15s
    // Phase 3: <1s
    // Phase 4: 1-2s
  })
})
```

---

## Migration Strategy

### Phase 0: Preparation (Pre-work)

1. **Create feature branch:**
   ```bash
   git checkout -b refactor/setup-assistant-decomposition
   ```

2. **Backup current implementation:**
   ```bash
   cp lib/services/SetupAssistantServiceV2.ts \
      lib/services/SetupAssistantServiceV2.backup.ts
   ```

3. **Create directory structure:**
   ```bash
   mkdir -p lib/services/setup-assistant/{core,analysis,extraction}
   ```

### Phase 1: Extract & Test (Incremental)

**Approach: One component at a time**

1. Extract component class
2. Write unit tests (TDD approach)
3. Update main service to use component
4. Run integration tests
5. Commit atomically

**Example Commit Sequence:**
```
feat(setup-assistant): extract FileTypeDetector component
feat(setup-assistant): extract ExcelParser component
feat(setup-assistant): extract TableSegmenter component
...
```

### Phase 2: Validate (Pre-merge)

**Validation Checklist:**
- [ ] All unit tests pass (100% coverage target)
- [ ] Integration tests pass
- [ ] Performance benchmarks meet targets (<30s for teste_TH2.xlsx)
- [ ] ADR-025 mixed sheet functionality preserved
- [ ] Error handling preserved
- [ ] Audit logging preserved
- [ ] No breaking changes to API routes

### Phase 3: Deploy (Gradual)

**Deployment Strategy:**

1. **Staging Environment** (Week 1)
   - Deploy refactored code
   - Run full test suite
   - Monitor for issues

2. **Production Canary** (Week 2)
   - Deploy to 10% of requests
   - Monitor error rates
   - Compare performance metrics

3. **Full Rollout** (Week 3)
   - Deploy to 100%
   - Monitor for 1 week
   - Remove old backup file

### Rollback Plan

**If issues detected:**

1. **Immediate rollback:**
   ```bash
   git revert <refactor-commit-range>
   git push origin main
   ```

2. **Restore from backup:**
   ```bash
   cp lib/services/SetupAssistantServiceV2.backup.ts \
      lib/services/SetupAssistantServiceV2.ts
   ```

3. **Investigate issues offline**

---

## Consequences

### Positive Consequences

**Code Quality:**
- ✅ **SOLID Compliance**: Each class has single responsibility
- ✅ **Testability**: Isolated components easy to test
- ✅ **Maintainability**: ~300 lines per file (vs 2067)
- ✅ **Readability**: Clear separation of concerns
- ✅ **Reusability**: TableSegmenter, VisionExtractor reusable elsewhere

**Development Velocity:**
- ✅ **Faster changes**: Isolated components reduce blast radius
- ✅ **Better reviews**: Smaller files easier to review
- ✅ **Easier debugging**: Clear component boundaries
- ✅ **Onboarding**: New developers understand faster

**Architecture:**
- ✅ **Future-proof**: Easy to add new import formats
- ✅ **Scalability**: Can optimize individual components
- ✅ **Flexibility**: Can swap implementations (e.g., different AI models)

### Negative Consequences

**Short-term:**
- ⚠️ **Implementation time**: 8-10 days of focused work
- ⚠️ **Testing burden**: More test files to maintain
- ⚠️ **Import complexity**: More files to import
- ⚠️ **Initial confusion**: Team needs to learn new structure

**Risks:**
- ⚠️ **Performance regression**: Component boundaries might add overhead
  - **Mitigation**: Performance regression tests
- ⚠️ **Breaking changes**: Refactoring might introduce bugs
  - **Mitigation**: Comprehensive test suite, gradual rollout
- ⚠️ **Over-engineering**: 7 files vs 1 might be overkill
  - **Mitigation**: Each component has clear reuse case

**Ongoing:**
- ⚠️ **More files**: 8 files vs 1 (but easier to navigate)
- ⚠️ **Coordination**: Changes might span multiple files
  - **Mitigation**: Clear interfaces, good documentation

---

## Alternatives Considered

### Alternative 1: Keep As-Is

**Description**: Leave SetupAssistantServiceV2.ts at 2067 lines

**Pros:**
- ✅ Zero refactoring effort
- ✅ No risk of introducing bugs
- ✅ Working well (70-85% faster than V1)

**Cons:**
- 🔴 Violates SOLID principles (7 responsibilities)
- 🔴 Hard to test in isolation
- 🔴 4x industry best practice threshold
- 🔴 Components locked inside monolith

**Why Not Chosen**: Technical debt will compound over time

---

### Alternative 2: Hybrid Approach (3 Components)

**Description**: Extract only VisionExtractor, TableSegmenter, FileTypeDetector

**Pros:**
- ✅ Quick wins (2-3 hours)
- ✅ Reduces to ~1400 lines
- ✅ Reusability for key components

**Cons:**
- ⚠️ Still violates SRP (4 responsibilities remaining)
- ⚠️ Main file still 3x recommended size
- ⚠️ Doesn't solve testability issue

**Why Not Chosen**: Doesn't fully address root cause

---

### Alternative 3: Microservices

**Description**: Split into separate deployed services

**Pros:**
- ✅ Maximum isolation
- ✅ Independent scaling
- ✅ Technology flexibility

**Cons:**
- 🔴 Over-engineering for current scale
- 🔴 Network latency overhead
- 🔴 Distributed system complexity
- 🔴 Deployment complexity

**Why Not Chosen**: Premature optimization, monolith is fine

---

## Validation

### Success Criteria

**Code Quality Metrics:**
- ✅ All components < 500 lines (industry best practice)
- ✅ Each component has single responsibility
- ✅ 90%+ test coverage for all components
- ✅ Zero TypeScript errors

**Performance Metrics:**
- ✅ No regression: Still <30s for teste_TH2.xlsx (37c, 305r, 131e)
- ✅ Phase timings maintained:
  - Phase 1: <500ms
  - Phase 2: 10-15s
  - Phase 3: <1s
  - Phase 4: 1-2s

**Functional Metrics:**
- ✅ 100% ADR-025 functionality preserved (mixed sheets)
- ✅ All error handling preserved
- ✅ Audit logging maintained
- ✅ No breaking changes to API routes

**Developer Experience:**
- ✅ Code reviews faster (smaller diffs)
- ✅ Debugging easier (clear boundaries)
- ✅ Onboarding improved (comprehension time)

### Measurement Plan

**Pre-Refactoring Baseline:**
- Record current performance metrics
- Document test coverage
- Capture error rates
- Measure developer feedback

**Post-Refactoring Validation:**
- Run full benchmark suite
- Compare performance metrics
- Validate test coverage (target: 90%+)
- Gather developer feedback

**Ongoing Monitoring:**
- Track error rates (should be same or better)
- Monitor performance (should be within 5% of baseline)
- Measure code review time (should decrease)
- Track bug reports (should decrease)

---

## References

### Related Decisions
- [ADR-023: File Import Architecture V2](./023-file-import-architecture-v2.md)
- [ADR-024: File Import Unified Architecture Success](./024-file-import-unified-architecture-success.md)
- [ADR-025: Mixed Entity Sheet Support](./025-mixed-entity-sheet-support.md)
- [ADR-004: No-Regrets Architecture Improvements](./004-no-regrets-architecture-improvements.md)

### Industry Research
- **SOLID Principles**: Single Responsibility Principle (2024-2025 consensus)
- **Code Smell Thresholds**: 300-500 lines recommended maximum
- **Service Layer Best Practices**: Layered architecture, dependency injection
- **Refactoring Patterns**: Extract Class, Facade Pattern, Strategy Pattern

### Implementation References
- Source file: `lib/services/SetupAssistantServiceV2.ts` (2067 lines)
- Codebase average: ~800 lines per service
- Industry threshold: 300-500 lines per class

### Architecture Patterns
- **Facade Pattern**: Main service as orchestration layer
- **Strategy Pattern**: Interchangeable components
- **Dependency Injection**: Constructor-based composition
- **Single Responsibility**: One reason to change per class

---

## Context for LLM Agents - Implementation Guide

**When implementing this refactoring:**

1. **Read this ADR first** - Complete understanding required
2. **Follow timeline** - One component at a time, test after each
3. **Atomic commits** - One component per commit for easy rollback
4. **Test coverage** - 90%+ for each component before moving on
5. **Performance validation** - Run benchmarks after each phase
6. **Documentation** - Update component README.md as you go

**Testing Protocol:**
```bash
# After each component extraction:
npm run test:unit                    # Unit tests
npm run test:integration             # Integration tests
npm run test:performance             # Regression tests
```

**Validation Checklist (Per Component):**
- [ ] Component extracted to correct directory
- [ ] Unit tests written (90%+ coverage)
- [ ] Main service updated to use component
- [ ] Integration tests pass
- [ ] Performance benchmarks pass
- [ ] No TypeScript errors
- [ ] Commit with descriptive message

**Common Pitfalls to Avoid:**
- ⚠️ Don't extract multiple components at once
- ⚠️ Don't skip unit tests ("I'll write them later")
- ⚠️ Don't change logic while refactoring (pure code movement)
- ⚠️ Don't forget to update imports in main service
- ⚠️ Don't ignore TypeScript errors
- ⚠️ Don't merge without performance validation

---

*This ADR transforms a monolithic 2067-line service into a modular, SOLID-compliant architecture while maintaining 100% backward compatibility and performance. The refactoring follows industry best practices and prepares the codebase for future scalability and maintainability.*
