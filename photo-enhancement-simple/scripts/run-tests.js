#!/usr/bin/env node

/**
 * Comprehensive test runner for the photo enhancement application
 * This script runs unit tests, integration tests, and e2e tests
 */

const { spawn } = require('child_process');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    log(`\n${colors.bright}Running: ${command} ${args.join(' ')}${colors.reset}`, 'cyan');
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runTests() {
  const testType = process.argv[2] || 'all';
  
  log('\n🧪 Photo Enhancement Test Suite', 'bright');
  log('================================', 'bright');
  
  try {
    switch (testType) {
      case 'unit':
        await runUnitTests();
        break;
      case 'integration':
        await runIntegrationTests();
        break;
      case 'e2e':
        await runE2ETests();
        break;
      case 'upload':
        await runUploadTests();
        break;
      case 'all':
      default:
        await runAllTests();
        break;
    }
    
    log('\n✅ All tests completed successfully!', 'green');
  } catch (error) {
    log(`\n❌ Tests failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function runUnitTests() {
  log('\n📋 Running Unit Tests...', 'yellow');
  await runCommand('npx', ['jest', '--testPathPattern=__tests__/.*\\.test\\.(js|ts|tsx)$', '--coverage']);
}

async function runIntegrationTests() {
  log('\n🔗 Running Integration Tests...', 'yellow');
  await runCommand('npx', ['jest', '--testPathPattern=integration.*\\.test\\.(js|ts|tsx)$']);
}

async function runE2ETests() {
  log('\n🌐 Running E2E Tests...', 'yellow');
  
  // Check if dev server is running
  log('Checking if development server is running...', 'blue');
  
  try {
    const response = await fetch('http://localhost:3000');
    if (response.ok) {
      log('Development server is running, proceeding with E2E tests...', 'green');
    }
  } catch (error) {
    log('Development server not detected, starting it...', 'yellow');
    // Note: In a real scenario, you might want to start the dev server here
    log('Please ensure the development server is running with: npm run dev', 'red');
    throw new Error('Development server not running');
  }
  
  await runCommand('npx', ['playwright', 'test']);
}

async function runUploadTests() {
  log('\n📤 Running Upload-specific Tests...', 'yellow');
  
  // Run unit tests for upload functionality
  log('Running upload unit tests...', 'blue');
  await runCommand('npx', ['jest', '--testPathPattern=upload.*\\.test\\.(js|ts|tsx)$']);
  
  // Run integration tests for upload functionality
  log('Running upload integration tests...', 'blue');
  await runCommand('npx', ['jest', '--testPathPattern=integration.*upload.*\\.test\\.(js|ts|tsx)$']);
  
  // Run E2E tests for upload functionality
  log('Running upload E2E tests...', 'blue');
  await runCommand('npx', ['playwright', 'test', 'upload.e2e.test.ts']);
}

async function runAllTests() {
  log('\n🚀 Running All Tests...', 'yellow');
  
  // Run tests in sequence to avoid conflicts
  await runUnitTests();
  await runIntegrationTests();
  
  // E2E tests require the dev server to be running
  log('\n⚠️  E2E tests require the development server to be running', 'yellow');
  log('Please run "npm run dev" in another terminal, then run "npm run test:e2e"', 'yellow');
}

// Add helper function to check test coverage
async function checkCoverage() {
  log('\n📊 Checking Test Coverage...', 'yellow');
  await runCommand('npx', ['jest', '--coverage', '--coverageReporters=text-summary']);
}

// Add helper function to run tests in watch mode
async function runTestsInWatchMode() {
  log('\n👀 Running Tests in Watch Mode...', 'yellow');
  await runCommand('npx', ['jest', '--watch']);
}

// Handle command line arguments
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'coverage':
      checkCoverage();
      break;
    case 'watch':
      runTestsInWatchMode();
      break;
    default:
      runTests();
  }
}

module.exports = {
  runTests,
  runUnitTests,
  runIntegrationTests,
  runE2ETests,
  runUploadTests,
  checkCoverage,
};