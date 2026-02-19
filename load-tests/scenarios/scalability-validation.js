import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';
import { BASE_URL, TEST_USER, HEADERS } from '../config/base.js';

// Scalability-specific metrics
export const scalabilityErrors = new Rate('scalability_errors');
export const throughputMetric = new Rate('requests_per_second');
export const activeUsers = new Gauge('active_concurrent_users');
export const systemStability = new Rate('system_stability_indicator');
export const performanceDegradation = new Trend('performance_degradation');

// SCALABILITY VALIDATION TEST - Systematic load increase to find limits
export const options = {
  stages: [
    // Systematic scaling to identify capacity limits
    { duration: '3m', target: 25 },   // Stage 1: Baseline (1x)
    { duration: '2m', target: 25 },   // Hold baseline
    { duration: '3m', target: 75 },   // Stage 2: 3x baseline
    { duration: '2m', target: 75 },   // Hold 3x
    { duration: '3m', target: 150 },  // Stage 3: 6x baseline
    { duration: '2m', target: 150 },  // Hold 6x
    { duration: '3m', target: 250 },  // Stage 4: 10x baseline
    { duration: '2m', target: 250 },  // Hold 10x
    { duration: '3m', target: 400 },  // Stage 5: 16x baseline (likely breaking)
    { duration: '2m', target: 400 },  // Hold breaking point
    { duration: '3m', target: 600 },  // Stage 6: 24x baseline (severe stress)
    { duration: '2m', target: 600 },  // Hold severe stress
    { duration: '2m', target: 300 },  // Recovery test
    { duration: '1m', target: 0 }     // Cool down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<8000'],         // Relaxed for scalability testing
    'scalability_errors': ['rate<0.3'],         // Accept failures at scale limits
    'system_stability_indicator': ['rate>0.7'], // System should be stable most of the time
    'performance_degradation': ['med<5000']     // Median degradation tracking
  }
};

// Track performance baselines from early stages
let baselineResponseTime = 0;
let baselineErrorRate = 0;
let currentStageUsers = 0;

