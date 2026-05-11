# Phase 3 Tenant Attack Test Plan

## Goal
Prove that an authenticated user from Company A cannot read, insert, update, delete, or administratively mutate Company B data, and that lower-privilege roles cannot bypass owner/admin restrictions inside their own company.

## Preconditions
- Create at least two companies: `company_a` and `company_b`.
- Create four users:
  - `owner_a`
  - `viewer_a`
  - `owner_b`
  - `viewer_b`
- Seed each company with at least:
  - 1 employee
  - 1 trip
  - 1 alert
  - 1 pending `company_user_invites` row
- Capture the UUIDs for:
  - both companies
  - both owners
  - one viewer
  - one employee/trip/alert per company

## Tests

### 1. User A reads User B employees
- Actor: `owner_a`
- Method: Supabase client with authenticated session
- Action: `select * from employees where company_id = company_b`
- Expected: zero rows / RLS denial

### 2. User A reads User B trips
- Actor: `owner_a`
- Method: Supabase client with authenticated session
- Action: `select * from trips where company_id = company_b`
- Expected: zero rows / RLS denial

### 3. User A updates User B trip
- Actor: `owner_a`
- Method: Supabase client with authenticated session
- Action: update `trips` row owned by `company_b`
- Expected: zero rows updated / RLS denial

### 4. User A deletes User B alert
- Actor: `owner_a`
- Method: Supabase client with authenticated session
- Action: delete `alerts` row owned by `company_b`
- Expected: zero rows deleted / RLS denial

### 5. User A inserts row with another company_id
- Actor: `owner_a`
- Method: Supabase client with authenticated session
- Action:
  - insert `employees` with `company_id = company_b`
  - insert `trips` with `company_id = company_b`
- Expected: insert rejected by `WITH CHECK` policy

### 6. User A calls API with another company_id
- Actor: `owner_a`
- Method: replay any user-facing route/action that accepts a company identifier or resource id
- Action: substitute `company_b` identifiers into requests
- Expected: request rejected or returns no data

### 7. Viewer role attempts admin actions
- Actor: `viewer_a`
- Method: authenticated session
- Action:
  - call team-management UI/server action paths
  - attempt to revoke invites, change roles, transfer ownership
- Expected: all denied

### 8. Direct RPC attack: cross-tenant seat usage read
- Actor: `owner_a`
- Method: direct RPC call from authenticated session
- Action: `rpc('get_company_seat_usage', { p_company_id: company_b })`
- Expected: permission denied or empty result
- Current static expectation: likely vulnerable

### 9. Direct RPC attack: cross-tenant/user-supplied seat limit read
- Actor: `owner_a`
- Method: direct RPC call from authenticated session
- Action: `rpc('get_company_user_limit', { p_company_id: company_b })`
- Expected: permission denied or empty result
- Current static expectation: likely vulnerable

### 10. Direct RPC attack: ownership transfer by non-owner
- Actor: `viewer_a`
- Method: direct RPC call from authenticated session
- Action: `rpc('transfer_company_ownership', { p_company_id: company_a, p_current_owner_id: owner_a, p_new_owner_id: viewer_a })`
- Expected: permission denied
- Current static expectation: likely vulnerable

### 11. Direct RPC attack: invite-accept helper misuse
- Actor: authenticated non-admin user
- Method: direct RPC call from authenticated session
- Action: `rpc('accept_pending_invite_for_auth_user', { p_user_id: <controlled uuid>, p_user_email: <invite email> })`
- Expected: permission denied
- Current static expectation: should not be callable outside auth trigger

### 12. Dashboard action bypass check for invite visibility
- Actor: `viewer_a`
- Method: invoke the team members/invites server action from the dashboard
- Action: request team snapshot data
- Expected: no pending invites or seat-usage admin metadata returned
- Current static expectation: likely vulnerable

## Evidence To Capture
- SQL result sets
- HTTP responses
- RPC request/response payloads
- Supabase audit logs if available
- Screenshots of any successful unauthorized read/write

## Pass Criteria
- Every cross-tenant read returns zero rows or an authorization error.
- Every cross-tenant write/delete attempt fails.
- Direct RPC calls that accept company/user ids cannot operate on arbitrary targets.
- Viewer/manager roles cannot read invite-only/admin-only data or perform owner/admin mutations.
