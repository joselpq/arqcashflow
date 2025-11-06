---
title: "ADR-023: File Import Architecture V2 - Chunked + Deterministic Extraction"
status: "proposed"
date: "2025-11-06"
deciders: ["Jose Lyra", "Claude Code"]
consulted: []
informed: []
---

# ADR-023: File Import Architecture V2 - Chunked + Deterministic Extraction

## Status
**Proposed** - Ready for implementation

## Context and Problem Statement

Current file import performance with Haiku 4.5 optimization (ADR-022 Phase 1):
- **Small files (10-50 entities)**: ~40s
- **Medium files (100-200 entities)**: ~70s
- **Large files (500+ entities)**: ~120s

**Bottleneck Analysis**:
- 80-85% of time spent in Phase 2 (Claude API extraction)
- Each sheet processed as single large API call (no intra-sheet parallelization)
- AI extracts and transforms every single row (O(n) AI operations)
- No caching of repetitive logic (column mapping repeated per row)

**User Impact**:
- Files with 500+ entities take 2+ minutes to process
- No progress feedback during long extractions
- Doesn't scale well for power users with large datasets

## Decision Drivers

1. **Performance**: Need 70%+ improvement (target: <10s for typical files)
2. **Scalability**: Must handle 1000+ entity files efficiently
3. **Accuracy**: Maintain ≥95% extraction accuracy
4. **Cost**: Reduce API costs by 50%+
5. **Consistency**: Deterministic extraction = reproducible results
6. **Risk**: Implement without breaking existing functionality

## Considered Options

1. **Tool-Based Architecture** - Claude calls createEntities tools directly
2. **Single-Phase Extraction** - Extract all sheets in one API call
3. **Row Chunking** - Chunk sheets into 100-row pieces, parallelize
4. **Deterministic Extraction** - AI for column mapping, code for extraction
5. **Chunked + Deterministic** - Combine row chunking with deterministic extraction ⭐

## Decision Outcome

**Chosen Option: #5 - Chunked + Deterministic Extraction**

### Architecture Overview

```
Phase 1: Column Mapping (3s, parallel across sheets)
  ├─> Sheet 1: AI maps columns → {"Cliente": "clientName", ...}
  ├─> Sheet 2: AI maps columns → {"Projeto": "contractId", ...}
  └─> Sheet 3: AI maps columns → {"Descrição": "description", ...}

Phase 2: Row Classification (3s, chunked + parallel)
  Sheet 1 (300 rows):
    ├─> Chunk 1 (rows 1-100): AI classifies → ["contract", "contract", ...]
    ├─> Chunk 2 (rows 101-200): AI classifies → ["contract", "contract", ...]
    └─> Chunk 3 (rows 201-300): AI classifies → ["contract", "receivable", ...]

  Sheet 2 (150 rows):
    ├─> Chunk 1 (rows 1-100): AI classifies → ["receivable", "receivable", ...]
    └─> Chunk 2 (rows 101-150): AI classifies → ["receivable", "expense", ...]

Phase 3: Deterministic Extraction (0.5s, pure code)
  └─> For each row: Apply mapping + transform → JSON entity

Phase 4: Bulk Create (2s)
  └─> createMany → database

Total: 3s + 3s + 0.5s + 2s = 8.5s ✅ (70% faster)
```

### Consequences

**Good**:
- ✅ **70% speed improvement**: 28s → 8.5s for typical files
- ✅ **80% cost reduction**: $0.10 → $0.02 per file (fewer AI calls)
- ✅ **100% consistency**: Deterministic extraction = no variance
- ✅ **Linear scalability**: O(n) with very low constant factor
- ✅ **Better parallelization**: Chunks enable fine-grained concurrency
- ✅ **Simpler debugging**: Deterministic logic easier to troubleshoot

**Bad**:
- ⚠️ **Implementation complexity**: Need robust parsing logic for dates, currencies, status
- ⚠️ **Edge case handling**: Deterministic extraction less flexible than AI for weird data
- ⚠️ **Migration effort**: 3-4 weeks to fully implement and test

**Neutral**:
- 🔄 **More API calls**: 10-20 small calls vs 4 large calls (net similar cost)
- 🔄 **Two-phase coordination**: Column mapping + classification must align

**Risks**:
- ❌ **Deterministic parsing might fail on messy data**: Mitigation → Extensive testing + fallback to AI
- ❌ **Column mapping might be incorrect**: Mitigation → Validation step + user review
- ❌ **Classification might misidentify entities**: Mitigation → Confidence scores + manual review

## Implementation Plan

### De-Risking Strategy

**Create parallel implementation**: `SetupAssistantServiceV2.ts`
- Keep original `SetupAssistantService.ts` untouched (working fallback)
- Develop V2 independently with full testing
- Feature flag to switch between V1 and V2
- Only replace V1 when V2 proven stable

### Phase Breakdown

#### **Phase 1: Row Chunking (Week 1) - 25% improvement**
- Goal: Validate chunking doesn't hurt accuracy
- Deliverable: Chunked extraction with AI (still using full AI, just in chunks)
- Result: 28s → 21s

#### **Phase 2: Deterministic Extraction (Week 2-3) - 60% improvement**
- Goal: Build robust deterministic extraction engine
- Deliverable: Full deterministic extraction pipeline
- Result: 28s → 11.5s

#### **Phase 3: Integration (Week 4) - 70% improvement**
- Goal: Combine chunking + deterministic
- Deliverable: Full Option 5 implementation
- Result: 28s → 8.5s

---

## Detailed Implementation Steps

### **PHASE 1: Row Chunking (Week 1)**

#### Step 1.1: Create SetupAssistantServiceV2 (2 hours)

