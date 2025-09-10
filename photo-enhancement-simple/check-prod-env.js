#!/usr/bin/env node

/**
 * Check Production Environment Variables
 * This script checks the actual values of critical environment variables in production
 */

const { execSync } = require('child_process');

async function checkProductionEnv() {
  console.log('🔍 Checking Production Environment Variables\n');
  
  const criticalVars = [
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXTAUTH_SECRET'
  ];
  
  for (const varName of criticalVars) {
    try {
      console.log(`Checking ${varName}...`);
      const result = execSync(`npx vercel env get ${varName} production`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Don't log secrets, just check if they exist
      if (varName.includes('SECRET') || varName.includes('CLIENT_SECRET')) {
        console.log(`✓ ${varName}: [HIDDEN] (${result.trim().length} characters)`);
      } else {
        console.log(`✓ ${varName}: ${result.trim()}`);
      }
    } catch (error) {
      console.log(`✗ ${varName}: Failed to retrieve - ${error.message}`);
    }
  }
  
  console.log('\n=== Analysis ===');
  console.log('If NEXTAUTH_URL is not set to https://photoenhance.dev, that could be causing OAuth issues.');
  console.log('Google OAuth requires the exact redirect URI to be configured in Google Cloud Console.');
}

checkProductionEnv().catch(console.error);