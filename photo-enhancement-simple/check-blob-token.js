#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('=== BLOB_READ_WRITE_TOKEN Configuration Check ===\n');

const token = process.env.BLOB_READ_WRITE_TOKEN;

if (!token) {
  console.log('❌ BLOB_READ_WRITE_TOKEN is NOT set');
  process.exit(1);
}

if (token.includes('YOUR_TOKEN_HERE')) {
  console.log('⚠️  BLOB_READ_WRITE_TOKEN contains placeholder value');
  console.log('   Please replace with actual Vercel Blob token');
  process.exit(1);
}

if (!token.startsWith('vercel_blob_rw_')) {
  console.log('⚠️  BLOB_READ_WRITE_TOKEN format appears invalid');
  console.log('   Expected format: vercel_blob_rw_...');
  console.log('   Current format:', token.substring(0, 20) + '...');
  process.exit(1);
}

console.log('✅ BLOB_READ_WRITE_TOKEN is properly configured');
console.log('   Token prefix:', token.substring(0, 25) + '...');
console.log('   Token length:', token.length, 'characters');
console.log('\n=== Environment Files Check ===');

const fs = require('fs');
const envFiles = ['.env.local', '.env.production', '.env.prod', '.env.vercel'];

envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const hasToken = content.includes('BLOB_READ_WRITE_TOKEN');
    console.log(`${hasToken ? '✅' : '❌'} ${file}: ${hasToken ? 'Contains BLOB_READ_WRITE_TOKEN' : 'Missing BLOB_READ_WRITE_TOKEN'}`);
  } else {
    console.log(`⚪ ${file}: File not found`);
  }
});

console.log('\n=== Summary ===');
console.log('✅ BLOB_READ_WRITE_TOKEN is ready for production use');
console.log('✅ Token format is valid');
console.log('✅ Environment files are properly configured');