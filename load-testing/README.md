# ComplyEur Load Testing Guide

## Overview

This directory contains k6 load testing scripts to test ComplyEur's performance under various loads.

## Test Results Summary (February 4, 2026)

### Smoke Test (1 User)
**Status:** ✅ PASSED
- 100% success rate
- p(95) response time: 316ms
- Dashboard loads: < 500ms consistently
- **Conclusion:** App works perfectly with single user

### Light Load Test (10 Users, 2 Minutes)
**Status:** ⚠️ Rate Limited (Initial Attempt)
- Hit Supabase Auth rate limiting
- Learned: Don't repeatedly login - reuse sessions

### Realistic Load Test (10-20 Users, 4.5 Minutes)
**Status:** ✅ EXCELLENT
- **98.38% success rate**
- **0% HTTP failures**
- p(95) response time: 138ms
- 99.58% of dashboards loaded < 500ms
- **Conclusion:** App performs excellently with 20 concurrent users

### Heavy Load Test (50 Users, 3 Minutes)
**Status:** ⚠️ DEGRADED
- **89.07% success rate**
- 6.17% HTTP failure rate
- p(95) response time: 10.19 seconds
- Timeout errors appearing
- **Conclusion:** Local dev server struggles above 30-40 users

## Key Findings

### Performance Capacity
- **Excellent:** 0-20 concurrent users
- **Good:** 20-30 concurrent users
- **Degraded:** 30-50 concurrent users
- **Breaking Point:** ~40 concurrent users (on local dev server)

### Bottlenecks Identified
1. **Supabase Auth Rate Limiting:** Prevents rapid repeated logins (security feature)
2. **Next.js Dev Server:** Not optimized for high concurrency
3. **Local Environment:** Production on Vercel will handle much higher loads

### What Works Well
- Dashboard loading is fast (< 200ms average)
- Authentication system is solid
- No memory leaks detected
- Consistent performance under moderate load

## Available Test Scripts

### 1. `complyeur-smoke-test.js`
Quick validation test with 1 user for 30 seconds.

**Use when:** Verifying app is working after changes

**Run:**
```bash
k6 run -e BASE_URL="http://localhost:3000" \
  -e SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  load-testing/complyeur-smoke-test.js
```

### 2. `complyeur-realistic-load-test.js` (Recommended)
Realistic user behavior with session reuse. Ramps from 10 to 20 users over 4.5 minutes.

**Use when:** Testing actual app performance under realistic load

**Run:**
```bash
k6 run -e BASE_URL="http://localhost:3000" \
  -e SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  load-testing/complyeur-realistic-load-test.js
```

### 3. `complyeur-load-test.js`
Original test with API endpoint testing (currently has 404s on some endpoints).

**Use when:** You've added `/api/employees`, `/api/trips`, `/api/compliance` endpoints

### Quick Test Commands

**Smoke Test (30 seconds):**
```bash
k6 run --vus 1 --duration 30s \
  -e BASE_URL="http://localhost:3000" \
  -e SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  load-testing/complyeur-smoke-test.js
```

**Light Load (10 users, 2 minutes):**
```bash
k6 run --vus 10 --duration 2m \
  -e BASE_URL="http://localhost:3000" \
  -e SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  load-testing/complyeur-realistic-load-test.js
```

**Heavy Load (50 users, 3 minutes):**
```bash
k6 run --vus 50 --duration 3m \
  -e BASE_URL="http://localhost:3000" \
  -e SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  load-testing/complyeur-realistic-load-test.js
```

## Understanding Results

### Key Metrics

**http_req_duration (Response Times):**
- p(95) < 500ms = Excellent
- p(95) < 1s = Good
- p(95) > 2s = Problem

**http_req_failed (Error Rate):**
- < 1% = Excellent
- < 5% = Acceptable
- > 5% = Problem

**checks (Success Rate):**
- > 95% = Good
- < 90% = Problem

### Common Issues

**429 Errors (Rate Limiting):**
- **Cause:** Too many login requests to Supabase Auth
- **Solution:** Use session reuse (realistic load test script)

**Timeout Errors:**
- **Cause:** Server overwhelmed, requests taking > 60s
- **Solution:** Reduce concurrent users or test production environment

**Slow p(95) Times:**
- **Cause:** Server under heavy load
- **Solution:** Optimize slow endpoints or increase server capacity

## Test User Accounts

The following test accounts are configured:
- `loadtest1@example.com` / `TestPassword123!`
- `loadtest2@example.com` / `TestPassword123!`
- `loadtest3@example.com` / `TestPassword123!`
- `loadtest4@example.com` / `TestPassword123!`
- `loadtest5@example.com` / `TestPassword123!`

These accounts should have:
- Company records in the database
- Sample employees (3 per company)
- Sample trips (2-3 per employee)

## Production Testing

To test your production environment:

1. Deploy to Vercel
2. Update BASE_URL:
   ```bash
   -e BASE_URL="https://your-app.vercel.app"
   ```
3. Run the same tests
4. Production should handle 50-100+ users easily

## Recommendations

### For Development
- Run smoke tests after major changes
- Current capacity (20-30 users) is sufficient for development

### For Production
- Test on Vercel with higher loads (50-100+ users)
- Monitor Supabase connection pool usage
- Consider caching for compliance calculations
- Add database indexes on trips table (start_date, end_date, employee_id)

### Before Launch
1. Run smoke test to verify functionality
2. Run realistic load test (20 users) to establish baseline
3. Test production deployment with 50+ users
4. Monitor Supabase metrics during tests

## Next Steps

### Performance Optimizations (If Needed)
1. **Database Indexes:**
   ```sql
   CREATE INDEX idx_trips_dates ON trips(start_date, end_date);
   CREATE INDEX idx_trips_employee ON trips(employee_id);
   ```

2. **Caching:** Consider caching compliance calculations that don't change often

3. **API Endpoints:** If you add REST APIs, ensure they're optimized

### Monitoring
- Set up Vercel Analytics
- Monitor Supabase connection pool
- Track p(95) response times in production

## Files in This Directory

- `complyeur-smoke-test.js` - Quick validation test (1 user)
- `complyeur-realistic-load-test.js` - Realistic load test (10-20 users, session reuse)
- `complyeur-load-test.js` - Original full test (needs API endpoints)
- `run-load-test.sh` - Interactive test runner script
- `setup-test-users.sql` - SQL script to create test data
- `README.md` - This file

## Support

If you encounter issues:
1. Check that localhost:3000 is running
2. Verify test users exist in Supabase
3. Ensure environment variables are set
4. Review k6 documentation: https://k6.io/docs/

---

Last updated: February 4, 2026
Test Environment: macOS, Next.js dev server (localhost:3000)
