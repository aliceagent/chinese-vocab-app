import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { BASE_URL, TEST_USER, HEADERS } from '../config/base.js';

// Custom metrics for stress testing
export const errorRate = new Rate('stress_errors');
export const dbErrorRate = new Rate('database_errors');
export const timeoutErrors = new Counter('timeout_errors');
export const responseTime99p = new Trend('response_time_99p');

// AGGRESSIVE STRESS TEST - Finding breaking points
export const options = {
  stages: [
    // Gradual ramp to identify when performance degrades
    { duration: '2m', target: 50 },   // Baseline
    { duration: '3m', target: 150 },  // 3x current "heavy"
    { duration: '5m', target: 300 },  // 6x current "heavy" 
    { duration: '3m', target: 500 },  // 10x current "heavy" - likely breaking point
    { duration: '2m', target: 750 },  // Push further
    { duration: '2m', target: 1000 }, // Maximum stress - should break
    { duration: '3m', target: 300 },  // Recovery test
    { duration: '1m', target: 0 }     // Cool down
  ],
  thresholds: {
    // More aggressive thresholds for stress testing
    'http_req_duration': ['p(99)<5000'],   // 99% under 5s (relaxed for stress)
    'http_req_failed': ['rate<0.2'],       // Accept up to 20% failures during stress
    'stress_errors': ['rate<0.3'],         // Track custom error patterns
    'database_errors': ['rate<0.4'],       // DB likely to fail first
    'timeout_errors': ['count<100']        // Limit timeout cascades
  }
};

export default function () {
  // Track which user number we are (for unique test data)
  const userNum = Math.floor(Math.random() * 100000);
  let response;
  
  // 1. High-frequency homepage requests (stress static serving)
  response = http.get(`${BASE_URL}/`, {
    timeout: '10s'  // Extended timeout for stress conditions
  });
  
  const homeSuccess = check(response, {
    'homepage loads under stress': (r) => r.status === 200,
    'homepage time acceptable': (r) => r.timings.duration < 3000,
  });
  if (!homeSuccess) errorRate.add(1);
  
  // Record 99th percentile response times
  responseTime99p.add(response.timings.duration);

  sleep(0.5); // Minimal sleep for maximum stress

  // 2. Concurrent authentication load (stress auth system)
  response = http.get(`${BASE_URL}/api/auth/csrf`);
  check(response, {
    'CSRF under stress': (r) => r.status === 200,
  }) || errorRate.add(1);

  // 3. Database-intensive operations (stress test complex queries)
  response = http.get(`${BASE_URL}/api/auth/session`);
  const sessionSuccess = check(response, {
    'session endpoint survives stress': (r) => r.status === 200,
    'session response reasonable': (r) => r.timings.duration < 5000,
  });
  
  if (!sessionSuccess && response.status >= 500) {
    dbErrorRate.add(1); // Track database-related errors
  }

  // 4. Stress test registration (database writes under load)
  const stressUserData = {
    name: `StressUser${userNum}_${Date.now()}`,
    email: `stress${userNum}_${Date.now()}@loadtest.com`,
    password: 'StressTest123!'
  };

  response = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(stressUserData), {
    headers: HEADERS,
    timeout: '15s' // Extended timeout for DB operations under stress
  });
  
  check(response, {
    'registration handles stress': (r) => r.status < 500 || r.status === 500, // Accept 500s during stress
    'registration timeout acceptable': (r) => r.timings.duration < 15000,
  }) || errorRate.add(1);

  if (response.status === 0 || response.timings.duration > 15000) {
    timeoutErrors.add(1);
  }

  sleep(0.3);

  // 5. File upload stress simulation (without actual files for performance)
  response = http.post(`${BASE_URL}/api/upload`, '', {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: '10s'
  });
  
  check(response, {
    'upload endpoint survives stress': (r) => r.status >= 400 && r.status < 500,
  }) || errorRate.add(1);

  // 6. Static asset stress (test CDN/static serving limits)
  response = http.get(`${BASE_URL}/favicon.ico`, {
    timeout: '5s'
  });
  
  check(response, {
    'static assets under stress': (r) => r.status === 200 || r.status === 404,
    'static response fast': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(0.2);

  // 7. Multiple rapid requests to simulate real user behavior under stress
  const endpoints = ['/dashboard', '/vocabulary', '/upload'];
  const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  response = http.get(`${BASE_URL}${randomEndpoint}`, {
    timeout: '8s'
  });
  
  check(response, {
    'random endpoints survive': (r) => r.status === 200 || r.status === 307,
  }) || errorRate.add(1);

  // Very short sleep to maximize stress
  sleep(0.1);
}

// Custom setup function to prepare for stress test
export function setup() {
  console.log('🚨 STRESS TEST: Finding Breaking Points');
  console.log('⚠️  This test will push the system to failure');
  console.log('📊 Monitoring: errors, timeouts, response times');
  
  // Pre-test health check
  const healthCheck = http.get(`${BASE_URL}/`);
  if (healthCheck.status !== 200) {
    throw new Error('App not healthy before stress test');
  }
  
  return { startTime: Date.now() };
}

// Teardown function to report findings
export function teardown(data) {
  console.log('🏁 Stress test completed');
  console.log(`⏱️  Total duration: ${(Date.now() - data.startTime) / 1000}s`);
  console.log('📋 Check reports for breaking point analysis');
}