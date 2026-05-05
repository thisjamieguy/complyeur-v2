import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260505162000_harden_phase3_rls_rpc_boundaries.sql'
)
const migrationSource = readFileSync(migrationPath, 'utf8')

describe('Phase 3 RLS RPC hardening regression tests', () => {
  it('binds seat limit RPCs to auth.uid and the caller company', () => {
    expect(migrationSource).toContain('authenticated_user_id := auth.uid();')
    expect(migrationSource).toContain('authenticated_company_id := public.get_current_user_company_id();')
    expect(migrationSource).toContain('Cross-company seat limit access denied')
    expect(migrationSource).toContain('Cross-company seat usage access denied')
    expect(migrationSource).toContain(
      'REVOKE ALL ON FUNCTION public.get_company_user_limit(uuid) FROM PUBLIC, anon, authenticated, service_role;'
    )
    expect(migrationSource).toContain(
      'REVOKE ALL ON FUNCTION public.get_company_seat_usage(uuid) FROM PUBLIC, anon, authenticated, service_role;'
    )
    expect(migrationSource).toContain(
      'GRANT EXECUTE ON FUNCTION public.get_company_user_limit(uuid) TO authenticated;'
    )
    expect(migrationSource).toContain(
      'GRANT EXECUTE ON FUNCTION public.get_company_seat_usage(uuid) TO authenticated;'
    )
  })

  it('requires invite acceptance RPC callers to match auth user identity and email', () => {
    expect(migrationSource).toContain('caller_user_id := auth.uid();')
    expect(migrationSource).toContain('Invite acceptance user mismatch')
    expect(migrationSource).toContain('FROM auth.users au')
    expect(migrationSource).toContain('Invite acceptance email mismatch')
    expect(migrationSource).toContain("session_user NOT IN ('postgres', 'supabase_auth_admin')")
  })

  it('requires the authenticated owner for ownership transfer', () => {
    expect(migrationSource).toContain('Ownership transfer caller mismatch')
    expect(migrationSource).toContain('Only the current owner can transfer ownership')
    expect(migrationSource).toContain('Cross-company ownership transfer denied')
    expect(migrationSource).toContain(
      'GRANT EXECUTE ON FUNCTION public.transfer_company_ownership(uuid, uuid, uuid) TO authenticated;'
    )
  })

  it('routes team seat usage and ownership transfer through the authenticated client', () => {
    const teamActionsSource = readFileSync(
      join(process.cwd(), 'app/(dashboard)/settings/team/actions.ts'),
      'utf8'
    )

    expect(teamActionsSource).toContain('getActorContext(PERMISSIONS.USERS_VIEW)')
    expect(teamActionsSource).toContain("actor.supabase.rpc('transfer_company_ownership'")
    expect(teamActionsSource).toContain("supabase.rpc('get_company_seat_usage'")
  })

  it('uses the authenticated client for billing seat usage enforcement', () => {
    const billingSource = readFileSync(
      join(process.cwd(), 'lib/billing/entitlement-middleware.ts'),
      'utf8'
    )

    expect(billingSource).toContain("supabase.rpc(\n      'get_company_seat_usage'")
    expect(billingSource).not.toContain('createAdminClient')
  })
})
