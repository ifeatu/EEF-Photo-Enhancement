#!/usr/bin/env node

/**
 * Check NextAuth Configuration in Production
 * This script checks the actual NextAuth configuration being used in production
 */

const https = require('https');

async function checkNextAuthConfig() {
  console.log('🔍 Checking NextAuth Configuration in Production\n');
  
  const options = {
    hostname: 'photoenhance.dev',
    port: 443,
    path: '/api/auth/providers',
    method: 'GET',
    headers: {
      'User-Agent': 'NextAuth-Config-Check/1.0'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);
        
        try {
          const providers = JSON.parse(data);
          console.log('\n=== NextAuth Providers ===');
          console.log(JSON.stringify(providers, null, 2));
          
          if (providers.google) {
            console.log('\n✓ Google OAuth provider is configured');
            console.log(`Redirect URI should be: https://photoenhance.dev/api/auth/callback/google`);
          } else {
            console.log('\n✗ Google OAuth provider is NOT configured');
          }
        } catch (error) {
          console.log('\nResponse body:', data);
          console.log('Error parsing JSON:', error.message);
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.error('Request failed:', error.message);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      console.error('Request timeout');
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

checkNextAuthConfig().catch(console.error);