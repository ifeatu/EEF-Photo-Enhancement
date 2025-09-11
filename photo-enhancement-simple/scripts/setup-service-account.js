/**
 * Production Service Account Setup Script
 * 
 * Creates a dedicated service account for testing and internal operations
 */

const { PrismaClient } = require('@prisma/client');

class ServiceAccountSetup {
  constructor() {
    this.prisma = new PrismaClient();
    this.serviceAccountData = {
      email: 'service-test@photoenhance.dev',
      name: 'Production Service Test Account',
      credits: 50, // Generous credits for testing
      role: 'USER' // or 'ADMIN' if needed for testing
    };
  }

  async log(message, status = 'info') {
    const timestamp = new Date().toISOString();
    const statusEmoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };
    console.log(`${statusEmoji[status]} [${timestamp}] ${message}`);
  }

  async checkExistingAccount() {
    await this.log('Checking for existing service account...', 'info');
    
    try {
      const existing = await this.prisma.user.findUnique({
        where: { email: this.serviceAccountData.email }
      });

      if (existing) {
        await this.log(`Service account already exists: ${existing.id}`, 'info');
        await this.log(`Current credits: ${existing.credits}`, 'info');
        return existing;
      }

      return null;
    } catch (error) {
      await this.log(`Error checking existing account: ${error.message}`, 'error');
      throw error;
    }
  }

  async createServiceAccount() {
    await this.log('Creating new service account...', 'info');

    try {
      const serviceAccount = await this.prisma.user.create({
        data: {
          email: this.serviceAccountData.email,
          name: this.serviceAccountData.name,
          credits: this.serviceAccountData.credits,
          role: this.serviceAccountData.role,
          // Note: In a real scenario, you'd also create OAuth account entries
        }
      });

      await this.log(`Service account created: ${serviceAccount.id}`, 'success');
      await this.log(`Email: ${serviceAccount.email}`, 'info');
      await this.log(`Credits: ${serviceAccount.credits}`, 'info');
      await this.log(`Role: ${serviceAccount.role}`, 'info');

      return serviceAccount;
    } catch (error) {
      await this.log(`Error creating service account: ${error.message}`, 'error');
      throw error;
    }
  }

  async updateServiceAccount(existingAccount) {
    await this.log('Updating existing service account...', 'info');

    try {
      const updatedAccount = await this.prisma.user.update({
        where: { id: existingAccount.id },
        data: {
          credits: Math.max(existingAccount.credits, this.serviceAccountData.credits),
          name: this.serviceAccountData.name,
          updatedAt: new Date()
        }
      });

      await this.log(`Service account updated: ${updatedAccount.id}`, 'success');
      await this.log(`Credits updated: ${existingAccount.credits} → ${updatedAccount.credits}`, 'info');

      return updatedAccount;
    } catch (error) {
      await this.log(`Error updating service account: ${error.message}`, 'error');
      throw error;
    }
  }

  async verifyAccount(account) {
    await this.log('Verifying service account setup...', 'info');

    try {
      // Verify the account can be found and has the right properties
      const verified = await this.prisma.user.findUnique({
        where: { id: account.id },
        include: {
          photos: true,
          transactions: true
        }
      });

      if (!verified) {
        throw new Error('Service account not found after creation');
      }

      await this.log(`✅ Account verified: ${verified.email}`, 'success');
      await this.log(`✅ Credits available: ${verified.credits}`, 'success');
      await this.log(`✅ Photos in history: ${verified.photos.length}`, 'success');
      await this.log(`✅ Transactions: ${verified.transactions.length}`, 'success');

      return verified;
    } catch (error) {
      await this.log(`Error verifying account: ${error.message}`, 'error');
      throw error;
    }
  }

  async cleanupOldTestPhotos(account) {
    await this.log('Cleaning up old test photos...', 'info');

    try {
      // Delete old test photos to keep the account clean
      const oldPhotos = await this.prisma.photo.findMany({
        where: {
          userId: account.id,
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24 hours
          }
        }
      });

      if (oldPhotos.length > 0) {
        const deleted = await this.prisma.photo.deleteMany({
          where: {
            userId: account.id,
            createdAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        });

        await this.log(`Cleaned up ${deleted.count} old test photos`, 'success');
      } else {
        await this.log('No old test photos to clean up', 'info');
      }
    } catch (error) {
      await this.log(`Error during cleanup: ${error.message}`, 'warning');
      // Don't fail the whole setup for cleanup issues
    }
  }

  async setupServiceAccount() {
    await this.log('🚀 Setting up production service account...', 'info');

    try {
      // Check if account already exists
      const existingAccount = await this.checkExistingAccount();
      
      let serviceAccount;
      if (existingAccount) {
        serviceAccount = await this.updateServiceAccount(existingAccount);
      } else {
        serviceAccount = await this.createServiceAccount();
      }

      // Verify the setup
      const verifiedAccount = await this.verifyAccount(serviceAccount);

      // Cleanup old test data
      await this.cleanupOldTestPhotos(verifiedAccount);

      await this.log('🎉 Service account setup complete!', 'success');
      
      // Display account info
      console.log('\n📋 SERVICE ACCOUNT INFO');
      console.log('========================');
      console.log(`ID: ${verifiedAccount.id}`);
      console.log(`Email: ${verifiedAccount.email}`);
      console.log(`Name: ${verifiedAccount.name}`);
      console.log(`Credits: ${verifiedAccount.credits}`);
      console.log(`Role: ${verifiedAccount.role}`);
      console.log(`Created: ${verifiedAccount.createdAt}`);
      console.log(`Updated: ${verifiedAccount.updatedAt}`);

      console.log('\n🔧 USAGE IN TESTS');
      console.log('==================');
      console.log('Use these headers for internal service calls:');
      console.log(`X-Internal-Service: production-test`);
      console.log(`X-User-Id: ${verifiedAccount.id}`);

      return verifiedAccount;

    } catch (error) {
      await this.log(`❌ Service account setup failed: ${error.message}`, 'error');
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  const setup = new ServiceAccountSetup();
  setup.setupServiceAccount()
    .then(() => {
      console.log('\n✅ Ready for production testing!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = ServiceAccountSetup;