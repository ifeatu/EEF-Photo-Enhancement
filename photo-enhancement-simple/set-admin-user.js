const { PrismaClient } = require('@prisma/client');

// Try different database URL options and clean them up
const databaseUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;
const cleanDatabaseUrl = databaseUrl?.replace(/\\n/g, '').trim();

if (!cleanDatabaseUrl) {
  console.error('❌ No valid database URL found in environment variables');
  process.exit(1);
}

console.log('🔗 Connecting to database...');
console.log('📍 Using database URL:', cleanDatabaseUrl.replace(/:[^:]*@/, ':***@')); // Hide password in logs

// Initialize Prisma client with production database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: cleanDatabaseUrl
    }
  }
});

async function setAdminUser() {
  const targetEmail = 'iampierreandre@gmail.com';
  
  try {
    console.log(`Looking for user with email: ${targetEmail}`);
    
    // First, check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: { id: true, email: true, role: true, name: true }
    });
    
    if (!existingUser) {
      console.log(`❌ User with email ${targetEmail} not found in database`);
      return;
    }
    
    console.log(`✅ Found user:`, existingUser);
    
    if (existingUser.role === 'ADMIN') {
      console.log(`✅ User ${targetEmail} is already an ADMIN`);
      return;
    }
    
    // Update user role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { email: targetEmail },
      data: { role: 'ADMIN' },
      select: { id: true, email: true, role: true, name: true }
    });
    
    console.log(`✅ Successfully updated user role:`, updatedUser);
    console.log(`🎉 User ${targetEmail} is now an ADMIN`);
    
  } catch (error) {
    console.error('❌ Error updating user role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
setAdminUser()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });