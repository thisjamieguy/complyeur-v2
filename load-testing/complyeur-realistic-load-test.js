import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import exec from 'k6/execution';

// Custom metrics
const errorRate = new Rate('errors');
const dashboardLoadTime = new Rate('dashboard_fast');

// Load testing configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '2m', target: 10 },   // Stay at 10 users for 2 min
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
    errors: ['rate<0.1'],              // Custom error rate under 10%
    dashboard_fast: ['rate>0.8'],      // 80%+ loads under 500ms
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
  console.log('🚀 Starting realistic load test against:', BASE_URL);
  console.log('📊 Test pattern: Login once per user → Reuse session for all requests');
  console.log('');

  // Log in each test user once and store their tokens
  const tokens = {};

  console.log('🔑 Authenticating test users...');
  for (let i = 0; i < TEST_USERS.length; i++) {
    const user = TEST_USERS[i];
    const token = login(user.email, user.password);

    if (token) {
      tokens[user.email] = token;
      console.log(`  ✓ ${user.email} authenticated`);
    } else {
      console.log(`  ✗ ${user.email} failed to authenticate`);
    }

    // Small delay to avoid rate limiting during setup
    sleep(0.5);
  }

  console.log('');
  console.log(`✅ ${Object.keys(tokens).length}/${TEST_USERS.length} users authenticated successfully`);
  console.log('');

  return {
    tokens: tokens,
    startTime: new Date()
  };
}

export default function (data) {
  // Each VU picks a consistent user based on their VU ID
  const vuId = exec.vu.idInTest;
  const userIndex = (vuId - 1) % TEST_USERS.length;
  const user = TEST_USERS[userIndex];

  // Get the pre-authenticated token for this user
  const authToken = data.tokens[user.email];

  if (!authToken) {
    // If no token available, skip this iteration
    errorRate.add(1);
    sleep(1);
    return;
  }

  // Simulate realistic user behavior
  // 1. Load dashboard
  loadDashboard(authToken);
  sleep(1 + Math.random() * 2); // Random delay 1-3 seconds

  // 2. Check health endpoint
  testHealthEndpoint();
  sleep(0.5 + Math.random()); // Random delay 0.5-1.5 seconds

  // 3. Load dashboard again (user navigates around)
  loadDashboard(authToken);
  sleep(2 + Math.random() * 3); // Random delay 2-5 seconds
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
    'setup login successful': (r) => r.status === 200,
  });

  if (!success) {
    console.error(`Setup login failed for ${email}: ${loginRes.status}`);
    return null;
  }

  try {
    const body = JSON.parse(loginRes.body);
    return body.access_token;
  } catch {
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

  // Track dashboard load performance
  if (res.timings.duration < 500) {
    dashboardLoadTime.add(1);
  } else {
    dashboardLoadTime.add(0);
  }

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
    'health check fast': (r) => r.timings.duration < 200,
  });
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Load test completed in ${duration.toFixed(1)} seconds`);
  console.log('═══════════════════════════════════════');
}
