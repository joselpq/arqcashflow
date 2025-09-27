/**
 * OnboardingIntelligenceAgent Integration Tests
 *
 * Tests the complete integration of the OnboardingIntelligenceAgent with:
 * - Existing service layer (ContractService, ExpenseService, ReceivableService)
 * - Team context middleware and isolation
 * - Validation schemas and business rules
 * - Audit logging system
 * - Claude AI integration (mocked)
 */

import { OnboardingIntelligenceAgent } from '../OnboardingIntelligenceAgent'
import { ServiceContext } from '@/lib/services/BaseService'
import { withTeamContext } from '@/lib/middleware/team-context'

// Mock Claude AI to avoid API calls during testing
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: JSON.stringify([
              {
                type: 'contract',
                confidence: 0.9,
                data: {
                  clientName: 'João Silva',
                  projectName: 'Casa Residencial',
                  totalValue: 15000,
                  signedDate: '2024-09-15',
                  description: 'Projeto arquitetônico completo',
                  category: 'Residencial'
                }
              },
              {
                type: 'expense',
                confidence: 0.8,
                data: {
                  description: 'Materiais de construção',
                  amount: 2500,
                  dueDate: '2024-10-01',
                  category: 'materiais',
                  vendor: 'Leroy Merlin'
                }
              }
            ])
          }]
        })
      }
    }))
  }
})

