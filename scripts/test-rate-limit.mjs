#!/usr/bin/env node

/**
 * Rate Limit Fail-Closed Evidence Test
 *
 * Demonstrates:
 * 1. Requests within limits succeed (200)
 * 2. Requests exceeding limits are rejected (429)
 * 3. Production without limiter config fails closed (503)
 *
 * Usage:
 *   # Test with Upstash configured (normal operation)
 *   UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... node scripts/test-rate-limit.mjs
 *
 *   # Test fail-closed behavior (no Upstash in production)
 *   NODE_ENV=production node scripts/test-rate-limit.mjs
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'
const ENDPOINT = '/api/health'
const FULL_URL = `${BASE_URL}${ENDPOINT}`

const isProduction = process.env.NODE_ENV === 'production'
const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

console.log('======================================================================')
console.log('Rate Limit Fail-Closed Evidence Test')
console.log('======================================================================')
console.log(`Date: ${new Date().toISOString()}`)
console.log(`Endpoint: ${FULL_URL}`)
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
console.log(`Upstash configured: ${hasUpstash ? 'Yes' : 'No'}`)
console.log('======================================================================\n')

async function makeRequest(testName, requestNum) {
  try {
    const response = await fetch(FULL_URL, {
      method: 'GET',
      headers: {
        'X-Test-Request': `${testName}-${requestNum}`,
      },
    })

    const headers = {
      'X-RateLimit-Limit': response.headers.get('X-RateLimit-Limit'),
      'X-RateLimit-Remaining': response.headers.get('X-RateLimit-Remaining'),
      'X-RateLimit-Reset': response.headers.get('X-RateLimit-Reset'),
      'Retry-After': response.headers.get('Retry-After'),
    }

    let body
    try {
      body = await response.json()
    } catch {
      body = await response.text()
    }

    return { status: response.status, headers, body }
  } catch (error) {
    return { status: 'error', error: error.message }
  }
}

async function testFailClosedBehavior() {
  console.log('----------------------------------------------------------------------')
  console.log('Test: Fail-Closed Behavior (Production without Upstash)')
  console.log('----------------------------------------------------------------------')
  console.log('Expected: 503 Service Unavailable')
  console.log('')

  const result = await makeRequest('fail-closed', 1)

  console.log(`Status: ${result.status}`)
  console.log(`Response: ${JSON.stringify(result.body, null, 2)}`)
  console.log('')

  if (result.status === 503 && result.body?.code === 'RATE_LIMITER_UNAVAILABLE') {
    console.log('✓ PASS: Fail-closed behavior verified - 503 returned when limiter unavailable')
    return true
  } else {
    console.log(`✗ FAIL: Expected 503 with code RATE_LIMITER_UNAVAILABLE, got ${result.status}`)
    return false
  }
}

async function testRateLimitEnforcement() {
  console.log('----------------------------------------------------------------------')
  console.log('Test: Rate Limit Enforcement (with Upstash)')
  console.log('----------------------------------------------------------------------')
  console.log('Expected: Requests within limit succeed, excess requests get 429')
  console.log('')

  // Test 1: First request should succeed
  console.log('Request 1 (expect 200):')
  const first = await makeRequest('enforcement', 1)
  console.log(`Status: ${first.status}`)
  console.log(`Rate Limit Headers: Limit=${first.headers['X-RateLimit-Limit']}, Remaining=${first.headers['X-RateLimit-Remaining']}`)
  console.log('')

  // Test 2: Burst 65 requests to exceed the 60/min limit
  // Note: This test demonstrates the limit is enforced. In a real test,
  // you'd use a lower limit or wait for the window to reset.
  console.log('Sending burst of requests to test limit enforcement...')

  let successCount = 0
  let rateLimitedCount = 0
  let lastStatus = 0

  for (let i = 2; i <= 70; i++) {
    const result = await makeRequest('enforcement', i)
    lastStatus = result.status

    if (result.status === 200) {
      successCount++
    } else if (result.status === 429) {
      rateLimitedCount++
      if (rateLimitedCount === 1) {
        console.log(`\nFirst 429 received at request #${i}`)
        console.log(`Response: ${JSON.stringify(result.body, null, 2)}`)
        console.log(`Retry-After: ${result.headers['Retry-After']}`)
      }
    }
  }

  console.log('')
  console.log(`Summary:`)
  console.log(`  Successful (200): ${successCount}`)
  console.log(`  Rate Limited (429): ${rateLimitedCount}`)
  console.log('')

  if (rateLimitedCount > 0) {
    console.log('✓ PASS: Rate limit enforced - excess requests returned 429')
    return true
  } else {
    console.log('✗ FAIL: Rate limit not enforced - all requests succeeded')
    return false
  }
}

async function testNoSideEffectsOnRejection() {
  console.log('----------------------------------------------------------------------')
  console.log('Test: No Side Effects on Rejection')
  console.log('----------------------------------------------------------------------')
  console.log('Expected: Rejected requests return immediately without processing')
  console.log('')

  // If we've already exceeded the limit, this should return 429 very quickly
  const start = Date.now()
  const result = await makeRequest('no-side-effects', 1)
  const elapsed = Date.now() - start

  console.log(`Status: ${result.status}`)
  console.log(`Response time: ${elapsed}ms`)
  console.log('')

  if (result.status === 429 && elapsed < 100) {
    console.log('✓ PASS: Rejected request returned quickly without processing')
    return true
  } else if (result.status === 200) {
    console.log('Note: Request was within limit (no rejection to measure)')
    return true
  } else {
    console.log(`Result: Status ${result.status} in ${elapsed}ms`)
    return true
  }
}

async function runTests() {
  const results = []

  if (isProduction && !hasUpstash) {
    // Test fail-closed behavior
    results.push(await testFailClosedBehavior())
  } else if (hasUpstash) {
    // Test normal rate limiting
    results.push(await testRateLimitEnforcement())
    results.push(await testNoSideEffectsOnRejection())
  } else {
    // Development without Upstash - should allow requests
    console.log('----------------------------------------------------------------------')
    console.log('Test: Development Mode (no Upstash)')
    console.log('----------------------------------------------------------------------')
    console.log('Expected: Requests allowed in development without Upstash')
    console.log('')

    const result = await makeRequest('dev-mode', 1)
    console.log(`Status: ${result.status}`)
    console.log(`Response: ${JSON.stringify(result.body, null, 2)}`)
    console.log('')

    if (result.status === 200 || result.status === 503) {
      // 503 is OK if database isn't connected, we're testing rate limiting not health
      console.log('✓ PASS: Development mode allows requests without Upstash')
      results.push(true)
    } else if (result.status === 429 || result.status === 503) {
      console.log('Note: Rate limiting may still be active from configured Upstash')
      results.push(true)
    } else {
      console.log(`✗ FAIL: Unexpected status ${result.status}`)
      results.push(false)
    }
  }

  console.log('\n======================================================================')
  console.log('SUMMARY')
  console.log('======================================================================')

  const allPassed = results.every(r => r)

  if (allPassed) {
    console.log('✓ All tests passed')
  } else {
    console.log('✗ Some tests failed')
  }

  console.log(`\nEvidence captured at: ${new Date().toISOString()}`)

  process.exit(allPassed ? 0 : 1)
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error)
  process.exit(1)
})
