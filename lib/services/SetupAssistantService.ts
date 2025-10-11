/**
 * SetupAssistantService - Simplified approach for extracting financial entities from Excel files
 *
 * This service handles the complete workflow for importing contracts, receivables, and expenses
 * from xlsx files using Claude AI for intelligent extraction.
 *
 * Workflow:
 * 1. Parse xlsx file
 * 2. Trim empty rows and columns
 * 3. Call Claude Sonnet 4 to extract entities
 * 4. Post-process with inference for null fields
 * 5. Bulk create entities using service layer
 */

import { BaseService, ServiceContext, ServiceError } from './BaseService'
import { ContractService } from './ContractService'
import { ReceivableService } from './ReceivableService'
import { ExpenseService } from './ExpenseService'
import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'

// Type definitions for extracted entities
export interface ExtractedContract {
  clientName: string
  projectName: string
  totalValue: number
  signedDate: string
  status?: 'active' | 'completed' | 'cancelled'
  description?: string | null
  category?: string | null
  notes?: string | null
}

export interface ExtractedReceivable {
  contractId?: string | null  // projectName reference
  expectedDate?: string | null
  amount: number
  status?: 'pending' | 'received' | 'overdue' | null
  receivedDate?: string | null
  receivedAmount?: number | null
  description?: string | null
  category?: string | null
  clientName?: string | null
}

export interface ExtractedExpense {
  description: string
  amount: number
  dueDate?: string | null
  category: string
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled' | null
  paidDate?: string | null
  paidAmount?: number | null
  vendor?: string | null
  invoiceNumber?: string | null
  contractId?: string | null
  notes?: string | null
}

export interface ExtractionResult {
  contracts: ExtractedContract[]
  receivables: ExtractedReceivable[]
  expenses: ExtractedExpense[]
}

export interface ProcessingResult {
  success: boolean
  contractsCreated: number
  receivablesCreated: number
  expensesCreated: number
  errors: string[]
}

// Type definitions for two-phase extraction
export interface SheetInfo {
  name: string
  type: 'contracts' | 'receivables' | 'expenses' | 'unknown'
  approximateRows: number
  columns: Record<string, string>  // column header -> field mapping
  notes?: string
}

export interface ExtractionPlan {
  sheets: SheetInfo[]
  projectNames: string[]  // For cross-sheet reference
  totalExpectedEntities: number
}

export interface SheetData {
  name: string
  csv: string
}

/**
 * SetupAssistantService - Main service class
 */
export class SetupAssistantService extends BaseService<any, any, any, any> {
  private anthropic: Anthropic
  private contractService: ContractService
  private receivableService: ReceivableService
  private expenseService: ExpenseService

