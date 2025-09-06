// Quick local test to verify route configuration
const path = require('path');

async function testRouteConfiguration() {
  console.log('=== LOCAL ROUTE CONFIGURATION TEST ===');
  
  try {
    // Test if we can load the photo routes
    const photoRoutes = require('./backend/src/api/photo/routes/photo');
    console.log('✅ Photo routes loaded successfully');
    console.log(`Found ${photoRoutes.routes.length} routes:`);
    
    photoRoutes.routes.forEach(route => {
      console.log(`  ${route.method} ${route.path} -> ${route.handler}`);
    });
    
    // Test if we can load the main index
    const photoIndex = require('./backend/src/api/photo/index');
    console.log('\\n✅ Photo index loaded successfully');
    console.log('Exports:', Object.keys(photoIndex));
    
    // Test if we can load controllers
    const photoController = require('./backend/src/api/photo/controllers/photo');
    console.log('\\n✅ Photo controller loaded successfully');
    console.log('Controller methods:', Object.keys(photoController));
    
    return true;
  } catch (error) {
    console.log('❌ Route configuration error:', error.message);
    console.log('Stack:', error.stack);
    return false;
  }
}

testRouteConfiguration();