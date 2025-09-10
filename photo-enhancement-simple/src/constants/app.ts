/**
 * Application constants and configuration
 */

// Image processing constants
export const IMAGE_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MIN_FILE_SIZE: 1024, // 1KB
  MAX_DIMENSIONS: 4096, // 4K resolution
  MIN_DIMENSIONS: 100,
  COMPRESSION_QUALITY: 0.85,
  SUPPORTED_FORMATS: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ]
} as const;

// API configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
} as const;

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  SLOW_API_CALL: 2000, // 2 seconds
  SLOW_RENDER: 100, // 100ms
  MEMORY_WARNING: 50 * 1024 * 1024, // 50MB
  ERROR_THRESHOLD: 5 // 5 errors per session
} as const;

// Photo processing
export const PHOTO_PROCESSING = {
  ESTIMATED_DURATION: 30000, // 30 seconds
  POLLING_INTERVAL: 3000, // 3 seconds
  POLLING_TIMEOUT: 300000, // 5 minutes
  PROGRESS_SIMULATION_RATE: 95 // Cap progress at 95% until complete
} as const;

// UI constants
export const UI_CONSTANTS = {
  TOAST_DURATION: 5000, // 5 seconds
  DEBOUNCE_DELAY: 500, // 500ms
  ANIMATION_DURATION: 300, // 300ms
  GRID_BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280
  }
} as const;

// User limits
export const USER_LIMITS = {
  FREE_CREDITS: 5,
  PREMIUM_CREDITS: 100,
  MAX_PHOTOS_PER_USER: 1000,
  MAX_UPLOADS_PER_HOUR: 10
} as const;

// Error messages
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File too large. Maximum size is 10MB',
  FILE_TOO_SMALL: 'File too small. Minimum size is 1KB',
  UNSUPPORTED_FORMAT: 'Unsupported file format',
  INVALID_DIMENSIONS: 'Image dimensions are invalid',
  UPLOAD_FAILED: 'Failed to upload photo. Please try again.',
  ENHANCE_FAILED: 'Failed to enhance photo. Please try again.',
  DOWNLOAD_FAILED: 'Failed to download photo',
  NO_CREDITS: 'You have no credits remaining',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NOT_FOUND: 'Photo not found',
  SERVER_ERROR: 'Server error. Please try again later.'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  UPLOAD_SUCCESS: 'Photo uploaded successfully!',
  ENHANCE_COMPLETE: 'Photo enhancement completed!',
  DOWNLOAD_SUCCESS: 'Photo downloaded successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!'
} as const;

// Photo status display
export const PHOTO_STATUS_CONFIG = {
  PENDING: {
    label: 'Pending Enhancement',
    color: 'text-yellow-600 bg-yellow-100',
    icon: 'clock'
  },
  PROCESSING: {
    label: 'Processing...',
    color: 'text-blue-600 bg-blue-100',
    icon: 'spinner'
  },
  COMPLETED: {
    label: 'Enhancement Complete',
    color: 'text-green-600 bg-green-100',
    icon: 'check'
  },
  FAILED: {
    label: 'Enhancement Failed',
    color: 'text-red-600 bg-red-100',
    icon: 'x'
  }
} as const;

// Navigation routes
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  GALLERY: '/gallery',
  PHOTO_DETAIL: '/photos/[id]',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  PRICING: '/pricing',
  SIGNIN: '/auth/signin',
  SIGNUP: '/auth/signup'
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'photo-enhancer-theme',
  USER_PREFERENCES: 'photo-enhancer-preferences',
  RECENT_UPLOADS: 'photo-enhancer-recent-uploads',
  PERFORMANCE_DATA: 'photo-enhancer-performance'
} as const;

// Environment variables
export const ENV_VARS = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN
} as const;

// Feature flags
export const FEATURES = {
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_ERROR_REPORTING: true,
  ENABLE_CACHING: true,
  ENABLE_OFFLINE_SUPPORT: false,
  ENABLE_PWA: false,
  ENABLE_ANALYTICS: false
} as const;