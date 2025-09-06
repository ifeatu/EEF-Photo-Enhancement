# Deployment Automation - Enhanced GCP Pipeline

## 🚀 Deployment Architecture Overview

### Multi-Environment Strategy
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │     Staging     │    │   Production    │
│                 │    │                 │    │                 │
│ • Local Docker  │───▶│ • GCP Dev Env   │───▶│ • GCP Prod Env  │
│ • Hot Reload    │    │ • Feature Tests │    │ • Auto Scaling  │  
│ • Debug Mode    │    │ • Integration   │    │ • Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Infrastructure as Code
- **Terraform**: Infrastructure provisioning
- **Cloud Build**: CI/CD pipeline
- **Cloud Run**: Container orchestration
- **Secret Manager**: Secure configuration
- **Cloud Monitoring**: Observability

## 🏗️ Enhanced Infrastructure Setup

### Terraform Configuration
```hcl
# infrastructure/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  
  backend "gcs" {
    bucket = "photo-enhancement-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "rational-camera-471203-n5"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

# Enable APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "containerregistry.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudtrace.googleapis.com"
  ])
  
  service = each.value
  disable_on_destroy = false
}

# Artifact Registry
resource "google_artifact_registry_repository" "photo_enhancement" {
  location      = var.region
  repository_id = "photo-enhancement"
  description   = "Docker repository for photo enhancement app"
  format        = "DOCKER"
}

# Service Accounts
resource "google_service_account" "app_service_account" {
  account_id   = "photo-enhancement-${var.environment}"
  display_name = "Photo Enhancement App Service Account"
  description  = "Service account for photo enhancement application"
}

# IAM Bindings
resource "google_project_iam_member" "app_service_account_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/storage.objectAdmin", 
    "roles/secretmanager.secretAccessor",
    "roles/monitoring.metricWriter",
    "roles/logging.logWriter",
    "roles/cloudtrace.agent"
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.app_service_account.email}"
}

# Cloud Storage Bucket
resource "google_storage_bucket" "photo_uploads" {
  name          = "${var.project_id}-photo-uploads-${var.environment}"
  location      = var.region
  force_destroy = var.environment != "prod"
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = var.environment == "prod"
  }
  
  lifecycle_rule {
    condition {
      age = var.environment == "prod" ? 365 : 30
    }
    action {
      type = "Delete"
    }
  }
}

# Secrets
resource "google_secret_manager_secret" "app_secrets" {
  for_each = toset([
    "stripe-secret-key",
    "gemini-api-key", 
    "jwt-secret",
    "admin-jwt-secret",
    "api-token-salt",
    "transfer-token-salt"
  ])
  
  secret_id = "${each.key}-${var.environment}"
  
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

# Cloud Run Services
resource "google_cloud_run_service" "backend" {
  name     = "photo-enhancement-backend-${var.environment}"
  location = var.region

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = var.environment == "prod" ? "10" : "3"
        "autoscaling.knative.dev/minScale" = var.environment == "prod" ? "1" : "0"
        "run.googleapis.com/execution-environment" = "gen2"
      }
    }
    
    spec {
      container_concurrency = 80
      timeout_seconds      = 300
      service_account_name = google_service_account.app_service_account.email
      
      containers {
        image = "gcr.io/${var.project_id}/photo-enhancement-backend:latest"
        
        ports {
          container_port = 1337
        }
        
        resources {
          limits = {
            cpu    = "2000m"
            memory = "2Gi"
          }
        }
        
        env {
          name  = "NODE_ENV"
          value = var.environment == "prod" ? "production" : "development"
        }
        
        env {
          name  = "HOST"
          value = "0.0.0.0"
        }
        
        env {
          name  = "PORT"
          value = "1337"
        }
        
        # Secrets from Secret Manager
        dynamic "env" {
          for_each = {
            "STRIPE_SECRET_KEY" = "stripe-secret-key"
            "GEMINI_API_KEY"   = "gemini-api-key"
            "JWT_SECRET"       = "jwt-secret"
            "ADMIN_JWT_SECRET" = "admin-jwt-secret"
            "API_TOKEN_SALT"   = "api-token-salt"
            "TRANSFER_TOKEN_SALT" = "transfer-token-salt"
          }
          
          content {
            name = env.key
            value_from {
              secret_key_ref {
                name = google_secret_manager_secret.app_secrets[env.value].secret_id
                key  = "latest"
              }
            }
          }
        }
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [google_project_service.required_apis]
}

resource "google_cloud_run_service" "frontend" {
  name     = "photo-enhancement-frontend-${var.environment}"
  location = var.region

  template {
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "5"
        "autoscaling.knative.dev/minScale" = "0"
        "run.googleapis.com/execution-environment" = "gen2"
      }
    }
    
    spec {
      container_concurrency = 100
      timeout_seconds      = 60
      
      containers {
        image = "gcr.io/${var.project_id}/photo-enhancement-frontend:latest"
        
        ports {
          container_port = 8240
        }
        
        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
}

# IAM for public access
resource "google_cloud_run_service_iam_member" "public_access" {
  for_each = toset([
    google_cloud_run_service.backend.name,
    google_cloud_run_service.frontend.name
  ])
  
  location = var.region
  project  = var.project_id  
  service  = each.value
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Outputs
output "backend_url" {
  value = google_cloud_run_service.backend.status[0].url
}

output "frontend_url" {
  value = google_cloud_run_service.frontend.status[0].url
}
```

