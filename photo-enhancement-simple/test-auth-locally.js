const crypto = require('crypto');

// Test the authentication logic locally
const salt = 'photo_enhance_secure_salt_2024_production';
const password = 'admin123!';
const username = 'ifeatu';

// Hash the password the same way as the service
const hashedPassword = crypto.createHash('sha256').update(password + salt).digest('hex');

console.log('=== Authentication Test ===');
console.log('Username:', username);
console.log('Password:', password);
console.log('Salt:', salt);
console.log('Hashed Password:', hashedPassword);

// Simulate the service account data
const serviceAccounts = {
  'admin-user': {
    id: 'admin-user',
    name: 'Admin User',
    username: 'ifeatu',
    passwordHash: 'a2edafe7ef9c0d6850960ed360a610924941ce0aa17ab7136dbf580d25864ed6',
    permissions: ['admin:write'],
    createdAt: '2024-01-01T00:00:00.000Z'
  }
};

console.log('\n=== Stored Hash ===');
console.log('Stored Hash:', serviceAccounts['admin-user'].passwordHash);

console.log('\n=== Comparison ===');
console.log('Generated Hash:', hashedPassword);
console.log('Stored Hash:   ', serviceAccounts['admin-user'].passwordHash);
console.log('Hashes Match:  ', hashedPassword === serviceAccounts['admin-user'].passwordHash);

// Test the verification function
function verifyPassword(password, hash) {
  try {
    const expectedHash = crypto.createHash('sha256').update(password + salt).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}

console.log('\n=== Verification Test ===');
const isValid = verifyPassword(password, serviceAccounts['admin-user'].passwordHash);
console.log('Password verification result:', isValid);

// Test with different salts to see if that's the issue
const defaultSalt = 'default-salt-change-in-production';
const hashWithDefaultSalt = crypto.createHash('sha256').update(password + defaultSalt).digest('hex');
console.log('\n=== Default Salt Test ===');
console.log('Hash with default salt:', hashWithDefaultSalt);
console.log('Matches stored hash:', hashWithDefaultSalt === serviceAccounts['admin-user'].passwordHash);