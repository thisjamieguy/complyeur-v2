# Documentation Gap Report — ComplyEUR v2.0
**Audit date:** 30 March 2026
**Audited by:** Pre-launch documentation audit
**Scope:** All project documentation, legal pages, env config, and operational runbooks

---

## Phase 1 — Complete File Inventory

### Developer Documentation

| File | Status | Last Updated | Gap Summary |
|------|--------|-------------|-------------|
| `README.md` | 🟡 Stale | Unknown | Lists v0.1.0 and "Next.js 16" — incorrect on both counts. Missing Sentry, Turnstile, full env var list. |
| `CLAUDE.md` | 🟡 Minor gap | Ongoing | Excellent overall. Missing: explicit EES (Entry/Exit System Oct 2025) note; Romania/Bulgaria Jan 2025 Schengen accession stated only implicitly in code. |
| `AGENTS.md` | 🟢 Current | Ongoing | Comprehensive AI context. No material gaps. |
| `CHANGELOG.md` | 🟢 Current | Mar 2026 | Follows Keep a Changelog. Active. |
| `memory/ARCHITECTURE.md` | 🟢 Current | Feb 2026 | Comprehensive system design. Schengen country list, RLS patterns, data flow all present. |
| `memory/CONVENTIONS.md` | 🟢 Current | Feb 2026 | Complete code conventions. TypeScript, components, Server Actions, Supabase queries all covered. |
| `memory/PERFORMANCE-AUDIT.md` | 🟢 Current | Feb 2026 | 60 issues with prioritised fix plan. |
| `memory/SECURITY-AUDIT.md` | 🟢 Current | Feb 2026 | Application security findings and remediation. |
| `.env.example` | 🟡 Incomplete | — | Missing: `NEXT_PUBLIC_SENTRY_DSN`, `CRON_SECRET`. Both are required in production and referenced throughout codebase. GA4 ID is hardcoded in `app/layout.tsx`. |

### Operational Documentation

| File | Status | Last Updated | Gap Summary |
|------|--------|-------------|-------------|
| `docs/RUNBOOK.md` | 🟢 Current | Mar 2026 | Deployment, rollback, migration, log checking, emergency contacts — all present. |
| `docs/INCIDENT_RESPONSE.md` | 🟢 Current | Mar 2026 | Severity levels, GDPR 72-hour window, templates, escalation paths — complete. |
| `docs/GO_LIVE_CHECKLIST.md` | 🟢 Current | Mar 2026 | 13 critical user flow tests, Lighthouse targets, legal compliance checks — production-ready. |
| `docs/ENVIRONMENTS.md` | 🟢 Current | Mar 2026 | Dev/prod Supabase project refs and regions documented. |
| `docs/DATA_CLASSIFICATION.md` | 🟢 Current | Jan 2026 | 17 tables mapped to PII/Confidential/Internal classification levels. |
| `docs/ADMIN_GUIDE.md` | 🟢 Current | Feb 2026 | Admin panel operation. |
| `docs/BETA_LAUNCH_CHECKLIST.md` | 🟢 Current | Feb 2026 | Beta definition-of-done, compliance engine verification. |
| `docs/billing/STRIPE_FINALIZATION_RUNBOOK.md` | 🟢 Current | Jan 2026 | Stripe price sync, webhook config scripts. |
| `docs/legal/DPA_TEMPLATE.md` | 🟡 Draft | Jan 2026 | Marked as draft pending legal review. Not production-ready for customer use. |
| `docs/DATA_DELETION_WORKFLOW.md` | 🔴 Missing | — | No dedicated GDPR erasure (Right to Erasure) end-to-end workflow documented. |

### Legal & Compliance Pages

