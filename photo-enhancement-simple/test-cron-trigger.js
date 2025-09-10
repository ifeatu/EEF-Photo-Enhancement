// Test script to manually trigger the cron job functionality
const https = require('https');
const http = require('http');

async function testCronTrigger() {
  console.log('🔄 Testing cron job trigger...');
  console.log('=' .repeat(50));
  
  const cronUrl = 'https://photoenhance.dev/api/cron/process-photos';
  
  try {
    console.log('📡 Triggering cron job manually...');
    
    const response = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Manual-Cron-Test'
      }
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Status Text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`📄 Response Body: ${responseText}`);
    
    if (response.ok) {
      console.log('✅ Cron job triggered successfully');
      
      // Wait a bit and check the specific photo again
      console.log('\n⏳ Waiting 10 seconds for processing...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      console.log('\n🔍 Checking if photo is now processed...');
      const photoUrl = 'https://photoenhance.dev/photos/cmfdzecjb00041cfn7m3p7nf5';
      
      try {
        const photoResponse = await fetch(photoUrl);
        console.log(`📊 Photo page status: ${photoResponse.status}`);
        
        if (photoResponse.ok) {
          const photoHtml = await photoResponse.text();
          
          // Check if the page still shows "Failed to fetch" or if it's working
          if (photoHtml.includes('Failed to fetch')) {
            console.log('❌ Photo page still shows "Failed to fetch"');
          } else if (photoHtml.includes('pending') || photoHtml.includes('PENDING')) {
            console.log('⏳ Photo is still pending');
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
      
    } else {
      console.log('❌ Cron job trigger failed');
      
      if (response.status === 401) {
        console.log('🔐 Authentication required - cron job may need proper auth');
      } else if (response.status === 404) {
        console.log('🔍 Cron endpoint not found - check if it\'s deployed');
      } else if (response.status === 500) {
        console.log('💥 Internal server error in cron job');
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
  
  console.log('\n💡 Next steps:');
  console.log('   1. Check Vercel function logs for the cron job');
  console.log('   2. Verify the cron job is scheduled properly in vercel.json');
  console.log('   3. Check if there are any database connection issues');
  console.log('   4. Verify the photo exists in the production database');
}

// Polyfill fetch for Node.js if needed
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

testCronTrigger().catch(console.error);