### Environment-Specific Variables
```hcl
# infrastructure/environments/prod.tfvars
project_id  = "rational-camera-471203-n5"
region      = "us-central1"
environment = "prod"

# infrastructure/environments/staging.tfvars
project_id  = "rational-camera-471203-n5"
region      = "us-central1" 
environment = "staging"
```

## 🔧 Enhanced Cloud Build Configuration

### Multi-Stage Build Pipeline
```yaml
# cloudbuild-enhanced.yaml
steps:
  # 1. Install dependencies and run tests
  - name: 'node:20-alpine'
    id: 'install-and-test-backend'
    dir: 'backend'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        npm ci --only=production
        npm run test:ci || exit 1
    waitFor: ['-']

  - name: 'node:20-alpine'
    id: 'install-and-test-frontend'
    dir: 'frontend'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        npm ci
        npm run test:run
        npm run build
    waitFor: ['-']

  # 2. Security scanning
  - name: 'gcr.io/cloud-builders/docker'
    id: 'security-scan-backend'
    args: ['run', '--rm', '-v', '${PWD}/backend:/app', 'aquasec/trivy:latest', 'fs', '--severity', 'HIGH,CRITICAL', '/app']
    waitFor: ['install-and-test-backend']

  # 3. Build Docker images with multi-arch support
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-backend'
    args:
      - 'buildx'
      - 'build'
      - '--platform=linux/amd64,linux/arm64'
      - '--push'
      - '-t'
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/backend:$BUILD_ID'
      - '-t'
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/backend:latest'
      - '-t'
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/backend:${_ENVIRONMENT}-latest'
      - './backend'
    waitFor: ['install-and-test-backend', 'security-scan-backend']

  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-frontend'
    args:
      - 'buildx'
      - 'build'
      - '--platform=linux/amd64,linux/arm64'  
      - '--push'
      - '-t'
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/frontend:$BUILD_ID'
      - '-t'
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/frontend:latest'
      - '-t'
      - '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/frontend:${_ENVIRONMENT}-latest'
      - './frontend'
    waitFor: ['install-and-test-frontend']

  # 4. Deploy with blue-green strategy
  - name: 'gcr.io/cloud-builders/gcloud'
    id: 'deploy-backend-staging'
    args:
      - 'run'
      - 'deploy'
      - 'photo-enhancement-backend-${_ENVIRONMENT}-staging'
      - '--image=${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/backend:$BUILD_ID'
      - '--region=${_REGION}'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--port=1337'
      - '--memory=2Gi'
      - '--cpu=2'
      - '--max-instances=3'
      - '--min-instances=0'
      - '--timeout=300'
      - '--concurrency=80'
      - '--service-account=photo-enhancement-${_ENVIRONMENT}@$PROJECT_ID.iam.gserviceaccount.com'
      - '--set-env-vars=NODE_ENV=${_ENVIRONMENT},HOST=0.0.0.0,PORT=1337'
      - '--revision-suffix=build-$BUILD_ID'
      - '--tag=staging'
      - '--no-traffic'
    waitFor: ['build-backend']

  # 5. Health check staging deployment
  - name: 'gcr.io/cloud-builders/curl'
    id: 'health-check-staging'
    args:
      - '-f'
      - '--retry'
      - '5'
      - '--retry-delay'
      - '10'
      - '--max-time'
      - '30'
      - 'https://photo-enhancement-backend-${_ENVIRONMENT}-staging-$BUILD_ID---$PROJECT_ID.${_REGION}.run.app/api/health'
    waitFor: ['deploy-backend-staging']

  # 6. Run integration tests against staging
  - name: 'node:20-alpine'
    id: 'integration-tests'
    dir: 'backend'
    env:
      - 'API_BASE_URL=https://photo-enhancement-backend-${_ENVIRONMENT}-staging-$BUILD_ID---$PROJECT_ID.${_REGION}.run.app'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        npm install --only=dev
        npm run test:integration
    waitFor: ['health-check-staging']

  # 7. Deploy to production with traffic migration
  - name: 'gcr.io/cloud-builders/gcloud'
    id: 'deploy-backend-prod'
    args:
      - 'run'
      - 'deploy'
      - 'photo-enhancement-backend-${_ENVIRONMENT}'
      - '--image=${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/backend:$BUILD_ID'
      - '--region=${_REGION}'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--port=1337'
      - '--memory=2Gi'
      - '--cpu=2'
      - '--max-instances=10'
      - '--min-instances=1'
      - '--timeout=300'
      - '--concurrency=80'
      - '--service-account=photo-enhancement-${_ENVIRONMENT}@$PROJECT_ID.iam.gserviceaccount.com'
      - '--set-env-vars=NODE_ENV=production,HOST=0.0.0.0,PORT=1337'
      - '--revision-suffix=build-$BUILD_ID'
      - '--tag=latest'
      - '--traffic=latest=100'
    waitFor: ['integration-tests']

  - name: 'gcr.io/cloud-builders/gcloud'
    id: 'deploy-frontend-prod'
    args:
      - 'run'
      - 'deploy'
      - 'photo-enhancement-frontend-${_ENVIRONMENT}'
      - '--image=${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/frontend:$BUILD_ID'
      - '--region=${_REGION}'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--port=8240'
      - '--memory=512Mi'
      - '--cpu=1'
      - '--max-instances=5'
      - '--min-instances=0'
      - '--timeout=60'
      - '--concurrency=100'
      - '--revision-suffix=build-$BUILD_ID'
      - '--tag=latest'
      - '--traffic=latest=100'
    waitFor: ['deploy-backend-prod']

  # 8. Post-deployment validation
  - name: 'gcr.io/cloud-builders/curl'
    id: 'validate-deployment'
    args:
      - '-f'
      - '--retry'
      - '3'
      - '--retry-delay'
      - '5'
      - '--max-time'
      - '30'
      - 'https://photo-enhancement-backend-${_ENVIRONMENT}---$PROJECT_ID.${_REGION}.run.app/api/health'
    waitFor: ['deploy-backend-prod', 'deploy-frontend-prod']

  # 9. Clean up old revisions (keep last 5)
  - name: 'gcr.io/cloud-builders/gcloud'
    id: 'cleanup-old-revisions'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Get all revisions for backend service
        revisions=$(gcloud run revisions list --service=photo-enhancement-backend-${_ENVIRONMENT} --region=${_REGION} --format="value(metadata.name)" --sort-by="~metadata.creationTimestamp")
        
        # Keep only the latest 5 revisions, delete the rest
        echo "$revisions" | tail -n +6 | while read revision; do
          if [ ! -z "$revision" ]; then
            echo "Deleting old revision: $revision"
            gcloud run revisions delete "$revision" --region=${_REGION} --quiet
          fi
        done
    waitFor: ['validate-deployment']

# Substitutions
substitutions:
  _REGION: 'us-central1'
  _REPOSITORY: 'photo-enhancement'
  _ENVIRONMENT: 'prod'

# Options
options:
  machineType: 'E2_HIGHCPU_8'
  diskSizeGb: 100
  logging: CLOUD_LOGGING_ONLY
  substitutionOption: 'ALLOW_LOOSE'
  dynamic_substitutions: true

# Timeout
timeout: 2400s # 40 minutes

# Images to store
images:
  - '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/backend:$BUILD_ID'
  - '${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPOSITORY}/frontend:$BUILD_ID'
```

