#!/usr/bin/env node

/**
 * Debug Production Authentication Issues
 * This script tests the authentication flow in production to identify authorization problems
 */

const PROD_BASE_URL = 'https://photoenhance-frontend.vercel.app';

async function debugProductionAuth() {
  console.log('🔍 Debugging Production Authentication Issues\n');
  
  // Test 1: Check NextAuth configuration endpoints
  console.log('=== Test 1: NextAuth Configuration ===');
  try {
    const sessionResponse = await fetch(`${PROD_BASE_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Debug-Script/1.0'
      }
    });
    
    console.log('Session endpoint status:', sessionResponse.status);
    console.log('Session endpoint headers:', Object.fromEntries(sessionResponse.headers.entries()));
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('Session data:', sessionData);
      console.log('✓ NextAuth session endpoint working');
    } else {
      console.log('✗ NextAuth session endpoint failed');
      const errorText = await sessionResponse.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.log('✗ NextAuth session test failed:', error.message);
  }
  
  // Test 2: Check signin page
  console.log('\n=== Test 2: NextAuth Signin Page ===');
  try {
    const signinResponse = await fetch(`${PROD_BASE_URL}/api/auth/signin`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Debug-Script/1.0'
      }
    });
    
    console.log('Signin endpoint status:', signinResponse.status);
    console.log('Signin endpoint headers:', Object.fromEntries(signinResponse.headers.entries()));
    
    if (signinResponse.ok) {
      console.log('✓ NextAuth signin page accessible');
    } else {
      console.log('✗ NextAuth signin page failed');
      const errorText = await signinResponse.text();
      console.log('Error response:', errorText.substring(0, 500));
    }
  } catch (error) {
    console.log('✗ NextAuth signin test failed:', error.message);
  }
  
  // Test 3: Check providers endpoint
  console.log('\n=== Test 3: NextAuth Providers ===');
  try {
    const providersResponse = await fetch(`${PROD_BASE_URL}/api/auth/providers`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Debug-Script/1.0'
      }
    });
    
    console.log('Providers endpoint status:', providersResponse.status);
    
    if (providersResponse.ok) {
      const providersData = await providersResponse.json();
      console.log('Available providers:', Object.keys(providersData));
      console.log('Google provider config:', providersData.google ? 'Present' : 'Missing');
      console.log('✓ NextAuth providers endpoint working');
    } else {
      console.log('✗ NextAuth providers endpoint failed');
      const errorText = await providersResponse.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.log('✗ NextAuth providers test failed:', error.message);
  }
  
  // Test 4: Test photo upload without authentication
  console.log('\n=== Test 4: Photo Upload Authorization ===');
  try {
    const uploadResponse = await fetch(`${PROD_BASE_URL}/api/photos/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Debug-Script/1.0'
      },
      body: JSON.stringify({
        filename: 'test.jpg',
        contentType: 'image/jpeg'
      })
    });
    
    console.log('Upload endpoint status:', uploadResponse.status);
    console.log('Upload endpoint headers:', Object.fromEntries(uploadResponse.headers.entries()));
    
    const uploadData = await uploadResponse.text();
    console.log('Upload response:', uploadData.substring(0, 300));
    
    if (uploadResponse.status === 401) {
      console.log('✓ Upload endpoint correctly requires authentication');
    } else if (uploadResponse.status === 503) {
      console.log('✓ Upload endpoint returns 503 for missing token (expected)');
    } else {
      console.log('⚠️ Unexpected upload endpoint behavior');
    }
  } catch (error) {
    console.log('✗ Upload endpoint test failed:', error.message);
  }
  
  // Test 5: Test enhance endpoint without authentication
  console.log('\n=== Test 5: Enhance Endpoint Authorization ===');
  try {
    const enhanceResponse = await fetch(`${PROD_BASE_URL}/api/photos/enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Debug-Script/1.0'
      },
      body: JSON.stringify({
        photoId: 'test-id'
      })
    });
    
    console.log('Enhance endpoint status:', enhanceResponse.status);
    console.log('Enhance endpoint headers:', Object.fromEntries(enhanceResponse.headers.entries()));
    
    const enhanceData = await enhanceResponse.text();
    console.log('Enhance response:', enhanceData.substring(0, 300));
    
    if (enhanceResponse.status === 401) {
      console.log('✓ Enhance endpoint correctly requires authentication');
    } else if (enhanceResponse.status === 503) {
      console.log('✓ Enhance endpoint returns 503 for missing token (expected)');
    } else {
      console.log('⚠️ Unexpected enhance endpoint behavior');
    }
  } catch (error) {
    console.log('✗ Enhance endpoint test failed:', error.message);
  }
  
  // Test 6: Check CORS headers
  console.log('\n=== Test 6: CORS Configuration ===');
  try {
    const corsResponse = await fetch(`${PROD_BASE_URL}/api/auth/session`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://photoenhance-frontend.vercel.app',
        'Access-Control-Request-Method': 'GET',
        'User-Agent': 'Debug-Script/1.0'
      }
    });
    
    console.log('CORS preflight status:', corsResponse.status);
    console.log('CORS headers:', Object.fromEntries(corsResponse.headers.entries()));
    
    const corsHeaders = corsResponse.headers;
    if (corsHeaders.get('access-control-allow-origin')) {
      console.log('✓ CORS headers present');
    } else {
      console.log('⚠️ CORS headers missing or incomplete');
    }
  } catch (error) {
    console.log('✗ CORS test failed:', error.message);
  }
  
  console.log('\n=== Summary ===');
  console.log('Production authentication debugging complete.');
  console.log('Check the results above to identify authorization issues.');
}

// Run the debug script
debugProductionAuth().catch(console.error);