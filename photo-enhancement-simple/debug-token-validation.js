const crypto = require('crypto');

// Simulate the token validation logic
// Production hash function (simple hash for Edge Runtime compatibility)
function sha256(data) {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function generateToken(secret) {
  const hash = sha256(secret);
  return `sa_${hash}`;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function verifyToken(token, secret) {
  try {
    const expectedToken = generateToken(secret);
    console.log(`Expected token: ${expectedToken}`);
    console.log(`Provided token: ${token}`);
    console.log(`Raw secret: ${secret}`);
    
    // Check generated token
    const generatedMatch = timingSafeEqual(token, expectedToken);
    console.log(`Generated token match: ${generatedMatch}`);
    
    // Check raw secret
    const rawMatch = timingSafeEqual(token, secret);
    console.log(`Raw secret match: ${rawMatch}`);
    
    return generatedMatch || rawMatch;
  } catch (error) {
    console.error('Error in verification:', error);
    return false;
  }
}

// Test with the actual values
const secret = '675d027111dced8b0a6cd3e47beccd91272eef0960bd509f284d3408d61c6471'; // From env debug
const testTokens = [
  '675d027111dced8b0a6cd3e47beccd', // Raw secret
  'sa_6bd077611a57edbf1fb9ec066d6c356bbe3874f7de8b36190f2cf4370cb8031b', // Original test token
  '675d027111dced8b0a6cd3e47beccd91272eef0960bd509f284d3408d61c6471' // From docs
];

console.log('=== Token Validation Debug ===');
console.log(`Secret from environment: ${secret}`);
console.log(`Generated token should be: ${generateToken(secret)}`);
console.log('');

testTokens.forEach((token, index) => {
  console.log(`\n--- Test ${index + 1} ---`);
  console.log(`Testing token: ${token}`);
  const isValid = verifyToken(token, secret);
  console.log(`Result: ${isValid ? 'VALID' : 'INVALID'}`);
});

// Also test the SERVICE_TOKENS JSON structure
const SERVICE_TOKENS = {
  admin: {
    secret: '675d027111dced8b0a6cd3e47beccd91272eef0960bd509f284d3408d61c6471',
    name: 'Admin Service Account',
    permissions: ['admin:read', 'admin:write', 'upload:read', 'upload:write', 'debug:read'],
    createdAt: '2024-01-01T00:00:00.000Z'
  }
};

try {
  console.log('\n=== SERVICE_TOKENS Structure ===');
  console.log(JSON.stringify(SERVICE_TOKENS, null, 2));
  
  for (const [accountId, config] of Object.entries(SERVICE_TOKENS)) {
    console.log(`\nAccount: ${accountId}`);
    console.log(`Secret: ${config.secret}`);
    console.log(`Generated token: ${generateToken(config.secret)}`);
  }
} catch (error) {
  console.error('Error parsing SERVICE_TOKENS:', error);
}