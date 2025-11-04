/**
 * ReceivableService - Business logic for receivable management
 *
 * Extracts all receivable-related business logic from API routes into a reusable service.
 * Handles both contract-based and standalone receivables with comprehensive validation.
 *
 * Features:
 * - Team-scoped receivable operations
 * - Contract and standalone receivable support
 * - Advanced filtering and status calculation
 * - Audit logging for all mutations
 * - Business rule validation
 */

import { Receivable, Contract } from '@prisma/client'
import { BaseService, ServiceContext, ServiceError, ValidationUtils } from './BaseService'
import { createDateForStorage, getReceivableActualStatus } from '@/lib/utils/date'
import { z } from 'zod'

// Type definitions
export interface ReceivableWithContract extends Receivable {
  contract?: Contract | null
}

export interface ReceivableFilters {
  contractId?: string
  status?: string
  category?: string
  clientName?: string
  overdue?: boolean
  expectedAfter?: string
  expectedBefore?: string
}

export interface ReceivableCreateData {
  contractId?: string | null
  expectedDate: string
  amount: number
  status?: string
  receivedDate?: string | null
  receivedAmount?: number | null
  invoiceNumber?: string | null
  category?: string | null
  notes?: string | null
  // For standalone receivables
  clientName?: string | null
  description?: string | null
}

export interface ReceivableUpdateData {
  expectedDate?: string
  amount?: number
  status?: string
  receivedDate?: string | null
  receivedAmount?: number | null
  invoiceNumber?: string | null
  category?: string | null
  notes?: string | null
  clientName?: string | null
  description?: string | null
}

export interface ReceivableSummary {
  totalReceivables: number
  totalAmount: number
  totalReceived: number
  totalPending: number
  totalOverdue: number
  byStatus: Record<string, { count: number; amount: number }>
  byCategory: Record<string, { count: number; amount: number }>
}

// Validation schema (extracted from API route)
export const ReceivableSchema = z.object({
  contractId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  expectedDate: z.string().min(1, 'Expected date is required'),
  amount: z.number().positive('Amount must be positive'),
  status: z.string().optional(),
  receivedDate: z.string().optional().nullable(),
  receivedAmount: z.number().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  clientName: z.string().optional().nullable().transform(val => val === '' ? null : val),
  description: z.string().optional().nullable().transform(val => val === '' ? null : val),
})

export class ReceivableService extends BaseService<
  ReceivableWithContract,
  ReceivableCreateData,
  ReceivableUpdateData,
  ReceivableFilters
