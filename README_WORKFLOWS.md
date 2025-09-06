# Photo Enhancement Application - Complete Workflow Documentation

## 🎯 Overview

This repository contains comprehensive workflow documentation for the Photo Enhancement application, a full-stack solution built with Vue.js, Strapi, and deployed on Google Cloud Platform.

## 📚 Documentation Structure

### 1. **[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)**
Complete guide for local development, including:
- **Environment setup** with Docker and manual options
- **Development commands** for both frontend and backend
- **Code quality standards** and automated tooling
- **Database development** patterns
- **Build and deployment** processes
- **Debugging techniques** for local development
- **Security best practices**
- **Performance monitoring** during development

**Key Features:**
- ✅ Docker Compose setup for full-stack development
- ✅ Hot reload for both frontend and backend
- ✅ Automated testing with watch mode
- ✅ Code formatting and linting automation
- ✅ Git hooks for quality gates
- ✅ Emergency rollback procedures

### 2. **[TESTING_STRATEGY.md](./TESTING_STRATEGY.md)**
Comprehensive testing approach covering all application layers:
- **Unit testing** with Vitest (frontend) and Jest (backend)
- **Integration testing** for API endpoints and workflows
- **End-to-end testing** with Playwright
- **Performance testing** and benchmarks
- **Visual regression testing**
- **Test automation** pipelines

**Coverage Requirements:**
- 📊 Unit Tests: 70% (Vitest + Jest)
- 🔗 Integration Tests: 20% (Supertest + API testing)
- 🎭 E2E Tests: 10% (Playwright)
- 🎯 Target: ≥80% overall coverage

### 3. **[DEPLOYMENT_AUTOMATION.md](./DEPLOYMENT_AUTOMATION.md)**
Production-ready deployment pipeline with:
- **Infrastructure as Code** using Terraform
- **Multi-environment support** (dev/staging/prod)
- **Blue-green deployments** with automated rollbacks
- **Secret management** with Google Cloud Secret Manager
- **Monitoring and alerting** setup
- **CI/CD pipelines** with Google Cloud Build
- **Security scanning** and compliance

**Deployment Features:**
- 🚀 Automated multi-stage builds
- 🔒 Security scanning with Trivy
- 📊 Health checks and validation
- 🔄 Automatic rollback on failure
- 📈 Performance monitoring
- 🔐 Secret rotation automation

### 4. **[MONITORING_DEBUGGING.md](./MONITORING_DEBUGGING.md)**
Production monitoring and debugging toolkit:
- **Application monitoring** with custom metrics
- **Infrastructure monitoring** using Cloud Monitoring
- **Error tracking** and alerting
- **Performance analysis** tools
- **Debug workflows** for production issues
- **Business metrics** tracking

**Monitoring Stack:**
- 📊 Google Cloud Monitoring for infrastructure
- 🔍 Structured logging with correlation IDs
- 🚨 Custom alerts for critical metrics
- 📈 Performance dashboards
- 🔧 Interactive debugging tools

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: ^20.19.0 || ≥22.12.0
- **Docker**: Latest stable (optional but recommended)
- **Google Cloud CLI**: Latest (for deployment)

### Automated Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd EEF-Photo-Enhancement

# Run automated setup script
chmod +x scripts/setup-development.sh
./scripts/setup-development.sh

# Start development environment
./start-dev.sh
```

### Manual Setup
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup environment files
cp backend/.env.example backend/.env.local
cp frontend/.env.example frontend/.env.local
# Edit .env.local files with your configuration

# Start services
# Terminal 1: Backend
cd backend && npm run develop

# Terminal 2: Frontend  
cd frontend && npm run dev
```

## 🛠️ Development Commands

### Daily Development
```bash
# Start full development environment
./start-dev.sh                    # Manual start
./start-docker.sh                 # Docker Compose

# Run tests
cd frontend && npm run test:watch  # Frontend tests with watch
cd backend && npm test -- --watch  # Backend tests with watch

# Code quality
npm run lint                       # ESLint
npm run type-check                 # TypeScript validation
npm run format                     # Prettier formatting
```

### Testing
```bash
# Unit tests
cd frontend && npm test            # Vitest tests
cd backend && npm test             # Jest tests

# Integration tests
npm run test:integration           # API integration tests

# E2E tests
npm run test:e2e                   # Playwright E2E tests
npm run test:e2e -- --ui          # With Playwright UI
```

### Build and Deploy
```bash
# Local build testing
docker-compose -f docker-compose.prod.yml build

# Deploy to staging
git push origin develop

# Deploy to production
git push origin main

# Manual GCP deployment
./scripts/deploy-environment.sh prod
```

