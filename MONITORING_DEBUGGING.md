# Monitoring and Debugging Guide - Photo Enhancement Application

## 🔍 Comprehensive Monitoring Strategy

### 📊 Monitoring Stack Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Infrastructure│    │    Business     │
│   Monitoring    │    │   Monitoring    │    │   Monitoring    │
│                 │    │                 │    │                 │
│ • Error Rates   │───▶│ • CPU/Memory    │───▶│ • User Actions  │
│ • Response Time │    │ • Network I/O   │    │ • Conversions   │
│ • Availability  │    │ • Disk Usage    │    │ • Revenue       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
           │                      │                      │
           └──────────────────────┼──────────────────────┘
                                  ▼
                    ┌─────────────────────────────┐
                    │     Unified Dashboard       │
                    │  • Real-time Alerts         │
                    │  • Historical Trends        │ 
                    │  • Incident Response        │
                    └─────────────────────────────┘
```

### Key Monitoring Tools
- **Google Cloud Monitoring**: Infrastructure and application metrics
- **Google Cloud Logging**: Centralized log management
- **Cloud Trace**: Distributed tracing
- **Error Reporting**: Automatic error detection and grouping
- **Uptime Monitoring**: Service availability checks
- **Custom Dashboards**: Business and application-specific metrics

## 🏗️ Production Monitoring Setup

### Cloud Monitoring Configuration
```javascript
// backend/src/middleware/monitoring.js
const { Monitoring } = require('@google-cloud/monitoring')
const { Logging } = require('@google-cloud/logging')
const { Trace } = require('@google-cloud/trace-agent')

class MonitoringService {
  constructor() {
    this.monitoring = new Monitoring()
    this.logging = new Logging()
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    
    // Initialize Cloud Trace
    if (process.env.NODE_ENV === 'production') {
      Trace.start({
        projectId: this.projectId,
        samplingRate: 500 // Sample 1 in every 500 requests
      })
    }
  }
  
  // Custom metrics
  async recordMetric(metricType, value, labels = {}) {
    const dataPoint = {
      interval: {
        endTime: {
          seconds: Math.floor(Date.now() / 1000)
        }
      },
      value: {
        doubleValue: value
      }
    }
    
    const timeSeriesData = {
      metric: {
        type: `custom.googleapis.com/${metricType}`,
        labels: labels
      },
      resource: {
        type: 'cloud_run_revision',
        labels: {
          project_id: this.projectId,
          service_name: process.env.K_SERVICE || 'photo-enhancement-backend',
          revision_name: process.env.K_REVISION || 'unknown'
        }
      },
      points: [dataPoint]
    }
    
    const request = {
      name: `projects/${this.projectId}`,
      timeSeries: [timeSeriesData]
    }
    
    try {
      await this.monitoring.createTimeSeries(request)
    } catch (error) {
      console.error('Error recording metric:', error)
    }
  }
  
  // Enhanced request logging
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now()
      
      res.on('finish', () => {
        const duration = Date.now() - start
        const logEntry = {
          timestamp: new Date().toISOString(),
          severity: res.statusCode >= 400 ? 'ERROR' : 'INFO',
          httpRequest: {
            requestMethod: req.method,
            requestUrl: req.url,
            status: res.statusCode,
            responseSize: res.get('content-length') || 0,
            userAgent: req.get('user-agent'),
            remoteIp: req.ip,
            referer: req.get('referer'),
            latency: `${duration / 1000}s`
          },
          labels: {
            service: 'photo-enhancement-backend',
            version: process.env.APP_VERSION || '1.0.0'
          },
          message: `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`
        }
        
        // Log to Cloud Logging
        this.logging.log('application').write(this.logging.entry({
          resource: { type: 'cloud_run_revision' },
          severity: logEntry.severity,
          jsonPayload: logEntry
        }))
        
        // Record custom metrics
        this.recordMetric('http_request_duration', duration, {
          method: req.method,
          status: res.statusCode.toString(),
          route: req.route?.path || req.url
        })
        
        this.recordMetric('http_requests_total', 1, {
          method: req.method,
          status: res.statusCode.toString()
        })
      })
      
