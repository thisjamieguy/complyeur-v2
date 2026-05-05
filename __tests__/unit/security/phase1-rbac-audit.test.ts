import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/security/mfa', () => ({
  enforceMfaForPrivilegedUser: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkServerActionRateLimit: vi.fn(),
}))

type MockProfile = {
  company_id: string | null
  role: string | null
  is_superadmin: boolean | null
  status?: 'active' | 'inactive' | 'suspended'
}

function createSupabase(options?: {
  user?: { id: string; email?: string | null } | null
  profile?: MockProfile | null
}) {
  const {
    user = { id: 'inactive-user-1', email: 'inactive@example.com' },
    profile = {
      company_id: 'company-1',
      role: 'owner',
      is_superadmin: false,
      status: 'inactive',
    },
  } = options ?? {}

  const single = vi.fn().mockResolvedValue({ data: profile, error: null })
  const eq = vi.fn(() => ({ single }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from,
  }
}

describe('Phase 1 RBAC audit regression tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks inactive users in the shared server authorization guard', async () => {
    const { enforceMfaForPrivilegedUser } = await import('@/lib/security/mfa')
    vi.mocked(enforceMfaForPrivilegedUser).mockResolvedValue({ ok: true })

    const { requirePermission } = await import('@/lib/security/authorization')
    const result = await requirePermission(createSupabase() as never, 'employees.read')

    expect(result).toEqual({
      allowed: false,
      status: 403,
      error: 'User account is inactive',
    })
  })

  it('audit logs user-management mutations', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/(dashboard)/settings/team/actions.ts'),
      'utf8'
    )

    for (const actionName of [
      'inviteTeamMember',
      'updateTeamMemberRole',
      'removeTeamMember',
      'transferOwnership',
      'revokeInvite',
    ]) {
      const actionStart = source.indexOf(`export async function ${actionName}`)
      expect(actionStart, `${actionName} should exist`).toBeGreaterThanOrEqual(0)

      const nextActionStart = source.indexOf('export async function ', actionStart + 1)
      const actionSource = source.slice(
        actionStart,
        nextActionStart === -1 ? source.length : nextActionStart
      )

      expect(
        actionSource,
        `${actionName} should write a user-management audit log record`
      ).toMatch(/audit_log|log[A-Za-z]*Audit/)
    }
  })
})
