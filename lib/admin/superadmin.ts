const FALLBACK_SUPERADMIN_EMAILS = ['james.walsh23@outlook.com', 'complyeur@gmail.com'] as const

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

function parseConfiguredSuperAdminEmails(): string[] {
  const configured = process.env.SUPERADMIN_EMAILS

  if (!configured) {
    return [...FALLBACK_SUPERADMIN_EMAILS]
  }

  const configuredEmails = configured
    .split(',')
    .map(email => normalizeEmail(email))
    .filter(Boolean)

  if (configuredEmails.length === 0) {
    return [...FALLBACK_SUPERADMIN_EMAILS]
  }

  return Array.from(new Set([...configuredEmails, ...FALLBACK_SUPERADMIN_EMAILS]))
}

const SUPERADMIN_EMAILS = parseConfiguredSuperAdminEmails()

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return SUPERADMIN_EMAILS.includes(normalizeEmail(email))
}
