/**
 * VisionExtractor - PDF and Image Processing with Claude Vision
 *
 * Responsibilities:
 * - Extract financial entities from PDF documents
 * - Process images with OCR and vision analysis
 * - Single-phase direct extraction (proven V1 approach)
 * - Profession-aware schema-based prompts
 *
 * This component uses Claude's vision API for direct entity extraction
 * from visual documents, providing 50% cost reduction and 50% speed
 * improvement over multi-phase approaches.
 *
 * Architecture: Single Responsibility Principle
 * - Focused on vision-based extraction only
 * - Clear separation from Excel/CSV processing
 * - Reusable for invoice scanning, receipt processing
 *
 * Extracted from SetupAssistantServiceV2.ts (lines 395-588)
 * Part of ADR-026: SetupAssistant Service Decomposition
 */

import Anthropic from '@anthropic-ai/sdk'
import { ServiceError } from '../../BaseService'
import { getProfessionConfig } from '@/lib/professions'
import type { ExtractionResult } from '../../SetupAssistantService'

/**
 * VisionExtractor - Vision-based entity extraction
 *
 * Key Methods:
 * - extractFromPdfOrImage(): Single-phase extraction from visual documents
 * - getImageMediaType(): Determine image MIME type from filename
 *
 * Supported Formats:
 * - PDF: application/pdf
 * - Images: PNG, JPEG, GIF, WebP
 *
 * Extraction Approach:
 * - Single AI call with complete schema
 * - Extended thinking budget for complex calculations
 * - Direct JSON extraction (no repair needed)
 * - Profession-aware business context
 *
 * Example Usage:
 * ```typescript
 * const extractor = new VisionExtractor(anthropicClient)
 * const result = await extractor.extractFromPdfOrImage(
 *   fileBuffer,
 *   'document.pdf',
 *   'pdf',
 *   'architect'
 * )
 * ```
 */
export class VisionExtractor {
  constructor(private anthropic: Anthropic) {}

