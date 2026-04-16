# RELEASE-CHECKLIST.md — ComplyEur v1 Launch

<!--
===================================================================
AI AGENT INSTRUCTIONS — READ THIS SECTION FIRST
===================================================================

This file is the single source of truth for the ComplyEur v1 release.
Work through phases in order. Do not skip phases.

Project root: /Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur
Package manager: pnpm

RULES FOR ALL AGENTS:
1. Never mark an item [x] unless you have seen the command output
   yourself or the user has explicitly confirmed it passed.
2. Each item has a DONE CRITERIA block. An item is complete only
   when that exact criterion is satisfied — not before.
3. When running commands, always run from the project root above.
4. Database password is NEVER in this file. Prompt the user to
   supply their password before any supabase db push command.
   Passwords live in Supabase Dashboard > Settings > Database.
5. If any command fails, STOP and report the failure. Do not
   continue to the next item.
6. Automated items show a shell command to run.
   Claude-driven items show a PROMPT block — the user pastes that
   prompt into a fresh Claude Code session to carry out the step.

PROGRESS SUMMARY — update this as items complete:
  Phase 1 — Quality Gates:          [x] 6/6 done
  Phase 2 — Security Hardening:     [ ] 0/2 done
  Phase 3 — Feature Verification:   [—] SKIPPED (jobs feature deferred past v1)
  Phase 4 — E2E Tests:              [ ] 0/4 done
  Phase 5 — Staging Deploy:         [ ] 0/5 done
  Phase 6 — Production Deploy:      [ ] 0/5 done
  TOTAL:                            [ ] 6/22 done (27 − 5 jobs items)

SCOPE CHANGE (2026-04-16): Saved Jobs feature deferred past v1.
  - Uncommitted jobs work stashed at `stash@{0}`:
    "wip: saved jobs feature — defer past v1"
  - Phase 3 (all 5 items) skipped.
  - Phase 5.4: skip "/jobs" nav check and "Create a test job on staging".
  - Phase 6.4: skip "/jobs page loads".
===================================================================
-->

---

## Phase 1 — Quality Gates

> **Goal:** Confirm the branch is clean and all automated checks pass.
> Every item in this phase must be green before moving to Phase 2.

---

- [x] **1.1 — Merge feature branch to main** _(2026-04-16)_

  **Type:** Automated
  ```bash
  git checkout main && git pull origin main && git merge feature-saved-jobs --no-ff
  ```
  **Done criteria:** `git branch --show-current` outputs `main` and the merge commit appears in `git log --oneline -3`.
  **Result:** Merge commit `6dbaa23` on `main`. Uncommitted jobs feature files stashed beforehand. Preceded by `ac184f2` (e2e stability fixes) committed to the feature branch. Not yet pushed to origin — that happens in 5.1.

---

- [x] **1.2 — TypeScript compile** _(2026-04-16)_

  **Type:** Automated
  ```bash
  pnpm typecheck
  ```
  **Done criteria:** Command exits 0. No error lines in output. Warnings are acceptable; errors are not.
  **Result:** Exit 0, 0 errors. Required clearing `.next/` first — stale validator files referenced the stashed `/jobs` routes.

---

- [x] **1.3 — Lint** _(2026-04-16)_

  **Type:** Automated
  ```bash
  pnpm lint
  ```
  **Done criteria:** Command exits 0. Zero errors. The two known React Compiler warnings in `gantt-chart.tsx` and `trip-form.tsx` are pre-approved and do not block.
  **Result:** Exit 0, 0 errors. 1 warning (`lib/import/gantt/__tests__/trips.test.ts:247` — unused `trips` var in test file) — non-blocking.

---

- [x] **1.4 — Unit tests** _(2026-04-16)_

  **Type:** Automated
  ```bash
  pnpm test:unit
  ```
  **Done criteria:** All tests pass. 0 failures. (Count may be higher than 655 after the jobs branch merge — that is expected and good.)
  **Result:** 71 test files, **1258 tests passed, 0 failures**, ~12s. Jobs-feature tests excluded (stashed).

---

