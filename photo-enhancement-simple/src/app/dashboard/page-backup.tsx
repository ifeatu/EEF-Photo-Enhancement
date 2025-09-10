/**
 * BACKUP: Original Dashboard page for emergency rollback
 * Use this if the improved version causes issues
 */

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !userData?.credits) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);
      
      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        // Refresh user data and photos
        fetchUserData();
        fetchPhotos();
        setSelectedFile(null);
        alert('Photo uploaded and enhancement started!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {session.user?.name || session.user?.email}</p>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Credits Remaining</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{userData?.credits || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Photos Enhanced</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{Array.isArray(photos) ? photos.filter(p => p.status === 'completed').length : 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Account Type</h3>
            <p className="text-lg font-medium text-purple-600 mt-2 capitalize">{userData?.role?.toLowerCase() || 'User'}</p>
          </div>
        </div>

        {/* Photo Enhancement Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Enhance New Photo</h2>
          </div>
          <div className="p-6">
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {selectedFile ? (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <div className="mt-4 flex gap-2 justify-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                      disabled={uploading || !userData?.credits}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? 'Uploading...' : 'Enhance Photo'}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mt-2 text-sm text-gray-600">
                    {dragOver ? 'Drop your photo here' : 'Drag & drop a photo here, or click to browse'}
                  </p>
                  <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                    Choose File
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            {!userData?.credits && (
              <p className="mt-2 text-sm text-red-600">You need credits to enhance photos. <a href="/pricing" className="underline">Purchase credits</a></p>
            )}
          </div>
        </div>

        {/* Recent Photos */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recent Photos</h2>
            <Link
              href="/gallery"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All Enhanced Photos →
            </Link>
          </div>
          <div className="p-6">
            {photos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No photos yet. Upload your first photo to get started!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.slice(0, 6).map((photo) => (
                  <Link key={photo.id} href={`/photos/${photo.id}`} className="block">
                    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                      <div className="aspect-w-16 aspect-h-9">
                        <img 
                          src={photo.originalUrl} 
                          alt="Original photo" 
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-center">
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
                        <div className="mt-2 flex gap-2">
                          {photo.status === 'pending' && (
                            <button
                              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
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
                            className={`${photo.status === 'pending' ? 'flex-1' : 'w-full'} px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
                            onClick={() => router.push(`/photos/${photo.id}`)}
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