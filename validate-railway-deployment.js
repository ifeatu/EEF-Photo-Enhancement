const axios = require('axios');

async function validateDeployment(url) {
    console.log(`🔍 Validating Railway deployment at: ${url}`);
    
    try {
        // Test health endpoint
        const health = await axios.get(`${url}/_health`, { timeout: 10000 });
        console.log(`✅ Health check: ${health.status}`);
        return true;
    } catch (error) {
        console.log(`❌ Health check failed: ${error.response?.status || error.message}`);
        
        // Try root endpoint
        try {
            const root = await axios.get(url, { timeout: 10000 });
            console.log(`✅ Root endpoint responding: ${root.status}`);
            return true;
        } catch (rootError) {
            console.log(`❌ Root endpoint failed: ${rootError.response?.status || rootError.message}`);
            return false;
        }
    }
}

// Usage: node validate-railway-deployment.js <URL>
if (process.argv[2]) {
    validateDeployment(process.argv[2]).then(success => {
        process.exit(success ? 0 : 1);
    });
} else {
    console.log('Usage: node validate-railway-deployment.js <RAILWAY_URL>');
    process.exit(1);
}
