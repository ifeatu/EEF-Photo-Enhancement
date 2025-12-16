'use client'

import { useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Grid3X3, Grid2X2, Download, Eye, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

interface Photo {
  id: string;
  originalUrl: string;
  enhancedUrl: string | null;
  status: string;
  title: string | null;
  createdAt: string;
}

interface MobileGalleryProps {
  photos: Photo[];
}

export default function MobileGallery({ photos }: MobileGalleryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gridSize, setGridSize] = useState<'small' | 'large'>('small');
  const [showFilters, setShowFilters] = useState(false);

  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = !searchTerm || 
      (photo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || photo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'PROCESSING':
        return <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500';
      case 'FAILED':
        return 'bg-red-500';
      case 'PROCESSING':
        return 'bg-blue-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const downloadImage = async (url: string, filename: string) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Gallery</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setGridSize(gridSize === 'small' ? 'large' : 'small')}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                {gridSize === 'small' ? <Grid2X2 className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search photos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Filter by Status</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All Photos', count: photos.length },
                  { value: 'COMPLETED', label: 'Enhanced', count: photos.filter(p => p.status === 'COMPLETED').length },
                  { value: 'PROCESSING', label: 'Processing', count: photos.filter(p => p.status === 'PROCESSING').length },
                  { value: 'FAILED', label: 'Failed', count: photos.filter(p => p.status === 'FAILED').length },
                  { value: 'PENDING', label: 'Pending', count: photos.filter(p => p.status === 'PENDING').length },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      statusFilter === filter.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="p-4">
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms' : 'Upload your first photo to get started!'}
            </p>
            {!searchTerm && (
              <Link 
                href="/dashboard"
                className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Photos
              </Link>
            )}
          </div>
        ) : (
          <div className={`grid gap-3 ${
            gridSize === 'small' ? 'grid-cols-2' : 'grid-cols-1'
          }`}>
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Photo Container */}
                <Link href={`/photos/${photo.id}`} className="block relative">
                  <div className={`relative ${gridSize === 'small' ? 'aspect-square' : 'aspect-[4/3]'}`}>
                    <img
                      src={photo.originalUrl}
                      alt={photo.title || 'Photo'}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Status Indicator */}
                    <div className="absolute top-2 left-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(photo.status)}`} />
                    </div>
                    
                    {/* Enhanced Badge */}
                    {photo.status === 'COMPLETED' && photo.enhancedUrl && (
                      <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Enhanced
                      </div>
                    )}
                  </div>
                </Link>

                {/* Photo Info */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(photo.status)}
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {photo.status.toLowerCase()}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(photo.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {photo.title && (
                    <p className="text-sm text-gray-600 truncate mb-2">{photo.title}</p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center">
                    <Link
                      href={`/photos/${photo.id}`}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </Link>
                    
                    {photo.status === 'COMPLETED' && photo.enhancedUrl && (
                      <button
                        onClick={() => downloadImage(photo.enhancedUrl!, `enhanced-${photo.id}.jpg`)}
                        className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results Summary */}
      {filteredPhotos.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-full text-center text-sm z-30">
          Showing {filteredPhotos.length} of {photos.length} photos
        </div>
      )}
    </div>
  );
}