import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './prisma'

// Standard API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    timestamp: string
    version: string
    requestId: string
  }
}

export interface ApiError {
  code: string
  message: string
  details?: any
}

// HTTP status codes
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
}

// Create standardized API response
export function createApiResponse<T>(
  data?: T, 
  message?: string,
  status: number = HttpStatus.OK
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: status >= 200 && status < 400,
    ...(data && { data }),
    ...(message && { message }),
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      requestId: generateRequestId()
    }
  }

  return NextResponse.json(response, { status })
}

// Create error response
export function createErrorResponse(
  error: string | ApiError,
  status: number = HttpStatus.INTERNAL_SERVER_ERROR,
  details?: any
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error: typeof error === 'string' ? error : error.message,
    ...(details && { details }),
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      requestId: generateRequestId()
    }
  }

  return NextResponse.json(response, { status })
}

// Validation error response
export function createValidationError(message: string, details?: any): NextResponse<ApiResponse> {
  return createErrorResponse({
    code: 'VALIDATION_ERROR',
    message,
    details
  }, HttpStatus.BAD_REQUEST, details)
}

// Database error handler
export function handleDatabaseError(error: any): NextResponse<ApiResponse> {
  console.error('Database error:', error)
  
  // Prisma-specific error handling
  if (error.code === 'P2002') {
    return createErrorResponse(
      'Resource already exists',
      HttpStatus.CONFLICT,
      { constraint: error.meta?.target }
    )
  }
  
  if (error.code === 'P2025') {
    return createErrorResponse(
      'Resource not found',
      HttpStatus.NOT_FOUND
    )
  }

  return createErrorResponse(
    'Database operation failed',
    HttpStatus.INTERNAL_SERVER_ERROR
  )
}

// Generic error handler
export function handleApiError(error: any, context?: string): NextResponse<ApiResponse> {
  console.error(`API error ${context ? `in ${context}` : ''}:`, error)
  
  if (error.name === 'ValidationError') {
    return createValidationError(error.message, error.details)
  }
  
  if (error.status && error.status < 500) {
    return createErrorResponse(error.message, error.status)
  }
  
  return createErrorResponse(
    'Internal server error',
    HttpStatus.INTERNAL_SERVER_ERROR
  )
}

// Method not allowed response
export function createMethodNotAllowedResponse(allowedMethods: string[]): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
        requestId: generateRequestId()
      }
    },
    {
      status: HttpStatus.METHOD_NOT_ALLOWED,
      headers: {
        'Allow': allowedMethods.join(', ')
      }
    }
  )
}

// Request validation utilities
export async function validateJsonBody(request: NextRequest): Promise<any> {
  try {
    return await request.json()
  } catch (error) {
    throw new Error('Invalid JSON in request body')
  }
}

export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missing = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  )
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`)
  }
}

// API route wrapper for consistent error handling
export function withErrorHandling(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleApiError(error, `${request.method} ${request.nextUrl.pathname}`)
    }
  }
}

// Database health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// API versioning helper
export function getApiVersion(request: NextRequest): string {
  // Check Accept header for version (e.g., "application/vnd.api+json;version=1")
  const acceptHeader = request.headers.get('Accept') || ''
  const versionMatch = acceptHeader.match(/version=(\d+)/)
  
  if (versionMatch) {
    return `v${versionMatch[1]}`
  }
  
  // Check custom header
  const versionHeader = request.headers.get('X-API-Version')
  if (versionHeader) {
    return versionHeader.startsWith('v') ? versionHeader : `v${versionHeader}`
  }
  
  // Default version
  return 'v1'
}

// Log API request
export function logApiRequest(
  request: NextRequest,
  response: NextResponse,
  duration: number,
  error?: any
) {
  const logData = {
    method: request.method,
    url: request.nextUrl.pathname + request.nextUrl.search,
    status: response.status,
    duration: `${duration}ms`,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    timestamp: new Date().toISOString(),
    ...(error && { error: error.message })
  }
  
  if (response.status >= 400) {
    console.error('API Error:', logData)
  } else {
    console.log('API Request:', logData)
  }
}