# ComplyEur — Pre-Launch Readiness Review & Rating

**Review date:** 2026-06-21
**Reviewer:** Claude Code (Opus) — read-only audit, no code changed
**Branch reviewed:** `claude/pre-launch-readiness-review-e62eic`
**Baseline commit:** `10938a0`
**Scope:** Full public release readiness (not just private beta)

---

## How to read this document

This is a **scorecard**, not a to-do rewrite. It rates every area you need
for a public launch, tells you where you actually are today, and separates
two very different finish lines:

- 🟢 **Private beta** — invited testers, expectations set, you watching closely
- 🔵 **Public full release** — anyone can sign up and pay, no hand-holding

You are **much further along than most solo founders at this stage.** The
codebase is genuinely well-engineered and the documentation discipline is
exceptional. What's left is mostly **external verification and operational
proof** (DNS, dashboards, restore tests, legal sign-off) — not code.

**Rating key:**

| Score | Meaning |
|-------|---------|
| 🟢 9–10 | Ready. Done and verified. |
| 🟢 7–8 | Ready for beta; minor polish before public. |
| 🟡 5–6 | Solid foundation, but unfinished verification or known gaps. |
| 🟠 3–4 | Real work remaining before launch. |
| 🔴 0–2 | Blocker. Must be done before letting real users in. |

---

## Overall Verdict

| Question | Answer |
|----------|--------|
| **Ready for private beta?** | 🟢 **Yes — conditional GO.** Close the 3–4 manual blockers below (email, password reset, recovery test, non-founder journey) and you can invite testers. |
| **Ready for public full release?** | 🟠 **Not yet.** Billing finalization, DNS/email auth, legal sign-off, and disaster-recovery proof are the gating items. Estimate: **2–4 focused weeks** of mostly non-coding work. |
| **Overall readiness score** | **7.0 / 10** for beta · **5.5 / 10** for public release |

The gap between these two numbers is almost entirely **"prove it works in
production"** work, not "build more features" work. That's a good place to be.

---

## Scorecard at a glance

| # | Area | Beta | Public | One-line status |
|---|------|------|--------|-----------------|
| 1 | Core product & compliance engine | 🟢 9 | 🟢 9 | Strong; well-tested calculation engine |
| 2 | Code quality & testing | 🟢 9 | 🟢 8 | ~1,700 unit + integration tests, clean typecheck/lint |
| 3 | Application security | 🟢 8 | 🟢 8 | Multiple audits done & remediated; RLS solid |
| 4 | Authentication & accounts | 🟡 6 | 🟡 6 | Code solid; email deliverability unproven |
| 5 | Database & data integrity | 🟢 8 | 🟡 6 | RLS + migrations good; backups/PITR/restore unverified |
| 6 | Payments & billing (Stripe) | 🟠 4 | 🔴 2 | Placeholder price IDs; lifecycle evidence missing |
| 7 | Infrastructure & deploy | 🟡 6 | 🟡 6 | CI strong; prod env/domain/SSL need dashboard proof |
| 8 | Monitoring & alerting | 🟡 6 | 🟡 5 | Sentry + uptime wired; alert routing unproven |
| 9 | Email & DNS | 🟠 4 | 🔴 3 | SPF/DKIM/DMARC + multi-provider delivery pending |
| 10 | Legal, GDPR & privacy | 🟡 6 | 🟠 4 | Policies live; DPA draft, ICO reg, workplan P0s open |
| 11 | UI/UX & accessibility | 🟢 8 | 🟢 7 | A11y/mobile E2E passing; real-device checks pending |
| 12 | Performance | 🟢 7 | 🟡 6 | Perf audit done; deployed Lighthouse not captured |
| 13 | Beta/launch operations | 🟡 6 | 🟡 5 | Excellent docs; owners & metrics need assigning |
| 14 | Business & insurance | 🟠 3 | 🟠 3 | Company/insurance/pricing decisions outside repo |

---

## Detailed Ratings

### 1. Core Product & Compliance Engine — 🟢 9/10

**What's good:**
- Dedicated `lib/compliance/` calculation engine with its own test suite.
- The 90/180 rule edge cases are documented and respected (Ireland/Cyprus
  excluded, Romania/Bulgaria from 2025-01-01, microstates included).
- `date-fns` / ISO-string discipline avoids the timezone class of bugs that
  CLAUDE.md flags as high-priority.
- Recorded "compliance-focused suite" passing (552 / 482 tests in different runs).

**Before public release:**
- Keep a documented "oracle" reference table of hand-calculated cases (some
  exists in `docs/CALCULATION_LOGIC.md`) so you can defend the math to a customer.

---

### 2. Code Quality & Testing — 🟢 9/10 (beta) · 8/10 (public)

**What's good:**
- ~1,500–1,700 unit tests, ~187 integration tests, plus Playwright E2E
  (auth, a11y, mobile, multi-tenant isolation, import).
