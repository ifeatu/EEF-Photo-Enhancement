'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Zap, Palette, Focus, CheckCircle } from 'lucide-react'

interface ProcessingOverlayProps {
  progress: number
  estimatedTimeRemaining?: number
  onComplete?: () => void
}

const processingSteps = [
  { icon: Zap, label: 'Analyzing image', threshold: 0 },
  { icon: Palette, label: 'Enhancing colors', threshold: 25 },
  { icon: Focus, label: 'Sharpening details', threshold: 50 },
  { icon: Sparkles, label: 'Applying AI magic', threshold: 75 },
  { icon: CheckCircle, label: 'Finalizing', threshold: 95 }
]

export default function ProcessingOverlay({
  progress,
  estimatedTimeRemaining,
  onComplete
}: ProcessingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [particles, setParticles] = useState<Array<{ id: number, x: number, y: number, delay: number }>>([])

  // Update current step based on progress
  useEffect(() => {
    const step = processingSteps.findIndex((step, index) => {
      const nextStep = processingSteps[index + 1]
      return progress >= step.threshold && (!nextStep || progress < nextStep.threshold)
    })
    setCurrentStep(Math.max(0, step))
  }, [progress])

  // Generate floating particles for visual appeal
  useEffect(() => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2
    }))
    setParticles(newParticles)
  }, [])

  // Handle completion
  useEffect(() => {
    if (progress >= 100 && onComplete) {
      const timer = setTimeout(onComplete, 1000)
      return () => clearTimeout(timer)
    }
  }, [progress, onComplete])

  const getCurrentStepData = () => processingSteps[currentStep] || processingSteps[0]
  const CurrentIcon = getCurrentStepData().icon

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/95 via-purple-900/95 to-indigo-900/95 flex items-center justify-center backdrop-blur-sm">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-float"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main processing card */}
      <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-8 mx-4 max-w-sm w-full border border-white/20 shadow-2xl">
        {/* Glowing border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl" />
        
        <div className="relative text-center text-white">
          {/* Step Icon */}
          <div className="relative inline-block mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
              <CurrentIcon className="w-8 h-8 text-white animate-pulse" />
            </div>
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/60 border-r-white/40 animate-spin" />
          </div>

          {/* Progress Info */}
          <h3 className="text-xl font-semibold mb-2">
            Enhancing your photo...
          </h3>
          
          <p className="text-white/80 mb-1">
            {getCurrentStepData().label}
          </p>

          <p className="text-lg font-bold mb-6">
            {Math.round(progress)}% complete
          </p>

          {/* Progress Bar */}
          <div className="relative w-full h-2 bg-white/20 rounded-full mb-6 overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
            {/* Shimmer effect */}
            <div 
              className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
              style={{ left: `${Math.max(0, Math.min(progress - 10, 90))}%` }}
            />
          </div>

          {/* Time Remaining */}
          {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
            <p className="text-sm text-white/70">
              About {Math.max(1, Math.round(estimatedTimeRemaining / 1000))}s remaining
            </p>
          )}

          {/* Step Indicators */}
          <div className="flex justify-center space-x-2 mt-4">
            {processingSteps.map((step, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  index <= currentStep 
                    ? 'bg-white shadow-lg shadow-white/50' 
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.2;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.5;
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(500%);
          }
        }

        .animate-float {
          animation: float linear infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s linear infinite;
        }
      `}</style>
    </div>
  )
}