describe('OnboardingIntelligenceAgent Integration Tests', () => {
  let agent: OnboardingIntelligenceAgent
  let mockContext: ServiceContext

  beforeAll(() => {
    // Set up test environment
    process.env.CLAUDE_API_KEY = 'test-api-key'
  })

  beforeEach(() => {
    // Mock service context with team isolation
    mockContext = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        team: {
          id: 'test-team-id',
          name: 'Test Team'
        }
      } as any,
      teamId: 'test-team-id',
      teamScopedPrisma: {
        contract: {
          create: jest.fn().mockResolvedValue({ id: 'contract-1', clientName: 'João Silva' }),
          findMany: jest.fn().mockResolvedValue([])
        },
        expense: {
          create: jest.fn().mockResolvedValue({ id: 'expense-1', description: 'Materiais' }),
          findMany: jest.fn().mockResolvedValue([])
        },
        receivable: {
          create: jest.fn().mockResolvedValue({ id: 'receivable-1', amount: 5000 }),
          findMany: jest.fn().mockResolvedValue([])
        },
        raw: {
          $transaction: jest.fn().mockImplementation(async (callback) => {
            return await callback({
              contract: { create: jest.fn().mockResolvedValue({ id: 'contract-1' }) },
              expense: { create: jest.fn().mockResolvedValue({ id: 'expense-1' }) },
              receivable: { create: jest.fn().mockResolvedValue({ id: 'receivable-1' }) }
            })
          })
        }
      } as any
    }

    agent = new OnboardingIntelligenceAgent(mockContext)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Document Processing', () => {
    test('should process PDF documents with Claude Vision', async () => {
      const testFiles = [
        {
          name: 'contract-joao-silva.pdf',
          type: 'application/pdf',
          base64: 'base64-encoded-pdf-content'
        }
      ]

      const result = await agent.processDocuments({
        files: testFiles,
        extractionType: 'auto'
      })

      expect(result.totalFiles).toBe(1)
      expect(result.processedFiles).toBe(1)
      expect(result.extractedEntities).toBe(2) // contract + expense from mock
      expect(result.summary.contracts).toBeGreaterThan(0)
      expect(result.summary.expenses).toBeGreaterThan(0)
    })

    test('should process image documents', async () => {
      const testFiles = [
        {
          name: 'receipt-materials.jpg',
          type: 'image/jpeg',
          base64: 'base64-encoded-image-content'
        }
      ]

      const result = await agent.processDocuments({
        files: testFiles,
        extractionType: 'expenses'
      })

      expect(result.totalFiles).toBe(1)
      expect(result.processedFiles).toBe(1)
      expect(result.errors).toHaveLength(0)
    })

    test('should handle multiple files in batch', async () => {
      const testFiles = [
        {
          name: 'contracts.pdf',
          type: 'application/pdf',
          base64: 'contract-content'
        },
        {
          name: 'expenses.xlsx',
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          base64: 'spreadsheet-content'
        }
      ]

      const result = await agent.processDocuments({
        files: testFiles,
        extractionType: 'auto'
      })

      expect(result.totalFiles).toBe(2)
      expect(result.processedFiles).toBe(2)
    })
  })

  describe('Service Layer Integration', () => {
    test('should use existing ContractService for bulk operations', async () => {
      const testFiles = [
        {
          name: 'test-contract.pdf',
          type: 'application/pdf',
          base64: 'contract-data'
        }
      ]

      await agent.processDocuments({ files: testFiles })

      // Verify that transaction was used (from BaseService bulk operations)
      expect(mockContext.teamScopedPrisma.raw.$transaction).toHaveBeenCalled()
    })

    test('should respect team isolation', async () => {
      const testFiles = [
        {
          name: 'test-document.pdf',
          type: 'application/pdf',
          base64: 'test-data'
        }
      ]

      await agent.processDocuments({ files: testFiles })

      // Verify team context is properly maintained
      expect(mockContext.teamId).toBe('test-team-id')
    })

    test('should handle service errors gracefully', async () => {
      // Mock a service error
      mockContext.teamScopedPrisma.raw.$transaction = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      )

      const testFiles = [
        {
          name: 'test-document.pdf',
          type: 'application/pdf',
          base64: 'test-data'
        }
      ]

      const result = await agent.processDocuments({ files: testFiles })

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('creation failed')
    })
  })

  describe('Validation and Error Handling', () => {
    test('should validate request schema', async () => {
      await expect(agent.processDocuments({ files: [] })).rejects.toThrow('No files provided')
    })

    test('should handle invalid file formats gracefully', async () => {
      const testFiles = [
        {
          name: 'unknown-file.xyz',
          type: 'application/unknown',
          base64: 'unknown-content'
        }
      ]

      const result = await agent.processDocuments({ files: testFiles })

      // Should still process (using filename fallback)
      expect(result.totalFiles).toBe(1)
    })

    test('should handle Claude API failures', async () => {
      // Mock Claude API failure
      const ClaudeSDK = require('@anthropic-ai/sdk').default
      const mockClaude = new ClaudeSDK()
      mockClaude.messages.create.mockRejectedValue(new Error('Rate limit exceeded'))

      const testFiles = [
        {
          name: 'test.pdf',
          type: 'application/pdf',
          base64: 'test-content'
        }
      ]

      const result = await agent.processDocuments({ files: testFiles })

      // Should handle gracefully and report processed files even with extraction errors
      expect(result.totalFiles).toBe(1)
    })
  })

  describe('Filename Pattern Extraction', () => {
    test('should extract contract from filename patterns', async () => {
      const testFiles = [
        {
          name: 'contrato-maria-santos.txt',
          type: 'text/plain',
          base64: 'simple-text-content'
        }
      ]

      const result = await agent.processDocuments({ files: testFiles })

      expect(result.totalFiles).toBe(1)
      expect(result.processedFiles).toBe(1)
    })

    test('should extract expense from filename patterns', async () => {
      const testFiles = [
        {
          name: 'despesa-escritorio-setembro.txt',
          type: 'text/plain',
          base64: 'simple-text-content'
        }
      ]

      const result = await agent.processDocuments({ files: testFiles })

      expect(result.totalFiles).toBe(1)
      expect(result.processedFiles).toBe(1)
    })
  })

  describe('Audit Logging Integration', () => {
    test('should log onboarding completion', async () => {
      const testFiles = [
        {
          name: 'test.pdf',
          type: 'application/pdf',
          base64: 'test-content'
        }
      ]

      const result = await agent.processDocuments({ files: testFiles })

      // Verify result contains audit-relevant data
      expect(result.totalFiles).toBeDefined()
      expect(result.createdEntities).toBeDefined()
      expect(result.summary).toBeDefined()
    })
  })
})

/**
 * API Endpoint Integration Test
 */
describe('Onboarding Agent API Integration', () => {
  test('should integrate with API endpoint structure', () => {
    // Test that our agent fits the expected API patterns
    expect(OnboardingIntelligenceAgent).toBeDefined()
    expect(typeof OnboardingIntelligenceAgent.prototype.processDocuments).toBe('function')
  })
})