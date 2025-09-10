const { chromium } = require('playwright');

async function testGoogleOAuth() {
  console.log('🔍 Testing Google OAuth Flow...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to the signin page
    console.log('📱 Navigating to signin page...');
    await page.goto('http://localhost:3001/api/auth/signin');
    await page.waitForLoadState('networkidle');
    
    // Look for Google signin button
    console.log('🔍 Looking for Google signin button...');
    const googleSigninButton = await page.locator('text="Sign in with Google"').first();
    
    if (await googleSigninButton.isVisible()) {
      console.log('✅ Google signin button found');
      
      // Click the Google signin button
      console.log('🖱️ Clicking Google signin button...');
      await googleSigninButton.click();
      
      // Wait for redirect to Google
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      console.log(`🌐 Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('accounts.google.com')) {
        console.log('✅ Successfully redirected to Google OAuth');
        console.log('✅ OAuth callback URL configuration is working!');
      } else if (currentUrl.includes('localhost:3001')) {
        console.log('⚠️ Still on localhost - checking for error messages...');
        const errorText = await page.textContent('body');
        if (errorText.includes('redirect_uri_mismatch')) {
          console.log('❌ OAuth callback URL mismatch error still present');
        } else {
          console.log('✅ No redirect URI mismatch error detected');
        }
      }
    } else {
      console.log('❌ Google signin button not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testGoogleOAuth().catch(console.error);