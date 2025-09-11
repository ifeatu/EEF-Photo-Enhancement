const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.production' });

// Set the required environment variables from the loaded ones
process.env.POSTGRES_PRISMA_URL = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL;
process.env.POSTGRES_URL_NON_POOLING = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// Initialize Prisma client
const prisma = new PrismaClient();

async function resetAllUserCredits() {
  try {
    console.log('🔄 Starting to reset all user photo credits...');
    
    // First, get count of users to update
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in the database`);
    
    if (userCount === 0) {
      console.log('ℹ️ No users found in database');
      return;
    }
    
    // Reset all user credits to 3 (the default value)
    const result = await prisma.user.updateMany({
      data: {
        credits: 3
      }
    });
    
    console.log(`✅ Successfully reset credits for ${result.count} users`);
    
    // Verify the update by checking a few users
    const sampleUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        credits: true
      },
      take: 5
    });
    
    console.log('\n📋 Sample of updated users:');
    sampleUsers.forEach(user => {
      console.log(`  - ${user.email}: ${user.credits} credits`);
    });
    
    // Get final statistics
    const totalCredits = await prisma.user.aggregate({
      _sum: {
        credits: true
      },
      _avg: {
        credits: true
      }
    });
    
    console.log('\n📈 Final Statistics:');
    console.log(`  - Total credits across all users: ${totalCredits._sum.credits}`);
    console.log(`  - Average credits per user: ${totalCredits._avg.credits}`);
    
  } catch (error) {
    console.error('❌ Error resetting user credits:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the script
if (require.main === module) {
  resetAllUserCredits()
    .then(() => {
      console.log('\n🎉 Credit reset operation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Credit reset operation failed:', error);
      process.exit(1);
    });
}

module.exports = { resetAllUserCredits };