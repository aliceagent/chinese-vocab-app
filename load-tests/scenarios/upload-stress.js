import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { BASE_URL, TEST_USER, HEADERS } from '../config/base.js';

// Upload-specific metrics
export const uploadErrors = new Rate('upload_errors');
export const uploadTimeouts = new Counter('upload_timeouts');
export const concurrentUploads = new Counter('concurrent_uploads');
export const uploadResponseTime = new Trend('upload_response_time');
export const memoryPressure = new Rate('memory_pressure_indicators');

// UPLOAD SYSTEM STRESS TEST - File operations and storage
export const options = {
  stages: [
    // Gradual increase in concurrent file operations
    { duration: '2m', target: 20 },   // Light file operations
    { duration: '3m', target: 50 },   // Medium concurrent uploads
    { duration: '4m', target: 100 },  // Heavy upload load
    { duration: '3m', target: 150 },  // Very heavy - stress storage/memory
    { duration: '2m', target: 200 },  // Maximum file handling stress
    { duration: '2m', target: 100 },  // Recovery
    { duration: '1m', target: 0 }     // Cool down
  ],
  thresholds: {
    'upload_response_time': ['p(95)<10000'], // Upload operations can be slower
    'upload_errors': ['rate<0.25'],          // Accept higher error rate for uploads
    'upload_timeouts': ['count<30'],         // Limit cascading timeouts
    'memory_pressure_indicators': ['rate<0.1'] // Watch for memory issues
  }
};

