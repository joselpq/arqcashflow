#!/usr/bin/env npx tsx
/**
 * Test script for OnboardingIntelligenceAgent
 * Tests document processing with sample files
 */

import fs from 'fs'
import path from 'path'
import { OnboardingIntelligenceAgent } from './lib/agents/OnboardingIntelligenceAgent'
import { PrismaClient } from '@prisma/client'
import { createTeamScopedPrisma } from './lib/middleware/team-context'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Prisma
const prisma = new PrismaClient()

// Test configuration
const TEST_BASE_URL = 'http://localhost:3010'
const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'Test123456!'

// Sample files to test
const SAMPLE_FILES = [
  { name: 'sample_data.csv', path: './sample_data.csv' },
  { name: 'Testando.xlsx', path: './Testando.xlsx' },
  { name: 'teste_pdf.pdf', path: './teste_pdf.pdf' }
]

/**
 * Convert file to base64 and detect MIME type
 */
function fileToBase64(filePath: string): { base64: string; type: string } {
  const fileBuffer = fs.readFileSync(filePath)
  const base64 = fileBuffer.toString('base64')

  // Detect MIME type based on extension
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.csv': 'text/csv',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg'
  }

  return {
    base64,
    type: mimeTypes[ext] || 'application/octet-stream'
  }
}

/**
 * Test OnboardingIntelligenceAgent directly (without API)
 */
async function testAgentDirectly() {
  console.log('\n=== Testing OnboardingIntelligenceAgent Directly ===\n')

  try {
    // Get a test user and team
    const testUser = await prisma.user.findFirst({
      where: { email: TEST_EMAIL },
      include: { team: true }
    })

    if (!testUser || !testUser.team) {
      console.error('❌ Test user not found. Please run: npm run setup:test')
      return
    }

    const teamId = testUser.team.id
    const userId = testUser.id

    console.log(`✅ Using test team: ${teamId}`)
    console.log(`✅ Using test user: ${userId}\n`)

    // Create team-scoped Prisma client
    const teamScopedPrisma = createTeamScopedPrisma(teamId)

    // Create agent instance with context
    const agent = new OnboardingIntelligenceAgent({
      teamId,
      userId,
      userEmail: testUser.email,
      teamScopedPrisma
    })

    // Test each sample file individually
    for (const sampleFile of SAMPLE_FILES) {
      console.log(`\n📄 Testing file: ${sampleFile.name}`)
      console.log('=' .repeat(50))

      try {
        // Check if file exists
        if (!fs.existsSync(sampleFile.path)) {
          console.log(`⚠️ File not found: ${sampleFile.path}`)
          continue
        }

        // Convert file to base64
        const { base64, type } = fileToBase64(sampleFile.path)
        console.log(`📊 File type: ${type}`)
        console.log(`📏 File size: ${(base64.length / 1024).toFixed(2)} KB (base64)`)

        // Process document
        const result = await agent.processDocuments({
          files: [{
            name: sampleFile.name,
            type,
            base64,
            size: base64.length
          }],
          extractionType: 'auto',
          userGuidance: 'Extract all financial entities from this document'
        })

        // Display results
        console.log('\n📊 Extraction Results:')
        console.log(`- Total files: ${result.totalFiles}`)
        console.log(`- Processed files: ${result.processedFiles}`)
        console.log(`- Extracted entities: ${result.extractedEntities}`)
        console.log(`- Created entities: ${result.createdEntities}`)

        if (result.summary) {
          console.log('\n📈 Entity Breakdown:')
          console.log(`- Contracts: ${result.summary.contracts}`)
          console.log(`- Expenses: ${result.summary.expenses}`)
          console.log(`- Receivables: ${result.summary.receivables}`)
        }

        if (result.errors && result.errors.length > 0) {
          console.log('\n❌ Errors:')
          result.errors.forEach(error => console.log(`  - ${error}`))
        }

        if (result.clarificationRequests && result.clarificationRequests.length > 0) {
          console.log('\n❓ Clarification Requests:')
          result.clarificationRequests.forEach(req => {
            console.log(`  - ${req.fileName}: ${req.field} - ${req.question}`)
          })
        }

      } catch (error) {
        console.error(`❌ Error processing ${sampleFile.name}:`, error)
      }
    }

    // Test all files together
    console.log('\n\n📦 Testing All Files Together')
    console.log('=' .repeat(50))

    const allFiles = SAMPLE_FILES
      .filter(f => fs.existsSync(f.path))
      .map(f => {
        const { base64, type } = fileToBase64(f.path)
        return {
          name: f.name,
          type,
          base64,
          size: base64.length
        }
      })

    if (allFiles.length > 0) {
      const combinedResult = await agent.processDocuments({
        files: allFiles,
        extractionType: 'auto',
        userGuidance: 'Extract all financial entities from these documents'
      })

      console.log('\n📊 Combined Extraction Results:')
      console.log(`- Total files: ${combinedResult.totalFiles}`)
      console.log(`- Processed files: ${combinedResult.processedFiles}`)
      console.log(`- Extracted entities: ${combinedResult.extractedEntities}`)
      console.log(`- Created entities: ${combinedResult.createdEntities}`)

      if (combinedResult.summary) {
        console.log('\n📈 Total Entity Breakdown:')
        console.log(`- Contracts: ${combinedResult.summary.contracts}`)
        console.log(`- Expenses: ${combinedResult.summary.expenses}`)
        console.log(`- Receivables: ${combinedResult.summary.receivables}`)
      }

      if (combinedResult.errors && combinedResult.errors.length > 0) {
        console.log('\n❌ Combined Errors:')
        combinedResult.errors.forEach(error => console.log(`  - ${error}`))
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('🤖 OnboardingIntelligenceAgent Test Suite')
  console.log('=' .repeat(50))

  // Check for Claude API key
  if (!process.env.CLAUDE_API_KEY) {
    console.error('❌ CLAUDE_API_KEY not found in environment variables')
    console.error('Please add it to your .env file')
    process.exit(1)
  }

  console.log('✅ Claude API key found')

  // Run direct agent tests
  await testAgentDirectly()

  console.log('\n✅ All tests completed!')
}

// Run tests
main().catch(console.error)