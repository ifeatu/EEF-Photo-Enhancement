/**
 * API types and interfaces
 */

// Common response structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

// Photo types
export interface Photo {
  id: string;
  originalUrl: string;
  enhancedUrl: string | null;
  status: PhotoStatus;
  title: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type PhotoStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface PhotoUploadRequest {
  photo: File;
}

export interface PhotoUploadResponse {
  id: string;
  originalUrl: string;
  status: PhotoStatus;
  message: string;
}

export interface PhotoEnhanceRequest {
  photoId: string;
}

export interface PhotoEnhanceResponse {
  id: string;
  status: PhotoStatus;
  message: string;
  enhancedUrl?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'USER' | 'PREMIUM' | 'ADMIN';

export interface UserProfile extends User {
  photoCount: number;
  enhancedCount: number;
}

// API endpoints
export interface PhotosListResponse {
  photos: Photo[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PhotoDetailResponse {
  photo: Photo;
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
  validationErrors?: ValidationError[];
}

// Request/Response types for specific endpoints
export interface GetPhotosRequest {
  page?: number;
  limit?: number;
  status?: PhotoStatus;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdatePhotoRequest {
  title?: string;
  description?: string;
}

// Pagination helpers
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}