      next()
    }
  }
  
  // Error tracking
  errorHandler() {
    return (error, req, res, next) => {
      const errorInfo = {
        timestamp: new Date().toISOString(),
        severity: 'ERROR',
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        httpRequest: {
          method: req.method,
          url: req.url,
          userAgent: req.get('user-agent'),
          remoteIp: req.ip
        },
        user: req.user ? { id: req.user.id, email: req.user.email } : null,
        context: {
          service: 'photo-enhancement-backend',
          version: process.env.APP_VERSION || '1.0.0'
        }
      }
      
      // Log error
      this.logging.log('errors').write(this.logging.entry({
        resource: { type: 'cloud_run_revision' },
        severity: 'ERROR',
        jsonPayload: errorInfo
      }))
      
      // Record error metric
      this.recordMetric('errors_total', 1, {
        error_type: error.name,
        endpoint: req.url
      })
      
      next(error)
    }
  }
}

module.exports = new MonitoringService()
```

### Application Health Checks
```javascript
// backend/src/controllers/health.js
const { photosService } = require('../api/photo/services')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { GoogleGenerativeAI } = require('@google/generative-ai')

class HealthController {
  async healthCheck(req, res) {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      checks: {}
    }
    
    try {
      // Database connectivity
      healthStatus.checks.database = await this.checkDatabase()
      
      // External services
      healthStatus.checks.stripe = await this.checkStripe()
      healthStatus.checks.gemini = await this.checkGemini()
      
      // File system
      healthStatus.checks.filesystem = await this.checkFileSystem()
      
      // Memory usage
      healthStatus.checks.memory = this.checkMemory()
      
      // Determine overall health
      const allHealthy = Object.values(healthStatus.checks)
        .every(check => check.status === 'healthy')
      
      healthStatus.status = allHealthy ? 'healthy' : 'degraded'
      
      res.status(allHealthy ? 200 : 503).json(healthStatus)
      
    } catch (error) {
      healthStatus.status = 'unhealthy'
      healthStatus.error = error.message
      res.status(503).json(healthStatus)
    }
  }
  
  async checkDatabase() {
    try {
      const start = Date.now()
      await strapi.db.connection.raw('SELECT 1')
      const duration = Date.now() - start
      
      return {
        status: 'healthy',
        responseTime: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }
  
  async checkStripe() {
    try {
      const start = Date.now()
      await stripe.customers.list({ limit: 1 })
      const duration = Date.now() - start
      
      return {
        status: 'healthy',
        responseTime: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }
  
  async checkGemini() {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return {
          status: 'unhealthy',
          error: 'GEMINI_API_KEY not configured',
          timestamp: new Date().toISOString()
        }
      }
      
      const start = Date.now()
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
      
      // Simple test prompt
      await model.generateContent('Health check test')
      const duration = Date.now() - start
      
      return {
        status: 'healthy',
        responseTime: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }
  
  async checkFileSystem() {
    try {
      const fs = require('fs').promises
      const path = require('path')
      
      const tempFile = path.join(process.cwd(), 'health-check.tmp')
      const start = Date.now()
      
      await fs.writeFile(tempFile, 'health check')
      await fs.readFile(tempFile)
      await fs.unlink(tempFile)
      
      const duration = Date.now() - start
      
      return {
        status: 'healthy',
        responseTime: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }
  
  checkMemory() {
    const used = process.memoryUsage()
    const total = used.heapTotal
    const free = total - used.heapUsed
    const usage = (used.heapUsed / total * 100).toFixed(2)
    
    return {
      status: usage < 90 ? 'healthy' : 'unhealthy',
      usage: `${usage}%`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(used.external / 1024 / 1024)}MB`,
      timestamp: new Date().toISOString()
    }
  }
  
  // Readiness probe (Kubernetes-style)
  async readinessCheck(req, res) {
    try {
      // Check if application is ready to serve traffic
      const databaseCheck = await this.checkDatabase()
      
      if (databaseCheck.status === 'healthy') {
        res.status(200).json({ status: 'ready' })
      } else {
        res.status(503).json({ status: 'not ready', reason: 'database unavailable' })
      }
    } catch (error) {
      res.status(503).json({ status: 'not ready', error: error.message })
    }
  }
  
  // Liveness probe (Kubernetes-style)
  async livenessCheck(req, res) {
    // Simple liveness check - if we can respond, we're alive
    res.status(200).json({ 
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  }
}

module.exports = new HealthController()
```

### Frontend Performance Monitoring
```typescript
// frontend/src/services/monitoring.ts
class FrontendMonitoring {
  private projectId = import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_ID
  private environment = import.meta.env.NODE_ENV
  
  constructor() {
    this.initializePerformanceMonitoring()
    this.initializeErrorTracking()
    this.initializeUserTracking()
  }
  
  private initializePerformanceMonitoring() {
    // Web Vitals monitoring
    if ('performance' in window && 'PerformanceObserver' in window) {
      // Core Web Vitals
      this.observeWebVitals()
      
      // Navigation timing
      this.observeNavigationTiming()
      
      // Resource timing
      this.observeResourceTiming()
    }
  }
  
  private observeWebVitals() {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.entryType === 'largest-contentful-paint') {
          this.sendMetric('web_vitals_lcp', entry.startTime, {
            url: window.location.pathname,
            element: entry.element?.tagName || 'unknown'
          })
        }
      })
    }).observe({ entryTypes: ['largest-contentful-paint'] })
    
    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.entryType === 'first-input') {
          this.sendMetric('web_vitals_fid', entry.processingStart - entry.startTime, {
            url: window.location.pathname,
            eventType: entry.name
          })
        }
      })
    }).observe({ entryTypes: ['first-input'] })
    
    // Cumulative Layout Shift (CLS)
    new PerformanceObserver((list) => {
      let clsValue = 0
      list.getEntries().forEach((entry: any) => {
        if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
      
      this.sendMetric('web_vitals_cls', clsValue, {
        url: window.location.pathname
      })
    }).observe({ entryTypes: ['layout-shift'] })
  }
  
  private observeNavigationTiming() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const nav = performance.getEntriesByType('navigation')[0] as any
        if (nav) {
          this.sendMetric('page_load_time', nav.loadEventEnd - nav.fetchStart, {
            url: window.location.pathname,
            type: nav.type
          })
          
          this.sendMetric('dom_content_loaded', nav.domContentLoadedEventEnd - nav.fetchStart, {
            url: window.location.pathname
          })
          
          this.sendMetric('time_to_interactive', nav.domInteractive - nav.fetchStart, {
            url: window.location.pathname
          })
        }
      }, 0)
    })
  }
  
  private observeResourceTiming() {
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.entryType === 'resource') {
          this.sendMetric('resource_load_time', entry.duration, {
            url: window.location.pathname,
            resource: entry.name,
            type: entry.initiatorType
          })
        }
      })
    }).observe({ entryTypes: ['resource'] })
  }
  
  private initializeErrorTracking() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        type: 'javascript',
        url: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    })
    
    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        type: 'promise',
        url: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    })
    
    // Vue error handler
    if (window.Vue) {
      window.Vue.config.errorHandler = (error: Error, instance: any, info: string) => {
        this.trackError({
          message: error.message,
          stack: error.stack,
          component: instance?.$options.name || 'Unknown',
          info: info,
          type: 'vue',
          url: window.location.pathname,
          timestamp: new Date().toISOString()
        })
      }
    }
  }
  
  private initializeUserTracking() {
    // Page views
    this.trackPageView()
    
    // User interactions
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      if (target.dataset.track) {
        this.trackEvent('click', target.dataset.track, {
          url: window.location.pathname,
          element: target.tagName,
          text: target.textContent?.slice(0, 50) || ''
        })
      }
    })
  }
  
  trackPageView() {
    this.sendMetric('page_views', 1, {
      url: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    })
  }
  
  trackEvent(action: string, category: string, labels: Record<string, string> = {}) {
    this.sendMetric(`user_events_${action}`, 1, {
      category,
      url: window.location.pathname,
      ...labels
    })
  }
  
  trackError(error: any) {
    console.error('Frontend Error:', error)
    
    // Send to backend error tracking
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(error)
    }).catch(err => console.error('Failed to send error:', err))
  }
  
  private async sendMetric(name: string, value: number, labels: Record<string, string> = {}) {
    if (this.environment === 'development') return
    
    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          value,
          labels: {
            ...labels,
            environment: this.environment,
            version: import.meta.env.VITE_APP_VERSION || '1.0.0'
          }
        })
      })
    } catch (error) {
      console.error('Failed to send metric:', error)
    }
  }
}

export default new FrontendMonitoring()
```

## 🚨 Alert Configuration

### Critical Alerts Setup
```bash
#!/bin/bash
# scripts/setup-alerts.sh

PROJECT_ID="rational-camera-471203-n5"
NOTIFICATION_EMAIL="alerts@example.com"

# Create notification channel
gcloud alpha monitoring channels create \
  --display-name="Email Alerts" \
  --type=email \
  --channel-labels=email_address=$NOTIFICATION_EMAIL

NOTIFICATION_CHANNEL=$(gcloud alpha monitoring channels list --format="value(name)" --filter="displayName='Email Alerts'")

# High Error Rate Alert
cat > alert-high-error-rate.yaml << EOF
displayName: "High Error Rate - Photo Enhancement"
documentation:
  content: |
    ## High Error Rate Alert
    
    The error rate for the Photo Enhancement application has exceeded 5% for more than 5 minutes.
    
    **Immediate Actions:**
    1. Check the application logs
    2. Verify external service status (Stripe, Google AI)
    3. Consider rolling back recent deployments
    
    **Runbook:** https://docs.example.com/runbooks/high-error-rate
  mimeType: "text/markdown"
conditions:
  - displayName: "Error rate > 5%"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name="photo-enhancement-backend-prod" AND metric.type="run.googleapis.com/request_count"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 0.05
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
          crossSeriesReducer: REDUCE_SUM
          groupByFields: ["resource.label.service_name"]
notificationChannels:
  - "$NOTIFICATION_CHANNEL"
alertStrategy:
  autoClose: 1800s
enabled: true
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-high-error-rate.yaml

# High Response Time Alert
cat > alert-high-response-time.yaml << EOF
displayName: "High Response Time - Photo Enhancement"
documentation:
  content: |
    ## High Response Time Alert
    
    The average response time has exceeded 2 seconds for more than 5 minutes.
    
    **Immediate Actions:**
    1. Check CPU and memory usage
    2. Review database performance
    3. Check for external service latency
    
    **Runbook:** https://docs.example.com/runbooks/high-response-time
conditions:
  - displayName: "Response time > 2s"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name="photo-enhancement-backend-prod" AND metric.type="run.googleapis.com/request_latencies"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 2000
      duration: 300s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_MEAN
          crossSeriesReducer: REDUCE_MEAN
notificationChannels:
  - "$NOTIFICATION_CHANNEL"
enabled: true
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-high-response-time.yaml

# Service Unavailable Alert
cat > alert-service-down.yaml << EOF
displayName: "Service Unavailable - Photo Enhancement"
documentation:
  content: |
    ## Service Unavailable Alert
    
    The Photo Enhancement service is not responding to health checks.
    
    **Immediate Actions:**
    1. Check Cloud Run service status
    2. Review recent deployments
    3. Verify database connectivity
    4. Consider emergency rollback
conditions:
  - displayName: "Uptime check failed"
    conditionThreshold:
      filter: 'resource.type="uptime_url" AND metric.type="monitoring.googleapis.com/uptime_check/check_passed"'
      comparison: COMPARISON_EQUAL
      thresholdValue: 0
      duration: 120s
notificationChannels:
  - "$NOTIFICATION_CHANNEL"
alertStrategy:
  autoClose: 300s
enabled: true
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-service-down.yaml

echo "Alerts configured successfully!"
```

### Business Metrics Alerts
```yaml
# alerts/business-alerts.yaml
displayName: "Low Conversion Rate"
documentation:
  content: |
    ## Low Conversion Rate Alert
    
    The conversion rate from free to paid users has dropped below 2%.
    
    **Actions:**
    1. Review user funnel metrics
    2. Check for UX issues in payment flow
    3. Analyze user feedback
conditions:
  - displayName: "Conversion rate < 2%"
    conditionThreshold:
      filter: 'resource.type="global" AND metric.type="custom.googleapis.com/conversion_rate"'
      comparison: COMPARISON_LESS_THAN
      thresholdValue: 0.02
      duration: 3600s # 1 hour
      aggregations:
        - alignmentPeriod: 3600s
          perSeriesAligner: ALIGN_MEAN
enabled: true

---
displayName: "High Photo Processing Failures"
documentation:
  content: |
    ## High Photo Processing Failures
    
    Photo enhancement failure rate has exceeded 10%.
    
    **Actions:**
    1. Check Google AI service status
    2. Review image processing logs
    3. Verify file system health
conditions:
  - displayName: "Processing failure rate > 10%"
    conditionThreshold:
      filter: 'resource.type="global" AND metric.type="custom.googleapis.com/photo_processing_failures"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 0.10
      duration: 300s
enabled: true
```

## 🔧 Debugging Tools and Techniques

### Structured Logging Implementation
```javascript
// backend/src/utils/logger.js
const winston = require('winston')
const { LoggingWinston } = require('@google-cloud/logging-winston')

class Logger {
  constructor() {
    const transports = []
    
    // Console transport for development
    if (process.env.NODE_ENV === 'development') {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
          })
        )
      }))
    }
    
    // Google Cloud Logging for production
    if (process.env.NODE_ENV === 'production') {
      transports.push(new LoggingWinston({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        logName: 'photo-enhancement-backend',
        resource: {
          type: 'cloud_run_revision',
          labels: {
            project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
            service_name: process.env.K_SERVICE || 'photo-enhancement-backend',
            revision_name: process.env.K_REVISION || 'unknown'
          }
        }
      }))
    }
    
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'photo-enhancement-backend',
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV
      },
      transports
    })
  }
  
  // Structured logging methods
  logRequest(req, res, duration) {
    this.logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      userId: req.user?.id,
      correlationId: req.correlationId
    })
  }
  
  logPhotoProcessing(photoId, stage, metadata = {}) {
    this.logger.info('Photo Processing', {
      photoId,
      stage,
      ...metadata,
      correlationId: `photo_${photoId}`
    })
  }
  
  logError(error, context = {}) {
    this.logger.error('Application Error', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      timestamp: new Date().toISOString()
    })
  }
  
  logBusinessEvent(event, data = {}) {
    this.logger.info('Business Event', {
      event,
      data,
      timestamp: new Date().toISOString()
    })
  }
}

module.exports = new Logger()
```

### Debug Middleware Collection
```javascript
// backend/src/middleware/debug.js
const logger = require('../utils/logger')

class DebugMiddleware {
  // Request correlation ID
  correlationId() {
    return (req, res, next) => {
      req.correlationId = req.get('X-Correlation-ID') || 
                         `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      res.set('X-Correlation-ID', req.correlationId)
      next()
    }
  }
  
  // Request/Response timing
  timing() {
    return (req, res, next) => {
      req.startTime = Date.now()
      
      const originalEnd = res.end
      res.end = function(...args) {
        const duration = Date.now() - req.startTime
        res.set('X-Response-Time', `${duration}ms`)
        logger.logRequest(req, res, duration)
        originalEnd.apply(res, args)
      }
      
      next()
    }
  }
  
  // Request payload logging
  requestLogger() {
    return (req, res, next) => {
      if (process.env.DEBUG_REQUESTS === 'true') {
        logger.logger.debug('Request Details', {
          method: req.method,
          url: req.url,
          headers: req.headers,
          query: req.query,
          body: req.method !== 'GET' ? req.body : undefined,
          correlationId: req.correlationId
        })
      }
      next()
    }
  }
  
  // Database query logging
  queryLogger() {
    return (req, res, next) => {
      if (process.env.DEBUG_QUERIES === 'true') {
        const originalQuery = strapi.db.connection.query
        strapi.db.connection.query = function(sql, bindings) {
          const start = Date.now()
          logger.logger.debug('Database Query', {
            sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
            bindings: bindings ? bindings.slice(0, 5) : undefined,
            correlationId: req.correlationId
          })
          
          return originalQuery.call(this, sql, bindings).finally(() => {
            const duration = Date.now() - start
            if (duration > 1000) { // Log slow queries
              logger.logger.warn('Slow Query', {
                sql: sql.substring(0, 100),
                duration: `${duration}ms`,
                correlationId: req.correlationId
              })
            }
          })
        }
      }
      next()
    }
  }
  
  // Memory usage tracking
  memoryTracking() {
    return (req, res, next) => {
      if (process.env.DEBUG_MEMORY === 'true') {
        const memBefore = process.memoryUsage()
        
        res.on('finish', () => {
          const memAfter = process.memoryUsage()
          const memDiff = {
            heapUsed: memAfter.heapUsed - memBefore.heapUsed,
            heapTotal: memAfter.heapTotal - memBefore.heapTotal,
            external: memAfter.external - memBefore.external
          }
          
          logger.logger.debug('Memory Usage', {
            before: memBefore,
            after: memAfter,
            diff: memDiff,
            correlationId: req.correlationId
          })
        })
      }
      next()
    }
  }
}

module.exports = new DebugMiddleware()
```

### Frontend Debug Console
```typescript
// frontend/src/utils/debug.ts
class DebugConsole {
  private isEnabled = import.meta.env.NODE_ENV === 'development' || 
                     localStorage.getItem('debug_mode') === 'true'
  
  enable() {
    localStorage.setItem('debug_mode', 'true')
    this.isEnabled = true
    console.log('%c🐛 Debug Mode Enabled', 'color: green; font-weight: bold;')
    this.showDebugInfo()
  }
  
  disable() {
    localStorage.removeItem('debug_mode')
    this.isEnabled = false
    console.log('%c🐛 Debug Mode Disabled', 'color: red; font-weight: bold;')
  }
  
  private showDebugInfo() {
    console.group('🔍 Debug Information')
    console.log('Environment:', import.meta.env.NODE_ENV)
    console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL)
    console.log('Version:', import.meta.env.VITE_APP_VERSION)
    console.log('Build Time:', new Date(import.meta.env.VITE_BUILD_TIME))
    console.groupEnd()
  }
  
  logAPICall(method: string, url: string, data?: any, response?: any, error?: any) {
    if (!this.isEnabled) return
    
    console.group(`📡 API Call: ${method.toUpperCase()} ${url}`)
    if (data) console.log('Request Data:', data)
    if (response) console.log('Response:', response)
    if (error) console.error('Error:', error)
    console.groupEnd()
  }
  
  logUserAction(action: string, data?: any) {
    if (!this.isEnabled) return
    
    console.log(`👤 User Action: ${action}`, data || '')
  }
  
  logPerformance(metric: string, value: number, unit = 'ms') {
    if (!this.isEnabled) return
    
    const color = value < 100 ? 'green' : value < 500 ? 'orange' : 'red'
    console.log(`⚡ Performance: ${metric} = %c${value}${unit}`, `color: ${color}`)
  }
  
  logError(error: Error, context?: any) {
    console.group(`❌ Error: ${error.name}`)
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
    if (context) console.log('Context:', context)
    console.groupEnd()
  }
  
  // Network debugging
  interceptFetch() {
    if (!this.isEnabled) return
    
    const originalFetch = window.fetch
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url
      const method = init?.method || 'GET'
      
      console.log(`🌐 Fetch: ${method} ${url}`)
      
      const start = performance.now()
      try {
        const response = await originalFetch(input, init)
        const duration = performance.now() - start
        
        console.log(`✅ Fetch Complete: ${method} ${url} (${Math.round(duration)}ms)`)
        return response
      } catch (error) {
        const duration = performance.now() - start
        console.error(`❌ Fetch Failed: ${method} ${url} (${Math.round(duration)}ms)`, error)
        throw error
      }
    }
  }
  
  // Vue debugging
  enableVueDevtools() {
    if (!this.isEnabled || typeof window === 'undefined') return
    
    // Enable Vue devtools in production
    if (window.__VUE__) {
      window.__VUE__.config.devtools = true
    }
  }
  
  // State debugging
  logStoreChange(storeName: string, action: string, before: any, after: any) {
    if (!this.isEnabled) return
    
    console.group(`🏪 Store Change: ${storeName}.${action}`)
    console.log('Before:', before)
    console.log('After:', after)
    console.groupEnd()
  }
}

export const debugConsole = new DebugConsole()

// Initialize debugging
if (debugConsole['isEnabled']) {
  debugConsole.interceptFetch()
  debugConsole.enableVueDevtools()
}

// Global debug functions
declare global {
  interface Window {
    enableDebug: () => void
    disableDebug: () => void
    debugConsole: typeof debugConsole
  }
}

window.enableDebug = () => debugConsole.enable()
window.disableDebug = () => debugConsole.disable() 
window.debugConsole = debugConsole
```

## 🔍 Production Debugging Workflow

### Log Analysis Commands
```bash
#!/bin/bash
# scripts/debug-production.sh

PROJECT_ID="rational-camera-471203-n5"
SERVICE_NAME="photo-enhancement-backend-prod"
REGION="us-central1"

echo "Production Debugging Toolkit"
echo "============================"

# 1. Service Health Check
echo "1. Checking service health..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
curl -f "$SERVICE_URL/api/health" | jq '.' || echo "Health check failed!"

# 2. Recent Error Logs
echo -e "\n2. Recent error logs (last 10 minutes)..."
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND severity>=ERROR" \
  --limit=20 --format="table(timestamp,severity,jsonPayload.message,jsonPayload.error.message)" \
  --freshness=10m

# 3. High Response Time Requests
echo -e "\n3. Slow requests (>2s in last hour)..."
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND jsonPayload.httpRequest.latency>2s" \
  --limit=10 --format="table(timestamp,jsonPayload.httpRequest.requestMethod,jsonPayload.httpRequest.requestUrl,jsonPayload.httpRequest.latency)" \
  --freshness=1h

# 4. Memory Usage Trends
echo -e "\n4. Current memory usage..."
gcloud monitoring metrics list --limit=5 --filter="metric.type=run.googleapis.com/container/memory/utilizations"

# 5. Request Volume
echo -e "\n5. Request volume (last hour)..."
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND jsonPayload.httpRequest" \
  --limit=100 --format="value(timestamp)" --freshness=1h | wc -l | xargs echo "Total requests in last hour:"

# 6. Error Rate Calculation
echo -e "\n6. Error rate analysis..."
TOTAL_REQUESTS=$(gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND jsonPayload.httpRequest" \
  --limit=1000 --format="value(timestamp)" --freshness=1h | wc -l)

ERROR_REQUESTS=$(gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND jsonPayload.httpRequest.status>=400" \
  --limit=1000 --format="value(timestamp)" --freshness=1h | wc -l)

if [ $TOTAL_REQUESTS -gt 0 ]; then
  ERROR_RATE=$(echo "scale=2; $ERROR_REQUESTS * 100 / $TOTAL_REQUESTS" | bc)
  echo "Error rate: $ERROR_RATE% ($ERROR_REQUESTS errors out of $TOTAL_REQUESTS requests)"
else
  echo "No requests found in the last hour"
fi

# 7. Database Connection Issues
echo -e "\n7. Database connection issues..."
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND (jsonPayload.message:database OR jsonPayload.error.message:database)" \
  --limit=5 --format="table(timestamp,jsonPayload.message,jsonPayload.error.message)" \
  --freshness=1h

# 8. External Service Errors
echo -e "\n8. External service errors (Stripe, Google AI)..."
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND (jsonPayload.message:(stripe OR gemini OR google) OR jsonPayload.error.message:(stripe OR gemini OR google))" \
  --limit=5 --format="table(timestamp,jsonPayload.message,jsonPayload.error.message)" \
  --freshness=1h

echo -e "\nDebugging complete! Check the output above for issues."
```

### Interactive Debugging Session
```bash
#!/bin/bash  
# scripts/debug-session.sh

PROJECT_ID="rational-camera-471203-n5"
SERVICE_NAME="photo-enhancement-backend-prod"

echo "Starting interactive debugging session..."
echo "Available commands:"
echo "  1) Service health"
echo "  2) Recent errors" 
echo "  3) Performance metrics"
echo "  4) User activity"
echo "  5) Photo processing status"
echo "  6) Database queries"
echo "  7) Custom log search"
echo "  0) Exit"

while true; do
  echo ""
  read -p "Enter command number: " cmd
  
  case $cmd in
    1)
      echo "Checking service health..."
      gcloud run services describe $SERVICE_NAME --region=us-central1 --format="table(status.conditions[].type,status.conditions[].status,status.conditions[].message)"
      ;;
    2)
      echo "Recent errors (last 30 minutes)..."
      gcloud logs read "resource.labels.service_name=$SERVICE_NAME AND severity>=ERROR" --limit=10 --freshness=30m
      ;;
    3)
      echo "Performance metrics..."
      echo "CPU utilization:"
      gcloud monitoring metrics list --filter="metric.type=run.googleapis.com/container/cpu/utilizations" --limit=1
      echo "Memory utilization:"  
      gcloud monitoring metrics list --filter="metric.type=run.googleapis.com/container/memory/utilizations" --limit=1
      ;;
    4)
      read -p "Enter user ID (or press Enter for all): " user_id
      if [ -z "$user_id" ]; then
        gcloud logs read "resource.labels.service_name=$SERVICE_NAME AND jsonPayload.userId" --limit=10 --freshness=1h
      else
        gcloud logs read "resource.labels.service_name=$SERVICE_NAME AND jsonPayload.userId=$user_id" --limit=20
      fi
      ;;
    5)
      echo "Photo processing status..."
      gcloud logs read "resource.labels.service_name=$SERVICE_NAME AND jsonPayload.message:\"Photo Processing\"" --limit=10 --freshness=1h
      ;;
    6)
      echo "Database queries (slow queries >1s)..."
      gcloud logs read "resource.labels.service_name=$SERVICE_NAME AND jsonPayload.message:\"Slow Query\"" --limit=10 --freshness=1h
      ;;
    7)
      read -p "Enter search term: " search_term
      gcloud logs read "resource.labels.service_name=$SERVICE_NAME AND jsonPayload.message:\"$search_term\"" --limit=10
      ;;
    0)
      echo "Exiting debug session..."
      break
      ;;
    *)
      echo "Invalid command. Please enter 1-7 or 0 to exit."
      ;;
  esac
