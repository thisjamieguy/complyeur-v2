import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Simplified load testing configuration for smoke test
export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
    errors: ['rate<0.1'],              // Custom error rate under 10%
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = __ENV.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';

// Test user credentials
const TEST_USERS = [
  { email: 'loadtest1@example.com', password: 'TestPassword123!' },
  { email: 'loadtest2@example.com', password: 'TestPassword123!' },
  { email: 'loadtest3@example.com', password: 'TestPassword123!' },
  { email: 'loadtest4@example.com', password: 'TestPassword123!' },
  { email: 'loadtest5@example.com', password: 'TestPassword123!' },
];

export function setup() {
  console.log('Starting smoke test against:', BASE_URL);
  console.log('Testing: Login → Dashboard loading');
  return { startTime: new Date() };
}

export default function () {
  // Each virtual user picks a random test account
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];

  // 1. Login via Supabase Auth
  const authToken = login(user.email, user.password);

  if (!authToken) {
    errorRate.add(1);
    return;
  }

  sleep(1); // User pauses before navigating

  // 2. Load dashboard
  loadDashboard(authToken);
  sleep(2);

  // 3. Test health endpoint
  testHealthEndpoint();
  sleep(1);
}

function login(email, password) {
  const loginRes = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({
      email: email,
      password: password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      tags: { name: 'Login' },
    }
  );

  const success = check(loginRes, {
    'login successful': (r) => r.status === 200,
    'has access token': (r) => {
      try {
        return JSON.parse(r.body).access_token !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    console.error(`Login failed for ${email}: ${loginRes.status}`);
    errorRate.add(1);
    return null;
  }

  try {
    return JSON.parse(loginRes.body).access_token;
  } catch {
    errorRate.add(1);
    return null;
  }
}

function loadDashboard(token) {
  const res = http.get(`${BASE_URL}/dashboard`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'Dashboard' },
  });

  const success = check(res, {
    'dashboard loaded': (r) => r.status === 200,
    'dashboard loads in <1s': (r) => r.timings.duration < 1000,
    'dashboard loads in <500ms': (r) => r.timings.duration < 500,
  });

  if (!success) {
    errorRate.add(1);
  }
}

function testHealthEndpoint() {
  const res = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'Health Check' },
  });

  check(res, {
    'health check successful': (r) => r.status === 200,
  });
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`Smoke test completed in ${duration} seconds`);
}
