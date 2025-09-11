/**
 * Safe Production Database Reset Script
 * 
 * This script provides a safe way to reset the production database
 * with confirmations and backup options.
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function confirm(message) {
  return new Promise((resolve) => {
    rl.question(message + ' (type "CONFIRM" to proceed): ', (answer) => {
      resolve(answer === 'CONFIRM');
    });
  });
}

async function getProductionStats() {
  console.log('\n📊 Current Production Database Stats:');
  
  const userCount = await prisma.user.count();
  const photoCount = await prisma.photo.count();
  const transactionCount = await prisma.transaction.count();
  const totalCredits = await prisma.user.aggregate({
    _sum: { credits: true }
  });
  
  console.log(`- Users: ${userCount}`);
  console.log(`- Photos: ${photoCount}`);
  console.log(`- Transactions: ${transactionCount}`);
  console.log(`- Total Credits in System: ${totalCredits._sum.credits || 0}`);
  
  // Photo status breakdown
  const photoStats = await prisma.photo.groupBy({
    by: ['status'],
    _count: { status: true }
  });
  
  console.log('\nPhoto Status Breakdown:');
  photoStats.forEach(stat => {
    console.log(`- ${stat.status}: ${stat._count.status}`);
  });
  
  return { userCount, photoCount, transactionCount };
}

async function createBackups() {
  console.log('\n💾 Creating safety backups...');
  
  // Note: In production, you'd want to use proper backup tools
  // This is a simple backup for reference
  
  const backupData = {
    timestamp: new Date().toISOString(),
    users: await prisma.user.findMany(),
    photos: await prisma.photo.findMany(),
    transactions: await prisma.transaction.findMany()
  };
  
  const fs = require('fs');
  const backupFile = `backup-${Date.now()}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  
  console.log(`✅ Backup created: ${backupFile}`);
  return backupFile;
}

async function resetPhotos() {
  console.log('\n🗑️  Deleting all photos...');
  
  const deletedPhotos = await prisma.photo.deleteMany();
  console.log(`✅ Deleted ${deletedPhotos.count} photos`);
  
  return deletedPhotos.count;
}

async function resetUserAccounts(preserveAuth = true) {
  console.log('\n🔄 Resetting user accounts...');
  
  if (preserveAuth) {
    // Reset usage data but preserve authentication
    const updatedUsers = await prisma.user.updateMany({
      data: {
        credits: 3,
        subscriptionTier: null,
        subscriptionId: null,
        subscriptionStatus: null,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Reset ${updatedUsers.count} user accounts (preserved auth)`);
    return updatedUsers.count;
  } else {
    // Full reset including authentication
    const deletedUsers = await prisma.user.deleteMany();
    console.log(`✅ Deleted ${deletedUsers.count} user accounts`);
    return deletedUsers.count;
  }
}

async function resetTransactions(deleteAll = false) {
  if (deleteAll) {
    console.log('\n💳 Deleting all transactions...');
    const deletedTransactions = await prisma.transaction.deleteMany();
    console.log(`✅ Deleted ${deletedTransactions.count} transactions`);
    return deletedTransactions.count;
  } else {
    console.log('\n💳 Preserving transaction history...');
    return 0;
  }
}

async function main() {
  console.log('🚨 PRODUCTION DATABASE RESET TOOL 🚨');
  console.log('=====================================\n');
  
  try {
    // Check if we're actually connected to production
    const dbUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
    if (!dbUrl || !dbUrl.includes('vercel') && !dbUrl.includes('production')) {
      console.log('⚠️  Warning: This doesn\'t appear to be a production database URL');
    }
    
    // Show current stats
    await getProductionStats();
    
    // Confirmation 1: General warning
    console.log('\n⚠️  WARNING: This will DELETE ALL PHOTOS and RESET USER ACCOUNTS!');
    const confirmed1 = await confirm('\nAre you absolutely sure you want to proceed?');
    if (!confirmed1) {
      console.log('❌ Operation cancelled');
      process.exit(0);
    }
    
    // Create backups
    const backupFile = await createBackups();
    
    // Confirmation 2: Final warning
    console.log(`\n🚨 FINAL WARNING: About to reset production database!`);
    console.log(`📁 Backup created: ${backupFile}`);
    const confirmed2 = await confirm('\nType CONFIRM to proceed with the reset');
    if (!confirmed2) {
      console.log('❌ Operation cancelled');
      process.exit(0);
    }
    
    // Perform the reset operations
    console.log('\n🚀 Starting database reset...');
    
    const deletedPhotos = await resetPhotos();
    const resetUsers = await resetUserAccounts(true); // Preserve auth by default
    const deletedTransactions = await resetTransactions(false); // Preserve transactions by default
    
    // Show final stats
    console.log('\n✅ DATABASE RESET COMPLETE!');
    console.log('============================');
    console.log(`📸 Photos deleted: ${deletedPhotos}`);
    console.log(`👥 Users reset: ${resetUsers}`);
    console.log(`💳 Transactions deleted: ${deletedTransactions}`);
    
    // Verify the reset
    await getProductionStats();
    
  } catch (error) {
    console.error('❌ Error during database reset:', error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Safety check - require explicit confirmation via environment variable
if (process.env.ALLOW_PRODUCTION_RESET !== 'true') {
  console.log('🛡️  SAFETY CHECK: Set ALLOW_PRODUCTION_RESET=true to enable this script');
  process.exit(1);
}

main().catch(console.error);