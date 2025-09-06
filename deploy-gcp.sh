#!/bin/bash

# Photo Enhancement App - GCP Deployment Script
# This script deploys the containerized application to Google Cloud Platform

set -e  # Exit on any error

# Configuration
PROJECT_ID="rational-camera-471203-n5"
REGION="us-central1"
API_KEY="AIzaSyDqzcxMltCKJ6Up6uKZKTzEhcHQUsl6QDs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting GCP deployment for Photo Enhancement App${NC}"
echo -e "${BLUE}Project ID: ${PROJECT_ID}${NC}"
echo -e "${BLUE}Region: ${REGION}${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command_exists gcloud; then
    echo -e "${RED}❌ Google Cloud CLI not found. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Authenticate with Google Cloud
echo -e "${YELLOW}🔐 Setting up Google Cloud authentication...${NC}"
gcloud auth login --no-launch-browser
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required Google Cloud APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable storage.googleapis.com

echo -e "${GREEN}✅ APIs enabled successfully${NC}"

# Configure Docker for GCR
echo -e "${YELLOW}🐳 Configuring Docker for Google Container Registry...${NC}"
gcloud auth configure-docker

# Create Cloud Storage bucket for uploads (if needed)
echo -e "${YELLOW}📦 Setting up Cloud Storage bucket...${NC}"
BUCKET_NAME="${PROJECT_ID}-photo-uploads"
if ! gsutil ls -b gs://${BUCKET_NAME} >/dev/null 2>&1; then
    gsutil mb -l ${REGION} gs://${BUCKET_NAME}
    echo -e "${GREEN}✅ Created storage bucket: ${BUCKET_NAME}${NC}"
else
    echo -e "${GREEN}✅ Storage bucket already exists: ${BUCKET_NAME}${NC}"
fi

# Build and deploy using Cloud Build
echo -e "${YELLOW}🏗️  Starting Cloud Build deployment...${NC}"
gcloud builds submit --config cloudbuild.yaml .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Cloud Build completed successfully${NC}"
else
    echo -e "${RED}❌ Cloud Build failed${NC}"
    exit 1
fi

# Get service URLs
echo -e "${YELLOW}🔍 Retrieving service URLs...${NC}"
BACKEND_URL=$(gcloud run services describe photo-enhancement-backend --region=${REGION} --format='value(status.url)')
FRONTEND_URL=$(gcloud run services describe photo-enhancement-frontend --region=${REGION} --format='value(status.url)')

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📱 Frontend URL: ${FRONTEND_URL}${NC}"
echo -e "${BLUE}🔧 Backend URL: ${BACKEND_URL}${NC}"
echo -e "${BLUE}📦 Storage Bucket: gs://${BUCKET_NAME}${NC}"

# Update frontend environment with actual backend URL
echo -e "${YELLOW}🔄 Updating frontend environment with backend URL...${NC}"
echo "# Updated production environment with actual backend URL" > frontend/.env.production.updated
echo "VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51Rq47a12RO6LHIFzGQwjbmGvW6lyb6nRj83zT1mwvHGWpxfpPPXy2cNwCvgftycTtwC3GtvTdXift2Nq19DeNIBW00unK49YSH" >> frontend/.env.production.updated
echo "VITE_API_BASE_URL=${BACKEND_URL}/api" >> frontend/.env.production.updated
echo "VITE_GRAPHQL_URL=${BACKEND_URL}/graphql" >> frontend/.env.production.updated
echo "VITE_GOOGLE_CLOUD_PROJECT_ID=${PROJECT_ID}" >> frontend/.env.production.updated
echo "VITE_NODE_ENV=production" >> frontend/.env.production.updated
echo "VITE_SECURE_COOKIES=true" >> frontend/.env.production.updated

echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Update your frontend .env.production file with the actual backend URL"
echo "2. Redeploy the frontend with the updated environment variables"
echo "3. Configure your domain and SSL certificates if needed"
echo "4. Set up monitoring and logging"
echo "5. Configure environment variables for production secrets"

echo -e "${GREEN}🚀 Deployment script completed!${NC}"