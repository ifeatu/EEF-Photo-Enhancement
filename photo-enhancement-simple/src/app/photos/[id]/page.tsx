'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Download, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface Photo {
  id: string;
  originalUrl: string;
  enhancedUrl: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PhotoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [polling, setPolling] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [estimatedCompletion, setEstimatedCompletion] = useState<Date | null>(null);
  const [progress, setProgress] = useState(0);
  const [retrying, setRetrying] = useState(false);

  const photoId = params?.id as string;

  const fetchPhoto = async () => {
    try {
      const response = await fetch(`/api/photos/${photoId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch photo');
      }
      
      const newPhoto = data.photo;
      setPhoto(newPhoto);
      setError(null);
      
      // Track processing start time and estimate completion
      if (newPhoto.status === 'PROCESSING' && !processingStartTime) {
        const startTime = new Date(newPhoto.updatedAt);
        setProcessingStartTime(startTime);
        
        // Estimate 15-45 seconds for completion (average 30 seconds)
        const estimatedDuration = 30000; // 30 seconds
        setEstimatedCompletion(new Date(startTime.getTime() + estimatedDuration));
      }
      
      // Calculate progress for processing photos
      if (newPhoto.status === 'PROCESSING' && processingStartTime) {
        const now = new Date();
        const elapsed = now.getTime() - processingStartTime.getTime();
        const estimatedTotal = 30000; // 30 seconds estimated
        const calculatedProgress = Math.min((elapsed / estimatedTotal) * 100, 95); // Cap at 95% until complete
        setProgress(calculatedProgress);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch photo');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (polling) return;
    
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/photos/${photoId}`);
        const data = await response.json();
        
        if (response.ok) {
          setPhoto(data.photo);
          
          // Stop polling if photo is completed or failed
          if (data.photo.status === 'COMPLETED' || data.photo.status === 'FAILED') {
            clearInterval(interval);
            setPolling(false);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      setPolling(false);
    }, 300000);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleRetryEnhancement = async () => {
    if (!photo?.id || retrying) return;
    
    setRetrying(true);
    setError(null);
    try {
      const response = await fetch(`/api/photos/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoId: photo.id }),
      });
      
      if (response.ok) {
        // Refresh photo data to show updated status
        await fetchPhoto();
        // Start polling for updates
        setPolling(true);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = `Failed to retry enhancement: ${errorData.error || response.statusText}`;
        console.error('Retry failed:', errorData);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Retry error:', error);
      const errorMessage = 'Network error occurred while retrying enhancement. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setRetrying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'PROCESSING': return 'text-blue-600 bg-blue-100';
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      case 'FAILED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pending Enhancement';
      case 'PROCESSING': return 'Processing...';
      case 'COMPLETED': return 'Enhancement Complete';
      case 'FAILED': return 'Enhancement Failed';
      default: return status;
    }
  };

  useEffect(() => {
    fetchPhoto();
  }, [photoId]);

  useEffect(() => {
    if (photo && (photo.status === 'PENDING' || photo.status === 'PROCESSING')) {
      startPolling();
    }
  }, [photo?.status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading photo...</p>
        </div>
      </div>
    );
  }

  if (error || !photo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Photo not found'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Dashboard
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {photo.title || 'Untitled Photo'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(photo.status)}`}>
                {getStatusText(photo.status)}
                {polling && photo.status === 'PROCESSING' && (
                  <RefreshCw className="h-4 w-4 animate-spin inline ml-2" />
                )}
              </span>
              
              {/* Comparison Toggle */}
              {photo.enhancedUrl && (
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showComparison ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showComparison ? 'Hide Comparison' : 'Compare'}
                </button>
              )}
              
              {/* Download Button */}
              {photo.enhancedUrl && (
                <button
                  onClick={() => handleDownload(photo.enhancedUrl!, `enhanced-${photo.title || 'photo'}.jpg`)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Photo Display */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {showComparison && photo.enhancedUrl ? (
            /* Comparison View */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              <div className="relative">
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-black bg-opacity-75 text-white px-3 py-1 rounded-lg text-sm font-medium">
                    Original
                  </span>
                </div>
                <div className="relative min-h-[400px] max-h-[600px]">
                  <Image
                    src={photo.originalUrl}
                    alt="Original photo"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </div>
              <div className="relative">
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-black bg-opacity-75 text-white px-3 py-1 rounded-lg text-sm font-medium">
                    Enhanced
                  </span>
                </div>
                <div className="relative min-h-[400px] max-h-[600px]">
                  <Image
                    src={photo.enhancedUrl}
                    alt="Enhanced photo"
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Single View */
            <div className="relative">
              <div className="relative min-h-[500px] max-h-[80vh] max-w-4xl mx-auto">
                <Image
                  src={photo.enhancedUrl || photo.originalUrl}
                  alt={photo.title || 'Photo'}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                  priority
                />
              </div>
              {!photo.enhancedUrl && photo.status === 'PROCESSING' && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-center text-white max-w-sm mx-auto px-4">
                    <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">Enhancing your photo...</p>
                    <p className="text-sm opacity-75 mb-4">
                      {Math.round(progress)}% complete
                      {estimatedCompletion && (
                        <span className="block mt-1">
                          Est. {Math.max(0, Math.round((estimatedCompletion.getTime() - new Date().getTime()) / 1000))}s remaining
                        </span>
                      )}
                    </p>
                    <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                      <div 
                        className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Photo Details */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Photo Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Title</h3>
              <p className="text-gray-900">{photo.title || 'Untitled'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(photo.status)}`}>
                {getStatusText(photo.status)}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Created</h3>
              <p className="text-gray-900">{new Date(photo.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Last Updated</h3>
              <p className="text-gray-900">{new Date(photo.updatedAt).toLocaleString()}</p>
            </div>
            {photo.description && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p className="text-gray-900">{photo.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Processing Status */}
        {(photo.status === 'PROCESSING' || photo.status === 'PENDING') && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-3 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-blue-900">
                  {photo.status === 'PENDING' ? 'Queued for Enhancement' : 'Enhancement in Progress'}
                </h3>
                <p className="text-blue-700 mt-1">
                  {photo.status === 'PENDING' 
                    ? 'Your photo is queued for processing. Enhancement will begin shortly.'
                    : 'Your photo is being enhanced with AI. This page will automatically update when complete.'
                  }
                  {polling && ' (Auto-refreshing every 3 seconds)'}
                </p>
                
                {/* Progress Bar for Processing */}
                {photo.status === 'PROCESSING' && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-blue-700 mb-2">
                      <span>Progress: {Math.round(progress)}%</span>
                      {estimatedCompletion && (
                        <span>
                          Est. completion: {estimatedCompletion.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-xs text-blue-600">
                      {processingStartTime && (
                        <span>
                          Started: {processingStartTime.toLocaleTimeString()} • 
                          Elapsed: {Math.round((new Date().getTime() - processingStartTime.getTime()) / 1000)}s
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Failed Status */}
        {photo.status === 'FAILED' && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-red-900">Enhancement Failed</h3>
            </div>
            <p className="text-red-700 mb-4">
              We encountered an issue while enhancing your photo. This could be due to image format, size, or temporary service issues.
            </p>
            
            {/* Show retry error if any */}
            {error && (
              <div className="bg-red-100 border border-red-300 rounded-md p-3 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleRetryEnhancement}
                disabled={retrying}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                {retrying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Retrying...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Retry Enhancement</span>
                  </>
                )}
              </button>
              <p className="text-sm text-red-600">
                💡 <strong>Tip:</strong> If retry fails, try re-uploading the photo with a different format (JPG/PNG) or smaller size.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}