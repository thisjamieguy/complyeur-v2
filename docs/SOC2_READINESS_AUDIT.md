# ComplyEur SOC 2 Readiness Audit (Type II)
Date: 2026-01-19  
Version: 1.0  
Scope: Codebase, Supabase configuration, Vercel deployment, documentation

---

## Executive Summary (Plain English)
ComplyEur has solid security foundations (RLS, validation, compliance math tests, GDPR tooling), but it does not yet meet the 9.7/10 SOC 2 Type II threshold. The biggest blockers are missing MFA enforcement, incomplete availability planning (no formal RTO/RPO or incident response plan), and gaps in confidentiality controls (export authorisation and data classification). These are fixable, but they require both technical changes and documented operational processes.

**Overall Result:** **FAIL** (7.1 / 10 vs required 9.7 / 10)

---

## Executive Summary (Technical)
- Strong control evidence: RLS isolation, audit log with hash chain, GDPR DSAR export, compliance engine tests with oracle validation, rate limiting middleware.
- Critical gaps: MFA not implemented; server-side permission checks missing for exports; RTO/RPO not defined; incident response plan not documented; admin audit log not immutable.
- Operational gaps: backup testing evidence, uptime monitoring evidence, graceful degradation for third-party outages.

---

## Scoring Model
- Scale: 1 (missing) to 10 (fully implemented and evidenced)
- Weighting: Equal weighting across five Trust Service Criteria (20% each)
- Required overall threshold: 9.7 / 10

**Overall Score Calculation**  
Security 6.6 + Availability 5.9 + Confidentiality 6.9 + Processing Integrity 8.4 + Privacy 7.6 = 35.4 / 5 = **7.1**

---

## Trust Service Criteria Results

### 1) Security (CC6) — Score: 6.6 / 10

| Control | Requirement | Status | Score | Evidence |
|---|---|---|---:|---|
| CC6.1 | MFA capability + session management | **Missing** | 2 | MFA UI is a mock, no backend enforcement; Supabase MFA disabled in config |
| CC6.2 | TLS 1.2+ for data in transit | **Met** | 9 | HSTS + security headers in Next config |
| CC6.3 | AES-256 for data at rest | **Partial** | 7 | Supabase-managed encryption assumed; no field-level encryption proof |
| CC6.4 | Least-privilege access control | **Partial** | 7 | Permissions model exists, but server actions do not consistently enforce |
| CC6.5 | Admin actions audit trail (immutable) | **Partial** | 6 | Admin audit log exists; no immutability guardrails |
| CC6.6 | API rate limiting + input validation | **Partial** | 6 | Middleware rate limiting exists; server actions missing rate limits |
| CC6.7 | Secrets never in code/logs/errors | **Partial** | 8 | Env variables used; need automated secret scanning and log review |

**Key Gaps**
- MFA is not implemented (critical).
- Admin audit logs are not immutable.
- Rate limiting does not cover server actions.

---

### 2) Availability (A1) — Score: 5.9 / 10

| Control | Requirement | Status | Score | Evidence |
|---|---|---|---:|---|
| A1.1 | RTO/RPO defined | **Missing** | 3 | No documented targets in runbook or policy |
| A1.2 | Backups automated, tested, documented | **Partial** | 6 | Go-live checklist mentions daily backups + PITR; no test evidence |
| A1.3 | Incident response procedures documented | **Missing** | 3 | No incident response playbook or escalation plan |
| A1.4 | Uptime monitoring and alerting | **Partial** | 6 | Health endpoint + checklist mention; monitoring evidence not documented |
| A1.5 | Graceful degradation for dependencies | **Partial** | 7 | Maintenance/offline banners exist; no service-level fallback plan |

**Key Gaps**
- No formal RTO/RPO targets.
- Incident response plan not documented.
- Backup restore testing is not evidenced.

---

### 3) Confidentiality (C1) — Score: 6.9 / 10

| Control | Requirement | Status | Score | Evidence |
|---|---|---|---:|---|
| C1.1 | Multi-tenant isolation | **Partial** | 7 | RLS is strong, but some modules rely only on RLS without defence-in-depth |
| C1.2 | PII identified and classified | **Missing** | 4 | Privacy policy lists PII, but no formal data classification inventory |
| C1.3 | Retention and deletion policies | **Partial** | 7 | Retention cron and settings exist; no policy document |
| C1.4 | Export/download authorisation | **Partial** | 5 | Exports lack server-side permission checks |
| C1.5 | Logging avoids confidential data | **Partial** | 6 | Error handling exists, but no formal logging redaction policy |

