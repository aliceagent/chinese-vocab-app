// Base configuration for Chinese Vocab App load tests
export const BASE_URL = 'http://localhost:3000';

// Test data
export const TEST_USER = {
  email: 'loadtest@example.com',
  password: 'LoadTest123!',
  name: 'Load Test User'
};

// Common headers
export const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'k6-load-test/1.0'
};

// Load test stages for different concurrent user levels
export const LOAD_STAGES = {
  light: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 }
  ],
  medium: [
    { duration: '1m', target: 25 },
    { duration: '2m', target: 50 },
    { duration: '1m', target: 25 },
    { duration: '30s', target: 0 }
  ],
  heavy: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 }
  ]
};

// Thresholds for performance metrics
export const PERFORMANCE_THRESHOLDS = {
  http_req_duration: ['p(95)<2000'], // 95% of requests should be under 2s
  http_req_failed: ['rate<0.05'],     // Error rate should be less than 5%
  http_reqs: ['rate>10']              // Minimum 10 requests per second
};