  /**
   * Extract financial entities from PDF or image using Claude Vision
   * Single-phase approach: direct schema-based extraction
   */
  async extractFromPdfOrImage(
    fileBuffer: Buffer,
    filename: string,
    fileType: 'pdf' | 'image',
    professionOverride?: string,
    teamProfession?: string
  ): Promise<ExtractionResult> {
    console.log(`🔍 Processing ${fileType.toUpperCase()} with single-phase vision extraction...`)

    const profession = teamProfession || professionOverride
    const professionConfig = getProfessionConfig(profession)

    // Determine media type and content type for Anthropic API
    const mediaType = fileType === 'pdf'
      ? 'application/pdf'
      : this.getImageMediaType(filename)

    const contentType = fileType === 'pdf' ? 'document' : 'image'

    // Full schema prompt with profession-aware context (from V1)
    const prompt = this.buildVisionPrompt(professionConfig)

    try {
      // Call Claude Vision API with extended thinking for complex calculations
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        temperature: 1,
        thinking: {
          type: 'enabled',
          budget_tokens: 10000
        },
        messages: [{
          role: 'user',
          content: [
            {
              type: contentType as 'document' | 'image',
              source: {
                type: 'base64',
                media_type: mediaType as any,
                data: fileBuffer.toString('base64')
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }]
      })

      // Extract JSON from response (skip thinking blocks)
      let responseText = ''
      for (const block of message.content) {
        if (block.type === 'text') {
          responseText = block.text
          break
        }
      }

      const thinkingBlocks = message.content.filter(b => b.type === 'thinking')
      if (thinkingBlocks.length > 0) {
        console.log(`💭 Claude used ${thinkingBlocks.length} thinking block(s) for reasoning`)
      }

      if (!responseText.trim()) {
        throw new Error('Claude did not return any data from the file')
      }

      // Extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Claude did not return valid JSON')
      }

      // Parse JSON (direct parse, no repair needed for V2)
      const extractedData = JSON.parse(jsonMatch[0]) as ExtractionResult

      console.log(`✅ Vision extraction: ${extractedData.contracts.length}c, ${extractedData.receivables.length}r, ${extractedData.expenses.length}e`)

      return extractedData
    } catch (error) {
      console.error('Vision extraction error:', error)
      throw new ServiceError(
        `Failed to extract data from ${fileType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VISION_EXTRACTION_ERROR',
        500
      )
    }
  }

  /**
   * Build vision extraction prompt with profession context
   * @private
   */
  private buildVisionPrompt(professionConfig: any): string {
    return `Você está analisando um documento de ${professionConfig.businessContext.businessType}.

• Este documento pode estar em formato PDF, imagem, ou qualquer outro formato visual, pode se tratar por exemplo de um contrato, uma proposta, um recibo, etc.
• Sua tarefa é extrair TODAS as entidades financeiras (contratos, recebíveis, despesas) encontradas neste documento.
• Preste atenção no tipo e nome do documento pois fornecem indícios dos tipos de entidade financeira que você deve encontrar
• Se encontrar formas de pagamento (recebíveis ou despesas), preste atenção nas condições de pagamento: quanto é à vista, quanto é parcelado, quais as datas de pagamento
   • É comum encontrar propostas com valores diferentes entre parcelas, que podem ser explícitos ou implícitos
   • Calcule quanto deve ser pago à vista, quantas parcelas são e qual o valor e data específico de cada parcela, evitando erros de interpretação por assumir algo incorretamente
• Revise o documento por inteiro antes de extrair as entidades financeiras, para ter todo contexto necessário

═══════════════════════════════════════════════════════════════════
CONTEXTO FINANCEIRO - ${professionConfig.businessContext.professionName.toUpperCase()}
═══════════════════════════════════════════════════════════════════

${professionConfig.businessContext.revenueDescription}

${professionConfig.businessContext.projectTypes}

${professionConfig.businessContext.expenseDescription}

Use este contexto para identificar e classificar corretamente as entidades financeiras.

═══════════════════════════════════════════════════════════════════
SCHEMA DAS ENTIDADES
═══════════════════════════════════════════════════════════════════

📋 CONTRACT (Contratos/Projetos):
{
  "clientName": "string",        // OBRIGATÓRIO
  "projectName": "string",       // OBRIGATÓRIO
  "totalValue": number,          // ${professionConfig.ai.schemaRequirements.contract.totalValue === 'REQUIRED' ? 'OBRIGATÓRIO' : 'OPCIONAL'}
  "signedDate": "ISO-8601",      // ${professionConfig.ai.schemaRequirements.contract.signedDate === 'REQUIRED' ? 'OBRIGATÓRIO' : 'OPCIONAL'}
  "status": "active" | "completed" | "cancelled",  // OBRIGATÓRIO - se não descobrir, use "active"
  "description": "string" | null,
  "category": "string" | null,
  "notes": "string" | null
}

💰 RECEIVABLE (Recebíveis):
{
  "contractId": "string" | null,     // OPCIONAL - nome do projeto associado
  "clientName": "string" | null,     // OPCIONAL - nome do cliente
  "expectedDate": "ISO-8601" | null,
  "amount": number,                  // OBRIGATÓRIO
  "status": "pending" | "received" | "overdue" | null,
  "receivedDate": "ISO-8601" | null,
  "receivedAmount": number | null,
  "description": "string" | null,
  "category": "string" | null
}

💳 EXPENSE (Despesas):
{
  "description": "string",           // OBRIGATÓRIO
  "amount": number,                  // OBRIGATÓRIO
  "dueDate": "ISO-8601" | null,
  "category": "string",              // OBRIGATÓRIO - use "Outros" se não souber
  "status": "pending" | "paid" | "overdue" | "cancelled" | null,
  "paidDate": "ISO-8601" | null,
  "paidAmount": number | null,
  "vendor": "string" | null,
  "invoiceNumber": "string" | null,
  "contractId": "string" | null,
  "notes": "string" | null
}

═══════════════════════════════════════════════════════════════════
FORMATO DE RESPOSTA
═══════════════════════════════════════════════════════════════════

Retorne APENAS um objeto JSON válido neste formato:

{
  "contracts": [ /* array de contratos */ ],
  "receivables": [ /* array de recebíveis */ ],
  "expenses": [ /* array de despesas */ ]
}

IMPORTANTE:
• Retorne apenas JSON válido, sem markdown, sem explicações
• Arrays vazios são permitidos se não houver entidades daquele tipo
• Extraia TODAS as entidades encontradas
• Use valores null para campos opcionais não encontrados
• Formate datas no padrão ISO-8601 (ex: "2024-01-15T00:00:00.000Z")
• Valores monetários devem ser números (sem símbolos de moeda)`
  }

  /**
   * Get image media type from filename extension
   * @private
   */
  private getImageMediaType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop()
    const mediaTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp'
    }
    return mediaTypes[ext || 'png'] || 'image/png'
  }
}
