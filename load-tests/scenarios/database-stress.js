import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { BASE_URL, TEST_USER, HEADERS } from '../config/base.js';

// Database-specific metrics
export const dbConnectionErrors = new Rate('db_connection_errors');
export const slowQueries = new Counter('slow_database_queries');
export const concurrentWrites = new Counter('concurrent_write_operations');
export const queryTimeouts = new Counter('query_timeouts');
export const databaseResponseTime = new Trend('database_response_time');

// DATABASE STRESS TEST - Heavy concurrent database operations
export const options = {
  stages: [
    // Focus on sustained concurrent database load
    { duration: '1m', target: 25 },   // Warm up
    { duration: '5m', target: 100 },  // Sustained concurrent DB operations
    { duration: '5m', target: 200 },  // Heavy concurrent load
    { duration: '3m', target: 300 },  // Very heavy - likely DB bottleneck
    { duration: '2m', target: 400 },  // Maximum DB stress
    { duration: '2m', target: 200 },  // Recovery
    { duration: '1m', target: 0 }     // Cool down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],     // DB operations can be slower
    'database_response_time': ['p(99)<5000'], // Track DB-specific response times
    'db_connection_errors': ['rate<0.1'],     // DB connection issues
    'slow_database_queries': ['count<50'],    // Limit extremely slow queries
    'query_timeouts': ['count<20']            // Prevent query timeout cascades
  }
};

export default function () {
  const userNum = Math.floor(Math.random() * 50000);
  const timestamp = Date.now();
  let response;

  // 1. AUTHENTICATION STRESS (UserSession table operations)
  const startTime = Date.now();
  
  response = http.get(`${BASE_URL}/api/auth/session`, {
    timeout: '20s'
  });
  
  const authTime = Date.now() - startTime;
  databaseResponseTime.add(authTime);
  
  const authSuccess = check(response, {
    'session query succeeds under load': (r) => r.status === 200,
    'session query time acceptable': (r) => r.timings.duration < 3000,
  });
  
  if (!authSuccess && response.status >= 500) {
    dbConnectionErrors.add(1);
  }
  
  if (authTime > 5000) {
    slowQueries.add(1);
  }

  sleep(0.5);

  // 2. USER REGISTRATION (INSERT operations with UUID generation)
  const regStartTime = Date.now();
  const uniqueUser = {
    name: `DBStress${userNum}_${timestamp}`,
    email: `dbstress${userNum}_${timestamp}@test.com`,
    password: 'DBStress123!'
  };

  response = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(uniqueUser), {
    headers: HEADERS,
    timeout: '25s'
  });

  const regTime = Date.now() - regStartTime;
  databaseResponseTime.add(regTime);
  
  const regSuccess = check(response, {
    'user registration under DB stress': (r) => r.status === 200 || r.status === 409, // 409 = user exists
    'registration DB time reasonable': (r) => r.timings.duration < 5000,
  });
  
  if (!regSuccess) {
    if (response.status >= 500) dbConnectionErrors.add(1);
    if (response.status === 0) queryTimeouts.add(1);
  }
  
  if (regTime > 8000) slowQueries.add(1);
  concurrentWrites.add(1);

  sleep(0.3);

  // 3. COMPLEX JOIN OPERATIONS (simulate vocabulary list operations)
  // These would involve User -> VocabularyList -> VocabularyItem joins
  response = http.get(`${BASE_URL}/vocabulary`, {
    timeout: '15s'
  });
  
  const vocabTime = response.timings.duration;
  databaseResponseTime.add(vocabTime);
  
  check(response, {
    'vocabulary queries under stress': (r) => r.status === 200 || r.status === 307,
    'complex join queries perform': (r) => r.timings.duration < 4000,
  }) || dbConnectionErrors.add(1);
  
  if (vocabTime > 6000) slowQueries.add(1);

  sleep(0.4);

  // 4. FILE UPLOAD METADATA (FileUpload table stress)
  response = http.get(`${BASE_URL}/api/upload/progress/stress-${userNum}-${timestamp}`, {
    timeout: '10s'
  });
  
  check(response, {
    'upload metadata queries': (r) => r.status >= 200 && r.status < 500,
    'metadata query time': (r) => r.timings.duration < 2000,
  }) || dbConnectionErrors.add(1);

  // 5. DASHBOARD DATA (Multiple table aggregations)
  response = http.get(`${BASE_URL}/dashboard`, {
    timeout: '20s'
  });
  
  const dashTime = response.timings.duration;
  databaseResponseTime.add(dashTime);
  
  check(response, {
    'dashboard aggregations survive': (r) => r.status === 200 || r.status === 307,
    'aggregation queries reasonable': (r) => r.timings.duration < 6000,
  }) || dbConnectionErrors.add(1);
  
  if (dashTime > 10000) slowQueries.add(1);

  sleep(0.2);

  // 6. CONCURRENT CSRF TOKEN REQUESTS (lightweight DB operations)
  response = http.get(`${BASE_URL}/api/auth/csrf`, {
    timeout: '8s'
  });
  
  check(response, {
    'CSRF tokens under concurrent load': (r) => r.status === 200,
    'CSRF generation fast': (r) => r.timings.duration < 1000,
  }) || dbConnectionErrors.add(1);

  // Minimal sleep to maximize concurrent database operations
  sleep(0.1);

  // 7. SIMULATE PROGRESS TRACKING (UserProgress table stress)
  const progressData = {
    vocabularyItemId: `fake-${userNum}`,
    masteryLevel: Math.floor(Math.random() * 5),
    correctAnswers: Math.floor(Math.random() * 10)
  };
  
  // This would normally be a POST to update progress, but we'll simulate with a GET
  response = http.get(`${BASE_URL}/api/progress?item=${progressData.vocabularyItemId}`, {
    timeout: '12s'
  });
  
  check(response, {
    'progress tracking under load': (r) => r.status >= 200 && r.status < 500,
  }) || dbConnectionErrors.add(1);
  
  // Very short sleep for maximum database concurrency
  sleep(0.05);
}

export function setup() {
  console.log('🗄️  DATABASE STRESS TEST: Concurrent Operations');
  console.log('🎯 Target: Connection pools, query performance, concurrent writes');
  console.log('📊 Monitoring: Query times, connection errors, slow operations');
  
  // Check initial DB connectivity
  const healthCheck = http.get(`${BASE_URL}/api/auth/csrf`);
  if (healthCheck.status !== 200) {
    throw new Error('Database connectivity issue before test');
  }
  
  return { 
    startTime: Date.now(),
    initialResponseTime: healthCheck.timings.duration 
  };
}

export function teardown(data) {
  console.log('📊 Database stress test completed');
  console.log(`⏱️  Duration: ${(Date.now() - data.startTime) / 1000}s`);
  console.log(`📈 Initial response time: ${data.initialResponseTime}ms`);
  console.log('💾 Check reports for database performance degradation patterns');
}