**Key Gaps**
- Data classification inventory missing.
- Export authorisation not enforced server-side.

---

### 4) Processing Integrity (PI1) — Score: 8.4 / 10

| Control | Requirement | Status | Score | Evidence |
|---|---|---|---:|---|
| PI1.1 | 90/180 calculations mathematically verified | **Met** | 9 | Oracle-based compliance tests + edge cases |
| PI1.2 | Input validation rejects malformed data | **Met** | 8 | Zod validation schemas across auth/trips |
| PI1.3 | Results reproducible and auditable | **Partial** | 7 | Audit log exists; export logging present |
| PI1.4 | Errors do not silently corrupt data | **Partial** | 7 | Some operations swallow errors; no retry policy |
| PI1.5 | DB constraints enforce integrity | **Met** | 9 | Constraints on trips and integrity checks in migrations |

**Key Gaps**
- Some operations log errors without surfacing or retrying.
- Audit logging not fully immutable.

---

### 5) Privacy (P1–P8) — Score: 7.6 / 10

| Control | Requirement | Status | Score | Evidence |
|---|---|---|---:|---|
| P1 | Privacy policy describes collection/use/retention | **Met** | 8 | Public privacy policy page with retention details |
| P2 | Explicit consent mechanisms | **Partial** | 7 | Terms acceptance stored; cookie banner depends on site ID config |
| P3 | Data subject rights supported | **Met** | 8 | DSAR export and deletion tooling exist |
| P4 | Third-party sharing disclosed | **Met** | 7 | Privacy policy lists Supabase/Stripe/Resend/GA |
| P5 | Cookie/tracking consent (GDPR) | **Partial** | 6 | CookieYes script present with placeholder site ID |

**Key Gaps**
- Cookie consent relies on configured site ID; no confirmation in repo.
- Data processing agreement (DPA) is not documented.

---

## Gap Analysis (Machine-Actionable)

| ID | Gap | Severity | Priority | TSC | Remediation | Effort (hrs) |
|---|---|---|---|---|---|---:|
| G1 | MFA not implemented or enforced | **Critical** | P0 | Security | Enable Supabase MFA (TOTP) + backup codes; require for admins; update UI and enrolment flow | 24–40 |
| G2 | Admin audit log not immutable | **High** | P0 | Security | Add DB policies or trigger to block updates/deletes; add hash chain verification job | 12–18 |
| G3 | Server-side export authorisation missing | **High** | P0 | Confidentiality | Enforce `hasPermission` checks in export actions and DSAR routes | 8–12 |
| G4 | RTO/RPO not defined | **High** | P0 | Availability | Define RTO/RPO targets and publish in runbook | 4–6 |
| G5 | Incident response plan missing | **High** | P0 | Availability | Create IR playbook: detection, triage, comms, legal timelines | 8–12 |
| G6 | Backup restore testing not evidenced | **High** | P1 | Availability | Run quarterly restore tests; document results | 6–10 |
| G7 | Data classification inventory missing | **High** | P1 | Confidentiality | Create data inventory and classification scheme (PII, sensitive, internal) | 10–16 |
| G8 | Server actions lack rate limiting | **Medium** | P1 | Security | Apply `checkServerActionRateLimit` to export/import/bulk ops | 6–10 |
| G9 | Tenant isolation relies on RLS only in some modules | **Medium** | P1 | Confidentiality | Add explicit company checks in employees/forecasts/actions | 10–16 |
| G10 | Cookie consent configuration not verified | **Medium** | P2 | Privacy | Configure CookieYes site ID, document consent verification | 2–4 |
| G11 | Logging redaction policy missing | **Medium** | P2 | Confidentiality | Define log redaction rules; enforce structured logging | 8–12 |
| G12 | No documented third-party outage plan | **Low** | P2 | Availability | Add graceful degradation plan for Supabase/Resend/Sentry outages | 4–6 |

---

## Remediation Roadmap (Effort-Estimated)

### Phase 0 (0–2 weeks, P0)
- Implement MFA with enforcement for admins and optional for all users. (24–40 hrs)
- Make admin audit logs immutable at DB level. (12–18 hrs)
- Add server-side authorisation checks for exports and DSAR. (8–12 hrs)
- Define RTO/RPO targets and publish in runbook. (4–6 hrs)
- Create incident response playbook and escalation policy. (8–12 hrs)

