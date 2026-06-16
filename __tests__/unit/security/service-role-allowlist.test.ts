import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SKIP_DIRS = new Set([
  '.git',
  '.next',
  '.pnpm-store',
  '.gstack',
  'node_modules',
  'coverage',
  'test-results',
])
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx'])

const APPROVED_CREATE_ADMIN_CLIENT_CALLEES = new Set([
  'app/(dashboard)/settings/team/actions.ts',
  'app/admin/activity/page.tsx',
  'app/admin/companies/[id]/actions.ts',
  'app/admin/companies/[id]/notes-actions.ts',
  'app/admin/companies/[id]/page.tsx',
  'app/admin/companies/page.tsx',
  'app/admin/feedback/page.tsx',
  'app/admin/metrics/page.tsx',
  'app/admin/page.tsx',
  'app/admin/tiers/actions.ts',
  'app/admin/tiers/page.tsx',
  'app/api/cron/beta-monitoring/route.ts',
  'app/api/billing/checkout/route.ts',
  'app/api/billing/webhook/route.ts',
  'app/api/cron/billing/route.ts',
  'app/api/cron/onboarding/route.ts',
  'app/api/internal/health/route.ts',
  'app/unsubscribe/page.tsx',
  'lib/actions/bulk-delete.ts',
  'lib/admin/audit.ts',
  'lib/db/alerts.ts',
  'lib/gdpr/audit.ts',
  'lib/gdpr/export-storage.ts',
  'lib/gdpr/retention.ts',
  'lib/security/team-audit.ts',
])

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue

    const fullPath = path.join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      walk(fullPath, files)
      continue
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry))) {
      files.push(fullPath)
    }
  }

  return files
}

describe('service-role boundary allowlist', () => {
  it('keeps createAdminClient() usage explicit and reviewed', () => {
    const callSites = walk(ROOT)
      .filter((file) => {
        const relative = path.relative(ROOT, file)
        if (relative === 'lib/supabase/admin.ts') return false
        if (relative.startsWith('__tests__/')) return false
        if (relative.startsWith('e2e/')) return false
        if (relative.startsWith('scripts/')) return false

        return readFileSync(file, 'utf8').includes('createAdminClient(')
      })
      .map((file) => path.relative(ROOT, file).replaceAll(path.sep, '/'))
      .sort()

    expect(callSites).toEqual([...APPROVED_CREATE_ADMIN_CLIENT_CALLEES].sort())
  })
})
