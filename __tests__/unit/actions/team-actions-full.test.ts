/**
 * Comprehensive unit tests for the multi-user/team management server actions.
 *
 * Covers: listTeamMembersAndInvites, inviteTeamMember, updateTeamMemberRole,
 *         removeTeamMember, transferOwnership, revokeInvite
 *
 * All external I/O (Supabase, auth guards, rate limiting, email dispatch) is
 * mocked so tests run purely in-process.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/services/team-invites', () => ({
  dispatchInviteEmail: vi.fn(),
  normalizeInviteEmail: vi.fn((email: string) => email.trim().toLowerCase()),
}))
vi.mock('@/lib/security/authorization', () => ({
  requireMutationPermission: vi.fn(),
  requireOwnerMutation: vi.fn(),
}))
vi.mock('@/lib/rate-limit', () => ({ checkServerActionRateLimit: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchInviteEmail } from '@/lib/services/team-invites'
import {
  requireMutationPermission,
  requireOwnerMutation,
} from '@/lib/security/authorization'
import { checkServerActionRateLimit } from '@/lib/rate-limit'
import {
  listTeamMembersAndInvites,
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  transferOwnership,
  revokeInvite,
} from '@/app/(dashboard)/settings/team/actions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates a chainable Supabase query-builder mock.
 *
 * All intermediate methods (select, update, eq, …) return `this` so chains can
 * be written naturally. `.single()` and direct `await` both resolve `result`.
 */
function makeChain(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {}
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'lte', 'gte', 'order', 'limit']) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.single = vi.fn().mockResolvedValue(result)
  // Make the chain thenable so `await chain.update(...).eq(...)` resolves.
  chain.then = (
    resolve: (v: typeof result) => unknown,
    reject?: (e: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject)
  return chain
}

/**
 * Creates a mock admin Supabase client.
 * Each call to `from()` consumes the next entry in `fromSeq`.
 */
function makeAdmin(
  fromSeq: Array<{ data?: unknown; error?: unknown }> = [],
  rpcResult: { data?: unknown; error?: unknown } = { data: null, error: null }
) {
  let i = 0
  return {
    from: vi.fn().mockImplementation(() => makeChain(fromSeq[i++] ?? { data: null, error: null })),
    rpc: vi.fn().mockResolvedValue(rpcResult),
  }
}

/** Creates a mock authenticated supabase client for `getActorContext`. */
function makeSupabaseClient(
  userResult: { data: { user: { id: string; email: string } | null }; error: unknown } = {
    data: { user: { id: 'actor-id', email: 'owner@company.com' } },
    error: null,
  },
  profileResult: { data: { company_id: string; role: string } | null; error: unknown } = {
    data: { company_id: 'company-1', role: 'owner' },
    error: null,
  }
) {
  const profileChain = makeChain(profileResult)
  return {
    auth: { getUser: vi.fn().mockResolvedValue(userResult) },
    from: vi.fn().mockReturnValue(profileChain),
  }
}

/** Successful mutation guard return shape (mirrors MutationGuardSuccess). */
const ACTOR_SUCCESS = {
  allowed: true as const,
  user: { id: 'owner-id', email: 'owner@company.com' },
  profile: { company_id: 'company-1', role: 'owner', is_superadmin: false },
  companyId: 'company-1',
  role: 'owner' as const,
}

const SEAT_OK = { active_users: 1, pending_invites: 0, limit: 5, available: 4 }
const SEAT_FULL = { active_users: 5, pending_invites: 0, limit: 5, available: 0 }

// ─── Global beforeEach ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // createClient must always return something so getPrivilegedActorContext doesn't throw.
  vi.mocked(createClient).mockResolvedValue({} as never)
  vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: true })
})

// ─────────────────────────────────────────────────────────────────────────────
// listTeamMembersAndInvites
// ─────────────────────────────────────────────────────────────────────────────

