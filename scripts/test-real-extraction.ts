/**
 * Test actual entity extraction from sample files
 * Direct test of OnboardingIntelligenceAgent without API server
 */

import { readFileSync } from 'fs'
import { OnboardingIntelligenceAgent } from '../lib/agents/OnboardingIntelligenceAgent'
import { prisma } from '../lib/prisma'
import { createTeamScopedPrisma } from '../lib/middleware/team-context'

// Proper team context for testing (matching ContractService.test.ts)
const mockTeamContext = {
  teamId: 'test-team-direct-agent',
  userEmail: 'agent-test@example.com',
  teamScopedPrisma: createTeamScopedPrisma('test-team-direct-agent'),
  user: {
    id: 'agent-test-user-123',
    email: 'agent-test@example.com',
    name: 'Agent Test User'
  } as any,
  req: null as any,
  res: null as any
}

async function testRealExtraction() {
  console.log('🧪 Testing Real Entity Extraction from Sample Files\n')

  try {
    // Ensure test team exists in database
    await prisma.team.upsert({
      where: { id: mockTeamContext.teamId },
      update: {},
      create: {
        id: mockTeamContext.teamId,
        name: 'Test Team for Agent Testing'
      }
    })

    // Ensure test user exists in database
    await prisma.user.upsert({
      where: { id: mockTeamContext.user.id },
      update: {},
      create: {
        id: mockTeamContext.user.id,
        email: mockTeamContext.user.email,
        name: mockTeamContext.user.name,
        teamId: mockTeamContext.teamId,
        password: 'test-password-hash' // Not used in this test
      }
    })

    console.log('✅ Test team and user created/verified\n')

    // Initialize agent
    const agent = new OnboardingIntelligenceAgent(mockTeamContext)

    // Test 1: CSV file
    console.log('📄 Testing CSV file extraction...')
    const csvData = readFileSync('./sample_data.csv', 'utf-8')
    const csvBase64 = Buffer.from(csvData).toString('base64')

    const csvResult = await agent.processDocuments({
      files: [{
        name: 'sample_data.csv',
        type: 'text/csv',
        base64: csvBase64
      }],
      extractionType: 'auto'
    })

    console.log(`✅ CSV Results:`)
    console.log(`   📊 Total Files: ${csvResult.totalFiles}`)
    console.log(`   📊 Processed Files: ${csvResult.processedFiles}`)
    console.log(`   📊 Extracted Entities: ${csvResult.extractedEntities}`)
    console.log(`   📊 Created Entities: ${csvResult.createdEntities}`)
    console.log(`   📊 Breakdown:`)
    console.log(`      - Contracts: ${csvResult.summary.contracts}`)
    console.log(`      - Expenses: ${csvResult.summary.expenses}`)
    console.log(`      - Receivables: ${csvResult.summary.receivables}`)

    if (csvResult.errors.length > 0) {
      console.log(`   ❌ Errors:`)
      csvResult.errors.forEach(error => console.log(`      - ${error}`))
    }

    // Expected from sample_data.csv:
    // - 4 contracts (lines 2-5)
    // - 4 receivables (lines 6-9)
    // - 8 expenses (lines 10-16)
    console.log(`\n📋 Expected from CSV: 4 contracts, 4 receivables, 8 expenses (16 total)`)
    console.log(`📋 Actually extracted: ${csvResult.extractedEntities} entities`)
    console.log(`📋 Successfully created: ${csvResult.createdEntities} entities`)

    // Analyze success rate
    const expectedTotal = 16
    const extractionRate = (csvResult.extractedEntities / expectedTotal * 100).toFixed(1)
    const creationRate = (csvResult.createdEntities / csvResult.extractedEntities * 100).toFixed(1)

    console.log(`\n📈 Metrics:`)
    console.log(`   - Extraction Rate: ${extractionRate}% (${csvResult.extractedEntities}/${expectedTotal})`)
    console.log(`   - Creation Success Rate: ${creationRate}% (${csvResult.createdEntities}/${csvResult.extractedEntities})`)

    if (csvResult.extractedEntities === expectedTotal) {
      console.log(`   🎯 PERFECT EXTRACTION! All entities found.`)
    } else if (csvResult.extractedEntities >= expectedTotal * 0.8) {
      console.log(`   ✅ GOOD EXTRACTION! Most entities found.`)
    } else {
      console.log(`   ⚠️  LOW EXTRACTION! Need to investigate.`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    // Clean up test data
    try {
      await prisma.contract.deleteMany({ where: { teamId: mockTeamContext.teamId } })
      await prisma.expense.deleteMany({ where: { teamId: mockTeamContext.teamId } })
      await prisma.receivable.deleteMany({ where: { teamId: mockTeamContext.teamId } })
      await prisma.user.deleteMany({ where: { id: mockTeamContext.user.id } })
      await prisma.team.deleteMany({ where: { id: mockTeamContext.teamId } })
      console.log('\n🧹 Cleaned up test data')
    } catch (cleanupError) {
      console.error('⚠️  Cleanup failed:', cleanupError)
    }

    await prisma.$disconnect()
  }
}

// Run the test
testRealExtraction().catch(console.error)