/**
 * Dashboard page - restored to working version
 * Enhanced features are available as separate utilities
 */

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import SmartUploadHandler from '@/components/SmartUploadHandler';

interface UserData {
  id: string;
  email: string;
  name: string;
  credits: number;
  role: string;
  createdAt: string;
}

interface Photo {
  id: string;
  originalUrl: string;
  enhancedUrl: string | null;
  status: string;
  createdAt: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{needsUpgrade: boolean, message: string, upgradeUrl?: string}[]>([]);

  // Status polling for async processing
  const pollPhotoStatus = async (photoId: string, fileName: string) => {
    console.log(`🔄 Starting status polling for ${fileName}`);
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/photos/status?photoId=${photoId}`);
        const result = await response.json();
        
        if (result.success) {
          const { status, isComplete } = result.data;
          
          console.log(`📊 ${fileName} status: ${status}`);
          
          if (isComplete) {
            console.log(`✅ ${fileName} processing complete: ${status}`);
            // Refresh photos list
            await fetchPhotos();
            return;
          }
          
          // Continue polling if not complete
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            console.log(`⏱️ ${fileName} polling timeout after ${maxAttempts} attempts`);
          }
        }
      } catch (error) {
        console.error(`❌ Status polling error for ${fileName}:`, error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Retry in 10 seconds on error
        }
      }
    };
    
    // Start polling after a short delay
    setTimeout(poll, 2000);
  };

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchUserData();
    fetchPhotos();
  }, [session, status, router]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchPhotos = async () => {
    try {
      const response = await fetch('/api/photos');
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Welcome back, {session.user?.name || session.user?.email}
          </p>
        </div>

        {/* User Stats - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-sm sm:text-lg font-medium text-gray-900">Credits Remaining</h3>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1 sm:mt-2">
              {userData?.credits || 0}
              {userData?.role === 'ADMIN' && userData?.credits >= 999999 && (
                <span className="text-sm font-normal text-gray-500 block">Unlimited</span>
              )}
            </p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-sm sm:text-lg font-medium text-gray-900">Photos Enhanced</h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2">
              {Array.isArray(photos) ? photos.filter(p => p.status === 'completed').length : 0}
            </p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow sm:col-span-2 lg:col-span-1">
            <h3 className="text-sm sm:text-lg font-medium text-gray-900">Account Type</h3>
            <p className="text-lg sm:text-xl font-medium text-purple-600 mt-1 sm:mt-2 capitalize">
              {userData?.role?.toLowerCase() || 'User'}
            </p>
          </div>
        </div>

        {/* Upload Results Notification - Mobile Optimized */}
        {uploadResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Upload Results</h3>
            <div className="space-y-2 sm:space-y-3">
              {uploadResults.map((result, index) => (
                <div key={index} className={`p-3 rounded-lg ${
                  result.needsUpgrade ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <p className={`text-xs sm:text-sm ${
                    result.needsUpgrade ? 'text-yellow-800' : 'text-green-800'
                  }`}>{result.message}</p>
                  {result.needsUpgrade && result.upgradeUrl && (
                    <div className="mt-2">
                      <a 
                        href={result.upgradeUrl}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors font-medium"
                      >
                        Upgrade to Add More Credits
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={() => setUploadResults([])}
              className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500 hover:text-gray-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Photo Enhancement Section - Using Smart Upload Handler */}
        <SmartUploadHandler
          userData={userData}
          onUpload={async (files: File[]) => {
            setUploading(true);
            const results: {needsUpgrade: boolean, message: string, upgradeUrl?: string}[] = [];
            
            try {
              for (const file of files) {
                const formData = new FormData();
                formData.append('photo', file);
                formData.append('title', file.name);
                
                console.log(`🚀 Starting upload for ${file.name}`);
                
                const response = await fetch('/api/photos/upload', {
                  method: 'POST',
                  body: formData,
                });
                
                if (response.ok) {
                  const result = await response.json();
                  console.log('✅ Upload response:', result);
                  
                  if (result.success) {
                    results.push({
                      needsUpgrade: false,
                      message: `${file.name} uploaded successfully - processing started`
                    });
                    
                    // Start polling for processing status (non-blocking)
                    pollPhotoStatus(result.data.photoId, file.name);
                  } else {
                    results.push({
                      needsUpgrade: false,
                      message: `Upload failed for ${file.name}: ${result.message}`
                    });
                  }
                } else {
                  const errorData = await response.json();
                  console.error('❌ Upload error:', errorData);
                  results.push({
                    needsUpgrade: errorData.error === 'Insufficient credits',
                    message: `Upload failed for ${file.name}: ${errorData.error}`,
                    upgradeUrl: errorData.error === 'Insufficient credits' ? '/pricing' : undefined
                  });
                }
              }
              
              setUploadResults(results);
              
              // Refresh user data and photos
              fetchUserData();
              fetchPhotos();
            } catch (error) {
              console.error('Upload error:', error);
              alert('Failed to upload photos. Please try again.');
            } finally {
              setUploading(false);
            }
          }}
          uploading={uploading}
          maxSimultaneousUploads={10}
        />

        {/* Recent Photos - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Photos</h2>
            <Link
              href="/gallery"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium text-center sm:text-right"
            >
              View All Enhanced Photos →
            </Link>
          </div>
          <div className="p-4 sm:p-6">
            {photos.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm sm:text-base">
                No photos yet. Upload your first photo to get started!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {photos.slice(0, 6).map((photo) => (
                  <Link key={photo.id} href={`/photos/${photo.id}`} className="block">
                    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                      <div className="aspect-w-4 aspect-h-3">
                        <img 
                          src={photo.originalUrl} 
                          alt="Original photo" 
                          className="w-full h-36 sm:h-48 object-contain bg-gray-50"
                        />
                      </div>
                      <div className="p-3 sm:p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            photo.status === 'completed' ? 'bg-green-100 text-green-800' :
                            photo.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {photo.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(photo.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          {photo.status === 'pending' && (
                            <button
                              className="w-full sm:flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                  const response = await fetch('/api/photos/enhance', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ photoId: photo.id })
                                  });
                                  if (response.ok) {
                                    // Refresh the page to show updated status
                                    window.location.reload();
                                  }
                                } catch (error) {
                                  console.error('Enhancement failed:', error);
                                }
                              }}
                            >
                              Enhance Now
                            </button>
                          )}
                          <button
                            className={`${photo.status === 'pending' ? 'w-full sm:flex-1' : 'w-full'} px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(`/photos/${photo.id}`);
                            }}
                          >
                            {photo.status === 'completed' ? 'View Enhanced' : 'View Progress'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}