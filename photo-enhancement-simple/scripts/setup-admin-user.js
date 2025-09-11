/**
 * Admin User Setup Script
 * 
 * Sets up iampierreandre@gmail.com as admin with unlimited credits
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'iampierreandre@gmail.com';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupAdminUser() {
  console.log('🔧 Admin User Setup');
  console.log('==================');
  console.log(`Setting up ${ADMIN_EMAIL} as admin user with unlimited credits...`);
  
  try {
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    });

    if (existingUser) {
      console.log(`✅ User already exists: ${existingUser.id}`);
      console.log(`   Current role: ${existingUser.role}`);
      console.log(`   Current credits: ${existingUser.credits}`);
      
      if (existingUser.role === 'ADMIN' && existingUser.credits >= 999999) {
        console.log('✅ User is already set up as admin with unlimited credits');
        return existingUser;
      }
      
      const update = await question('Update existing user to admin with unlimited credits? (y/N): ');
      if (update.toLowerCase() !== 'y' && update.toLowerCase() !== 'yes') {
        console.log('❌ Setup cancelled');
        return null;
      }
      
      // Update existing user
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: 'ADMIN',
          credits: 999999,
          updatedAt: new Date()
        }
      });
      
      console.log('✅ User updated to admin with unlimited credits');
      console.log(`   ID: ${updatedUser.id}`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Role: ${updatedUser.role}`);
      console.log(`   Credits: ${updatedUser.credits}`);
      
      return updatedUser;
    } else {
      // Create new admin user
      console.log('👤 Creating new admin user...');
      
      const newUser = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          name: 'Pierre Andre (Admin)',
          role: 'ADMIN',
          credits: 999999,
          emailVerified: new Date()
        }
      });
      
      console.log('✅ New admin user created');
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Name: ${newUser.name}`);
      console.log(`   Role: ${newUser.role}`);
      console.log(`   Credits: ${newUser.credits}`);
      
      return newUser;
    }
  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
    throw error;
  }
}

async function verifyAdminSetup(adminUser) {
  console.log('\n🔍 Verifying admin setup...');
  
  try {
    // Verify the user exists and has correct properties
    const verifiedUser = await prisma.user.findUnique({
      where: { id: adminUser.id },
      include: {
        photos: true,
        transactions: true
      }
    });

    if (!verifiedUser) {
      throw new Error('Admin user not found after creation/update');
    }

    console.log('✅ Admin user verification successful:');
    console.log(`   Email: ${verifiedUser.email}`);
    console.log(`   Role: ${verifiedUser.role}`);
    console.log(`   Credits: ${verifiedUser.credits}`);
    console.log(`   Email Verified: ${verifiedUser.emailVerified ? 'Yes' : 'No'}`);
    console.log(`   Photos: ${verifiedUser.photos.length}`);
    console.log(`   Transactions: ${verifiedUser.transactions.length}`);
    console.log(`   Created: ${verifiedUser.createdAt}`);
    console.log(`   Updated: ${verifiedUser.updatedAt}`);

    return verifiedUser;
  } catch (error) {
    console.error('❌ Error verifying admin setup:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting admin user setup process...\n');
  
  try {
    // Set up admin user
    const adminUser = await setupAdminUser();
    
    if (!adminUser) {
      console.log('❌ Admin setup cancelled');
      process.exit(0);
    }
    
    // Verify setup
    const verifiedUser = await verifyAdminSetup(adminUser);
    
    console.log('\n🎉 Admin user setup complete!');
    console.log('\n📋 SUMMARY');
    console.log('===========');
    console.log(`Admin Email: ${verifiedUser.email}`);
    console.log(`User ID: ${verifiedUser.id}`);
    console.log(`Role: ${verifiedUser.role}`);
    console.log(`Credits: ${verifiedUser.credits} (Unlimited)`);
    console.log(`Status: ✅ Ready`);
    
    console.log('\n🔧 FEATURES ENABLED FOR ADMIN:');
    console.log('- ✅ Unlimited photo enhancements');
    console.log('- ✅ No credit deduction');
    console.log('- ✅ Admin role privileges');
    console.log('- ✅ OAuth and credentials authentication support');
    
    return verifiedUser;
    
  } catch (error) {
    console.error('\n❌ Admin setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Admin user setup completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { setupAdminUser, verifyAdminSetup };