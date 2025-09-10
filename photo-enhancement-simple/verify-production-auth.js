// Script to verify production authentication setup
const https = require('https');
const crypto = require('crypto');

// Test credentials
const username = 'ifeatu';
const password = 'admin123!';
const productionSalt = 'photo_enhance_secure_salt_2024_production';
const defaultSalt = 'default-salt-change-in-production';

// Generate expected hashes
const hashWithProductionSalt = crypto.createHash('sha256').update(password + productionSalt).digest('hex');
const hashWithDefaultSalt = crypto.createHash('sha256').update(password + defaultSalt).digest('hex');

console.log('=== Expected Hashes ===');
console.log('With production salt:', hashWithProductionSalt);
console.log('With default salt:   ', hashWithDefaultSalt);
console.log('');

// Test production endpoint
function testProductionAuth() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const options = {
      hostname: 'photoenhance-frontend.vercel.app',
      path: '/api/auth-debug',
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'Node.js-Test'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    req.end();
  });
}

// Run the test
async function runTest() {
  try {
    console.log('Testing production authentication...');
    const response = await testProductionAuth();
    
    console.log('=== Production Response ===');
    console.log(JSON.stringify(response, null, 2));
    
    if (response.basicAuthDebug) {
      console.log('\n=== Analysis ===');
      console.log('Username extracted:', response.basicAuthDebug.username);
      console.log('Password length:', response.basicAuthDebug.passwordLength);
      console.log('Salt being used:', response.basicAuthDebug.salt);
      console.log('Hash generated:', response.basicAuthDebug.hashedPassword);
      
      if (response.serviceAccounts && response.serviceAccounts.firstAccount) {
        console.log('Stored hash:', response.serviceAccounts.firstAccount.passwordHash);
        console.log('Hashes match:', response.basicAuthDebug.hashedPassword === response.serviceAccounts.firstAccount.passwordHash);
      }
      
      console.log('\n=== Salt Analysis ===');
      console.log('Using production salt:', response.basicAuthDebug.salt === productionSalt);
      console.log('Using default salt:', response.basicAuthDebug.salt === defaultSalt);
      
      console.log('\n=== Hash Analysis ===');
      console.log('Matches production hash:', response.basicAuthDebug.hashedPassword === hashWithProductionSalt);
      console.log('Matches default hash:', response.basicAuthDebug.hashedPassword === hashWithDefaultSalt);
    }
    
    console.log('\n=== Authentication Result ===');
    console.log('Success:', response.authResult.success);
    console.log('Error:', response.authResult.error);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTest();