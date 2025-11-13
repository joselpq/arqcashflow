/**
 * SheetAnalyzer - AI-Powered Sheet Analysis
 *
 * Responsibilities:
 * - Analyze sheets using Claude AI
 * - Classify sheet type (contracts/receivables/expenses/skip)
 * - Generate column mappings for deterministic extraction
 * - Profession-aware analysis with business context
 *
 * This component implements unified sheet analysis that combines
 * entity type detection and column mapping in a single AI call,
 * optimizing the Phase 2 analysis workflow.
 *
 * Architecture: Single Responsibility Principle
 * - Focused on AI-powered sheet classification and mapping
 * - Configurable model selection (Sonnet vs Haiku)
 * - Clear separation from extraction logic
 *
 * Extracted from SetupAssistantServiceV2.ts (lines 230-433)
 * Part of ADR-026: SetupAssistant Service Decomposition
 */

import Anthropic from '@anthropic-ai/sdk'
import { ServiceError } from '../../BaseService'
import { getProfessionConfig } from '@/lib/professions'
import type { SheetData } from '../types'

/**
 * Column mapping configuration for extraction
 */
export interface ColumnMapping {
  [csvColumn: string]: {
    field: string
    transform: 'date' | 'currency' | 'status' | 'text' | 'number' | 'enum'
    enumValues?: string[]
  }
}

/**
 * Sheet type classification
 */
export type SheetType = 'contracts' | 'receivables' | 'expenses' | 'skip'

/**
 * Result of sheet analysis
 */
export interface SheetAnalysis {
  sheetName: string
  sheetType: SheetType
  columnMapping: ColumnMapping
}

/**
 * Model configuration for AI analysis
 */
export interface ModelConfig {
  model: string
  maxTokens: number
  thinkingBudget: number
}

/**
 * SheetAnalyzer - AI-powered sheet classification and mapping
 *
 * Key Methods:
 * - analyzeSheet(): Analyze single sheet
 * - analyzeMultipleSheets(): Parallel analysis of multiple sheets
 *
 * Analysis Approach:
 * - ONE AI call per sheet (unified analysis)
 * - Profession-aware business context
 * - Sample-based analysis (headers + first 20 rows)
 * - JSON-structured response for deterministic parsing
 *
 * Example Usage:
 * ```typescript
 * const analyzer = new SheetAnalyzer(anthropicClient)
 * const analysis = await analyzer.analyzeSheet(sheet, filename, {
 *   profession: 'architect',
 *   modelConfig: { model: 'claude-sonnet-4-5', maxTokens: 4000, thinkingBudget: 8000 }
 * })
 * ```
 */
export class SheetAnalyzer {
  constructor(private anthropic: Anthropic) {}

