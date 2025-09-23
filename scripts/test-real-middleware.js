#!/usr/bin/env node

/**
 * Test the actual middleware implementation
 *
 * This imports and tests the real createTeamScopedPrisma function
 */

// Import the actual middleware function
const { createTeamScopedPrisma } = require('../lib/middleware/team-context.ts');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TEST_USERS = {
  user1: {
    id: 'cmfvtdzwp0002jl04r4kdg8ch',
    email: 'test1@test.com',
    teamId: 'cmfvtdzq60000jl04ez1mi8jj',
    teamName: "User A's Team"
  },
  user2: {
    id: 'cmfvtennj0002l4042dcybcyn',
    email: 'test2@test.com',
    teamId: 'cmfvtenh00000l404b6v4b6y6',
    teamName: "User B's Team"
  }
};

async function testRealMiddleware() {
  console.log('🧪 Testing ACTUAL Middleware Implementation');
  console.log('=' .repeat(50));

  try {
    console.log('\n📝 Step 1: Creating test contracts with real middleware');
    console.log('-' .repeat(40));

    const contract1Data = {
      clientName: 'Real Middleware Test 1',
      projectName: 'Test Project 1',
      description: 'Testing with actual middleware',
      totalValue: 40000,
      signedDate: new Date('2025-01-15'),
      status: 'active',
    };

    const contract2Data = {
      clientName: 'Real Middleware Test 2',
      projectName: 'Test Project 2',
      description: 'Testing with actual middleware',
      totalValue: 50000,
      signedDate: new Date('2025-01-16'),
      status: 'active',
    };

    // Use the REAL middleware
    const team1Prisma = createTeamScopedPrisma(TEST_USERS.user1.teamId);
    const team2Prisma = createTeamScopedPrisma(TEST_USERS.user2.teamId);

    // Create contracts
    const contract1 = await team1Prisma.contract.create({ data: contract1Data });
    console.log(`✅ Team 1 created contract: ${contract1.id}`);
    console.log(`   Team ID: ${contract1.teamId}`);

    const contract2 = await team2Prisma.contract.create({ data: contract2Data });
    console.log(`✅ Team 2 created contract: ${contract2.id}`);
    console.log(`   Team ID: ${contract2.teamId}`);

    console.log('\n🔒 Step 2: Testing isolation with real middleware');
    console.log('-' .repeat(40));

    // Test queries
    const team1Contracts = await team1Prisma.contract.findMany();
    const team2Contracts = await team2Prisma.contract.findMany();

    const team1SeesOwn = team1Contracts.some(c => c.id === contract1.id);
    const team1SeesOther = team1Contracts.some(c => c.id === contract2.id);

    const team2SeesOwn = team2Contracts.some(c => c.id === contract2.id);
    const team2SeesOther = team2Contracts.some(c => c.id === contract1.id);

    console.log(`Team 1 contracts: ${team1Contracts.length}`);
    console.log(`Team 1 sees own: ${team1SeesOwn ? '✅' : '❌'}`);
    console.log(`Team 1 sees other: ${team1SeesOther ? '❌ LEAK!' : '✅ Isolated'}`);

    console.log(`Team 2 contracts: ${team2Contracts.length}`);
    console.log(`Team 2 sees own: ${team2SeesOwn ? '✅' : '❌'}`);
    console.log(`Team 2 sees other: ${team2SeesOther ? '❌ LEAK!' : '✅ Isolated'}`);

    console.log('\n🚫 Step 3: Testing spoofing prevention');
    console.log('-' .repeat(40));

    // Critical test: Try to query with wrong teamId
    const spoofAttempt = await team1Prisma.contract.findMany({
      where: { teamId: TEST_USERS.user2.teamId }
    });

    console.log(`Spoof attempt found: ${spoofAttempt.length} contracts`);
    console.log(`Should be 0 (teamId should be overridden): ${spoofAttempt.length === 0 ? '✅ SECURE' : '❌ SECURITY FLAW'}`);

    // Another test: Try to create with wrong teamId
    console.log('\n🔒 Step 4: Testing create spoofing prevention');
    console.log('-' .repeat(40));

    const spoofCreateData = {
      ...contract1Data,
      clientName: 'Spoof Attempt',
      teamId: TEST_USERS.user2.teamId // Try to create for different team
    };

    const spoofContract = await team1Prisma.contract.create({ data: spoofCreateData });
    console.log(`Spoof create teamId: ${spoofContract.teamId}`);
    console.log(`Should be team1 ID: ${spoofContract.teamId === TEST_USERS.user1.teamId ? '✅ SECURE' : '❌ SECURITY FLAW'}`);

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 REAL Middleware Test Results');
    console.log('=' .repeat(50));

    const allTestsPassed =
      team1SeesOwn && !team1SeesOther &&
      team2SeesOwn && !team2SeesOther &&
      spoofAttempt.length === 0 &&
      spoofContract.teamId === TEST_USERS.user1.teamId;

    if (allTestsPassed) {
      console.log('✅ ALL SECURITY TESTS PASSED!');
      console.log('✅ Middleware correctly enforces team isolation');
      console.log('✅ Query spoofing prevented');
      console.log('✅ Create spoofing prevented');
      console.log('✅ MIDDLEWARE IS PRODUCTION READY');
    } else {
      console.log('❌ SECURITY FLAWS DETECTED');
      console.log('❌ Middleware needs fixes before production');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await prisma.contract.delete({ where: { id: contract1.id } });
    await prisma.contract.delete({ where: { id: contract2.id } });
    await prisma.contract.delete({ where: { id: spoofContract.id } });
    console.log('✅ Cleanup complete');

    return allTestsPassed;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
if (require.main === module) {
  testRealMiddleware()
    .then(success => {
      console.log(`\n🎯 FINAL VERDICT: ${success ? 'MIDDLEWARE SECURE ✅' : 'MIDDLEWARE INSECURE ❌'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}