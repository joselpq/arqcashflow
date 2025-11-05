/**
 * Delete multiple test users at once
 * Usage: npx tsx scripts/delete-multiple-users.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// List of test user emails to delete
const TEST_USERS_TO_DELETE = [
  // Single letter test users
  'aaa@aaa.com',
  'bbb@bbb.com',
  'ccc@ccc.com',
  'ddd@ddd.com',
  'eee@eee.com',
  'fff@fff.com',
  'ggg@ggg.com',
  'hhh@hhh.com',
  'iii@iii.com',
  'jjj@jjj.com',
  'kkk@kkk.com',
  'lll@lll.com',
  'mmm@mmm.com',
  'nnn@nnn.com',
  'abc@abc.com',
  'def@def.com',
  'ghi@ghi.com',

  // Other test users
  'outro@outro.com',
  'bruno@bruno2.com',
  'bruno@bruno.com',
  'teste5@teste.com.br',
  'teste6@teste.com',
  'teste7@teste.com.br',
  'test1@test.com',
  'test2@test.com',
  'test@example.com',
  'test2@example.com',
  'contract-test@example.com',
  'agent-test@example.com',
]

async function deleteUser(email: string) {
  try {
    // Find user and their team
    const user = await prisma.user.findUnique({
      where: { email },
      include: { team: true }
    })

    if (!user) {
      console.log(`⚠️  User ${email} not found - skipping`)
      return
    }

    const teamId = user.teamId

    if (!teamId) {
      console.log(`⚠️  User ${email} has no team - skipping`)
      return
    }

    // Step 1: Delete audit logs first (foreign key constraint)
    await prisma.auditLog.deleteMany({
      where: { teamId }
    })

    // Step 2: Delete events (foreign key constraint)
    await prisma.event.deleteMany({
      where: { teamId }
    })

    // Step 3: Delete team (cascades to contracts, receivables, expenses, recurring expenses, users)
    await prisma.team.delete({
      where: { id: teamId }
    })

    console.log(`✅ Deleted: ${email} (${user.name})`)
  } catch (error: any) {
    console.error(`❌ Error deleting ${email}:`, error.message)
  }
}

async function main() {
  console.log(`🗑️  Batch deletion starting...`)
  console.log(`📋 Will delete ${TEST_USERS_TO_DELETE.length} test users\n`)

  for (const email of TEST_USERS_TO_DELETE) {
    await deleteUser(email)
  }

  console.log(`\n✨ Batch deletion complete!`)

  // Show remaining users
  const remainingCount = await prisma.user.count()
  console.log(`\n📊 Remaining users in database: ${remainingCount}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
