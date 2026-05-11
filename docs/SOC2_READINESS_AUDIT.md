# ComplyEur SOC 2 Readiness Audit (Type II)
Date: 2026-05-11  
Version: 1.1  
Scope: Repository-based reassessment of code, migrations, tests, and in-repo operational evidence

---

## Executive Summary (Plain English)
The January 2026 SOC 2 readiness score is now stale. Based on the repository as it exists on 2026-05-11, ComplyEur has improved materially from **7.1 / 10** to **7.9 / 10**.

The score moved because several previously critical gaps are now remediated or evidenced in-repo: MFA capability exists and is enforced for superadmins, audit logs are append-only at the database layer, export authorization is enforced server-side, RTO/RPO and incident response are documented, uptime monitoring evidence exists, CookieYes is configured, and a formal data-classification inventory now exists.

ComplyEur still does **not** meet the long-term **9.7 / 10** readiness target. The main remaining blockers are:
- MFA is not yet enforced for tenant `owner` and `admin` roles, only `is_superadmin`.
- Backup restore testing is documented but not evidenced.
- Availability and vendor-response controls are still lighter than a mature SOC 2 Type II posture.
- The DPA is still marked draft and dependency/security scanning is not automated in CI.

**Overall Result:** **FAIL** (7.9 / 10 vs required 9.7 / 10)

---

## Executive Summary (Technical)
- Strong control evidence now exists for: RLS isolation, defence-in-depth tenant checks, append-only audit logging, privileged-action MFA, auth/server-action rate limiting, DSAR/export authorization, uptime monitoring, session timeout evidence, CookieYes consent gating, and data classification.
- Highest-impact residual gaps: MFA scope is too narrow, backup restore tests are not evidenced, third-party outage playbooks are incomplete, and some compliance/monitoring controls remain manual rather than continuously enforced.
- Conclusion: security posture is meaningfully stronger than the January audit, but operational maturity is still below a 9.7 SOC 2 Type II threshold.

---

## Scoring Model
- Scale: 1 (missing) to 10 (fully implemented and evidenced)
- Weighting: Equal weighting across five Trust Service Criteria (20% each)
- Required overall threshold: 9.7 / 10

**Overall Score Calculation**  
Security 7.9 + Availability 7.4 + Confidentiality 7.8 + Processing Integrity 8.4 + Privacy 8.0 = 39.5 / 5 = **7.9**

**Change From Version 1.0**  
Previous score: **7.1 / 10**  
Current score: **7.9 / 10**  
Net movement: **+0.8**

---

## Trust Service Criteria Results

### 1) Security (CC6) — Score: 7.9 / 10

| Control | Requirement | Status | Score | Evidence |
|---|---|---|---:|---|
| CC6.1 | MFA capability + session management | **Partial** | 7 | `supabase/config.toml` enables TOTP; `lib/security/mfa.ts`, `lib/actions/mfa.ts`, `lib/admin/auth.ts`, and `docs/compliance/soc2/evidence/session_timeout_evidence.md`; enforcement currently applies to `is_superadmin === true` |
| CC6.2 | TLS 1.2+ for data in transit | **Met** | 9 | `next.config.ts` security headers + HTTPS enforcement helpers |
| CC6.3 | AES-256 for data at rest | **Partial** | 7 | Supabase/Vercel provider controls assumed; app-level encryption evidenced for waitlist email storage |
| CC6.4 | Least-privilege access control | **Partial** | 8 | `lib/security/authorization.ts`, `lib/permissions.ts`, admin session guards, protected export routes, and role-based gating across mutations |
| CC6.5 | Admin actions audit trail (immutable) | **Met** | 8 | `supabase/migrations/20260206082114_remote_schema.sql`, append-only triggers/policies, and `docs/compliance/soc2/evidence/audit_log_immutability_evidence.md` |
| CC6.6 | API rate limiting + input validation | **Partial** | 8 | `lib/rate-limit.ts`, `proxy.ts`, `app/(auth)/actions.ts`, and widespread `checkServerActionRateLimit()` coverage |
| CC6.7 | Secrets never in code/logs/errors | **Partial** | 8 | env-var usage plus `lib/logger.mjs` and `docs/compliance/soc2/evidence/pii_log_redaction_evidence.md`; no automated secret scanning evidence in repo |

**What Improved Since Version 1.0**
- MFA is implemented and enforced for privileged superadmin flows.
- Server-side rate limiting now covers auth flows and a wide set of server actions.
- Audit logs are append-only at DB level instead of relying only on application behavior.

**Residual Gaps**
- MFA enforcement scope is too narrow for a stronger SOC 2 score.
- Secret scanning and dependency/security scanning are still manual from the repo’s perspective.

---

### 2) Availability (A1) — Score: 7.4 / 10

