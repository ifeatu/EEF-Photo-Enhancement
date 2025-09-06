#!/bin/bash

# Render Platform Deployment Script
# This bypasses Railway's Nixpacks override issues

echo "🚀 Setting up Render deployment (Railway alternative)..."

# Create render.yaml for explicit service configuration
cat > render.yaml << 'EOF'
services:
  - type: web
    name: photo-enhancement-backend
    env: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    plan: starter
    region: oregon
    envVars:
      - key: NODE_ENV
        value: production
      - key: HOST
        value: 0.0.0.0
      - key: DATABASE_CLIENT
        value: sqlite
      - key: DATABASE_FILENAME
        value: /app/data/database.db
      - key: JWT_SECRET
        generateValue: true
      - key: ADMIN_JWT_SECRET
        generateValue: true
      - key: TRANSFER_TOKEN_SALT
        generateValue: true
      - key: API_TOKEN_SALT
        generateValue: true
      - key: APP_KEYS
        value: key1-render,key2-render,key3-render,key4-render
      - key: STRAPI_TELEMETRY_DISABLED
        value: true
    disk:
      name: backend-data
      mountPath: /app/data
      sizeGB: 1
    
  - type: static
    name: photo-enhancement-frontend
    buildCommand: npm run build
    publishPath: ./frontend/dist
    pullRequestPreviewsEnabled: false
    buildFilter:
      paths:
      - frontend/**
    envVars:
      - key: VITE_NODE_ENV
        value: production
      - key: VITE_SECURE_COOKIES
        value: true
EOF

echo "✅ Created render.yaml configuration"

# Create Dockerfile specifically for Render
cat > backend/Dockerfile.render << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install required system dependencies
RUN apk add --no-cache sqlite dumb-init

# Create necessary directories
RUN mkdir -p /app/data /app/public/uploads && \
    chown -R node:node /app

# Copy and install dependencies
COPY package*.json ./
RUN npm ci --production=false

# Copy source code
COPY . .

# Build application
RUN npm run build && \
    npm prune --production

# Set user permissions
USER node

# Health check for Render
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
  CMD node -e "require('http').get('http://localhost:$PORT/_health', (res) => process.exit(res.statusCode === 204 ? 0 : 1))"

EXPOSE $PORT
CMD ["dumb-init", "npm", "start"]
EOF

echo "✅ Created Render-specific Dockerfile"

# Update server config for Render
cat > backend/config/server.render.js << 'EOF'
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 10000), // Render uses port 10000 by default
  app: {
    keys: env.array('APP_KEYS'),
  },
});
EOF

echo "✅ Created Render server configuration"

echo ""
echo "🎯 Render Deployment Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Sign up at render.com"
echo "2. Connect your GitHub repository"
echo "3. Choose 'Deploy from render.yaml'"
echo "4. Render will automatically create both services"
echo "5. No Nixpacks override issues!"
echo ""
echo "Render advantages:"
echo "✅ Respects Dockerfile configuration"
echo "✅ Built-in persistent disk support"
echo "✅ No build system overrides"
echo "✅ $7/month backend + free frontend"
echo "✅ Automatic SSL and custom domains"
echo ""