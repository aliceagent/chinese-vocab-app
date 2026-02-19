import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, TEST_USER, HEADERS, LOAD_STAGES, PERFORMANCE_THRESHOLDS } from '../config/base.js';

// Custom metrics
export const errorRate = new Rate('api_errors');
export const uploadErrors = new Rate('upload_errors');

export const options = {
  stages: LOAD_STAGES.heavy, // Use heavy load for API testing
  thresholds: {
    ...PERFORMANCE_THRESHOLDS,
    'api_errors': ['rate<0.1'], // API error rate should be less than 10%
    'upload_errors': ['rate<0.2'] // Upload errors can be slightly higher due to auth
  }
};

export default function () {
  let response;
  
  // 1. Test NextAuth endpoints
  response = http.get(`${BASE_URL}/api/auth/csrf`);
  check(response, {
    'CSRF token endpoint works': (r) => r.status === 200,
    'CSRF response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(0.5);

  // 2. Test NextAuth session endpoint
  response = http.get(`${BASE_URL}/api/auth/session`);
  check(response, {
    'Session endpoint responds': (r) => r.status === 200,
    'Session response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(0.5);

  // 3. Test registration endpoint (POST)
  const registerData = {
    name: `TestUser${Math.floor(Math.random() * 10000)}`,
    email: `test${Math.floor(Math.random() * 10000)}@example.com`,
    password: 'TestPassword123!'
  };

  response = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(registerData), {
    headers: HEADERS
  });
  
  check(response, {
    'Register endpoint responds': (r) => r.status >= 200 && r.status < 500,
    'Register response time < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(1);

  // 4. Test upload endpoint (without file)
  response = http.post(`${BASE_URL}/api/upload`, '', {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  check(response, {
    'Upload endpoint responds': (r) => r.status >= 400 && r.status < 500, // Expected to fail without auth/file
    'Upload response time < 1s': (r) => r.timings.duration < 1000,
  }) || uploadErrors.add(1);

  sleep(1);

  // 5. Test upload progress endpoint
  const fakeUploadId = 'test-' + Math.floor(Math.random() * 1000);
  response = http.get(`${BASE_URL}/api/upload/progress/${fakeUploadId}`);
  
  check(response, {
    'Upload progress endpoint responds': (r) => r.status >= 200 && r.status < 500,
    'Progress response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // 6. Load test static assets
  response = http.get(`${BASE_URL}/favicon.ico`);
  check(response, {
    'Static assets load': (r) => r.status === 200 || r.status === 404,
    'Static asset response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  sleep(0.5);
}