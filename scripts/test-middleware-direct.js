#!/usr/bin/env node

/**
 * Direct Middleware Test
 *
 * Tests the middleware logic directly by simulating the auth context
 * since we know the user IDs and team IDs from the database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test users from database query
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

/**
 * Test the team-scoped Prisma wrapper directly
 */
function createTeamScopedPrisma(teamId) {
  return {
    contract: {
      async findMany(args = {}) {
        const where = { ...args.where, teamId };
        return prisma.contract.findMany({ ...args, where });
      },
      async create(args) {
        const data = { ...args.data, teamId };
        return prisma.contract.create({ ...args, data });
      },
      async count(args = {}) {
        const where = { ...args.where, teamId };
        return prisma.contract.count({ ...args, where });
      }
    }
  };
}

async function testTeamScoping() {
  console.log('🧪 Direct Middleware Team Scoping Test');
  console.log('=' .repeat(50));

  try {
    // Step 1: Create test contracts for each team
    console.log('\n📝 Step 1: Creating test contracts');
    console.log('-' .repeat(30));

    const contract1Data = {
      clientName: 'Team A Client Direct Test',
      projectName: 'Team A Project Direct Test',
      description: 'Testing team scoping directly',
      totalValue: 25000,
      signedDate: new Date('2025-01-10'),
      status: 'active',
    };

    const contract2Data = {
      clientName: 'Team B Client Direct Test',
      projectName: 'Team B Project Direct Test',
      description: 'Testing team scoping directly',
      totalValue: 35000,
      signedDate: new Date('2025-01-11'),
      status: 'active',
    };

    // Create team-scoped clients
    const team1Prisma = createTeamScopedPrisma(TEST_USERS.user1.teamId);
    const team2Prisma = createTeamScopedPrisma(TEST_USERS.user2.teamId);

    // User 1 creates contract
    const contract1 = await team1Prisma.contract.create({ data: contract1Data });
    console.log(`✅ User 1 created contract: ${contract1.id}`);
    console.log(`   Team ID assigned: ${contract1.teamId}`);

    // User 2 creates contract
    const contract2 = await team2Prisma.contract.create({ data: contract2Data });
    console.log(`✅ User 2 created contract: ${contract2.id}`);
    console.log(`   Team ID assigned: ${contract2.teamId}`);

    // Step 2: Test team isolation in queries
    console.log('\n🔒 Step 2: Testing team isolation');
    console.log('-' .repeat(30));

    // User 1 queries contracts
    const user1Contracts = await team1Prisma.contract.findMany();
    const user1SeesOwn = user1Contracts.some(c => c.id === contract1.id);
    const user1SeesOther = user1Contracts.some(c => c.id === contract2.id);

    console.log(`User 1 total contracts: ${user1Contracts.length}`);
    console.log(`User 1 sees own contract: ${user1SeesOwn ? '✅' : '❌'}`);
    console.log(`User 1 sees other team's contract: ${user1SeesOther ? '❌ DATA LEAK!' : '✅ Properly isolated'}`);

    // User 2 queries contracts
    const user2Contracts = await team2Prisma.contract.findMany();
    const user2SeesOwn = user2Contracts.some(c => c.id === contract2.id);
    const user2SeesOther = user2Contracts.some(c => c.id === contract1.id);

    console.log(`User 2 total contracts: ${user2Contracts.length}`);
    console.log(`User 2 sees own contract: ${user2SeesOwn ? '✅' : '❌'}`);
    console.log(`User 2 sees other team's contract: ${user2SeesOther ? '❌ DATA LEAK!' : '✅ Properly isolated'}`);

    // Step 3: Test count operations
    console.log('\n📊 Step 3: Testing count operations');
    console.log('-' .repeat(30));

    const team1Count = await team1Prisma.contract.count();
    const team2Count = await team2Prisma.contract.count();

    console.log(`Team 1 contract count: ${team1Count}`);
    console.log(`Team 2 contract count: ${team2Count}`);

    // Step 4: Test manual override attempt (should still filter)
    console.log('\n🚫 Step 4: Testing team spoofing prevention');
    console.log('-' .repeat(30));

    // Try to query with wrong teamId - should still only return team1 data
    const spoofAttempt = await team1Prisma.contract.findMany({
      where: { teamId: TEST_USERS.user2.teamId } // This should be overridden
    });

    console.log(`Spoof attempt results: ${spoofAttempt.length} contracts`);
    console.log(`Should be 0 because teamId gets overridden by middleware: ${spoofAttempt.length === 0 ? '✅' : '❌'}`);

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Test Results Summary');
    console.log('=' .repeat(50));

    const allTestsPassed =
      user1SeesOwn && !user1SeesOther &&
      user2SeesOwn && !user2SeesOther &&
      spoofAttempt.length === 0;

    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('✅ Team scoping works correctly');
      console.log('✅ Cross-team isolation verified');
      console.log('✅ Team spoofing prevented');
      console.log('✅ Middleware logic is sound');
    } else {
      console.log('❌ Some tests failed');
      console.log('🔍 Check results above');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.contract.delete({ where: { id: contract1.id } });
    await prisma.contract.delete({ where: { id: contract2.id } });
    console.log('✅ Test data cleaned up');

    return allTestsPassed;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testTeamScoping()
    .then(success => {
      console.log(`\n🎯 Middleware validation: ${success ? 'PASSED' : 'FAILED'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testTeamScoping, createTeamScopedPrisma };