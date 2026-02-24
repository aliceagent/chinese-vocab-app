'use client'

import { useState, useRef } from 'react'

interface FileUploadProps {
  onUploadComplete: (upload: unknown) => void
  onUploadUpdate?: (uploadId: string, updates: unknown) => void
}

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.doc', '.docx']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [stage, setStage] = useState<'idle' | 'uploading' | 'complete' | 'error'>('idle')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)
  const [dotCount, setDotCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startDots() {
    dotTimerRef.current = setInterval(() => setDotCount(d => (d + 1) % 4), 500)
  }
  function stopDots() {
    if (dotTimerRef.current) clearInterval(dotTimerRef.current)
  }

  function validateFile(file: File): string | null {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file type. Please upload: ${ALLOWED_EXTENSIONS.join(', ')}`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
    }
    return null
  }

  async function uploadFile(file: File) {
    const validationErr = validateFile(file)
    if (validationErr) {
      setStage('error')
      setFileName(file.name)
      setError(validationErr)
      return
    }

    setStage('uploading')
    setFileName(file.name)
    setError('')
    startDots()

    try {
      const formData = new FormData()
      formData.append('file', file)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90_000) // 90s client timeout

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      stopDots()

      const data = await res.json()
      if (data.success) {
        setStage('complete')
        onUploadComplete(data.data)
      } else {
        setStage('error')
        setError(data.error || 'Upload failed')
      }
    } catch (err) {
      stopDots()
      setStage('error')
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Upload timed out — file may be too large or connection too slow')
      } else {
        setError(err instanceof Error ? err.message : 'Upload failed')
      }
    }
  }

  function handleFileSelect(files: FileList | null) {
    if (!files?.length) return
    uploadFile(files[0])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }

  function reset() {
    setStage('idle')
    setFileName('')
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const dots = '.'.repeat(dotCount)

  return (
    <div className="w-full">
      {stage === 'idle' && (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            isDragActive ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-400 hover:bg-gray-50'
          }`}
          onDragOver={e => { e.preventDefault(); setIsDragActive(true) }}
          onDragLeave={e => { e.preventDefault(); setIsDragActive(false) }}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf,.txt,.doc,.docx"
            onChange={e => handleFileSelect(e.target.files)}
          />
          <div className="text-4xl mb-3">📄</div>
          <p className="text-base font-semibold text-gray-800">
            Drop your file here, or <span className="text-red-600">browse</span>
          </p>
          <p className="text-sm text-gray-400 mt-1">PDF, DOC, DOCX, TXT — up to 10MB</p>
        </div>
      )}

      {stage === 'uploading' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-xl">📄</div>
            <div>
              <p className="font-medium text-gray-900 text-sm">{fileName}</p>
              <p className="text-xs text-gray-400">Uploading & processing{dots}</p>
            </div>
          </div>

          {/* Animated progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-2 bg-red-600 rounded-full animate-pulse w-3/4" />
          </div>

          <div className="mt-4 space-y-2 text-xs text-gray-400">
            <p>⬆ Sending file to server…</p>
            <p>🔍 Extracting Chinese vocabulary…</p>
            <p>💾 Saving to your account…</p>
          </div>

          <p className="text-xs text-gray-300 mt-3">This usually takes 15–30 seconds</p>
        </div>
      )}

      {stage === 'complete' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-900">Upload Complete!</p>
              <p className="text-sm text-green-700">{fileName} processed successfully</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="mt-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Upload Another File
          </button>
        </div>
      )}

      {stage === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <p className="font-semibold text-red-900">Upload Failed</p>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
              {fileName && <p className="text-xs text-red-400 mt-1 font-mono">File: {fileName}</p>}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { reset(); fileInputRef.current?.click() }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Retry Upload
            </button>
            <button
              onClick={reset}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Choose Different File
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
