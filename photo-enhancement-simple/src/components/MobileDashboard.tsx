'use client'

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Camera, Plus, Upload, RotateCcw, Download, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';

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

interface MobileDashboardProps {
  userData: UserData | null;
  photos: Photo[];
  selectedFiles: File[];
  uploading: boolean;
  uploadResults: Array<{needsUpgrade: boolean, message: string, upgradeUrl?: string}>;
  onFileSelect: (files: File[]) => void;
  onUpload: () => void;
  onClearFiles: () => void;
  onDismissResults: () => void;
}

export default function MobileDashboard({
  userData,
  photos,
  selectedFiles,
  uploading,
  uploadResults,
  onFileSelect,
  onUpload,
  onClearFiles,
  onDismissResults
}: MobileDashboardProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFileSelect(files.filter(file => file.type.startsWith('image/')));
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
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files.filter(file => file.type.startsWith('image/')));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'PROCESSING':
        return <RotateCcw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1 truncate max-w-48">
              Welcome back, {userData?.name || userData?.email}
            </p>
          </div>
          <div className="flex-shrink-0">
            <Camera className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Mobile Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Credits</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {userData?.credits || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Enhanced</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {Array.isArray(photos) ? photos.filter(p => p.status === 'COMPLETED').length : 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Upload Results Notification */}
        {uploadResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Upload Results</h3>
              <button 
                onClick={onDismissResults}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Dismiss
              </button>
            </div>
            <div className="space-y-2">
              {uploadResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${
                    result.needsUpgrade ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
                  }`}
                >
                  <p className={`text-sm ${
                    result.needsUpgrade ? 'text-yellow-800' : 'text-green-800'
                  }`}>
                    {result.message}
                  </p>
                  {result.needsUpgrade && result.upgradeUrl && (
                    <a 
                      href={result.upgradeUrl}
                      className="inline-flex items-center mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Upgrade Credits
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Photo Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Enhance Photos</h2>
          </div>
          
          <div className="p-4">
            <div 
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFiles.length > 0 ? (
                <div className="space-y-4">
                  <Upload className="mx-auto h-10 w-10 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      {selectedFiles.length} file(s) selected
                    </p>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="text-xs text-gray-500 truncate">
                          {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex space-x-2 justify-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onUpload(); }}
                      disabled={uploading || !userData?.credits}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {uploading ? 'Uploading...' : `Enhance ${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}`}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onClearFiles(); }}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="mx-auto h-10 w-10 text-gray-400" />
                  <div>
                    <p className="text-base font-medium text-gray-900">
                      {dragOver ? 'Drop your photos here' : 'Upload Photos'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Tap to browse or drag & drop
                    </p>
                  </div>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    Choose Photos
                  </button>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            
            {!userData?.credits && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  You need credits to enhance photos.{' '}
                  <Link href="/pricing" className="font-medium underline hover:no-underline">
                    Purchase credits
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Photos - Mobile Cards */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Photos</h2>
            <Link
              href="/gallery"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          
          <div className="p-4">
            {photos.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="mx-auto h-12 w-12 text-gray-300" />
                <p className="text-gray-500 mt-3">No photos yet</p>
                <p className="text-sm text-gray-400 mt-1">Upload your first photo to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {photos.slice(0, 6).map((photo) => (
                  <Link 
                    key={photo.id} 
                    href={`/photos/${photo.id}`}
                    className="block"
                  >
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0">
                        <img 
                          src={photo.originalUrl} 
                          alt="Photo thumbnail" 
                          className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(photo.status)}
                          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(photo.status)}`}>
                            {photo.status.toLowerCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(photo.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0 flex space-x-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        {photo.status === 'COMPLETED' && photo.enhancedUrl && (
                          <button className="p-2 text-gray-400 hover:text-gray-600">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link 
            href="/pricing"
            className="bg-blue-600 text-white p-4 rounded-xl text-center hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Buy Credits</span>
          </Link>
          <Link 
            href="/gallery"
            className="bg-gray-800 text-white p-4 rounded-xl text-center hover:bg-gray-900 transition-colors"
          >
            <Camera className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">View Gallery</span>
          </Link>
        </div>
      </div>
    </div>
  );
}