// Simulate different file types and sizes
const FILE_TYPES = [
  { type: 'text/plain', ext: 'txt', size: 'small' },
  { type: 'application/pdf', ext: 'pdf', size: 'medium' },
  { type: 'image/jpeg', ext: 'jpg', size: 'large' },
  { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx', size: 'medium' }
];

export default function () {
  const userNum = Math.floor(Math.random() * 10000);
  const timestamp = Date.now();
  let response;

  // Select random file type for this iteration
  const fileType = FILE_TYPES[Math.floor(Math.random() * FILE_TYPES.length)];
  
  // 1. PRE-UPLOAD: Get CSRF token (required for uploads)
  response = http.get(`${BASE_URL}/api/auth/csrf`, {
    timeout: '8s'
  });
  
  check(response, {
    'CSRF for upload available': (r) => r.status === 200,
  }) || uploadErrors.add(1);

  sleep(0.2);

  // 2. UPLOAD ATTEMPT (without actual file - stress endpoint handling)
  const uploadStartTime = Date.now();
  
  const uploadPayload = {
    filename: `stress_test_${userNum}_${timestamp}.${fileType.ext}`,
    fileType: fileType.type,
    fileSize: fileType.size === 'small' ? 1024 : fileType.size === 'medium' ? 102400 : 1048576
  };

  response = http.post(`${BASE_URL}/api/upload`, '', {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Filename': uploadPayload.filename,
      'X-File-Type': uploadPayload.fileType
    },
    timeout: '30s' // Extended timeout for file operations
  });

  const uploadTime = Date.now() - uploadStartTime;
  uploadResponseTime.add(uploadTime);
  concurrentUploads.add(1);

  const uploadSuccess = check(response, {
    'upload endpoint handles stress': (r) => r.status >= 400 && r.status < 500, // Expected auth failure
    'upload response within timeout': (r) => r.timings.duration < 25000,
  });

  if (!uploadSuccess) {
    uploadErrors.add(1);
    if (response.status === 0 || uploadTime > 25000) {
      uploadTimeouts.add(1);
    }
    if (response.status === 503 || response.status === 507) {
      memoryPressure.add(1); // Server overload indicators
    }
  }

  sleep(0.3);

  // 3. UPLOAD PROGRESS CHECK (stress progress tracking system)
  const fakeUploadId = `stress-${userNum}-${timestamp}`;
  response = http.get(`${BASE_URL}/api/upload/progress/${fakeUploadId}`, {
    timeout: '10s'
  });

  check(response, {
    'progress tracking under load': (r) => r.status >= 200 && r.status < 500,
    'progress query fast': (r) => r.timings.duration < 2000,
  }) || uploadErrors.add(1);

  sleep(0.2);

  // 4. MULTIPLE RAPID PROGRESS CHECKS (simulate active upload monitoring)
  for (let i = 0; i < 3; i++) {
    response = http.get(`${BASE_URL}/api/upload/progress/${fakeUploadId}-${i}`, {
      timeout: '5s'
    });
    
    check(response, {
      'rapid progress checks': (r) => r.status >= 200 && r.status < 500,
    }) || uploadErrors.add(1);
    
    sleep(0.1); // Very rapid checks
  }

  // 5. SIMULATE UPLOAD COMPLETION WEBHOOK/CALLBACK
  const completionData = {
    uploadId: fakeUploadId,
    status: 'completed',
    processingTime: Math.floor(Math.random() * 5000)
  };

  response = http.post(`${BASE_URL}/api/upload/callback`, JSON.stringify(completionData), {
    headers: HEADERS,
    timeout: '15s'
  });

  check(response, {
    'upload completion handling': (r) => r.status >= 200 && r.status < 500,
  }) || uploadErrors.add(1);

  sleep(0.4);

  // 6. VOCABULARY LIST CREATION (post-upload processing stress)
  const vocabListData = {
    name: `Stress List ${userNum}`,
    sourceFileName: uploadPayload.filename,
    totalWords: Math.floor(Math.random() * 500)
  };

  response = http.post(`${BASE_URL}/api/vocabulary-lists`, JSON.stringify(vocabListData), {
    headers: HEADERS,
    timeout: '20s'
  });

  check(response, {
    'post-upload processing': (r) => r.status >= 200 && r.status < 500,
  }) || uploadErrors.add(1);

  // 7. CLEANUP SIMULATION (delete operations under stress)
  response = http.request('DELETE', `${BASE_URL}/api/upload/${fakeUploadId}`, '', {
    timeout: '10s'
  });

  check(response, {
    'cleanup operations under stress': (r) => r.status >= 200 && r.status < 500,
  }) || uploadErrors.add(1);

  // Short sleep to maintain upload stress
  sleep(0.3);

  // 8. STORAGE SPACE CHECK (simulate storage monitoring)
  response = http.get(`${BASE_URL}/api/storage/status`, {
    timeout: '5s'
  });

  check(response, {
    'storage monitoring under load': (r) => r.status >= 200 && r.status < 500,
  }) || uploadErrors.add(1);

  // 9. CONCURRENT FILE LIST OPERATIONS
  response = http.get(`${BASE_URL}/api/files?user=${userNum}`, {
    timeout: '8s'
  });

  check(response, {
    'file listing under concurrent load': (r) => r.status >= 200 && r.status < 500,
  }) || uploadErrors.add(1);

  // Minimal sleep for maximum upload system stress
  sleep(0.1);
}

export function setup() {
  console.log('📁 UPLOAD STRESS TEST: File Operations & Storage');
  console.log('🎯 Target: File handling, storage systems, memory usage');
  console.log('📊 Monitoring: Upload times, memory pressure, concurrent operations');
  
  // Test upload endpoint availability
  const uploadCheck = http.post(`${BASE_URL}/api/upload`, '', {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  
  // Expect 400/401 (auth required) but not 500 (server error)
  if (uploadCheck.status >= 500) {
    throw new Error('Upload system not healthy before stress test');
  }
  
  return { 
    startTime: Date.now(),
    uploadEndpointInitialTime: uploadCheck.timings.duration 
  };
}

export function teardown(data) {
  console.log('📁 Upload stress test completed');
  console.log(`⏱️  Duration: ${(Date.now() - data.startTime) / 1000}s`);
  console.log(`📤 Initial upload endpoint response: ${data.uploadEndpointInitialTime}ms`);
  console.log('💾 Check reports for upload system bottlenecks');
}