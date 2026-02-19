import { NextRequest } from 'next/server'
import { createApiResponse, createErrorResponse, withErrorHandling, checkDatabaseHealth } from '@/lib/apiUtils'
import { API_CONFIG } from '@/lib/apiConfig'

async function handleHealthCheck(request: NextRequest) {
  const startTime = Date.now()
  
  // Check database connection
  const isDatabaseHealthy = await checkDatabaseHealth()
  
  // Basic system checks
  const systemChecks = {
    database: isDatabaseHealthy,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    apiVersion: API_CONFIG.VERSION,
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime
  }
  
  // Overall health status
  const isHealthy = isDatabaseHealthy
  
  if (isHealthy) {
    return createApiResponse(
      {
        status: 'healthy',
        checks: systemChecks
      },
      'System is healthy'
    )
  } else {
    return createErrorResponse(
      'System is unhealthy',
      503,
      {
        status: 'unhealthy',
        checks: systemChecks
      }
    )
  }
}

// Export handlers for different HTTP methods
export const GET = withErrorHandling(handleHealthCheck)