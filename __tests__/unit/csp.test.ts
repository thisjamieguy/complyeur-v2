import { afterEach, describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy } from '@/lib/security/csp'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
})

describe('buildContentSecurityPolicy', () => {
  it('removes unsafe script directives in production', () => {
    process.env.NODE_ENV = 'production'

    const csp = buildContentSecurityPolicy('nonce123')
    const scriptSrcDirective =
      csp
        .split(';')
        .map((directive) => directive.trim())
        .find((directive) => directive.startsWith('script-src ')) ?? ''

    expect(scriptSrcDirective).toContain("'nonce-nonce123'")
    expect(scriptSrcDirective).toContain("'strict-dynamic'")
    expect(scriptSrcDirective).not.toContain("'unsafe-inline'")
    expect(scriptSrcDirective).not.toContain("'unsafe-eval'")
  })

  it('keeps development script relaxations in non-production', () => {
    process.env.NODE_ENV = 'development'

    const csp = buildContentSecurityPolicy('nonce123')

    expect(csp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'")
  })
})
