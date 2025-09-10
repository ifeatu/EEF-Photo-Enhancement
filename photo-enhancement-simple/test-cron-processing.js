/**
 * Test script to verify the new cron-based photo processing system
 * This script tests the /api/cron/process-photos endpoint
 */

const API_BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';

async function testCronProcessing() {
  console.log('🧪 Testing Cron Photo Processing System');
  console.log('=' .repeat(50));
  
  try {
    // Test the cron endpoint
    console.log('📡 Calling cron endpoint...');
    
    const response = await fetch(`${API_BASE_URL}/api/cron/process-photos`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cron endpoint failed:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Cron endpoint response:', JSON.stringify(result, null, 2));
    
    // Analyze the results
    if (result.processed > 0) {
      console.log(`🎉 Successfully processed ${result.processed} photos!`);
    } else if (result.processed === 0 && result.errors === 0) {
      console.log('ℹ️  No photos in queue to process (this is normal if queue is empty)');
    } else if (result.errors > 0) {
      console.log(`⚠️  Processed ${result.processed} photos but had ${result.errors} errors`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function checkPendingPhotos() {
  console.log('\n🔍 Checking for pending photos in database...');
  
  try {
    // This would require database access, so we'll just log the instruction
    console.log('📝 To check pending photos manually, run:');
    console.log('   npx prisma studio');
    console.log('   Or check the Photo table for status="PENDING"');
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Cron Processing Tests');
  console.log(`🌐 API Base URL: ${API_BASE_URL}`);
  console.log(`🔐 Using CRON_SECRET: ${CRON_SECRET ? '[SET]' : '[NOT SET]'}`);
  console.log('');
  
  await testCronProcessing();
  await checkPendingPhotos();
  
  console.log('\n📋 Next Steps:');
  console.log('1. Deploy this to Vercel with the CRON_SECRET environment variable');
  console.log('2. Upload a photo to test the full flow');
  console.log('3. Wait 1-2 minutes for the cron job to process it');
  console.log('4. Check if the photo status changes from PENDING to COMPLETED');
  console.log('');
  console.log('🔧 Deployment checklist:');
  console.log('✓ Created /api/cron/process-photos.ts');
  console.log('✓ Updated vercel.json with cron configuration');
  console.log('✓ Modified enhance route to accept internal calls');
  console.log('✓ Added CRON_SECRET to .env.example');
  console.log('⏳ Need to set CRON_SECRET in Vercel environment variables');
}

// Run the tests
runTests().catch(console.error);