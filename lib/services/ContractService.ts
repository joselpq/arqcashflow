/**
 * ContractService - Business logic for contract management
 *
 * Extracts all contract-related business logic from API routes into a reusable service.
 * Maintains full compatibility with existing API behavior while providing clean interfaces
 * for both API routes and future AI integration.
 *
 * Features:
 * - Team-scoped contract operations
 * - Advanced filtering and sorting
 * - Audit logging for all mutations
 * - Business rule validation
 * - Receivables integration
 */

import { Contract, Receivable } from '@prisma/client'
import { BaseService, ServiceContext, ServiceError, ValidationUtils } from './BaseService'
import { createDateForStorage } from '@/lib/utils/date'
import { z } from 'zod'
import { DeleteOptions, DeletionInfo } from '@/lib/validation'

// Type definitions
export interface ContractWithReceivables extends Contract {
  receivables: Receivable[]
}

export interface ContractFilters {
  status?: string
  category?: string
  clientName?: string
  projectName?: string
  signedAfter?: string
  signedBefore?: string
}

export interface ContractCreateData {
  clientName: string
  projectName: string
  description?: string
  totalValue: number
  signedDate: string
  status?: string
  category?: string
  notes?: string
}

export interface ContractUpdateData {
  clientName?: string
  projectName?: string
  description?: string
  totalValue?: number
  signedDate?: string
  status?: string
  category?: string
  notes?: string
}

export interface ContractSummary {
  totalContracts: number
  totalValue: number
  contractsByStatus: Record<string, number>
  contractsByCategory: Record<string, number>
  averageContractValue: number
}

// Validation schema (extracted from API route) - TEMP: keep original until migration is stable
export const ContractSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  projectName: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  totalValue: z.number().positive('Total value must be positive'),
  signedDate: z.string().min(1, 'Signed date is required'),
  status: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
})

// Contract deletion interfaces now imported from validation layer

export class ContractService extends BaseService<
  ContractWithReceivables,
  ContractCreateData,
  ContractUpdateData,
  ContractFilters