export default function () {
  const iterationStart = Date.now();
  const userNum = __VU; // Use k6's virtual user ID
  let response;
  
  // Update active users metric
  activeUsers.set(__VU);
  currentStageUsers = __VU;

  // 1. CORE APPLICATION FLOW (measure scalability of main features)
  const coreFlowStart = Date.now();
  
  // Homepage load
  response = http.get(`${BASE_URL}/`, {
    timeout: '15s'
  });
  
  const homeLoadTime = Date.now() - coreFlowStart;
  const homeSuccess = check(response, {
    'homepage scales with load': (r) => r.status === 200,
    'homepage performance acceptable': (r) => r.timings.duration < 5000,
  });
  
  if (!homeSuccess) scalabilityErrors.add(1);
  
  // Track performance degradation compared to baseline
  if (baselineResponseTime > 0) {
    const degradation = homeLoadTime / baselineResponseTime;
    performanceDegradation.add(degradation);
  } else if (currentStageUsers <= 25) {
    baselineResponseTime = homeLoadTime; // Set baseline in early stages
  }

  sleep(0.5);

  // 2. AUTHENTICATION SCALABILITY
  const authStart = Date.now();
  response = http.get(`${BASE_URL}/api/auth/session`, {
    timeout: '10s'
  });
  
  const authTime = Date.now() - authStart;
  const authSuccess = check(response, {
    'auth system scales': (r) => r.status === 200,
    'auth response reasonable': (r) => r.timings.duration < 3000,
  });
  
  if (authSuccess) {
    systemStability.add(1); // Track system health
  } else {
    scalabilityErrors.add(1);
    systemStability.add(0);
  }

  sleep(0.3);

  // 3. DATABASE OPERATIONS SCALABILITY
  const dbStart = Date.now();
  
  // Registration (write operation)
  const scaleUser = {
    name: `ScaleUser${userNum}_${Date.now()}`,
    email: `scale${userNum}_${Date.now()}@test.com`,
    password: 'ScaleTest123!'
  };

  response = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(scaleUser), {
    headers: HEADERS,
    timeout: '20s'
  });
  
  const dbTime = Date.now() - dbStart;
  const dbSuccess = check(response, {
    'database writes scale': (r) => r.status === 200 || r.status === 409,
    'database performance maintained': (r) => r.timings.duration < 8000,
  });
  
  if (dbSuccess) {
    systemStability.add(1);
  } else {
    scalabilityErrors.add(1);
    systemStability.add(0);
  }

  sleep(0.4);

  // 4. STATIC ASSET DELIVERY SCALABILITY
  response = http.get(`${BASE_URL}/favicon.ico`, {
    timeout: '5s'
  });
  
  check(response, {
    'static assets scale': (r) => r.status === 200 || r.status === 404,
    'static delivery fast': (r) => r.timings.duration < 1000,
  }) || scalabilityErrors.add(1);

  // 5. API ENDPOINTS SCALABILITY (multiple endpoints)
  const endpoints = ['/api/auth/csrf', '/vocabulary', '/dashboard'];
  const endpoint = endpoints[userNum % endpoints.length];
  
  response = http.get(`${BASE_URL}${endpoint}`, {
    timeout: '12s'
  });
  
  const endpointSuccess = check(response, {
    'API endpoints maintain performance': (r) => r.status < 500,
    'endpoint response time scales': (r) => r.timings.duration < 6000,
  });
  
  if (endpointSuccess) {
    systemStability.add(1);
  } else {
    scalabilityErrors.add(1);
    systemStability.add(0);
  }

  // 6. CONCURRENT OPERATION SIMULATION
  const concurrentStart = Date.now();
  
  // Simulate multiple rapid operations (real user behavior)
  const operations = [
    http.get(`${BASE_URL}/api/auth/session`, { timeout: '8s' }),
    http.get(`${BASE_URL}/`, { timeout: '8s' })
  ];
  
  // Check if system can handle concurrent operations from same user
  const concurrentTime = Date.now() - concurrentStart;
  const allSuccessful = operations.every(resp => resp.status === 200 || resp.status === 307);
  
  if (allSuccessful && concurrentTime < 10000) {
    systemStability.add(1);
  } else {
    scalabilityErrors.add(1);
    systemStability.add(0);
  }

  // Calculate throughput (requests per second for this VU)
  const iterationTime = (Date.now() - iterationStart) / 1000;
  const requestsInIteration = 6; // Number of HTTP requests made
  throughputMetric.add(requestsInIteration / iterationTime);

  // Sleep varies based on load to simulate realistic user behavior
  const sleepTime = currentStageUsers > 300 ? 0.2 : currentStageUsers > 100 ? 0.5 : 1.0;
  sleep(sleepTime);
}

export function setup() {
  console.log('📈 SCALABILITY VALIDATION: Systematic Load Testing');
  console.log('🎯 Target: Find exact breaking points and scaling characteristics');
  console.log('📊 Stages: 25 → 75 → 150 → 250 → 400 → 600 users');
  console.log('⚡ Monitoring: Performance degradation, system stability, throughput');
  
  // Establish baseline performance
  console.log('🔍 Establishing performance baseline...');
  const baselineTest = http.get(`${BASE_URL}/`);
  
  if (baselineTest.status !== 200) {
    throw new Error('Cannot establish baseline - app not responding');
  }
  
  return { 
    startTime: Date.now(),
    baselineResponseTime: baselineTest.timings.duration,
    baselineStatus: baselineTest.status
  };
}

export function teardown(data) {
  const totalDuration = (Date.now() - data.startTime) / 1000;
  
  console.log('📈 Scalability validation completed');
  console.log(`⏱️  Total test duration: ${totalDuration}s`);
  console.log(`📊 Baseline response time: ${data.baselineResponseTime}ms`);
  console.log('🔍 Analysis:');
  console.log('   - Check performance degradation trends across stages');
  console.log('   - Identify the user load where errors increase sharply');
  console.log('   - Review system stability metrics for breaking points');
  console.log('   - Analyze throughput characteristics at different scales');
  console.log('💾 Detailed metrics in JSON reports for scaling analysis');
}