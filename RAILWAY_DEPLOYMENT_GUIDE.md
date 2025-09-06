# Railway Deployment Guide for Photo Enhancement App

## 🚀 Quick Deployment Steps

### 1. **Push to GitHub** (if not already done)
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. **Create Railway Project**
1. Go to [railway.app](https://railway.app)
2. Login with your account (token: e1b3d2a9-110d-4d0c-80d2-527807f056a0)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your photo-enhancement repository

### 3. **Deploy Backend Service**

#### Create Backend Service:
1. In your Railway project dashboard, click "Add Service" → "GitHub Repository"
2. Select the **root directory** (Railway will detect the backend)
3. Set the **Root Directory** to `backend`

#### Configure Backend Environment Variables:
Go to Variables tab and add these environment variables:

```env
NODE_ENV=production
HOST=0.0.0.0
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=/app/data/database.db
JWT_SECRET=91ccb687da2e92b826d5bf296d9417872076788472cac3c98cc8348f9d06b1c7
ADMIN_JWT_SECRET=a71715d475c761fe37c706a1268f9a9013e7f41dd4e025a708a21d22138e499c
TRANSFER_TOKEN_SALT=b8f4a2e9d6c1539a7e3f8b2d4c6e9a1f
API_TOKEN_SALT=c9e5b3f1a7d8524b6f0e2c8a5d9b7e4f
APP_KEYS=key1-a1b2c3d4,key2-e5f6g7h8,key3-i9j0k1l2,key4-m3n4o5p6
```

#### Configure Volume Mount:
1. Go to "Volumes" tab in your backend service
2. Click "New Volume"
3. Set Mount Path: `/app/data`
4. Set Size: 1GB (sufficient for SQLite database)

### 4. **Deploy Frontend Service**

#### Create Frontend Service:
1. Click "Add Service" → "GitHub Repository" 
2. Select your repository again
3. Set **Root Directory** to `frontend`

#### Configure Frontend Environment Variables:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51Rq47a12RO6LHIFzGQwjbmGvW6lyb6nRj83zT1mwvHGWpxfpPPXy2cNwCvgftycTtwC3GtvTdXift2Nq19DeNIBW00unK49YSH
VITE_API_BASE_URL=https://your-backend-service.railway.app/api
VITE_GRAPHQL_URL=https://your-backend-service.railway.app/graphql
VITE_NODE_ENV=production
VITE_SECURE_COOKIES=true
```

**Important**: Replace `your-backend-service.railway.app` with your actual backend Railway URL.

### 5. **Configure Service Communication**

#### Get Backend URL:
1. Go to your backend service
2. Copy the Railway-provided URL (like `https://web-production-abc123.up.railway.app`)
3. Update frontend environment variables with this URL

#### Update Frontend Variables:
Replace `VITE_API_BASE_URL` and `VITE_GRAPHQL_URL` with your backend URL:
```env
VITE_API_BASE_URL=https://web-production-abc123.up.railway.app/api
VITE_GRAPHQL_URL=https://web-production-abc123.up.railway.app/graphql
```

### 6. **Verify Deployment**

#### Check Backend:
- Visit `https://your-backend-url.railway.app/_health` 
- Should return status 204 (No Content)

#### Check Frontend:
- Visit your frontend Railway URL
- Should load the photo enhancement application

#### Test API Endpoints:
- Try registering a new user
- Test photo upload functionality
- Verify database persistence

## 🔧 Configuration Files Created

The deployment preparation script created these files:

### Backend Configuration:
- `backend/nixpacks.toml` - Nixpacks build configuration
- `backend/Dockerfile.railway` - Railway-optimized Dockerfile  
- `backend/.env.railway` - Environment variables template
- `backend/railway.toml` - Railway service configuration

### Frontend Configuration:
- `frontend/nixpacks.toml` - Nixpacks build configuration
- `frontend/.env.railway` - Environment variables template
- `frontend/railway.toml` - Railway service configuration

### Root Configuration:
- `package.json` - Root package file for monorepo detection
- `railway.json` - Global Railway configuration

## 🗄️ Database & Storage

### SQLite Database:
- **Location**: `/app/data/database.db`
- **Persistence**: Enabled via Railway volume mount
- **Size**: 1GB volume (expandable)

### File Uploads:
- **Location**: `/app/public/uploads`
- **Persistence**: Handled by Railway's filesystem
- **Backup**: Automatic with volume snapshots

## 🚨 Troubleshooting

### Common Issues:

1. **Database Connection Errors**
   - Verify volume mount is set to `/app/data`
   - Check DATABASE_FILENAME environment variable

2. **CORS Errors**
   - Ensure frontend VITE_API_BASE_URL matches backend URL exactly
   - Check backend URL in Railway dashboard

3. **Build Failures**
   - Check build logs in Railway dashboard
   - Verify package.json dependencies

4. **Container Start Failures**
   - Check that PORT environment variable is not set manually
   - Railway provides $PORT automatically

### Getting Help:
- Check Railway dashboard logs
- Use Railway's built-in monitoring
- Verify environment variables are set correctly

## 📊 Expected Costs

Railway pricing for this app:
- **Backend Service**: ~$5-8/month (with volume)
- **Frontend Service**: ~$0-5/month (static site, likely free)
- **Total**: ~$5-13/month (60-80% savings vs GCP)

## ✅ Success Indicators

Your deployment is successful when:
1. ✅ Backend health check returns 204
2. ✅ Frontend loads without errors
3. ✅ User registration works
4. ✅ Photo upload works and files persist
5. ✅ Database queries work (SQLite data persists between deployments)

---

**Need help?** Check the Railway documentation or contact support through their platform.