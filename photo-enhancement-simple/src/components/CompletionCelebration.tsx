'use client'

import { useEffect, useState } from 'react'
import { Check, Download, Eye, Share2 } from 'lucide-react'

interface CompletionCelebrationProps {
  isVisible: boolean
  onClose: () => void
  onViewPhoto: () => void
  onDownload: () => void
  photoTitle?: string
}

export default function CompletionCelebration({
  isVisible,
  onClose,
  onViewPhoto,
  onDownload,
  photoTitle
}: CompletionCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'celebrate' | 'exit'>('enter')

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true)
      setAnimationPhase('enter')
      
      // Start celebration phase after entrance
      const celebrateTimer = setTimeout(() => {
        setAnimationPhase('celebrate')
      }, 300)

      // Auto-close after 8 seconds
      const autoCloseTimer = setTimeout(() => {
        setAnimationPhase('exit')
        setTimeout(onClose, 500)
      }, 8000)

      return () => {
        clearTimeout(celebrateTimer)
        clearTimeout(autoCloseTimer)
      }
    } else {
      setShowConfetti(false)
      setAnimationPhase('enter')
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  const getAnimationClasses = () => {
    switch (animationPhase) {
      case 'enter':
        return 'animate-scale-in opacity-0'
      case 'celebrate':
        return 'animate-bounce-gentle opacity-100 scale-100'
      case 'exit':
        return 'animate-fade-out opacity-0 scale-95'
      default:
        return 'opacity-100 scale-100'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-500 z-50 ${
          isVisible ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={() => {
          setAnimationPhase('exit')
          setTimeout(onClose, 500)
        }}
      />

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-40">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 rounded-full animate-confetti-fall opacity-80`}
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: [
                  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
                  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
                ][Math.floor(Math.random() * 10)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Celebration Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div 
          className={`bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-500 ${getAnimationClasses()}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Success Icon */}
          <div className="text-center pt-8 pb-4">
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse-gentle">
                <Check className="w-10 h-10 text-white stroke-[3]" />
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 w-20 h-20 bg-green-400 rounded-full blur-xl opacity-30 animate-ping" />
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              All done! ✨
            </h2>
            <p className="text-gray-600 mb-6">
              {photoTitle ? `"${photoTitle}"` : 'Your photo'} has been enhanced successfully.
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={onViewPhoto}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center space-x-2"
              >
                <Eye className="w-5 h-5" />
                <span>VIEW ENHANCED</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onDownload}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => {
                    // Share functionality could be added here
                    navigator.share?.({
                      title: 'Enhanced Photo',
                      text: 'Check out my enhanced photo!',
                    }).catch(() => {
                      // Fallback for browsers without Web Share API
                      console.log('Share not supported')
                    })
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Close hint */}
            <p className="text-xs text-gray-400 mt-4">
              Click outside or wait to close automatically
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes bounce-gentle {
          0%, 20%, 53%, 80%, 100% {
            animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
            transform: translate3d(0, 0, 0);
          }
          40%, 43% {
            animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
            transform: translate3d(0, -8px, 0);
          }
          70% {
            animation-timing-function: cubic-bezier(0.755, 0.050, 0.855, 0.060);
            transform: translate3d(0, -4px, 0);
          }
          90% {
            transform: translate3d(0, -1px, 0);
          }
        }

        @keyframes pulse-gentle {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(-100vh) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(360deg);
          }
        }

        @keyframes fade-out {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.95);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }

        .animate-bounce-gentle {
          animation: bounce-gentle 1.2s ease-in-out;
        }

        .animate-pulse-gentle {
          animation: pulse-gentle 2s ease-in-out infinite;
        }

        .animate-confetti-fall {
          animation: confetti-fall linear infinite;
        }

        .animate-fade-out {
          animation: fade-out 0.5s ease-in forwards;
        }
      `}</style>
    </>
  )
}