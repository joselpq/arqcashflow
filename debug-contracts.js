const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugContracts() {
  console.log('🔍 Debugging contract visibility issue...\n');

  try {
    // Get all users with their teams
    const users = await prisma.user.findMany({
      include: { team: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log('👥 Recent Users and Teams:');
    users.slice(0, 5).forEach(user => {
      console.log(`  - ${user.email} -> Team: "${user.team?.name}" (teamId: ${user.teamId || 'NULL'})`);
    });

    // Get all contracts with their teams
    const contracts = await prisma.contract.findMany({
      include: { team: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n📝 Recent Contracts:');
    contracts.slice(0, 10).forEach(contract => {
      console.log(`  - "${contract.projectName}" by ${contract.clientName}`);
      console.log(`    Team: "${contract.team?.name || 'NO TEAM'}" (teamId: ${contract.teamId || 'NULL'})`);
      console.log(`    Created: ${contract.createdAt.toISOString()}`);
    });

    // Check for issues
    console.log('\n🚨 Potential Issues:');

    const contractsWithoutTeams = contracts.filter(c => !c.teamId);
    if (contractsWithoutTeams.length > 0) {
      console.log(`  ❌ ${contractsWithoutTeams.length} contracts without teamId:`);
      contractsWithoutTeams.forEach(c => {
        console.log(`     - "${c.projectName}" (ID: ${c.id})`);
      });
    }

    const usersWithoutTeams = users.filter(u => !u.teamId);
    if (usersWithoutTeams.length > 0) {
      console.log(`  ❌ ${usersWithoutTeams.length} users without teamId:`);
      usersWithoutTeams.forEach(u => {
        console.log(`     - ${u.email} (ID: ${u.id})`);
      });
    }

    // Check team distribution
    const teamCounts = {};
    contracts.forEach(c => {
      const teamName = c.team?.name || 'NO TEAM';
      teamCounts[teamName] = (teamCounts[teamName] || 0) + 1;
    });

    console.log('\n📊 Contract Distribution by Team:');
    Object.entries(teamCounts).forEach(([team, count]) => {
      console.log(`  - ${team}: ${count} contracts`);
    });

    if (contractsWithoutTeams.length === 0 && usersWithoutTeams.length === 0) {
      console.log('\n✅ All contracts and users have teams assigned!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugContracts();