// Stress testing configuration for Chinese Vocab App
export const BASE_URL = 'http://localhost:3000';

// Test data for stress scenarios
export const TEST_USER = {
  email: 'stresstester@example.com',
  password: 'StressTest123!',
  name: 'Stress Test User'
};

// Headers optimized for stress testing
export const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'k6-stress-test/2.0',
  'Connection': 'keep-alive'
};

// AGGRESSIVE LOAD STAGES for stress testing
export const STRESS_LOAD_STAGES = {
  // Breaking point discovery
  breaking_point: [
    { duration: '2m', target: 50 },
    { duration: '3m', target: 200 },
    { duration: '5m', target: 500 },
    { duration: '3m', target: 750 },
    { duration: '2m', target: 1000 },
    { duration: '2m', target: 500 },
    { duration: '1m', target: 0 }
  ],
  
  // Database stress
  database_stress: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 200 },
    { duration: '3m', target: 400 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 0 }
  ],
  
  // Upload system stress
  upload_stress: [
    { duration: '2m', target: 50 },
    { duration: '4m', target: 150 },
    { duration: '3m', target: 200 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 }
  ],
  
  // Scalability validation
  scalability: [
    { duration: '3m', target: 25 },   // Baseline
    { duration: '2m', target: 25 },
    { duration: '3m', target: 75 },   // 3x
    { duration: '2m', target: 75 },
    { duration: '3m', target: 150 },  // 6x
    { duration: '2m', target: 150 },
    { duration: '3m', target: 250 },  // 10x
    { duration: '2m', target: 250 },
    { duration: '3m', target: 400 },  // 16x
    { duration: '2m', target: 400 },
    { duration: '2m', target: 200 },  // Recovery
    { duration: '1m', target: 0 }
  ]
};

// AGGRESSIVE THRESHOLDS for stress testing
export const STRESS_THRESHOLDS = {
  // Breaking point thresholds (more permissive)
  breaking_point: {
    'http_req_duration': ['p(99)<10000'],    // 99% under 10s
    'http_req_failed': ['rate<0.4'],         // Accept up to 40% failures
    'stress_errors': ['rate<0.5']            // Custom stress error tracking
  },
  
  // Database stress thresholds
  database_stress: {
    'http_req_duration': ['p(95)<5000'],     // 95% under 5s
    'database_response_time': ['p(99)<8000'], // DB-specific timing
    'db_connection_errors': ['rate<0.2'],    // Connection error limit
    'slow_database_queries': ['count<100']   // Slow query limit
  },
  
  // Upload stress thresholds
  upload_stress: {
    'upload_response_time': ['p(95)<15000'], // Upload operations slower
    'upload_errors': ['rate<0.3'],           // Higher error tolerance
    'upload_timeouts': ['count<50'],         // Timeout limit
    'memory_pressure_indicators': ['rate<0.15'] // Memory pressure
  },
  
  // Scalability thresholds
  scalability: {
    'http_req_duration': ['p(95)<8000'],     // Relaxed for high load
    'scalability_errors': ['rate<0.25'],     // Error rate at scale
    'system_stability_indicator': ['rate>0.6'] // Stability requirement
  }
};

// PERFORMANCE BENCHMARKS for comparison
export const PERFORMANCE_BENCHMARKS = {
  baseline_response_time: 500,      // ms - good response time
  acceptable_response_time: 2000,   // ms - acceptable under load
  critical_response_time: 5000,     // ms - critical threshold
  max_acceptable_errors: 0.05,      // 5% error rate
  min_throughput: 10,               // requests per second
  database_timeout: 30000,          // ms - database operation timeout
  upload_timeout: 60000             // ms - file upload timeout
};

// BREAKING POINT INDICATORS
export const BREAKING_POINT_INDICATORS = {
  response_time_spike: 5.0,         // 5x increase in response time
  error_rate_spike: 0.3,            // 30% error rate
  timeout_threshold: 50,            // Number of timeouts before critical
  memory_pressure: 0.2,             // 20% memory pressure indicators
  connection_failures: 0.15         // 15% connection failure rate
};

// TEST ENVIRONMENT CONFIGURATION
export const TEST_ENVIRONMENT = {
  max_concurrent_connections: 1000,
  connection_timeout: '30s',
  response_timeout: '60s',
  think_time_min: 0.1,              // Minimum sleep between requests
  think_time_max: 2.0,              // Maximum sleep between requests
  ramp_up_smoothness: 'linear'      // How to increase load
};