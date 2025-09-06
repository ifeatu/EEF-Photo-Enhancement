# Multi-stage Dockerfile for Photo Enhancement Backend
# This Dockerfile builds the Strapi backend from the backend directory

FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install --production && npm cache clean --force

# Copy backend source code
COPY backend/ ./

# Create data directory for SQLite
RUN mkdir -p /app/data

# Build the application
RUN npm run build

# Expose port
EXPOSE 1337

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=1337

# Start the application
CMD ["npm", "start"]