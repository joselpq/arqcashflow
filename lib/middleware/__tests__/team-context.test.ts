/**
 * Team Context Middleware Tests
 *
 * CRITICAL: These tests ensure the middleware doesn't break existing functionality
 * All tests must pass before any API route migration
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import {
  withTeamContext,
  teamContextResponse,
  validateTeamContextEquivalence,
  type TeamContext
} from '../team-context'

// Mock dependencies
jest.mock('@/lib/auth-utils')
jest.mock('@/lib/prisma')

const mockRequireAuth = jest.fn()
const mockPrisma = {
  contract: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  receivable: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  expense: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  }
}

// Setup mocks
beforeEach(() => {
  jest.clearAllMocks()

  // Mock requireAuth to return test data
  mockRequireAuth.mockResolvedValue({
    user: {
      id: 'user-123',
      email: 'test@example.com',
      teamId: 'team-456',
      team: { id: 'team-456', name: 'Test Team' }
    },
    teamId: 'team-456'
  })

  // Reset prisma mocks
  Object.values(mockPrisma).forEach(entity => {
    Object.values(entity).forEach(method => {
      (method as jest.Mock).mockReset()
    })
  })
})

// Import after mocks are set up
const { requireAuth } = require('@/lib/auth-utils')
const { prisma } = require('@/lib/prisma')

// Apply mocks
Object.assign(requireAuth, mockRequireAuth)
Object.assign(prisma, mockPrisma)

describe('Team Context Middleware', () => {
  describe('withTeamContext', () => {
    it('should call requireAuth and pass context to handler', async () => {
      const handler = jest.fn().mockResolvedValue({ success: true })

      await withTeamContext(handler)

      expect(mockRequireAuth).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com',
          teamId: 'team-456'
        }),
        teamId: 'team-456',
        teamScopedPrisma: expect.objectContaining({
          contract: expect.any(Object),
          receivable: expect.any(Object),
          expense: expect.any(Object),
          raw: mockPrisma
        })
      })
    })

    it('should propagate auth errors unchanged', async () => {
      const authError = new Error('Unauthorized')
      mockRequireAuth.mockRejectedValue(authError)

      const handler = jest.fn()

      await expect(withTeamContext(handler)).rejects.toThrow('Unauthorized')
      expect(handler).not.toHaveBeenCalled()
    })

    it('should propagate handler errors', async () => {
      const handlerError = new Error('Handler failed')
      const handler = jest.fn().mockRejectedValue(handlerError)

      await expect(withTeamContext(handler)).rejects.toThrow('Handler failed')
    })
  })

  describe('Team Scoped Prisma Client', () => {
    let context: TeamContext

    beforeEach(async () => {
      context = await new Promise((resolve) => {
        withTeamContext(resolve)
      })
    })

    describe('findMany operations', () => {
      it('should automatically add teamId to where clause', async () => {
        mockPrisma.contract.findMany.mockResolvedValue([])

        await context.teamScopedPrisma.contract.findMany({
          where: { status: 'active' }
        })

        expect(mockPrisma.contract.findMany).toHaveBeenCalledWith({
          where: {
            status: 'active',
            teamId: 'team-456'
          }
        })
      })

      it('should add teamId when no where clause provided', async () => {
        mockPrisma.contract.findMany.mockResolvedValue([])

        await context.teamScopedPrisma.contract.findMany()

        expect(mockPrisma.contract.findMany).toHaveBeenCalledWith({
          where: { teamId: 'team-456' }
        })
      })

      it('should preserve other query options', async () => {
        mockPrisma.contract.findMany.mockResolvedValue([])

        await context.teamScopedPrisma.contract.findMany({
          where: { status: 'active' },
          include: { receivables: true },
          orderBy: { createdAt: 'desc' }
        })

        expect(mockPrisma.contract.findMany).toHaveBeenCalledWith({
          where: {
            status: 'active',
            teamId: 'team-456'
          },
          include: { receivables: true },
          orderBy: { createdAt: 'desc' }
        })
      })
    })

    describe('create operations', () => {
      it('should automatically add teamId to data', async () => {
        mockPrisma.contract.create.mockResolvedValue({ id: 'contract-123' })

        await context.teamScopedPrisma.contract.create({
          data: {
            clientName: 'Test Client',
            projectName: 'Test Project',
            totalValue: 10000
          }
        })

        expect(mockPrisma.contract.create).toHaveBeenCalledWith({
          data: {
            clientName: 'Test Client',
            projectName: 'Test Project',
            totalValue: 10000,
            teamId: 'team-456'
          }
        })
      })

      it('should preserve existing teamId in data (security)', async () => {
        mockPrisma.contract.create.mockResolvedValue({ id: 'contract-123' })

        // This simulates a potential security issue - someone trying to create
        // a record for a different team. Our middleware should override this.
        await context.teamScopedPrisma.contract.create({
          data: {
            clientName: 'Test Client',
            teamId: 'malicious-team-id' // This should be overridden
          }
        })

        expect(mockPrisma.contract.create).toHaveBeenCalledWith({
          data: {
            clientName: 'Test Client',
            teamId: 'team-456' // Should be overridden with correct teamId
          }
        })
      })
    })

    describe('update operations', () => {
      it('should automatically add teamId to where clause', async () => {
        mockPrisma.contract.update.mockResolvedValue({ id: 'contract-123' })

        await context.teamScopedPrisma.contract.update({
          where: { id: 'contract-123' },
          data: { status: 'completed' }
        })

        expect(mockPrisma.contract.update).toHaveBeenCalledWith({
          where: {
            id: 'contract-123',
            teamId: 'team-456'
          },
          data: { status: 'completed' }
        })
      })
    })

    describe('delete operations', () => {
      it('should automatically add teamId to where clause', async () => {
        mockPrisma.contract.delete.mockResolvedValue({ id: 'contract-123' })

        await context.teamScopedPrisma.contract.delete({
          where: { id: 'contract-123' }
        })

        expect(mockPrisma.contract.delete).toHaveBeenCalledWith({
          where: {
            id: 'contract-123',
            teamId: 'team-456'
          }
        })
      })
    })

    describe('raw prisma access', () => {
      it('should provide access to original prisma client', () => {
        expect(context.teamScopedPrisma.raw).toBe(mockPrisma)
      })
    })

    describe('all entity types', () => {
      const entities = ['contract', 'receivable', 'expense'] as const

      entities.forEach(entity => {
        it(`should work for ${entity} entity`, async () => {
          const mockEntity = mockPrisma[entity]
          mockEntity.findMany.mockResolvedValue([])

          await context.teamScopedPrisma[entity].findMany({
            where: { status: 'active' }
          })

          expect(mockEntity.findMany).toHaveBeenCalledWith({
            where: {
              status: 'active',
              teamId: 'team-456'
            }
          })
        })
      })
    })
  })

  describe('teamContextResponse', () => {
    it('should return JSON response for successful handler', async () => {
      const handler = jest.fn().mockResolvedValue({ data: 'test' })
      const responseHandler = teamContextResponse(handler)

      const response = await responseHandler()
      const data = await response.json()

      expect(data).toEqual({ data: 'test' })
      expect(response.status).toBe(200)
    })

    it('should return 401 for unauthorized errors', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'))
      const handler = jest.fn()
      const responseHandler = teamContextResponse(handler)

      const response = await responseHandler()
      const data = await response.json()

      expect(data).toEqual({ error: 'Unauthorized' })
      expect(response.status).toBe(401)
    })

    it('should return 500 for other errors', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Database error'))
      const responseHandler = teamContextResponse(handler)

      const response = await responseHandler()
      const data = await response.json()

      expect(data).toEqual({ error: 'Internal server error' })
      expect(response.status).toBe(500)
    })
  })

  describe('validateTeamContextEquivalence', () => {
    it('should detect when old and new approaches produce same results', async () => {
      const testData = [{ id: 'contract-1', name: 'Test' }]

      const oldQuery = jest.fn().mockResolvedValue(testData)
      const newQuery = jest.fn().mockResolvedValue(testData)

      const result = await validateTeamContextEquivalence(
        'team-456',
        oldQuery,
        newQuery
      )

      expect(result.matches).toBe(true)
      expect(result.oldResult).toEqual(testData)
      expect(result.newResult).toEqual(testData)
    })

    it('should detect when results differ', async () => {
      const oldData = [{ id: 'contract-1', name: 'Old' }]
      const newData = [{ id: 'contract-1', name: 'New' }]

      const oldQuery = jest.fn().mockResolvedValue(oldData)
      const newQuery = jest.fn().mockResolvedValue(newData)

      const result = await validateTeamContextEquivalence(
        'team-456',
        oldQuery,
        newQuery
      )

      expect(result.matches).toBe(false)
      expect(result.oldResult).toEqual(oldData)
      expect(result.newResult).toEqual(newData)
    })
  })
})

/**
 * Integration Tests
 * These tests validate the middleware against real-world usage patterns
 */
describe('Team Context Integration', () => {
  // Mock a typical API route pattern
  const simulateContractApiRoute = async (useMiddleware: boolean) => {
    if (useMiddleware) {
      return withTeamContext(async ({ teamScopedPrisma }) => {
        return await teamScopedPrisma.contract.findMany({
          where: { status: 'active' },
          include: { receivables: true }
        })
      })
    } else {
      // Old pattern
      const { teamId } = await requireAuth()
      return await prisma.contract.findMany({
        where: { teamId, status: 'active' },
        include: { receivables: true }
      })
    }
  }

  it('should produce identical results for old vs new pattern', async () => {
    const testContracts = [
      { id: 'contract-1', status: 'active', receivables: [] }
    ]
    mockPrisma.contract.findMany.mockResolvedValue(testContracts)

    const oldResult = await simulateContractApiRoute(false)
    const newResult = await simulateContractApiRoute(true)

    expect(oldResult).toEqual(newResult)

    // Verify both called prisma with equivalent arguments
    expect(mockPrisma.contract.findMany).toHaveBeenCalledTimes(2)

    const [oldCall, newCall] = mockPrisma.contract.findMany.mock.calls
    expect(oldCall[0]).toEqual(newCall[0])
  })
})

export {}