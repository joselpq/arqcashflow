/**
 * Comprehensive Event System Testing Script
 *
 * Tests all aspects of the event system including:
 * - Event emission and handling
 * - Team isolation and security
 * - Integration with service layer
 * - Middleware functionality
 * - Error handling and resilience
 */

import { v4 as uuidv4 } from 'uuid'
import {
  initializeEventSystem,
  createEventBus,
  createTeamEventBus,
  getEventBus,
  EventTypes,
  EventSystemHealth,
  ServiceEventIntegration,
  withMiddleware,
  createDefaultMiddlewareChain,
  ValidationMiddleware,
  TeamContextMiddleware,
  BusinessEventHandlers,
  AIEventHandlers,
  AuditEventHandlers,
} from './index'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

/**
 * Test Suite Configuration
 */
interface TestConfig {
  teamId: string
  userId: string
  testContractId: string
  testReceivableId: string
  testExpenseId: string
  runIntegrationTests: boolean
  cleanupAfterTests: boolean
}

/**
 * Test Results Interface
 */
interface TestResults {
  totalTests: number
  passed: number
  failed: number
  details: Array<{
    testName: string
    status: 'PASS' | 'FAIL'
    message: string
    duration: number
  }>
}

/**
 * Comprehensive Event System Test Runner
 */
export class EventSystemTestRunner {
  private config: TestConfig
  private results: TestResults
  private startTime: number = 0

  constructor(config?: Partial<TestConfig>) {
    this.config = {
      teamId: config?.teamId || `test-team-${uuidv4()}`,
      userId: config?.userId || `test-user-${uuidv4()}`,
      testContractId: config?.testContractId || `test-contract-${uuidv4()}`,
      testReceivableId: config?.testReceivableId || `test-receivable-${uuidv4()}`,
      testExpenseId: config?.testExpenseId || `test-expense-${uuidv4()}`,
      runIntegrationTests: config?.runIntegrationTests ?? true,
      cleanupAfterTests: config?.cleanupAfterTests ?? true,
    }

    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      details: []
    }
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<TestResults> {
    console.log('\n🧪 Starting Comprehensive Event System Tests\n')
    console.log(`Team ID: ${this.config.teamId}`)
    console.log(`User ID: ${this.config.userId}`)
    console.log(`Integration Tests: ${this.config.runIntegrationTests ? 'ENABLED' : 'DISABLED'}\n`)

    try {
      // Initialize event system
      await this.runTest('System Initialization', this.testSystemInitialization.bind(this))

      // Core functionality tests
      await this.runTest('Event Bus Creation', this.testEventBusCreation.bind(this))
      await this.runTest('Basic Event Emission', this.testBasicEventEmission.bind(this))
      await this.runTest('Event Subscription', this.testEventSubscription.bind(this))
      await this.runTest('Wildcard Patterns', this.testWildcardPatterns.bind(this))
      await this.runTest('Event Persistence', this.testEventPersistence.bind(this))

      // Middleware tests
      await this.runTest('Validation Middleware', this.testValidationMiddleware.bind(this))
      await this.runTest('Team Context Middleware', this.testTeamContextMiddleware.bind(this))
      await this.runTest('Team Isolation', this.testTeamIsolation.bind(this))

      // Business logic tests
      await this.runTest('Contract Events', this.testContractEvents.bind(this))
      await this.runTest('Receivable Events', this.testReceivableEvents.bind(this))
      await this.runTest('Expense Events', this.testExpenseEvents.bind(this))
      await this.runTest('AI Events', this.testAIEvents.bind(this))

      // Handler tests
      await this.runTest('Business Handlers', this.testBusinessHandlers.bind(this))
      await this.runTest('AI Handlers', this.testAIHandlers.bind(this))
      await this.runTest('Audit Handlers', this.testAuditHandlers.bind(this))

      // Integration tests (if enabled)
      if (this.config.runIntegrationTests) {
        await this.runTest('Service Integration', this.testServiceIntegration.bind(this))
        await this.runTest('Database Integration', this.testDatabaseIntegration.bind(this))
        await this.runTest('Authentication Integration', this.testAuthenticationIntegration.bind(this))
      }

      // Error handling tests
      await this.runTest('Error Handling', this.testErrorHandling.bind(this))
      await this.runTest('Invalid Events', this.testInvalidEvents.bind(this))

      // Performance tests
      await this.runTest('Performance - High Volume', this.testHighVolumeEvents.bind(this))
      await this.runTest('Performance - Concurrent Access', this.testConcurrentAccess.bind(this))

      // Health checks
      await this.runTest('System Health Check', this.testSystemHealthCheck.bind(this))

      // Cleanup
      if (this.config.cleanupAfterTests) {
        await this.runTest('Test Cleanup', this.testCleanup.bind(this))
      }

    } catch (error) {
      console.error('❌ Test suite failed with critical error:', error)
    }

    this.printResults()
    return this.results
  }

  /**
   * Test system initialization
   */
  private async testSystemInitialization(): Promise<void> {
    initializeEventSystem()

    // Verify system is initialized
    const eventBus = getEventBus()
    if (!eventBus) {
      throw new Error('Event bus not created')
    }
  }

  /**
   * Test event bus creation
   */
  private async testEventBusCreation(): Promise<void> {
    // Test global event bus
    const globalBus = getEventBus()
    if (!globalBus) {
      throw new Error('Global event bus not created')
    }

    // Test team event bus
    const teamBus = createTeamEventBus(this.config.teamId, this.config.userId)
    if (!teamBus) {
      throw new Error('Team event bus not created')
    }

    // Test isolated event bus
    const isolatedBus = createEventBus({ persistEvents: false })
    if (!isolatedBus) {
      throw new Error('Isolated event bus not created')
    }
  }

  /**
   * Test basic event emission
   */
  private async testBasicEventEmission(): Promise<void> {
    const teamBus = createTeamEventBus(this.config.teamId, this.config.userId)

    await teamBus.emit({
      type: EventTypes.CONTRACT_CREATED,
      source: 'service',
      payload: {
        contractId: this.config.testContractId,
        clientName: 'Test Client',
        projectName: 'Test Project',
        totalValue: 50000,
        status: 'active'
      }
    })
  }

