import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Load testing configuration
// Adjust these based on your needs
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.05'],   // Error rate under 5%
    errors: ['rate<0.1'],             // Custom error rate under 10%
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = __ENV.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';

// Test user credentials (you'll need to create these)
const TEST_USERS = [
  { email: 'loadtest1@example.com', password: 'TestPassword123!' },
  { email: 'loadtest2@example.com', password: 'TestPassword123!' },
  { email: 'loadtest3@example.com', password: 'TestPassword123!' },
  { email: 'loadtest4@example.com', password: 'TestPassword123!' },
  { email: 'loadtest5@example.com', password: 'TestPassword123!' },
];

export function setup() {
  console.log('Starting load test against:', BASE_URL);
  console.log('Test will simulate user journeys: login → dashboard → employees → trips');
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

  // 3. View employees list
  loadEmployees(authToken);
  sleep(2);

  // 4. View a specific employee's trips
  loadEmployeeTrips(authToken);
  sleep(1);

  // 5. Check compliance calculations
  checkCompliance(authToken);
  sleep(2);
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

  check(res, {
    'dashboard loaded': (r) => r.status === 200,
    'dashboard loads in <1s': (r) => r.timings.duration < 1000,
  });

  if (res.status !== 200) {
    errorRate.add(1);
  }
}

function loadEmployees(token) {
  const res = http.get(`${BASE_URL}/api/employees`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'Employees List' },
  });

  check(res, {
    'employees loaded': (r) => r.status === 200,
    'employees response is JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  if (res.status !== 200) {
    errorRate.add(1);
  }
}

function loadEmployeeTrips(token) {
  // This assumes you have an API endpoint for trips
  // Adjust the URL to match your actual API structure
  const res = http.get(`${BASE_URL}/api/trips`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'Employee Trips' },
  });

  check(res, {
    'trips loaded': (r) => r.status === 200,
  });

  if (res.status !== 200) {
    errorRate.add(1);
  }
}

function checkCompliance(token) {
  // Test the 90/180 calculation endpoint
  // Adjust to match your actual compliance check API
  const res = http.get(`${BASE_URL}/api/compliance`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'Compliance Check' },
  });

  check(res, {
    'compliance check successful': (r) => r.status === 200,
    'compliance calculation fast': (r) => r.timings.duration < 500,
  });

  if (res.status !== 200) {
    errorRate.add(1);
  }
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
}