**File**: `lib/services/SetupAssistantServiceV2.ts`

```typescript
import { SetupAssistantService } from './SetupAssistantService'

/**
 * V2 Architecture: Chunked + Deterministic Extraction
 *
 * Key differences from V1:
 * - Chunks sheets into 100-row pieces for parallel processing
 * - Uses deterministic extraction for speed + consistency
 * - AI for column mapping + row classification only
 *
 * Performance: 70% faster than V1 (28s → 8.5s for typical files)
 */
export class SetupAssistantServiceV2 extends SetupAssistantService {
  private readonly CHUNK_SIZE = 100 // rows per chunk

  /**
   * Override main processFile to use V2 architecture
   */
  async processFile(
    fileBuffer: Buffer,
    filename: string,
    professionOverride?: string
  ): Promise<ProcessingResult> {
    try {
      const fileType = this.detectFileType(filename, fileBuffer)
      console.log('\n🚀 V2 ARCHITECTURE: Chunked + Deterministic')
      console.log('='.repeat(80))

      let extractedData: ExtractionResult

      if (fileType === 'xlsx' || fileType === 'csv') {
        // V2 Pipeline
        const workbook = this.parseXlsx(fileBuffer)
        const sheetsData = this.extractSheetsData(workbook)

        // Phase 1: Column Mapping (parallel across sheets)
        console.log('\n📋 PHASE 1: Column Mapping...')
        const mappings = await this.getColumnMappingsParallel(sheetsData, professionOverride)

        // Phase 2: Row Classification (chunked + parallel)
        console.log('\n🔍 PHASE 2: Row Classification (chunked)...')
        const classifications = await this.classifyRowsChunked(sheetsData, mappings, professionOverride)

        // Phase 3: Deterministic Extraction (pure code, fast!)
        console.log('\n⚡ PHASE 3: Deterministic Extraction...')
        extractedData = this.extractDeterministically(sheetsData, mappings, classifications)

      } else if (fileType === 'pdf' || fileType === 'image') {
        // PDF/Images still use V1 (vision extraction)
        extractedData = await this.extractFromVisionDirect(fileBuffer, filename, fileType, professionOverride)
      } else {
        throw new ServiceError('Unsupported file type', 'INVALID_FILE_TYPE', 400)
      }

      // Common post-processing (same as V1)
      console.log('\n📦 Post-processing and creation...')
      const processedData = await this.postProcessWithInference(extractedData, professionOverride)
      const result = await this.bulkCreateEntities(processedData)

      return result
    } catch (error) {
      throw new ServiceError(
        `V2 processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'V2_PROCESSING_ERROR',
        500
      )
    }
  }

  // V2-specific methods will be implemented below
}
```

#### Step 1.2: Implement Sheet Chunking (1 hour)

```typescript
interface SheetChunk {
  sheetName: string
  chunkIndex: number
  totalChunks: number
  rowRange: [number, number]
  csv: string // Header + chunk rows
}

/**
 * Chunk a sheet into smaller pieces for parallel processing
 */
private chunkSheet(sheet: SheetData, chunkSize: number = this.CHUNK_SIZE): SheetChunk[] {
  const rows = sheet.csv.split('\n')
  const header = rows[0]
  const dataRows = rows.slice(1)

  const chunks: SheetChunk[] = []
  const totalChunks = Math.ceil(dataRows.length / chunkSize)

  for (let i = 0; i < dataRows.length; i += chunkSize) {
    const chunkRows = dataRows.slice(i, i + chunkSize)
    const chunkCSV = header + '\n' + chunkRows.join('\n')

    chunks.push({
      sheetName: sheet.name,
      chunkIndex: Math.floor(i / chunkSize),
      totalChunks,
      rowRange: [i + 1, i + chunkRows.length], // 1-indexed
      csv: chunkCSV
    })
  }

  return chunks
}

/**
 * Chunk all sheets
 */
private chunkAllSheets(sheetsData: SheetData[]): Map<string, SheetChunk[]> {
  const chunkedSheets = new Map<string, SheetChunk[]>()

  for (const sheet of sheetsData) {
    const chunks = this.chunkSheet(sheet)
    chunkedSheets.set(sheet.name, chunks)
    console.log(`   📄 ${sheet.name}: ${chunks.length} chunks (${this.CHUNK_SIZE} rows each)`)
  }

  return chunkedSheets
}
```

#### Step 1.3: Implement Chunked Extraction (AI-based, for Phase 1 testing) (2 hours)

```typescript
/**
 * Extract a single chunk using AI (Phase 1 approach)
 * This will be replaced with deterministic extraction in Phase 2
 */