| Control | Requirement | Status | Score | Evidence |
|---|---|---|---:|---|
| A1.1 | RTO/RPO defined | **Met** | 8 | `docs/RUNBOOK.md` defines RTO 8 hours and RPO 24 hours |
| A1.2 | Backups automated, tested, documented | **Partial** | 6 | `docs/RUNBOOK.md` documents restore procedure and evidence expectations; no completed restore-test evidence found |
| A1.3 | Incident response procedures documented | **Met** | 8 | `docs/INCIDENT_RESPONSE.md` includes severity, workflow, comms, and GDPR timelines |
| A1.4 | Uptime monitoring and alerting | **Met** | 8 | `docs/compliance/soc2/evidence/uptime_monitoring_evidence.md` with Better Stack monitor and alert screenshots |
| A1.5 | Graceful degradation for dependencies | **Partial** | 7 | maintenance mode, health probes, rate-limit fail-closed behavior, and some documented degraded-mode handling; no complete vendor outage playbook set |

**What Improved Since Version 1.0**
- RTO/RPO is now documented.
- Incident response is now documented.
- Uptime monitoring and alerting evidence is now present.

**Residual Gaps**
- Backup restore testing remains unevidenced.
- Dependency outage playbooks for Supabase, Resend, Sentry, and Stripe are still incomplete.

---

### 3) Confidentiality (C1) — Score: 7.8 / 10

| Control | Requirement | Status | Score | Evidence |
|---|---|---|---:|---|
| C1.1 | Multi-tenant isolation | **Partial** | 8 | strong RLS posture, `lib/security/tenant-access.ts`, `docs/compliance/soc2/evidence/defense_in_depth_tenant_checks_evidence.md`, and tenant-isolation tests/audits |
| C1.2 | PII identified and classified | **Met** | 8 | `docs/DATA_CLASSIFICATION.md` |
| C1.3 | Retention and deletion policies | **Partial** | 7 | GDPR retention flows, privacy disclosures, and runbook support exist; still light on formal policy/evidence packaging |
| C1.4 | Export/download authorisation | **Met** | 8 | `app/actions/exports.ts`, `lib/gdpr/dsar-export.ts`, `app/api/gdpr/dsar/[employeeId]/route.ts`, and `requireExportPermission()` / `requireAdminAccess()` |
| C1.5 | Logging avoids confidential data | **Met** | 8 | `lib/logger.mjs` and `docs/compliance/soc2/evidence/pii_log_redaction_evidence.md` |

**What Improved Since Version 1.0**
- Formal data-classification inventory now exists.
- Export authorization is enforced server-side.
- Logging redaction evidence is now documented.

**Residual Gaps**
- Retention/deletion evidence is stronger in code than in formal compliance packaging.
- Some confidentiality claims still depend on provider-side controls not verifiable from repo alone.

---

### 4) Processing Integrity (PI1) — Score: 8.4 / 10

| Control | Requirement | Status | Score | Evidence |
|---|---|---|---:|---|
| PI1.1 | 90/180 calculations mathematically verified | **Met** | 9 | `lib/compliance/__tests__/**` including oracle and edge-case coverage |
| PI1.2 | Input validation rejects malformed data | **Met** | 8 | Zod schemas across auth, trips, exports, GDPR, and admin actions |
| PI1.3 | Results reproducible and auditable | **Partial** | 8 | append-only audit logs, DSAR/export controls, and audit evidence docs |
| PI1.4 | Errors do not silently corrupt data | **Partial** | 8 | fail-closed rate limiting and stronger guards reduce silent failure risk; some non-critical audit/log helpers still swallow errors intentionally |
| PI1.5 | DB constraints enforce integrity | **Met** | 9 | migrations and schema constraints on trips, audit tables, auth-related tables, and RLS enforcement |

**Residual Gaps**
- Some non-critical logging/audit helpers fail open by design to avoid breaking user flows.
- No evidence of retry policies or formal data-reconciliation procedures for transient failures.

---

### 5) Privacy (P1–P8) — Score: 8.0 / 10

| Control | Requirement | Status | Score | Evidence |
|---|---|---|---:|---|
| P1 | Privacy policy describes collection/use/retention | **Met** | 8 | public privacy and cookies pages with retention and rights language |
| P2 | Explicit consent mechanisms | **Met** | 8 | CookieYes integration, consent settings UI, and consent-aware analytics/clarity loaders |
| P3 | Data subject rights supported | **Met** | 8 | DSAR export, deletion, anonymization, and retention tooling |
| P4 | Third-party sharing disclosed | **Met** | 8 | privacy policy plus `docs/legal/DPA_TEMPLATE.md` sub-processor list |
| P5 | Cookie/tracking consent (GDPR) | **Met** | 8 | production CookieYes script is configured in `app/layout.tsx`; analytics gated by consent helpers |

**Residual Gaps**
- The DPA is still marked draft pending legal review.
- Privacy controls are strong in-product, but legal/commercial packaging is not yet fully mature.

---

## Gap Analysis (Current Residuals)

