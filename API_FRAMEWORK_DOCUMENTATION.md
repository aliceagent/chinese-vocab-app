# API Framework Documentation

## Overview

The Chinese Vocab App uses Next.js App Router with a comprehensive API framework that includes middleware for CORS, rate limiting, logging, error handling, and API versioning.

## Architecture

### Core Components

1. **Middleware** (`middleware.ts`) - Global request processing
2. **API Utilities** (`src/lib/apiUtils.ts`) - Standardized response handling
3. **Rate Limiter** (`src/lib/rateLimiter.ts`) - In-memory rate limiting
4. **Logger** (`src/lib/logger.ts`) - Structured logging system
5. **Configuration** (`src/lib/apiConfig.ts`) - Centralized API settings

## Features Implemented

### ✅ 1. Request Middleware

**Location**: `middleware.ts`

- **CORS Support**: Configurable origins, methods, and headers
- **Rate Limiting**: Different limits for auth, upload, and general API endpoints
- **Security Headers**: XSS protection, content sniffing prevention
- **Request Logging**: Automatic request/response logging with timing

**Rate Limits**:
- General API: 100 requests/minute
- Authentication: 5 requests/5 minutes  
- File Upload: 10 requests/hour

### ✅ 2. Error Handling Framework

**Location**: `src/lib/apiUtils.ts`

- **Standardized Responses**: Consistent JSON response format
- **Error Types**: Validation, database, authentication errors
- **HTTP Status Mapping**: Automatic status code assignment
- **Database Error Handling**: Prisma-specific error handling
- **Method Validation**: Automatic 405 responses for unsupported methods

**Response Format**:
```json
{
  "success": true|false,
  "data": {}, // On success
  "error": "message", // On error
  "message": "optional message",
  "meta": {
    "timestamp": "2024-...",
    "version": "v1",
    "requestId": "req_..."
  }
}
```

### ✅ 3. Rate Limiting

**Location**: `src/lib/rateLimiter.ts`

- **In-Memory Storage**: Simple, no external dependencies
- **Sliding Window**: Proper rate limit algorithm
- **Multiple Limits**: Different limits per endpoint type
- **Headers**: Standard rate limit headers in responses
- **Cleanup**: Automatic cleanup of expired entries

### ✅ 4. Logging System

**Location**: `src/lib/logger.ts`

- **Structured Logging**: JSON format in production
- **Colored Console**: Enhanced development logging
- **Context Scoping**: Separate loggers for different components
- **API Request Tracking**: Automatic request/response logging
- **Performance Monitoring**: Duration tracking
- **Security Events**: Dedicated security event logging

### ✅ 5. API Versioning

**Location**: `src/lib/apiConfig.ts` + `src/lib/apiUtils.ts`

- **Version Detection**: Via Accept header or X-API-Version header
- **Version Management**: Centralized version configuration
- **Backward Compatibility**: Support for multiple API versions

**Version Detection Methods**:
```http
# Method 1: Accept header
Accept: application/vnd.api+json;version=1

# Method 2: Custom header  
X-API-Version: v1
```

### ✅ 6. Configuration Management

**Location**: `src/lib/apiConfig.ts`

- **Centralized Settings**: All API configuration in one place
- **Environment-Based**: Different settings per environment
- **Constants**: Error codes, status mappings, endpoints
- **Type Safety**: Full TypeScript support

## API Routes Structure

```
/api/
├── auth/
│   ├── [...nextauth]/route.ts    # NextAuth.js integration
│   └── register/route.ts         # Updated with new framework
├── upload/
│   ├── route.ts                  # File upload endpoint
│   └── progress/[uploadId]/      # Upload progress tracking
├── progress/route.ts             # User progress tracking
├── statistics/route.ts           # Statistics endpoint
└── health/route.ts               # Health check (NEW)
```

## Usage Examples

### Creating New API Routes

