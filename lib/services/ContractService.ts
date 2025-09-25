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
import { createDateForStorage } from '@/lib/date-utils'
import { z } from 'zod'

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

// Validation schema (extracted from API route)
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
  async validateBusinessRules(data: ContractCreateData | ContractUpdateData): Promise<void> {
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
      const existing = await this.context.teamScopedPrisma.contract.findFirst({
        where: {
          clientName: data.clientName,
          projectName: data.projectName
        }
      })

      if (existing) {
        throw new ServiceError(
          'A contract with this client and project name already exists',
          'DUPLICATE_CONTRACT',
          409
        )
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
    await this.validateBusinessRules(data)

    // Process signed date
    const processedData = {
      ...data,
      signedDate: data.signedDate && data.signedDate.trim() !== ''
        ? createDateForStorage(data.signedDate)
        : new Date()
    }

    return await super.create(processedData, {
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

    await this.validateBusinessRules(data)

    // Process signed date if provided
    const processedData = {
      ...data,
      ...(data.signedDate && {
        signedDate: createDateForStorage(data.signedDate)
      })
    }

    return await super.update(id, processedData, {
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
  async delete(id: string): Promise<boolean> {
    if (!ValidationUtils.isValidUUID(id)) {
      throw new ServiceError('Invalid contract ID', 'INVALID_ID', 400)
    }

    // Business rule: Check if contract has receivables
    const contract = await this.findById(id)
    if (!contract) {
      return false
    }

    if (contract.receivables && contract.receivables.length > 0) {
      throw new ServiceError(
        'Cannot delete contract with existing receivables. Delete receivables first.',
        'HAS_RECEIVABLES',
        409
      )
    }

    return await super.delete(id)
  }

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
    const transformedData: ContractCreateData[] = csvData.map((row, index) => {
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