## 📊 Application Architecture

### Tech Stack
- **Frontend**: Vue.js 3 + TypeScript + Tailwind CSS + Pinia
- **Backend**: Strapi v5 + Node.js + SQLite
- **Deployment**: Google Cloud Run + Cloud Build
- **Monitoring**: Google Cloud Monitoring + Custom metrics
- **Testing**: Vitest + Playwright + Jest

### Key Components
- **Photo Enhancement**: AI-powered with Google Generative AI
- **Payment Processing**: Stripe integration with webhooks
- **User Management**: Strapi authentication with JWT
- **File Storage**: Local filesystem with planned Cloud Storage migration
- **Credit System**: Freemium model with usage tracking

## 🔍 Debugging and Troubleshooting

### Local Development Issues
```bash
# Reset development environment
docker-compose down --volumes
docker system prune -f
rm -rf backend/.tmp backend/node_modules frontend/node_modules
npm install  # In both directories

# Check service health
curl http://localhost:5992/api/health
curl http://localhost:8240  # Frontend health
```

### Production Debugging
```bash
# Quick health check
curl https://photo-enhancement-backend-925756614203.us-central1.run.app/api/health

# View recent logs
gcloud logs tail "resource.type=cloud_run_revision" \
  --filter="resource.labels.service_name=photo-enhancement-backend-prod" \
  --limit=50

# Interactive debugging session
./scripts/debug-session.sh
```

### Common Solutions
| Issue | Solution |
|-------|----------|
| 405 Method Not Allowed | Check Strapi route registration |
| CORS errors | Update `middlewares.js` CORS config |
| Build failures | Clear caches and reinstall dependencies |
| Database issues | Reset SQLite database in `.tmp/` folder |
| Environment issues | Verify `.env.local` configuration |

## 📈 Performance Benchmarks

### Target Performance Metrics
- **Page Load Time**: <3s on 3G network
- **API Response Time**: <200ms average
- **Photo Enhancement**: <60s processing time
- **Error Rate**: <1% for critical operations
- **Uptime**: 99.9% availability target

### Monitoring Thresholds
- **Memory Usage**: <90% of allocated resources
- **CPU Usage**: <80% average, <95% peak
- **Disk Usage**: <85% of available space
- **Response Time**: Alert if >2s sustained

## 🔐 Security Considerations

### Development Security
- Environment variables in `.env.local` (never committed)
- API key rotation procedures
- Dependency vulnerability scanning
- Code security analysis

### Production Security
- Google Cloud Secret Manager integration
- HTTPS enforcement with automatic certificates
- Database connection encryption
- CORS and CSP headers configuration

## 📋 Workflow Checklists

### Pre-Development Setup
- [ ] Node.js 20.19+ installed
- [ ] Docker installed and running
- [ ] Google Cloud CLI authenticated
- [ ] Environment files configured
- [ ] Dependencies installed
- [ ] Git hooks setup

### Before Committing
- [ ] Tests passing (`npm test`)
- [ ] Code linted (`npm run lint`)
- [ ] TypeScript checks (`npm run type-check`)
- [ ] Build successful (`npm run build`)
- [ ] Manual testing completed
- [ ] Environment variables not exposed

### Before Deployment
- [ ] All tests passing in CI
- [ ] Security scans completed
- [ ] Performance benchmarks met
- [ ] Database migrations applied
- [ ] Monitoring alerts configured
- [ ] Rollback plan prepared

## 📞 Support and Resources

### Internal Documentation
- [Application State](./APPLICATION_STATE.md) - Current deployment status
- [GCP Deployment Guide](./DEPLOYMENT-GCP.md) - Basic deployment instructions

### External Resources
- [Vue.js Documentation](https://vuejs.org/guide/)
- [Strapi Documentation](https://docs.strapi.io/dev-docs/intro)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Playwright Testing](https://playwright.dev/)

### Getting Help
1. Check the troubleshooting sections in each workflow document
2. Review application logs using the debugging commands
3. Use the interactive debugging session script
4. Consult the monitoring dashboards for system health

---

## 🎯 Next Steps

1. **Complete Environment Setup**: Run the setup script and configure your API keys
2. **Start Development**: Use the quick start guide to begin development
3. **Run Tests**: Ensure all test suites are working correctly
4. **Deploy to Staging**: Test the deployment pipeline
5. **Configure Monitoring**: Set up alerts and dashboards
6. **Performance Testing**: Run load tests and optimization

**Remember**: These workflows are designed to be practical and immediately actionable. Each document contains specific commands, configuration files, and best practices that can be implemented right away.

Happy coding! 🚀