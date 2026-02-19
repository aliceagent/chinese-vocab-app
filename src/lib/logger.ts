// Logging utility for the API

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: string
  data?: any
  error?: any
}

class Logger {
  private context?: string

  constructor(context?: string) {
    this.context = context
  }

  private log(level: LogLevel, message: string, data?: any, error?: any) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(this.context && { context: this.context }),
      ...(data && { data }),
      ...(error && { error: this.formatError(error) })
    }

    // In development, use console with colors
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(entry)
    } else {
      // In production, output structured JSON
      console.log(JSON.stringify(entry))
    }
  }

  private consoleLog(entry: LogEntry) {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[90m', // Gray
      [LogLevel.INFO]: '\x1b[36m',  // Cyan
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m'  // Red
    }
    const reset = '\x1b[0m'
    
    const color = colors[entry.level]
    const prefix = `${color}[${entry.level.toUpperCase()}]${reset}`
    const contextStr = entry.context ? ` [${entry.context}]` : ''
    const timestamp = entry.timestamp.split('T')[1].split('.')[0] // Just time part
    
    console.log(`${prefix}${contextStr} ${timestamp} ${entry.message}`)
    
    if (entry.data) {
      console.log('Data:', entry.data)
    }
    
    if (entry.error) {
      console.error('Error:', entry.error)
    }
  }

  private formatError(error: any) {
    if (error instanceof Error) {
      const result: any = {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
      if (error.cause) {
        result.cause = error.cause
      }
      return result
    }
    return error
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, error?: any, data?: any) {
    this.log(LogLevel.ERROR, message, data, error)
  }

  // API request logging helpers
  apiRequest(method: string, path: string, ip?: string, userAgent?: string) {
    this.info(`${method} ${path}`, {
      type: 'api_request',
      ip,
      userAgent
    })
  }

  apiResponse(method: string, path: string, status: number, duration: number, error?: any) {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO
    this.log(
      level,
      `${method} ${path} → ${status} (${duration}ms)`,
      {
        type: 'api_response',
        status,
        duration
      },
      error
    )
  }

  security(event: string, details: any) {
    this.warn(`Security event: ${event}`, {
      type: 'security',
      event,
      ...details
    })
  }

  performance(operation: string, duration: number, details?: any) {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      type: 'performance',
      operation,
      duration,
      ...details
    })
  }
}

// Create logger instances
export const logger = new Logger()
export const apiLogger = new Logger('API')
export const dbLogger = new Logger('DB')
export const authLogger = new Logger('AUTH')
export const uploadLogger = new Logger('UPLOAD')

// Export function to create scoped loggers
export function createLogger(context: string): Logger {
  return new Logger(context)
}