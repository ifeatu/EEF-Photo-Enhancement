# Photo Enhancement Application - Development Workflow

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: ^20.19.0 || >=22.12.0
- **Docker**: Latest stable version
- **Google Cloud CLI**: Latest version
- **Git**: Latest version

### Environment Setup
```bash
# Clone and setup project
git clone <repository-url>
cd EEF-Photo-Enhancement

# Setup backend environment
cp backend/.env.example backend/.env.local
# Edit backend/.env.local with your keys

# Setup frontend environment  
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your API URLs

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

## 🏗️ Local Development

### Option 1: Docker Compose (Recommended)
```bash
# Start full stack with hot reload
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down
```

**Access Points:**
- Frontend: http://localhost:8240
- Backend: http://localhost:5992
- Backend Admin: http://localhost:5992/admin

### Option 2: Manual Development
```bash
# Terminal 1: Backend
cd backend
npm run develop

# Terminal 2: Frontend  
cd frontend
npm run dev

# Terminal 3: Testing (optional)
npm run test:watch
```

### Development Commands
```bash
# Backend commands
cd backend
npm run develop        # Start development server with hot reload
npm run build         # Build for production
npm run start         # Start production server
npm run console       # Access Strapi console
npm run strapi        # Run Strapi CLI commands

# Frontend commands  
cd frontend
npm run dev           # Start development server
npm run build         # Build for production
npm run preview       # Preview production build
npm run test          # Run unit tests
npm run test:ui       # Run tests with UI
npm run coverage      # Generate test coverage
npm run lint          # Run ESLint
npm run type-check    # Run TypeScript checks
```

## 🔧 Development Workflow

### 1. Feature Development Flow
```bash
# 1. Create feature branch
git checkout -b feature/photo-enhancement-optimization

# 2. Setup development environment
docker-compose up -d

# 3. Make changes with hot reload active

# 4. Run tests continuously
cd frontend && npm run test:watch
cd backend && npm test -- --watch

# 5. Pre-commit validation
npm run lint
npm run type-check
npm run test:run

# 6. Commit with conventional commits
git commit -m "feat: add photo quality enhancement algorithm"
```

### 2. Code Quality Standards
```bash
# Automated code formatting
cd frontend && npm run format
cd backend && npm run format

# Linting and fixes
cd frontend && npm run lint
cd backend && npm run lint

# Type checking
cd frontend && npm run type-check
cd backend && npm run type-check
```

### 3. Database Development
```bash
# Reset local database
rm backend/.tmp/data.db
npm run develop  # Will recreate with fresh schema

# Access Strapi admin
# Navigate to http://localhost:5992/admin
# Create admin user on first run

# Import/Export data
cd backend
npm run strapi export -- --file backup.tar.gz
npm run strapi import -- --file backup.tar.gz
```

## 🧪 Testing Strategy

### Unit Tests (Frontend)
```bash
cd frontend

# Run all tests
npm test

# Run with UI
npm run test:ui

# Run specific test file
npx vitest src/test/api.test.ts

# Generate coverage report
npm run coverage
```

### Integration Tests
```bash
# API endpoint tests
node test-api-endpoints.js

# Photo upload flow
node test-gcp-photo-upload.js  

# User registration flow
node test-gcp-registration.js

# Full enhancement pipeline
node test-enhancement.js
```

### End-to-End Testing Setup
```bash
# Install Playwright (run once)
cd frontend
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e -- --ui

# Debug specific test
npm run test:e2e -- --debug photo-upload.spec.ts
```

## 📦 Build and Deployment

### Local Build Testing
```bash
# Build both services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Test production builds locally
docker-compose -f docker-compose.prod.yml up

# Clean build artifacts
docker-compose down --volumes
docker system prune -f
```

### GCP Deployment
```bash
# Deploy backend only
gcloud builds submit --config cloudbuild.yaml . --substitutions=_SERVICE=backend

# Deploy frontend only  
gcloud builds submit --config frontend-cloudbuild.yaml . --substitutions=_SERVICE=frontend

# Deploy both (full deployment)
./deploy-gcp.sh

# Monitor deployment
gcloud builds list --limit=5
gcloud run services list --region=us-central1
```

### Environment Management
```bash
# View current environment
gcloud config list
gcloud run services describe photo-enhancement-backend --region=us-central1

# Update environment variables
gcloud run services update photo-enhancement-backend \
  --region=us-central1 \
  --set-env-vars="NODE_ENV=production,DEBUG_MODE=false"