- [x] **1.5 — Production build** _(2026-04-16)_

  **Type:** Automated
  ```bash
  pnpm build
  ```
  **Done criteria:** Build exits 0. No TypeScript errors, no missing module errors. Next.js reports 43 or more static routes generated.
  **Result:** Exit 0, compiled successfully, **42 static pages** generated. The 43+ target assumed jobs routes (`/jobs`, `/jobs/[id]` = +2) would be included; with jobs deferred, 42 is the correct v1 baseline. Criterion adjusted accordingly.

---

- [x] **1.6 — Dependency audit** _(2026-04-16)_

  **Type:** Automated
  ```bash
  pnpm audit
  ```
  **Done criteria:** Zero vulnerabilities reported. The pre-documented exception (`eslint > @eslint/eslintrc > ajv`, devDependency, no production risk) does not count as a failure and is recorded in `PRODUCTION_READINESS_ASSESSMENT.md`.
  **Result:** `No known vulnerabilities found`. Cleaner than expected — no `ajv` finding at all this run.

---

## Phase 2 — Security Hardening

> **Goal:** Resolve the two remaining open security findings before any deploy.
> Both are small, targeted edits — they should take under 30 minutes total.

> **Note for agents:** Several items from `memory/SECURITY-AUDIT.md` that were
> listed as outstanding (C-07, H-07, H-08, H-10, H-11) are **already fixed** in
> the current codebase. Only the two items below remain genuinely open.

---

- [ ] **2.1 — H-03: Fix X-Frame-Options header**

  **Type:** Claude-driven

  **What:** Change `X-Frame-Options` from `SAMEORIGIN` to `DENY` in `next.config.ts` (line ~51). The CSP already sets `frame-ancestors 'none'` — this header must agree. Older browsers that don't parse CSP fall back to this header; `SAMEORIGIN` allows same-origin embedding while `DENY` blocks all framing unconditionally.

  **PROMPT — paste this into Claude:**
  ```
  In /Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur/next.config.ts,
  find the line that sets the X-Frame-Options response header value and change
  the string 'SAMEORIGIN' to 'DENY'. Make only this single change.

  After editing, run `pnpm build` and confirm it exits 0 before reporting done.
  Show me the diff.
  ```

  **Done criteria:** `grep -A1 "X-Frame-Options" next.config.ts` shows `value: 'DENY'` and `pnpm build` exits 0.

---

- [ ] **2.2 — H-04: Investigate style-src unsafe-inline**

  **Type:** Claude-driven

  **What:** `lib/security/csp.ts` line ~40 includes `'unsafe-inline'` in `style-src` for both dev and production. This enables CSS-based data exfiltration attacks. Tailwind v4 compiles to a static stylesheet — it does not inject inline styles at runtime. This step investigates whether any third-party library prevents removal, and either removes `unsafe-inline` from production builds or documents a specific, named blocker.

  **PROMPT — paste this into Claude:**
  ```
  I need to investigate whether 'unsafe-inline' on style-src in
  /Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur/lib/security/csp.ts
  (line ~40) can be safely removed for production builds.

  Please:
  1. Search the codebase for any runtime inline style usage: components using
     the style= prop directly, any library (CookieYes, Sentry, Radix UI,
     react-day-picker, @tanstack/react-virtual) known to inject inline styles.
  2. Check whether Tailwind v4 in this project requires inline styles at runtime.
  3. If removal is safe: update csp.ts so 'unsafe-inline' is removed from
     style-src in production (NODE_ENV === 'production') but kept in dev
     for HMR compatibility. Run `pnpm build` and `pnpm test:unit` to confirm
     nothing breaks.
  4. If removal is NOT safe: add a comment directly above line 40 in csp.ts
     documenting the specific library that blocks removal and what the minimum
     alternative would be (nonce or hash). Do not make any other change.
  Report clearly which path was taken and why.
  ```

  **Done criteria:** Either (a) production CSP no longer contains `'unsafe-inline'` in `style-src` and build + unit tests pass, OR (b) a comment is added above line 40 naming the specific blocker and the finding is added to the Post-Launch table at the bottom of this file.

---

## Phase 3 — Feature Verification (Saved Jobs)

> **Goal:** Confirm the saved-jobs feature is complete, secure, and correctly
> wired before it touches any database environment.