### Branch-Based Deployments
```yaml
# cloudbuild-triggers.yaml

# Production deployment (main branch)
- name: 'prod-deployment'
  github:
    owner: 'your-github-username'
    name: 'photo-enhancement'
    push:
      branch: '^main$'
  filename: 'cloudbuild-enhanced.yaml'
  substitutions:
    _ENVIRONMENT: 'prod'
    _REGION: 'us-central1'
    _REPOSITORY: 'photo-enhancement'

# Staging deployment (develop branch)  
- name: 'staging-deployment'
  github:
    owner: 'your-github-username'
    name: 'photo-enhancement'
    push:
      branch: '^develop$'
  filename: 'cloudbuild-enhanced.yaml'
  substitutions:
    _ENVIRONMENT: 'staging'
    _REGION: 'us-central1'
    _REPOSITORY: 'photo-enhancement'

# Feature branch deployment (feature/* branches)
- name: 'feature-deployment'
  github:
    owner: 'your-github-username'
    name: 'photo-enhancement'
    push:
      branch: '^feature/.*$'
  filename: 'cloudbuild-feature.yaml'
  substitutions:
    _ENVIRONMENT: 'dev'
    _REGION: 'us-central1'
    _REPOSITORY: 'photo-enhancement'
```

## 🔒 Security and Secret Management

