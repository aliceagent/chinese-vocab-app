'use client'

import { ReactNode, useEffect, useRef, useState, lazy, Suspense, RefObject } from 'react'
import { LoadingSkeleton } from './LoadingSkeleton'

interface LazyLoadProps {
  children: ReactNode
  height?: number
  offset?: number
  placeholder?: ReactNode
  onLoad?: () => void
}

export function LazyLoad({ 
  children, 
  height = 200, 
  offset = 100, 
  placeholder, 
  onLoad 
}: LazyLoadProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.unobserve(entry.target)
        }
      },
      {
        rootMargin: `${offset}px`,
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [offset])

  useEffect(() => {
    if (isInView && !isLoaded) {
      setIsLoaded(true)
      onLoad?.()
    }
  }, [isInView, isLoaded, onLoad])

  return (
    <div ref={ref} style={{ minHeight: isLoaded ? 'auto' : height }}>
      {isLoaded ? children : (placeholder || <LoadingSkeleton className={`h-${height}`} />)}
    </div>
  )
}

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  placeholder?: string
  blurDataURL?: string
  onLoad?: () => void
}

export function LazyImage({ 
  src, 
  alt, 
  placeholder, 
  blurDataURL, 
  onLoad, 
  className = '', 
  ...props 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.unobserve(entry.target)
        }
      },
      {
        rootMargin: '50px',
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setError(true)
  }

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {isInView && !error && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          {...props}
        />
      )}
      
      {(!isInView || !isLoaded) && !error && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse ${className}`}>
          {placeholder && (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover filter blur-sm"
              style={{ 
                backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined 
              }}
            />
          )}
        </div>
      )}
      
      {error && (
        <div className={`flex items-center justify-center bg-gray-100 text-gray-500 ${className}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
    </div>
  )
}

// Lazy component wrapper
interface LazyComponentProps {
  loader: () => Promise<{ default: React.ComponentType<any> }>
  fallback?: ReactNode
  props?: any
}

export function LazyComponent({ loader, fallback, props = {} }: LazyComponentProps) {
  const Component = lazy(loader)
  
  return (
    <Suspense fallback={fallback || <LoadingSkeleton className="h-32 w-full" />}>
      <Component {...props} />
    </Suspense>
  )
}

// Hook for lazy loading state
export function useLazyLoad(ref: RefObject<Element>, options: IntersectionObserverInit = {}) {
  const [isInView, setIsInView] = useState(false)
  const [hasBeenInView, setHasBeenInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
        if (entry.isIntersecting && !hasBeenInView) {
          setHasBeenInView(true)
        }
      },
      { rootMargin: '50px', ...options }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [ref, options, hasBeenInView])

  return { isInView, hasBeenInView }
}