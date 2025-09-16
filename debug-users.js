const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugUsers() {
  console.log('👥 User-Team Relationships:\n');

  const users = await prisma.user.findMany({
    include: { team: true },
    orderBy: { createdAt: 'desc' }
  });

  users.forEach(user => {
    console.log(`${user.email}:`);
    console.log(`  - User ID: ${user.id}`);
    console.log(`  - Team ID: ${user.teamId}`);
    console.log(`  - Team Name: ${user.team?.name}`);
    console.log(`  - Created: ${user.createdAt.toISOString()}\n`);
  });

  await prisma.$disconnect();
}

debugUsers();