# View logs
gcloud logs tail "resource.type=cloud_run_revision" --filter="resource.labels.service_name=photo-enhancement-backend"
```

## 🔍 Debugging and Troubleshooting

### Local Development Issues

#### Backend Issues
```bash
# Check Strapi health
curl http://localhost:5992/api/health

# View detailed logs
cd backend
DEBUG=strapi:* npm run develop

# Database issues
rm .tmp/data.db  # Reset SQLite
npm run develop  # Recreate schema
```

#### Frontend Issues
```bash
# Check build errors
cd frontend
npm run build -- --mode development

# Network/API issues
VITE_DEBUG_API=true npm run dev

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### Common Error Solutions

#### 405 Method Not Allowed
```bash
# Check route registration
cd backend/src/api/photo
# Ensure routes/photo.js exports correct methods
# Restart backend after route changes
```

#### CORS Issues
```bash
# Update backend config
# Edit backend/config/middlewares.js
# Add frontend URL to CORS origin list
# Restart backend
```

#### Build Failures
```bash
# Clear all caches
docker system prune -f
rm -rf backend/node_modules frontend/node_modules
rm -rf backend/.tmp frontend/dist

# Reinstall dependencies
cd backend && npm ci
cd frontend && npm ci
```

### Production Debugging
```bash
# View Cloud Run logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=photo-enhancement-backend" --limit=100

# Debug cold starts
gcloud run services update photo-enhancement-backend \
  --min-instances=1 --region=us-central1

# Monitor performance
gcloud monitoring dashboards list
```

## 🔐 Security Best Practices

### Development Security
```bash
# Check for vulnerabilities
cd backend && npm audit
cd frontend && npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies securely
npm update
```

### Environment Security
```bash
# Never commit secrets to git
echo "*.env*" >> .gitignore
echo ".env*" >> .gitignore

# Use Google Secret Manager in production
gcloud secrets create stripe-secret-key --data-file=stripe-key.txt
gcloud secrets create gemini-api-key --data-file=gemini-key.txt
```

### API Security Testing
```bash
# Test authentication
curl -X POST http://localhost:5992/api/auth/local \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@test.com","password":"wrongpassword"}'

# Test protected endpoints
curl -X GET http://localhost:5992/api/photos \
  -H "Authorization: Bearer invalid-token"
```

## 📊 Performance Monitoring

### Local Performance Testing
```bash
# Frontend bundle analysis
cd frontend
npm run build
npx vite-bundle-analyzer dist

# Backend performance
cd backend  
npm install clinic
clinic doctor -- npm start
```

### Load Testing
```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io

# Run load tests
k6 run load-tests/api-load-test.js
```

### Lighthouse CI
```bash
cd frontend
npm install -g @lhci/cli
lhci autorun
```

## 🤖 Automation and CI/CD

### Git Hooks Setup
```bash
# Install husky for git hooks
cd frontend
npm install --save-dev husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run type-check && npm run test:run"
```

### GitHub Actions (if using GitHub)
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run build
```

## 📋 Daily Development Checklist

### Morning Setup
- [ ] `git pull origin main`
- [ ] `docker-compose up -d`
- [ ] Check service health at localhost:5992 and localhost:8240
- [ ] Run `npm run test:watch` in background

### Before Committing
- [ ] `npm run lint` (both frontend/backend)
- [ ] `npm run type-check` 
- [ ] `npm run test:run`
- [ ] Test key functionality manually
- [ ] Write meaningful commit message

### End of Day
- [ ] `git push origin feature-branch`
- [ ] `docker-compose down`
- [ ] Document any blockers or issues

## 🆘 Quick Reference Commands

```bash
# Emergency deployment rollback
gcloud run services update photo-enhancement-backend \
  --image=us-central1-docker.pkg.dev/PROJECT_ID/photo-enhancement/backend:previous-build-id \
  --region=us-central1

# Quick health check
curl https://photo-enhancement-backend-925756614203.us-central1.run.app/api/health

# Reset local development
docker-compose down --volumes
docker system prune -f
rm -rf backend/.tmp
npm run develop

# Emergency log access
gcloud logs tail "resource.type=cloud_run_revision" \
  --filter="resource.labels.service_name=photo-enhancement-backend" \
  --format="value(textPayload)"
```

---

**Next Steps:**
1. Set up your local development environment
2. Run the test suite to ensure everything works
3. Review the Testing Strategy document
4. Check the Deployment Guide for production workflows