done
```

## 📊 Monitoring Dashboard

### Custom Dashboard Creation
```bash
#!/bin/bash
# scripts/create-dashboard.sh

PROJECT_ID="rational-camera-471203-n5"

cat > dashboard-config.json << EOF
{
  "displayName": "Photo Enhancement Application Dashboard",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"photo-enhancement-backend-prod\" AND metric.type=\"run.googleapis.com/request_count\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE",
                    "crossSeriesReducer": "REDUCE_SUM"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "width": 6,
        "height": 4,
        "yPos": 0,
        "xPos": 6,
        "widget": {
          "title": "Error Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"photo-enhancement-backend-prod\" AND metric.type=\"logging.googleapis.com/log_entry_count\" AND resource.labels.service_name=\"photo-enhancement-backend-prod\" AND severity>=ERROR",
                  "aggregation": {
                    "alignmentPeriod": "60s", 
                    "perSeriesAligner": "ALIGN_RATE",
                    "crossSeriesReducer": "REDUCE_SUM"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "width": 12,
        "height": 4,
        "yPos": 4,
        "widget": {
          "title": "Response Time Percentiles",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"photo-enhancement-backend-prod\" AND metric.type=\"run.googleapis.com/request_latencies\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_DELTA",
                      "crossSeriesReducer": "REDUCE_PERCENTILE_95"
                    }
                  }
                },
                "plotType": "LINE",
                "targetAxis": "Y1"
              }
            ]
          }
        }
      }
    ]
  }
}
EOF