private async extractChunkWithAI(
  chunk: SheetChunk,
  sheetInfo: SheetInfo,
  plan: ExtractionPlan,
  filename: string,
  professionOverride?: string
): Promise<ExtractionResult> {
  const professionConfig = getProfessionConfig(professionOverride)

  const prompt = `
Extraia dados desta PARTE de uma planilha maior.

CONTEXTO:
- Arquivo: "${filename}"
- Planilha: "${chunk.sheetName}" (linhas ${chunk.rowRange[0]}-${chunk.rowRange[1]} de ${chunk.rowRange[1] + (chunk.totalChunks - chunk.chunkIndex - 1) * this.CHUNK_SIZE})
- Tipo: ${sheetInfo.type}
- Chunk: ${chunk.chunkIndex + 1}/${chunk.totalChunks}

IMPORTANTE: Este é apenas um PEDAÇO da planilha. Extraia APENAS as linhas que você vê abaixo.

DADOS (linhas ${chunk.rowRange[0]}-${chunk.rowRange[1]}):
${chunk.csv}

INSTRUÇÕES:
1. Extraia TODAS as linhas deste chunk (${chunk.rowRange[1] - chunk.rowRange[0] + 1} linhas)
2. Use o schema apropriado para ${sheetInfo.type}
3. Retorne JSON válido

SCHEMA:
[... existing schema from V1 ...]

Retorne APENAS JSON válido.
`

  const modelConfig = this.getModelConfig('extraction')
  const message = await this.anthropic.messages.create({
    model: modelConfig.model,
    max_tokens: modelConfig.maxTokens,
    temperature: 1,
    thinking: { type: 'enabled', budget_tokens: modelConfig.thinkingBudget },
    messages: [{ role: 'user', content: prompt }]
  })

  // Parse response (same as V1)
  let responseText = ''
  for (const block of message.content) {
    if (block.type === 'text') {
      responseText = block.text
      break
    }
  }

  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in chunk extraction')

  return JSON.parse(jsonMatch[0]) as ExtractionResult
}

/**
 * Extract all sheets using chunked approach (parallelized)
 */
private async extractSheetsChunked(
  sheetsData: SheetData[],
  plan: ExtractionPlan,
  filename: string,
  professionOverride?: string
): Promise<ExtractionResult> {
  console.log('\n⚡ PHASE 2: Chunked Extraction (parallel)')

  // Chunk all sheets
  const chunkedSheets = this.chunkAllSheets(sheetsData)

  // Flatten all chunks for parallel processing
  const allChunks: Array<{chunk: SheetChunk, sheetInfo: SheetInfo}> = []
  for (const sheet of sheetsData) {
    const chunks = chunkedSheets.get(sheet.name) || []
    const sheetInfo = plan.sheets.find(s => s.name === sheet.name)
    if (!sheetInfo) continue

    for (const chunk of chunks) {
      allChunks.push({ chunk, sheetInfo })
    }
  }

  console.log(`📊 Total chunks to process: ${allChunks.length}`)

  // Process all chunks in parallel
  const startTime = Date.now()
  const chunkResults = await Promise.allSettled(
    allChunks.map(({ chunk, sheetInfo }) =>
      this.extractChunkWithAI(chunk, sheetInfo, plan, filename, professionOverride)
    )
  )
  const elapsed = Date.now() - startTime

  console.log(`✅ Chunked extraction complete: ${elapsed}ms`)

  // Aggregate results from all chunks
  const aggregated: ExtractionResult = {
    contracts: [],
    receivables: [],
    expenses: []
  }

  chunkResults.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      aggregated.contracts.push(...result.value.contracts)
      aggregated.receivables.push(...result.value.receivables)
      aggregated.expenses.push(...result.value.expenses)
    } else {
      const chunk = allChunks[idx].chunk
      console.log(`⚠️ Chunk failed: ${chunk.sheetName} rows ${chunk.rowRange[0]}-${chunk.rowRange[1]}`)
    }
  })

  console.log(`\n📊 Total extracted:`)
  console.log(`   Contracts: ${aggregated.contracts.length}`)
  console.log(`   Receivables: ${aggregated.receivables.length}`)
  console.log(`   Expenses: ${aggregated.expenses.length}`)

  return aggregated
}
```

#### Step 1.4: Add Feature Flag (30 minutes)

**File**: `.env`
```bash
# Feature flag: Use V2 architecture for file imports
SETUP_ASSISTANT_USE_V2=false  # Change to true to test V2
```

**File**: `app/api/ai/setup-assistant-v2/route.ts`
```typescript
import { SetupAssistantService } from '@/lib/services/SetupAssistantService'
import { SetupAssistantServiceV2 } from '@/lib/services/SetupAssistantServiceV2'

export async function POST(request: Request) {
  // ... auth + context ...

  // Feature flag to switch between V1 and V2
  const useV2 = process.env.SETUP_ASSISTANT_USE_V2 === 'true'

  const setupAssistantService = useV2
    ? new SetupAssistantServiceV2(context)
    : new SetupAssistantService(context)

  console.log(`🚀 Using ${useV2 ? 'V2' : 'V1'} architecture`)

  // ... rest of handler ...
}
```

#### Step 1.5: Testing Phase 1 (2 hours)

**Test Plan**:
1. Test with 5 diverse files (small, medium, large)
2. Compare V2 chunked vs V1 baseline:
   - Extraction accuracy (should be same)
   - Processing time (should be 25% faster)
   - Entity counts (should match)
3. Document results

**Test Script**: `scripts/test-v2-phase1.ts`
```typescript
/**
 * Test V2 Phase 1 (Row Chunking) vs V1 Baseline
 */
async function testPhase1() {
  const testFiles = [
    'test-small-50entities.xlsx',
    'test-medium-200entities.xlsx',
    'test-large-500entities.xlsx'
  ]

  for (const file of testFiles) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`Testing: ${file}`)
    console.log('='.repeat(80))

    // Test V1
    process.env.SETUP_ASSISTANT_USE_V2 = 'false'
    const v1Start = Date.now()
    const v1Result = await processFile(file)
    const v1Time = Date.now() - v1Start

    // Test V2
    process.env.SETUP_ASSISTANT_USE_V2 = 'true'
    const v2Start = Date.now()
    const v2Result = await processFile(file)
    const v2Time = Date.now() - v2Start

    // Compare
    console.log(`\nResults for ${file}:`)
    console.log(`V1: ${v1Time}ms - ${v1Result.contractsCreated}c, ${v1Result.receivablesCreated}r, ${v1Result.expensesCreated}e`)
    console.log(`V2: ${v2Time}ms - ${v2Result.contractsCreated}c, ${v2Result.receivablesCreated}r, ${v2Result.expensesCreated}e`)
    console.log(`Improvement: ${((v1Time - v2Time) / v1Time * 100).toFixed(1)}%`)
    console.log(`Accuracy: ${v1Result.contractsCreated === v2Result.contractsCreated ? '✅' : '❌'}`)
  }
}
```

**Success Criteria for Phase 1**:
- ✅ 20-30% speed improvement
- ✅ 100% accuracy match with V1
- ✅ No crashes or errors
- ✅ Handles edge cases (single row sheets, large sheets)

---

### **PHASE 2: Deterministic Extraction (Week 2-3)**

#### Step 2.1: Column Mapping Prompt (2 hours)

```typescript
interface ColumnMapping {
  [csvColumn: string]: {
    field: string
    transform: 'date' | 'currency' | 'status' | 'text' | 'number' | 'enum'
    enumValues?: string[] // For status, category fields
  }
}

