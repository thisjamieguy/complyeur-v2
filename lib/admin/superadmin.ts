function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

function parseConfiguredSuperAdminEmails(): string[] {
  const configured = process.env.SUPERADMIN_EMAILS
  if (!configured) return [] // fail-closed: no env var = no superadmins
  return configured
    .split(',')
    .map(email => normalizeEmail(email))
    .filter(Boolean)
}

const SUPERADMIN_EMAILS = parseConfiguredSuperAdminEmails()

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return SUPERADMIN_EMAILS.includes(normalizeEmail(email))
}