### Phase 1 (2–6 weeks, P1)
- Evidence backup restore tests and document results. (6–10 hrs)
- Add data classification inventory and PII register. (10–16 hrs)
- Enforce rate limiting for server actions. (6–10 hrs)
- Add explicit company checks in remaining RLS-only modules. (10–16 hrs)

### Phase 2 (6–12 weeks, P2)
- Formal logging redaction policy + structured logging. (8–12 hrs)
- Document third-party outage response and graceful degradation. (4–6 hrs)
- Confirm CookieYes configuration and consent capture evidence. (2–4 hrs)

---

## Edge Case Coverage (Status)
- RLS bypass via service role exposure: **Partially mitigated** (service role is isolated but no automated scanning).
- Session hijack via localStorage: **Mitigated** (SSR cookie-based sessions; no localStorage token storage).
- Compliance calculation timezone handling: **Mitigated** (UTC-normalised date-fns logic + tests).
- Audit log tampering: **Partially mitigated** (hash chain exists, but admin log immutability missing).
- Backup restoration to wrong environment: **Not fully documented** (environment safety rails exist; restore plan not detailed).
- Third-party outage cascading to data loss: **Not documented** (no explicit degradation plan).
- Admin impersonation without audit trail: **Partial** (admin audit log exists but not enforced everywhere).
- Bulk export exposing other companies' data: **Mitigated** (company_id filters; authorisation still missing).
- Error messages leaking stack traces/PII: **Partial** (generic errors in many cases; no formal redaction policy).

---

## Implementation Recommendations (By TSC)

### Security
1. Implement MFA (Supabase TOTP) with backup codes and enforcement for admins.
2. Add DB-level immutability on audit tables (no UPDATE/DELETE).
3. Apply server-side permission checks to exports and admin actions.
4. Enforce server-action rate limiting for bulk operations.

### Availability
1. Define RTO/RPO targets and include in the runbook.
2. Document incident response plan and on-call escalation.
3. Schedule and evidence quarterly backup restore tests.
4. Add dependency outage playbooks (Supabase, Resend, Sentry).

### Confidentiality
1. Create a data classification inventory and map all PII fields.
2. Enforce least-privilege authorisation for export/download.
3. Add defence-in-depth company checks in RLS-only modules.
4. Implement structured logging with redaction rules.

### Processing Integrity
1. Keep oracle tests mandatory in CI.
2. Add retry logic for transient database failures.
3. Add integrity checks for export generation (record counts, window bounds).

### Privacy
1. Validate CookieYes configuration and consent capture.
2. Publish a DPA template and sub-processor list.
3. Add privacy review checklist for new features.

---

## Pass/Fail Determination
**Result:** **FAIL**  
**Reason:** Overall score 7.1 / 10 is below the required 9.7 / 10 threshold. Critical and high-priority gaps (MFA, incident response, RTO/RPO, immutable audit logging, export authorisation) must be remediated before SOC 2 Type II readiness.

---

## Evidence and Sources Reviewed
- `next.config.ts` (security headers, TLS enforcement)
- `middleware.ts` and `lib/rate-limit.ts` (rate limiting)
- `lib/supabase/server.ts` and `lib/supabase/middleware.ts` (session handling)
- `components/settings/security-settings.tsx` (MFA UI state)
- `lib/supabase/admin.ts` (service role usage)
- `supabase/config.toml` (MFA settings, auth defaults)
- `supabase/migrations/*` (RLS policies, audit log, constraints)
- `lib/gdpr/audit.ts` (hash-chain audit logging)
- `app/api/gdpr/dsar/[employeeId]/route.ts` (DSAR export)
- `app/api/gdpr/cron/retention/route.ts` and `vercel.json` (retention purge scheduling)
- `lib/compliance/**` and `lib/compliance/__tests__/**` (90/180 calculation + oracle tests)
- `app/(public)/privacy/page.tsx` and `app/(public)/terms/page.tsx` (privacy and terms)
- `docs/RUNBOOK.md`, `docs/GO_LIVE_CHECKLIST.md`, `docs/ENVIRONMENTS.md`, `docs/architecture/PRODUCTION_SAFETY_RAILS.md`
- `SECURITY_AUDIT_GAP_ANALYSIS.md` and `docs/SCALABILITY_RESILIENCE_AUDIT.md`

---

## Assumptions and Limitations
- Supabase and Vercel provide TLS 1.2+ and at-rest encryption; this audit does not verify provider configurations.
- Environment variable values and production settings are not visible in the repo.
- CI/CD pipelines and monitoring tooling are not visible here and require separate verification.