/**
 * Phase 1: Get column mappings from AI (once per sheet)
 */
private async getColumnMapping(
  sheet: SheetData,
  sheetType: 'contracts' | 'receivables' | 'expenses',
  professionOverride?: string
): Promise<ColumnMapping> {
  const professionConfig = getProfessionConfig(professionOverride)
  const rows = sheet.csv.split('\n')
  const header = rows[0]
  const sampleRows = rows.slice(1, 11).join('\n') // First 10 rows for context

  const prompt = `
Mapeie as colunas desta planilha para nosso schema.

CONTEXTO:
- Planilha: "${sheet.name}"
- Tipo: ${sheetType}
- Setor: ${professionConfig.businessContext.professionName}

CABEÇALHO CSV:
${header}

EXEMPLOS (primeiras 10 linhas):
${sampleRows}

SCHEMA DE DESTINO (${sheetType}):
${this.getSchemaForType(sheetType)}

TAREFA:
Para cada coluna do CSV, identifique:
1. Campo correspondente no schema
2. Tipo de transformação necessária: "date" | "currency" | "status" | "text" | "number" | "enum"
3. Se enum: valores possíveis

FORMATO DE SAÍDA:
Retorne APENAS JSON válido:
{
  "Nome da Coluna CSV": {
    "field": "fieldName",
    "transform": "currency",
    "enumValues": ["value1", "value2"] // apenas se transform === "enum"
  }
}

Exemplo:
{
  "Cliente": {"field": "clientName", "transform": "text"},
  "Valor Total": {"field": "totalValue", "transform": "currency"},
  "Data Assinatura": {"field": "signedDate", "transform": "date"},
  "Status": {"field": "status", "transform": "enum", "enumValues": ["Ativo", "Concluído", "Cancelado"]}
}

Retorne APENAS o JSON de mapeamento.
`

  const message = await this.anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    temperature: 1,
    thinking: { type: 'enabled', budget_tokens: 2000 },
    messages: [{ role: 'user', content: prompt }]
  })

  // Parse response
  let responseText = ''
  for (const block of message.content) {
    if (block.type === 'text') {
      responseText = block.text
      break
    }
  }

  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in column mapping response')

  return JSON.parse(jsonMatch[0]) as ColumnMapping
}

/**
 * Get column mappings for all sheets in parallel
 */
private async getColumnMappingsParallel(
  sheetsData: SheetData[],
  professionOverride?: string
): Promise<Map<string, ColumnMapping>> {
  console.log(`📋 Mapping columns for ${sheetsData.length} sheets...`)

  const mappings = new Map<string, ColumnMapping>()

  const results = await Promise.allSettled(
    sheetsData.map(async (sheet) => {
      // Infer sheet type from name/content (simplified for now)
      const sheetType = this.inferSheetType(sheet)
      const mapping = await this.getColumnMapping(sheet, sheetType, professionOverride)
      return { sheetName: sheet.name, mapping }
    })
  )

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      mappings.set(result.value.sheetName, result.value.mapping)
      console.log(`   ✅ ${result.value.sheetName}: ${Object.keys(result.value.mapping).length} columns mapped`)
    } else {
      console.log(`   ❌ ${sheetsData[idx].name}: Mapping failed`)
    }
  })

  return mappings
}
```

#### Step 2.2: Row Classification (2 hours)

```typescript
type EntityType = 'contract' | 'receivable' | 'expense' | 'skip'

/**
 * Classify rows in a chunk (which entity type is each row?)
 */
private async classifyRowsChunk(
  chunk: SheetChunk,
  professionOverride?: string
): Promise<EntityType[]> {
  const professionConfig = getProfessionConfig(professionOverride)

  const prompt = `
Classifique cada linha desta planilha.

CONTEXTO:
- Planilha: "${chunk.sheetName}"
- Setor: ${professionConfig.businessContext.professionName}
- Linhas: ${chunk.rowRange[0]}-${chunk.rowRange[1]}

DADOS:
${chunk.csv}

TAREFA:
Para cada linha de dados (exceto cabeçalho), classifique como:
- "contract": Contrato/Projeto
- "receivable": Recebível/Parcela a receber
- "expense": Despesa
- "skip": Linha inválida ou cabeçalho extra

FORMATO DE SAÍDA:
Retorne APENAS um array JSON:
["contract", "contract", "receivable", "expense", "skip", ...]

Deve ter exatamente ${chunk.csv.split('\n').length - 1} elementos (uma classificação por linha de dados).

Exemplo:
["contract", "contract", "contract", "receivable", "receivable", "expense"]
`

  const message = await this.anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    temperature: 1,
    thinking: { type: 'enabled', budget_tokens: 1000 },
    messages: [{ role: 'user', content: prompt }]
  })

  let responseText = ''
  for (const block of message.content) {
    if (block.type === 'text') {
      responseText = block.text
      break
    }
  }

  const jsonMatch = responseText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('No array in classification response')

  return JSON.parse(jsonMatch[0]) as EntityType[]
}

