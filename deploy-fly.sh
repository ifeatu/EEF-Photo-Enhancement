#!/bin/bash

# Fly.io Deployment Script
# Full Docker control, no build system overrides

echo "✈️ Setting up Fly.io deployment..."

# Create fly.toml configuration for backend
cat > backend/fly.toml << 'EOF'
app = "photo-enhancement-backend"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 1337
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true

[[http_service.checks]]
  interval = "10s"
  timeout = "2s"
  grace_period = "5s"
  method = "get"
  path = "/_health"

[env]
  NODE_ENV = "production"
  HOST = "0.0.0.0"
  DATABASE_CLIENT = "sqlite"
  DATABASE_FILENAME = "/app/data/database.db"
  STRAPI_TELEMETRY_DISABLED = "true"

[[mounts]]
  source = "data_volume"
  destination = "/app/data"
EOF

# Create fly.toml for frontend
cat > frontend/fly.toml << 'EOF'
app = "photo-enhancement-frontend"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true

[[http_service.checks]]
  interval = "10s" 
  timeout = "2s"
  grace_period = "5s"
  method = "get"
  path = "/"
EOF

# Create frontend Dockerfile for Fly.io
cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
EOF

# Update backend Dockerfile for Fly.io
cat > backend/Dockerfile.fly << 'EOF'
FROM node:18-alpine

RUN apk add --no-cache sqlite dumb-init

WORKDIR /app

# Create required directories
RUN mkdir -p /app/data /app/public/uploads

# Install dependencies
COPY package*.json ./
RUN npm ci --include=dev

# Copy and build
COPY . .
RUN npm run build && npm prune --production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
  CMD node -e "require('http').get('http://localhost:1337/_health', (res) => process.exit(res.statusCode === 204 ? 0 : 1))"

EXPOSE 1337
CMD ["dumb-init", "npm", "start"]
EOF

echo "✅ Created Fly.io configuration files"

echo ""
echo "🎯 Fly.io Setup Complete!"
echo ""
echo "Deployment steps:"
echo "1. Install flyctl: curl -L https://fly.io/install.sh | sh"
echo "2. fly auth login"
echo "3. cd backend && fly launch --no-deploy"
echo "4. fly volumes create data_volume --size 1"
echo "5. fly deploy"
echo "6. cd ../frontend && fly launch --no-deploy && fly deploy"
echo ""
echo "Fly.io advantages:"
echo "✅ Full Dockerfile control"
echo "✅ Global edge deployment"  
echo "✅ $3-5/month total cost"
echo "✅ Native volume support"
echo "✅ No platform overrides"
echo ""