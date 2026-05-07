import { afterEach, describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy } from '@/lib/security/csp'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
})

describe('buildContentSecurityPolicy', () => {
  it('uses unsafe-inline (no nonce) in production to allow static rendering', () => {
    process.env.NODE_ENV = 'production'

    const csp = buildContentSecurityPolicy({
      requestHostname: 'complyeur.com',
      requestProtocol: 'https:',
    })
    const scriptSrcDirective =
      csp
        .split(';')
        .map((directive) => directive.trim())
        .find((directive) => directive.startsWith('script-src ')) ?? ''

    expect(scriptSrcDirective).toContain("'unsafe-inline'")
    expect(scriptSrcDirective).not.toContain("'unsafe-eval'")
    expect(scriptSrcDirective).not.toContain("'strict-dynamic'")
    expect(scriptSrcDirective).toContain('https://cdn-cookieyes.com')
    expect(csp).toContain('upgrade-insecure-requests')
  })

  it('keeps development script relaxations in non-production', () => {
    process.env.NODE_ENV = 'development'

    const csp = buildContentSecurityPolicy()

    expect(csp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'")
  })

  it('allows localhost ws:// in connect-src in development for Next.js HMR', () => {
    // Regression: ISSUE-001 — CSP blocked Next.js dev HMR WebSocket
    // Found by /qa on 2026-05-08
    process.env.NODE_ENV = 'development'

    const csp = buildContentSecurityPolicy()
    const connectSrc =
      csp
        .split(';')
        .map((directive) => directive.trim())
        .find((directive) => directive.startsWith('connect-src ')) ?? ''

    expect(connectSrc).toContain('ws://localhost:*')
    expect(connectSrc).toContain('ws://127.0.0.1:*')
  })

  it('does not allow ws:// in connect-src in production', () => {
    process.env.NODE_ENV = 'production'

    const csp = buildContentSecurityPolicy({
      requestHostname: 'complyeur.com',
      requestProtocol: 'https:',
    })
    const connectSrc =
      csp
        .split(';')
        .map((directive) => directive.trim())
        .find((directive) => directive.startsWith('connect-src ')) ?? ''

    expect(connectSrc).not.toContain('ws://')
  })

  it('does not force HTTPS upgrades for localhost production requests', () => {
    process.env.NODE_ENV = 'production'

    const csp = buildContentSecurityPolicy({
      requestHostname: 'localhost',
      requestProtocol: 'http:',
    })

    expect(csp).not.toContain('upgrade-insecure-requests')
  })
})