### Secret Management Setup
```bash
#!/bin/bash
# scripts/setup-secrets.sh

set -e

PROJECT_ID="rational-camera-471203-n5"
ENVIRONMENT="prod"

echo "Setting up secrets for environment: $ENVIRONMENT"

# Create secrets if they don't exist
secrets=(
  "stripe-secret-key"
  "gemini-api-key" 
  "jwt-secret"
  "admin-jwt-secret"
  "api-token-salt"
  "transfer-token-salt"
  "app-keys"
)

for secret in "${secrets[@]}"; do
  secret_name="${secret}-${ENVIRONMENT}"
  
  # Check if secret exists
  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "Secret $secret_name already exists"
  else
    echo "Creating secret: $secret_name"
    gcloud secrets create "$secret_name" \
      --project="$PROJECT_ID" \
      --replication-policy="user-managed" \
      --locations="us-central1"
    
    # Generate secure random value for secrets that need it
    case $secret in
      "jwt-secret"|"admin-jwt-secret"|"api-token-salt"|"transfer-token-salt")
        openssl rand -hex 32 | gcloud secrets versions add "$secret_name" --data-file=- --project="$PROJECT_ID"
        ;;
      "app-keys")
        echo "$(openssl rand -hex 16),$(openssl rand -hex 16),$(openssl rand -hex 16),$(openssl rand -hex 16)" | \
        gcloud secrets versions add "$secret_name" --data-file=- --project="$PROJECT_ID"
        ;;
      *)
        echo "Please manually set the value for $secret_name using:"
        echo "echo 'your-secret-value' | gcloud secrets versions add $secret_name --data-file=- --project=$PROJECT_ID"
        ;;
    esac
  fi
done

# Grant access to service account
SERVICE_ACCOUNT="photo-enhancement-${ENVIRONMENT}@${PROJECT_ID}.iam.gserviceaccount.com"

for secret in "${secrets[@]}"; do
  secret_name="${secret}-${ENVIRONMENT}"
  gcloud secrets add-iam-policy-binding "$secret_name" \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID"
done

echo "Secrets setup complete!"
```

