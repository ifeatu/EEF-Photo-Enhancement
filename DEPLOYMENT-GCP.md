# GCP Deployment Guide for Photo Enhancement App

This guide provides step-by-step instructions for deploying the Photo Enhancement application to Google Cloud Platform using Cloud Run.

## Prerequisites

### Required Tools
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
- [Docker](https://docs.docker.com/get-docker/)
- Git

### GCP Project Information
- **Project ID**: `rational-camera-471203-n5`
- **API Key**: `AIzaSyDqzcxMltCKJ6Up6uKZKTzEhcHQUsl6QDs`
- **Region**: `us-central1`

## Quick Deployment

### Option 1: Automated Deployment Script

```bash
# Make the script executable (if not already done)
chmod +x deploy-gcp.sh

# Run the deployment script
./deploy-gcp.sh
```

The script will:
1. Authenticate with Google Cloud
2. Enable required APIs
3. Build and deploy both frontend and backend
4. Provide you with the service URLs

### Option 2: Manual Deployment

#### Step 1: Setup Google Cloud CLI

```bash
# Install Google Cloud CLI (if not installed)
# Visit: https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set project
gcloud config set project rational-camera-471203-n5
```

#### Step 2: Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable storage.googleapis.com
```

#### Step 3: Configure Docker

```bash
gcloud auth configure-docker
```

#### Step 4: Deploy Using Cloud Build

```bash
# Deploy both frontend and backend
gcloud builds submit --config cloudbuild.yaml .
```

#### Step 5: Get Service URLs

```bash
# Get backend URL
gcloud run services describe photo-enhancement-backend --region=us-central1 --format='value(status.url)'

# Get frontend URL
gcloud run services describe photo-enhancement-frontend --region=us-central1 --format='value(status.url)'
```

## Architecture Overview

### Services Deployed

1. **Backend Service** (`photo-enhancement-backend`)
   - **Technology**: Node.js + Strapi
   - **Port**: 5992
   - **Resources**: 2 CPU, 2GB RAM
   - **Scaling**: 1-10 instances
   - **Image**: `gcr.io/rational-camera-471203-n5/photo-enhancement-backend`

2. **Frontend Service** (`photo-enhancement-frontend`)
   - **Technology**: Vue.js + Nginx
   - **Port**: 8240
   - **Resources**: 1 CPU, 512MB RAM
   - **Scaling**: 0-5 instances
   - **Image**: `gcr.io/rational-camera-471203-n5/photo-enhancement-frontend`

### Storage
- **Cloud Storage Bucket**: `rational-camera-471203-n5-photo-uploads`
- **Database**: Supabase PostgreSQL (external)

## Environment Configuration

### Backend Environment Variables

The following environment variables need to be configured in Cloud Run:

```bash
# Set environment variables for backend service
gcloud run services update photo-enhancement-backend \
  --region=us-central1 \
  --set-env-vars="
NODE_ENV=production,
GOOGLE_CLOUD_PROJECT_ID=rational-camera-471203-n5,
HOST=0.0.0.0,
PORT=5992,
FRONTEND_URL=https://your-frontend-url,
STRIPE_SECRET_KEY=your-stripe-secret-key,
GEMINI_API_KEY=your-gemini-api-key,
DATABASE_URL=your-supabase-database-url
"
```

### Frontend Environment Variables

Update `frontend/.env.production` with actual backend URL after deployment:

```env
VITE_API_BASE_URL=https://your-backend-url/api
VITE_GRAPHQL_URL=https://your-backend-url/graphql
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
VITE_GOOGLE_CLOUD_PROJECT_ID=rational-camera-471203-n5
```

## Security Considerations

### Secrets Management

1. **Use Secret Manager** for sensitive data:
   ```bash
   # Create secrets
   echo "your-stripe-secret-key" | gcloud secrets create stripe-secret-key --data-file=-
   echo "your-gemini-api-key" | gcloud secrets create gemini-api-key --data-file=-
   
   # Grant access to Cloud Run
   gcloud secrets add-iam-policy-binding stripe-secret-key \
     --member="serviceAccount:your-service-account@rational-camera-471203-n5.iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

2. **Service Account**: Create dedicated service accounts with minimal permissions

3. **Network Security**: Configure VPC and firewall rules if needed

### SSL/TLS
- Cloud Run automatically provides HTTPS endpoints
- Custom domains require SSL certificate configuration

## Monitoring and Logging

### Cloud Logging
```bash
# View backend logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=photo-enhancement-backend" --limit=50

# View frontend logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=photo-enhancement-frontend" --limit=50
```

### Cloud Monitoring
- Set up alerts for service availability
- Monitor resource usage and performance
- Configure uptime checks

## Scaling Configuration

### Backend Scaling
```bash
gcloud run services update photo-enhancement-backend \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=80
```

### Frontend Scaling
```bash
gcloud run services update photo-enhancement-frontend \
  --region=us-central1 \
  --min-instances=0 \
  --max-instances=5 \
  --concurrency=100
```

## Custom Domain Setup

1. **Map custom domain**:
   ```bash
   gcloud run domain-mappings create --service=photo-enhancement-frontend --domain=yourdomain.com --region=us-central1
   ```

2. **Configure DNS** with the provided CNAME records

3. **SSL Certificate** will be automatically provisioned

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Cloud Build logs: `gcloud builds log [BUILD_ID]`
   - Verify Dockerfile syntax
   - Ensure all dependencies are properly specified

2. **Service Not Starting**
   - Check service logs: `gcloud logs read`
   - Verify environment variables
   - Check health check endpoints

3. **Database Connection Issues**
   - Verify Supabase connection string
   - Check firewall rules
   - Ensure SSL configuration

### Useful Commands

```bash
# Check service status
gcloud run services list --region=us-central1

# View service details
gcloud run services describe [SERVICE_NAME] --region=us-central1

# Update service
gcloud run services update [SERVICE_NAME] --region=us-central1 [OPTIONS]

# Delete service
gcloud run services delete [SERVICE_NAME] --region=us-central1
```

## Cost Optimization

1. **Right-size resources** based on actual usage
2. **Use minimum instances** of 0 for frontend (cold starts acceptable)
3. **Monitor billing** and set up budget alerts
4. **Optimize images** for smaller size and faster deployments

## Backup and Disaster Recovery

1. **Database Backups**: Handled by Supabase
2. **Code Repository**: Ensure Git repository is backed up
3. **Container Images**: Stored in Google Container Registry
4. **Configuration**: Document all environment variables and settings

## Support

For issues related to:
- **GCP Services**: [Google Cloud Support](https://cloud.google.com/support)
- **Application Code**: Check application logs and documentation
- **Database**: [Supabase Support](https://supabase.com/support)

---

**Note**: Remember to replace placeholder values (API keys, URLs, etc.) with actual production values before deployment.