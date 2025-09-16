const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOrphanedData() {
  console.log('🔧 Fixing orphaned data...\n');

  try {
    // Fix users without teams
    const usersWithoutTeams = await prisma.user.findMany({
      where: { teamId: null }
    });

    for (const user of usersWithoutTeams) {
      console.log(`👤 Creating team for user: ${user.email}`);

      // Create team for user
      const team = await prisma.team.create({
        data: {
          name: `${user.name || user.email.split('@')[0]}'s Team`
        }
      });

      // Update user
      await prisma.user.update({
        where: { id: user.id },
        data: { teamId: team.id }
      });

      console.log(`✅ Created team "${team.name}" for ${user.email}`);
    }

    // Fix contracts without teams - assign to the user who created them
    const contractsWithoutTeams = await prisma.contract.findMany({
      where: { teamId: null }
    });

    if (contractsWithoutTeams.length > 0) {
      // Since we can't determine who created them, let's assign to the first team
      const firstTeam = await prisma.team.findFirst();

      if (firstTeam) {
        for (const contract of contractsWithoutTeams) {
          await prisma.contract.update({
            where: { id: contract.id },
            data: { teamId: firstTeam.id }
          });
          console.log(`📝 Assigned contract "${contract.projectName}" to team "${firstTeam.name}"`);
        }
      }
    }

    console.log('\n✅ Orphaned data fixed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrphanedData();