/**
 * Script to list all users in the database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        teamId: true,
        createdAt: true,
        onboardingComplete: true,
        team: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n📊 Total users in database: ${users.length}\n`)

    if (users.length === 0) {
      console.log('   No users found.')
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`)
        console.log(`   Name: ${user.name || 'N/A'}`)
        console.log(`   Team: ${user.team.name} (${user.teamId})`)
        console.log(`   Onboarding: ${user.onboardingComplete ? '✅' : '⏳'}`)
        console.log(`   Created: ${user.createdAt.toISOString().split('T')[0]}`)
        console.log('')
      })
    }

  } catch (error) {
    console.error('❌ Error listing users:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

listUsers()
  .then(() => {
    console.log('✨ Done!\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Failed:', error.message)
    process.exit(1)
  })
