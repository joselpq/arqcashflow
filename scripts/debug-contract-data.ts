/**
 * Debug contract data to find circular reference
 */

import { createTeamScopedPrisma } from '../lib/middleware/team-context'
import { prisma } from '../lib/prisma'

const mockTeamContext = {
  teamId: 'test-debug-team',
  userEmail: 'debug-test@example.com',
  teamScopedPrisma: createTeamScopedPrisma(prisma, 'test-debug-team'),
  user: {
    id: 'debug-test-user',
    email: 'debug-test@example.com',
    name: 'Debug Test User'
  } as any
}

function checkForCircularReferences(obj: any, seen = new WeakSet(), path = ''): string[] {
  const circularPaths: string[] = []

  if (obj === null || typeof obj !== 'object') {
    return circularPaths
  }

  if (seen.has(obj)) {
    circularPaths.push(path)
    return circularPaths
  }

  seen.add(obj)

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newPath = path ? `${path}.${key}` : key
      circularPaths.push(...checkForCircularReferences(obj[key], seen, newPath))
    }
  }

  return circularPaths
}

async function debugContractData() {
  console.log('🔍 Debugging Contract Data for Circular References\n')

  const contractData = {
    clientName: 'Test Client',
    projectName: 'Test Project',
    description: 'Test description',
    totalValue: 50000,
    signedDate: '2024-01-15',
    status: 'Ativo',
    category: 'Residencial'
  }

  console.log('1. Original contract data:')
  console.log('   Circular refs:', checkForCircularReferences(contractData))

  const dataWithTeamId = { ...contractData, teamId: mockTeamContext.teamId }
  console.log('2. Contract data with teamId:')
  console.log('   Circular refs:', checkForCircularReferences(dataWithTeamId))

  // Simulate transformDatesForPrisma
  const transformed = { ...dataWithTeamId }
  const dateFields = ['signedDate', 'dueDate', 'receivedDate', 'paidDate', 'expectedDate']
  dateFields.forEach(field => {
    if (transformed[field] && typeof transformed[field] === 'string') {
      const dateStr = transformed[field]
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        transformed[field] = new Date(dateStr + 'T15:00:00.000Z')
      }
    }
  })

  console.log('3. Transformed data for Prisma:')
  console.log('   Circular refs:', checkForCircularReferences(transformed))
  console.log('   Data:', JSON.stringify(transformed, null, 2))

  console.log('4. Team-scoped Prisma context:')
  console.log('   Type:', typeof mockTeamContext.teamScopedPrisma)
  console.log('   Circular refs:', checkForCircularReferences(mockTeamContext.teamScopedPrisma))

  console.log('5. Team context object:')
  console.log('   Circular refs:', checkForCircularReferences(mockTeamContext))
}

debugContractData().catch(console.error)