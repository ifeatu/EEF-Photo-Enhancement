#!/bin/bash

echo "🚀 Direct Deployment Script"
echo "Deploying backend fixes directly to Cloud Run"

# Set project
gcloud config set project rational-camera-471203-n5

# Deploy directly from source using Cloud Run's source deployment
echo "Deploying backend from source..."
gcloud run deploy photo-enhancement-backend \
  --source=./backend \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=1337 \
  --memory=2Gi \
  --cpu=2 \
  --max-instances=10 \
  --min-instances=1 \
  --timeout=300 \
  --set-env-vars="NODE_ENV=production,HOST=0.0.0.0,PORT=1337,DATABASE_CLIENT=sqlite,DATABASE_FILENAME=.tmp/data.db,JWT_SECRET=your-jwt-secret-key,ADMIN_JWT_SECRET=your-admin-jwt-secret,TRANSFER_TOKEN_SALT=your-transfer-token-salt,API_TOKEN_SALT=your-api-token-salt,APP_KEYS=key1,key2,key3,key4,FRONTEND_URL=https://frontend-925756614203.us-central1.run.app" \
  --quiet

echo "Deployment complete!"

# Test the deployment
echo "Testing deployed API..."
curl -s -o /dev/null -w "%{http_code}" https://photo-enhancement-backend-925756614203.us-central1.run.app/_health
echo " <- Health check response"

echo "Done!"