- Typecheck and lint recorded clean; only **3 TODO/FIXME** markers in the
  whole `.ts/.tsx` tree — exceptionally tidy.
- TypeScript strict, Zod validation layer, generated Supabase types.

**Gaps for public:**
- The source-of-truth doc notes some E2E runs **skipped** in CI because local
  Supabase / auth setup was unavailable (multi-user + import). Get those
  running green in CI so isolation is continuously proven, not just spot-checked.

---

### 3. Application Security — 🟢 8/10

**What's good (verified in current code):**
- Earlier critical findings have been remediated:
  - CSP no longer ships `unsafe-eval` in production (`lib/security/csp.ts`);
    it's dev-only.
  - `X-Frame-Options: DENY` (was `SAMEORIGIN`) in `next.config.ts`.
  - Full security header set: HSTS, COEP/COOP/CORP, Permissions-Policy,
    nosniff, referrer-policy.
  - Team-management actions now rate-limited and behind a permission layer
    (`requireOwnerMutation` / `requireMutationPermission`).
- RLS on all tables with an `rls_auto_enable` event trigger enforcing it.
- Stripe webhook signature verification, open-redirect validation, file-upload
  allowlisting all confirmed in prior audits.
- Multiple independent security passes exist: `memory/SECURITY-AUDIT.md`,
  `docs/security/` (pentest report, multi-tenant isolation audit + retest,
  authz follow-up, minimum-security-bar progress).

**Before public release:**
- Run a **fresh RLS attack test** against a production-like environment and
  file the evidence (flagged open in the source-of-truth doc).
- Capture CodeQL + dependency-scanning **workflow run evidence** (the workflow
  files exist: `.github/workflows/codeql.yml`, `security.yml`).

> Note: `memory/SECURITY-AUDIT.md` is a **historical snapshot** (Feb 2026).
> Several "open" items in it are already fixed in current code — don't be
> alarmed by it; trust current code + the newer `docs/security/` reports.

---

### 4. Authentication & Account Management — 🟡 6/10

**What's good:**
- Supabase Auth, MFA flows, password reset, OAuth callback all built.
- Auth E2E baseline recorded as 49 passing.
- Rate limiting added to login/signup/forgot/reset/OAuth.

**Why not higher:**
- **Email deliverability is unproven** across Gmail / Outlook / corporate
  inboxes — only one path verified. This is the #1 beta blocker.
- **Password reset link behaviour** (delivery, single-use, expiry, post-reset
  session invalidation) needs end-to-end evidence in the beta environment.

---

### 5. Database & Data Integrity — 🟢 8/10 (beta) · 🟡 6/10 (public)

**What's good:**
- Migration workflow is disciplined (`docs/architecture/MIGRATION_WORKFLOW.md`,
  production safety rails, environment separation London/Frankfurt).
- RLS strategy documented in an ADR; multi-tenant isolation audited + retested.

**Gaps for public:**
- **Backups / PITR / a tested restore** are not yet verified from the Supabase
  dashboard. A backup you have never restored is not a backup. This is the
  single most important pre-public infra task.

---

### 6. Payments & Billing (Stripe) — 🟠 4/10 (beta) · 🔴 2/10 (public)

**This is your biggest gap for a paid public launch.**

- **Placeholder Stripe price IDs** still need to be replaced with real
  products/prices and synced into the `tiers` table, then audited (scripts
  already exist: `billing:prices:sync`, `billing:prices:audit`).
- **Webhook endpoint** for the deployed URL needs configuring/validating.
- **Lifecycle evidence missing:** webhook replay, out-of-order events,
  failed payment, cancellation, idempotency, and reconciliation.

For a **free private beta** this can be deferred (mark billing as not-live).
For **any paid release** it is a hard blocker. The webhook signature handling
and "Stripe-as-source-of-truth" architecture are sound — it's the finalization
and proof that's missing, not the design.

---

### 7. Infrastructure & Deploy — 🟡 6/10

**What's good:**
- CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit, integration,
  build, plus E2E baseline and tenant-isolation jobs with a real local Supabase.
- Actions pinned to commit SHAs (good supply-chain hygiene).
- Rollback path documented (`docs/RUNBOOK.md`).

**Before public release (mostly dashboard verification):**
- Confirm **production env vars, custom domain, SSL** in Vercel and capture proof.
- Set **Vercel spending limits** and confirm Supabase plan sizing.
- Confirm **branch protection on `main`** (baseline noted complete; verify it
  matches `docs/BRANCH_PROTECTION_BASELINE.md`).

---

### 8. Monitoring & Alerting — 🟡 6/10 (beta) · 🟡 5/10 (public)

**What's good:**
- Sentry wired (client/server/edge configs + instrumentation), source maps,
  ad-blocker tunnel route. Uptime monitoring evidenced. Speed Insights present.

**Gaps:**
- **Sentry alert rules + routing + a test alert** not yet evidenced.
- **Public vs internal `/api/health`** evidence for the deployed env pending.
- **Zero-signup** and **per-company error-spike** alerts not implemented.