describe('listTeamMembersAndInvites', () => {
  it('returns error when user is not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseClient({ data: { user: null }, error: { message: 'Not logged in' } }) as never
    )
    const result = await listTeamMembersAndInvites()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('returns error when profile query fails', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseClient(
        { data: { user: { id: 'u1', email: 'x@x.com' } }, error: null },
        { data: null, error: { message: 'PGRST404' } }
      ) as never
    )
    const result = await listTeamMembersAndInvites()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Profile not found')
  })

  it('returns error when profile has no company_id', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseClient(
        { data: { user: { id: 'u1', email: 'x@x.com' } }, error: null },
        { data: { company_id: null as unknown as string, role: 'admin' }, error: null }
      ) as never
    )
    const result = await listTeamMembersAndInvites()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Profile not found')
  })

  it('returns error when rate limit is exceeded', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient() as never)
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: false, error: 'Too many requests' })
    vi.mocked(createAdminClient).mockReturnValue(makeAdmin() as never)
    const result = await listTeamMembersAndInvites()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Too many requests')
  })

  it('returns error when admin client cannot be created', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient() as never)
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('Service key not configured')
    })
    const result = await listTeamMembersAndInvites()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Service key not configured')
  })

  it('returns error when members DB query fails', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient() as never)
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [
          { data: null, error: null },                        // expire invites
          { data: null, error: { message: 'DB error' } },    // members
          { data: [], error: null },                          // invites
        ],
        { data: SEAT_OK, error: null }
      ) as never
    )
    const result = await listTeamMembersAndInvites()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to load team members')
  })

  it('returns error when invites DB query fails', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient() as never)
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [
          { data: null, error: null },
          { data: [], error: null },
          { data: null, error: { message: 'DB error' } },
        ],
        { data: SEAT_OK, error: null }
      ) as never
    )
    const result = await listTeamMembersAndInvites()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to load team invites')
  })

  it('returns full team snapshot on success', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient() as never)
    const member = {
      id: 'actor-id',
      email: 'owner@company.com',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'owner',
      created_at: '2025-01-01',
    }
    const invite = {
      id: 'inv-1',
      email: 'pending@company.com',
      role: 'viewer',
      status: 'pending',
      invited_by: 'actor-id',
      expires_at: '2026-06-01',
      accepted_at: null,
      created_at: '2025-12-01',
    }
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [
          { data: null, error: null },         // expire
          { data: [member], error: null },     // members
          { data: [invite], error: null },     // invites
        ],
        { data: SEAT_OK, error: null }
      ) as never
    )

    const result = await listTeamMembersAndInvites()

    expect(result.success).toBe(true)
    expect(result.data?.currentUserId).toBe('actor-id')
    expect(result.data?.currentRole).toBe('owner')
    expect(result.data?.isOwner).toBe(true)
    expect(result.data?.canManageUsers).toBe(true)
    expect(result.data?.members).toHaveLength(1)
    expect(result.data?.members[0].full_name).toBe('Jane Smith')
    expect(result.data?.invites).toHaveLength(1)
    expect(result.data?.seatUsage).toEqual(SEAT_OK)
  })

  it('derives full_name correctly for various name combinations', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient() as never)
    const members = [
      { id: 'u1', email: 'a@a.com', first_name: 'Alice', last_name: 'Bob', role: 'admin', created_at: '2025-01-01' },
      { id: 'u2', email: 'b@b.com', first_name: 'Charlie', last_name: null, role: 'manager', created_at: '2025-01-02' },
      { id: 'u3', email: 'c@c.com', first_name: null, last_name: null, role: 'viewer', created_at: '2025-01-03' },
      { id: 'u4', email: 'd@d.com', first_name: '  ', last_name: '  ', role: 'viewer', created_at: '2025-01-04' },
    ]
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [{ data: null, error: null }, { data: members, error: null }, { data: [], error: null }],
        { data: SEAT_OK, error: null }
      ) as never
    )

    const result = await listTeamMembersAndInvites()

    expect(result.success).toBe(true)
    expect(result.data?.members[0].full_name).toBe('Alice Bob')
    expect(result.data?.members[1].full_name).toBe('Charlie')
    expect(result.data?.members[2].full_name).toBeNull()
    expect(result.data?.members[3].full_name).toBeNull()
  })

  it('sets canManageUsers=false and isOwner=false for viewer role', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseClient(
        { data: { user: { id: 'viewer-id', email: 'viewer@company.com' } }, error: null },
        { data: { company_id: 'company-1', role: 'viewer' }, error: null }
      ) as never
    )
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [{ data: null, error: null }, { data: [], error: null }, { data: [], error: null }],
        { data: { active_users: 1, pending_invites: 0, limit: 5, available: 4 }, error: null }
      ) as never
    )
    const result = await listTeamMembersAndInvites()
    expect(result.success).toBe(true)
    expect(result.data?.canManageUsers).toBe(false)
    expect(result.data?.isOwner).toBe(false)
  })

  it('reflects accurate seat usage including pending invites', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient() as never)
    const seatUsage = { active_users: 3, pending_invites: 1, limit: 5, available: 1 }
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [{ data: null, error: null }, { data: [], error: null }, { data: [], error: null }],
        { data: seatUsage, error: null }
      ) as never
    )
    const result = await listTeamMembersAndInvites()
    expect(result.data?.seatUsage).toEqual(seatUsage)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// inviteTeamMember
