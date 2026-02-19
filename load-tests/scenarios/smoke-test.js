import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, HEADERS, PERFORMANCE_THRESHOLDS } from '../config/base.js';

// Custom metrics
export const errorRate = new Rate('smoke_errors');

export const options = {
  stages: [
    { duration: '30s', target: 5 }, // Ramp up to 5 users
    { duration: '1m', target: 5 },  // Stay at 5 users
    { duration: '30s', target: 0 }  // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // Stricter threshold for smoke test
    'http_req_failed': ['rate<0.01'],    // Very low error rate expected
    'smoke_errors': ['rate<0.01']
  }
};

export default function () {
  let response;
  
  // Test core pages that should always work
  const pages = [
    { path: '/', name: 'homepage' },
    { path: '/login', name: 'login page' },
    { path: '/register', name: 'register page' }
  ];

  pages.forEach(page => {
    response = http.get(`${BASE_URL}${page.path}`);
    check(response, {
      [`${page.name} loads successfully`]: (r) => r.status === 200,
      [`${page.name} response time < 800ms`]: (r) => r.timings.duration < 800,
      [`${page.name} has content`]: (r) => r.body.length > 100,
    }) || errorRate.add(1);
    
    sleep(0.5);
  });

  // Test essential API endpoints
  const apiEndpoints = [
    '/api/auth/csrf',
    '/api/auth/session'
  ];

  apiEndpoints.forEach(endpoint => {
    response = http.get(`${BASE_URL}${endpoint}`);
    check(response, {
      [`API ${endpoint} responds`]: (r) => r.status === 200,
      [`API ${endpoint} response time < 300ms`]: (r) => r.timings.duration < 300,
    }) || errorRate.add(1);
    
    sleep(0.2);
  });

  sleep(1);
}