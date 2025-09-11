'use client'

import { CheckCircle, Clock, AlertCircle, Zap } from 'lucide-react'

interface PhotoStatusBadgeProps {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  animated?: boolean
}

export default function PhotoStatusBadge({ 
  status, 
  size = 'md', 
  showIcon = true, 
  animated = true 
}: PhotoStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'PENDING':
        return {
          icon: Clock,
          label: 'Pending',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-300',
          iconColor: 'text-yellow-600'
        }
      case 'PROCESSING':
        return {
          icon: Zap,
          label: 'Processing',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-300',
          iconColor: 'text-blue-600'
        }
      case 'COMPLETED':
        return {
          icon: CheckCircle,
          label: 'Complete',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-300',
          iconColor: 'text-green-600'
        }
      case 'FAILED':
        return {
          icon: AlertCircle,
          label: 'Failed',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-300',
          iconColor: 'text-red-600'
        }
      default:
        return {
          icon: Clock,
          label: status,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-300',
          iconColor: 'text-gray-600'
        }
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3',
          spacing: 'gap-1'
        }
      case 'lg':
        return {
          container: 'px-4 py-2 text-sm',
          icon: 'w-5 h-5',
          spacing: 'gap-2'
        }
      default:
        return {
          container: 'px-3 py-1 text-sm',
          icon: 'w-4 h-4',
          spacing: 'gap-1.5'
        }
    }
  }

  const config = getStatusConfig()
  const sizeClasses = getSizeClasses()
  const Icon = config.icon

  const getAnimationClasses = () => {
    if (!animated) return ''
    
    switch (status) {
      case 'PROCESSING':
        return 'animate-pulse'
      case 'COMPLETED':
        return 'animate-bounce-once'
      default:
        return ''
    }
  }

  return (
    <span 
      className={`
        inline-flex items-center font-medium rounded-full border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses.container} ${sizeClasses.spacing}
        ${getAnimationClasses()}
        transition-all duration-200
      `}
    >
      {showIcon && (
        <Icon 
          className={`${sizeClasses.icon} ${config.iconColor} ${
            status === 'PROCESSING' && animated ? 'animate-spin' : ''
          }`} 
        />
      )}
      {config.label}
    </span>
  )
}

// Custom animation for bounce once
const styles = `
  @keyframes bounce-once {
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

  .animate-bounce-once {
    animation: bounce-once 1s ease-in-out;
  }
`

// Add styles to document head if not already added
if (typeof document !== 'undefined' && !document.getElementById('photo-status-badge-styles')) {
  const styleSheet = document.createElement('style')
  styleSheet.id = 'photo-status-badge-styles'
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}