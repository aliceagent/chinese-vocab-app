'use client'

// Compression utility for API requests
export async function compressText(text: string): Promise<string> {
  if (typeof window === 'undefined') return text
  
  try {
    const stream = new CompressionStream('gzip')
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()

    writer.write(new TextEncoder().encode(text))
    writer.close()

    const chunks: Uint8Array[] = []
    let done = false

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (value) {
        chunks.push(value)
      }
    }

    const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
    let offset = 0
    for (const chunk of chunks) {
      compressed.set(chunk, offset)
      offset += chunk.length
    }

    return btoa(String.fromCharCode(...compressed))
  } catch (error) {
    console.warn('Compression not supported, sending uncompressed', error)
    return text
  }
}

// Enhanced fetch wrapper with retry logic and compression
interface ApiRequestOptions extends Omit<RequestInit, 'priority'> {
  retries?: number
  retryDelay?: number
  timeout?: number
  compress?: boolean
  requestPriority?: 'high' | 'normal' | 'low'
}

export class ApiError extends Error {
  constructor(message: string, public status?: number, public response?: Response) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiRequest<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 10000,
    compress = false,
    requestPriority = 'normal',
    ...fetchOptions
  } = options

  // Add headers for mobile optimization
  const headers = new Headers(fetchOptions.headers)
  
  if (compress && fetchOptions.body && typeof fetchOptions.body === 'string') {
    const compressed = await compressText(fetchOptions.body)
    fetchOptions.body = compressed
    headers.set('Content-Encoding', 'gzip')
  }

  headers.set('Accept', 'application/json')
  headers.set('Content-Type', 'application/json')
  
  // Add connection hints for better mobile performance
  if (requestPriority === 'high') {
    headers.set('Priority', 'u=1')
  } else if (requestPriority === 'low') {
    headers.set('Priority', 'u=6')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const finalOptions: RequestInit = {
    ...fetchOptions,
    headers,
    signal: controller.signal,
  }

  let lastError: Error = new Error('Unknown error')
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, finalOptions)
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response
        )
      }

      return await response.json()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === retries) {
        break
      }

      // Don't retry on 4xx errors (except 408, 429)
      if (error instanceof ApiError && error.status) {
        if (error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
          break
        }
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, retryDelay * Math.pow(2, attempt))
      )
    }
  }

  clearTimeout(timeoutId)
  throw lastError
}

// Batch API requests to reduce round trips
export class BatchRequest {
  private requests: Array<{ id: string; url: string; options: RequestInit }> = []
  private batchSize: number
  private delay: number

  constructor(batchSize = 5, delay = 100) {
    this.batchSize = batchSize
    this.delay = delay
  }

  add(id: string, url: string, options: RequestInit = {}) {
    this.requests.push({ id, url, options })
  }

  async execute(): Promise<Record<string, any>> {
    const results: Record<string, any> = {}
    const batches = []

    // Split requests into batches
    for (let i = 0; i < this.requests.length; i += this.batchSize) {
      batches.push(this.requests.slice(i, i + this.batchSize))
    }

    for (const batch of batches) {
      const promises = batch.map(async ({ id, url, options }) => {
        try {
          const result = await apiRequest(url, options)
          results[id] = { success: true, data: result }
        } catch (error) {
          results[id] = { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      })

      await Promise.allSettled(promises)
      
      // Add delay between batches to avoid overwhelming the server
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.delay))
      }
    }

    return results
  }
}

// Connection quality detection
export function getConnectionQuality(): 'slow' | 'fast' | 'unknown' {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 'unknown'
  }

  const connection = (navigator as any).connection
  if (!connection) return 'unknown'

  const { effectiveType, downlink, rtt } = connection

  // Classify as slow if 2G/3G or poor metrics
  if (effectiveType === '2g' || effectiveType === '3g' || downlink < 1.5 || rtt > 300) {
    return 'slow'
  }

  return 'fast'
}

// Adaptive request timeout based on connection
export function getAdaptiveTimeout(): number {
  const quality = getConnectionQuality()
  switch (quality) {
    case 'slow': return 30000 // 30s for slow connections
    case 'fast': return 10000 // 10s for fast connections
    default: return 15000      // 15s for unknown
  }
}