import { prisma } from '../lib/prisma';

async function migrateExistingData() {
  console.log('🚀 Starting migration to team-based data...');

  try {
    // Get all existing users without teams
    const usersWithoutTeams = await prisma.user.findMany({
      where: {
        teamId: null
      }
    });

    console.log(`📊 Found ${usersWithoutTeams.length} users to migrate`);

    for (const user of usersWithoutTeams) {
      console.log(`👤 Creating team for user: ${user.email}`);

      // Create a team for this user
      const team = await prisma.team.create({
        data: {
          name: `${user.name || user.email.split('@')[0]}'s Team`
        }
      });

      // Update user to belong to this team
      await prisma.user.update({
        where: { id: user.id },
        data: { teamId: team.id }
      });

      // Assign all existing contracts without teams to this team
      const contractsUpdated = await prisma.contract.updateMany({
        where: { teamId: null },
        data: { teamId: team.id }
      });

      // Assign all existing expenses without teams to this team
      const expensesUpdated = await prisma.expense.updateMany({
        where: { teamId: null },
        data: { teamId: team.id }
      });

      // Assign all existing budgets without teams to this team
      const budgetsUpdated = await prisma.budget.updateMany({
        where: { teamId: null },
        data: { teamId: team.id }
      });

      console.log(`✅ Migrated user ${user.email} to team "${team.name}"`);
      console.log(`   📝 ${contractsUpdated.count} contracts assigned`);
      console.log(`   💰 ${expensesUpdated.count} expenses assigned`);
      console.log(`   📊 ${budgetsUpdated.count} budgets assigned`);
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  migrateExistingData()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateExistingData };