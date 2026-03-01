import { afterEach, describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy } from '@/lib/security/csp'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
})

describe('buildContentSecurityPolicy', () => {
  it('uses unsafe-inline (no nonce) in production to allow static rendering', () => {
    process.env.NODE_ENV = 'production'

    const csp = buildContentSecurityPolicy()
    const scriptSrcDirective =
      csp
        .split(';')
        .map((directive) => directive.trim())
        .find((directive) => directive.startsWith('script-src ')) ?? ''

    expect(scriptSrcDirective).toContain("'unsafe-inline'")
    expect(scriptSrcDirective).not.toContain("'unsafe-eval'")
    expect(scriptSrcDirective).not.toContain("'strict-dynamic'")
    expect(scriptSrcDirective).toContain('https://cdn-cookieyes.com')
  })

  it('keeps development script relaxations in non-production', () => {
    process.env.NODE_ENV = 'development'

    const csp = buildContentSecurityPolicy()

    expect(csp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'")
  })
})
