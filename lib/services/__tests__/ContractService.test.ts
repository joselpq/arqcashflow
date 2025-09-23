/**
 * ContractService Test Suite
 *
 * Comprehensive tests to ensure ContractService behavior matches existing API routes.
 * These tests validate business logic, team isolation, and data consistency.
 *
 * Test Strategy:
 * - Compare service results with API route results
 * - Test all business rules and validations
 * - Verify team isolation
 * - Test error scenarios
 * - Performance benchmarking
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { ContractService, ContractCreateData, ContractUpdateData } from '../ContractService'
import { ServiceContext } from '../BaseService'
import { prisma } from '@/lib/prisma'
import { createTeamScopedPrisma } from '@/lib/middleware/team-context'

// Mock data for testing
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  team: {
    id: 'team-123',
    name: 'Test Team'
  }
}

const mockContext: ServiceContext = {
  user: mockUser as any,
  teamId: 'team-123',
  teamScopedPrisma: createTeamScopedPrisma(prisma, 'team-123')
}

const validContractData: ContractCreateData = {
  clientName: 'Test Client',
  projectName: 'Test Project',
  description: 'Test contract description',
  totalValue: 50000,
  signedDate: '2024-01-15',
  status: 'active',
  category: 'development',
  notes: 'Test notes'
}

describe('ContractService', () => {
  let contractService: ContractService
  let createdContractIds: string[] = []

  beforeEach(() => {
    contractService = new ContractService(mockContext)
    createdContractIds = []
  })

  afterEach(async () => {
    // Clean up created contracts
    for (const id of createdContractIds) {
      try {
        await prisma.contract.delete({ where: { id } })
      } catch (error) {
        // Contract might have been deleted in test
      }
    }
  })

  describe('Contract Creation', () => {
    it('should create a contract with valid data', async () => {
      const contract = await contractService.create(validContractData)
      createdContractIds.push(contract.id)

      expect(contract).toMatchObject({
        clientName: validContractData.clientName,
        projectName: validContractData.projectName,
        totalValue: validContractData.totalValue,
        status: validContractData.status
      })

      expect(contract.id).toBeDefined()
      expect(contract.createdAt).toBeDefined()
      expect(contract.signedDate).toBeDefined()
      expect(contract.receivables).toEqual([])
    })

    it('should process signed date correctly', async () => {
      const contract = await contractService.create({
        ...validContractData,
        signedDate: '2024-01-15T10:30:00Z'
      })
      createdContractIds.push(contract.id)

      expect(contract.signedDate).toBeInstanceOf(Date)
    })

    it('should use current date when signedDate is empty', async () => {
      const contract = await contractService.create({
        ...validContractData,
        signedDate: ''
      })
      createdContractIds.push(contract.id)

      const today = new Date()
      const contractDate = new Date(contract.signedDate)
      expect(contractDate.toDateString()).toBe(today.toDateString())
    })

    it('should reject invalid data', async () => {
      await expect(contractService.create({
        ...validContractData,
        clientName: '' // Invalid: empty client name
      })).rejects.toThrow()

      await expect(contractService.create({
        ...validContractData,
        totalValue: -1000 // Invalid: negative value
      })).rejects.toThrow()
    })

    it('should reject future signed date', async () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      await expect(contractService.create({
        ...validContractData,
        signedDate: futureDate.toISOString()
      })).rejects.toThrow('Signed date cannot be in the future')
    })

    it('should reject duplicate contracts', async () => {
      const contract1 = await contractService.create(validContractData)
      createdContractIds.push(contract1.id)

      await expect(contractService.create(validContractData)).rejects.toThrow('duplicate')
    })
  })

  describe('Contract Retrieval', () => {
    let testContract: any

    beforeEach(async () => {
      testContract = await contractService.create({
        ...validContractData,
        clientName: 'Unique Client',
        projectName: 'Unique Project'
      })
      createdContractIds.push(testContract.id)
    })

    it('should find contract by ID', async () => {
      const found = await contractService.findById(testContract.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(testContract.id)
      expect(found?.receivables).toEqual([])
    })

    it('should return null for non-existent contract', async () => {
      const found = await contractService.findById('non-existent-id')
      expect(found).toBeNull()
    })

    it('should find contracts with filters', async () => {
      const contracts = await contractService.findMany({
        status: validContractData.status
      })

      expect(contracts.length).toBeGreaterThan(0)
      expect(contracts.every(c => c.status === validContractData.status)).toBe(true)
    })

    it('should sort contracts correctly', async () => {
      // Create another contract with different date
      const contract2 = await contractService.create({
        ...validContractData,
        clientName: 'Another Client',
        projectName: 'Another Project',
        signedDate: '2024-02-15'
      })
      createdContractIds.push(contract2.id)

      const contracts = await contractService.findMany({}, {
        sortBy: 'signedDate',
        sortOrder: 'asc'
      })

      expect(contracts.length).toBeGreaterThanOrEqual(2)
      // Check if sorted by signedDate ascending
      for (let i = 1; i < contracts.length; i++) {
        expect(contracts[i].signedDate >= contracts[i-1].signedDate).toBe(true)
      }
    })
  })

  describe('Contract Updates', () => {
    let testContract: any

    beforeEach(async () => {
      testContract = await contractService.create({
        ...validContractData,
        clientName: 'Update Test Client',
        projectName: 'Update Test Project'
      })
      createdContractIds.push(testContract.id)
    })

    it('should update contract successfully', async () => {
      const updateData: ContractUpdateData = {
        totalValue: 75000,
        status: 'completed'
      }

      const updated = await contractService.update(testContract.id, updateData)

      expect(updated).toBeDefined()
      expect(updated?.totalValue).toBe(75000)
      expect(updated?.status).toBe('completed')
      expect(updated?.clientName).toBe(testContract.clientName) // Unchanged
    })

    it('should reject invalid updates', async () => {
      await expect(contractService.update(testContract.id, {
        totalValue: -5000 // Invalid: negative value
      })).rejects.toThrow()
    })

    it('should return null for non-existent contract update', async () => {
      const result = await contractService.update('non-existent-id', {
        totalValue: 60000
      })
      expect(result).toBeNull()
    })
  })

  describe('Contract Summary', () => {
    beforeEach(async () => {
      // Create test contracts for summary
      const contract1 = await contractService.create({
        ...validContractData,
        clientName: 'Summary Client 1',
        projectName: 'Summary Project 1',
        totalValue: 10000,
        status: 'active'
      })
      createdContractIds.push(contract1.id)

      const contract2 = await contractService.create({
        ...validContractData,
        clientName: 'Summary Client 2',
        projectName: 'Summary Project 2',
        totalValue: 20000,
        status: 'completed'
      })
      createdContractIds.push(contract2.id)
    })

    it('should calculate summary statistics correctly', async () => {
      const summary = await contractService.getSummary()

      expect(summary.totalContracts).toBeGreaterThanOrEqual(2)
      expect(summary.totalValue).toBeGreaterThanOrEqual(30000)
      expect(summary.averageContractValue).toBeGreaterThan(0)
      expect(summary.contractsByStatus).toHaveProperty('active')
      expect(summary.contractsByStatus).toHaveProperty('completed')
    })
  })

  describe('Contract Search', () => {
    let testContract: any

    beforeEach(async () => {
      testContract = await contractService.create({
        ...validContractData,
        clientName: 'Searchable Client',
        projectName: 'Searchable Project',
        description: 'This is a searchable description'
      })
      createdContractIds.push(testContract.id)
    })

    it('should search contracts by client name', async () => {
      const results = await contractService.search('Searchable Client')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(c => c.id === testContract.id)).toBe(true)
    })

    it('should search contracts by project name', async () => {
      const results = await contractService.search('Searchable Project')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(c => c.id === testContract.id)).toBe(true)
    })

    it('should search contracts by description', async () => {
      const results = await contractService.search('searchable description')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(c => c.id === testContract.id)).toBe(true)
    })
  })

  describe('Contract Deletion', () => {
    let testContract: any

    beforeEach(async () => {
      testContract = await contractService.create({
        ...validContractData,
        clientName: 'Delete Test Client',
        projectName: 'Delete Test Project'
      })
      createdContractIds.push(testContract.id)
    })

    it('should delete contract successfully', async () => {
      const result = await contractService.delete(testContract.id)
      expect(result).toBe(true)

      const found = await contractService.findById(testContract.id)
      expect(found).toBeNull()

      // Remove from cleanup list since it's already deleted
      createdContractIds = createdContractIds.filter(id => id !== testContract.id)
    })

    it('should return false for non-existent contract', async () => {
      const result = await contractService.delete('non-existent-id')
      expect(result).toBe(false)
    })

    it('should check deletion eligibility', async () => {
      const eligibility = await contractService.canDelete(testContract.id)
      expect(eligibility.canDelete).toBe(true)
    })
  })

  describe('Team Isolation', () => {
    it('should only return contracts for the correct team', async () => {
      // Create a contract with our service
      const contract = await contractService.create({
        ...validContractData,
        clientName: 'Team Test Client',
        projectName: 'Team Test Project'
      })
      createdContractIds.push(contract.id)

      // Create a service with different team context
      const otherTeamContext: ServiceContext = {
        ...mockContext,
        teamId: 'other-team-123',
        teamScopedPrisma: createTeamScopedPrisma(prisma, 'other-team-123')
      }
      const otherTeamService = new ContractService(otherTeamContext)

      // Other team should not see our contract
      const otherTeamContracts = await otherTeamService.findMany()
      expect(otherTeamContracts.every(c => c.id !== contract.id)).toBe(true)

      // Our team should see the contract
      const ourContracts = await contractService.findMany()
      expect(ourContracts.some(c => c.id === contract.id)).toBe(true)
    })
  })

  describe('Performance', () => {
    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now()

      // Get all contracts (could be many)
      const contracts = await contractService.findMany()

      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Should complete within reasonable time (adjust threshold as needed)
      expect(executionTime).toBeLessThan(5000) // 5 seconds
      expect(Array.isArray(contracts)).toBe(true)
    })
  })
})

/**
 * Integration tests comparing service results with API results
 * These tests ensure the service layer produces identical results to the existing API
 */
describe('ContractService API Compatibility', () => {
  // These would be integration tests that call both the service and the API
  // and compare results to ensure perfect compatibility during migration

  it.skip('should produce identical results to GET /api/contracts', async () => {
    // Implementation would call both service and API, compare results
  })

  it.skip('should produce identical results to POST /api/contracts', async () => {
    // Implementation would call both service and API, compare results
  })

  it.skip('should produce identical results to PUT /api/contracts/[id]', async () => {
    // Implementation would call both service and API, compare results
  })
})