'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Download, Eye, ArrowLeft, Grid, List } from 'lucide-react';

interface Photo {
  id: string;
  originalUrl: string;
  enhancedUrl: string;
  status: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export default function Gallery() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    fetchEnhancedPhotos();
  }, [session, status, router]);

  const fetchEnhancedPhotos = async () => {
    try {
      const response = await fetch('/api/photos');
      if (response.ok) {
        const data = await response.json();
        // Filter only completed photos with enhanced URLs
        const enhancedPhotos = data.photos.filter(
          (photo: Photo) => photo.status === 'COMPLETED' && photo.enhancedUrl
        );
        setPhotos(enhancedPhotos);
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPhoto = async (photo: Photo) => {
    try {
      const response = await fetch(photo.enhancedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enhanced-${photo.title || 'photo'}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your enhanced photos...</p>
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
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Enhanced Photos Gallery</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {photos.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No enhanced photos yet</h3>
            <p className="text-gray-600 mb-6">Upload and enhance some photos to see them here!</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload Photos
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                {photos.length} Enhanced Photo{photos.length !== 1 ? 's' : ''}
              </h2>
              <p className="text-gray-600">Your AI-enhanced photos are ready for viewing and download</p>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {photos.map((photo) => (
                  <div key={photo.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-w-4 aspect-h-3 relative">
                      <Image
                        src={photo.enhancedUrl}
                        alt={photo.title || 'Enhanced photo'}
                        fill
                        className="object-contain bg-gray-50"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 truncate mb-2">
                        {photo.title || 'Untitled'}
                      </h3>
                      {photo.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {photo.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/photos/${photo.id}`}
                          className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                        <button
                          onClick={() => downloadPhoto(photo)}
                          className="flex items-center text-green-600 hover:text-green-700 text-sm font-medium"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {photos.map((photo) => (
                    <div key={photo.id} className="p-6 flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-16 w-16 relative rounded-lg overflow-hidden">
                          <Image
                            src={photo.enhancedUrl}
                            alt={photo.title || 'Enhanced photo'}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {photo.title || 'Untitled'}
                        </h3>
                        {photo.description && (
                          <p className="text-gray-600 truncate">{photo.description}</p>
                        )}
                        <p className="text-sm text-gray-500">
                          Enhanced on {new Date(photo.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Link
                          href={`/photos/${photo.id}`}
                          className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-700 border border-blue-600 hover:border-blue-700 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                        <button
                          onClick={() => downloadPhoto(photo)}
                          className="flex items-center px-3 py-2 text-green-600 hover:text-green-700 border border-green-600 hover:border-green-700 rounded-lg transition-colors"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}