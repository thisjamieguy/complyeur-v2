interface TransportSecurityContext {
  hostname?: string | null
  protocol?: string | null
}

function isLocalHostname(hostname?: string | null): boolean {
  if (!hostname) return false

  const normalizedHostname = hostname.toLowerCase()
  return (
    normalizedHostname === 'localhost' ||
    normalizedHostname === '127.0.0.1' ||
    normalizedHostname === '[::1]'
  )
}

function isKnownHttpsDeployment(): boolean {
  if (process.env.VERCEL === '1') return true

  const vercelEnv = process.env.VERCEL_ENV
  if (vercelEnv === 'preview' || vercelEnv === 'production') return true

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return false

  try {
    const parsedUrl = new URL(appUrl)
    return parsedUrl.protocol === 'https:' && !isLocalHostname(parsedUrl.hostname)
  } catch {
    return false
  }
}

export function shouldEnforceHttps(context: TransportSecurityContext = {}): boolean {
  if (process.env.NODE_ENV !== 'production') return false
  if (isLocalHostname(context.hostname)) return false

  if (context.protocol) {
    return context.protocol === 'https:'
  }

  return isKnownHttpsDeployment()
}