gcloud monitoring dashboards create --config-from-file=dashboard-config.json

echo "Dashboard created successfully!"
echo "View at: https://console.cloud.google.com/monitoring/dashboards"
```

## 🚀 Quick Reference Commands

```bash
# Real-time log streaming
gcloud logs tail "resource.type=cloud_run_revision AND resource.labels.service_name=photo-enhancement-backend-prod" --format="value(timestamp,severity,jsonPayload.message)"

# Error investigation
gcloud logs read "resource.labels.service_name=photo-enhancement-backend-prod AND severity>=ERROR" --limit=50 --format=json | jq -r '.[] | "\(.timestamp) \(.severity) \(.jsonPayload.message // .jsonPayload.error.message)"'

# Performance analysis
gcloud monitoring metrics list --filter="resource.type=cloud_run_revision AND resource.labels.service_name=photo-enhancement-backend-prod" --limit=20

# Service scaling check
gcloud run services describe photo-enhancement-backend-prod --region=us-central1 --format="table(status.traffic[].revisionName,status.traffic[].percent,status.traffic[].tag)"

# Memory and CPU usage
gcloud run services describe photo-enhancement-backend-prod --region=us-central1 --format="value(spec.template.spec.containers[0].resources.limits)"

# Quick health check
curl -f https://photo-enhancement-backend-925756614203.us-central1.run.app/api/health || echo "Service is down!"

# Enable debug mode (frontend)
# In browser console: enableDebug()

# View build logs
gcloud builds list --limit=10 --format="table(id,status,createTime,duration)" --filter="status=SUCCESS OR status=FAILURE"
```

---

**Monitoring Checklist:**
- ✅ Application performance metrics
- ✅ Infrastructure monitoring  
- ✅ Error tracking and alerting
- ✅ User experience monitoring
- ✅ Business metrics tracking
- ✅ Security monitoring
- ✅ Cost optimization alerts
- ✅ Automated incident response