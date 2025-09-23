#!/usr/bin/env node

/**
 * Check User and Team Data
 *
 * This script queries the database to check the test users and their team assignments
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking test users in database...\n');

    // Check both test users
    const testEmails = ['test1@test.com', 'test2@test.com'];

    for (const email of testEmails) {
      console.log(`👤 User: ${email}`);
      console.log('-'.repeat(40));

      const user = await prisma.user.findUnique({
        where: { email },
        include: { team: true }
      });

      if (!user) {
        console.log('❌ User not found in database');
      } else {
        console.log(`✅ User found:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.name || 'NULL'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   TeamID: ${user.teamId || 'NULL'}`);
        console.log(`   Created: ${user.createdAt}`);

        if (user.team) {
          console.log(`   Team Name: ${user.team.name}`);
          console.log(`   Team Created: ${user.team.createdAt}`);
        } else if (user.teamId) {
          console.log(`   ⚠️  Team ID exists but team not found!`);
        } else {
          console.log(`   ❌ No team assigned`);
        }
      }
      console.log('');
    }

    // Check all teams in database
    console.log('🏢 All teams in database:');
    console.log('='.repeat(40));

    const allTeams = await prisma.team.findMany({
      include: {
        users: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    if (allTeams.length === 0) {
      console.log('❌ No teams found in database');
    } else {
      allTeams.forEach((team, index) => {
        console.log(`${index + 1}. Team: ${team.name} (ID: ${team.id})`);
        console.log(`   Created: ${team.createdAt}`);
        console.log(`   Users: ${team.users.length}`);
        team.users.forEach(user => {
          console.log(`     - ${user.email} (${user.name || 'No name'})`);
        });
        console.log('');
      });
    }

    // Check total user count
    const totalUsers = await prisma.user.count();
    const usersWithTeams = await prisma.user.count({
      where: { teamId: { not: null } }
    });

    console.log('📊 Summary:');
    console.log('='.repeat(40));
    console.log(`Total users: ${totalUsers}`);
    console.log(`Users with teams: ${usersWithTeams}`);
    console.log(`Users without teams: ${totalUsers - usersWithTeams}`);

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  checkUsers()
    .then(() => {
      console.log('\n✅ Database check completed');
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { checkUsers };