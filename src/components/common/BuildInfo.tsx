'use client'

import { useEffect, useState } from 'react'

// Version from package.json - update this when releasing
const APP_VERSION = '0.1.0'

// Build timestamp is set at build time via next.config.ts
const BUILD_TIMESTAMP = process.env.NEXT_PUBLIC_BUILD_TIMESTAMP || 'dev'

interface BuildInfoProps {
  className?: string
}

export default function BuildInfo({ className = '' }: BuildInfoProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Format build timestamp for display
  const formatBuildTime = (timestamp: string) => {
    if (timestamp === 'dev') return 'development'
    try {
      const date = new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return timestamp
    }
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div className={`text-xs text-gray-400 ${className}`}>
      <span>v{APP_VERSION}</span>
      <span className="mx-2">•</span>
      <span>Build: {formatBuildTime(BUILD_TIMESTAMP)}</span>
    </div>
  )
}
