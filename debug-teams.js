const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTeams() {
  console.log('🔍 Debugging team segregation...\n');

  try {
    // Check users and their teams
    const users = await prisma.user.findMany({
      include: { team: true }
    });
    console.log('👥 Users and Teams:');
    users.forEach(user => {
      console.log(`  - ${user.email} -> Team: ${user.team?.name || 'NO TEAM'} (ID: ${user.teamId || 'NULL'})`);
    });

    // Check all teams
    const teams = await prisma.team.findMany();
    console.log('\n🏢 All Teams:');
    teams.forEach(team => {
      console.log(`  - ${team.name} (ID: ${team.id})`);
    });

    // Check contracts and their teams
    const contracts = await prisma.contract.findMany({
      include: { team: true }
    });
    console.log('\n📝 Contracts and Teams:');
    contracts.forEach(contract => {
      console.log(`  - "${contract.projectName}" -> Team: ${contract.team?.name || 'NO TEAM'} (teamId: ${contract.teamId || 'NULL'})`);
    });

    console.log('\n🚨 Issues found:');

    // Find contracts without teams
    const contractsWithoutTeams = contracts.filter(c => !c.teamId);
    if (contractsWithoutTeams.length > 0) {
      console.log(`  - ${contractsWithoutTeams.length} contracts without teamId`);
    }

    // Find users without teams
    const usersWithoutTeams = users.filter(u => !u.teamId);
    if (usersWithoutTeams.length > 0) {
      console.log(`  - ${usersWithoutTeams.length} users without teamId`);
    }

    if (contractsWithoutTeams.length === 0 && usersWithoutTeams.length === 0) {
      console.log('  - No issues found with team assignments');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTeams();