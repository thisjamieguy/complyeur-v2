# ComplyEur Security Audit Workflow (v1.0)

## Purpose
This is the official, repeatable security audit process for ComplyEur.

Run this before:
- Private beta
- Public launch
- Major feature releases

---

## PHASE 0 — Baseline Snapshot

### Steps
- Create audit branch:
  git checkout -b audit/security-baseline
- Record:
  - commit hash
  - environment (local/staging/prod)
  - Supabase project
  - test users

### Pass Criteria
- Audit can be reproduced exactly

---

## PHASE 1 — Dependencies

### Commands
pnpm audit
pnpm outdated
pnpm lint
pnpm typecheck
pnpm test

### Pass
- No unresolved critical/high vulnerabilities

---

## PHASE 2 — Secrets

### Check
- No service_role in client
- No secrets in repo
- Env separation correct

### Command
rg "SECRET|SUPABASE|STRIPE" .

---

## PHASE 3 — RLS (CRITICAL)

### SQL
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname='public';

SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname='public';

### Tests
- User A cannot access User B data

### Pass
- Zero cross-tenant access

---

## PHASE 4 — Auth

### Tests
- Protected routes enforced
- Session expiry works
- Rate limiting works

---

## PHASE 5 — RBAC

### Matrix
Test all roles vs actions

Pass:
- Server enforces permissions

---

## PHASE 6 — Validation

### Test
- Invalid inputs
- CSV injection
- Script injection

---

## PHASE 7 — Algorithm (CRITICAL)

Test:
- 90/180 rolling window
- Edge cases
- Leap year

Pass:
- Matches known correct outputs

---

## PHASE 8 — Audit Logs

### Check
- All actions logged
- Logs immutable
- Hash chain valid

---

## PHASE 9 — GDPR

### Test
- Export data
- Delete account
- Consent handling

---

## PHASE 10 — Import/Export

### Check
- No CSV injection
- Correct tenant scoping

---

## PHASE 11 — API Review

Ensure every endpoint has:
- Auth
- Company scope
- Permission check

---

## PHASE 12 — AI Audit

Use AI as assistant only.
Verify all findings manually.

---

## PHASE 13 — Browser Security

Check:
- No secrets in frontend
- No debug routes

---

## PHASE 14 — GO / NO-GO

### NO GO if:
- RLS broken
- Auth bypass possible
- Algorithm incorrect
- Data leak possible

### GO if:
- All critical tests pass
- Evidence documented

---

## Folder Structure

/docs/security/
  security-audit-workflow-v1.md
/audit/
  00-baseline.md
  01-dependencies.md
  ...

---

## Final Rule

This is NOT optional.
If this fails, do not launch.
