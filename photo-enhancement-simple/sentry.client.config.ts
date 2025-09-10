import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Set tracesSampleRate to 1.0 to capture 100%
  // of the transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Configure the scope used by this client
  beforeSend(event, hint) {
    // Filter out non-critical errors in development
    if (process.env.NODE_ENV === 'development') {
      // Skip certain error types that are common in development
      if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
        return null;
      }
    }
    
    // Add custom context
    if (event.user) {
      event.user = {
        id: event.user.id,
        // Remove sensitive user data
      };
    }
    
    return event;
  },
  
  // Configure integrations
  integrations: [
    // Sentry.replayIntegration is the correct way to use Replay in newer versions
    Sentry.replayIntegration({
      // Mask all text content, record only clicks and navigations
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Environment configuration
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
  
  // Configure error filtering
  ignoreErrors: [
    // Browser extensions
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    // Network errors
    'NetworkError',
    'Failed to fetch',
    // Common browser errors
    'Script error.',
    'TypeError: Failed to fetch',
  ],
  
  // Configure allowed URLs (optional)
  allowUrls: [
    // Add your domain here
    /https:\/\/.*\.vercel\.app/,
    /http:\/\/localhost/,
  ],
});