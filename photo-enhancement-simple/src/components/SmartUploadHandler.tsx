'use client'

import { useState, useRef } from 'react';
import { Upload, AlertCircle, CreditCard, X, CheckCircle, Info } from 'lucide-react';

interface SmartUploadHandlerProps {
  userData: { credits: number; role: string; } | null;
  onUpload: (files: File[]) => void;
  uploading: boolean;
  maxSimultaneousUploads?: number;
}

interface CreditWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  userCredits: number;
  onProcessSelected: () => void;
  onBuyCredits: () => void;
}

function CreditWarningModal({ 
  isOpen, 
  onClose, 
  files, 
  userCredits, 
  onProcessSelected, 
  onBuyCredits 
}: CreditWarningModalProps) {
  if (!isOpen) return null;

  const filesCanProcess = userCredits;
  const filesWillSkip = Math.max(0, files.length - userCredits);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">Not Enough Credits</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-orange-800 font-medium mb-1">
                  You're trying to upload {files.length} photos, but you only have {userCredits} credits.
                </p>
                <p className="text-orange-700">
                  Each photo enhancement costs 1 credit.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Photos you can process now:</span>
              <span className="font-medium text-green-600">{filesCanProcess} photos</span>
            </div>
            
            {filesWillSkip > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Photos that will be skipped:</span>
                <span className="font-medium text-red-600">{filesWillSkip} photos</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm border-t pt-3">
              <span className="text-gray-600">Credits needed for all photos:</span>
              <span className="font-medium text-gray-900">{files.length} credits</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={onBuyCredits}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-5 h-5" />
              <span>Buy More Credits</span>
            </button>
            
            {filesCanProcess > 0 && (
              <button
                onClick={onProcessSelected}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Process {filesCanProcess} Photo{filesCanProcess === 1 ? '' : 's'} Now
              </button>
            )}
            
            <button
              onClick={onClose}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Cancel Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SmartUploadHandler({
  userData,
  onUpload,
  uploading,
  maxSimultaneousUploads = 10 // Default maximum
}: SmartUploadHandlerProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userCredits = userData?.credits || 0;
  const isAdminUnlimited = userData?.role === 'ADMIN' && userCredits >= 999999;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFileSelection(files);
  };

  const processFileSelection = (files: File[]) => {
    if (files.length === 0) return;

    // Filter only image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please select only image files (JPG, PNG, WebP).');
      return;
    }

    // Apply maximum upload limit
    const limitedFiles = imageFiles.slice(0, maxSimultaneousUploads);
    
    if (imageFiles.length > maxSimultaneousUploads) {
      alert(`Maximum ${maxSimultaneousUploads} files allowed per upload. Selected the first ${maxSimultaneousUploads} files.`);
    }

    setSelectedFiles(limitedFiles);

    // Check credit requirements (skip for unlimited admin users)
    if (!isAdminUnlimited && limitedFiles.length > userCredits) {
      setShowCreditWarning(true);
      return;
    }

    // Proceed with upload if credits are sufficient
    onUpload(limitedFiles);
    setSelectedFiles([]);
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
    processFileSelection(files);
  };

  const handleProcessSelected = () => {
    const filesToProcess = selectedFiles.slice(0, userCredits);
    onUpload(filesToProcess);
    setSelectedFiles([]);
    setShowCreditWarning(false);
  };

  const handleBuyCredits = () => {
    setShowCreditWarning(false);
    window.location.href = '/pricing';
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Enhance Photos</h2>
          <div className="text-sm text-gray-600">
            Credits: <span className="font-medium text-blue-600">
              {isAdminUnlimited ? 'Unlimited' : userCredits}
            </span>
          </div>
        </div>
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
          {selectedFiles.length > 0 ? (
            <div className="space-y-4">
              <Upload className="mx-auto h-12 w-12 text-blue-500" />
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {selectedFiles.length} file(s) selected
                </p>
                
                {/* Credit Requirement Info */}
                {!isAdminUnlimited && (
                  <div className="mb-4">
                    {selectedFiles.length <= userCredits ? (
                      <div className="flex items-center justify-center space-x-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">
                          Will use {selectedFiles.length} of your {userCredits} credits
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2 text-orange-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">
                          Need {selectedFiles.length} credits, you have {userCredits}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="max-h-32 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-sm text-gray-600 py-1">
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="ml-2 text-xs">
                        {(file.size / 1024 / 1024).toFixed(1)}MB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (isAdminUnlimited || selectedFiles.length <= userCredits) {
                      onUpload(selectedFiles);
                      setSelectedFiles([]);
                    } else {
                      setShowCreditWarning(true);
                    }
                  }}
                  disabled={uploading || (!isAdminUnlimited && userCredits === 0)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {uploading ? 'Processing...' : `Enhance ${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}`}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); clearFiles(); }}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {dragOver ? 'Drop your photos here' : 'Upload Photos for Enhancement'}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Drag & drop up to {maxSimultaneousUploads} photos, or click to browse
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports JPG, PNG, and WebP • Max 10MB per file
                </p>
              </div>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium">
                Choose Photos
              </button>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        
        {/* Credit Warning */}
        {!isAdminUnlimited && userCredits === 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-800">
                You need credits to enhance photos.{' '}
                <a href="/pricing" className="font-medium underline hover:no-underline">
                  Purchase credits
                </a>{' '}
                to get started.
              </p>
            </div>
          </div>
        )}

        {/* Upload Limits Info */}
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Upload Limits:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Maximum {maxSimultaneousUploads} photos per upload session</li>
            <li>• Each photo enhancement costs 1 credit</li>
            <li>• Supported formats: JPG, PNG, WebP (max 10MB each)</li>
            <li>• Photos are processed using Nano Banana AI technology</li>
          </ul>
        </div>
      </div>

      {/* Credit Warning Modal */}
      <CreditWarningModal
        isOpen={showCreditWarning}
        onClose={() => setShowCreditWarning(false)}
        files={selectedFiles}
        userCredits={userCredits}
        onProcessSelected={handleProcessSelected}
        onBuyCredits={handleBuyCredits}
      />
    </div>
  );
}