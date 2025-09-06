# Multi-stage Dockerfile for Photo Enhancement Backend
# This Dockerfile builds the Strapi backend from the backend directory

FROM node:18-alpine AS base

# Install required system dependencies
RUN apk add --no-cache sqlite dumb-init

# Set working directory
WORKDIR /app

# Create necessary directories
RUN mkdir -p /app/data /app/public/uploads && \
    chown -R node:node /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --production=false

# Copy backend source code
COPY backend/ ./

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