---

- [ ] **3.1 — Run jobs-specific unit tests**

  **Type:** Automated
  ```bash
  pnpm vitest run \
    __tests__/unit/actions/job-actions.test.ts \
    __tests__/unit/validations/job-validation.test.ts \
    lib/security/__tests__/jobs-tenant-isolation.test.ts
  ```
  **Done criteria:** All three test files pass with 0 failures.

---

- [ ] **3.2 — Verify jobs migration SQL**

  **Type:** Claude-driven

  **PROMPT — paste this into Claude:**
  ```
  Please review the jobs migration at:
  /Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur/supabase/migrations/20260414170000_create_jobs.sql

  Verify ALL of the following are present and correctly formed:
  1. RLS is enabled on public.jobs (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
  2. All four CRUD policies exist and reference get_current_user_company_id()
     AND is_current_company_active()
  3. A composite unique constraint (id, company_id) exists on jobs — this is
     required to allow the cross-table FK from trips
  4. The trips.job_id FK references (id, company_id) on jobs, not just (id),
     enforcing company-scoped referential integrity
  5. ON DELETE SET NULL is used for job_id — not CASCADE — so deleting a job
     does not delete linked trips
  6. The migration is wrapped in BEGIN / COMMIT
  7. All indexes use IF NOT EXISTS

  Report any issue found with the exact line number. Or confirm all 7 points
  are satisfied. If any issue is found, fix it, then re-verify before reporting done.
  ```

  **Done criteria:** All 7 points confirmed correct.

---

- [ ] **3.3 — Verify jobs server action tenant isolation**

  **Type:** Claude-driven

  **PROMPT — paste this into Claude:**
  ```
  Please audit the jobs server actions and database layer at:
  - /Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur/app/(dashboard)/jobs/actions.ts
    (or wherever the jobs server actions live — check app/(dashboard)/actions.ts too)
  - /Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/complyeur/lib/db/jobs.ts

  For each exported server action and each exported db function, verify:
  1. requireCompanyAccess() or requireCompanyAccessCached() is called before
     any database query
  2. Every query that reads or writes jobs or trips includes
     .eq('company_id', companyId) as an explicit filter (not relying on RLS alone)
  3. The createJobWithTrips function rolls back / deletes the job record if trip
     insertion fails (check for a cleanup/deleteJobBestEffort call in the error path)
  4. No raw database error messages are returned to the client — only user-safe strings

  Report any gaps found with exact file and line number. Or confirm all 4 points
  pass. Fix any gaps before reporting done, then re-run `pnpm test:unit` to confirm
  tests still pass.
  ```

  **Done criteria:** All 4 points confirmed, unit tests still pass.

---

- [ ] **3.4 — Smoke-test jobs UI on local dev**

  **Type:** Manual

  Start the dev server:
  ```bash
  pnpm dev
  ```
  Then open http://localhost:3000 and manually verify each item:

  - [ ] Navigate to `/jobs` — page loads without error, no 500, no blank screen
  - [ ] Empty state renders correctly when no jobs exist ("No jobs yet" or similar)
  - [ ] Job create dialog opens and all form fields render
  - [ ] Create a job with one employee — it saves and redirects to `/jobs/[id]`
  - [ ] Job detail page shows the job and the linked employee trip
  - [ ] Navigation: `/jobs` appears in the sidebar and works

  **Done criteria:** All 6 browser checks pass. No red console errors.

---

- [ ] **3.5 — Unused code check**

  **Type:** Automated
  ```bash
  pnpm knip
  ```
  **Done criteria:** No newly unused exports introduced by the jobs feature. Pre-existing knip findings that were present before this branch are not blocking. Any new finding introduced by jobs files must be resolved.

---

## Phase 4 — End-to-End Tests

> **Goal:** Confirm the full application works end-to-end including auth,
> navigation, import, and tenant isolation — on the local dev stack.
> The dev server (`pnpm dev`) must be running for these tests.

---