| File | Status | Last Updated | Gap Summary |
|------|--------|-------------|-------------|
| `app/(public)/privacy/page.tsx` | 🟢 Current | 17 Feb 2026 | 10 sections, GDPR lawful bases documented, all processors listed. Minor: cookie section does not list individual third-party cookies by name (GA4, Sentry). |
| `app/(public)/terms/page.tsx` | 🟢 Current | 6 Feb 2026 | 12 sections, England & Wales governing law, liability limitations, 14-day money-back guarantee. |
| `app/(public)/accessibility/page.tsx` | 🟡 Stale | 9 Jan 2025 | Content is good; WCAG 2.1 AA target stated. Date is 15 months old — needs refreshed review date. |
| `app/(public)/cookies/page.tsx` | 🔴 Missing | — | No standalone Cookie Policy page. Cookie information is embedded in Privacy Policy §7 only. Enterprise customers and some regulators expect a dedicated `/cookies` route. |

### Calculation Logic Documentation

| File | Status | Last Updated | Gap Summary |
|------|--------|-------------|-------------|
| `lib/compliance/` (source code) | 🟢 Current | Feb 2026 | Well-documented source: window-calculator.ts, presence-calculator.ts, constants.ts. All JSDoc present with EU Reg 610/2013 references. |
| `docs/CALCULATION_LOGIC.md` | 🔴 Missing | — | No human-readable calculation spec. Required for: enterprise due diligence, legal review, audit trail, onboarding new engineers. Must cover rolling window definition, overlap handling, microstate inclusion, Ireland/Cyprus exclusion, Romania/Bulgaria Jan 2025, worked examples, "no AI" declaration. |

---

## Priority Action List (ordered by launch risk)

| Priority | Item | Risk if missing |
|----------|------|----------------|
| 🔴 P1 | **Create `app/(public)/cookies/page.tsx`** — dedicated Cookie Policy page | Enterprise legal teams expect `/cookies`; CookieYes consent UI links to it |
| 🔴 P1 | **Create `docs/CALCULATION_LOGIC.md`** — human-readable calculation spec | Enterprise due diligence; audit requirement; no paper trail for "no AI" decision |
| 🔴 P1 | **Create `docs/DATA_DELETION_WORKFLOW.md`** — GDPR erasure runbook | GDPR Art. 17 operationally inactionable without this; no end-to-end procedure documented |
| 🔴 P1 | **Update `.env.example`** — add `NEXT_PUBLIC_SENTRY_DSN` and `CRON_SECRET` | New engineer setup fails silently; cron endpoints broken; errors not tracked in Sentry |
| 🟡 P2 | **Update `README.md`** — correct version (v2.0), stack (Next.js 14/15), full env var reference | Misleads new engineers; version mismatch undermines credibility |
| 🟡 P2 | **Update `app/(public)/accessibility/page.tsx`** — refresh review date to 2026 | Date of Jan 9, 2025 signals neglect; WCAG compliance statement needs periodic review date |
| 🟡 P2 | **Update `CLAUDE.md`** — add EES (October 2025 live), explicit Romania/Bulgaria Jan 2025 note | Context missing for AI-assisted development sessions |
| 🟢 P3 | **`docs/legal/DPA_TEMPLATE.md`** — remove "draft" flag when legally reviewed | Cannot issue Data Processing Agreements to customers until reviewed |

---

## Acceptance Criteria Checklist

### Phase 2 — Developer Documentation
- [x] README.md exists — needs update (P2)
- [x] CLAUDE.md current — minor EES/Romania gap (P2)
- [x] ARCHITECTURE.md reflects actual system — complete ✅
- [x] CONVENTIONS.md covers all patterns — complete ✅
- [ ] .env.example complete — missing 2 vars (P1)

### Phase 3 — Legal & Compliance Pages
- [x] Privacy Policy — present, GDPR compliant ✅
- [x] Terms of Service — present, governing law stated ✅
- [ ] Cookie Policy — missing standalone page (P1)
- [x] Accessibility Statement — present, WCAG 2.1 AA stated; date stale (P2)

### Phase 4 — Operational Documentation
- [x] Deployment runbook — RUNBOOK.md complete ✅
- [x] Monitoring — Sentry, BetterUptime in RUNBOOK.md ✅
- [x] Incident response — INCIDENT_RESPONSE.md complete ✅
- [ ] Data deletion workflow — missing (P1)

### Phase 5 — Calculation Logic
- [ ] Calculation doc with rolling window, microstates, Ireland/Cyprus, Romania/Bulgaria, worked examples, no-AI declaration — missing (P1)
