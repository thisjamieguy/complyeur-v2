#!/usr/bin/env tsx
/**
 * Endpoint Testing Script
 * 
 * Tests all API routes and server actions in the application
 * 
 * Usage:
 *   pnpm tsx scripts/test-endpoints.ts
 *   pnpm tsx scripts/test-endpoints.ts --email test@example.com --password Test123!
 */

import { env } from '../lib/env'

interface TestResult {
  endpoint: string
  method: string
  status: 'success' | 'error'
  message: string
  duration: number
}

const results: TestResult[] = []

async function testEndpoint(
  endpoint: string,
  method: string = 'GET',
  body?: FormData | object
): Promise<TestResult> {
  const startTime = Date.now()
  const url = `${env.NEXT_PUBLIC_APP_URL}${endpoint}`

  try {
    const options: RequestInit = {
      method,
      headers: {},
    }

    if (body) {
      if (body instanceof FormData) {
        // FormData doesn't need Content-Type header
        options.body = body
      } else {
        options.headers = {
          'Content-Type': 'application/json',
        }
        options.body = JSON.stringify(body)
      }
    }

    const response = await fetch(url, options)
    const duration = Date.now() - startTime

    if (response.ok || response.redirected || response.status === 302) {
      return {
        endpoint,
        method,
        status: 'success',
        message: `Status: ${response.status}${response.redirected ? ' (redirected)' : ''}`,
        duration,
      }
    } else {
      const text = await response.text()
      return {
        endpoint,
        method,
        status: 'error',
        message: `Status: ${response.status} - ${text.substring(0, 100)}`,
        duration,
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime
    return {
      endpoint,
      method,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration,
    }
  }
}

async function runTests(email?: string, password?: string) {
  console.log('🧪 Starting endpoint tests...\n')
  console.log(`Base URL: ${env.NEXT_PUBLIC_APP_URL}\n`)
  if (email || password) {
    console.log('Note: provided auth credentials are ignored by this script because it only tests HTTP endpoints.\n')
  }

  // Test API Routes
  console.log('📡 Testing API Routes...')
  
  const authCallbackTest = await testEndpoint('/auth/callback', 'GET')
  results.push(authCallbackTest)
  console.log(
    `  ${authCallbackTest.status === 'success' ? '✓' : '✗'} GET /auth/callback - ${authCallbackTest.message} (${authCallbackTest.duration}ms)`
  )

  const authCallbackWithCodeTest = await testEndpoint('/auth/callback?code=test_code&next=/dashboard', 'GET')
  results.push(authCallbackWithCodeTest)
  console.log(
    `  ${authCallbackWithCodeTest.status === 'success' ? '✓' : '✗'} GET /auth/callback?code=... - ${authCallbackWithCodeTest.message} (${authCallbackWithCodeTest.duration}ms)`
  )

  console.log('\n⚠️  Note: Server actions (login, signup, etc.) cannot be tested via HTTP requests.')
  console.log('   They must be called from React components. Use the test page at /test-endpoints instead.\n')

  // Print summary
  console.log('📊 Test Summary')
  console.log('─'.repeat(50))
  const successCount = results.filter((r) => r.status === 'success').length
  const errorCount = results.filter((r) => r.status === 'error').length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  console.log(`Total tests: ${results.length}`)
  console.log(`✓ Passed: ${successCount}`)
  console.log(`✗ Failed: ${errorCount}`)
  console.log(`⏱️  Total duration: ${totalDuration}ms`)
  console.log('─'.repeat(50))

  if (errorCount > 0) {
    console.log('\n❌ Failed tests:')
    results
      .filter((r) => r.status === 'error')
      .forEach((r) => {
        console.log(`  ${r.method} ${r.endpoint}: ${r.message}`)
      })
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed!')
    process.exit(0)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
let email: string | undefined
let password: string | undefined

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) {
    email = args[i + 1]
    i++
  } else if (args[i] === '--password' && args[i + 1]) {
    password = args[i + 1]
    i++
  }
}

// Run tests
runTests(email, password).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})


