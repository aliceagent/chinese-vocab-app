'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FileUpload as FileUploadType } from '@/types'
import ProgressBar from './ProgressBar'
import UploadStatus from './UploadStatus'
import { getConnectionQuality, getAdaptiveTimeout } from '@/lib/api'
import { LoadingSkeleton, UploadSkeleton } from '@/components/common/LoadingSkeleton'

interface FileUploadProps {
  onUploadComplete: (upload: FileUploadType) => void
  onUploadUpdate: (uploadId: string, updates: Partial<FileUploadType>) => void
}

interface UploadState {
  stage: 'idle' | 'uploading' | 'processing' | 'complete' | 'error'
  progress: number
  bytesUploaded: number
  totalBytes: number
  fileName: string
  error?: string
  uploadId?: string
  uploadSpeed?: number // MB/s
}

const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc'
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const CHUNK_SIZE_SLOW = 64 * 1024 // 64KB for slow connections
const CHUNK_SIZE_FAST = 512 * 1024 // 512KB for fast connections

export default function FileUpload({ onUploadComplete, onUploadUpdate }: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>({
    stage: 'idle',
    progress: 0,
    bytesUploaded: 0,
    totalBytes: 0,
    fileName: ''
  })
  const [connectionQuality, setConnectionQuality] = useState<'slow' | 'fast' | 'unknown'>('unknown')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Check connection quality on mount
  useEffect(() => {
    setConnectionQuality(getConnectionQuality())
  }, [])

  // Server-Sent Events connection for real-time updates
  const connectSSE = useCallback((uploadId: string) => {
    if (typeof window === 'undefined') return

    const eventSource = new EventSource(`/api/upload/progress/${uploadId}`)
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'connected':
            console.log('SSE connected for upload:', uploadId)
            break
            
          case 'processing_start':
            setUploadState(prev => ({
              ...prev,
              stage: 'processing',
              progress: 10
            }))
            break
            
          case 'processing_progress':
            setUploadState(prev => ({
              ...prev,
              progress: Math.min(10 + (data.progress * 80), 90)
            }))
            break
            
          case 'processing_complete':
            setUploadState(prev => ({
              ...prev,
              stage: 'complete',
              progress: 100
            }))
            
            if (data.upload) {
              onUploadComplete(data.upload)
            }
            eventSource.close()
            break
            
          case 'processing_error':
            setUploadState(prev => ({
              ...prev,
              stage: 'error',
              error: data.error || 'Processing failed'
            }))
            eventSource.close()
            break
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error)
      }
    }
    
    eventSource.onerror = () => {
      setUploadState(prev => ({
        ...prev,
        stage: 'error',
        error: 'Connection error - please refresh and try again'
      }))
      eventSource.close()
    }
    
    // Store reference for cleanup
    wsRef.current = eventSource as any
    
    return () => {
      eventSource.close()
    }
  }, [onUploadComplete])

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const validateFile = (file: File): string | null => {
    if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
      return `File type not supported. Please upload: ${Object.values(ALLOWED_TYPES).join(', ')}`
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
    }
    
    return null
  }

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setUploadState({
        stage: 'error',
        progress: 0,
        bytesUploaded: 0,
        totalBytes: file.size,
        fileName: file.name,
        error: validationError
      })
      return
    }

    setUploadState({
      stage: 'uploading',
      progress: 0,
      bytesUploaded: 0,
      totalBytes: file.size,
      fileName: file.name
    })

    // Detect connection quality and adjust settings
    const connectionQuality = getConnectionQuality()
    // Processing is now synchronous (PDF parse + OpenAI) so use a generous timeout
    const timeout = 90000 // 90 seconds
    const chunkSize = connectionQuality === 'slow' ? CHUNK_SIZE_SLOW : CHUNK_SIZE_FAST

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // Add connection quality hint for server-side optimization
      formData.append('connectionQuality', connectionQuality)

      const xhr = new XMLHttpRequest()
      xhr.timeout = timeout

      // Enhanced upload progress with speed calculation
      let lastTime = Date.now()
      let lastLoaded = 0

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const now = Date.now()
          const timeDiff = now - lastTime
          const bytesDiff = event.loaded - lastLoaded

          if (timeDiff > 1000) { // Update speed every second
            const speed = bytesDiff / (timeDiff / 1000) // bytes per second
            const speedMBps = speed / (1024 * 1024)
            
            setUploadState(prev => ({
              ...prev,
              progress: Math.min((event.loaded / event.total) * 10, 10), // Upload is 10% of total
              bytesUploaded: event.loaded,
              totalBytes: event.total,
              uploadSpeed: speedMBps
            }))

            lastTime = now
            lastLoaded = event.loaded
          }
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText)
            if (response.success && response.data) {
              // Processing is synchronous — response already includes the vocabulary list
              if (response.vocabularyList) {
                setUploadState(prev => ({
                  ...prev,
                  stage: 'complete',
                  progress: 100
                }))
                onUploadComplete(response.data)
              } else {
                // Fallback: connect SSE if server returns uploadId without completed data
                const uploadId = response.data.id
                setUploadState(prev => ({
                  ...prev,
                  uploadId,
                  stage: 'processing',
                  progress: 10
                }))
                connectSSE(uploadId)
              }
            } else {
              setUploadState(prev => ({
                ...prev,
                stage: 'error',
                error: response.error || 'Upload failed'
              }))
            }
          } catch (error) {
            setUploadState(prev => ({
              ...prev,
              stage: 'error',
              error: 'Invalid response from server'
            }))
          }
        } else if (xhr.status === 408 || xhr.status === 502 || xhr.status === 503) {
          setUploadState(prev => ({
            ...prev,
            stage: 'error',
            error: 'Server temporarily unavailable. Please try again.'
          }))
        } else {
          let errMsg = `Upload failed (${xhr.status})`
          try { errMsg = JSON.parse(xhr.responseText).error || errMsg } catch {}
          setUploadState(prev => ({ ...prev, stage: 'error', error: errMsg }))
        }
      }

      xhr.onerror = () => {
        setUploadState(prev => ({
          ...prev,
          stage: 'error',
          error: connectionQuality === 'slow' 
            ? 'Upload failed due to connection issues. Please try again or use a faster connection.'
            : 'Network error - please check your connection and try again'
        }))
      }

      xhr.ontimeout = () => {
        setUploadState(prev => ({
          ...prev,
          stage: 'error',
          error: 'Upload timed out. Please try again with a smaller file or better connection.'
        }))
      }

      xhr.open('POST', '/api/upload')
      xhr.send(formData)

    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        stage: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      }))
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const file = files[0]
    uploadFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleRetry = () => {
    if (uploadState.fileName && fileInputRef.current?.files) {
      const file = fileInputRef.current.files[0]
      if (file && file.name === uploadState.fileName) {
        uploadFile(file)
      }
    }
  }

  const handleReset = () => {
    setUploadState({
      stage: 'idle',
      progress: 0,
      bytesUploaded: 0,
      totalBytes: 0,
      fileName: ''
    })
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="w-full">
      {/* Connection Quality Indicator */}
      {connectionQuality === 'slow' && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">Slow Connection Detected</p>
              <p className="text-xs text-amber-700">
                Uploads may take longer. Consider using WiFi or try smaller files.
              </p>
            </div>
          </div>
        </div>
      )}

      {uploadState.stage === 'idle' && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragActive
              ? 'border-red-400 bg-red-50'
              : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept={Object.keys(ALLOWED_TYPES).join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          <div className="mt-4">
            <p className="text-lg font-medium text-gray-900">
              Drop your file here, or{' '}
              <span className="text-red-600">browse</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Supports PDF, DOC, DOCX, and TXT files up to {MAX_FILE_SIZE / 1024 / 1024}MB
            </p>
          </div>
        </div>
      )}

      {(uploadState.stage === 'uploading' || uploadState.stage === 'processing') && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-gray-900">{uploadState.fileName}</h3>
              <p className="text-sm text-gray-500">
                {formatFileSize(uploadState.bytesUploaded)} of {formatFileSize(uploadState.totalBytes)}
              </p>
            </div>
            <UploadStatus stage={uploadState.stage} />
          </div>
          
          <ProgressBar 
            progress={uploadState.progress} 
            stage={uploadState.stage}
          />
          
          <div className="mt-3 flex justify-between text-sm text-gray-600">
            <span>
              {uploadState.stage === 'uploading' ? (
                <>
                  Uploading...
                  {uploadState.uploadSpeed && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({uploadState.uploadSpeed.toFixed(1)} MB/s)
                    </span>
                  )}
                </>
              ) : (
                <>
                  Processing document...
                  {connectionQuality === 'slow' && (
                    <span className="ml-2 text-xs text-gray-500">
                      (This may take longer on slow connections)
                    </span>
                  )}
                </>
              )}
            </span>
            <span>{Math.round(uploadState.progress)}%</span>
          </div>

          {/* Show processing steps for slow connections */}
          {uploadState.stage === 'processing' && connectionQuality === 'slow' && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center text-xs text-gray-500">
                <LoadingSkeleton className="w-3 h-3 rounded-full mr-2 animate-pulse" />
                <span>Extracting text from document...</span>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <LoadingSkeleton className="w-3 h-3 rounded-full mr-2 animate-pulse" />
                <span>Analyzing Chinese characters...</span>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <LoadingSkeleton className="w-3 h-3 rounded-full mr-2 animate-pulse" />
                <span>Generating vocabulary database...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {uploadState.stage === 'complete' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <h3 className="font-medium text-green-900">Upload Complete!</h3>
              <p className="text-sm text-green-700 mt-1">
                {uploadState.fileName} has been processed successfully
              </p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleReset}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}

      {uploadState.stage === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-medium text-red-900">Upload Failed</h3>
              <p className="text-sm text-red-700 mt-1">
                {uploadState.error || 'An error occurred during upload'}
              </p>
              {uploadState.fileName && (
                <p className="text-sm text-red-600 mt-1 font-mono">
                  File: {uploadState.fileName}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              onClick={handleRetry}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Retry Upload
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Choose Different File
            </button>
          </div>
        </div>
      )}
    </div>
  )
}