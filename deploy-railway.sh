#!/bin/bash

# Railway deployment script for Photo Enhancement App
# This script sets up the necessary configuration for Railway deployment

echo "🚀 Preparing Railway deployment..."

# Create necessary directories
mkdir -p backend/data
mkdir -p frontend/dist

# Create .env.production for backend if it doesn't exist
if [ ! -f backend/.env.production ]; then
    cat > backend/.env.production << EOF
NODE_ENV=production
HOST=0.0.0.0
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=/app/data/database.db
JWT_SECRET=your-production-jwt-secret-key-$(openssl rand -hex 32)
ADMIN_JWT_SECRET=your-production-admin-jwt-secret-$(openssl rand -hex 32)
TRANSFER_TOKEN_SALT=your-production-transfer-salt-$(openssl rand -hex 32)
API_TOKEN_SALT=your-production-api-salt-$(openssl rand -hex 32)
APP_KEYS=$(openssl rand -hex 16),$(openssl rand -hex 16),$(openssl rand -hex 16),$(openssl rand -hex 16)
STRAPI_ADMIN_BACKEND_URL=\$RAILWAY_STATIC_URL
EOF
    echo "✅ Created backend .env.production"
fi

# Create .env.production for frontend if it doesn't exist
if [ ! -f frontend/.env.production ]; then
    cat > frontend/.env.production << EOF
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51Rq47a12RO6LHIFzGQwjbmGvW6lyb6nRj83zT1mwvHGWpxfpPPXy2cNwCvgftycTtwC3GtvTdXift2Nq19DeNIBW00unK49YSH
VITE_API_BASE_URL=\$RAILWAY_STATIC_URL/api
VITE_GRAPHQL_URL=\$RAILWAY_STATIC_URL/graphql
VITE_NODE_ENV=production
VITE_SECURE_COOKIES=true
EOF
    echo "✅ Created frontend .env.production"
fi

# Create nixpacks.toml for backend
cat > backend/nixpacks.toml << EOF
[phases.setup]
nixPkgs = ["nodejs-18_x", "npm-9_x"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"

[variables]
NODE_ENV = "production"
EOF

# Create nixpacks.toml for frontend  
cat > frontend/nixpacks.toml << EOF
[phases.setup]
nixPkgs = ["nodejs-18_x", "npm-9_x"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run preview"

[variables]
NODE_ENV = "production"
EOF

echo "✅ Created Nixpacks configuration files"

# Create a simple package.json in the root for Railway to detect
cat > package.json << EOF
{
  "name": "photo-enhancement-app",
  "version": "1.0.0",
  "description": "Photo Enhancement Application",
  "main": "index.js",
  "scripts": {
    "start": "cd backend && npm start",
    "build": "cd backend && npm run build",
    "dev": "concurrently \"cd backend && npm run develop\" \"cd frontend && npm run dev\""
  },
  "dependencies": {
    "concurrently": "^8.2.2"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
EOF

echo "✅ Created root package.json"

# Create Railway-specific Dockerfile for backend
cat > backend/Dockerfile.railway << EOF
FROM node:18-alpine

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/data

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Create uploads directory
RUN mkdir -p /app/public/uploads

# Set correct permissions
RUN chown -R node:node /app
USER node

EXPOSE \$PORT

CMD ["npm", "start"]
EOF

echo "✅ Created Railway-specific Dockerfile"

echo "🎯 Railway deployment configuration complete!"
echo ""
echo "Next steps:"
echo "1. Push your code to GitHub"
echo "2. Connect your GitHub repo to Railway"
echo "3. Deploy the backend service first"
echo "4. Deploy the frontend service"
echo "5. Configure the volume mount for /app/data"
echo ""
echo "Railway will automatically detect and deploy your application!"