type HeaderReader = Pick<Headers, 'get'>

export interface TrustedClientIpOptions {
  fallbackIp?: string | null
}

const TRUSTED_PROVIDER_HEADERS = [
  'cf-connecting-ip',
  'x-vercel-forwarded-for',
  'x-real-ip',
] as const

function isValidIpv4(value: string): boolean {
  const parts = value.split('.')
  if (parts.length !== 4) return false

  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false
    const num = Number(part)
    return Number.isInteger(num) && num >= 0 && num <= 255
  })
}

function isValidIpv6(value: string): boolean {
  if (!value.includes(':')) return false
  if (!/^[0-9a-fA-F:]+$/.test(value)) return false
  if (value.includes(':::')) return false
  return true
}

function normalizeIpCandidate(raw: string | null | undefined): string | null {
  if (!raw) return null

  let candidate = raw.trim().replace(/^"+|"+$/g, '')
  if (!candidate || candidate.toLowerCase() === 'unknown') return null

  if (candidate.startsWith('[')) {
    const end = candidate.indexOf(']')
    if (end <= 1) return null
    candidate = candidate.slice(1, end)
  } else if (candidate.includes('.') && candidate.includes(':')) {
    const [host, maybePort] = candidate.split(':')
    if (host && maybePort && /^\d+$/.test(maybePort)) {
      candidate = host
    }
  }

  if (isValidIpv4(candidate) || isValidIpv6(candidate)) {
    return candidate
  }

  return null
}

function parseForwardedForHeader(value: string | null): string | null {
  if (!value) return null

  const parts = value
    .split(',')
    .map((part) => normalizeIpCandidate(part))
    .filter((part): part is string => Boolean(part))

  // Reject ambiguous proxy chains to avoid trusting user-controllable hops.
  if (parts.length !== 1) {
    return null
  }

  return parts[0]
}

export function getTrustedClientIpFromHeaders(
  headers: HeaderReader,
  options: TrustedClientIpOptions = {}
): string | null {
  for (const header of TRUSTED_PROVIDER_HEADERS) {
    const trustedCandidate = normalizeIpCandidate(headers.get(header))
    if (trustedCandidate) {
      return trustedCandidate
    }
  }

  const singleHopForwardedFor = parseForwardedForHeader(headers.get('x-forwarded-for'))
  const allowSingleHopForwardedFor =
    process.env.NODE_ENV !== 'production' ||
    process.env.TRUST_SINGLE_HOP_X_FORWARDED_FOR === 'true'

  if (allowSingleHopForwardedFor && singleHopForwardedFor) {
    return singleHopForwardedFor
  }

  return options.fallbackIp ?? null
}
