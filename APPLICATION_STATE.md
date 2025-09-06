# Photo Enhancement Application - Current State Documentation

## 🏗️ **Application Overview**

A full-stack photo enhancement application built with Vue.js frontend and Strapi backend, deployed on Google Cloud Platform (GCP). The application provides AI-powered photo enhancement services with a freemium model.

## 🚀 **Current Deployment Status**

### **Production URLs (GCP)**
- **Backend**: `https://photo-enhancement-backend-925756614203.us-central1.run.app`
- **Frontend**: `https://frontend-925756614203.us-central1.run.app`
- **GCP Project**: `rational-camera-471203-n5`
- **Region**: `us-central1`

### **Deployment Method**
- **Platform**: Google Cloud Run (Containerized)
- **CI/CD**: Google Cloud Build
- **Build Config**: `cloudbuild.yaml` (backend), `frontend-cloudbuild.yaml` (frontend)
- **Container Registry**: Google Container Registry

## 🏛️ **Architecture**

### **Frontend (Vue.js)**
- **Framework**: Vue 3 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **State Management**: Pinia
- **Routing**: Vue Router
- **HTTP Client**: Axios

### **Backend (Strapi v5)**
- **Framework**: Strapi CMS/API
- **Runtime**: Node.js
- **Database**: SQLite (production)
- **File Storage**: Local filesystem
- **Authentication**: JWT (Strapi Users & Permissions)
- **Payment Processing**: Stripe
- **AI Service**: Google Generative AI

## 📊 **Database Schema**

### **Content Types**

#### **Photo**
```json
{
  "originalImage": "media",
  "enhancedImage": "media",
  "status": "enum[pending, processing, completed, failed]",
  "user": "relation(manyToOne)",
  "enhancementType": "enum[restore, enhance, colorize, upscale]",
  "processingStarted": "datetime",
  "processingCompleted": "datetime",
  "originalFileSize": "integer",
  "enhancedFileSize": "integer",
  "totalFileSize": "integer",
  "expiresAt": "datetime",
  "isExpired": "boolean"
}
```

#### **Credit Package**
```json
{
  "name": "string",
  "credits": "integer",
  "price": "decimal",
  "description": "text",
  "isActive": "boolean",
  "features": "json",
  "sortOrder": "integer"
}
```

#### **Purchase**
```json
{
  "user": "relation(manyToOne)",
  "creditPackage": "relation(manyToOne)",
  "stripePaymentIntentId": "string",
  "amount": "decimal",
  "credits": "integer",
  "status": "enum[pending, completed, failed, refunded]",
  "paymentDate": "datetime"
}
```

#### **User Extensions**
```json
{
  "credits": "integer",
  "freePhotosUsed": "integer",
  "storageUsed": "biginteger",
  "storageLimit": "biginteger",
  "stripeCustomerId": "string"
}
```

## 🔧 **API Endpoints**

### **Authentication**
- `POST /api/auth/local/register` - User registration
- `POST /api/auth/local` - User login

### **Photos** (Currently being fixed)
- `GET /api/photos` - List user photos
- `POST /api/photos` - Upload new photo
- `GET /api/photos/:id` - Get photo details
- `PUT /api/photos/:id` - Update photo
- `POST /api/photos/:id/enhance` - Enhance photo

### **Credit Packages**
- `GET /api/credit-packages` - List available packages
- `GET /api/credit-packages/:id` - Get package details

### **Purchases**
- `GET /api/purchases` - List user purchases
- `POST /api/purchases` - Create new purchase

## 🎯 **Business Logic**

### **Free Tier**
- **Free Photos**: 2 per user
- **Storage Limit**: 2GB per user
- **Photo Expiration**: 30 days

### **Credit System**
- **Starter Pack**: 20 credits for $9.99
- **Popular Pack**: 100 credits for $39.99
- **Professional Pack**: 500 credits for $149.99

### **Enhancement Types**
- **Restore**: Photo restoration
- **Enhance**: General enhancement
- **Colorize**: Black & white colorization
- **Upscale**: Image upscaling

## 🚨 **Current Issues & Status**

### **Active Issue: 405 Method Not Allowed**
- **Problem**: POST requests to `/api/photos` returning 405 error
- **Root Cause**: Custom route registration preventing proper API loading
- **Solution Applied**: Removed custom `index.js` from photo API to allow Strapi auto-generation
- **Status**: Deployment in progress