```typescript
import { NextRequest } from 'next/server'
import { 
  createApiResponse, 
  createValidationError, 
  withErrorHandling,
  validateJsonBody,
  validateRequiredFields
} from '@/lib/apiUtils'

async function handleMyEndpoint(request: NextRequest) {
  // Parse request
  const body = await validateJsonBody(request)
  
  // Validate required fields
  validateRequiredFields(body, ['name', 'email'])
  
  // Your business logic here
  const result = await someOperation(body)
  
  // Return standardized response
  return createApiResponse(result, 'Operation successful')
}

// Export with error handling wrapper
export const POST = withErrorHandling(handleMyEndpoint)
```

### Using the Logger

```typescript
import { apiLogger } from '@/lib/logger'

// In your API route
apiLogger.info('Processing user registration', { username: body.username })
apiLogger.error('Database connection failed', error)
apiLogger.security('Failed login attempt', { ip, username })
```

### Rate Limit Configuration

```typescript
// Add new rate limiter in src/lib/rateLimiter.ts
export const customRateLimit = new InMemoryRateLimit(50, 30 * 1000) // 50 per 30 seconds

// Use in middleware.ts
if (pathname.startsWith('/api/custom/')) {
  rateLimitResult = await customRateLimit.check(`custom:${ip}`)
}
```

## Health Check Endpoint

**URL**: `GET /api/health`

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "checks": {
      "database": true,
      "memory": {...},
      "uptime": 3600,
      "nodeVersion": "v18.17.0",
      "apiVersion": "v1",
      "timestamp": "2024-02-19T01:00:00.000Z",
      "responseTime": 45
    }
  },
  "message": "System is healthy"
}
```

## Security Features

### CORS Configuration
- Configurable allowed origins via `ALLOWED_ORIGINS` environment variable
- Supports credentials
- Proper preflight handling

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Rate Limiting Headers
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp
- `Retry-After`: Seconds to wait (on 429)

## Environment Variables

```bash
# Optional - defaults to '*' if not set
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Upload directory (optional)
UPLOAD_DIR=/path/to/uploads

# Database connection (required)
DATABASE_URL=postgresql://...
```

## Testing the Framework

### 1. Health Check
```bash
curl http://localhost:3000/api/health
```

### 2. Rate Limiting
```bash
# Make 6+ requests quickly to auth endpoint
for i in {1..6}; do curl http://localhost:3000/api/auth/register -d '{}'; done
```

### 3. CORS
```bash
curl -X OPTIONS http://localhost:3000/api/health \
  -H "Access-Control-Request-Method: GET" \
  -H "Origin: http://localhost:3000"
```

### 4. API Versioning
```bash
curl http://localhost:3000/api/health \
  -H "X-API-Version: v1"
```

## Performance Considerations

### Rate Limiting
- Uses in-memory storage (single server only)
- For production clusters, consider Redis-based rate limiting
- Automatic cleanup prevents memory leaks

### Logging
- Structured JSON in production for log aggregation
- Async logging recommended for high-traffic applications
- Consider log rotation and retention policies

### Error Handling
- Minimal overhead with try-catch wrapper
- Database errors are properly categorized
- Security-conscious error messages (no sensitive data leakage)

## Future Enhancements

1. **Redis Rate Limiting**: For multi-server deployments
2. **API Key Authentication**: For external API access
3. **Request/Response Caching**: With Redis or similar
4. **OpenAPI Documentation**: Auto-generated API docs
5. **Metrics Collection**: Prometheus/OpenTelemetry integration
6. **Request Validation**: JSON Schema validation
7. **API Gateway Integration**: For microservices architecture

## Troubleshooting

### Common Issues

1. **Rate Limit Not Working**: Check middleware.ts is in project root
2. **CORS Errors**: Verify ALLOWED_ORIGINS environment variable
3. **Database Errors**: Check DATABASE_URL and Prisma setup
4. **Log Not Appearing**: Ensure proper logger import and usage

### Debug Mode

Set `NODE_ENV=development` for enhanced console logging with colors and better formatting.

---

This API framework provides a solid foundation for the Chinese Vocab App with production-ready features for security, monitoring, and maintainability.