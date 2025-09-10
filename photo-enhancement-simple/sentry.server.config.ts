import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Set tracesSampleRate to 1.0 to capture 100%
  // of the transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Environment configuration
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
  
  // Configure the scope used by this client
  beforeSend(event, hint) {
    // Add correlation ID if available
    const correlationId = event.extra?.correlationId || event.tags?.correlationId;
    if (correlationId && typeof correlationId === 'string') {
      event.tags = {
        ...event.tags,
        correlationId,
      };
    }
    
    // Add operation context
    if (event.extra?.operation && typeof event.extra.operation === 'string') {
      event.tags = {
        ...event.tags,
        operation: event.extra.operation,
      };
    }
    
    // Filter sensitive data
    if (event.request?.data && typeof event.request.data === 'object') {
      // Remove sensitive fields from request data
      const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
      const data = { ...event.request.data } as Record<string, any>;
      
      sensitiveFields.forEach(field => {
        if (data[field]) {
          data[field] = '[Filtered]';
        }
      });
      
      event.request.data = data;
    }
    
    return event;
  },
  
  // Configure error filtering
  ignoreErrors: [
    // Database connection errors that are temporary
    'Connection terminated unexpectedly',
    // File system errors
    'ENOENT',
    'EACCES',
    // Network timeouts
    'ETIMEDOUT',
  ],
});