  /**
   * Analyze a single sheet using Claude AI
   * Combines entity type detection + column mapping in ONE call
   */
  async analyzeSheet(
    sheet: SheetData,
    filename: string,
    options: {
      profession?: string
      modelConfig: ModelConfig
    }
  ): Promise<SheetAnalysis> {
    const professionConfig = getProfessionConfig(options.profession)
    const modelConfig = options.modelConfig

    // Extract headers and sample rows
    const rows = sheet.csv.split('\n')
    const headers = rows[0]
    const sampleRows = rows.slice(1, Math.min(21, rows.length)).join('\n') // First 20 data rows

    // 🔍 DIAGNOSTIC: Show what we're sending to AI
    console.log(`\n   🔍 ANALYZING "${sheet.name}":`)
    console.log(`      Headers: ${headers}`)
    console.log(`      Sample rows: ${Math.min(20, rows.length - 1)}`)

    const prompt = this.buildAnalysisPrompt(
      sheet.name,
      filename,
      headers,
      sampleRows,
      professionConfig
    )

    try {
      const message = await this.anthropic.messages.create({
        model: modelConfig.model,
        max_tokens: modelConfig.maxTokens,
        temperature: 1,
        thinking: { type: 'enabled', budget_tokens: modelConfig.thinkingBudget },
        messages: [{ role: 'user', content: prompt }]
      })

      let responseText = ''
      for (const block of message.content) {
        if (block.type === 'text') {
          responseText = block.text
          break
        }
      }

      const analysis = this.parseAnalysisResponse(responseText, sheet.name)

      console.log(`   ✅ ${sheet.name}: ${analysis.sheetType} (${Object.keys(analysis.columnMapping).length} columns mapped)`)

      // 🔍 DIAGNOSTIC: Show AI's classification and mapping
      console.log(`\n   🔍 AI ANALYSIS RESULT:`)
      console.log(`      Classified as: "${analysis.sheetType}"`)
      console.log(`      Column Mapping:`)
      for (const [csvCol, mapping] of Object.entries(analysis.columnMapping)) {
        console.log(`         "${csvCol}" → ${mapping.field} (${mapping.transform})`)
      }

      return {
        sheetName: sheet.name,
        sheetType: analysis.sheetType,
        columnMapping: analysis.columnMapping
      }

    } catch (error) {
      console.error(`   ❌ ${sheet.name}: Analysis failed:`, error)
      throw new ServiceError(
        `Sheet analysis failed for "${sheet.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ANALYSIS_ERROR',
        500
      )
    }
  }

  /**
   * Analyze multiple sheets in parallel
   * Uses Promise.all for concurrent AI calls
   */
  async analyzeMultipleSheets(
    sheets: SheetData[],
    filename: string,
    options: {
      profession?: string
      modelConfig: ModelConfig
    }
  ): Promise<SheetAnalysis[]> {
    return Promise.all(
      sheets.map(sheet => this.analyzeSheet(sheet, filename, options))
    )
  }

  /**
   * Build the analysis prompt with profession context
   * @private
   */
  private buildAnalysisPrompt(
    sheetName: string,
    filename: string,
    headers: string,
    sampleRows: string,
    professionConfig: any
  ): string {
    return `
Você é um especialista em análise de planilhas financeiras brasileiras.

CONTEXTO DO NEGÓCIO:
- Profissão: ${professionConfig.businessContext.professionName}
- Descrição: ${professionConfig.businessContext.summaryContext}

PLANILHA A ANALISAR:
- Nome: "${sheetName}"
- Arquivo: "${filename}"

CABEÇALHOS DAS COLUNAS:
${headers}

AMOSTRA DOS DADOS (primeiras 20 linhas para entender o tipo de dados):
${sampleRows}

SUA TAREFA:
Analise esta planilha e determine:
1. Que tipo de entidade financeira esta planilha contém?
2. Como cada coluna se mapeia para nossos campos de schema dessa entidade?
3. Retorne UM JSON para esta planilha, conforme instruções abaixo

TIPOS DE ENTIDADE (escolha UM):

A) "receivables" - Recebíveis (DINHEIRO ENTRANDO)
${professionConfig.businessContext.revenueDescription}
Indicadores comuns: "recebimento", "parcela", "cobrança", "RT", "medição", "fatura", "nota fiscal saída"
Exemplo: Parcelas a receber de clientes, RTs de fornecedores, medições aprovadas

B) "expenses" - Despesas (DINHEIRO SAINDO)
${professionConfig.businessContext.expenseDescription}
Indicadores comuns: "pagamento", "despesa", "custo", "a pagar", "fornecedor" (quando você é o cliente)
Exemplo: Contas a pagar, compras, custos operacionais

C) "contracts" - ${professionConfig.terminology.contracts}
${professionConfig.businessContext.projectTypes}
Indicadores comuns: "cliente", "projeto", "contrato", "valor total", "assinatura"
Exemplo: Novos projetos, contratos fechados com clientes

D) "skip" - NÃO é dado financeiro
Use para: instruções, metadados, planilhas de configuração, totais, resumos
Indicadores: "instruções", "como usar", "legenda", "configuração", "resumo"
Exemplo: Abas de instruções, legendas, ou dados não financeiros

SCHEMAS DISPONÍVEIS (use a terminologia exata):

RECEIVABLES (Recebíveis):
- contractId: texto - referência ao ${professionConfig.terminology.project.toLowerCase()} (opcional)
- expectedDate: data - data esperada de recebimento (opcional)
- amount: moeda - valor do recebível (opcional)
- status: enum (pending, received, overdue) (opcional)
- receivedDate: data - data real do recebimento (opcional)
- receivedAmount: moeda - valor real recebido (opcional)
- description: texto - descrição adicional (opcional)

