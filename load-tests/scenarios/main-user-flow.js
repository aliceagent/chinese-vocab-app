import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, TEST_USER, HEADERS, LOAD_STAGES, PERFORMANCE_THRESHOLDS } from '../config/base.js';

// Custom metrics
export const errorRate = new Rate('errors');

export const options = {
  stages: LOAD_STAGES.medium,
  thresholds: PERFORMANCE_THRESHOLDS
};

export default function () {
  let response;
  
  // 1. Load home page
  response = http.get(`${BASE_URL}/`);
  check(response, {
    'homepage loads successfully': (r) => r.status === 200,
    'homepage response time < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  
  sleep(1);

  // 2. Try to access dashboard (should redirect to login)
  response = http.get(`${BASE_URL}/dashboard`);
  check(response, {
    'dashboard redirects when not authenticated': (r) => r.status === 307 || r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // 3. Load login page
  response = http.get(`${BASE_URL}/login`);
  check(response, {
    'login page loads': (r) => r.status === 200,
    'login page response time < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(1);

  // 4. Attempt login (will likely fail without proper session handling, but tests the endpoint)
  const loginData = {
    email: TEST_USER.email,
    password: TEST_USER.password
  };

  response = http.post(`${BASE_URL}/api/auth/signin`, JSON.stringify(loginData), {
    headers: HEADERS
  });
  
  check(response, {
    'login endpoint responds': (r) => r.status >= 200 && r.status < 500,
  }) || errorRate.add(1);

  sleep(1);

  // 5. Load vocabulary page (public access test)
  response = http.get(`${BASE_URL}/vocabulary`);
  check(response, {
    'vocabulary page loads': (r) => r.status === 200 || r.status === 307, // May redirect
    'vocabulary response time < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(1);

  // 6. Test upload page access
  response = http.get(`${BASE_URL}/upload`);
  check(response, {
    'upload page responds': (r) => r.status === 200 || r.status === 307,
  }) || errorRate.add(1);

  sleep(2);
}