// ─────────────────────────────────────────────────────────────────────────────

describe('inviteTeamMember', () => {
  beforeEach(() => {
    vi.mocked(requireMutationPermission).mockResolvedValue(ACTOR_SUCCESS)
  })

  // — Auth guards —

  it('rejects with 403 when caller lacks invite permission', async () => {
    vi.mocked(requireMutationPermission).mockResolvedValue({
      allowed: false,
      status: 403,
      error: 'Forbidden',
    })
    const result = await inviteTeamMember('viewer@company.com', 'viewer')
    expect(result).toEqual({ success: false, error: 'Only owners and admins can invite users' })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects with 401 when not authenticated', async () => {
    vi.mocked(requireMutationPermission).mockResolvedValue({
      allowed: false,
      status: 401,
      error: 'Unauthorized',
    })
    const result = await inviteTeamMember('user@company.com', 'manager')
    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('surfaces MFA error message when MFA is required', async () => {
    vi.mocked(requireMutationPermission).mockResolvedValue({
      allowed: false,
      status: 403,
      error: 'MFA required. Complete setup or verification to continue.',
      mfaReason: 'enroll' as const,
    })
    const result = await inviteTeamMember('user@company.com', 'manager')
    expect(result.success).toBe(false)
    expect(result.error).toBe('MFA required. Complete setup or verification to continue.')
  })

  it('rejects when action-level rate limit is exceeded', async () => {
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({
      allowed: false,
      error: 'Too many requests',
    })
    const result = await inviteTeamMember('user@company.com', 'manager')
    expect(result).toEqual({ success: false, error: 'Too many requests' })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  // — Input validation —

  it('rejects email without @ sign', async () => {
    const result = await inviteTeamMember('notanemail', 'viewer')
    expect(result).toEqual({ success: false, error: 'Please provide a valid email address' })
  })

  it('rejects empty email string', async () => {
    const result = await inviteTeamMember('', 'viewer')
    expect(result).toEqual({ success: false, error: 'Please provide a valid email address' })
  })

  it('rejects whitespace-only email', async () => {
    const result = await inviteTeamMember('   ', 'viewer')
    expect(result).toEqual({ success: false, error: 'Please provide a valid email address' })
  })

  it('rejects "owner" as an invite role', async () => {
    // Owners cannot be created via invite; only the initial company creator is owner.
    const result = await inviteTeamMember('user@company.com', 'owner' as never)
    expect(result).toEqual({ success: false, error: 'Invalid role selected' })
  })

  it('rejects self-invite (exact match after normalisation)', async () => {
    // ACTOR_SUCCESS has email owner@company.com
    const result = await inviteTeamMember('owner@company.com', 'admin')
    expect(result).toEqual({ success: false, error: 'You cannot invite yourself' })
  })

  it('rejects self-invite when email is uppercase (case-insensitive check)', async () => {
    const result = await inviteTeamMember('OWNER@COMPANY.COM', 'admin')
    expect(result).toEqual({ success: false, error: 'You cannot invite yourself' })
  })

  it('rejects self-invite when email has surrounding whitespace', async () => {
    const result = await inviteTeamMember('  owner@company.com  ', 'admin')
    expect(result).toEqual({ success: false, error: 'You cannot invite yourself' })
  })

  // — Admin client / infrastructure —

  it('returns error when admin client cannot be created', async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('No service key')
    })
    const result = await inviteTeamMember('new@company.com', 'viewer')
    expect(result.success).toBe(false)
    expect(result.error).toBe('No service key')
  })

  // — Seat limit enforcement —

  it('rejects when all seats are filled by active users', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [{ data: null, error: null }], // expire invites
        { data: SEAT_FULL, error: null }
      ) as never
    )
    const result = await inviteTeamMember('new@company.com', 'viewer')
    expect(result.success).toBe(false)
    expect(result.error).toContain('User limit reached')
    expect(result.error).toContain('5 max')
  })

  it('rejects when active + pending invites meet the seat limit', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [{ data: null, error: null }],
        { data: { active_users: 3, pending_invites: 2, limit: 5, available: 0 }, error: null }
      ) as never
    )
    const result = await inviteTeamMember('new@company.com', 'viewer')
    expect(result.success).toBe(false)
    expect(result.error).toContain('3 active + 2 pending')
  })

  it('allows invite when one seat is still available', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [
          { data: null, error: null },
          { data: { id: 'inv-1' }, error: null },
        ],
        { data: { active_users: 4, pending_invites: 0, limit: 5, available: 1 }, error: null }
      ) as never
    )
    vi.mocked(dispatchInviteEmail).mockResolvedValue({ success: true, recoverableExistingUser: false })
    const result = await inviteTeamMember('new@company.com', 'viewer')
    expect(result).toEqual({ success: true })
  })

  // — Duplicate invite —

  it('rejects duplicate invite (unique constraint code 23505)', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [
          { data: null, error: null },
          { data: null, error: { message: 'duplicate key value', code: '23505' } },
        ],
        { data: SEAT_OK, error: null }
      ) as never
    )
    const result = await inviteTeamMember('existing@company.com', 'viewer')
    expect(result).toEqual({ success: false, error: 'An active invite already exists for this email.' })
  })

  it('rejects duplicate invite when error message contains "duplicate"', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [
          { data: null, error: null },
          { data: null, error: { message: 'duplicate entry' } },
        ],
        { data: SEAT_OK, error: null }
      ) as never
    )
    const result = await inviteTeamMember('existing@company.com', 'viewer')
    expect(result).toEqual({ success: false, error: 'An active invite already exists for this email.' })
  })

  // — Email dispatch —

  it('revokes the invite record and returns error when email dispatch fails', async () => {
    const admin = makeAdmin(
      [
        { data: null, error: null },              // expire
        { data: { id: 'inv-123' }, error: null }, // insert
        { data: null, error: null },              // revoke on failure
      ],
      { data: SEAT_OK, error: null }
    )
    vi.mocked(createAdminClient).mockReturnValue(admin as never)
    vi.mocked(dispatchInviteEmail).mockResolvedValue({
      success: false,
      recoverableExistingUser: false,
      error: 'SMTP timeout',
    })

    const result = await inviteTeamMember('new@company.com', 'manager')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Failed to send invite email')
    expect(result.error).toContain('SMTP timeout')
    // Three from() calls: expire, insert, revoke
    expect(admin.from).toHaveBeenCalledTimes(3)
  })

  it('returns success with warning when invitee already has an account', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [
          { data: null, error: null },
          { data: { id: 'inv-456' }, error: null },
        ],
        { data: SEAT_OK, error: null }
      ) as never
    )
    vi.mocked(dispatchInviteEmail).mockResolvedValue({ success: true, recoverableExistingUser: true })

    const result = await inviteTeamMember('existing@company.com', 'manager')

    expect(result.success).toBe(true)
    expect(result.warning).toContain('already has an account')
    expect(result.error).toBeUndefined()
  })

  // — Happy path —

  it('returns clean success for a valid new invite', async () => {
    const admin = makeAdmin(
      [
        { data: null, error: null },
        { data: { id: 'inv-789' }, error: null },
      ],
      { data: SEAT_OK, error: null }
    )
    vi.mocked(createAdminClient).mockReturnValue(admin as never)
    vi.mocked(dispatchInviteEmail).mockResolvedValue({ success: true, recoverableExistingUser: false })

    const result = await inviteTeamMember('new@company.com', 'manager')

    expect(result).toEqual({ success: true })
  })

  it('dispatches invite to normalised (lowercase) email address', async () => {
    const admin = makeAdmin(
      [
        { data: null, error: null },
        { data: { id: 'inv-789' }, error: null },
      ],
      { data: SEAT_OK, error: null }
    )
    vi.mocked(createAdminClient).mockReturnValue(admin as never)
    vi.mocked(dispatchInviteEmail).mockResolvedValue({ success: true, recoverableExistingUser: false })

    await inviteTeamMember('  NEW@COMPANY.COM  ', 'viewer')

    expect(dispatchInviteEmail).toHaveBeenCalledWith(admin, 'new@company.com', '/settings/team')
  })

  it('accepts all valid team roles (admin, manager, viewer)', async () => {
    for (const role of ['admin', 'manager', 'viewer'] as const) {
      vi.clearAllMocks()
      vi.mocked(createClient).mockResolvedValue({} as never)
      vi.mocked(requireMutationPermission).mockResolvedValue(ACTOR_SUCCESS)
      vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: true })
      const admin = makeAdmin(
        [{ data: null, error: null }, { data: { id: `inv-${role}` }, error: null }],
        { data: SEAT_OK, error: null }
      )
      vi.mocked(createAdminClient).mockReturnValue(admin as never)
      vi.mocked(dispatchInviteEmail).mockResolvedValue({ success: true, recoverableExistingUser: false })

      const result = await inviteTeamMember('new@company.com', role)
      expect(result.success).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// updateTeamMemberRole
// ─────────────────────────────────────────────────────────────────────────────

describe('updateTeamMemberRole', () => {
  beforeEach(() => {
    vi.mocked(requireMutationPermission).mockResolvedValue(ACTOR_SUCCESS)
  })

  it('rejects with 403 when caller lacks manage permission', async () => {
    vi.mocked(requireMutationPermission).mockResolvedValue({
      allowed: false,
      status: 403,
      error: 'Forbidden',
    })
    const result = await updateTeamMemberRole('target-id', 'viewer')
    expect(result).toEqual({ success: false, error: 'Only owners and admins can update roles' })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects when rate limited', async () => {
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: false, error: 'Rate limit exceeded' })
    const result = await updateTeamMemberRole('target-id', 'viewer')
    expect(result.success).toBe(false)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects "owner" as a target role', async () => {
    const result = await updateTeamMemberRole('target-id', 'owner' as never)
    expect(result).toEqual({ success: false, error: 'Invalid role selected' })
  })

  it('rejects empty targetUserId', async () => {
    const result = await updateTeamMemberRole('', 'viewer')
    expect(result).toEqual({ success: false, error: 'Target user is required' })
  })

  it('rejects self role change', async () => {
    // ACTOR_SUCCESS userId is 'owner-id'
    const result = await updateTeamMemberRole('owner-id', 'admin')
    expect(result).toEqual({ success: false, error: 'You cannot change your own role' })
  })

  it('returns error when target user is not found', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin([{ data: null, error: { message: 'Not found' } }]) as never
    )
    const result = await updateTeamMemberRole('ghost-id', 'viewer')
    expect(result).toEqual({ success: false, error: 'User not found in your company' })
  })

  it('returns error when target user belongs to a different company', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin([{ data: { id: 'target', company_id: 'other-company', role: 'viewer' }, error: null }]) as never
    )
    const result = await updateTeamMemberRole('target', 'admin')
    expect(result).toEqual({ success: false, error: 'User not found in your company' })
  })

  it('rejects changing the owner role (must use transfer ownership instead)', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin([{ data: { id: 'target', company_id: 'company-1', role: 'owner' }, error: null }]) as never
    )
    const result = await updateTeamMemberRole('target', 'admin')
    expect(result).toEqual({
      success: false,
      error: 'Owner role cannot be changed here. Use transfer ownership.',
    })
  })

  it('returns error when DB update fails', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin([
        { data: { id: 'target', company_id: 'company-1', role: 'viewer' }, error: null },
        { data: null, error: { message: 'UPDATE failed' } },
      ]) as never
    )
    const result = await updateTeamMemberRole('target', 'admin')
    expect(result).toEqual({ success: false, error: 'Failed to update role' })
  })

  it('returns success when role is updated', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin([
        { data: { id: 'target', company_id: 'company-1', role: 'viewer' }, error: null },
        { data: null, error: null },
      ]) as never
    )
    const result = await updateTeamMemberRole('target', 'manager')
    expect(result).toEqual({ success: true })
  })

  it('accepts all valid non-owner roles', async () => {
    for (const role of ['admin', 'manager', 'viewer'] as const) {
      vi.clearAllMocks()
      vi.mocked(createClient).mockResolvedValue({} as never)
      vi.mocked(requireMutationPermission).mockResolvedValue(ACTOR_SUCCESS)
      vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: true })
      vi.mocked(createAdminClient).mockReturnValue(
        makeAdmin([
          { data: { id: 'target', company_id: 'company-1', role: 'viewer' }, error: null },
          { data: null, error: null },
        ]) as never
      )
      const result = await updateTeamMemberRole('target', role)
      expect(result.success, `role=${role}`).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// removeTeamMember
// ─────────────────────────────────────────────────────────────────────────────

describe('removeTeamMember', () => {
  beforeEach(() => {
    vi.mocked(requireMutationPermission).mockResolvedValue(ACTOR_SUCCESS)
  })

  it('rejects with 403 when caller lacks manage permission', async () => {
    vi.mocked(requireMutationPermission).mockResolvedValue({
      allowed: false,
      status: 403,
      error: 'Forbidden',
    })
    const result = await removeTeamMember('target-id')
    expect(result).toEqual({ success: false, error: 'Only owners and admins can remove users' })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects when rate limited', async () => {
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: false, error: 'Rate limit exceeded' })
    const result = await removeTeamMember('target-id')
    expect(result.success).toBe(false)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects empty targetUserId', async () => {
    const result = await removeTeamMember('')
    expect(result).toEqual({ success: false, error: 'Target user is required' })
  })

  it('rejects self removal', async () => {
    // ACTOR_SUCCESS userId is 'owner-id'
    const result = await removeTeamMember('owner-id')
    expect(result).toEqual({ success: false, error: 'You cannot remove yourself' })
  })

  it('returns error when target user is not found', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin([{ data: null, error: { message: 'Not found' } }]) as never
    )
    const result = await removeTeamMember('ghost-id')
    expect(result).toEqual({ success: false, error: 'User not found in your company' })
  })

  it('returns error when target user belongs to a different company', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin([
        { data: { id: 'other', company_id: 'rival-company', role: 'manager', email: null }, error: null },
      ]) as never
    )
    const result = await removeTeamMember('other')
    expect(result).toEqual({ success: false, error: 'User not found in your company' })
  })

  it('rejects removing the company owner', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin([
        { data: { id: 'the-owner', company_id: 'company-1', role: 'owner', email: 'boss@company.com' }, error: null },
      ]) as never
    )
    const result = await removeTeamMember('the-owner')
    expect(result).toEqual({ success: false, error: 'Owner cannot be removed. Transfer ownership first.' })
  })

  it('returns error when DB delete fails', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin([
        { data: { id: 'target', company_id: 'company-1', role: 'manager', email: null }, error: null },
        { data: null, error: { message: 'FK constraint violation' } },
      ]) as never
    )
    const result = await removeTeamMember('target')
    expect(result).toEqual({ success: false, error: 'Failed to remove user' })
  })

  it('returns success and revokes pending invites when removed member has an email', async () => {
    const admin = makeAdmin([
      { data: { id: 'target', company_id: 'company-1', role: 'manager', email: 'manager@company.com' }, error: null },
      { data: null, error: null }, // delete profile
      { data: null, error: null }, // revoke pending invites
    ])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const result = await removeTeamMember('target')

    expect(result).toEqual({ success: true })
    // from() called three times: lookup, delete, revoke invites
    expect(admin.from).toHaveBeenCalledTimes(3)
  })

  it('returns success without attempting invite revocation when member has no email', async () => {
    const admin = makeAdmin([
      { data: { id: 'target', company_id: 'company-1', role: 'viewer', email: null }, error: null },
      { data: null, error: null }, // delete
    ])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const result = await removeTeamMember('target')

    expect(result).toEqual({ success: true })
    // Only two from() calls when no email
    expect(admin.from).toHaveBeenCalledTimes(2)
  })

  it('revokes invites scoped to the correct company email', async () => {
    const admin = makeAdmin([
      { data: { id: 'target', company_id: 'company-1', role: 'admin', email: 'ADMIN@COMPANY.COM' }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    await removeTeamMember('target')

    // The third from() call should scope by company_id and normalised email
    const revokeChain = (admin.from as ReturnType<typeof vi.fn>).mock.results[2].value
    expect(revokeChain.eq).toHaveBeenCalledWith('company_id', 'company-1')
    expect(revokeChain.eq).toHaveBeenCalledWith('email', 'admin@company.com')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// transferOwnership
// ─────────────────────────────────────────────────────────────────────────────

describe('transferOwnership', () => {
  beforeEach(() => {
    vi.mocked(requireOwnerMutation).mockResolvedValue(ACTOR_SUCCESS)
  })

  it('rejects with 403 when caller is not the owner', async () => {
    vi.mocked(requireOwnerMutation).mockResolvedValue({
      allowed: false,
      status: 403,
      error: 'Forbidden',
    })
    const result = await transferOwnership('new-owner-id')
    expect(result).toEqual({ success: false, error: 'Only the current owner can transfer ownership' })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects with 401 when not authenticated', async () => {
    vi.mocked(requireOwnerMutation).mockResolvedValue({
      allowed: false,
      status: 401,
      error: 'Unauthorized',
    })
    const result = await transferOwnership('new-owner-id')
    expect(result).toEqual({ success: false, error: 'Not authenticated' })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects when rate limited', async () => {
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: false, error: 'Rate limit exceeded' })
    const result = await transferOwnership('new-owner-id')
    expect(result.success).toBe(false)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects empty targetUserId', async () => {
    const result = await transferOwnership('')
    expect(result).toEqual({ success: false, error: 'Target user is required' })
  })

  it('rejects self-transfer (actor is already owner)', async () => {
    // ACTOR_SUCCESS userId is 'owner-id'
    const result = await transferOwnership('owner-id')
    expect(result).toEqual({ success: false, error: 'You already own this company' })
  })

  it('returns error when target user is not found', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin([{ data: null, error: { message: 'Not found' } }]) as never
    )
    const result = await transferOwnership('ghost-id')
    expect(result).toEqual({ success: false, error: 'Target user not found in your company' })
  })

  it('returns error when target user belongs to a different company', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin([{ data: { id: 'other', company_id: 'rival-company' }, error: null }]) as never
    )
    const result = await transferOwnership('other')
    expect(result).toEqual({ success: false, error: 'Target user not found in your company' })
  })

  it('returns error when the RPC call fails', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [{ data: { id: 'new-owner', company_id: 'company-1' }, error: null }],
        { data: null, error: { message: 'Unique constraint violated' } }
      ) as never
    )
    const result = await transferOwnership('new-owner')
    expect(result.success).toBe(false)
    expect(result.error).toContain('Failed to transfer ownership')
    expect(result.error).toContain('Unique constraint violated')
  })

  it('returns success when RPC succeeds', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin(
        [{ data: { id: 'new-owner', company_id: 'company-1' }, error: null }],
        { data: true, error: null }
      ) as never
    )
    const result = await transferOwnership('new-owner')
    expect(result).toEqual({ success: true })
  })

  it('calls the RPC with correct company, current owner, and new owner IDs', async () => {
    const admin = makeAdmin(
      [{ data: { id: 'new-owner', company_id: 'company-1' }, error: null }],
      { data: true, error: null }
    )
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    await transferOwnership('new-owner')

    expect(admin.rpc).toHaveBeenCalledWith('transfer_company_ownership', {
      p_company_id: 'company-1',
      p_current_owner_id: 'owner-id',
      p_new_owner_id: 'new-owner',
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// revokeInvite
// ─────────────────────────────────────────────────────────────────────────────

describe('revokeInvite', () => {
  beforeEach(() => {
    vi.mocked(requireMutationPermission).mockResolvedValue(ACTOR_SUCCESS)
  })

  it('rejects with 403 when caller lacks manage permission', async () => {
    vi.mocked(requireMutationPermission).mockResolvedValue({
      allowed: false,
      status: 403,
      error: 'Forbidden',
    })
    const result = await revokeInvite('inv-1')
    expect(result).toEqual({ success: false, error: 'Only owners and admins can revoke invites' })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects when rate limited', async () => {
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: false, error: 'Rate limit exceeded' })
    const result = await revokeInvite('inv-1')
    expect(result.success).toBe(false)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects empty inviteId', async () => {
    const result = await revokeInvite('')
    expect(result).toEqual({ success: false, error: 'Invite ID is required' })
  })

  it('returns error when DB update fails', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin([{ data: null, error: { message: 'DB write failed' } }]) as never
    )
    const result = await revokeInvite('inv-1')
    expect(result).toEqual({ success: false, error: 'Failed to revoke invite' })
  })

  it('returns success when invite is revoked', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdmin([{ data: null, error: null }]) as never
    )
    const result = await revokeInvite('inv-1')
    expect(result).toEqual({ success: true })
  })

  it('scopes the revoke to the current company (cross-tenant protection)', async () => {
    const admin = makeAdmin([{ data: null, error: null }])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    await revokeInvite('inv-cross-tenant')

    // Must filter by company_id to prevent revoking another company's invite
    const chain = (admin.from as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(chain.eq).toHaveBeenCalledWith('company_id', 'company-1')
    expect(chain.eq).toHaveBeenCalledWith('id', 'inv-cross-tenant')
  })

  it('only revokes pending invites (not already accepted or expired)', async () => {
    const admin = makeAdmin([{ data: null, error: null }])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    await revokeInvite('inv-1')

    const chain = (admin.from as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(chain.eq).toHaveBeenCalledWith('status', 'pending')
  })
})
