/**
 * Script to delete test user and their team (pre-launch cleanup)
 *
 * Usage: npx tsx scripts/delete-test-user.ts <email>
 * Example: npx tsx scripts/delete-test-user.ts pmelardi@gmail.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteUserTeam(email: string) {
  try {
    console.log(`\n🔍 Looking up user: ${email}`)

    // Step 1: Find user and their team
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        teamId: true,
        createdAt: true,
        team: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                users: true,
                contracts: true,
                receivables: true,
                expenses: true,
                recurringExpenses: true,
                auditLogs: true,
                events: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      console.log(`❌ User not found: ${email}`)
      return
    }

    console.log(`\n✅ Found user:`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Name: ${user.name || 'N/A'}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Created: ${user.createdAt.toISOString().split('T')[0]}`)

    console.log(`\n📦 Team: ${user.team.name} (${user.teamId})`)
    console.log(`   Users: ${user.team._count.users}`)
    console.log(`   Contracts: ${user.team._count.contracts}`)
    console.log(`   Receivables: ${user.team._count.receivables}`)
    console.log(`   Expenses: ${user.team._count.expenses}`)
    console.log(`   Recurring Expenses: ${user.team._count.recurringExpenses}`)
    console.log(`   Audit Logs: ${user.team._count.auditLogs}`)
    console.log(`   Events: ${user.team._count.events}`)

    const totalEntities =
      user.team._count.users +
      user.team._count.contracts +
      user.team._count.receivables +
      user.team._count.expenses +
      user.team._count.recurringExpenses +
      user.team._count.auditLogs +
      user.team._count.events

    console.log(`\n⚠️  TOTAL ENTITIES TO BE DELETED: ${totalEntities}`)

    // Step 2: Confirm deletion
    console.log(`\n🗑️  Deleting team "${user.team.name}" (${user.teamId})...`)
    console.log(`   This will cascade delete ALL data including the user.`)

    // Step 3: Delete team (cascades to everything)
    const deletedTeam = await prisma.team.delete({
      where: { id: user.teamId }
    })

    console.log(`\n✅ Team deleted successfully: ${deletedTeam.id}`)
    console.log(`   User ${email} has been removed.`)
    console.log(`   Email is now available for re-registration.`)

    console.log(`\n📊 Summary:`)
    console.log(`   ✅ Team deleted`)
    console.log(`   ✅ ${user.team._count.users} user(s) deleted`)
    console.log(`   ✅ ${user.team._count.contracts} contract(s) deleted`)
    console.log(`   ✅ ${user.team._count.receivables} receivable(s) deleted`)
    console.log(`   ✅ ${user.team._count.expenses} expense(s) deleted`)
    console.log(`   ✅ ${user.team._count.recurringExpenses} recurring expense(s) deleted`)
    console.log(`   ✅ ${user.team._count.auditLogs} audit log(s) deleted`)
    console.log(`   ✅ ${user.team._count.events} event(s) deleted`)

  } catch (error) {
    console.error(`\n❌ Error deleting team:`, error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Main execution
const email = process.argv[2]

if (!email) {
  console.error('❌ Usage: npx tsx scripts/delete-test-user.ts <email>')
  console.error('   Example: npx tsx scripts/delete-test-user.ts pmelardi@gmail.com')
  process.exit(1)
}

// Run the deletion
deleteUserTeam(email)
  .then(() => {
    console.log('\n✨ Done!\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error.message)
    process.exit(1)
  })
