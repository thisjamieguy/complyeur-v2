# Codex Prompt: Fix Phase 3 RLS Audit Blockers for ComplyEur

## Best Model
Use GPT-5.5 / Codex High Reasoning.

## Goal
Fix the confirmed Phase 3 RLS blockers found in the ComplyEur audit.

The previous Phase 3 verdict was FAIL / NO-GO due to:
1. SECURITY DEFINER RPCs exposed to authenticated users and trusting caller-supplied IDs.
2. Dashboard team snapshot action using service-role reads after only `settings.view`.
3. Need to preserve existing good RLS controls.

## Scope
Fix only the Phase 3 blockers.

Do not refactor unrelated code.
Do not weaken existing RLS.
Do not remove useful audit artifacts.
Do not make broad UI changes.

## Files / Areas To Inspect
- Supabase migrations containing:
  - get_company_user_limit
  - get_company_seat_usage
  - transfer_company_ownership
  - accept_pending_invite_for_auth_user
- app/(dashboard)/settings/team/actions.ts
- DB/RPC type definitions if present
- permission helpers
- tests covering team settings, invites, ownership transfer, and seat usage

## Required Fix 1 — Harden SECURITY DEFINER RPCs

For each SECURITY DEFINER function:
- Do not trust caller-supplied company_id or user_id.
- Bind authorization to `auth.uid()`.
- Ensure the current authenticated user belongs to the target company.
- For ownership transfer, require current user to be current owner.
- For invite acceptance, ensure invite email/token maps to the authenticated user.
- Add `SET search_path = public, auth` or the safest existing project convention.
- Revoke broad execution if inappropriate.
- Grant only the minimum required role.
- Add explicit comments explaining the security model.

Functions to harden:
- get_company_user_limit
- get_company_seat_usage
- transfer_company_ownership
- accept_pending_invite_for_auth_user

## Required Fix 2 — Fix Team Snapshot Privilege Leak

In:
app/(dashboard)/settings/team/actions.ts

Fix:
- Do not allow lower-privilege users with only `settings.view` to read owner/admin invite metadata.
- Use a stricter permission such as `team.view`, `team.manage`, `settings.manage`, or owner/admin role depending on existing permission model.
- Keep service-role/admin client usage only after strict authorization.
- If read-only team visibility is needed, limit returned fields to safe fields.
- Do not expose invite tokens or sensitive metadata.

## Required Fix 3 — Add Regression Tests

Add or update tests proving:
- User A cannot call seat/user limit RPCs for Company B.
- Non-owner cannot transfer ownership.
- Authenticated user cannot accept another user’s invite.
- Viewer/lower-role cannot read invite/team metadata through dashboard team snapshot.
- Admin/owner still can perform intended team actions.
- Existing RLS tests still pass.

## Required Fix 4 — Update Audit Evidence

Update:
- audit/03-rls-audit-report.md

Add:
- what was fixed
- files changed
- tests added
- remaining manual SQL/live Supabase verification still required
- updated verdict recommendation:
  - still WARNING if live SQL not executed
  - PASS only if tests and live verification pass

## Important Constraints
- Do not mark Phase 3 PASS unless live Supabase SQL/policy verification was actually executed.
- Static fixes + tests can move verdict from FAIL to WARNING.
- Final PASS requires running the policy dump and attack tests against staging/prod-like Supabase.
- Be adversarial.
- Prefer small safe patches.
- Explain any remaining risks.

## Deliverables
1. Code/migration fixes for hardened RPCs.
2. Fixed team action authorization.
3. Regression tests.
4. Updated audit report.
5. Final summary with:
   - files changed
   - tests run
   - remaining manual verification
   - updated verdict

