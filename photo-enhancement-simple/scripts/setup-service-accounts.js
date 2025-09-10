#!/usr/bin/env node

/**
 * Service Account Setup Script
 * Helps configure service account credentials for production troubleshooting
 */

const crypto = require('crypto');
const readline = require('readline');

class ServiceAccountSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateToken(secret) {
    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    return `sa_${hash}`;
  }

  hashPassword(password, salt = 'default-salt-change-in-production') {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
  }

  hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  async setupServiceTokens() {
    console.log('\n=== Setting up Service Tokens ===');
    
    const tokens = {};
    let addMore = true;
    
    while (addMore) {
      console.log('\nCreating new service token...');
      
      const accountId = await this.question('Account ID (e.g., admin-prod): ');
      const accountName = await this.question('Account Name (e.g., Production Admin): ');
      const permissions = await this.question('Permissions (comma-separated, e.g., debug:read,admin:write): ');
      
      const secret = this.generateSecret();
      const token = this.generateToken(secret);
      
      tokens[accountId] = {
        name: accountName,
        secret: secret,
        permissions: permissions.split(',').map(p => p.trim()),
        createdAt: new Date().toISOString()
      };
      
      console.log(`\n✅ Service token created:`);
      console.log(`   Token: ${token}`);
      console.log(`   Secret: ${secret}`);
      console.log(`   Usage: curl -H "Authorization: Bearer ${token}" https://your-app.vercel.app/api/debug`);
      
      const more = await this.question('\nAdd another service token? (y/n): ');
      addMore = more.toLowerCase() === 'y';
    }
    
    return tokens;
  }

  async setupServiceAccounts() {
    console.log('\n=== Setting up Service Accounts (Username/Password) ===');
    
    const accounts = {};
    let addMore = true;
    
    while (addMore) {
      console.log('\nCreating new service account...');
      
      const accountId = await this.question('Account ID (e.g., admin-user): ');
      const accountName = await this.question('Account Name (e.g., Admin User): ');
      const username = await this.question('Username: ');
      const password = await this.question('Password: ');
      const permissions = await this.question('Permissions (comma-separated): ');
      
      const passwordHash = this.hashPassword(password);
      
      accounts[accountId] = {
        name: accountName,
        username: username,
        passwordHash: passwordHash,
        permissions: permissions.split(',').map(p => p.trim()),
        createdAt: new Date().toISOString()
      };
      
      console.log(`\n✅ Service account created:`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log(`   Usage: curl -u "${username}:${password}" https://your-app.vercel.app/api/debug`);
      
      const more = await this.question('\nAdd another service account? (y/n): ');
      addMore = more.toLowerCase() === 'y';
    }
    
    return accounts;
  }

  async setupApiKeys() {
    console.log('\n=== Setting up API Keys ===');
    
    const apiKeys = {};
    let addMore = true;
    
    while (addMore) {
      console.log('\nCreating new API key...');
      
      const accountId = await this.question('Account ID (e.g., monitoring-key): ');
      const accountName = await this.question('Account Name (e.g., Monitoring Service): ');
      const permissions = await this.question('Permissions (comma-separated): ');
      
      const apiKey = this.generateApiKey();
      const keyHash = this.hashApiKey(apiKey);
      
      apiKeys[accountId] = {
        name: accountName,
        keyHash: keyHash,
        permissions: permissions.split(',').map(p => p.trim()),
        createdAt: new Date().toISOString()
      };
      
      console.log(`\n✅ API key created:`);
      console.log(`   API Key: ${apiKey}`);
      console.log(`   Usage: curl -H "X-API-Key: ${apiKey}" https://your-app.vercel.app/api/debug`);
      
      const more = await this.question('\nAdd another API key? (y/n): ');
      addMore = more.toLowerCase() === 'y';
    }
    
    return apiKeys;
  }

  async generateVercelCommands(tokens, accounts, apiKeys) {
    console.log('\n=== Vercel Environment Variable Commands ===');
    console.log('\nRun these commands to set up your service accounts in Vercel:');
    console.log('\n# Service Tokens');
    console.log(`vercel env add SERVICE_TOKENS`);
    console.log(`# Paste this value: ${JSON.stringify(tokens)}`);
    
    console.log('\n# Service Accounts');
    console.log(`vercel env add SERVICE_ACCOUNTS`);
    console.log(`# Paste this value: ${JSON.stringify(accounts)}`);
    
    console.log('\n# API Keys');
    console.log(`vercel env add SERVICE_API_KEYS`);
    console.log(`# Paste this value: ${JSON.stringify(apiKeys)}`);
    
    console.log('\n# Auth Salt (generate a random salt for password hashing)');
    const salt = this.generateSecret();
    console.log(`vercel env add SERVICE_AUTH_SALT`);
    console.log(`# Paste this value: ${salt}`);
    
    console.log('\n=== Environment Variables Summary ===');
    console.log('SERVICE_TOKENS:', JSON.stringify(tokens, null, 2));
    console.log('SERVICE_ACCOUNTS:', JSON.stringify(accounts, null, 2));
    console.log('SERVICE_API_KEYS:', JSON.stringify(apiKeys, null, 2));
    console.log('SERVICE_AUTH_SALT:', salt);
  }

  async run() {
    console.log('🔐 Service Account Setup Tool');
    console.log('This tool helps you create service accounts for production troubleshooting.');
    
    try {
      const setupTokens = await this.question('\nSetup service tokens? (y/n): ');
      const tokens = setupTokens.toLowerCase() === 'y' ? await this.setupServiceTokens() : {};
      
      const setupAccounts = await this.question('\nSetup username/password accounts? (y/n): ');
      const accounts = setupAccounts.toLowerCase() === 'y' ? await this.setupServiceAccounts() : {};
      
      const setupKeys = await this.question('\nSetup API keys? (y/n): ');
      const apiKeys = setupKeys.toLowerCase() === 'y' ? await this.setupApiKeys() : {};
      
      await this.generateVercelCommands(tokens, accounts, apiKeys);
      
      console.log('\n✅ Service account setup complete!');
      console.log('\n⚠️  Security Notes:');
      console.log('- Store these credentials securely');
      console.log('- Never commit them to version control');
      console.log('- Rotate them regularly');
      console.log('- Use least privilege principle for permissions');
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
    } finally {
      this.rl.close();
    }
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  const setup = new ServiceAccountSetup();
  setup.run().catch(console.error);
}

module.exports = ServiceAccountSetup;