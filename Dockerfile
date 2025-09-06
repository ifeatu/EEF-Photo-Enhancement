FROM node:18-alpine

WORKDIR /app

# Install required system dependencies
RUN apk add --no-cache sqlite dumb-init

# Create necessary directories
RUN mkdir -p /app/data /app/public/uploads && \
    chown -R node:node /app

# Copy and install dependencies
COPY backend/package*.json ./
RUN npm install

# Copy source code
COPY backend/ .

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