| ID | Gap | Severity | Priority | TSC | Remediation | Effort (hrs) |
|---|---|---|---|---|---|---:|
| G1 | MFA enforced only for `is_superadmin`, not tenant `owner` / `admin` roles | **High** | P0 | Security | Extend `shouldEnforceMfaForRole()` and prove flows with tests + docs | 8–16 |
| G2 | Backup restore test procedure exists but no executed evidence is stored | **High** | P0 | Availability | Run restore into isolated environment, capture screenshots/query results, file evidence under `docs/compliance/soc2/evidence/` | 4–8 |
| G3 | Vendor outage/degraded-mode playbooks incomplete | **Medium** | P1 | Availability | Add explicit runbooks for Supabase, Stripe, Resend, Sentry outages and operator actions | 4–8 |
| G4 | DPA template still marked draft | **Medium** | P1 | Privacy | Complete legal review and remove draft status before treating as enterprise-ready evidence | 2–6 |
| G5 | Dependency/security scanning not automated in CI | **Medium** | P1 | Security | Add CI workflow for `pnpm audit` / SAST or document approved compensating control | 4–8 |
| G6 | Provider-side controls (at-rest encryption, backup success, production secrets posture) are not independently evidenced in repo | **Medium** | P2 | Security / Availability | Collect dashboard screenshots or exported evidence for provider controls | 4–8 |
| G7 | Retention/deletion and privacy controls need cleaner compliance evidence packaging | **Low** | P2 | Confidentiality / Privacy | Consolidate evidence index and map controls to evidence artifacts | 3–6 |

---

## Remediation Roadmap

### Phase 0
- Enforce MFA for tenant `owner` and `admin` roles, not only superadmins.
- Run and document a real backup restore test.
- Finalise explicit outage playbooks for critical third parties.

### Phase 1
- Complete DPA legal review.
- Add automated dependency/security scanning in CI.
- Capture provider-control evidence for encryption, backups, and production secret handling.

### Phase 2
- Tighten evidence packaging so each SOC 2 control maps cleanly to a maintained artifact set.

---

## Edge Case Coverage (Updated Status)
- RLS bypass via service role exposure: **Partially mitigated** (service-role usage is isolated; no in-repo secret scan evidence).
- Session hijack via localStorage: **Mitigated** (SSR cookie-based sessions; no localStorage token storage).
- Compliance calculation timezone handling: **Mitigated** (date-only handling and oracle tests).
- Audit log tampering: **Mitigated for append-only controls** (DB triggers block UPDATE/DELETE).
- Backup restoration to wrong environment: **Partially mitigated** (procedure says restore to staging/isolated target; no executed evidence yet).
- Third-party outage cascading to data loss: **Partially documented** (some degraded-mode handling exists; no full playbook set).
- Bulk export exposing other companies' data: **Mitigated** (auth guards + company access checks + RLS).
- Error messages leaking stack traces/PII: **Partially mitigated** (structured logger/redaction evidence exists; production log review is not evidenced here).

---

## Pass/Fail Determination
**Result:** **FAIL**  
**Reason:** The score has improved to **7.9 / 10**, but that remains below the required **9.7 / 10** threshold. The path to the target is now clearer and shorter than it was in January, but the remaining work is mostly operational-hardening and evidence-generation rather than basic application security.

---

## Evidence and Sources Reviewed
- `next.config.ts`
- `proxy.ts`
- `lib/rate-limit.ts`
- `lib/security/authorization.ts`
- `lib/security/mfa.ts`
- `lib/actions/mfa.ts`
- `lib/admin/auth.ts`
- `lib/logger.mjs`
- `lib/security/tenant-access.ts`
- `app/actions/exports.ts`
- `lib/gdpr/dsar-export.ts`
- `app/api/gdpr/dsar/[employeeId]/route.ts`
- `app/layout.tsx`
- `supabase/config.toml`
- `supabase/migrations/20260206082114_remote_schema.sql`
- `supabase/migrations/20260414220000_complete_tenant_isolation_hardening.sql`
- `docs/RUNBOOK.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/DATA_CLASSIFICATION.md`
- `docs/legal/DPA_TEMPLATE.md`
- `docs/compliance/soc2/EVIDENCE_INDEX.md`
- `docs/compliance/soc2/evidence/uptime_monitoring_evidence.md`
- `docs/compliance/soc2/evidence/session_timeout_evidence.md`
- `docs/compliance/soc2/evidence/audit_log_immutability_evidence.md`
- `docs/compliance/soc2/evidence/defense_in_depth_tenant_checks_evidence.md`
- `docs/compliance/soc2/evidence/pii_log_redaction_evidence.md`
- `docs/security/MINIMUM_SECURITY_BAR_PROGRESS.md`
- `docs/security/DEPENDENCY_AUDIT_2026-03-30.md`
- `docs/BETA_LAUNCH_RESULTS.md`
- `CHANGELOG.md`

---

## Assumptions and Limitations
- This is a repository-based reassessment, not an auditor attestation.
- Supabase and Vercel provider controls are treated as external dependencies unless explicit evidence exists in-repo.
- Production environment-variable values, dashboard settings, and real restore execution logs are not directly visible here.
- Where changelog or evidence documents assert external verification, this audit treats those documents as the available evidence source.
