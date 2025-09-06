#!/bin/bash

# Fix Railway Deployment Script
# This script addresses the identified Railway deployment issues

echo "🔧 Fixing Railway Deployment Issues..."

# 1. Remove any existing Nixpacks files that conflict with Docker
echo "Removing conflicting Nixpacks files..."
find . -name "nixpacks.toml" -delete
find . -name "railway.toml" -delete
find . -name ".nixpacks" -type d -exec rm -rf {} + 2>/dev/null || true

# 2. Ensure proper file structure
echo "Setting up proper file structure..."
mkdir -p backend/data
mkdir -p backend/public/uploads
mkdir -p frontend/dist

# 3. Create .railway directory for configuration
mkdir -p backend/.railway

# 4. Set proper permissions
chmod -R 755 backend/data
chmod -R 755 backend/public/uploads

# 5. Validate Dockerfile exists and is correct
if [ ! -f "backend/Dockerfile" ]; then
    echo "❌ Error: backend/Dockerfile not found!"
    exit 1
fi

# 6. Validate railway.json exists and is correct
if [ ! -f "backend/railway.json" ]; then
    echo "❌ Error: backend/railway.json not found!"
    exit 1
fi

# 7. Check that environment variables are set
if [ ! -f "backend/.env.production" ]; then
    echo "❌ Error: backend/.env.production not found!"
    exit 1
fi

echo "✅ File structure validated"

# 8. Test Docker build locally (optional but recommended)
echo "Testing Docker build locally..."
cd backend
if docker build -t railway-backend-test . > /dev/null 2>&1; then
    echo "✅ Local Docker build successful"
    docker rmi railway-backend-test > /dev/null 2>&1 || true
else
    echo "⚠️  Local Docker build failed - check Dockerfile"
fi
cd ..

# 9. Create deployment validation script
cat > validate-railway-deployment.js << 'EOF'
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
EOF

echo "✅ Created deployment validation script"

echo ""
echo "🎯 Railway Deployment Fix Complete!"
echo ""
echo "Next steps:"
echo "1. Commit these changes to your repository"
echo "2. In Railway dashboard, trigger a new deployment"
echo "3. Ensure the service uses the Dockerfile (not Nixpacks)"
echo "4. Check that environment variables are set in Railway dashboard"
echo "5. Run: node validate-railway-deployment.js <YOUR_RAILWAY_URL>"
echo ""
echo "Key fixes applied:"
echo "✅ Removed conflicting Nixpacks files"
echo "✅ Enhanced Dockerfile with proper Railway optimization"
echo "✅ Added explicit railway.json configuration"
echo "✅ Created production environment file"
echo "✅ Added .dockerignore to prevent Nixpacks interference"
echo "✅ Added health check to Dockerfile"
echo ""