'use client'

interface ProgressBarProps {
  progress: number
  stage: 'uploading' | 'processing' | 'complete' | 'error'
}

export default function ProgressBar({ progress, stage }: ProgressBarProps) {
  const getProgressColor = () => {
    switch (stage) {
      case 'uploading':
        return 'bg-blue-600'
      case 'processing':
        return 'bg-amber-600'
      case 'complete':
        return 'bg-green-600'
      case 'error':
        return 'bg-red-600'
      default:
        return 'bg-gray-600'
    }
  }

  const getProgressBackground = () => {
    switch (stage) {
      case 'uploading':
        return 'bg-blue-200'
      case 'processing':
        return 'bg-amber-200'
      case 'complete':
        return 'bg-green-200'
      case 'error':
        return 'bg-red-200'
      default:
        return 'bg-gray-200'
    }
  }

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className={`w-full h-2 rounded-full ${getProgressBackground()}`}>
        <div
          className={`h-2 rounded-full transition-all duration-300 ease-out ${getProgressColor()}`}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>

      {/* Stage Indicators */}
      <div className="flex items-center justify-between mt-3 text-xs">
        <div className="flex items-center space-x-4">
          {/* Upload Stage */}
          <div className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                progress >= 10 || stage === 'complete'
                  ? 'bg-green-500'
                  : stage === 'uploading'
                  ? 'bg-blue-500 animate-pulse'
                  : 'bg-gray-300'
              }`}
            />
            <span
              className={`${
                progress >= 10 || stage === 'complete'
                  ? 'text-green-600'
                  : stage === 'uploading'
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-500'
              }`}
            >
              Upload
            </span>
          </div>

          {/* Processing Stage */}
          <div className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                stage === 'complete'
                  ? 'bg-green-500'
                  : stage === 'processing'
                  ? 'bg-amber-500 animate-pulse'
                  : progress >= 10
                  ? 'bg-gray-400'
                  : 'bg-gray-300'
              }`}
            />
            <span
              className={`${
                stage === 'complete'
                  ? 'text-green-600'
                  : stage === 'processing'
                  ? 'text-amber-600 font-medium'
                  : progress >= 10
                  ? 'text-gray-600'
                  : 'text-gray-500'
              }`}
            >
              Processing
            </span>
          </div>

          {/* Complete Stage */}
          <div className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                stage === 'complete'
                  ? 'bg-green-500'
                  : stage === 'error'
                  ? 'bg-red-500'
                  : 'bg-gray-300'
              }`}
            />
            <span
              className={`${
                stage === 'complete'
                  ? 'text-green-600 font-medium'
                  : stage === 'error'
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}
            >
              {stage === 'error' ? 'Failed' : 'Complete'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}