EXPENSES (Despesas):
- description: texto - descrição da despesa (opcional)
- amount: moeda - valor da despesa (opcional)
- dueDate: data - data de vencimento (opcional)
- category: texto - categoria da despesa (opcional)
- status: enum (pending, paid, overdue, cancelled) (opcional)
- paidDate: data - data do pagamento (opcional)
- paidAmount: moeda - valor pago (opcional)

CONTRACTS (${professionConfig.terminology.contracts}):
- clientName: texto - ${professionConfig.terminology.clientName.toLowerCase()} (opcional)
- projectName: texto - ${professionConfig.terminology.projectName.toLowerCase()} (opcional)
- totalValue: moeda - ${professionConfig.terminology.totalValue.toLowerCase()} (opcional)
- signedDate: data - ${professionConfig.terminology.signedDate.toLowerCase()} (opcional)
- status: enum (active, completed, paused, cancelled) (opcional)
- description: texto - descrição adicional (opcional)
- category: texto - categoria do projeto (opcional)

INSTRUÇÕES DE MAPEAMENTO:

1. Mapeie todas as colunas que representarem um campo do schema
2. Para cada coluna, identifique:
   - Qual campo do schema ela representa
   - Que tipo de transformação será necessária

3. Só pode haver uma coluna mapeada para cada campo do schema, escolha a que melhor representa o campo desejado.
   - A única exceção é para o campo "description", que pode ter múltiplas colunas mapeadas para ele

4. TIPOS DE TRANSFORMAÇÃO (para o parser determinístico):
   - "date": datas em qualquer formato (15/04/2024, 2024-04-15, etc)
   - "currency": valores monetários (R$ 1.500,50, 1500.5, etc)
   - "status": status/estado (Pendente, Pago, Recebido, Ativo, etc)
   - "enum": valores categóricos fixos
   - "text": texto simples
   - "number": números inteiros (não monetários, ex: número de parcela)

5. Se uma coluna não corresponde a nenhum campo específico:
   - Mapeie para "description" (como informação adicional)

FORMATO DE SAÍDA (retorne APENAS JSON válido, SEM "rowTypes"):

{
  "sheetType": "receivables" | "expenses" | "contracts" | "skip",
  "columnMapping": {
    "Nome Exato da Coluna": {
      "field": "nomeDoCampo",
      "transform": "date" | "currency" | "status" | "text" | "number"
    }
  }
}

IMPORTANTE: Se sheetType = "skip", pode retornar columnMapping vazio: {}

EXEMPLO PRÁTICO:

Se a planilha "Controle RTs" tem:
- Colunas: "Nome do Projeto", "Valor da Parcela", "Data Recebimento", "Cobrado?"
- Dados: projetos, valores em R$, datas, status de cobrança

Isso indica RECEIVABLES (RTs = recebíveis), então:

{
  "sheetType": "receivables",
  "columnMapping": {
    "Nome do Projeto": {"field": "contractId", "transform": "text"},
    "Valor da Parcela": {"field": "amount", "transform": "currency"},
    "Data Recebimento": {"field": "receivedDate", "transform": "date"},
    "Cobrado?": {"field": "status", "transform": "status"}
  }
}

REGRAS CRÍTICAS:
- As chaves do columnMapping devem ser EXATAMENTE como aparecem no cabeçalho CSV (case-sensitive!)
- Retorne APENAS o JSON, sem texto adicional ou explicações
- NÃO inclua "rowTypes" (não estamos lidando com planilhas mistas nesta versão)
- A transformação será aplicada programaticamente, você apenas indica o tipo

Analise e retorne o JSON:
`.trim()
  }

  /**
   * Parse AI response and extract structured analysis
   * @private
   */
  private parseAnalysisResponse(responseText: string, sheetName: string): {
    sheetType: SheetType
    columnMapping: ColumnMapping
  } {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in analysis response')
    }

    const analysis = JSON.parse(jsonMatch[0]) as {
      sheetType: SheetType
      columnMapping: ColumnMapping
    }

    return analysis
  }
}
