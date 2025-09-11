/**
 * Pre-deployment validation script
 * Ensures everything is ready for production deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Pre-Deployment Validation');
console.log('=====================================\n');

let validationPassed = true;
const errors = [];

// Test 1: Critical Files Exist
console.log('1. Checking critical files...');
const criticalFiles = [
  'src/lib/config.ts',
  'src/lib/cors.ts', 
  'src/lib/url-utils.ts',
  'src/lib/gemini-service.ts',
  'src/app/api/photos/enhance/route.ts',
  'src/app/api/photos/enhance/route-original.ts', // Backup
  'vercel.json',
  'package.json',
  'prisma/schema.prisma'
];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    errors.push(`Missing critical file: ${file}`);
    validationPassed = false;
  }
});

// Test 2: Package.json Configuration
console.log('\n2. Validating package.json...');
const pkg = require('./package.json');

if (pkg.scripts.dev.includes('-p 3000')) {
  console.log('   ✅ Dev port standardized to 3000');
} else {
  console.log('   ❌ Dev port not standardized');
  errors.push('Dev port not set to 3000');
  validationPassed = false;
}

if (pkg.scripts.build.includes('prisma generate')) {
  console.log('   ✅ Prisma generation in build script');
} else {
  console.log('   ❌ Prisma generation missing from build');
  errors.push('Prisma generate not in build script');
  validationPassed = false;
}

// Test 3: Vercel Configuration
console.log('\n3. Validating vercel.json...');
const vercelConfig = require('./vercel.json');

if (vercelConfig.functions && vercelConfig.functions['src/app/api/photos/enhance/route.ts']) {
  const maxDuration = vercelConfig.functions['src/app/api/photos/enhance/route.ts'].maxDuration;
  if (maxDuration === 60) {
    console.log('   ✅ Enhancement function timeout set to 60s');
  } else {
    console.log(`   ⚠️  Enhancement function timeout: ${maxDuration}s`);
  }
} else {
  console.log('   ❌ Enhancement function not configured');
  errors.push('Enhancement function timeout not configured');
  validationPassed = false;
}

// Check CORS headers removed from vercel.json (should be handled in code now)
if (!vercelConfig.headers) {
  console.log('   ✅ CORS headers removed from vercel.json (handled in code)');
} else {
  console.log('   ⚠️  CORS headers still in vercel.json (should be removed)');
}

// Check Sharp build env removed
if (!vercelConfig.build || !vercelConfig.build.env || !vercelConfig.build.env.SHARP_IGNORE_GLOBAL_LIBVIPS) {
  console.log('   ✅ Sharp build environment removed');
} else {
  console.log('   ⚠️  Sharp environment variables still present');
}

// Test 4: Dependencies Check
console.log('\n4. Checking dependencies...');
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

// Check that Sharp is not a direct dependency
if (!deps.sharp) {
  console.log('   ✅ Sharp dependency removed');
} else {
  console.log('   ⚠️  Sharp still in dependencies (check if needed)');
}

// Check for required dependencies
const requiredDeps = [
  '@google/generative-ai',
  '@vercel/blob', 
  'next-auth',
  'prisma',
  'next'
];

requiredDeps.forEach(dep => {
  if (deps[dep]) {
    console.log(`   ✅ ${dep}`);
  } else {
    console.log(`   ❌ ${dep} - MISSING`);
    errors.push(`Missing required dependency: ${dep}`);
    validationPassed = false;
  }
});

// Test 5: File Content Validation
console.log('\n5. Validating file contents...');

// Check that new route imports new services
const routeContent = fs.readFileSync('src/app/api/photos/enhance/route.ts', 'utf8');
if (routeContent.includes('ProductionGeminiService')) {
  console.log('   ✅ Route uses ProductionGeminiService');
} else {
  console.log('   ❌ Route does not use ProductionGeminiService');
  errors.push('Route not using new Gemini service');
  validationPassed = false;
}

if (routeContent.includes('createCorsResponse')) {
  console.log('   ✅ Route uses unified CORS handling');
} else {
  console.log('   ❌ Route not using unified CORS');
  errors.push('Route not using unified CORS system');
  validationPassed = false;
}

// Check that Sharp is not imported anywhere
if (!routeContent.includes('sharp')) {
  console.log('   ✅ No Sharp imports in enhancement route');
} else {
  console.log('   ❌ Sharp still imported in route');
  errors.push('Sharp still being imported');
  validationPassed = false;
}

// Test 6: Jest Configuration
console.log('\n6. Validating test configuration...');
const jestSetup = fs.readFileSync('jest.setup.js', 'utf8');
if (jestSetup.includes('http://localhost:3000')) {
  console.log('   ✅ Jest configured for port 3000');
} else {
  console.log('   ❌ Jest not configured for port 3000');
  errors.push('Jest setup uses wrong port');
  validationPassed = false;
}

// Test 7: Playwright Configuration
console.log('\n7. Validating Playwright configuration...');
const playwrightConfig = fs.readFileSync('playwright.config.ts', 'utf8');
if (playwrightConfig.includes('http://localhost:3000')) {
  console.log('   ✅ Playwright configured for port 3000');
} else {
  console.log('   ❌ Playwright not configured for port 3000');
  errors.push('Playwright config uses wrong port');
  validationPassed = false;
}

// Final Report
console.log('\n📊 VALIDATION SUMMARY');
console.log('=====================================');

if (validationPassed) {
  console.log('🎉 ALL VALIDATIONS PASSED!');
  console.log('✅ Application is ready for deployment');
  console.log('\nNext steps:');
  console.log('1. Set environment variables in Vercel dashboard');
  console.log('2. Run: vercel --prod');
  console.log('3. Test deployed endpoints');
  console.log('4. Monitor performance and errors');
} else {
  console.log('❌ VALIDATION FAILED');
  console.log('\nErrors found:');
  errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error}`);
  });
  console.log('\nPlease fix these issues before deploying.');
}

console.log('\n🔧 Environment Variables Checklist:');
console.log('- NEXTAUTH_URL');
console.log('- NEXTAUTH_SECRET'); 
console.log('- GOOGLE_AI_API_KEY');
console.log('- GOOGLE_CLIENT_ID');
console.log('- GOOGLE_CLIENT_SECRET');
console.log('- POSTGRES_PRISMA_URL');
console.log('- POSTGRES_URL_NON_POOLING');
console.log('- STRIPE_SECRET_KEY');
console.log('- STRIPE_PUBLISHABLE_KEY');
console.log('- STRIPE_WEBHOOK_SECRET');
console.log('- BLOB_READ_WRITE_TOKEN');

process.exit(validationPassed ? 0 : 1);