/**
 * Classify all rows across all sheets (chunked + parallelized)
 */
private async classifyRowsChunked(
  sheetsData: SheetData[],
  mappings: Map<string, ColumnMapping>,
  professionOverride?: string
): Promise<Map<string, EntityType[]>> {
  console.log(`🔍 Classifying rows (chunked + parallel)...`)

  const classifications = new Map<string, EntityType[]>()
  const chunkedSheets = this.chunkAllSheets(sheetsData)

  // Flatten all chunks for parallel classification
  const allChunks: SheetChunk[] = []
  for (const [sheetName, chunks] of chunkedSheets.entries()) {
    allChunks.push(...chunks)
  }

  console.log(`   Processing ${allChunks.length} chunks in parallel...`)

  const results = await Promise.allSettled(
    allChunks.map(chunk => this.classifyRowsChunk(chunk, professionOverride))
  )

  // Aggregate classifications per sheet
  for (const [sheetName, chunks] of chunkedSheets.entries()) {
    const sheetClassifications: EntityType[] = []

    for (let i = 0; i < chunks.length; i++) {
      const result = results[chunks[i].chunkIndex]
      if (result.status === 'fulfilled') {
        sheetClassifications.push(...result.value)
      } else {
        // Fallback: assume all rows are same type as sheet
        const fallbackType = this.inferSheetType(sheetsData.find(s => s.name === sheetName)!)
        sheetClassifications.push(...Array(chunks[i].rowRange[1] - chunks[i].rowRange[0] + 1).fill(fallbackType))
        console.log(`   ⚠️ Chunk ${i} of ${sheetName}: Using fallback classification`)
      }
    }

    classifications.set(sheetName, sheetClassifications)
    console.log(`   ✅ ${sheetName}: ${sheetClassifications.length} rows classified`)
  }

  return classifications
}
```

#### Step 2.3: Deterministic Extraction Engine (4 hours)

```typescript
/**
 * Transform a single value based on its type
 */
private transformValue(
  value: string | null | undefined,
  transform: ColumnMapping[string]['transform'],
  enumValues?: string[]
): any {
  if (!value || value.trim() === '') return null

  const cleaned = value.trim()

  switch (transform) {
    case 'currency':
      // "R$ 15.000,50" → 15000.50
      // "15000.5" → 15000.5
      // "R$ 1.500" → 1500
      return parseFloat(
        cleaned
          .replace(/R\$\s*/g, '')  // Remove R$
          .replace(/\./g, '')      // Remove thousand separators
          .replace(',', '.')       // Convert decimal comma to dot
      )

    case 'date':
      // "15/04/2024" → "2024-04-15"
      // "2024-04-15" → "2024-04-15" (already ISO)
      // "15-04-2024" → "2024-04-15"

      // Check if already ISO format
      if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
        return cleaned.substring(0, 10)
      }

      // Parse Brazilian format DD/MM/YYYY or DD-MM-YYYY
      const dateParts = cleaned.split(/[\/\-]/)
      if (dateParts.length >= 3) {
        const [day, month, year] = dateParts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }

      // Fallback: try to parse as Date
      const date = new Date(cleaned)
      if (!isNaN(date.getTime())) {
        return date.toISOString().substring(0, 10)
      }

      return null

    case 'status':
    case 'enum':
      // Normalize status values
      // "Recebido" → "received"
      // "Ativo" → "active"

      const statusMap: Record<string, string> = {
        // Contract statuses
        'Ativo': 'active',
        'Concluído': 'completed',
        'Completo': 'completed',
        'Finalizado': 'completed',
        'Pausado': 'paused',
        'Cancelado': 'cancelled',

        // Receivable/Expense statuses
        'Recebido': 'received',
        'Pago': 'paid',
        'Pendente': 'pending',
        'A Pagar': 'pending',
        'A Receber': 'pending',
        'Atrasado': 'overdue',
        'Vencido': 'overdue'
      }

      // Try exact match first
      if (statusMap[cleaned]) {
        return statusMap[cleaned]
      }

      // Try case-insensitive match
      const lowerCleaned = cleaned.toLowerCase()
      for (const [key, value] of Object.entries(statusMap)) {
        if (key.toLowerCase() === lowerCleaned) {
          return value
        }
      }

      // If enumValues provided, try to find partial match
      if (enumValues) {
        for (const enumValue of enumValues) {
          if (lowerCleaned.includes(enumValue.toLowerCase()) ||
              enumValue.toLowerCase().includes(lowerCleaned)) {
            return enumValue
          }
        }
      }

      // Fallback: return cleaned value lowercase
      return lowerCleaned

    case 'number':
      // "1500" → 1500
      // "1.500" → 1500
      // "1,5" → 1.5
      const normalized = cleaned.replace(/\./g, '').replace(',', '.')
      return parseFloat(normalized)

    case 'text':
    default:
      return cleaned
  }
}

/**
 * Extract a single entity from a row using deterministic mapping
 */
private extractEntity(
  row: Record<string, string>,
  mapping: ColumnMapping,
  entityType: EntityType
): any {
  if (entityType === 'skip') return null

  const entity: any = {}

  for (const [csvColumn, config] of Object.entries(mapping)) {
    const rawValue = row[csvColumn]
    const transformedValue = this.transformValue(
      rawValue,
      config.transform,
      config.enumValues
    )

    entity[config.field] = transformedValue
  }

  return entity
}

