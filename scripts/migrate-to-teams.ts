import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToTeams() {
  console.log('Starting migration to team-based data...');

  try {
    // 1. First, create the Team table (this should be done manually or via schema first)
    // Since we already updated the schema, let's add the columns step by step

    // 2. Get all existing users
    const existingUsers = await prisma.$queryRaw`
      SELECT id, email, name FROM "User"
      WHERE "teamId" IS NULL OR "teamId" = ''
    `;

    console.log(`Found ${Array.isArray(existingUsers) ? existingUsers.length : 0} users to migrate`);

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      // 3. Create teams for each user and assign them
      for (const user of existingUsers as any[]) {
        console.log(`Creating team for user: ${user.email}`);

        // Create a team for this user
        const team = await prisma.team.create({
          data: {
            name: `${user.name || user.email}'s Team`
          }
        });

        // Update user to belong to this team
        await prisma.$executeRaw`
          UPDATE "User" SET "teamId" = ${team.id} WHERE id = ${user.id}
        `;

        // 4. Assign all existing contracts to this team
        await prisma.$executeRaw`
          UPDATE "Contract" SET "teamId" = ${team.id} WHERE "teamId" IS NULL
        `;

        // 5. Assign all existing expenses to this team
        await prisma.$executeRaw`
          UPDATE "Expense" SET "teamId" = ${team.id} WHERE "teamId" IS NULL
        `;

        // 6. Assign all existing budgets to this team
        await prisma.$executeRaw`
          UPDATE "Budget" SET "teamId" = ${team.id} WHERE "teamId" IS NULL
        `;

        console.log(`✅ Migrated user ${user.email} to team ${team.name}`);
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  migrateToTeams()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateToTeams };