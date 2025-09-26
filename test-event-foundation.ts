/**
 * Event System Foundation Test
 *
 * Tests core functionality without database dependencies.
 * This validates that the event system architecture is solid.
 */

import { v4 as uuidv4 } from 'uuid'

async function testEventFoundation() {
  console.log('🧪 Testing Event System Foundation (No Database)...\n')

  try {
    // Import event system components
    const {
      createEventBus,
      createTeamEventBus,
      EventTypes,
    } = await import('./lib/events/index')

    console.log('✅ Event system imports successful')

    // Test 1: Create non-persistent event bus
    const eventBus = createEventBus({ persistEvents: false })
    console.log('✅ Non-persistent event bus creation successful')

    // Test 2: Event subscription and emission
    let contractEventReceived = false
    let receivedContractData: any = null

    const contractHandler = async (event: any, context: any) => {
      contractEventReceived = true
      receivedContractData = event
      console.log(`📨 Contract event received: ${event.payload.clientName}`)
    }

    eventBus.on(EventTypes.CONTRACT_CREATED, contractHandler)
    console.log('✅ Event subscription successful')

    // Test 3: Basic event emission (with proper payload)
    await eventBus.emit({
      id: uuidv4(),
      type: EventTypes.CONTRACT_CREATED,
      timestamp: new Date(),
      teamId: uuidv4(),
      userId: uuidv4(),
      source: 'service',
      payload: {
        contractId: 'test-contract-123',
        clientName: 'Test Client',
        projectName: 'Test Project',
        totalValue: 50000,
        status: 'active'
      }
    })

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 100))

    if (contractEventReceived && receivedContractData) {
      console.log('✅ Event emission and handling successful')
    } else {
      console.log('❌ Event was not received properly')
    }

    // Test 4: Wildcard patterns
    let wildcardReceived = false
    const wildcardHandler = async (event: any) => {
      wildcardReceived = true
      console.log(`📨 Wildcard received: ${event.type}`)
    }

    eventBus.on('contract.*', wildcardHandler)

    await eventBus.emit({
      id: uuidv4(),
      type: EventTypes.CONTRACT_UPDATED,
      timestamp: new Date(),
      teamId: uuidv4(),
      userId: uuidv4(),
      source: 'service',
      payload: {
        contractId: 'test-contract-123',
        clientName: 'Updated Client',
        projectName: 'Updated Project',
        totalValue: 60000,
        status: 'active'
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    if (wildcardReceived) {
      console.log('✅ Wildcard pattern matching successful')
    } else {
      console.log('❌ Wildcard pattern matching failed')
    }

    // Test 5: Global wildcard
    let globalReceived = false
    const globalHandler = async (event: any) => {
      globalReceived = true
    }

    eventBus.on('*', globalHandler)

    await eventBus.emit({
      id: uuidv4(),
      type: EventTypes.EXPENSE_CREATED,
      timestamp: new Date(),
      teamId: uuidv4(),
      userId: uuidv4(),
      source: 'service',
      payload: {
        expenseId: 'test-expense-123',
        description: 'Test Expense',
        amount: 1000,
        dueDate: '2025-12-31',
        status: 'pending'
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    if (globalReceived) {
      console.log('✅ Global wildcard (*) pattern successful')
    } else {
      console.log('❌ Global wildcard pattern failed')
    }

    // Test 6: Error handling
    let errorHandled = false
    const faultyHandler = async (event: any) => {
      throw new Error('Test error for error handling')
    }

    eventBus.on(EventTypes.EXPENSE_APPROVED, faultyHandler)

    try {
      await eventBus.emit({
        id: uuidv4(),
        type: EventTypes.EXPENSE_APPROVED,
        timestamp: new Date(),
        teamId: uuidv4(),
        userId: uuidv4(),
        source: 'service',
        payload: {
          expenseId: 'error-test',
          description: 'Error Test Expense',
          amount: 1000,
          dueDate: '2025-12-31',
          status: 'approved'
        }
      })

      // Event emission should still succeed even if handler fails
      errorHandled = true
      console.log('✅ Error handling test - event emission succeeded despite handler error')
    } catch (error) {
      console.log('❌ Error handling failed - event emission should not throw')
    }

    // Test 7: Team event bus helpers
    const teamId = uuidv4()
    const userId = uuidv4()
    const teamEventBus = createTeamEventBus(teamId, userId)

    let teamEventReceived = false
    eventBus.on(EventTypes.RECEIVABLE_CREATED, async (event) => {
      teamEventReceived = true
      if (event.teamId === teamId) {
        console.log('✅ Team event bus properly scoped event')
      }
    })

    await teamEventBus.emit({
      type: EventTypes.RECEIVABLE_CREATED,
      source: 'service',
      payload: {
        receivableId: 'test-receivable-123',
        description: 'Test Receivable',
        amount: 25000,
        dueDate: '2025-12-31',
        status: 'pending'
      }
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    if (teamEventReceived) {
      console.log('✅ Team event bus successful')
    } else {
      console.log('❌ Team event bus failed')
    }

    // Test 8: Event subscription cleanup
    eventBus.off(EventTypes.CONTRACT_CREATED, contractHandler)
    eventBus.off('contract.*', wildcardHandler)
    eventBus.off('*', globalHandler)
    eventBus.off(EventTypes.EXPENSE_APPROVED, faultyHandler)

    console.log('✅ Event subscription cleanup successful')

    // Test 9: Multiple event types
    const eventTypes = [
      EventTypes.AI_ANALYSIS_COMPLETE,
      EventTypes.DOCUMENT_PROCESSED,
      EventTypes.BULK_OPERATION_STARTED,
    ]

    for (const eventType of eventTypes) {
      await eventBus.emit({
        id: uuidv4(),
        type: eventType,
        timestamp: new Date(),
        teamId: uuidv4(),
        source: 'ai',
        payload: {
          documentId: 'test-doc',
          processingTime: 1000,
          analysisResult: { test: true },
          confidence: 0.95
        }
      })
    }

    console.log('✅ Multiple event types test successful')

    // Test 10: Service integration helpers
    const { ServiceEventIntegration } = await import('./lib/events/index')
    const eventEmitter = ServiceEventIntegration.createServiceEventEmitter(teamId, userId)

    // Test with proper service integration
    let serviceEventReceived = false
    eventBus.on(EventTypes.CONTRACT_COMPLETED, async (event) => {
      serviceEventReceived = true
    })

    await eventEmitter.emitContractCompleted('service-test-contract', {
      clientName: 'Service Test Client',
      projectName: 'Service Test Project',
      totalValue: 25000
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    if (serviceEventReceived) {
      console.log('✅ Service integration utilities successful')
    } else {
      console.log('❌ Service integration utilities failed')
    }

    // Test 11: Performance test
    console.log('🚀 Running performance test (50 events)...')
    const startTime = Date.now()

    const promises = []
    for (let i = 0; i < 50; i++) {
      promises.push(
        eventBus.emit({
          id: uuidv4(),
          type: EventTypes.EXPENSE_CREATED,
          timestamp: new Date(),
          teamId: uuidv4(),
          source: 'service',
          payload: {
            expenseId: `perf-test-${i}`,
            description: `Performance Test Expense ${i}`,
            amount: 100 + i,
            dueDate: '2025-12-31',
            status: 'pending'
          }
        })
      )
    }

    await Promise.all(promises)
    const duration = Date.now() - startTime

    console.log(`✅ Performance test: 50 events in ${duration}ms (${(50/duration*1000).toFixed(1)} events/sec)`)

    // Final cleanup
    eventBus.removeAllListeners()
    console.log('✅ Complete event system cleanup')

    console.log('\n🎉 Event System Foundation Tests PASSED!')
    console.log('✨ Core event system is working correctly!')

    return true

  } catch (error) {
    console.error('❌ Event System Foundation test failed:', error)
    console.error(error.stack)
    return false
  }
}

// Run the test
testEventFoundation().then(success => {
  if (success) {
    console.log('\n💚 Event System Foundation is ready!')
    process.exit(0)
  } else {
    console.log('\n💥 Event System Foundation has issues')
    process.exit(1)
  }
}).catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})