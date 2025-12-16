'use client'

import { useState } from 'react';
import { ArrowLeft, Download, RotateCcw, Share2, Heart, Maximize2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';

interface Photo {
  id: string;
  originalUrl: string;
  enhancedUrl: string | null;
  status: string;
  title: string | null;
  createdAt: string;
}

interface MobilePhotoViewProps {
  photo: Photo;
  progress: number;
  polling: boolean;
  showCelebration: boolean;
  onRetryEnhancement: () => void;
  onDownload: (url: string, filename: string) => void;
  retrying: boolean;
  error: string | null;
}

export default function MobilePhotoView({
  photo,
  progress,
  polling,
  showCelebration,
  onRetryEnhancement,
  onDownload,
  retrying,
  error
}: MobilePhotoViewProps) {
  const [activeView, setActiveView] = useState<'original' | 'enhanced'>('original');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          text: 'Enhanced',
          color: 'text-green-600 bg-green-100 border-green-200'
        };
      case 'PROCESSING':
        return {
          icon: <RotateCcw className="w-5 h-5 animate-spin" />,
          text: 'Processing',
          color: 'text-blue-600 bg-blue-100 border-blue-200'
        };
      case 'FAILED':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          text: 'Failed',
          color: 'text-red-600 bg-red-100 border-red-200'
        };
      default:
        return {
          icon: <Clock className="w-5 h-5" />,
          text: 'Pending',
          color: 'text-yellow-600 bg-yellow-100 border-yellow-200'
        };
    }
  };

  const statusConfig = getStatusConfig(photo.status);
  const currentImageUrl = activeView === 'enhanced' && photo.enhancedUrl 
    ? photo.enhancedUrl 
    : photo.originalUrl;

  const handleShare = async () => {
    if (navigator.share && photo.enhancedUrl) {
      try {
        await navigator.share({
          title: 'Enhanced Photo',
          text: 'Check out my enhanced photo!',
          url: photo.enhancedUrl,
        });
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(photo.enhancedUrl);
      }
    } else if (photo.enhancedUrl) {
      navigator.clipboard.writeText(photo.enhancedUrl);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Link 
            href="/dashboard"
            className="text-white hover:text-gray-300 transition-colors p-2 -ml-2"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          
          <div className="flex-1 px-4">
            <h1 className="text-white font-medium truncate text-center">
              {photo.title || 'Photo Enhancement'}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            {photo.enhancedUrl && (
              <>
                <button
                  onClick={handleShare}
                  className="text-white hover:text-gray-300 transition-colors p-2"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDownload(photo.enhancedUrl!, `enhanced-${photo.id}.jpg`)}
                  className="text-white hover:text-gray-300 transition-colors p-2"
                >
                  <Download className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="px-4 pb-3">
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${statusConfig.color}`}>
            {statusConfig.icon}
            <span className="text-sm font-medium">{statusConfig.text}</span>
          </div>
          
          {photo.status === 'PROCESSING' && (
            <div className="mt-2">
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-white/80 text-xs mt-1">{progress}% complete</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Image Area */}
      <div className="pt-24 pb-32">
        <div className="relative">
          <div 
            className="relative cursor-pointer"
            onClick={() => setShowFullscreen(true)}
          >
            <img
              src={currentImageUrl}
              alt="Photo"
              className="w-full h-auto max-h-[70vh] object-contain"
              onLoad={() => setImageLoaded(true)}
            />
            
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-800 animate-pulse rounded-lg" />
            )}
            
            <div className="absolute top-4 right-4">
              <button className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Image Toggle Buttons */}
          {photo.enhancedUrl && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-black/70 backdrop-blur-sm rounded-full p-1 flex space-x-1">
                <button
                  onClick={() => setActiveView('original')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeView === 'original'
                      ? 'bg-white text-black'
                      : 'text-white hover:text-gray-300'
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => setActiveView('enhanced')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeView === 'enhanced'
                      ? 'bg-white text-black'
                      : 'text-white hover:text-gray-300'
                  }`}
                >
                  Enhanced
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-gray-800">
        <div className="px-4 py-4 space-y-3">
          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 border border-red-800 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {photo.status === 'FAILED' ? (
              <button
                onClick={onRetryEnhancement}
                disabled={retrying}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-medium transition-colors"
              >
                {retrying ? (
                  <RotateCcw className="w-5 h-5 animate-spin" />
                ) : (
                  <RotateCcw className="w-5 h-5" />
                )}
                <span>{retrying ? 'Retrying...' : 'Retry Enhancement'}</span>
              </button>
            ) : photo.enhancedUrl ? (
              <button
                onClick={() => onDownload(photo.enhancedUrl!, `enhanced-${photo.id}.jpg`)}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl font-medium transition-colors"
              >
                <Download className="w-5 h-5" />
                <span>Download Enhanced</span>
              </button>
            ) : (
              <div className="flex items-center justify-center px-4 py-3 bg-gray-800 rounded-xl">
                <span className="text-gray-400 text-sm">Processing in progress...</span>
              </div>
            )}

            <button className="flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-xl font-medium transition-colors">
              <Heart className="w-5 h-5" />
              <span>Save</span>
            </button>
          </div>

          {/* Photo Info */}
          <div className="text-center">
            <p className="text-gray-400 text-xs">
              Uploaded {new Date(photo.createdAt).toLocaleDateString()} • ID: {photo.id.substring(0, 8)}
            </p>
          </div>
        </div>
      </div>

      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-white text-xl font-bold mb-2">Enhanced!</div>
            <div className="text-white/80">Your photo looks amazing!</div>
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div className="fixed inset-0 z-60 bg-black">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowFullscreen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2 z-10"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            <img
              src={currentImageUrl}
              alt="Fullscreen photo"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}