- [ ] **4.1 — Auth and public page tests**

  **Type:** Automated
  ```bash
  npx playwright test \
    e2e/public-smoke.spec.ts \
    e2e/auth-smoke.spec.ts \
    e2e/auth-navigation.spec.ts \
    e2e/page-coverage.spec.ts \
    e2e/import-happy-path.spec.ts
  ```
  **Done criteria:** All five specs pass. Zero failing tests.

---

- [ ] **4.2 — Multi-tenant isolation test**

  **Type:** Automated
  ```bash
  npx playwright test e2e/multi-user-isolation.spec.ts
  ```
  **Done criteria:** All tests pass. This confirms Company A cannot see Company B's data.

---

- [ ] **4.3 — Dashboard and import workflow tests**

  **Type:** Automated
  ```bash
  npx playwright test \
    e2e/dashboard-verification.spec.ts \
    e2e/import-workflow.spec.ts
  ```
  **Done criteria:** Both specs pass. Zero failures.

---

- [ ] **4.4 — Record coverage baseline**

  **Type:** Automated
  ```bash
  pnpm test:coverage
  ```
  **Done criteria:** Command completes. Record the overall coverage percentage below for future releases. No threshold enforcement — this is a baseline record only.

  **Coverage at this release: ____%**

---

## Phase 5 — Staging Deploy

> **Goal:** Ship both code and the new database migration to the staging
> environment and confirm the app works against real Supabase infrastructure
> before touching production.
>
> **Staging project ref:** `erojhukkihzxksbnjoix` (Frankfurt, EU Central)
> **Always use port 5432.** Port 6543 does not work for migrations.
> **Always dry-run first.** Never skip the dry-run step.
> **You will need the staging DB password** — get it from:
> Supabase Dashboard → Project: complyeur-staging → Settings → Database

---

- [ ] **5.1 — Push code to Vercel (triggers staging deployment)**

  **Type:** Automated
  ```bash
  git push origin main
  ```
  Then open the Vercel dashboard and confirm the deployment for `main` completed successfully.

  **Done criteria:** Vercel shows a green deployment. The preview/staging URL loads the home page without error.

---

- [ ] **5.2 — Dry-run migration against staging DB**

  **Type:** Automated (requires staging DB password)

  Replace `YOUR_STAGING_PASSWORD` with the actual password:
  ```bash
  SUPABASE_DB_PASSWORD="YOUR_STAGING_PASSWORD" supabase db push --dry-run \
    --db-url "postgresql://postgres.erojhukkihzxksbnjoix:YOUR_STAGING_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"
  ```
  **Done criteria:** Dry-run output lists `20260414170000_create_jobs.sql` as a pending migration. No unexpected migrations listed. No errors.

---

- [ ] **5.3 — Push migration to staging DB**

  **Type:** Automated (requires staging DB password)

  Replace `YOUR_STAGING_PASSWORD` with the actual password:
  ```bash
  SUPABASE_DB_PASSWORD="YOUR_STAGING_PASSWORD" supabase db push \
    --db-url "postgresql://postgres.erojhukkihzxksbnjoix:YOUR_STAGING_PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"
  ```
  **Done criteria:** Command exits 0. Output confirms the migration was applied. No errors.

---

- [ ] **5.4 — Smoke-test staging environment**

  **Type:** Manual

  Using the staging Vercel preview URL, verify each item:

  - [ ] Login with a staging test account succeeds
  - [ ] Dashboard loads and shows employee data
  - [ ] Navigate to `/jobs` — page loads, no 500 error
  - [ ] Health check returns 200: `curl https://<staging-url>/api/health`
  - [ ] Create a test job on staging — it saves and appears in the list

  **Done criteria:** All five checks pass. No console errors, no 500s.

---

- [ ] **5.5 — Verify security headers on staging**

  **Type:** Automated

  Replace `<staging-url>` with the actual staging URL:
  ```bash
  curl -s -I https://<staging-url>/ | grep -iE "X-Frame-Options|Content-Security-Policy|Strict-Transport-Security|X-Content-Type-Options"
  ```

  **Done criteria:**
  - `X-Frame-Options: DENY` is present
  - `Content-Security-Policy` header is present and does **not** contain `unsafe-eval`
  - `Strict-Transport-Security` is present
  - `X-Content-Type-Options: nosniff` is present

---

## Phase 6 — Production Deploy

