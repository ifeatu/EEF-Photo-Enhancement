// Test script to trigger the cron job with proper authentication
const https = require('https');
const http = require('http');

async function testCronWithAuth() {
  console.log('🔄 Testing cron job with authentication...');
  console.log('=' .repeat(50));
  
  // Check if we have CRON_SECRET in environment
  const cronSecret = process.env.CRON_SECRET;
  console.log(`🔐 CRON_SECRET: ${cronSecret ? '[SET]' : '[NOT SET]'}`);
  
  if (!cronSecret) {
    console.log('❌ CRON_SECRET not found in environment variables');
    console.log('💡 This is likely why the cron job is returning 401 Unauthorized');
    console.log('\n🔧 To fix this:');
    console.log('   1. Set CRON_SECRET in Vercel environment variables');
    console.log('   2. Redeploy the application');
    console.log('   3. The cron job should then work automatically');
    return;
  }
  
  const cronUrl = 'https://photoenhance.dev/api/cron/process-photos';
  
  try {
    console.log('📡 Triggering cron job with authentication...');
    
    const response = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'User-Agent': 'Manual-Cron-Test-With-Auth'
      }
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Status Text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`📄 Response Body: ${responseText}`);
    
    if (response.ok) {
      console.log('✅ Cron job triggered successfully with authentication');
      
      try {
        const result = JSON.parse(responseText);
        console.log('\n📊 Cron Job Results:');
        console.log(`   - Processed: ${result.processed || 0} photos`);
        console.log(`   - Errors: ${result.errors || 0}`);
        console.log(`   - Total in queue: ${result.total || 0}`);
        console.log(`   - Message: ${result.message || 'N/A'}`);
        
        if (result.processed > 0) {
          console.log('\n🎉 Photos were processed! The cron job is working.');
          
          // Wait a bit and check the specific photo again
          console.log('\n⏳ Waiting 10 seconds for processing to complete...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          console.log('\n🔍 Checking if the specific photo is now processed...');
          const photoUrl = 'https://photoenhance.dev/photos/cmfdzecjb00041cfn7m3p7nf5';
          
          try {
            const photoResponse = await fetch(photoUrl);
            console.log(`📊 Photo page status: ${photoResponse.status}`);
            
            if (photoResponse.ok) {
              const photoHtml = await photoResponse.text();
              
              // Check if the page still shows "Failed to fetch" or if it's working
              if (photoHtml.includes('Failed to fetch')) {
                console.log('❌ Photo page still shows "Failed to fetch"');
                console.log('💡 This suggests the photo may not exist in the database');
              } else if (photoHtml.includes('pending') || photoHtml.includes('PENDING')) {
                console.log('⏳ Photo is still pending - may need more time or have an issue');
              } else if (photoHtml.includes('enhanced') || photoHtml.includes('COMPLETED')) {
                console.log('✅ Photo appears to be processed!');
              } else {
                console.log('❓ Photo status unclear from page content');
              }
            } else {
              console.log(`❌ Could not access photo page: ${photoResponse.status}`);
            }
          } catch (photoError) {
            console.log(`❌ Error checking photo page: ${photoError.message}`);
          }
          
        } else if (result.total === 0) {
          console.log('\nℹ️  No photos in queue to process.');
          console.log('💡 This could mean:');
          console.log('   1. All photos have already been processed');
          console.log('   2. The specific photo ID doesn\'t exist in the database');
          console.log('   3. The photo was created in a different environment');
        } else {
          console.log('\n⚠️  Photos in queue but none were processed.');
          console.log('💡 Check the enhancement API for issues.');
        }
        
      } catch (parseError) {
        console.log('⚠️  Could not parse response as JSON, but request succeeded');
      }
      
    } else {
      console.log('❌ Cron job trigger failed even with authentication');
      
      if (response.status === 401) {
        console.log('🔐 Still unauthorized - check if CRON_SECRET matches production');
      } else if (response.status === 404) {
        console.log('🔍 Cron endpoint not found - may not be deployed');
      } else if (response.status === 500) {
        console.log('💥 Internal server error in cron job');
        console.log('💡 Check Vercel function logs for details');
      }
    }
    
  } catch (error) {
    console.error('❌ Error triggering cron job:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('🌐 DNS resolution failed - check if domain is accessible');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('🔌 Connection refused - server may be down');
    }
  }
  
  console.log('\n💡 Summary:');
  console.log('   - The cron function exists and is properly configured');
  console.log('   - It requires CRON_SECRET authentication');
  console.log('   - If CRON_SECRET is not set in Vercel, the cron won\'t work');
  console.log('   - Once set, it should automatically process pending photos every minute');
}

// Polyfill fetch for Node.js if needed
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testCronWithAuth().catch(console.error);