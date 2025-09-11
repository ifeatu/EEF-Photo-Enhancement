#!/usr/bin/env node

const crypto = require('crypto');

/**
 * Generate SERVICE_TOKENS configuration with correct permissions
 * This script creates a new SERVICE_TOKENS value that includes both admin:write and debug:read permissions
 */

function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

function generateToken(secret) {
  return 'sa_' + crypto.createHash('sha256').update(secret).digest('hex');
}

// Create the admin account with both admin:write and debug:read permissions
const secret = '675d027111dced8b0a6cd3e47beccd91272eef0960bd509f284d3408d61c6471';
const token = generateToken(secret);

const serviceTokens = {
  "admin-prod": {
    "name": "Production Admin",
    "secret": secret,
    "permissions": ["admin:write", "debug:read"],
    "createdAt": new Date().toISOString()
  }
};

console.log('=== Updated SERVICE_TOKENS Configuration ===');
console.log('');
console.log('Copy this value and set it as the SERVICE_TOKENS environment variable:');
console.log('');
console.log(JSON.stringify(serviceTokens));
console.log('');
console.log('=== Test Commands ===');
console.log('');
console.log('Test debug endpoint:');
console.log(`curl -H "Authorization: Bearer ${token}" https://photoenhance-frontend-bz1t6mwfb-pierre-malbroughs-projects.vercel.app/api/debug`);
console.log('');
console.log('Test with raw secret (backward compatibility):');
console.log(`curl -H "Authorization: Bearer ${secret}" https://photoenhance-frontend-bz1t6mwfb-pierre-malbroughs-projects.vercel.app/api/debug`);
console.log('');
console.log('=== Manual Update Instructions ===');
console.log('1. Go to Vercel Dashboard > Project Settings > Environment Variables');
console.log('2. Find SERVICE_TOKENS and click Edit');
console.log('3. Replace the value with the JSON above');
console.log('4. Save and redeploy');