  constructor(context: ServiceContext) {
    super(context, 'setup_assistant', [])

    // Initialize Anthropic client
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
    })

    // Initialize service instances
    this.contractService = new ContractService(context)
    this.receivableService = new ReceivableService(context)
    this.expenseService = new ExpenseService(context)
  }

  /**
   * No-op implementation of abstract method
   * Business rules are validated by individual entity services
   */
  async validateBusinessRules(data: any): Promise<void> {
    // No validation needed - delegated to entity services
    return Promise.resolve()
  }

  /**
   * Main entry point: Process an xlsx file and extract all financial entities
   * Uses two-phase approach: analysis + parallel sheet extraction
   */
  async processFile(fileBuffer: Buffer, filename: string): Promise<ProcessingResult> {
    try {
      console.log('\n' + '='.repeat(80))
      console.log('🚀 TWO-PHASE PARALLEL EXTRACTION')
      console.log('='.repeat(80))

      // Step 1: Parse xlsx file
      const workbook = this.parseXlsx(fileBuffer)

      // Step 2: Extract sheet data
      const sheetsData = this.extractSheetsData(workbook)
      console.log(`📊 Found ${sheetsData.length} sheets with data`)

      // PHASE 1: Analyze file structure
      console.log('\n📋 PHASE 1: Analyzing file structure...')
      const extractionPlan = await this.analyzeFileStructure(sheetsData, filename)

      // PHASE 2: Extract all sheets in parallel
      console.log('\n⚡ PHASE 2: Extracting sheets in parallel...')
      const extractionResults = await this.extractSheetsInParallel(sheetsData, extractionPlan, filename)

      // Aggregate results from all sheets
      const aggregatedData = this.aggregateExtractionResults(extractionResults)

      // Post-process with inference
      const processedData = this.postProcessWithInference(aggregatedData)

      // Bulk create entities
      const result = await this.bulkCreateEntities(processedData)

      return result
    } catch (error) {
      throw new ServiceError(
        `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROCESSING_ERROR',
        500
      )
    }
  }

  /**
   * Step 1: Parse xlsx file into workbook
   */
  private parseXlsx(fileBuffer: Buffer): XLSX.WorkBook {
    try {
      return XLSX.read(fileBuffer, { type: 'buffer' })
    } catch (error) {
      throw new ServiceError(
        'Failed to parse Excel file. Please ensure it is a valid .xlsx file.',
        'INVALID_XLSX',
        400
      )
    }
  }

  /**
   * Step 2: Extract sheet data from workbook
   * Returns array of SheetData objects (one per non-empty sheet)
   */
  private extractSheetsData(workbook: XLSX.WorkBook): SheetData[] {
    const sheetsData: SheetData[] = []

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]

      // Get the range of the sheet
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')

      // Find actual data boundaries
      let minRow = range.e.r + 1  // Start beyond max
      let maxRow = 0
      let minCol = range.e.c + 1
      let maxCol = 0

      // Scan for non-empty cells
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          const cell = sheet[cellAddress]

          if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
            minRow = Math.min(minRow, row)
            maxRow = Math.max(maxRow, row)
            minCol = Math.min(minCol, col)
            maxCol = Math.max(maxCol, col)
          }
        }
      }

      // If sheet has data, extract trimmed range
      if (minRow <= maxRow) {
        const trimmedRange = {
          s: { r: minRow, c: minCol },
          e: { r: maxRow, c: maxCol }
        }

        // Create a new sheet with only the trimmed data
        const trimmedSheet: XLSX.WorkSheet = {}
        trimmedSheet['!ref'] = XLSX.utils.encode_range(trimmedRange)

        for (let row = minRow; row <= maxRow; row++) {
          for (let col = minCol; col <= maxCol; col++) {
            const oldAddress = XLSX.utils.encode_cell({ r: row, c: col })
            const newAddress = XLSX.utils.encode_cell({
              r: row - minRow,
              c: col - minCol
            })
            if (sheet[oldAddress]) {
              trimmedSheet[newAddress] = sheet[oldAddress]
            }
          }
        }

        // Convert to CSV for Claude
        const csv = XLSX.utils.sheet_to_csv(trimmedSheet)
        sheetsData.push({
          name: sheetName,
          csv: csv
        })
      }
    }

    return sheetsData
  }

  /**
   * Helper: Repair malformed JSON from Claude
   */
  private repairJSON(jsonStr: string): string {
    let repaired = jsonStr

    // Remove trailing commas before } or ]
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

    // Fix control characters
    repaired = repaired.replace(/[\n\r\t]/g, ' ')

    // Remove null bytes
    repaired = repaired.replace(/\0/g, '')

    return repaired
  }

  /**
   * Helper: Parse JSON incrementally if standard parse fails
   * Extracts contracts, receivables, and expenses arrays separately
   */
  private parseJSONIncremental(jsonStr: string): ExtractionResult {
    const result: ExtractionResult = {
      contracts: [],
      receivables: [],
      expenses: []
    }

    try {
      // Try to extract contracts array
      const contractsMatch = jsonStr.match(/"contracts"\s*:\s*\[([\s\S]*?)\]/)
      if (contractsMatch) {
        result.contracts = JSON.parse(`[${contractsMatch[1]}]`)
      }
    } catch (e) {
      console.log('⚠️ Failed to parse contracts array incrementally')
    }

    try {
      // Try to extract receivables array
      const receivablesMatch = jsonStr.match(/"receivables"\s*:\s*\[([\s\S]*?)\]/)
      if (receivablesMatch) {
        result.receivables = JSON.parse(`[${receivablesMatch[1]}]`)
      }
    } catch (e) {
      console.log('⚠️ Failed to parse receivables array incrementally')
    }

    try {
      // Try to extract expenses array
      const expensesMatch = jsonStr.match(/"expenses"\s*:\s*\[([\s\S]*?)\]/)
      if (expensesMatch) {
        result.expenses = JSON.parse(`[${expensesMatch[1]}]`)
      }
    } catch (e) {
      console.log('⚠️ Failed to parse expenses array incrementally')
    }

    return result
  }

  /**
   * PHASE 1: Analyze file structure and create extraction plan
   */
  private async analyzeFileStructure(sheetsData: SheetData[], filename: string): Promise<ExtractionPlan> {
    const allSheetsPreview = sheetsData.map(sheet => ({
      name: sheet.name,
      preview: sheet.csv.split('\n').slice(0, 10).join('\n')  // First 10 rows
    }))

    const prompt = `Analise este arquivo Excel "${filename}" de um escritório de arquitetura no Brasil.

CONTEXTO FINANCEIRO DE ESCRITÓRIOS DE ARQUITETURA:
Arquitetos ou escritórios de arquitetura no Brasil ganham dinheiro majoritariamente de projetos (geralmente pago em múltiplas parcelas por projeto), comissão de RT (responsabilidade técnica) na intermediação de venda/contratação de móveis ou demais fornecedores pelos seus clientes (geralmente múltiplas entradas por projeto, pagas por diversos fornecedores), acompanhamento de obra ou de projeto (geralmente também em parcelas) ou até um % de gestão ou comissão sobre o orçamento da obra. Os projetos podem ser residenciais (ex: apartamentos, áreas comuns de prédios), comerciais (ex: lojas, bares, restaurantes), corporativos (ex: escritórios, sedes de empresas), industriais (mais raro). As principais despesas geralmente são com salários, espaço (ex: aluguel, energia, internet), softwares de arquitetura (geralmente pagos mensalmente ou anualmente), marketing (ex: branding, PR, instagram, ads), impostos, equipamentos (mais pontuais, como computador, mesa, celular, manutenções), entre outros menores. Agregue este contexto aos seus conhecimentos para identificar sinais de que uma entrada se trata de um contrato, uma receita ou uma despesa, o nome do arquivo, da planilha e as colunas podem fornecer dicas importantes.

Aqui estão prévias de todas as planilhas (primeiras 10 linhas de cada):

${allSheetsPreview.map(s => `--- ${s.name} ---\n${s.preview}`).join('\n\n')}

Crie um plano de extração com o seguinte formato JSON:
{
  "sheets": [
    {
      "name": "nome da planilha",
      "type": "contracts" | "receivables" | "expenses" | "unknown",
      "approximateRows": número,
      "columns": {"cabeçalho1": "fieldName1", "cabeçalho2": "fieldName2"},
      "notes": "observações relevantes"
    }
  ],
  "projectNames": ["lista de nomes de projetos encontrados nas planilhas de contratos"],
  "totalExpectedEntities": número
}

Para cada planilha, identifique:
1. Que tipo de entidade ela contém (contracts/receivables/expenses/unknown)
2. Número aproximado de linhas de dados
3. Mapeamento de colunas para os campos do nosso schema
4. Quaisquer referências entre planilhas (ex: receivables referenciando nomes de projetos)

Retorne APENAS o JSON, nada mais.`

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in analysis response')

      const plan = JSON.parse(jsonMatch[0]) as ExtractionPlan

      console.log(`✅ Analysis complete:`)
      console.log(`   Sheets identified: ${plan.sheets.length}`)
      console.log(`   Expected entities: ${plan.totalExpectedEntities}`)
      plan.sheets.forEach(s => {
        console.log(`   - ${s.name}: ${s.type} (~${s.approximateRows} rows)`)
      })

      return plan
    } catch (error) {
      throw new ServiceError(
        `Failed to analyze file structure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ANALYSIS_ERROR',
        500
      )
    }
  }

  /**
   * PHASE 2: Extract all sheets in parallel
   */
  private async extractSheetsInParallel(
    sheetsData: SheetData[],
    plan: ExtractionPlan,
    filename: string
  ): Promise<ExtractionResult[]> {
    const extractionPromises = plan.sheets.map(sheetInfo => {
      const sheetData = sheetsData.find(s => s.name === sheetInfo.name)
      if (!sheetData) {
        console.log(`⚠️ Sheet "${sheetInfo.name}" not found in data, skipping`)
        return Promise.resolve({ contracts: [], receivables: [], expenses: [] })
      }

      return this.extractSheet(sheetData, sheetInfo, plan, filename)
    })

    console.log(`🚀 Starting ${extractionPromises.length} parallel extractions...`)
    const results = await Promise.allSettled(extractionPromises)

    const successfulResults: ExtractionResult[] = []
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value)
        console.log(`   ✅ Sheet ${index + 1}/${results.length}: Success`)
      } else {
        console.log(`   ❌ Sheet ${index + 1}/${results.length}: ${result.reason}`)
      }
    })

    return successfulResults
  }

  /**
   * Aggregate results from all sheets
   */
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

    console.log('\n📊 AGGREGATION:')
    console.log(`   Total contracts: ${aggregated.contracts.length}`)
    console.log(`   Total receivables: ${aggregated.receivables.length}`)
    console.log(`   Total expenses: ${aggregated.expenses.length}`)

    return aggregated
  }

  /**
   * Extract entities from a single sheet
   */
  private async extractSheet(
    sheetData: SheetData,
    sheetInfo: SheetInfo,
    plan: ExtractionPlan,
    filename: string
  ): Promise<ExtractionResult> {
    const prompt = `Você está extraindo dados financeiros de um escritório de arquitetura no Brasil.

CONTEXTO FINANCEIRO DE ESCRITÓRIOS DE ARQUITETURA:
Arquitetos ou escritórios de arquitetura no Brasil ganham dinheiro majoritariamente de projetos (geralmente pago em múltiplas parcelas por projeto), comissão de RT (responsabilidade técnica) na intermediação de venda/contratação de móveis ou demais fornecedores pelos seus clientes (geralmente múltiplas entradas por projeto, pagas por diversos fornecedores), acompanhamento de obra ou de projeto (geralmente também em parcelas) ou até um % de gestão ou comissão sobre o orçamento da obra. Os projetos podem ser residenciais (ex: apartamentos, áreas comuns de prédios), comerciais (ex: lojas, bares, restaurantes), corporativos (ex: escritórios, sedes de empresas), industriais (mais raro). As principais despesas geralmente são com salários, espaço (ex: aluguel, energia, internet), softwares de arquitetura (geralmente pagos mensalmente ou anualmente), marketing (ex: branding, PR, instagram, ads), impostos, equipamentos (mais pontuais, como computador, mesa, celular, manutenções), entre outros menores. Agregue este contexto aos seus conhecimentos para identificar sinais de que uma entrada se trata de um contrato, uma receita ou uma despesa, o nome do arquivo, da planilha e as colunas podem fornecer dicas importantes.

CONTEXTO DO ARQUIVO E PLANILHA:
- Arquivo: "${filename}"
- Planilha: "${sheetData.name}"
- Tipo de dados: ${sheetInfo.type} (entidades financeiras)
- Setor: Arquitetura/Engenharia
- País: Brasil (valores em Real, datas em formato brasileiro)

CONTEXTO DA ANÁLISE:
- Tipo da planilha: ${sheetInfo.type}
- Linhas aproximadas: ${sheetInfo.approximateRows}
- Mapeamento de colunas: ${JSON.stringify(sheetInfo.columns)}
- ${sheetInfo.notes || 'Sem notas adicionais'}
- Nomes de projetos conhecidos: ${plan.projectNames.join(', ')}

DADOS DA PLANILHA:
${sheetData.csv}

Extraia TODOS os ${sheetInfo.type} desta planilha seguindo o schema abaixo.

CRÍTICO: Extraia TODAS as linhas - não pule nenhuma! Esta planilha deve ter aproximadamente ${sheetInfo.approximateRows} entidades.

IMPORTANTE: Extraia apenas UMA entidade por linha, não mais que isso. Cada linha representa uma única entidade (contract OU receivable OU expense), nunca múltiplas entidades da mesma linha.

Schema para ${sheetInfo.type}:
- Conte quantas planilhas existem nos dados
- Identifique o que cada planilha contém (contratos, recebíveis, despesas ou outros)
- Note a estrutura de cada planilha (colunas, cabeçalhos, padrões de dados)

PASSO 2: ANALISE CADA PLANILHA INDIVIDUALMENTE
- Para cada planilha, identifique:
  * Que tipo de entidades ela contém (contracts/receivables/expenses)
  * Cabeçalhos das colunas e o que representam
  * Número aproximado de linhas com dados
  * Quaisquer padrões ou formatação especial

PASSO 3: PLANEJE SUA ESTRATÉGIA DE EXTRAÇÃO
- Decida como extrair dados de cada tipo de planilha
- Mapeie cabeçalhos de colunas para os campos do schema necessários
- Note quaisquer transformações necessárias (datas, valores, inferência de status)

PASSO 4: EXTRAIA TODOS OS DADOS SISTEMATICAMENTE
- Processe TODAS as linhas em cada planilha (não pule nenhuma!)
- Para cada tipo de entidade, extraia TODAS as linhas correspondentes
- Aplique as regras do schema para cada linha extraída

PASSO 5: VALIDE E RETORNE
- Conte o total de entidades extraídas por tipo
- Verifique se não perdeu nenhuma planilha ou linha
- Retorne o JSON completo com TODOS os dados extraídos

CRÍTICO: Você deve extrair TODAS as linhas de TODAS as planilhas. Não pare cedo. Não resuma. Extraia tudo.

Aqui estão os requisitos de schema para cada tipo de entidade:

Contract (Contratos/Projetos):
- clientName: TEXT (OBRIGATÓRIO, use projectName como padrão se não encontrar clientName)
- projectName: TEXT (OBRIGATÓRIO, use clientName como padrão se não encontrar projectName)
- totalValue: DECIMAL (OBRIGATÓRIO)
- signedDate: TIMESTAMP (OBRIGATÓRIO)
- status: TEXT (OBRIGATÓRIO: active, completed, cancelled; se não conseguir descobrir, pode definir como active por padrão)
- description, category, notes: TEXT (OPCIONAL, você pode inferir)

Receivable (Recebíveis):
- contractId: TEXT (OPCIONAL - projectName do projeto associado, ou algum nome/descrição se não estiver associado a nenhum projeto)
- expectedDate: TIMESTAMP (OPCIONAL, a data em que o recebível foi recebido ou é/era esperado ser recebido)
- amount: DECIMAL (OBRIGATÓRIO)
- status: TEXT (OPCIONAL: pending, received, overdue)
- receivedDate, receivedAmount: DECIMAL (OPCIONAL: apenas se o recebível foi pago e a data de pagamento está lá)

Expense (Despesas):
- description: TEXT (OBRIGATÓRIO: qualquer nome ou descrição sobre o que é esta despesa)
- amount: DECIMAL (OBRIGATÓRIO)
- dueDate: TIMESTAMP (OPCIONAL, a data em que esta despesa foi paga ou é/era esperado ser paga)
- category: TEXT (OBRIGATÓRIO - Alimentação, Transporte, Materiais, Serviços, Escritório, Marketing, Impostos, Salários, Outros; você pode inferir com base no que é a despesa)
- status: TEXT (OPCIONAL: pending, paid, overdue, cancelled; se não conseguir encontrar a informação, pode inferir como paid para datas passadas e pending para datas futuras)

Se você não conseguir preencher um campo que é OBRIGATÓRIO para alguma entidade, considere essa entrada específica inválida e não a adicione ao JSON; todos os campos opcionais que você não conseguir extrair, deixe-os como null.

Por favor, responda com um objeto JSON neste formato:
{
  "contracts": [...],
  "receivables": [...],
  "expenses": [...]
}

Retorne APENAS JSON válido com as entidades extraídas.`

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      // Extract JSON from Claude's response
      const responseText = message.content[0].type === 'text'
        ? message.content[0].text
        : ''

      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Claude did not return valid JSON')
      }

      let extractedData: ExtractionResult

      // Try 3-layer parsing strategy
      try {
        // Layer 1: Direct parse
        extractedData = JSON.parse(jsonMatch[0]) as ExtractionResult
        console.log('✅ JSON parsed directly (Layer 1)')
      } catch (directError) {
        console.log('⚠️ Direct JSON parse failed, trying repair (Layer 2)...')
        try {
          // Layer 2: Repair and parse
          const repairedJSON = this.repairJSON(jsonMatch[0])
          extractedData = JSON.parse(repairedJSON) as ExtractionResult
          console.log('✅ JSON parsed after repair (Layer 2)')
        } catch (repairError) {
          console.log('⚠️ Repaired JSON parse failed, trying incremental (Layer 3)...')
          // Layer 3: Incremental extraction
          extractedData = this.parseJSONIncremental(jsonMatch[0])
          console.log('✅ JSON parsed incrementally (Layer 3)')
        }
      }

      // 🔍 LOG: What did Claude extract?
      console.log('\n' + '='.repeat(80))
      console.log('🔍 CLAUDE EXTRACTION RESULTS (Raw)')
      console.log('='.repeat(80))
      console.log(`📊 Contracts extracted: ${extractedData.contracts.length}`)
      console.log(`📊 Receivables extracted: ${extractedData.receivables.length}`)
      console.log(`📊 Expenses extracted: ${extractedData.expenses.length}`)
      console.log(`📊 TOTAL extracted: ${extractedData.contracts.length + extractedData.receivables.length + extractedData.expenses.length}`)

      // Show sample of each type for debugging
      if (extractedData.contracts.length > 0) {
        console.log(`\n✅ Sample contract: ${JSON.stringify(extractedData.contracts[0], null, 2).substring(0, 200)}...`)
      }
      if (extractedData.receivables.length > 0) {
        console.log(`\n✅ Sample receivable: ${JSON.stringify(extractedData.receivables[0], null, 2).substring(0, 200)}...`)
      }
      if (extractedData.expenses.length > 0) {
        console.log(`\n✅ Sample expense: ${JSON.stringify(extractedData.expenses[0], null, 2).substring(0, 200)}...`)
      }

      return extractedData
    } catch (error) {
      throw new ServiceError(
        `Failed to extract data with Claude: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLAUDE_EXTRACTION_ERROR',
        500
      )
    }
  }

  /**
   * Normalize date string to ISO-8601 format with timezone
   */
  private normalizeDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null

    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return null
      return date.toISOString()
    } catch {
      return null
    }
  }

  /**
   * Step 4: Post-process extracted data with inference for null fields
   * IMPORTANT: Only infer when fields are null - never change non-null values
   * IMPORTANT: Filter out invalid entities that can't be saved
   */
  private postProcessWithInference(data: ExtractionResult): ExtractionResult {
    console.log('\n' + '='.repeat(80))
    console.log('🔧 POST-PROCESSING WITH INFERENCE')
    console.log('='.repeat(80))

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today for date comparisons

    // Track filtered entities
    let filteredContracts = 0
    let filteredReceivables = 0
    let filteredExpenses = 0

    // Infer missing contract fields and filter invalid ones
    data.contracts = data.contracts
      .filter(contract => {
        // [CONTRACTS] Filter: both clientName and projectName null, OR totalValue null
        if ((!contract.clientName && !contract.projectName) || !contract.totalValue) {
          filteredContracts++
          console.log(`⚠️ Filtered invalid contract: ${JSON.stringify(contract).substring(0, 100)}`)
          return false
        }
        return true
      })
      .map(contract => {
      const processed = { ...contract }

      // If clientName missing, use projectName
      if (!processed.clientName) {
        processed.clientName = processed.projectName
      }
      // If projectName missing, use clientName
      if (!processed.projectName) {
        processed.projectName = processed.clientName
      }

      // [CONTRACTS] Inference: status = active if null
      if (!processed.status) {
        processed.status = 'active'
      }

      // Normalize signedDate to ISO-8601 format
      if (processed.signedDate) {
        processed.signedDate = this.normalizeDate(processed.signedDate) || processed.signedDate
      }

      // Keep optional fields as-is (null if not provided)
      return processed
    })

    // Infer missing receivable fields and filter invalid ones
    data.receivables = data.receivables
      .filter(receivable => {
        // [RECEIVABLES] Filter: amount null
        if (!receivable.amount || receivable.amount <= 0) {
          filteredReceivables++
          console.log(`⚠️ Filtered invalid receivable: ${JSON.stringify(receivable).substring(0, 100)}`)
          return false
        }
        return true
      })
      .map(receivable => {
      const processed = { ...receivable }

      // [RECEIVABLES] Inference: expectedDate = current date if null
      if (!processed.expectedDate) {
        processed.expectedDate = today.toISOString()
      } else {
        // Normalize expectedDate to ISO-8601 format
        processed.expectedDate = this.normalizeDate(processed.expectedDate) || processed.expectedDate
      }

      // [RECEIVABLES] Inference: status based on expectedDate (only if null)
      if (!processed.status) {
        const expectedDate = new Date(processed.expectedDate)
        expectedDate.setHours(0, 0, 0, 0)

        // pending for expectedDate in the future (including current date)
        // received if expectedDate in the past
        if (expectedDate >= today) {
          processed.status = 'pending'
        } else {
          processed.status = 'received'
        }
      }

      // [RECEIVABLES] Inference: if status = received, fill receivedDate and receivedAmount
      if (processed.status === 'received') {
        if (!processed.receivedDate) {
          processed.receivedDate = processed.expectedDate
        } else {
          // Normalize receivedDate to ISO-8601 format
          processed.receivedDate = this.normalizeDate(processed.receivedDate) || processed.receivedDate
        }
        if (!processed.receivedAmount) {
          processed.receivedAmount = processed.amount
        }
      }

      // [RECEIVABLES] Additional inference: standalone receivables need clientName
      // IMPORTANT: Extract clientName BEFORE contractId gets mapped to UUID (or null)
      if (!processed.clientName) {
        // If contractId is a string (project name), use it as clientName
        if (processed.contractId && typeof processed.contractId === 'string' && processed.contractId.trim()) {
          processed.clientName = processed.contractId.trim()
        }
        // Or use description if available
        else if (processed.description && processed.description.trim()) {
          processed.clientName = processed.description.trim()
        }
        // Or use a default
        else {
          processed.clientName = 'Cliente não especificado'
        }
      }

      return processed
    })

    // Infer missing expense fields and filter invalid ones
    data.expenses = data.expenses
      .filter(expense => {
        // [EXPENSES] Filter: description null OR amount null (category can be inferred)
        if (!expense.description || !expense.amount || expense.amount <= 0) {
          filteredExpenses++
          console.log(`⚠️ Filtered invalid expense: ${JSON.stringify(expense).substring(0, 100)}`)
          return false
        }
        return true
      })
      .map(expense => {
      const processed = { ...expense }

      // [EXPENSES] Inference: category = "Outros" if null
      if (!processed.category) {
        processed.category = 'Outros'
      }

      // [EXPENSES] Inference: dueDate = current date if null
      if (!processed.dueDate) {
        processed.dueDate = today.toISOString()
      } else {
        // Normalize dueDate to ISO-8601 format
        processed.dueDate = this.normalizeDate(processed.dueDate) || processed.dueDate
      }

      // [EXPENSES] Inference: status based on dueDate (only if null)
      if (!processed.status) {
        const dueDate = new Date(processed.dueDate)
        dueDate.setHours(0, 0, 0, 0)

        // pending for dueDate in the future (including current date)
        // paid if dueDate in the past
        if (dueDate >= today) {
          processed.status = 'pending'
        } else {
          processed.status = 'paid'
        }
      }

      // [EXPENSES] Additional inference: paid expenses need paidDate and paidAmount
      if (processed.status === 'paid') {
        if (!processed.paidDate) {
          processed.paidDate = processed.dueDate
        }
        if (!processed.paidAmount) {
          processed.paidAmount = processed.amount
        }
      }

      return processed
    })

    console.log(`\n✅ After post-processing:`)
    console.log(`   Contracts: ${data.contracts.length} (filtered: ${filteredContracts})`)
    console.log(`   Receivables: ${data.receivables.length} (filtered: ${filteredReceivables})`)
    console.log(`   Expenses: ${data.expenses.length} (filtered: ${filteredExpenses})`)

    return data
  }

  /**
   * Step 5: Bulk create all entities using service layer
   * Success criteria: Only fail for SYSTEMATIC errors (file format, API issues)
   * Partial validation failures are OK - we track them but don't fail the entire operation
   */
  private async bulkCreateEntities(data: ExtractionResult): Promise<ProcessingResult> {
    console.log('\n' + '='.repeat(80))
    console.log('💾 BULK CREATION (Service Layer Validation)')
    console.log('='.repeat(80))

    const result: ProcessingResult = {
      success: true,  // Start optimistic - only set false for systematic errors
      contractsCreated: 0,
      receivablesCreated: 0,
      expensesCreated: 0,
      errors: []
    }

    let hasSystematicError = false  // Track if we hit a systematic error

    // Create contracts first (they may be referenced by receivables)
    if (data.contracts.length > 0) {
      console.log(`\n📝 Creating ${data.contracts.length} contracts...`)
      try {
        const contractResult = await this.contractService.bulkCreate(
          data.contracts as any,
          { continueOnError: true }
        )
        result.contractsCreated = contractResult.successCount
        result.errors.push(...contractResult.errors)

        console.log(`   ✅ Created: ${contractResult.successCount}`)
        console.log(`   ❌ Failed: ${contractResult.failureCount}`)
        if (contractResult.errors.length > 0) {
          console.log(`   ⚠️ First error: ${contractResult.errors[0]}`)
        }
      } catch (error) {
        // This is a systematic error (service layer failure, not validation)
        hasSystematicError = true
        result.errors.push(`Contract creation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.log(`   ❌ SYSTEMATIC ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Create receivables
    if (data.receivables.length > 0) {
      console.log(`\n📝 Creating ${data.receivables.length} receivables...`)
      try {
        // Need to map contractId (projectName) to actual contract IDs
        const receivablesWithContractIds = await this.mapContractIds(data.receivables)

        const receivableResult = await this.receivableService.bulkCreate(
          receivablesWithContractIds as any,
          { continueOnError: true }
        )
        result.receivablesCreated = receivableResult.successCount
        result.errors.push(...receivableResult.errors)

        console.log(`   ✅ Created: ${receivableResult.successCount}`)
        console.log(`   ❌ Failed: ${receivableResult.failureCount}`)
        if (receivableResult.errors.length > 0) {
          console.log(`   ⚠️ First error: ${receivableResult.errors[0]}`)
        }
      } catch (error) {
        // This is a systematic error (service layer failure, not validation)
        hasSystematicError = true
        result.errors.push(`Receivable creation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.log(`   ❌ SYSTEMATIC ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Create expenses
    if (data.expenses.length > 0) {
      console.log(`\n📝 Creating ${data.expenses.length} expenses...`)
      try {
        const expenseResult = await this.expenseService.bulkCreate(
          data.expenses as any,
          { continueOnError: true }
        )
        result.expensesCreated = expenseResult.successCount
        result.errors.push(...expenseResult.errors)

        console.log(`   ✅ Created: ${expenseResult.successCount}`)
        console.log(`   ❌ Failed: ${expenseResult.failureCount}`)
        if (expenseResult.errors.length > 0) {
          console.log(`   ⚠️ First error: ${expenseResult.errors[0]}`)
        }
      } catch (error) {
        // This is a systematic error (service layer failure, not validation)
        hasSystematicError = true
        result.errors.push(`Expense creation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.log(`   ❌ SYSTEMATIC ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Success is true unless we had a SYSTEMATIC error (not validation failures)
    result.success = !hasSystematicError

    console.log(`\n📊 Final result:`)
    console.log(`   Success: ${result.success}`)
    console.log(`   Systematic errors: ${hasSystematicError ? 'YES' : 'NO'}`)
    console.log(`   Validation errors: ${result.errors.length}`)

    return result
  }

  /**
   * Helper: Map contractId (projectName references) to actual contract UUIDs
   */
  private async mapContractIds(receivables: ExtractedReceivable[]): Promise<ExtractedReceivable[]> {
    // Get all contracts for this team
    const contracts = await this.contractService.findMany({})

    return receivables.map(receivable => {
      if (receivable.contractId) {
        // Try to find contract by projectName
        const matchingContract = contracts.find(
          c => c.projectName.toLowerCase() === receivable.contractId?.toLowerCase()
        )

        if (matchingContract) {
          return {
            ...receivable,
            contractId: matchingContract.id
          }
        }
      }

      // If no match, set to null
      return {
        ...receivable,
        contractId: null
      }
    })
  }
}
