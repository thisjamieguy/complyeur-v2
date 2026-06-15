import { describe, expect, it } from 'vitest'
import type { NextRequest } from 'next/server'

import { validateFirstPartyMutationRequest } from '@/lib/security/request-origin'

function makeRequest(headers: Record<string, string | undefined>): NextRequest {
  return {
    nextUrl: new URL('https://app.complyeur.com/settings'),
    headers: new Headers(
      Object.entries(headers).filter((entry): entry is [string, string] => Boolean(entry[1]))
    ),
  } as NextRequest
}

describe('validateFirstPartyMutationRequest', () => {
  it('allows same-origin browser mutations', () => {
    const result = validateFirstPartyMutationRequest(makeRequest({
      origin: 'https://app.complyeur.com',
      'sec-fetch-site': 'same-origin',
    }))

    expect(result).toEqual({ ok: true })
  })

  it('allows mutations when origin matches the request host', () => {
    const result = validateFirstPartyMutationRequest(makeRequest({
      host: '127.0.0.1:3100',
      origin: 'http://127.0.0.1:3100',
      'sec-fetch-site': 'same-origin',
      'x-forwarded-proto': 'http',
    }))

    expect(result).toEqual({ ok: true })
  })

  it('rejects cross-site browser mutations', () => {
    const result = validateFirstPartyMutationRequest(makeRequest({
      origin: 'https://attacker.example',
      'sec-fetch-site': 'cross-site',
    }))

    expect(result).toEqual({ ok: false, reason: 'cross-site-fetch' })
  })

  it('rejects mismatched origin headers even when fetch metadata is absent', () => {
    const result = validateFirstPartyMutationRequest(makeRequest({
      origin: 'https://attacker.example',
    }))

    expect(result).toEqual({ ok: false, reason: 'invalid-origin' })
  })
})
