import { NextRequest, NextResponse } from 'next/server'
import { apiRateLimit, authRateLimit, uploadRateLimit } from './src/lib/rateLimiter'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'

  // Start time for logging
  const startTime = Date.now()

  // CORS handling for API routes
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    
    // Enhanced CORS headers
    response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers })
    }

    // Rate limiting based on endpoint
    let rateLimitResult
    if (pathname === '/api/auth/callback/credentials' || pathname === '/api/auth/signin') {
      // Strict rate limiting only for actual login attempts
      rateLimitResult = await authRateLimit.check(`auth:${ip}`)
    } else if (pathname.startsWith('/api/auth/')) {
      // CSRF, session checks etc — use generous API limit (don't block NextAuth internals)
      rateLimitResult = await apiRateLimit.check(`api:${ip}`)
    } else if (pathname.startsWith('/api/upload/')) {
      // Rate limiting for uploads
      rateLimitResult = await uploadRateLimit.check(`upload:${ip}`)
    } else {
      // General API rate limiting
      rateLimitResult = await apiRateLimit.check(`api:${ip}`)
    }

    // Check if rate limit exceeded
    if (!rateLimitResult.success) {
      console.warn(`Rate limit exceeded for ${ip} on ${pathname}`, {
        ip,
        pathname,
        remaining: rateLimitResult.remaining,
        reset: new Date(rateLimitResult.reset)
      })

      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.round((rateLimitResult.reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.round((rateLimitResult.reset - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            ...Object.fromEntries(response.headers.entries())
          },
        }
      )
    }

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString())

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Request logging
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`API Request: ${request.method} ${pathname}`, {
      ip,
      userAgent: request.headers.get('user-agent'),
      duration: `${duration}ms`,
      rateLimitRemaining: rateLimitResult.remaining,
      timestamp: new Date().toISOString()
    })

    return response
  }

  // For non-API routes, just continue
  return NextResponse.next()
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    // Match API routes and authentication pages
    '/api/:path*',
    // Exclude static files and internal Next.js files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}