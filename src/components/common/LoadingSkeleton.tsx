'use client'

import { ReactNode, useState, useEffect } from 'react'

interface LoadingSkeletonProps {
  className?: string
  children?: ReactNode
  animate?: boolean
}

export function LoadingSkeleton({ className = '', animate = true }: LoadingSkeletonProps) {
  return (
    <div 
      className={`bg-gray-200 rounded ${animate ? 'animate-pulse' : ''} ${className}`} 
      role="status" 
      aria-label="Loading..."
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
      <div className="w-14 h-14 bg-gray-200 rounded-xl mb-6 animate-pulse" />
      <LoadingSkeleton className="h-6 w-3/4 mb-3" />
      <LoadingSkeleton className="h-4 w-full mb-2" />
      <LoadingSkeleton className="h-4 w-5/6" />
    </div>
  )
}

export function UploadSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <LoadingSkeleton className="h-5 w-48 mb-2" />
          <LoadingSkeleton className="h-4 w-32" />
        </div>
        <LoadingSkeleton className="w-16 h-6 rounded-full" />
      </div>
      <LoadingSkeleton className="h-2 w-full mb-3" />
      <div className="flex justify-between">
        <LoadingSkeleton className="h-4 w-24" />
        <LoadingSkeleton className="h-4 w-12" />
      </div>
    </div>
  )
}

export function HeaderSkeleton() {
  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <LoadingSkeleton className="w-8 h-8 rounded" />
            <LoadingSkeleton className="w-32 h-6 ml-2" />
          </div>
          <div className="flex items-center space-x-4">
            <LoadingSkeleton className="w-16 h-8" />
            <LoadingSkeleton className="w-24 h-8 rounded-lg" />
          </div>
        </div>
      </div>
    </header>
  )
}

export function HeroSkeleton() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center">
        <LoadingSkeleton className="h-12 sm:h-16 lg:h-20 w-full max-w-4xl mx-auto mb-6" />
        <LoadingSkeleton className="h-6 w-full max-w-2xl mx-auto mb-4" />
        <LoadingSkeleton className="h-6 w-3/4 max-w-xl mx-auto mb-10" />
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <LoadingSkeleton className="h-14 w-48" />
          <LoadingSkeleton className="h-14 w-32" />
        </div>
      </div>
    </main>
  )
}

interface SkeletonWrapperProps {
  loading: boolean
  skeleton: ReactNode
  children: ReactNode
  delay?: number
}

export function SkeletonWrapper({ loading, skeleton, children, delay = 300 }: SkeletonWrapperProps) {
  const [showSkeleton, setShowSkeleton] = useState(false)

  useEffect(() => {
    let timeout: NodeJS.Timeout
    
    if (loading) {
      timeout = setTimeout(() => setShowSkeleton(true), delay)
    } else {
      setShowSkeleton(false)
    }

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [loading, delay])

  if (loading && showSkeleton) {
    return <>{skeleton}</>
  }

  return <>{children}</>
}