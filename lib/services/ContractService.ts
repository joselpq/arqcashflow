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
   */
  async validateBusinessRules(data: ContractCreateData | ContractUpdateData): Promise<void> {
    // Validate using Zod schema
    if ('clientName' in data && 'projectName' in data) {
      // This is create data - validate all required fields
      ContractSchema.parse(data)
    }

    // Business rule: Total value must be positive
    if (data.totalValue !== undefined) {
      ValidationUtils.validatePositiveNumber(data.totalValue, 'Total value')
    }

    // Business rule: Signed date cannot be in the future
    if (data.signedDate) {
      const signedDate = new Date(data.signedDate)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today

      if (signedDate > today) {
        throw new ServiceError(
          'Signed date cannot be in the future',
          'INVALID_SIGNED_DATE',
          400
        )
      }
    }

    // Business rule: Check for duplicate contracts (same client + project)
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
}