/**
 * Quick configuration test to validate our refactoring
 */

// Test our new configuration system
const { APP_CONFIG, getBaseUrl, validateEnvironment } = require('./src/lib/config.ts');

console.log('🔧 Testing Configuration System...');

console.log('\n📍 Environment Detection:');
console.log('- IS_DEVELOPMENT:', APP_CONFIG.IS_DEVELOPMENT);
console.log('- IS_PRODUCTION:', APP_CONFIG.IS_PRODUCTION);
console.log('- Base URL:', getBaseUrl());

console.log('\n🔍 Environment Validation:');
const validation = validateEnvironment();
console.log('- Valid:', validation.valid);
if (!validation.valid) {
  console.log('- Errors:', validation.errors);
}

console.log('\n⏱️  Timeout Configuration:');
console.log('- Function Max:', APP_CONFIG.SERVERLESS_TIMEOUTS.FUNCTION_MAX + 'ms');
console.log('- Gemini API:', APP_CONFIG.SERVERLESS_TIMEOUTS.GEMINI_API + 'ms');

console.log('\n📏 Size Limits:');
console.log('- Max File Size:', Math.round(APP_CONFIG.LIMITS.MAX_FILE_SIZE / 1024 / 1024) + 'MB');
console.log('- Supported Formats:', APP_CONFIG.LIMITS.SUPPORTED_FORMATS.join(', '));

console.log('\n✅ Configuration system test complete!');