### Environment Configuration
```bash
#!/bin/bash
# scripts/deploy-environment.sh

set -e

ENVIRONMENT=${1:-prod}
PROJECT_ID="rational-camera-471203-n5"
REGION="us-central1"

echo "Deploying to environment: $ENVIRONMENT"

# Set gcloud project
gcloud config set project "$PROJECT_ID"

# Deploy infrastructure
echo "Deploying infrastructure..."
cd infrastructure
terraform init -backend-config="bucket=${PROJECT_ID}-terraform-state"
terraform workspace select "$ENVIRONMENT" || terraform workspace new "$ENVIRONMENT"
terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out="terraform.plan"
terraform apply "terraform.plan"

# Get infrastructure outputs
BACKEND_SERVICE_NAME=$(terraform output -raw backend_service_name)
FRONTEND_SERVICE_NAME=$(terraform output -raw frontend_service_name)

cd ..

# Trigger deployment
echo "Triggering deployment..."
gcloud builds submit \
  --config="cloudbuild-enhanced.yaml" \
  --substitutions="_ENVIRONMENT=${ENVIRONMENT},_REGION=${REGION}" \
  .

echo "Deployment to $ENVIRONMENT complete!"
echo "Backend URL: $(gcloud run services describe $BACKEND_SERVICE_NAME --region=$REGION --format='value(status.url)')"
echo "Frontend URL: $(gcloud run services describe $FRONTEND_SERVICE_NAME --region=$REGION --format='value(status.url)')"
```

## 📊 Monitoring and Alerting

### Application Monitoring Setup
```yaml
# monitoring/uptime-checks.yaml
displayName: "Photo Enhancement Backend Health"
monitoredResource:
  type: "uptime_url"
  labels:
    project_id: "rational-camera-471203-n5"
    host: "photo-enhancement-backend-925756614203.us-central1.run.app"
httpCheck:
  path: "/api/health"
  port: 443
  useSsl: true
  validateSsl: true
period: 60s
timeout: 10s
selectedRegions:
  - "USA_OREGON" 
  - "USA_VIRGINIA"
  - "EUROPE_DUBLIN"
```

### Alert Policies
```yaml
# monitoring/alerts.yaml
displayName: "High Error Rate"
documentation:
  content: "Error rate is above 5% for more than 5 minutes"
  mimeType: "text/markdown"
conditions:
  - displayName: "Error rate condition"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND resource.label.service_name="photo-enhancement-backend-prod"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 0.05
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
          crossSeriesReducer: REDUCE_MEAN
          groupByFields:
            - "resource.label.service_name"
notificationChannels:
  - "projects/rational-camera-471203-n5/notificationChannels/email-alerts"
alertStrategy:
  autoClose: 1800s # 30 minutes
enabled: true
```

### Custom Metrics Collection
```javascript
// backend/src/monitoring/metrics.js
const { createPrometheusHistogram, createPrometheusCounter } = require('@google-cloud/monitoring')

class MetricsCollector {
  constructor() {
    this.requestDuration = createPrometheusHistogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code']
    })
    
    this.photoEnhancements = createPrometheusCounter({
      name: 'photo_enhancements_total',
      help: 'Total number of photo enhancements processed',
      labelNames: ['enhancement_type', 'status']
    })
    
    this.activeUsers = createPrometheusCounter({
      name: 'active_users_total', 
      help: 'Total number of active users',
      labelNames: ['user_type']
    })
  }
  
  recordRequest(method, route, statusCode, duration) {
    this.requestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration)
  }
  
  recordEnhancement(type, status) {
    this.photoEnhancements
      .labels(type, status)
      .inc()
  }
  
  recordActiveUser(userType) {
    this.activeUsers
      .labels(userType)
      .inc()
  }
}

module.exports = new MetricsCollector()
```

## 🔄 Rollback and Disaster Recovery

