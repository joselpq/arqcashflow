const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBudgets() {
  try {
    // Count budgets in database
    const budgetCount = await prisma.budget.count();
    console.log(`\n📊 Budget table status:`);
    console.log(`   Total budgets in database: ${budgetCount}`);

    if (budgetCount > 0) {
      // Get sample data if exists
      const sampleBudgets = await prisma.budget.findMany({
        take: 3,
        select: {
          id: true,
          name: true,
          category: true,
          teamId: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log(`\n   Sample budgets:`);
      sampleBudgets.forEach(b => {
        console.log(`   - ${b.name} (${b.category}) - Team: ${b.teamId || 'NULL'} - Created: ${b.createdAt.toISOString()}`);
      });

      // Check team associations
      const budgetsWithoutTeam = await prisma.budget.count({
        where: { teamId: null }
      });

      console.log(`\n   Budgets without team: ${budgetsWithoutTeam}`);

      // Check contract associations
      const budgetsWithContract = await prisma.budget.count({
        where: { contractId: { not: null } }
      });

      console.log(`   Budgets linked to contracts: ${budgetsWithContract}`);
    }

    return budgetCount;

  } catch (error) {
    console.error('Error checking budgets:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkBudgets()
  .then(count => {
    if (count > 0) {
      console.log('\n⚠️  WARNING: Budget data exists in database!');
      console.log('   Please backup or migrate this data before removing the budget feature.');
      process.exit(1);
    } else {
      console.log('\n✅ No budget data found in database - safe to remove.');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('\n❌ Failed to check budget data:', error);
    process.exit(1);
  });