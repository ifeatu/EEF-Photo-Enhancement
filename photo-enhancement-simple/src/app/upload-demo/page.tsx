'use client'

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SmartUploadHandler from '@/components/SmartUploadHandler';

interface UserData {
  id: string;
  email: string;
  name: string;
  credits: number;
  role: string;
  createdAt: string;
}

export default function UploadDemo() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{needsUpgrade: boolean, message: string, upgradeUrl?: string}[]>([]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchUserData();
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

  const handleSmartUpload = async (files: File[]) => {
    setUploading(true);
    const results: {needsUpgrade: boolean, message: string, upgradeUrl?: string}[] = [];
    
    try {
      // Process files with proper credit handling
      for (const file of files) {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('title', file.name);
        
        console.log(`🚀 Starting smart upload for ${file.name}`);
        
        const response = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Smart upload response:', result);
          
          if (result.success) {
            results.push({
              needsUpgrade: false,
              message: `${file.name} uploaded successfully - processing started`
            });
          } else {
            results.push({
              needsUpgrade: false,
              message: `Upload failed for ${file.name}: ${result.message}`
            });
          }
        } else {
          const errorData = await response.json();
          console.error('❌ Smart upload error:', errorData);
          results.push({
            needsUpgrade: errorData.error === 'Insufficient credits',
            message: `Upload failed for ${file.name}: ${errorData.error}`,
            upgradeUrl: errorData.error === 'Insufficient credits' ? '/pricing' : undefined
          });
        }
      }
      
      setUploadResults(results);
      
      // Refresh user data
      fetchUserData();
    } catch (error) {
      console.error('Smart upload error:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (status === 'loading') {
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Smart Upload Demo</h1>
          <p className="mt-2 text-gray-600">
            Test the new credit-aware upload system with intelligent limits and warnings.
          </p>
        </div>

        {/* User Stats */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Current Credits</h3>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {userData?.credits || 0}
                {userData?.role === 'ADMIN' && userData?.credits >= 999999 && ' (Unlimited)'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Account Type</h3>
              <p className="text-lg font-medium text-purple-600 mt-1 capitalize">
                {userData?.role?.toLowerCase() || 'User'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">User Email</h3>
              <p className="text-sm text-gray-900 mt-1 truncate">
                {userData?.email || session.user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Smart Upload Handler */}
        <SmartUploadHandler
          userData={userData}
          onUpload={handleSmartUpload}
          uploading={uploading}
          maxSimultaneousUploads={10}
        />

        {/* Upload Results */}
        {uploadResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Results</h3>
              <button 
                onClick={() => setUploadResults([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear Results
              </button>
            </div>
            <div className="space-y-3">
              {uploadResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border ${
                    result.needsUpgrade 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : result.message.includes('successfully')
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                  }`}
                >
                  <p className={`text-sm font-medium ${
                    result.needsUpgrade 
                      ? 'text-yellow-800' 
                      : result.message.includes('successfully')
                        ? 'text-green-800'
                        : 'text-red-800'
                  }`}>
                    {result.message}
                  </p>
                  {result.needsUpgrade && result.upgradeUrl && (
                    <div className="mt-2">
                      <a 
                        href={result.upgradeUrl}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors font-medium"
                      >
                        Buy More Credits
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testing Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Testing Instructions</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>Test Scenarios:</strong></p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Try uploading more photos than your current credits</li>
              <li>Upload exactly your credit amount (should work perfectly)</li>
              <li>Try uploading more than 10 photos (should limit to 10)</li>
              <li>Upload with 0 credits (should show upgrade warning)</li>
              <li>Test with admin account (should allow unlimited uploads)</li>
            </ul>
            
            <p className="mt-4"><strong>Expected Behavior:</strong></p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Smart warning modal when credits are insufficient</li>
              <li>Option to process partial uploads or buy more credits</li>
              <li>Clear credit requirement display</li>
              <li>Maximum 10 simultaneous uploads enforced</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}