---

### 9. Email & DNS — 🟠 4/10 (beta) · 🔴 3/10 (public)

- **SPF / DKIM / DMARC** records not yet configured/verified. Without these,
  your auth and transactional email will land in spam — this quietly breaks
  signup for real users.
- Multi-provider deliverability testing still required.

Resend is integrated; this is a DNS/dashboard task, not a code task.

---

### 10. Legal, GDPR & Privacy — 🟡 6/10 (beta) · 🟠 4/10 (public)

**What's good:**
- Privacy policy, ToS, cookie policy, liability disclaimer live.
- DSAR export/deletion/portability implemented; data classification,
  retention, sub-processor list, residency, breach process documented.
- SOC 2 readiness evidence folder + incident response process exist.

**Open for public release:**
- **DPA template still marked draft** — needs legal review before sharing.
- **ICO registration** evidence (legally required in the UK for commercial
  processing of personal data — you process passport-adjacent travel data).
- **GDPR public-release workplan P0/P1 items** still open
  (`docs/legal/GDPR_PUBLIC_RELEASE_WORKPLAN.md`).
- Passport-data masking strategy still listed as "to define".

---

### 11. UI/UX & Accessibility — 🟢 8/10 (beta) · 🟢 7/10 (public)

**What's good:**
- A11y E2E (17 passing) and mobile E2E (15 passing) recorded.
- axe-core in the test stack; empty/responsive states hardened recently.
- Design discipline encoded in CLAUDE.md (8px spacing, 12px radius, etc.).

**Before public:**
- Real-device iOS Safari + Android Chrome checks (pending).
- Screen-reader pass (VoiceOver/NVDA) on key flows.
- Deployed-URL Lighthouse run.

---

### 12. Performance — 🟢 7/10 (beta) · 🟡 6/10 (public)

- A 60-item performance audit exists (`memory/PERFORMANCE-AUDIT.md`) with a
  prioritized fix plan; calendar virtualization, pagination, caching rules done.
- Lighthouse CI config present (`lighthouserc.json`).
- **Pending:** Lighthouse against the **deployed** beta URL, cold-start and
  worst-case dataset checks on real infra.

---

### 13. Beta / Launch Operations — 🟡 6/10 (beta) · 🟡 5/10 (public)

**What's good:**
- Outstanding documentation: source-of-truth, release checklist, runbook,
  tester brief, known-issues list, success-metrics targets, support ownership,
  evidence templates. Honestly better than most funded startups.

**Gaps:**
- Several tasks still need a **named owner** (you, for now — but write it down).
- Beta success metrics defined but **no tracking owner/dashboard** assigned.
- Tester brief + known-issues **must actually be distributed** before invites.
- Non-founder full-journey test still required.

---

### 14. Business & Insurance — 🟠 3/10

Outside the repo, but real launch blockers:
- Company/sole-trader registration + business bank account for Stripe payouts.
- **Professional indemnity insurance** — strongly recommended for a compliance
  tool where a wrong number could influence an immigration decision.
- Final pricing decision (even if beta is free).

---

## The Critical Path (do these in order)

**To start private beta (🟢 close to done):**
1. ✅ Verify auth + password-reset email delivery across Gmail/Outlook/corporate, including reset-link single-use, expiry, and post-reset session invalidation.
2. ✅ Run the disaster-recovery / restore tabletop and file evidence.
3. ✅ Configure + test Sentry alert routing; capture `/api/health` evidence.
4. ✅ One non-founder completes the full signup → trip → compliance → logout journey.
5. ✅ Distribute the tester brief + known-issues list.

**To go to public full release (🔵 the bigger lift):**
6. Finalize Stripe: real price IDs, webhook endpoint, full lifecycle evidence.
7. Configure & verify SPF/DKIM/DMARC; re-test deliverability.
8. Legal: finalize DPA, complete ICO registration, clear GDPR workplan P0/P1.
9. Verify Supabase backups/PITR with a real restore; set Vercel spend limits.
10. Capture CodeQL/dependency-scan run evidence + fresh production-like RLS attack test.
11. Real-device + screen-reader + deployed-Lighthouse passes.
12. Business: registration, insurance, final pricing.

---

## Bottom line

You haven't just "done a good job" — for a solo, AI-assisted founder this is an
unusually disciplined codebase with security audits, multi-tenant isolation
testing, a real test pyramid, and launch documentation most teams never write.

**The code is ready. The proof isn't yet.** Almost everything between you and a
public launch is *verification and operations* — clicking through dashboards,
sending test emails, restoring a backup, getting legal sign-off — rather than
writing features. Knock out the private-beta critical path first (you're days,
not weeks, away), get real testers in, then work the public-release list while
they use it.

*This review changed no code. It is a snapshot for decision-making and should be
re-checked against live dashboards before any go/no-go call.*