### Automated Rollback Script
```bash
#!/bin/bash
# scripts/rollback.sh

set -e

ENVIRONMENT=${1:-prod}
PROJECT_ID="rational-camera-471203-n5"
REGION="us-central1"
SERVICE_NAME="photo-enhancement-backend-${ENVIRONMENT}"

echo "Rolling back $SERVICE_NAME..."

# Get current revision
CURRENT_REVISION=$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --format="value(status.latestReadyRevisionName)")

# Get previous revision  
PREVIOUS_REVISION=$(gcloud run revisions list \
  --service="$SERVICE_NAME" \
  --region="$REGION" \
  --format="value(metadata.name)" \
  --sort-by="~metadata.creationTimestamp" \
  --limit=2 | tail -n 1)

if [ -z "$PREVIOUS_REVISION" ]; then
  echo "No previous revision found for rollback"
  exit 1
fi

echo "Rolling back from $CURRENT_REVISION to $PREVIOUS_REVISION"

# Update traffic to previous revision
gcloud run services update-traffic "$SERVICE_NAME" \
  --to-revisions="$PREVIOUS_REVISION=100" \
  --region="$REGION"

echo "Rollback complete!"

# Verify rollback
sleep 10
HEALTH_CHECK_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --format="value(status.url)")/api/health

if curl -f --max-time 30 "$HEALTH_CHECK_URL"; then
  echo "Health check passed after rollback"
else
  echo "Health check failed after rollback!"
  exit 1
fi
```

### Database Backup and Recovery
```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

ENVIRONMENT=${1:-prod}
PROJECT_ID="rational-camera-471203-n5"
BUCKET_NAME="${PROJECT_ID}-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Creating database backup for $ENVIRONMENT..."

# Export database (assuming Cloud SQL)
gcloud sql export sql "photo-enhancement-db-${ENVIRONMENT}" \
  "gs://${BUCKET_NAME}/database-backups/${ENVIRONMENT}/backup_${TIMESTAMP}.sql" \
  --project="$PROJECT_ID"

echo "Database backup created: gs://${BUCKET_NAME}/database-backups/${ENVIRONMENT}/backup_${TIMESTAMP}.sql"

# Clean up old backups (keep last 30 days)
gsutil -m rm -r "gs://${BUCKET_NAME}/database-backups/${ENVIRONMENT}/backup_$(date -d '30 days ago' +%Y%m%d)_*" 2>/dev/null || true

echo "Backup cleanup complete"
```

## 🚀 Deployment Commands

### Setup and Initial Deployment
```bash
# 1. Setup infrastructure
chmod +x scripts/*.sh
./scripts/setup-secrets.sh

# 2. Deploy infrastructure
cd infrastructure
terraform init -backend-config="bucket=rational-camera-471203-n5-terraform-state"
terraform plan -var-file="environments/prod.tfvars"
terraform apply -var-file="environments/prod.tfvars"

# 3. Setup build triggers
gcloud builds triggers import --source=cloudbuild-triggers.yaml

# 4. Manual deployment (if needed)
./scripts/deploy-environment.sh prod
```

### Regular Operations
```bash
# Deploy to staging
git push origin develop

# Deploy to production
git push origin main

# Manual rollback
./scripts/rollback.sh prod

# View deployment status
gcloud builds list --limit=10

# Check service health
curl https://photo-enhancement-backend-925756614203.us-central1.run.app/api/health

# View logs
gcloud logs tail "resource.type=cloud_run_revision" \
  --filter="resource.labels.service_name=photo-enhancement-backend-prod"
```

### Emergency Procedures
```bash
# Emergency rollback
./scripts/rollback.sh prod

# Scale down service (maintenance mode)
gcloud run services update photo-enhancement-backend-prod \
  --region=us-central1 \
  --max-instances=0

# Scale up service
gcloud run services update photo-enhancement-backend-prod \
  --region=us-central1 \
  --max-instances=10

# Create database backup
./scripts/backup-database.sh prod

# View critical alerts
gcloud alpha monitoring policies list --filter="enabled=true"
```

---

**Key Features:**
- ✅ Infrastructure as Code (Terraform)
- ✅ Multi-environment support (dev/staging/prod)
- ✅ Blue-green deployments
- ✅ Automated testing pipeline
- ✅ Security scanning
- ✅ Secret management
- ✅ Monitoring and alerting  
- ✅ Automated rollbacks
- ✅ Database backups
- ✅ Traffic management