/**
 * Deterministic extraction for entire dataset (pure code, no AI)
 */
private extractDeterministically(
  sheetsData: SheetData[],
  mappings: Map<string, ColumnMapping>,
  classifications: Map<string, EntityType[]>
): ExtractionResult {
  console.log(`⚡ Deterministic extraction (pure code)...`)

  const result: ExtractionResult = {
    contracts: [],
    receivables: [],
    expenses: []
  }

  const startTime = Date.now()

  for (const sheet of sheetsData) {
    const mapping = mappings.get(sheet.name)
    const types = classifications.get(sheet.name)

    if (!mapping || !types) {
      console.log(`   ⚠️ Skipping ${sheet.name}: Missing mapping or classifications`)
      continue
    }

    // Parse CSV
    const rows = this.parseCSV(sheet.csv)

    // Extract each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const entityType = types[i]

      if (!entityType || entityType === 'skip') continue

      const entity = this.extractEntity(row, mapping, entityType)

      if (entity) {
        switch (entityType) {
          case 'contract':
            result.contracts.push(entity)
            break
          case 'receivable':
            result.receivables.push(entity)
            break
          case 'expense':
            result.expenses.push(entity)
            break
        }
      }
    }

    console.log(`   ✅ ${sheet.name}: Extracted ${rows.length} rows`)
  }

  const elapsed = Date.now() - startTime
  console.log(`✅ Deterministic extraction complete: ${elapsed}ms`)
  console.log(`   Contracts: ${result.contracts.length}`)
  console.log(`   Receivables: ${result.receivables.length}`)
  console.log(`   Expenses: ${result.expenses.length}`)

  return result
}

/**
 * Simple CSV parser (handles quoted fields)
 */
private parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.split('\n')
  if (lines.length < 2) return []

  const headers = this.parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = this.parseCSVLine(lines[i])
    if (values.length === 0) continue

    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || ''
    }
    rows.push(row)
  }

  return rows
}

/**
 * Parse a single CSV line (handles quoted fields with commas)
 */
private parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}
```

#### Step 2.4: Testing Phase 2 (3 hours)

**Test Plan**:
1. Test deterministic extraction with 20 diverse files
2. Compare accuracy vs V1 AI extraction
3. Measure speed improvement
4. Test edge cases:
   - Messy dates ("15/4/2024", "15-04-24", "2024-04-15")
   - Various currency formats ("R$ 1.500,00", "1500", "1,500.00")
   - Status variations ("Recebido", "RECEBIDO", "recebido")
   - Empty/null values
   - Special characters in text fields

**Test Script**: `scripts/test-v2-deterministic.ts`
```typescript
/**
 * Test deterministic extraction accuracy
 */
async function testDeterministic() {
  const testCases = [
    { input: 'R$ 15.000,50', expected: 15000.50, transform: 'currency' },
    { input: '15/04/2024', expected: '2024-04-15', transform: 'date' },
    { input: 'Recebido', expected: 'received', transform: 'status' },
    { input: 'ATIVO', expected: 'active', transform: 'status' },
    { input: '1.500', expected: 1500, transform: 'number' }
  ]

  for (const test of testCases) {
    const result = transformValue(test.input, test.transform)
    const passed = result === test.expected
    console.log(`${passed ? '✅' : '❌'} ${test.input} → ${result} (expected: ${test.expected})`)
  }
}
```

**Success Criteria for Phase 2**:
- ✅ 95%+ accuracy on test files
- ✅ 60% speed improvement vs V1
- ✅ Handles edge cases correctly
- ✅ No regression on standard cases

---

### **PHASE 3: Integration (Week 4)**

#### Step 3.1: Combine Chunking + Deterministic (2 hours)

Update `processFile` to use both optimizations together:

```typescript
async processFile(
  fileBuffer: Buffer,
  filename: string,
  professionOverride?: string
): Promise<ProcessingResult> {
  // ... file type detection ...

  if (fileType === 'xlsx' || fileType === 'csv') {
    const workbook = this.parseXlsx(fileBuffer)
    const sheetsData = this.extractSheetsData(workbook)

    // Phase 1: Column Mapping (3s, parallel)
    const mappings = await this.getColumnMappingsParallel(sheetsData, professionOverride)

    // Phase 2: Row Classification - CHUNKED (3s, chunked + parallel)
    const classifications = await this.classifyRowsChunked(sheetsData, mappings, professionOverride)

    // Phase 3: Deterministic Extraction (0.5s, pure code)
    extractedData = this.extractDeterministically(sheetsData, mappings, classifications)
  }

  // ... post-process and create ...
}
```

#### Step 3.2: Performance Monitoring (2 hours)

Add detailed timing instrumentation:

```typescript
interface PerformanceMetrics {
  totalTime: number
  phase1ColumnMapping: number
  phase2Classification: number
  phase3Extraction: number
  phase4PostProcess: number
  phase5BulkCreate: number
  entityCounts: {
    contracts: number
    receivables: number
    expenses: number
  }
  cost: {
    columnMapping: number
    classification: number
    total: number
  }
}

