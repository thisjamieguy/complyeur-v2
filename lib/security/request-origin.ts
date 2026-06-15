import type { NextRequest } from 'next/server'

const TRUSTED_FETCH_SITES = new Set(['same-origin', 'same-site', 'none'])

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    return url.origin
  } catch {
    return null
  }
}

function getHeaderOrigin(request: NextRequest): string | null {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const proto = forwardedProto || request.nextUrl.protocol.replace(/:$/, '')
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || request.headers.get('host')

  return host ? normalizeOrigin(`${proto}://${host}`) : null
}

function getAllowedOrigins(request: NextRequest): Set<string> {
  const origins = new Set<string>([request.nextUrl.origin])
  const headerOrigin = getHeaderOrigin(request)

  if (headerOrigin) {
    origins.add(headerOrigin)
  }

  for (const value of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.APP_URL,
    process.env.SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ]) {
    const origin = normalizeOrigin(value)
    if (origin) origins.add(origin)
  }

  return origins
}

export type FirstPartyMutationValidation =
  | { ok: true }
  | { ok: false; reason: 'invalid-origin' | 'cross-site-fetch' }

export function validateFirstPartyMutationRequest(
  request: NextRequest
): FirstPartyMutationValidation {
  const secFetchSite = request.headers.get('sec-fetch-site')
  if (secFetchSite && !TRUSTED_FETCH_SITES.has(secFetchSite)) {
    return { ok: false, reason: 'cross-site-fetch' }
  }

  const origin = normalizeOrigin(request.headers.get('origin'))
  if (!origin) {
    return { ok: true }
  }

  if (!getAllowedOrigins(request).has(origin)) {
    return { ok: false, reason: 'invalid-origin' }
  }

  return { ok: true }
}
