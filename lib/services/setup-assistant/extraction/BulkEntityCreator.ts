/**
 * BulkEntityCreator - Bulk Database Operations and Contract Mapping
 *
 * Responsibilities:
 * - Bulk validation and creation of entities
 * - Contract ID mapping (project names → UUIDs)
 * - Parallel entity creation by type
 * - Error aggregation and reporting
 * - Audit logging integration
 *
 * This component implements Phase 4 of the import workflow, handling
 * efficient batch database operations with proper error handling and
 * contract relationship management.
 *
 * Architecture: Single Responsibility Principle
 * - Focused on database persistence only
 * - Clear separation from extraction and transformation
 * - Service layer integration
 *
 * Extracted from SetupAssistantServiceV2.ts (lines 243-385)
 * Part of ADR-026: SetupAssistant Service Decomposition
 */

import type { ContractService } from '../../ContractService'
import type { ReceivableService } from '../../ReceivableService'
import type { ExpenseService } from '../../ExpenseService'
import type { ExtractionResult, ExtractedReceivable, ProcessingResult } from '../../SetupAssistantService'

/**
 * Options for bulk creation
 */
export interface BulkCreationOptions {
  continueOnError: boolean
}

/**
 * BulkEntityCreator - Batch database operations
 *
 * Key Methods:
 * - createEntities(): Orchestrate bulk creation with proper sequencing
 * - mapContractIds(): Convert project names to contract UUIDs
 *
 * Creation Sequence:
 * 1. Create contracts first (sequential, with duplicate handling)
 * 2. Map receivables' contractId to include newly created contracts
 * 3. Create receivables and expenses in parallel
 *
 * Error Handling:
 * - continueOnError: true for all operations (skip duplicates)
 * - Promise.allSettled for parallel operations
 * - Detailed error aggregation and logging
 *
 * Example Usage:
 * ```typescript
 * const creator = new BulkEntityCreator(
 *   contractService,
 *   receivableService,
 *   expenseService
 * )
 * const result = await creator.createEntities(extractedData)
 * ```
 */
export class BulkEntityCreator {
  constructor(
    private contractService: ContractService,
    private receivableService: ReceivableService,
    private expenseService: ExpenseService
  ) {}

  /**
   * Create all entities with proper sequencing and error handling
   *
   * Sequence:
   * 1. Contracts first (for mixed sheets to create new contracts)
   * 2. Map receivables to contracts (including newly created)
   * 3. Receivables and expenses in parallel
   */
  async createEntities(data: ExtractionResult): Promise<ProcessingResult> {
    console.log('\n💾 PHASE 4: Bulk Creation')
    console.log(`   Creating: ${data.contracts.length}c, ${data.receivables.length}r, ${data.expenses.length}e`)

    const errors: string[] = []
    let contractsCreated = 0
    let receivablesCreated = 0
    let expensesCreated = 0

    // Helper to convert null to undefined for service layer compatibility
    const cleanEntity = <T extends Record<string, any>>(entity: T): any => {
      const cleaned: any = {}
      for (const [key, value] of Object.entries(entity)) {
        cleaned[key] = value === null ? undefined : value
      }
      return cleaned
    }

    // CRITICAL: For mixed sheet imports, we must create contracts FIRST
    // so that receivables can be mapped to the newly created contracts

    // Step 1: Create contracts first (sequential)
    let contractResult = null
    if (data.contracts.length > 0) {
      try {
        // CRITICAL: Use continueOnError to skip duplicates and create new contracts
        contractResult = await this.contractService.bulkCreate(
          data.contracts.map(cleanEntity) as any,
          { continueOnError: true }  // Skip duplicates, create new ones
        )
        contractsCreated = contractResult.successCount
        errors.push(...contractResult.errors)
        console.log(`   ✅ Contracts created: ${contractsCreated} (${contractResult.failureCount} duplicates skipped)`)
      } catch (error) {
        errors.push(`Contracts bulk create failed: ${error}`)
      }
    }

    // Step 2: Map receivables' contractId (now includes newly created contracts!)
    const mappedReceivables = await this.mapContractIds(data.receivables)

    // Step 3: Create receivables and expenses in parallel
    // Use continueOnError for both to handle potential duplicates gracefully
    const results = await Promise.allSettled([
      mappedReceivables.length > 0
        ? this.receivableService.bulkCreate(mappedReceivables.map(cleanEntity) as any, { continueOnError: true })
        : null,
      data.expenses.length > 0
        ? this.expenseService.bulkCreate(data.expenses.map(cleanEntity) as any, { continueOnError: true })
        : null
    ])

    // Process results (receivables and expenses)
    if (results[0].status === 'fulfilled' && results[0].value) {
      receivablesCreated = results[0].value.successCount
      errors.push(...results[0].value.errors)
    } else if (results[0].status === 'rejected') {
      errors.push(`Receivables bulk create failed: ${results[0].reason}`)
    }

    if (results[1].status === 'fulfilled' && results[1].value) {
      expensesCreated = results[1].value.successCount
      errors.push(...results[1].value.errors)
    } else if (results[1].status === 'rejected') {
      errors.push(`Expenses bulk create failed: ${results[1].reason}`)
    }

    console.log(`   ✅ Created: ${contractsCreated}c, ${receivablesCreated}r, ${expensesCreated}e`)
    if (errors.length > 0) {
      console.log(`   ⚠️  Errors: ${errors.length}`)
      // 🔍 DIAGNOSTIC: Show actual errors
      console.log(`\n   🔍 BULK CREATION ERRORS:`)
      errors.slice(0, 3).forEach((err, idx) => {
        console.log(`      ${idx + 1}. ${err}`)
      })
      if (errors.length > 3) {
        console.log(`      ... and ${errors.length - 3} more errors`)
      }
    }

    return {
      success: true,
      contractsCreated,
      receivablesCreated,
      expensesCreated,
      errors
    }
  }

  /**
   * Map contractId (project name string) to actual contract UUID
   * If no match found, set contractId to null (standalone receivable)
   *
   * @private
   */
  async mapContractIds(receivables: ExtractedReceivable[]): Promise<ExtractedReceivable[]> {
    if (receivables.length === 0) return receivables

    console.log('\n🔗 CONTRACT ID MAPPING...')

    // Get all contracts for this team
    const contracts = await this.contractService.findMany({})
    console.log(`   Found ${contracts.length} existing contracts`)

    // Map project names to contract UUIDs
    let mapped = 0
    let notFound = 0

    const mappedReceivables = receivables.map(receivable => {
      // If contractId is already null or undefined, keep it
      if (!receivable.contractId) {
        return { ...receivable, contractId: null }
      }

      // If contractId is already a UUID format, keep it
      if (typeof receivable.contractId === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(receivable.contractId)) {
        return receivable
      }

      // Try to find matching contract by project name (case-insensitive)
      const projectNameLower = receivable.contractId.toLowerCase()
      const matchingContract = contracts.find(c =>
        c.projectName.toLowerCase() === projectNameLower
      )

      if (matchingContract) {
        mapped++
        return { ...receivable, contractId: matchingContract.id }
      } else {
        notFound++
        return { ...receivable, contractId: null }
      }
    })

    console.log(`   Mapped: ${mapped} | Not found: ${notFound}`)

    // 🔍 DIAGNOSTIC: Show sample mapping
    if (mappedReceivables.length > 0) {
      const sample = mappedReceivables[0]
      console.log(`   Sample mapping: contractId = ${sample.contractId ? sample.contractId.substring(0, 8) + '...' : 'null (standalone)'}`)
    }

    return mappedReceivables
  }
}