private async processFileWithMetrics(
  fileBuffer: Buffer,
  filename: string,
  professionOverride?: string
): Promise<{ result: ProcessingResult, metrics: PerformanceMetrics }> {
  const metrics: PerformanceMetrics = {
    totalTime: 0,
    phase1ColumnMapping: 0,
    phase2Classification: 0,
    phase3Extraction: 0,
    phase4PostProcess: 0,
    phase5BulkCreate: 0,
    entityCounts: { contracts: 0, receivables: 0, expenses: 0 },
    cost: { columnMapping: 0, classification: 0, total: 0 }
  }

  const totalStart = Date.now()

  // Phase 1
  const p1Start = Date.now()
  const mappings = await this.getColumnMappingsParallel(sheetsData, professionOverride)
  metrics.phase1ColumnMapping = Date.now() - p1Start

  // Phase 2
  const p2Start = Date.now()
  const classifications = await this.classifyRowsChunked(sheetsData, mappings, professionOverride)
  metrics.phase2Classification = Date.now() - p2Start

  // Phase 3
  const p3Start = Date.now()
  const extractedData = this.extractDeterministically(sheetsData, mappings, classifications)
  metrics.phase3Extraction = Date.now() - p3Start

  // Phase 4
  const p4Start = Date.now()
  const processedData = await this.postProcessWithInference(extractedData, professionOverride)
  metrics.phase4PostProcess = Date.now() - p4Start

  // Phase 5
  const p5Start = Date.now()
  const result = await this.bulkCreateEntities(processedData)
  metrics.phase5BulkCreate = Date.now() - p5Start

  metrics.totalTime = Date.now() - totalStart
  metrics.entityCounts = {
    contracts: result.contractsCreated,
    receivables: result.receivablesCreated,
    expenses: result.expensesCreated
  }

  // Log metrics
  console.log(`\n📊 Performance Metrics:`)
  console.log(`   Total: ${metrics.totalTime}ms`)
  console.log(`   Phase 1 (Column Mapping): ${metrics.phase1ColumnMapping}ms`)
  console.log(`   Phase 2 (Classification): ${metrics.phase2Classification}ms`)
  console.log(`   Phase 3 (Extraction): ${metrics.phase3Extraction}ms`)
  console.log(`   Phase 4 (Post-Process): ${metrics.phase4PostProcess}ms`)
  console.log(`   Phase 5 (Bulk Create): ${metrics.phase5BulkCreate}ms`)

  return { result, metrics }
}
```

#### Step 3.3: Comprehensive Testing (1 week)

**Test Plan**:
1. **Accuracy Testing** (50 files):
   - Compare V2 vs V1 extraction accuracy
   - Target: ≥95% accuracy match

2. **Performance Testing** (20 files):
   - Small (10-50 entities)
   - Medium (100-200 entities)
   - Large (500-1000 entities)
   - Target: 70% speed improvement

3. **Edge Case Testing** (30 scenarios):
   - Mixed entity types in single sheet
   - Messy data (missing values, weird formats)
   - Single-row sheets
   - Very large sheets (2000+ rows)
   - Multi-sheet files (6+ sheets)

4. **Stress Testing**:
   - 10 concurrent file uploads
   - Rate limit handling
   - Memory usage monitoring

**Automated Test Suite**: `scripts/test-v2-comprehensive.ts`
```typescript
interface TestResult {
  file: string
  v1Time: number
  v2Time: number
  improvement: number
  accuracyMatch: boolean
  entityCounts: {
    v1: { contracts: number, receivables: number, expenses: number }
    v2: { contracts: number, receivables: number, expenses: number }
  }
}

async function runComprehensiveTests() {
  const results: TestResult[] = []

  // Load test files
  const testFiles = loadTestFiles()

  for (const file of testFiles) {
    console.log(`\nTesting: ${file.name}`)

    // Run V1
    process.env.SETUP_ASSISTANT_USE_V2 = 'false'
    const v1Start = Date.now()
    const v1Result = await processFile(file.buffer, file.name)
    const v1Time = Date.now() - v1Start

    // Run V2
    process.env.SETUP_ASSISTANT_USE_V2 = 'true'
    const v2Start = Date.now()
    const v2Result = await processFile(file.buffer, file.name)
    const v2Time = Date.now() - v2Start

    // Compare
    const accuracyMatch =
      v1Result.contractsCreated === v2Result.contractsCreated &&
      v1Result.receivablesCreated === v2Result.receivablesCreated &&
      v1Result.expensesCreated === v2Result.expensesCreated

    results.push({
      file: file.name,
      v1Time,
      v2Time,
      improvement: ((v1Time - v2Time) / v1Time) * 100,
      accuracyMatch,
      entityCounts: {
        v1: {
          contracts: v1Result.contractsCreated,
          receivables: v1Result.receivablesCreated,
          expenses: v1Result.expensesCreated
        },
        v2: {
          contracts: v2Result.contractsCreated,
          receivables: v2Result.receivablesCreated,
          expenses: v2Result.expensesCreated
        }
      }
    })
  }

  // Generate report
  generateTestReport(results)
}

