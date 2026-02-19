// API Configuration and Constants

export const API_CONFIG = {
  // Current API version
  VERSION: 'v1',
  
  // Supported versions
  SUPPORTED_VERSIONS: ['v1'],
  
  // Rate limiting settings
  RATE_LIMITS: {
    API_DEFAULT: { requests: 100, window: 60 * 1000 }, // 100 per minute
    AUTH: { requests: 5, window: 5 * 60 * 1000 }, // 5 per 5 minutes
    UPLOAD: { requests: 10, window: 60 * 60 * 1000 }, // 10 per hour
  },
  
  // File upload settings
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_EXTENSIONS: ['.pdf', '.txt', '.doc', '.docx'],
    ALLOWED_MIME_TYPES: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    UPLOAD_DIR: process.env.UPLOAD_DIR || '/tmp/chinese-vocab-uploads'
  },
  
  // Security settings
  SECURITY: {
    PASSWORD_MIN_LENGTH: 8,
    JWT_EXPIRY: '7d',
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // CORS settings
  CORS: {
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Version'],
    ALLOW_CREDENTIALS: true,
    MAX_AGE: 86400 // 24 hours
  },
  
  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
  
  // Database settings
  DATABASE: {
    QUERY_TIMEOUT: 30000, // 30 seconds
    CONNECTION_TIMEOUT: 10000, // 10 seconds
  }
} as const

// API endpoint paths
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
  },
  
  // File uploads
  UPLOAD: {
    UPLOAD_FILE: '/api/upload',
    GET_PROGRESS: '/api/upload/progress',
  },
  
  // Vocabulary
  VOCABULARY: {
    LIST: '/api/vocabulary',
    GET_BY_ID: '/api/vocabulary/:id',
    CREATE: '/api/vocabulary',
    UPDATE: '/api/vocabulary/:id',
    DELETE: '/api/vocabulary/:id',
  },
  
  // Statistics
  STATISTICS: {
    GET: '/api/statistics',
    PROGRESS: '/api/progress',
  },
  
  // Stories
  STORIES: {
    LIST: '/api/stories',
    GET_BY_ID: '/api/stories/:id',
    GENERATE: '/api/stories/generate',
  },
  
  // Health check
  HEALTH: '/api/health',
} as const

// Error codes
export const ERROR_CODES = {
  // Generic errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // File upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
} as const

// HTTP status mappings
export const STATUS_MAPPINGS = {
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.INVALID_REQUEST]: 400,
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.INVALID_CREDENTIALS]: 401,
  [ERROR_CODES.TOKEN_EXPIRED]: 401,
  [ERROR_CODES.TOKEN_INVALID]: 401,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 404,
  [ERROR_CODES.METHOD_NOT_ALLOWED]: 405,
  [ERROR_CODES.DUPLICATE_RESOURCE]: 409,
  [ERROR_CODES.FILE_TOO_LARGE]: 413,
  [ERROR_CODES.INVALID_FILE_TYPE]: 415,
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 429,
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 500,
  [ERROR_CODES.DATABASE_ERROR]: 500,
  [ERROR_CODES.UPLOAD_FAILED]: 500,
} as const

// Default error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred',
  [ERROR_CODES.INVALID_REQUEST]: 'Invalid request format',
  [ERROR_CODES.VALIDATION_ERROR]: 'Validation failed',
  [ERROR_CODES.NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.METHOD_NOT_ALLOWED]: 'HTTP method not allowed',
  [ERROR_CODES.UNAUTHORIZED]: 'Authentication required',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid username or password',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Access token has expired',
  [ERROR_CODES.TOKEN_INVALID]: 'Invalid access token',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
  [ERROR_CODES.FILE_TOO_LARGE]: 'File size exceeds maximum allowed',
  [ERROR_CODES.INVALID_FILE_TYPE]: 'File type not supported',
  [ERROR_CODES.UPLOAD_FAILED]: 'File upload failed',
  [ERROR_CODES.DATABASE_ERROR]: 'Database operation failed',
  [ERROR_CODES.DUPLICATE_RESOURCE]: 'Resource already exists',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'Requested resource not found',
} as const