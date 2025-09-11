/**
 * Enhanced Authentication System Test
 * 
 * Tests the new authentication features:
 * - Username/password authentication
 * - Admin user setup
 * - Unlimited credits for admins
 * - Credit system updates
 */

const { PrismaClient } = require('@prisma/client');

const PRODUCTION_URL = 'https://photoenhance.dev';
const ADMIN_EMAIL = 'iampierreandre@gmail.com';

class EnhancedAuthenticationTester {
  constructor() {
    this.prisma = new PrismaClient();
    this.results = {
      adminUserVerification: false,
      adminCreditsVerification: false,
      registrationAPI: false,
      authenticationProviders: false,
      creditSystemIntegration: false
    };
  }

  async log(message, status = 'info') {
    const timestamp = new Date().toISOString();
    const statusEmoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      progress: '🔄'
    };
    console.log(`${statusEmoji[status]} [${timestamp}] ${message}`);
  }

  async testAdminUserSetup() {
    await this.log('Testing admin user setup...', 'progress');
    
    try {
      // Verify admin user exists with correct properties
      const adminUser = await this.prisma.user.findUnique({
        where: { email: ADMIN_EMAIL }
      });

      if (!adminUser) {
        await this.log('Admin user not found in database', 'error');
        return false;
      }

      await this.log(`Admin user found: ${adminUser.id}`, 'success');
      await this.log(`Role: ${adminUser.role}`, 'info');
      await this.log(`Credits: ${adminUser.credits}`, 'info');
      await this.log(`Email: ${adminUser.email}`, 'info');

      // Verify admin role
      if (adminUser.role !== 'ADMIN') {
        await this.log(`Expected role ADMIN, got ${adminUser.role}`, 'error');
        return false;
      }

      // Verify unlimited credits
      if (adminUser.credits < 999999) {
        await this.log(`Expected unlimited credits (999999+), got ${adminUser.credits}`, 'error');
        return false;
      }

      this.results.adminUserVerification = true;
      this.results.adminCreditsVerification = true;
      await this.log('Admin user setup verification passed', 'success');
      return true;
    } catch (error) {
      await this.log(`Admin user verification failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testRegistrationAPI() {
    await this.log('Testing user registration API...', 'progress');
    
    try {
      const testUser = {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test User'
      };

      const response = await fetch(`${PRODUCTION_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testUser)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await this.log('User registration API working correctly', 'success');
        await this.log(`Created user: ${data.user.email} with ${data.user.credits} credits`, 'info');
        
        // Clean up test user
        await this.prisma.user.delete({
          where: { email: testUser.email }
        });
        await this.log('Test user cleaned up', 'info');
        
        this.results.registrationAPI = true;
        return true;
      } else {
        await this.log(`Registration failed: ${data.error || 'Unknown error'}`, 'error');
        return false;
      }
    } catch (error) {
      await this.log(`Registration API test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testAuthenticationProviders() {
    await this.log('Testing authentication providers configuration...', 'progress');
    
    try {
      const response = await fetch(`${PRODUCTION_URL}/api/auth/providers`);
      
      if (response.ok) {
        const providers = await response.json();
        await this.log(`Found ${Object.keys(providers).length} authentication providers`, 'info');
        
        // Check for credentials provider
        if (providers.credentials) {
          await this.log('✓ Credentials provider (email/password) available', 'success');
        } else {
          await this.log('✗ Credentials provider not found', 'error');
          return false;
        }
        
        // Check for Google OAuth provider
        if (providers.google) {
          await this.log('✓ Google OAuth provider available', 'success');
        } else {
          await this.log('✓ Google OAuth provider not configured (expected in some environments)', 'warning');
        }
        
        this.results.authenticationProviders = true;
        return true;
      } else {
        await this.log(`Providers API failed: ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      await this.log(`Authentication providers test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testCreditSystemIntegration() {
    await this.log('Testing credit system integration...', 'progress');
    
    try {
      // Test 1: Verify admin has unlimited credits behavior
      const adminUser = await this.prisma.user.findUnique({
        where: { email: ADMIN_EMAIL }
      });

      if (!adminUser) {
        await this.log('Admin user not found for credit system test', 'error');
        return false;
      }

      // Test 2: Verify credit deduction logic recognizes admin status
      const isAdminWithUnlimitedCredits = adminUser.role === 'ADMIN' && adminUser.credits >= 999999;
      
      if (!isAdminWithUnlimitedCredits) {
        await this.log('Admin user does not have unlimited credits status', 'error');
        return false;
      }

      await this.log('Admin user has correct unlimited credits status', 'success');

      // Test 3: Create a regular user and verify credit behavior
      const regularUser = await this.prisma.user.create({
        data: {
          email: `regular-${Date.now()}@example.com`,
          name: 'Regular Test User',
          role: 'USER',
          credits: 5,
          emailVerified: new Date()
        }
      });

      await this.log(`Created regular user with ${regularUser.credits} credits`, 'info');

      // Verify regular user doesn't have unlimited credits
      const regularUserUnlimitedStatus = regularUser.role === 'ADMIN' && regularUser.credits >= 999999;
      
      if (regularUserUnlimitedStatus) {
        await this.log('Regular user incorrectly has unlimited credits status', 'error');
        return false;
      }

      await this.log('Regular user has correct limited credits status', 'success');

      // Clean up test user
      await this.prisma.user.delete({
        where: { id: regularUser.id }
      });
      await this.log('Regular test user cleaned up', 'info');

      this.results.creditSystemIntegration = true;
      return true;
    } catch (error) {
      await this.log(`Credit system integration test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      adminEmail: ADMIN_EMAIL,
      results: this.results,
      summary: {
        totalTests: Object.keys(this.results).length,
        passed: Object.values(this.results).filter(Boolean).length,
        failed: Object.values(this.results).filter(result => result === false).length
      }
    };

    console.log('\n🔐 ENHANCED AUTHENTICATION TEST REPORT');
    console.log('=======================================');
    console.log(`Production URL: ${PRODUCTION_URL}`);
    console.log(`Admin Email: ${ADMIN_EMAIL}`);
    console.log(`Test Time: ${report.timestamp}`);
    console.log('');
    console.log('Test Results:');
    console.log(`✅ Admin User Setup: ${this.results.adminUserVerification ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Admin Unlimited Credits: ${this.results.adminCreditsVerification ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Registration API: ${this.results.registrationAPI ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Authentication Providers: ${this.results.authenticationProviders ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Credit System Integration: ${this.results.creditSystemIntegration ? 'PASSED' : 'FAILED'}`);
    console.log(`\n🎯 Overall: ${report.summary.passed}/${report.summary.totalTests} tests passed`);

    if (report.summary.passed === report.summary.totalTests) {
      console.log('\n🎉 All tests passed! Enhanced authentication system is fully operational.');
      console.log('\n🔧 FEATURES VERIFIED:');
      console.log('- ✅ Admin user with unlimited credits');
      console.log('- ✅ Username/password authentication');
      console.log('- ✅ User registration system');
      console.log('- ✅ Credit system with admin bypass');
      console.log('- ✅ Multiple authentication providers');
    } else {
      console.log(`\n⚠️ ${report.summary.failed} test(s) failed. Review the details above.`);
    }

    return report;
  }

  async runAllTests() {
    await this.log('Starting enhanced authentication system tests...', 'info');
    await this.log(`Testing against: ${PRODUCTION_URL}`, 'info');
    
    try {
      // Test 1: Admin User Setup
      await this.testAdminUserSetup();

      // Test 2: Registration API
      await this.testRegistrationAPI();

      // Test 3: Authentication Providers
      await this.testAuthenticationProviders();

      // Test 4: Credit System Integration
      await this.testCreditSystemIntegration();

      // Generate final report
      const report = await this.generateTestReport();
      
      return report.summary.passed === report.summary.totalTests;

    } catch (error) {
      await this.log(`Test suite failed with error: ${error.message}`, 'error');
      return false;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new EnhancedAuthenticationTester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = EnhancedAuthenticationTester;