function generateTestReport(results: TestResult[]) {
  console.log(`\n${'='.repeat(100)}`)
  console.log(`V2 COMPREHENSIVE TEST REPORT`)
  console.log('='.repeat(100))

  const avgImprovement = results.reduce((sum, r) => sum + r.improvement, 0) / results.length
  const accuracyRate = results.filter(r => r.accuracyMatch).length / results.length * 100

  console.log(`\n📊 Summary:`)
  console.log(`   Files Tested: ${results.length}`)
  console.log(`   Average Speed Improvement: ${avgImprovement.toFixed(1)}%`)
  console.log(`   Accuracy Match Rate: ${accuracyRate.toFixed(1)}%`)

  console.log(`\n📋 Detailed Results:`)
  console.table(results.map(r => ({
    File: r.file,
    'V1 Time': `${r.v1Time}ms`,
    'V2 Time': `${r.v2Time}ms`,
    'Improvement': `${r.improvement.toFixed(1)}%`,
    'Accuracy': r.accuracyMatch ? '✅' : '❌'
  })))

  // Failures
  const failures = results.filter(r => !r.accuracyMatch)
  if (failures.length > 0) {
    console.log(`\n⚠️ Accuracy Mismatches (${failures.length}):`)
    failures.forEach(f => {
      console.log(`\n   ${f.file}:`)
      console.log(`      V1: ${f.entityCounts.v1.contracts}c, ${f.entityCounts.v1.receivables}r, ${f.entityCounts.v1.expenses}e`)
      console.log(`      V2: ${f.entityCounts.v2.contracts}c, ${f.entityCounts.v2.receivables}r, ${f.entityCounts.v2.expenses}e`)
    })
  }
}
```

**Success Criteria for Phase 3**:
- ✅ 70% speed improvement on average
- ✅ 95%+ accuracy match rate
- ✅ No crashes on edge cases
- ✅ Memory usage < 2GB for large files
- ✅ Handles concurrent uploads gracefully

---

## Rollout Plan

### Stage 1: Internal Testing (Week 5)
- Enable V2 for internal team accounts only
- Monitor metrics and error rates
- Gather qualitative feedback
- Fix any critical issues

### Stage 2: Beta Testing (Week 6)
- Enable V2 for 10% of users (feature flag)
- A/B test metrics:
  - Processing time
  - Accuracy (user-reported issues)
  - Error rates
  - Cost per file
- Gradual increase: 10% → 25% → 50%

### Stage 3: Full Rollout (Week 7)
- Enable V2 for 100% of users
- Monitor for 48 hours
- Keep V1 as fallback (can revert via feature flag)

### Stage 4: Deprecation (Week 8)
- Remove V1 code after 1 week of stable V2
- Archive V1 as `SetupAssistantServiceV1Legacy.ts`

---

## Rollback Plan

**If V2 has critical issues**:

1. **Immediate** (< 5 minutes):
   ```bash
   # In production environment
   SETUP_ASSISTANT_USE_V2=false
   ```

2. **Code Rollback** (< 30 minutes):
   ```bash
   # Revert to previous commit
   git revert HEAD
   git push
   ```

3. **Database** (if needed):
   - V2 uses same database operations as V1
   - No schema changes required
   - No data migration needed

---

## Monitoring and Observability

### Metrics to Track

1. **Performance**:
   - P50, P95, P99 processing times
   - Phase breakdown (column mapping, classification, extraction)
   - File size vs processing time correlation

2. **Accuracy**:
   - Entity counts (contracts, receivables, expenses)
   - User-reported extraction errors
   - Validation failure rates

3. **Cost**:
   - API calls per file
   - Token usage per file
   - Cost per entity extracted

4. **Reliability**:
   - Success rate (%)
   - Error types and frequencies
   - Timeout rate

### Alerting

**Critical Alerts**:
- Error rate > 5%
- P95 processing time > 30s
- Accuracy mismatch rate > 10%

**Warning Alerts**:
- Error rate > 2%
- P95 processing time > 20s
- Cost per file > $0.05

---

## Documentation

### User-Facing

**Changelog Entry**:
```markdown
## [2.0.0] - 2025-11-XX

### Performance Improvements
- **70% faster file imports**: Typical files now process in <10s (previously ~30s)
- **Better for large files**: Files with 500+ entities now process in <15s (previously 2+ minutes)
- **More consistent**: Deterministic extraction ensures reproducible results

### Technical Details
- Implemented chunked processing for parallel extraction
- Replaced AI extraction with deterministic parsing for speed
- Maintained 95%+ extraction accuracy
```

### Developer Documentation

Create `/docs/docs-site/docs/developer/architecture/setup-assistant-v2.md`:
```markdown
# Setup Assistant V2 Architecture

## Overview
V2 uses a hybrid approach: AI for intelligence, code for speed.

## Architecture Diagram
[Include visual diagram of the pipeline]

## Phase Breakdown
[Detailed explanation of each phase]

## Performance Characteristics
[Charts and benchmarks]

## Troubleshooting
[Common issues and solutions]
```

---

## Success Metrics

### Must Have (Launch Blockers)
- ✅ 70% speed improvement on average
- ✅ 95%+ accuracy match with V1
- ✅ Error rate < 2%
- ✅ No P0/P1 bugs

### Nice to Have
- 🎯 80% cost reduction
- 🎯 P95 processing time < 15s
- 🎯 100% accuracy match with V1
- 🎯 Handles 2000+ row files

---

## Open Questions

1. **Rate Limiting**: Do we need to throttle parallel chunk processing to avoid hitting Anthropic rate limits?
   - Answer: Monitor in Phase 1 testing

2. **Caching**: Should we cache column mappings across similar files from same user?
   - Answer: Evaluate in Phase 2

3. **Fallback Strategy**: When should V2 fall back to V1 (or AI-based extraction)?
   - Answer: Define thresholds in Phase 3 testing

4. **User Feedback**: How do we collect feedback on extraction accuracy?
   - Answer: Add "Report Issue" button on import results page

---

## Related Documents

- [ADR-022: File Import Speed Optimization](./022-file-import-speed-optimization.md) - Phase 1 (Haiku + createMany)
- [FILE_IMPORT_DEEP_ANALYSIS.md](../../FILE_IMPORT_DEEP_ANALYSIS.md) - Bottleneck analysis
- [ARCHITECTURE_EXPLORATION.md](../../ARCHITECTURE_EXPLORATION.md) - Options analysis

---

## Approval

- [ ] Technical Review: _______
- [ ] Product Review: _______
- [ ] Security Review: _______
- [ ] Ready for Implementation: _______

---

**Author**: Claude Code & Jose Lyra
**Date**: 2025-11-06
**Status**: Awaiting Approval