> {
  constructor(context: ServiceContext) {
    super(context, 'contract', [
      'createdAt', 'signedDate', 'clientName', 'projectName', 'totalValue', 'status'
    ])
  }

  /**
   * Validate business rules for contract operations
   * Uses flexible validation: block clearly wrong data, warn about unusual patterns
   */
  async validateBusinessRules(data: ContractCreateData | ContractUpdateData, contractId?: string): Promise<void> {
    // Validate using Zod schema
    if ('clientName' in data && 'projectName' in data) {
      // This is create data - validate all required fields
      ContractSchema.parse(data)
    }

    // BLOCKING: Total value must be positive (clearly wrong)
    if (data.totalValue !== undefined) {
      ValidationUtils.validatePositiveNumber(data.totalValue, 'Total value')
    }

    // WARNING: Future signed date (unusual but may be intentional)
    if (data.signedDate) {
      const signedDate = new Date(data.signedDate)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today

      if (signedDate > today) {
        // Log warning for analytics/supervisor dashboard
        await this.logBusinessRuleWarning({
          rule: 'FUTURE_SIGNED_DATE',
          message: `Contract signed date is in the future: ${data.signedDate}`,
          data: { signedDate: data.signedDate, today: today.toISOString() },
          severity: 'warning'
        })
        // Continue - allow the operation but track it
      }
    }

    // BLOCKING: Check for exact duplicate contracts (clearly wrong)
    if (data.clientName && data.projectName) {
      const whereClause: any = {
        clientName: data.clientName,
        projectName: data.projectName
      }

      // For updates: exclude the current contract from duplicate check
      if (contractId) {
        whereClause.NOT = { id: contractId }
      }

      const existing = await this.context.teamScopedPrisma.contract.findFirst({
        where: whereClause
      })

      if (existing) {
        // For updates: just log as warning (don't block)
        if (contractId) {
          await this.logBusinessRuleWarning({
            rule: 'DUPLICATE_CONTRACT',
            message: `Possible duplicate: ${data.clientName} - ${data.projectName}`,
            data: { clientName: data.clientName, projectName: data.projectName },
            severity: 'warning'
          })
        } else {
          // For creates: still block
          throw new ServiceError(
            'A contract with this client and project name already exists',
            'DUPLICATE_CONTRACT',
            409
          )
        }
      }
    }
  }

  /**
   * Log business rule warnings for supervisor dashboard
   */
  private async logBusinessRuleWarning(warning: {
    rule: string
    message: string
    data?: any
    severity: 'info' | 'warning' | 'attention'
  }) {
    await this.logAudit(async () => {
      const auditContext = this.createAuditContext('business_rule_warning')
      // Store in audit log with special 'warning' type for supervisor dashboard
      await this.context.teamScopedPrisma.auditLog.create({
        data: {
          ...auditContext,
          entityType: 'contract',
          action: warning.rule,
          metadata: {
            warning: true,
            severity: warning.severity,
            message: warning.message,
            data: warning.data,
            needsReview: warning.severity === 'attention'
          }
        }
      })
    })
  }

  /**
   * Build advanced filters for contract queries
   */
  protected buildFilters(filters: ContractFilters): any {
    const where = super.buildFilters(filters)

    // Date range filtering
    if (filters.signedAfter || filters.signedBefore) {
      where.signedDate = {}
      if (filters.signedAfter) {
        where.signedDate.gte = new Date(filters.signedAfter)
      }
      if (filters.signedBefore) {
        where.signedDate.lte = new Date(filters.signedBefore)
      }
    }

    // Text search filtering
    if (filters.clientName) {
      where.clientName = {
        contains: filters.clientName,
        mode: 'insensitive'
      }
    }

    if (filters.projectName) {
      where.projectName = {
        contains: filters.projectName,
        mode: 'insensitive'
      }
    }

    return where
  }

  /**
   * Create a new contract with validation and date processing
   */
  async create(data: ContractCreateData): Promise<ContractWithReceivables> {
    // Auto-number project name if duplicate exists BEFORE validation
    const uniqueProjectName = await this.generateUniqueProjectName(
      data.clientName,
      data.projectName
    )

    // Create data with unique project name for validation
    const dataWithUniqueProjectName = {
      ...data,
      projectName: uniqueProjectName
    }

    // Validate business rules AFTER auto-numbering (when signedDate is still a string)
    await this.validateBusinessRules(dataWithUniqueProjectName)

    const processedData = {
      ...dataWithUniqueProjectName,
      signedDate: data.signedDate && data.signedDate.trim() !== ''
        ? createDateForStorage(data.signedDate)
        : new Date()
    }

    return await super.create(processedData as any, {
      receivables: true
    })
  }

  /**
   * Update a contract with validation
   */
  async update(id: string, data: ContractUpdateData): Promise<ContractWithReceivables | null> {
    if (!ValidationUtils.isValidUUID(id)) {
      throw new ServiceError('Invalid contract ID', 'INVALID_ID', 400)
    }

    // Auto-number if clientName or projectName changed and would create duplicate
    let processedData = { ...data }
    if (data.clientName || data.projectName) {
      const currentContract = await this.findById(id)
      if (currentContract) {
        const clientName = data.clientName || currentContract.clientName
        const projectName = data.projectName || currentContract.projectName

        // Check if combination changed from current values
        const hasChanged =
          (data.clientName && data.clientName !== currentContract.clientName) ||
          (data.projectName && data.projectName !== currentContract.projectName)

        if (hasChanged) {
          // Generate unique project name if this combination would be a duplicate
          const uniqueProjectName = await this.generateUniqueProjectName(
            clientName,
            projectName,
            id // exclude current contract from duplicate check
          )

          // Only update if auto-numbering was needed
          if (uniqueProjectName !== projectName) {
            processedData.projectName = uniqueProjectName
          }
        }
      }
    }

    await this.validateBusinessRules(processedData, id)

    // Process signed date if provided
    const finalData = {
      ...processedData,
      ...(processedData.signedDate && {
        signedDate: createDateForStorage(processedData.signedDate)
      })
    }

    return await super.update(id, finalData as any, {
      receivables: true
    })
  }

  /**
   * Get contracts with receivables
   */
  async findMany(filters: ContractFilters = {}, options: any = {}): Promise<ContractWithReceivables[]> {
    return await super.findMany(filters, options, {
      receivables: true
    })
  }

  /**
   * Get a single contract by ID with receivables
   */
  async findById(id: string): Promise<ContractWithReceivables | null> {
    if (!ValidationUtils.isValidUUID(id)) {
      throw new ServiceError('Invalid contract ID', 'INVALID_ID', 400)
    }

    return await super.findById(id, {
      receivables: true
    })
  }

  /**
   * Get contract summary statistics
   */
  async getSummary(filters: ContractFilters = {}): Promise<ContractSummary> {
    const contracts = await this.findMany(filters)

    const summary: ContractSummary = {
      totalContracts: contracts.length,
      totalValue: contracts.reduce((sum, contract) => sum + contract.totalValue, 0),
      contractsByStatus: {},
      contractsByCategory: {},
      averageContractValue: 0
    }

    // Calculate status distribution
    contracts.forEach(contract => {
      const status = contract.status || 'unknown'
      summary.contractsByStatus[status] = (summary.contractsByStatus[status] || 0) + 1
    })

    // Calculate category distribution
    contracts.forEach(contract => {
      const category = contract.category || 'uncategorized'
      summary.contractsByCategory[category] = (summary.contractsByCategory[category] || 0) + 1
    })

    // Calculate average
    summary.averageContractValue = summary.totalContracts > 0
      ? summary.totalValue / summary.totalContracts
      : 0

    return summary
  }

  /**
   * Get contracts by status
   */
  async findByStatus(status: string, options: any = {}): Promise<ContractWithReceivables[]> {
    return await this.findMany({ status }, options)
  }

  /**
   * Get contracts by category
   */
  async findByCategory(category: string, options: any = {}): Promise<ContractWithReceivables[]> {
    return await this.findMany({ category }, options)
  }

  /**
   * Get contracts by client
   */
  async findByClient(clientName: string, options: any = {}): Promise<ContractWithReceivables[]> {
    return await this.findMany({ clientName }, options)
  }

  /**
   * Search contracts by text
   */
  async search(query: string, options: any = {}): Promise<ContractWithReceivables[]> {
    const contracts = await this.context.teamScopedPrisma.contract.findMany({
      where: {
        OR: [
          { clientName: { contains: query, mode: 'insensitive' } },
          { projectName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: { receivables: true },
      orderBy: this.buildSort(options)
    })

    return contracts
  }

  /**
   * Delete contract (business rule: check for receivables)
   */
  // NOTE: Enhanced delete method is below after getDeletionInfo()

  /**
   * Validate contract can be deleted (utility method)
   */
  async canDelete(id: string): Promise<{ canDelete: boolean; reason?: string }> {
    const contract = await this.findById(id)
    if (!contract) {
      return { canDelete: false, reason: 'Contract not found' }
    }

    if (contract.receivables && contract.receivables.length > 0) {
      return {
        canDelete: false,
        reason: `Contract has ${contract.receivables.length} receivable(s)`
      }
    }

    return { canDelete: true }
  }

  /**
   * Generate a unique project name by adding numbers if duplicates exist
   */
  async generateUniqueProjectName(
    clientName: string,
    projectName: string,
    excludeId?: string
  ): Promise<string> {
    let uniqueName = projectName
    let counter = 1

    while (true) {
      const whereClause: any = {
        clientName,
        projectName: uniqueName
      }

      // Exclude current contract if updating
      if (excludeId) {
        whereClause.NOT = { id: excludeId }
      }

      const existing = await this.context.teamScopedPrisma.contract.findFirst({
        where: whereClause
      })

      if (!existing) {
        return uniqueName // Found unique name
      }

      counter++
      uniqueName = `${projectName} (${counter})`
    }
  }

  /**
   * Get detailed deletion information for a contract
   */
  async getDeletionInfo(id: string): Promise<DeletionInfo> {
    if (!ValidationUtils.isValidUUID(id)) {
      throw new ServiceError('Invalid contract ID', 'INVALID_ID', 400)
    }

    const contract = await this.findById(id)
    if (!contract) {
      return {
        canDelete: false,
        hasReceivables: false,
        receivablesCount: 0,
        receivables: []
      }
    }

    return {
      canDelete: true,
      hasReceivables: contract.receivables.length > 0,
      receivablesCount: contract.receivables.length,
      receivables: contract.receivables.map(r => ({
        id: r.id,
        title: r.description || `Receivable ${r.id.slice(-6)}`, // Use description or fallback
        amount: r.amount,
        expectedDate: r.expectedDate
      }))
    }
  }

  /**
   * Enhanced delete method with user options for handling receivables
   */
  async delete(id: string, options: DeleteOptions = { mode: 'contract-only' }): Promise<boolean> {
    if (!ValidationUtils.isValidUUID(id)) {
      throw new ServiceError('Invalid contract ID', 'INVALID_ID', 400)
    }

    const contract = await this.findById(id)
    if (!contract) {
      return false
    }

    if (options.mode === 'contract-and-receivables') {
      // Delete receivables first, then contract
      await this.context.teamScopedPrisma.receivable.deleteMany({
        where: { contractId: id }
      })
    } else if (options.mode === 'contract-only') {
      // Unlink receivables and inherit project name as clientName for better identification
      await this.context.teamScopedPrisma.receivable.updateMany({
        where: { contractId: id },
        data: {
          contractId: null,
          clientName: contract.projectName // Inherit project name as client/origin identifier
        }
      })
    }

    // Delete the contract
    return await super.delete(id)
  }

  // ===============================
  // BULK OPERATIONS (PHASE 4)
  // ===============================

  /**
   * Bulk create contracts with validation and receivables
   */
  async bulkCreateWithReceivables(
    contractsData: Array<ContractCreateData & { receivables?: Array<any> }>,
    options: import('./BaseService').BulkOptions = {}
  ): Promise<import('./BaseService').BulkOperationResult<ContractWithReceivables>> {
    const result = await this.bulkCreate(contractsData.map(({ receivables, ...contract }) => contract), options)

    // If we had receivables to create, we'd handle them here
    // For now, just return the contracts result
    return result as import('./BaseService').BulkOperationResult<ContractWithReceivables>
  }

  /**
   * Bulk import from CSV/Excel data
   */
  async bulkImport(
    csvData: Array<{
      clientName: string
      projectName: string
      description?: string
      totalValue: string | number
      signedDate: string
      status?: string
      category?: string
      notes?: string
    }>,
    options: import('./BaseService').BulkOptions & { validateDuplicates?: boolean } = {}
  ): Promise<import('./BaseService').BulkOperationResult<ContractWithReceivables>> {
    // Transform and validate CSV data
    const transformedData: any[] = csvData.map((row, index) => {
      try {
        return {
          clientName: row.clientName?.trim(),
          projectName: row.projectName?.trim(),
          description: row.description?.trim() || null,
          totalValue: typeof row.totalValue === 'string'
            ? parseFloat(row.totalValue.replace(/[^\d.-]/g, ''))
            : row.totalValue,
          signedDate: createDateForStorage(row.signedDate),
          status: row.status?.trim() || 'pending',
          category: row.category?.trim() || 'general',
          notes: row.notes?.trim() || null
        }
      } catch (error) {
        throw new ServiceError(
          `Invalid data in row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'INVALID_CSV_DATA',
          400
        )
      }
    })

    // Check for duplicates if requested
    if (options.validateDuplicates) {
      const existingContracts = await this.findMany({})
      const duplicates: string[] = []

      transformedData.forEach((data, index) => {
        const isDuplicate = existingContracts.some(existing =>
          existing.clientName.toLowerCase() === data.clientName.toLowerCase() &&
          existing.projectName.toLowerCase() === data.projectName.toLowerCase()
        )

        if (isDuplicate) {
          duplicates.push(`Row ${index + 1}: ${data.clientName} - ${data.projectName}`)
        }
      })

      if (duplicates.length > 0 && !options.continueOnError) {
        throw new ServiceError(
          `Duplicate contracts found: ${duplicates.join(', ')}`,
          'DUPLICATE_CONTRACTS',
          409
        )
      }
    }

    return await this.bulkCreate(transformedData, options)
  }

  /**
   * Bulk update contract statuses
   */
  async bulkUpdateStatus(
    ids: string[],
    status: string,
    options: import('./BaseService').BulkOptions = {}
  ): Promise<import('./BaseService').BulkOperationResult<ContractWithReceivables>> {
    const updates = ids.map(id => ({
      id,
      data: { status } as ContractUpdateData
    }))

    return await this.bulkUpdate(updates, options)
  }

  /**
   * Bulk update contract categories
   */
  async bulkUpdateCategory(
    ids: string[],
    category: string,
    options: import('./BaseService').BulkOptions = {}
  ): Promise<import('./BaseService').BulkOperationResult<ContractWithReceivables>> {
    const updates = ids.map(id => ({
      id,
      data: { category } as ContractUpdateData
    }))

    return await this.bulkUpdate(updates, options)
  }

  /**
   * Bulk delete with receivables validation
   */
  async bulkDeleteSafe(
    ids: string[],
    options: import('./BaseService').BulkOptions = {}
  ): Promise<import('./BaseService').BulkOperationResult<boolean> & { blockedByReceivables: string[] }> {
    // Check which contracts have receivables
    const contractsWithReceivables: string[] = []
    const safeToDelete: string[] = []

    for (const id of ids) {
      const canDeleteResult = await this.canDelete(id)
      if (canDeleteResult.canDelete) {
        safeToDelete.push(id)
      } else if (canDeleteResult.reason?.includes('receivable')) {
        contractsWithReceivables.push(id)
      }
    }

    // Delete safe contracts
    const deleteResult = await this.bulkDelete(safeToDelete, options)

    return {
      ...deleteResult,
      blockedByReceivables: contractsWithReceivables
    }
  }
}