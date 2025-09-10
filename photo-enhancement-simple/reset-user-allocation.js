const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetUserAllocation() {
  try {
    console.log('🔄 Resetting user photo allocation...');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        credits: true,
        createdAt: true
      }
    });
    
    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - Credits: ${user.credits || 0}`);
    });
    
    if (users.length === 0) {
      console.log('ℹ️  No users found to reset.');
      return;
    }
    
    // Reset all users to have 3 free photos
    const updateResult = await prisma.user.updateMany({
      data: {
        credits: 3
      }
    });
    
    console.log(`📸 Reset ${updateResult.count} users to have 3 free photos`);
    
    // Verify the update
    const updatedUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        credits: true
      }
    });
    
    console.log('\n✅ Updated user allocations:');
    updatedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - Credits: ${user.credits}`);
    });
    
    console.log('\n🎉 User photo allocation reset successfully!');
    
  } catch (error) {
    console.error('❌ Error resetting user allocation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetUserAllocation();