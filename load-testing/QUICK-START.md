# Load Testing Quick Start

## Prerequisites

```bash
# Install k6
brew install k6

# Ensure test users exist in Supabase (loadtest1-5@example.com)
# Ensure app is running on localhost:3000
npm run dev
```

## Quick Commands

### Smoke Test (30 seconds, 1 user)
```bash
cd load-testing
k6 run --vus 1 --duration 30s \
  -e BASE_URL="http://localhost:3000" \
  -e SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  complyeur-smoke-test.js
```

### Realistic Load (20 users, 4.5 min) - RECOMMENDED
```bash
k6 run \
  -e BASE_URL="http://localhost:3000" \
  -e SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  complyeur-realistic-load-test.js
```

### Heavy Load (50 users, 3 min)
```bash
k6 run --vus 50 --duration 3m \
  -e BASE_URL="http://localhost:3000" \
  -e SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  complyeur-realistic-load-test.js
```

## Understanding Results

### ✅ Good Results
```
checks.........................: 95%+
http_req_failed................: < 5%
http_req_duration (p95)........: < 1s
```

### ⚠️ Warning Signs
```
checks.........................: < 90%
http_req_failed................: > 5%
http_req_duration (p95)........: > 2s
```

### 🚨 Problems
```
checks.........................: < 80%
http_req_failed................: > 10%
Timeout errors appearing
```

## Known Baselines

- **1 user:** p(95) = 316ms, 100% success
- **20 users:** p(95) = 138ms, 98% success ← BASELINE
- **50 users:** p(95) = 10s, 89% success (dev server limit)

## Troubleshooting

**"k6: command not found"**
→ Run `brew install k6`

**"429 Too Many Requests"**
→ Use `complyeur-realistic-load-test.js` (has session reuse)

**"Login failed: 400"**
→ Create test users in Supabase (loadtest1-5@example.com)

**Timeouts at high load**
→ Expected on dev server. Test production environment.

## Files

- `complyeur-smoke-test.js` - Quick test
- `complyeur-realistic-load-test.js` - Best for realistic testing
- `README.md` - Full documentation
- `TEST-RESULTS.md` - Historical test results