### **Working Features**
✅ User registration and authentication
✅ Frontend-backend connectivity
✅ Environment configuration
✅ GCP deployment pipeline
✅ Credit package API

### **Pending Tests**
🔄 Photo upload functionality
🔄 Photo enhancement processing
🔄 Free tier limits
🔄 Payment processing

## 📁 **Project Structure**

```
/Users/pierre/EEF-Photo-Enhancement/
├── backend/                 # Strapi backend
│   ├── src/
│   │   ├── api/            # API definitions
│   │   │   ├── photo/      # Photo API (custom routes)
│   │   │   ├── credit-package/
│   │   │   └── purchase/
│   │   ├── extensions/     # Strapi extensions
│   │   └── index.js        # Bootstrap configuration
│   ├── config/            # Strapi configuration
│   ├── Dockerfile         # Backend container
│   └── package.json
├── frontend/              # Vue.js frontend
│   ├── src/
│   │   ├── components/    # Vue components
│   │   ├── views/         # Page components
│   │   ├── services/      # API services
│   │   └── stores/        # Pinia stores
│   ├── Dockerfile         # Frontend container
│   └── package.json
├── cloudbuild.yaml        # Backend build config
├── frontend-cloudbuild.yaml # Frontend build config
└── test-*.js             # Testing scripts
```

## 🔐 **Environment Configuration**

### **Backend Environment Variables**
```bash
# Core Strapi
HOST=0.0.0.0
PORT=1337
APP_KEYS=<generated>
API_TOKEN_SALT=<generated>
ADMIN_JWT_SECRET=<generated>
TRANSFER_TOKEN_SALT=<generated>
JWT_SECRET=<generated>

# Database
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db

# External Services
STRIPE_SECRET_KEY=<stripe_key>
GOOGLE_AI_API_KEY=<google_ai_key>

# CORS
FRONTEND_URL=https://frontend-925756614203.us-central1.run.app
```

### **Frontend Environment Variables**
```bash
VITE_API_URL=https://photo-enhancement-backend-925756614203.us-central1.run.app
VITE_STRIPE_PUBLISHABLE_KEY=<stripe_public_key>
```

## 🛠️ **Development Commands**

### **Local Development**
```bash
# Backend
cd backend
npm run develop

# Frontend
cd frontend
npm run dev
```

### **GCP Deployment**
```bash
# Backend
gcloud builds submit --config cloudbuild.yaml .

# Frontend
gcloud builds submit --config frontend-cloudbuild.yaml .
```

### **Testing**
```bash
# API endpoints
node test-api-endpoints.js

# Photo upload
node test-gcp-photo-upload.js

# User registration
node test-gcp-registration.js
```

## 🔍 **Debugging Tools**

### **Available Test Scripts**
- `test-api-endpoints.js` - Basic API connectivity tests
- `test-working-api.js` - Compare working vs non-working APIs
- `test-gcp-photo-upload.js` - Photo upload functionality
- `test-gcp-registration.js` - User registration flow

### **Monitoring**
- **GCP Console**: Cloud Run logs and metrics
- **Build Logs**: Cloud Build history
- **Application Logs**: Strapi console output

## 📋 **Next Steps**

1. **Complete Route Fix**: Verify auto-generated routes resolve 405 error
2. **Restore Custom Routes**: Re-implement enhance and cleanup endpoints
3. **Test Photo Upload**: Verify multipart file upload works
4. **Test Enhancement**: Verify AI processing pipeline
5. **Test Free Tier**: Verify credit and storage limits
6. **Performance Optimization**: Monitor and optimize response times

## 🔗 **Key Dependencies**

### **Backend**
- `@strapi/strapi`: ^5.0.0
- `@google/generative-ai`: Latest
- `stripe`: ^17.0.0
- `sqlite3`: ^5.1.6

### **Frontend**
- `vue`: ^3.4.0
- `@vitejs/plugin-vue`: Latest
- `tailwindcss`: ^3.4.0
- `axios`: ^1.6.0
- `pinia`: ^2.1.0

---

**Last Updated**: January 2025
**Status**: Active Development - Route Registration Fix in Progress