> **Goal:** Ship to production. Code goes live via Vercel. Migration goes live
> on the production Supabase database.
>
> **Production project ref:** `bewydxxynjtfpytunlcq` (London, EU West)
> **Always use port 5432.** Always dry-run first. Never skip staging.
> **You will need the PRODUCTION DB password** (different from staging) — get it from:
> Supabase Dashboard → Project: complyeur-prod → Settings → Database

---

- [ ] **6.1 — Dry-run migration against production DB**

  **Type:** Automated (requires production DB password)

  Replace `YOUR_PROD_PASSWORD` with the actual password:
  ```bash
  SUPABASE_DB_PASSWORD="YOUR_PROD_PASSWORD" supabase db push --dry-run \
    --db-url "postgresql://postgres.bewydxxynjtfpytunlcq:YOUR_PROD_PASSWORD@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"
  ```
  **Done criteria:** Dry-run lists exactly the same migration as staging: `20260414170000_create_jobs.sql`. No extra migrations, no errors.

---

- [ ] **6.2 — Push migration to production DB**

  **Type:** Automated (requires production DB password)

  Replace `YOUR_PROD_PASSWORD` with the actual password:
  ```bash
  SUPABASE_DB_PASSWORD="YOUR_PROD_PASSWORD" supabase db push \
    --db-url "postgresql://postgres.bewydxxynjtfpytunlcq:YOUR_PROD_PASSWORD@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"
  ```
  **Done criteria:** Command exits 0. Migration confirmed applied. No errors.

---

- [ ] **6.3 — Confirm production Vercel deployment**

  **Type:** Manual

  Open the Vercel dashboard and confirm:
  - [ ] The production deployment for `main` is green and using the latest commit
  - [ ] Environment variables are set: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (rate limiting requires these in production)
  - [ ] `NEXT_PUBLIC_APP_URL` is set to the production domain

  **Done criteria:** All three checks pass.

---

- [ ] **6.4 — Production smoke test**

  **Type:** Manual

  On the live production URL:

  - [ ] Health check returns 200: `curl https://complyeur.com/api/health`
  - [ ] Login page loads without error
  - [ ] Login with a real account succeeds and dashboard loads
  - [ ] `/jobs` page loads (empty state expected for new accounts)
  - [ ] Open Sentry dashboard — confirm no new error spike in the first 5 minutes after deploy

  **Done criteria:** All five checks pass. Sentry shows no new unhandled exceptions.

---

- [ ] **6.5 — Tag the release**

  **Type:** Automated
  ```bash
  git tag v1.0.0 && git push origin v1.0.0
  ```
  **Done criteria:** `git tag | grep v1.0.0` outputs the tag. GitHub shows it on the Releases page.

---

## Post-Launch Deferred Items

These findings from `memory/SECURITY-AUDIT.md` are real but intentionally deferred
past v1 launch. Review them in the first sprint after launch.

| Ref | File | Issue | Effort |
|-----|------|-------|--------|
| H-09 | `settings/team/actions.ts` | MFA not enforced on team management actions | Medium |
| H-01 | `app/(dashboard)/actions.ts`, `gdpr/actions.ts` | 6 delegation-only actions lack `requireCompanyAccessCached()` at action boundary | Low |
| H-02 | `app/api/gdpr/dsar/[employeeId]/route.ts` | `employeeId` path param not validated with Zod UUID | Low |
| H-05 | `app/api/health/route.ts` | Health endpoint leaks raw `error.message` on DB failure | Low |
| M-02/M-03 | `app/admin/companies/[id]/actions.ts` | 10 admin functions return `error.message` directly to client | Low |
| M-06 | `lib/admin/auth.ts` | Admin panel email hardcoded in source — move to env var | Low |
| L-03 | `app/api/gdpr/dsar/[employeeId]/route.ts` | No rate limit on CPU-intensive DSAR export | Low |

---

*Created: 2026-04-16*
*Branch at creation: feature-saved-jobs*
*Security audit reference: memory/SECURITY-AUDIT.md (23/37 findings resolved at creation)*
*Performance audit reference: memory/PERFORMANCE-AUDIT.md (audit date: 2026-02-18)*