> {
  constructor(context: ServiceContext) {
    super(context, 'receivable', [
      'expectedDate', 'createdAt', 'amount', 'status', 'receivedDate'
    ])
  }

  /**
   * Validate business rules for receivable operations
   */
  async validateBusinessRules(data: ReceivableCreateData | ReceivableUpdateData): Promise<void> {
    // Validate using Zod schema
    if ('expectedDate' in data && 'amount' in data) {
      // This is create data - validate required fields
      ReceivableSchema.parse(data)
    }

    // Business rule: Amount must be positive
    if (data.amount !== undefined) {
      ValidationUtils.validatePositiveNumber(data.amount, 'Amount')
    }

    // Business rule: Received amount cannot exceed expected amount
    if (data.receivedAmount !== undefined && data.amount !== undefined) {
      if ((data.receivedAmount || 0) > data.amount) {
        throw new ServiceError(
          'Received amount cannot exceed expected amount',
          'INVALID_RECEIVED_AMOUNT',
          400
        )
      }
    }

    // Business rule: If contractId is provided, verify it exists and belongs to team
    if ('contractId' in data && data.contractId) {
      const contract = await this.context.teamScopedPrisma.contract.findFirst({
        where: { id: data.contractId as string }
      })

      if (!contract) {
        throw new ServiceError(
          'Contract not found or access denied',
          'CONTRACT_NOT_FOUND',
          404
        )
      }
    }

    // Business rule: For standalone receivables (contractId explicitly null/empty), client name is required
    // Only validate if contractId is being set (not for partial updates that don't touch contractId)
    if ('contractId' in data) {
      const isStandalone = !data.contractId || data.contractId.trim() === ''
      if (isStandalone && !('clientName' in data && data.clientName)) {
        throw new ServiceError(
          'Client name is required for standalone receivables',
          'CLIENT_NAME_REQUIRED',
          400
        )
      }
    }

    // Business rule: Received date cannot be before expected date
    if (data.receivedDate && data.expectedDate) {
      const receivedDate = new Date(data.receivedDate)
      const expectedDate = new Date(data.expectedDate)

      if (receivedDate < expectedDate) {
        throw new ServiceError(
          'Received date cannot be before expected date',
          'INVALID_RECEIVED_DATE',
          400
        )
      }
    }
  }

  /**
   * Build advanced filters for receivable queries
   */
  protected buildFilters(filters: ReceivableFilters): any {
    const where = super.buildFilters(filters)

    // Date range filtering
    if (filters.expectedAfter || filters.expectedBefore) {
      where.expectedDate = {}
      if (filters.expectedAfter) {
        where.expectedDate.gte = new Date(filters.expectedAfter)
      }
      if (filters.expectedBefore) {
        where.expectedDate.lte = new Date(filters.expectedBefore)
      }
    }

    // Overdue filtering - remove the 'overdue' field from where clause first
    if (filters.overdue !== undefined) {
      const { overdue, ...whereWithoutOverdue } = where
      const today = new Date()

      if (filters.overdue) {
        return {
          ...whereWithoutOverdue,
          expectedDate: { lt: today },
          status: { not: 'received' }
        }
      } else {
        return {
          ...whereWithoutOverdue,
          OR: [
            { expectedDate: { gte: today } },
            { status: 'received' }
          ]
        }
      }
    }

    // Client name search for standalone receivables
    if (filters.clientName) {
      where.clientName = {
        contains: filters.clientName,
        mode: 'insensitive'
      }
    }

    return where
  }

  /**
   * Create a new receivable with validation and date processing
   */
  async create(data: ReceivableCreateData): Promise<ReceivableWithContract> {
    await this.validateBusinessRules(data)

    // Process dates
    const processedData: any = {
      ...data,
      // Normalize contractId (for standalone receivables)
      contractId: ValidationUtils.normalizeEmptyString(data.contractId),
      expectedDate: createDateForStorage(data.expectedDate),
      receivedDate: data.receivedDate ? createDateForStorage(data.receivedDate) : null,
      // Normalize empty strings to null
      clientName: ValidationUtils.normalizeEmptyString(data.clientName),
      description: ValidationUtils.normalizeEmptyString(data.description),
      invoiceNumber: ValidationUtils.normalizeEmptyString(data.invoiceNumber),
      category: ValidationUtils.normalizeEmptyString(data.category),
      notes: ValidationUtils.normalizeEmptyString(data.notes)
    }

    // Auto-infer status based on expectedDate if not explicitly provided
    if (!processedData.status) {
      const expectedDate = new Date(processedData.expectedDate)
      expectedDate.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (expectedDate < today) {
        // Past date → received
        processedData.status = 'received'
        processedData.receivedDate = processedData.receivedDate || processedData.expectedDate
        processedData.receivedAmount = processedData.receivedAmount || processedData.amount
      } else {
        // Today or future → pending
        processedData.status = 'pending'
      }
    }

    return await super.create(processedData as any, {
      contract: true
    })
  }

  /**
   * Update a receivable with validation
   */
  async update(id: string, data: ReceivableUpdateData): Promise<ReceivableWithContract | null> {
    if (!ValidationUtils.isValidUUID(id)) {
      throw new ServiceError('Invalid receivable ID', 'INVALID_ID', 400)
    }

    await this.validateBusinessRules(data)

    // Process dates and contractId if provided
    const processedData = {
      ...data,
      // Normalize contractId (for standalone receivables)
      ...(data.contractId !== undefined && {
        contractId: ValidationUtils.normalizeEmptyString(data.contractId)
      }),
      ...(data.expectedDate && {
        expectedDate: createDateForStorage(data.expectedDate)
      }),
      ...(data.receivedDate !== undefined && {
        receivedDate: data.receivedDate && data.receivedDate.trim() !== ''
          ? createDateForStorage(data.receivedDate)
          : null
      }),
      // Normalize empty strings to null
      ...(data.clientName !== undefined && {
        clientName: ValidationUtils.normalizeEmptyString(data.clientName)
      }),
      ...(data.description !== undefined && {
        description: ValidationUtils.normalizeEmptyString(data.description)
      }),
      ...(data.invoiceNumber !== undefined && {
        invoiceNumber: ValidationUtils.normalizeEmptyString(data.invoiceNumber)
      }),
      ...(data.category !== undefined && {
        category: ValidationUtils.normalizeEmptyString(data.category)
      }),
      ...(data.notes !== undefined && {
        notes: ValidationUtils.normalizeEmptyString(data.notes)
      })
    }

    return await super.update(id, processedData as any, {
      contract: true
    })
  }

  /**
   * Get receivables with contracts
   */
  async findMany(filters: ReceivableFilters = {}, options: any = {}): Promise<ReceivableWithContract[]> {
    return await super.findMany(filters, options, {
      contract: true
    })
  }

  /**
   * Get a single receivable by ID with contract
   */
  async findById(id: string): Promise<ReceivableWithContract | null> {
    if (!ValidationUtils.isValidUUID(id)) {
      throw new ServiceError('Invalid receivable ID', 'INVALID_ID', 400)
    }

    return await super.findById(id, {
      contract: true
    })
  }

  /**
   * Get receivables with calculated actual status
   */
  async findManyWithStatus(filters: ReceivableFilters = {}, options: any = {}): Promise<Array<ReceivableWithContract & { actualStatus: string }>> {
    const receivables = await this.findMany(filters, options)

    return receivables.map(receivable => ({
      ...receivable,
      actualStatus: getReceivableActualStatus(receivable)
    }))
  }

  /**
   * Get receivable summary statistics
   */
  async getSummary(filters: ReceivableFilters = {}): Promise<ReceivableSummary> {
    const receivables = await this.findManyWithStatus(filters)

    const summary: ReceivableSummary = {
      totalReceivables: receivables.length,
      totalAmount: receivables.reduce((sum, r) => sum + r.amount, 0),
      totalReceived: receivables.reduce((sum, r) => sum + (r.receivedAmount || 0), 0),
      totalPending: 0,
      totalOverdue: 0,
      byStatus: {},
      byCategory: {}
    }

    // Calculate status-based metrics
    receivables.forEach(receivable => {
      const status = receivable.actualStatus

      // Initialize status tracking
      if (!summary.byStatus[status]) {
        summary.byStatus[status] = { count: 0, amount: 0 }
      }
      summary.byStatus[status].count++
      summary.byStatus[status].amount += receivable.amount

      // Count pending and overdue
      if (status === 'pending') {
        summary.totalPending += receivable.amount
      } else if (status === 'overdue') {
        summary.totalOverdue += receivable.amount
      }

      // Category breakdown
      const category = receivable.category || 'uncategorized'
      if (!summary.byCategory[category]) {
        summary.byCategory[category] = { count: 0, amount: 0 }
      }
      summary.byCategory[category].count++
      summary.byCategory[category].amount += receivable.amount
    })

    return summary
  }

  /**
   * Get overdue receivables
   */
  async findOverdue(options: any = {}): Promise<ReceivableWithContract[]> {
    return await this.findMany({ overdue: true }, options)
  }

  /**
   * Get receivables by contract
   */
  async findByContract(contractId: string, options: any = {}): Promise<ReceivableWithContract[]> {
    return await this.findMany({ contractId }, options)
  }

  /**
   * Get standalone receivables (not linked to contracts)
   */
  async findStandalone(options: any = {}): Promise<ReceivableWithContract[]> {
    const receivables = await this.context.teamScopedPrisma.receivable.findMany({
      where: { contractId: null },
      include: { contract: true },
      orderBy: this.buildSort(options)
    })

    return receivables
  }

  /**
   * Mark receivable as received
   */
  async markAsReceived(id: string, receivedAmount: number, receivedDate?: string): Promise<ReceivableWithContract | null> {
    const receivable = await this.findById(id)
    if (!receivable) {
      throw new ServiceError('Receivable not found', 'NOT_FOUND', 404)
    }

    if (receivedAmount > receivable.amount) {
      throw new ServiceError('Received amount cannot exceed expected amount', 'INVALID_AMOUNT', 400)
    }

    return await this.update(id, {
      status: 'received',
      receivedAmount,
      receivedDate: receivedDate || new Date().toISOString()
    })
  }

  /**
   * Search receivables by text
   */
  async search(query: string, options: any = {}): Promise<ReceivableWithContract[]> {
    const receivables = await this.context.teamScopedPrisma.receivable.findMany({
      where: {
        OR: [
          { clientName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { invoiceNumber: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } },
          { contract: { clientName: { contains: query, mode: 'insensitive' } } },
          { contract: { projectName: { contains: query, mode: 'insensitive' } } }
        ]
      },
      include: { contract: true },
      orderBy: this.buildSort(options)
    })

    return receivables
  }

  // ===============================
  // BULK OPERATIONS (PHASE 4)
  // ===============================

  /**
   * Bulk import receivables from CSV/Excel data
   */
  async bulkImport(
    csvData: Array<{
      clientName: string
      description?: string
      amount: string | number
      dueDate: string
      status?: string
      category?: string
      contractId?: string
      invoiceNumber?: string
      notes?: string
    }>,
    options: import('./BaseService').BulkOptions & { validateContracts?: boolean } = {}
  ): Promise<import('./BaseService').BulkOperationResult<ReceivableWithContract>> {
    // Transform and validate CSV data
    const transformedData: ReceivableCreateData[] = []

    for (let index = 0; index < csvData.length; index++) {
      const row = csvData[index]
      try {
        // Validate contract ID if provided
        if (row.contractId && options.validateContracts) {
          const contractExists = await this.context.teamScopedPrisma.contract.findFirst({
            where: { id: row.contractId }
          })
          if (!contractExists) {
            throw new ServiceError(`Contract ${row.contractId} not found`, 'CONTRACT_NOT_FOUND')
          }
        }

        transformedData.push({
          clientName: row.clientName?.trim(),
          description: row.description?.trim() || null,
          amount: typeof row.amount === 'string'
            ? parseFloat(row.amount.replace(/[^\d.-]/g, ''))
            : row.amount,
          expectedDate: createDateForStorage(row.dueDate), // Map dueDate -> expectedDate
          status: row.status?.trim() || 'pending',
          category: row.category?.trim() || 'general',
          contractId: row.contractId?.trim() || null,
          invoiceNumber: row.invoiceNumber?.trim() || null,
          notes: row.notes?.trim() || null
        } as any)
      } catch (error) {
        throw new ServiceError(
          `Invalid data in row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'INVALID_CSV_DATA',
          400
        )
      }
    }

    const result = await this.bulkCreate(transformedData, options)
    return result as import('./BaseService').BulkOperationResult<ReceivableWithContract>
  }

  /**
   * Bulk mark receivables as received
   */
  async bulkMarkAsReceived(
    receivableUpdates: Array<{
      id: string
      receivedAmount: number
      receivedDate?: string
    }>,
    options: import('./BaseService').BulkOptions = {}
  ): Promise<import('./BaseService').BulkOperationResult<ReceivableWithContract>> {
    // Validate each receivable first
    const updates: import('./BaseService').BulkUpdateItem<ReceivableUpdateData>[] = []

    for (const update of receivableUpdates) {
      const receivable = await this.findById(update.id)
      if (!receivable) {
        if (options.continueOnError) continue
        throw new ServiceError(`Receivable ${update.id} not found`, 'NOT_FOUND', 404)
      }

      if (update.receivedAmount > receivable.amount) {
        if (options.continueOnError) continue
        throw new ServiceError(
          `Received amount ${update.receivedAmount} cannot exceed expected amount ${receivable.amount}`,
          'INVALID_AMOUNT',
          400
        )
      }

      updates.push({
        id: update.id,
        data: {
          status: 'received',
          receivedAmount: update.receivedAmount,
          receivedDate: update.receivedDate || new Date().toISOString()
        }
      })
    }

    return await this.bulkUpdate(updates, options)
  }

  /**
   * Bulk update receivable statuses
   */
  async bulkUpdateStatus(
    ids: string[],
    status: string,
    options: import('./BaseService').BulkOptions = {}
  ): Promise<import('./BaseService').BulkOperationResult<ReceivableWithContract>> {
    const updates = ids.map(id => ({
      id,
      data: { status } as ReceivableUpdateData
    }))

    return await this.bulkUpdate(updates, options)
  }

  /**
   * Bulk update receivable categories
   */
  async bulkUpdateCategory(
    ids: string[],
    category: string,
    options: import('./BaseService').BulkOptions = {}
  ): Promise<import('./BaseService').BulkOperationResult<ReceivableWithContract>> {
    const updates = ids.map(id => ({
      id,
      data: { category } as ReceivableUpdateData
    }))

    return await this.bulkUpdate(updates, options)
  }

  /**
   * Bulk generate receivables from contract
   */
  async bulkGenerateFromContract(
    contractId: string,
    installments: Array<{
      description: string
      amount: number
      dueDate: string
      invoiceNumber?: string
      category?: string
    }>,
    options: import('./BaseService').BulkOptions = {}
  ): Promise<import('./BaseService').BulkOperationResult<ReceivableWithContract>> {
    // Validate contract exists
    const contract = await this.context.teamScopedPrisma.contract.findFirst({
      where: { id: contractId }
    })

    if (!contract) {
      throw new ServiceError('Contract not found', 'CONTRACT_NOT_FOUND', 404)
    }

    // Transform installments to receivables
    const receivablesData: ReceivableCreateData[] = installments.map(installment => ({
      clientName: contract.clientName,
      description: installment.description,
      amount: installment.amount,
      dueDate: createDateForStorage(installment.dueDate),
      status: 'pending',
      category: installment.category || 'contract',
      contractId: contractId,
      invoiceNumber: installment.invoiceNumber || null,
      notes: `Generated from contract: ${contract.projectName}`
    }))

    const result = await this.bulkCreate(receivablesData, options)
    return result as import('./BaseService').BulkOperationResult<ReceivableWithContract>
  }

  /**
   * Bulk delete overdue receivables older than specified days
   */
  async bulkDeleteOverdue(
    olderThanDays: number = 365,
    options: import('./BaseService').BulkOptions = {}
  ): Promise<import('./BaseService').BulkOperationResult<boolean>> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const overdueReceivables = await this.context.teamScopedPrisma.receivable.findMany({
      where: {
        AND: [
          { dueDate: { lt: cutoffDate.toISOString() } },
          { status: { not: 'received' } }
        ]
      },
      select: { id: true }
    })

    const ids = overdueReceivables.map(r => r.id)
    return await this.bulkDelete(ids, options)
  }
}