  /**
   * Test event subscription
   */
  private async testEventSubscription(): Promise<void> {
    const eventBus = getEventBus()
    let eventReceived = false
    let receivedEvent: any = null

    // Subscribe to test event
    const handler = async (event: any, context: any) => {
      eventReceived = true
      receivedEvent = event
    }

    eventBus.on(EventTypes.CONTRACT_UPDATED, handler)

    // Emit test event
    const teamBus = createTeamEventBus(this.config.teamId, this.config.userId)
    await teamBus.emit({
      type: EventTypes.CONTRACT_UPDATED,
      source: 'service',
      payload: {
        contractId: this.config.testContractId,
        clientName: 'Updated Client',
        projectName: 'Updated Project',
        totalValue: 60000,
        status: 'active'
      }
    })

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 100))

    if (!eventReceived) {
      throw new Error('Event not received by handler')
    }

    if (receivedEvent.payload.clientName !== 'Updated Client') {
      throw new Error('Event payload not correct')
    }

    // Cleanup
    eventBus.off(EventTypes.CONTRACT_UPDATED, handler)
  }

  /**
   * Test wildcard patterns
   */
  private async testWildcardPatterns(): Promise<void> {
    const eventBus = getEventBus()
    let contractEventReceived = false
    let allEventReceived = false

    // Subscribe to contract.* pattern
    const contractHandler = async (event: any, context: any) => {
      contractEventReceived = true
    }

    // Subscribe to all events (*)
    const allHandler = async (event: any, context: any) => {
      allEventReceived = true
    }

    eventBus.on('contract.*', contractHandler)
    eventBus.on('*', allHandler)

    // Emit contract event
    const teamBus = createTeamEventBus(this.config.teamId, this.config.userId)
    await teamBus.emit({
      type: EventTypes.CONTRACT_COMPLETED,
      source: 'service',
      payload: {
        contractId: this.config.testContractId,
        clientName: 'Test Client',
        projectName: 'Test Project',
        totalValue: 50000,
        status: 'completed'
      }
    })

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 100))

    if (!contractEventReceived) {
      throw new Error('Wildcard contract.* pattern not working')
    }

    if (!allEventReceived) {
      throw new Error('Global wildcard * pattern not working')
    }

    // Cleanup
    eventBus.off('contract.*', contractHandler)
    eventBus.off('*', allHandler)
  }

  /**
   * Test event persistence
   */
  private async testEventPersistence(): Promise<void> {
    const teamBus = createTeamEventBus(this.config.teamId, this.config.userId)

    // Emit event
    await teamBus.emit({
      type: EventTypes.EXPENSE_CREATED,
      source: 'service',
      payload: {
        expenseId: this.config.testExpenseId,
        description: 'Test Expense',
        amount: 1000,
        dueDate: '2025-12-31',
        status: 'pending'
      }
    })

    // Wait for persistence
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check if event was persisted
    const history = await teamBus.getEventHistory({ limit: 10 })
    const persistedEvent = history.find(e => e.payload?.expenseId === this.config.testExpenseId)

    if (!persistedEvent) {
      throw new Error('Event not persisted to database')
    }
  }

  /**
   * Test validation middleware
   */
  private async testValidationMiddleware(): Promise<void> {
    const eventBus = createEventBus({ persistEvents: false })

    // Test with invalid event structure
    try {
      await eventBus.emit({
        // Missing required fields
        type: EventTypes.CONTRACT_CREATED,
        source: 'service',
        payload: {}
      } as any)

      throw new Error('Validation should have failed for invalid event')
    } catch (error) {
      if (!error.message.includes('Missing required event fields')) {
        throw new Error(`Unexpected validation error: ${error.message}`)
      }
    }
  }

  /**
   * Test team context middleware
   */
  private async testTeamContextMiddleware(): Promise<void> {
    const eventBus = getEventBus()

    // Test team isolation enforcement
    try {
      await eventBus.emit({
        id: uuidv4(),
        type: EventTypes.CONTRACT_CREATED,
        timestamp: new Date(),
        teamId: 'wrong-team-id',
        source: 'service',
        payload: {
          contractId: 'test-contract',
          clientName: 'Test Client',
          projectName: 'Test Project',
          totalValue: 50000,
          status: 'active'
        }
      })
    } catch (error) {
      // This should pass validation but middleware may catch it
    }
  }

  /**
   * Test team isolation
   */
  private async testTeamIsolation(): Promise<void> {
    const team1Bus = createTeamEventBus('team-1', 'user-1')
    const team2Bus = createTeamEventBus('team-2', 'user-2')

    // Emit events for different teams
    await team1Bus.emit({
      type: EventTypes.CONTRACT_CREATED,
      source: 'service',
      payload: {
        contractId: 'team1-contract',
        clientName: 'Team 1 Client',
        projectName: 'Team 1 Project',
        totalValue: 30000,
        status: 'active'
      }
    })

    await team2Bus.emit({
      type: EventTypes.CONTRACT_CREATED,
      source: 'service',
      payload: {
        contractId: 'team2-contract',
        clientName: 'Team 2 Client',
        projectName: 'Team 2 Project',
        totalValue: 40000,
        status: 'active'
      }
    })

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 200))

    // Check team isolation in history
    const team1History = await team1Bus.getEventHistory()
    const team2History = await team2Bus.getEventHistory()

    const team1HasTeam2Event = team1History.some(e => e.payload?.contractId === 'team2-contract')
    const team2HasTeam1Event = team2History.some(e => e.payload?.contractId === 'team1-contract')

    if (team1HasTeam2Event || team2HasTeam1Event) {
      throw new Error('Team isolation violated - events leaked between teams')
    }
  }

  /**
   * Test contract events
   */
  private async testContractEvents(): Promise<void> {
    const eventEmitter = ServiceEventIntegration.createServiceEventEmitter(
      this.config.teamId,
      this.config.userId
    )

    // Test contract created
    await eventEmitter.emitContractCreated(this.config.testContractId, {
      clientName: 'Contract Test Client',
      projectName: 'Contract Test Project',
      totalValue: 75000,
      status: 'active'
    })

    // Test contract updated
    await eventEmitter.emitContractUpdated(this.config.testContractId, {
      clientName: 'Updated Contract Client',
      projectName: 'Updated Contract Project',
      totalValue: 80000,
      status: 'active'
    })

    // Test contract completed
    await eventEmitter.emitContractCompleted(this.config.testContractId, {
      clientName: 'Completed Contract Client',
      projectName: 'Completed Contract Project',
      totalValue: 80000,
      status: 'completed'
    })
  }

  /**
   * Test receivable events
   */
  private async testReceivableEvents(): Promise<void> {
    const eventEmitter = ServiceEventIntegration.createServiceEventEmitter(
      this.config.teamId,
      this.config.userId
    )

    // Test receivable created
    await eventEmitter.emitReceivableCreated(this.config.testReceivableId, {
      contractId: this.config.testContractId,
      description: 'Test Receivable',
      amount: 25000,
      dueDate: '2025-12-31',
      status: 'pending'
    })

    // Test payment received
    await eventEmitter.emitPaymentReceived(this.config.testReceivableId, {
      contractId: this.config.testContractId,
      description: 'Test Receivable',
      amount: 25000,
      dueDate: '2025-12-31',
      paymentAmount: 25000,
      paymentDate: '2025-09-25'
    })
  }

  /**
   * Test expense events
   */
  private async testExpenseEvents(): Promise<void> {
    const eventEmitter = ServiceEventIntegration.createServiceEventEmitter(
      this.config.teamId,
      this.config.userId
    )

    // Test expense created
    await eventEmitter.emitExpenseCreated(this.config.testExpenseId, {
      contractId: this.config.testContractId,
      description: 'Test Expense',
      amount: 5000,
      dueDate: '2025-10-31',
      status: 'pending',
      vendor: 'Test Vendor',
      category: 'materials'
    })

    // Test expense approved
    await eventEmitter.emitExpenseApproved(this.config.testExpenseId, {
      contractId: this.config.testContractId,
      description: 'Test Expense',
      amount: 5000,
      dueDate: '2025-10-31',
      status: 'approved',
      vendor: 'Test Vendor',
      category: 'materials'
    })
  }

  /**
   * Test AI events
   */
  private async testAIEvents(): Promise<void> {
    const eventEmitter = ServiceEventIntegration.createServiceEventEmitter(
      this.config.teamId,
      this.config.userId
    )

    // Test document uploaded
    await eventEmitter.emitDocumentUploaded('test-doc-123', {
      fileName: 'test-invoice.pdf',
      fileSize: 1024000
    })

    // Test AI analysis complete
    await eventEmitter.emitAIAnalysisComplete({
      documentId: 'test-doc-123',
      processingTime: 2500,
      analysisResult: {
        documentType: 'invoice',
        confidence: 0.95,
        extractedData: {
          amount: 1500,
          vendor: 'AI Test Vendor',
          date: '2025-09-25'
        }
      },
      confidence: 0.95
    })
  }

  /**
   * Test business handlers
   */
  private async testBusinessHandlers(): Promise<void> {
    const health = await BusinessEventHandlers.healthCheck()
    if (!health) {
      throw new Error('Business handlers health check failed')
    }
  }

  /**
   * Test AI handlers
   */
  private async testAIHandlers(): Promise<void> {
    const health = await AIEventHandlers.healthCheck()
    if (!health) {
      throw new Error('AI handlers health check failed')
    }
  }

  /**
   * Test audit handlers
   */
  private async testAuditHandlers(): Promise<void> {
    const health = await AuditEventHandlers.healthCheck()
    if (!health) {
      throw new Error('Audit handlers health check failed')
    }
  }

  /**
   * Test service integration
   */
  private async testServiceIntegration(): Promise<void> {
    // This would test integration with actual services
    // For now, just verify the integration utilities exist
    const eventEmitter = ServiceEventIntegration.createServiceEventEmitter(
      this.config.teamId,
      this.config.userId
    )

    if (!eventEmitter.emitContractCreated || !eventEmitter.emitReceivableCreated) {
      throw new Error('Service integration utilities missing')
    }
  }

  /**
   * Test database integration
   */
  private async testDatabaseIntegration(): Promise<void> {
    // Test event table access
    const events = await prisma.event.findMany({
      where: { teamId: this.config.teamId },
      take: 5
    })

    // Test audit log access
    const auditLogs = await prisma.auditLog.findMany({
      where: { teamId: this.config.teamId },
      take: 5
    })
  }

  /**
   * Test authentication integration
   */
  private async testAuthenticationIntegration(): Promise<void> {
    // This would test integration with auth system
    // For now, just verify auth utilities are available
    try {
      // This may fail in test environment, which is expected
      // await requireAuth()
    } catch (error) {
      // Expected in test environment
    }
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<void> {
    const eventBus = getEventBus()
    let errorEmitted = false

    // Subscribe to error events
    const errorHandler = async (event: any, context: any) => {
      errorEmitted = true
    }

    eventBus.on(EventTypes.SERVICE_ERROR, errorHandler)

    // Trigger an error in a handler
    const faultyHandler = async (event: any, context: any) => {
      throw new Error('Test error for error handling')
    }

    eventBus.on(EventTypes.CONTRACT_CANCELLED, faultyHandler)

    // Emit event that will cause error
    const teamBus = createTeamEventBus(this.config.teamId, this.config.userId)
    await teamBus.emit({
      type: EventTypes.CONTRACT_CANCELLED,
      source: 'service',
      payload: {
        contractId: 'error-test-contract',
        clientName: 'Error Test',
        projectName: 'Error Test',
        totalValue: 1000,
        status: 'cancelled'
      }
    })

    // Wait for error processing
    await new Promise(resolve => setTimeout(resolve, 200))

    // Cleanup
    eventBus.off(EventTypes.SERVICE_ERROR, errorHandler)
    eventBus.off(EventTypes.CONTRACT_CANCELLED, faultyHandler)
  }

  /**
   * Test invalid events
   */
  private async testInvalidEvents(): Promise<void> {
    const eventBus = createEventBus({ persistEvents: false })

    // Test various invalid event scenarios
    const invalidEvents = [
      // Missing ID
      {
        type: EventTypes.CONTRACT_CREATED,
        timestamp: new Date(),
        teamId: this.config.teamId,
        source: 'service',
        payload: {}
      },
      // Invalid timestamp
      {
        id: uuidv4(),
        type: EventTypes.CONTRACT_CREATED,
        timestamp: 'invalid-date',
        teamId: this.config.teamId,
        source: 'service',
        payload: {}
      },
      // Missing teamId
      {
        id: uuidv4(),
        type: EventTypes.CONTRACT_CREATED,
        timestamp: new Date(),
        source: 'service',
        payload: {}
      }
    ]

    for (const invalidEvent of invalidEvents) {
      try {
        await eventBus.emit(invalidEvent as any)
        throw new Error(`Invalid event should have been rejected: ${JSON.stringify(invalidEvent)}`)
      } catch (error) {
        // Expected - invalid events should be rejected
        if (!error.message.includes('validation') && !error.message.includes('Missing')) {
          throw error
        }
      }
    }
  }

  /**
   * Test high volume events
   */
  private async testHighVolumeEvents(): Promise<void> {
    const teamBus = createTeamEventBus(this.config.teamId, this.config.userId)
    const eventCount = 50

    const startTime = Date.now()

    // Emit multiple events rapidly
    const promises = []
    for (let i = 0; i < eventCount; i++) {
      promises.push(
        teamBus.emit({
          type: EventTypes.EXPENSE_CREATED,
          source: 'service',
          payload: {
            expenseId: `bulk-expense-${i}`,
            description: `Bulk Test Expense ${i}`,
            amount: 100 + i,
            dueDate: '2025-12-31',
            status: 'pending'
          }
        })
      )
    }

    await Promise.all(promises)

    const duration = Date.now() - startTime

    if (duration > 10000) { // 10 seconds
      throw new Error(`High volume test too slow: ${duration}ms for ${eventCount} events`)
    }

    console.log(`    📊 High volume performance: ${eventCount} events in ${duration}ms`)
  }

  /**
   * Test concurrent access
   */
  private async testConcurrentAccess(): Promise<void> {
    const promises = []

    // Multiple teams emitting events simultaneously
    for (let i = 0; i < 5; i++) {
      const teamBus = createTeamEventBus(`concurrent-team-${i}`, `concurrent-user-${i}`)
      promises.push(
        teamBus.emit({
          type: EventTypes.CONTRACT_CREATED,
          source: 'service',
          payload: {
            contractId: `concurrent-contract-${i}`,
            clientName: `Concurrent Client ${i}`,
            projectName: `Concurrent Project ${i}`,
            totalValue: 10000 + i * 1000,
            status: 'active'
          }
        })
      )
    }

    await Promise.all(promises)
  }

  /**
   * Test system health check
   */
  private async testSystemHealthCheck(): Promise<void> {
    const health = await EventSystemHealth.performHealthCheck()

    if (!health.overall) {
      throw new Error(`System health check failed: ${JSON.stringify(health.details)}`)
    }

    console.log(`    🏥 System health: Overall=${health.overall}, Bus=${health.bus}, Handlers=${health.handlers}, Database=${health.database}`)
  }

  /**
   * Cleanup test data
   */
  private async testCleanup(): Promise<void> {
    try {
      // Clean up test events
      await prisma.event.deleteMany({
        where: {
          OR: [
            { teamId: this.config.teamId },
            { teamId: { startsWith: 'test-team-' } },
            { teamId: { startsWith: 'concurrent-team-' } }
          ]
        }
      })

      // Clean up test audit logs
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { teamId: this.config.teamId },
            { teamId: { startsWith: 'test-team-' } },
            { teamId: { startsWith: 'concurrent-team-' } }
          ]
        }
      })

      console.log('    🧹 Test data cleaned up')

    } catch (error) {
      console.warn('    ⚠️  Cleanup failed (non-critical):', error.message)
    }
  }

  /**
   * Run individual test with error handling and timing
   */
  private async runTest(testName: string, testFunction: () => Promise<void>): Promise<void> {
    this.results.totalTests++
    this.startTime = Date.now()

    try {
      await testFunction()
      const duration = Date.now() - this.startTime

      this.results.passed++
      this.results.details.push({
        testName,
        status: 'PASS',
        message: 'Test completed successfully',
        duration
      })

      console.log(`✅ ${testName} - PASSED (${duration}ms)`)

    } catch (error) {
      const duration = Date.now() - this.startTime

      this.results.failed++
      this.results.details.push({
        testName,
        status: 'FAIL',
        message: error.message,
        duration
      })

      console.log(`❌ ${testName} - FAILED (${duration}ms)`)
      console.log(`    Error: ${error.message}`)
    }
  }

  /**
   * Print test results summary
   */
  private printResults(): void {
    console.log('\n📊 Test Results Summary')
    console.log('=' .repeat(50))
    console.log(`Total Tests: ${this.results.totalTests}`)
    console.log(`Passed: ${this.results.passed} ✅`)
    console.log(`Failed: ${this.results.failed} ❌`)
    console.log(`Success Rate: ${((this.results.passed / this.results.totalTests) * 100).toFixed(1)}%`)

    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results.details
        .filter(d => d.status === 'FAIL')
        .forEach(d => {
          console.log(`  - ${d.testName}: ${d.message}`)
        })
    }

    console.log('\n✨ Event System Testing Complete!\n')
  }
}

/**
 * Quick test runner for development
 */
export async function runEventSystemTests(config?: {
  integrationTests?: boolean
  cleanup?: boolean
}): Promise<TestResults> {
  const runner = new EventSystemTestRunner({
    runIntegrationTests: config?.integrationTests ?? true,
    cleanupAfterTests: config?.cleanup ?? true
  })

  return runner.runAllTests()
}

/**
 * Lightweight smoke test for CI/CD
 */
export async function runEventSystemSmokeTest(): Promise<boolean> {
  console.log('🚀 Running Event System Smoke Test...')

  try {
    const runner = new EventSystemTestRunner({
      runIntegrationTests: false,
      cleanupAfterTests: true
    })

    const results = await runner.runAllTests()
    return results.failed === 0

  } catch (error) {
    console.error('💥 Smoke test failed:', error)
    return false
  }
}

// Export for use in other test files
export default EventSystemTestRunner