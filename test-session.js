const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSessionIssue() {
  console.log('🧪 Testing Session/Team Assignment Issue\n');

  // Get all users and their expected teams
  const users = await prisma.user.findMany({
    include: { team: true }
  });

  // Get all contracts and their assigned teams
  const contracts = await prisma.contract.findMany({
    include: { team: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log('Expected User-Team Mappings:');
  users.forEach(user => {
    console.log(`  ${user.email} -> ${user.team?.name} (${user.teamId})`);
  });

  console.log('\nContract Team Assignments:');
  contracts.forEach(contract => {
    console.log(`  "${contract.projectName}" -> ${contract.team?.name} (${contract.teamId})`);
    console.log(`    Created: ${contract.createdAt.toISOString()}`);
  });

  console.log('\n🚨 Detecting Issues:');

  // Check if all contracts from today are assigned to the same team
  const today = new Date().toDateString();
  const todayContracts = contracts.filter(c => c.createdAt.toDateString() === today);

  if (todayContracts.length > 1) {
    const uniqueTeams = new Set(todayContracts.map(c => c.teamId));
    if (uniqueTeams.size === 1) {
      console.log(`  ❌ All ${todayContracts.length} contracts created today assigned to same team!`);
      console.log(`     This suggests session/authentication issue`);
    } else {
      console.log(`  ✅ Today's contracts properly distributed across ${uniqueTeams.size} teams`);
    }
  }

  await prisma.$disconnect();
}

testSessionIssue();