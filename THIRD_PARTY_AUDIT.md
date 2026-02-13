# Third-Party Integration Audit

**Date:** 2026-02-13
**Scope:** Complete inventory of all external services, SDKs, APIs, scripts, and integrations in ComplyEur v2

---

## Integration Inventory

| Service | Category | Files | Load Method | Env Vars |
|---------|----------|-------|-------------|----------|
| **Supabase** | Database, Auth, Storage | `lib/supabase/client.ts:1`, `lib/supabase/server.ts:1`, `lib/supabase/admin.ts:1`, `lib/supabase/middleware.ts:1` | npm: `@supabase/supabase-js`, `@supabase/ssr` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Stripe** | Payments | `app/api/billing/checkout/route.ts:131`, `lib/billing/plans.ts` | Direct `fetch()` to `https://api.stripe.com/v1/checkout/sessions` | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Sentry** | Error monitoring, Performance, Session replay | `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `next.config.ts:2`, `instrumentation.ts:1` | npm: `@sentry/nextjs`; webpack plugin for source maps | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` |
| **Google Analytics** | Web analytics | `app/layout.tsx:4,122` | npm: `@next/third-parties/google`; `<GoogleAnalytics>` component | None (hardcoded GA ID: `G-PKKZZFWD63`) |
| **Vercel Speed Insights** | Performance monitoring (RUM) | `app/layout.tsx:5,120` | npm: `@vercel/speed-insights`; `<SpeedInsights>` component | None (auto-integrated by Vercel) |
| **CookieYes** | Cookie consent management (GDPR) | `app/layout.tsx:46-51`, `lib/cookieyes.ts` | CDN `<Script>` tag: `https://cdn-cookieyes.com/client_data/8c2e311aa3e53bd1fc42091adb588e5c/script.js` | None (hardcoded script URL) |
| **Cloudflare Turnstile** | CAPTCHA / Bot protection | `components/ui/turnstile.tsx:98`, `app/(preview)/landing/actions.ts:60` | Dynamic `document.createElement('script')` loading `https://challenges.cloudflare.com/turnstile/v0/api.js`; server verify via `fetch()` to `https://challenges.cloudflare.com/turnstile/v0/siteverify` | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| **Upstash Redis** | Rate limiting | `lib/rate-limit.ts:2-3`, `middleware.ts:3` | npm: `@upstash/ratelimit`, `@upstash/redis` | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| **Resend** | Transactional email | `lib/services/email-service.ts:1`, `lib/services/waitlist-email.ts:1` | npm: `resend` | `RESEND_API_KEY`, `EMAIL_FROM` |
| **Google Fonts** | Typography | `app/layout.tsx:3` | npm: `next/font/google` (Geist, Geist_Mono); optimized self-hosting by Next.js | None |
| **Vercel Hosting** | Hosting, Cron jobs, Deployment | `vercel.json`, `next.config.ts:116` | Platform integration; cron job at `/api/gdpr/cron/retention` (daily 3AM UTC) | `VERCEL_URL` (auto-set) |

---

## Additional npm Dependencies (Not External Services)

These are code libraries that run locally and do **not** make external network calls:

| Package | Category | Purpose |
|---------|----------|---------|
| `@radix-ui/*` (12 packages) | UI primitives | Accessible component primitives (dialog, dropdown, select, etc.) |
| `@hookform/resolvers`, `react-hook-form` | Forms | Form validation and state management |
| `@react-pdf/renderer` | PDF generation | Client-side PDF generation for exports |
| `@tanstack/react-virtual` | Virtualization | Efficient rendering of long lists |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Styling | Tailwind CSS utility helpers |
| `cmdk` | UI | Command palette component |
| `date-fns` | Date utilities | Date manipulation for 90/180-day calculations |
| `jszip` | File compression | ZIP archive creation for GDPR exports |
| `lucide-react` | Icons | Icon library |
| `next-themes` | Theming | Dark/light mode support |
| `react-day-picker` | UI | Date picker component |
| `react-dropzone` | UI | File drag-and-drop for imports |
| `sonner` | UI | Toast notifications |
| `xlsx` | Spreadsheet parsing | Excel/CSV import parsing |
| `zod` | Validation | Schema validation |

---

## Environment Variable Inventory

### Variables with Matching Integrations

| Env Var | Service | Used In | Scope |
|---------|---------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | `lib/supabase/client.ts`, `lib/supabase/admin.ts`, tests | Frontend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | `lib/supabase/client.ts`, tests | Frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | `lib/supabase/admin.ts`, test scripts | Server-only |
| `STRIPE_SECRET_KEY` | Stripe | `app/api/billing/checkout/route.ts:18` | Server-only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Referenced in CLAUDE.md | Frontend |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Referenced in CLAUDE.md | Server-only |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry | `sentry.client.config.ts:8`, `sentry.server.config.ts:8`, `sentry.edge.config.ts:8` | Frontend |
| `SENTRY_ORG` | Sentry | `next.config.ts:87` | Build-time |
| `SENTRY_PROJECT` | Sentry | `next.config.ts:88` | Build-time |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile | `components/ui/turnstile.tsx:13` | Frontend |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile | `app/(preview)/landing/actions.ts:44` | Server-only |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis | `lib/rate-limit.ts:23` | Server-only |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis | `lib/rate-limit.ts:24` | Server-only |
| `RESEND_API_KEY` | Resend | `lib/services/email-service.ts:9`, `lib/services/waitlist-email.ts:8` | Server-only |
| `EMAIL_FROM` | Resend | `lib/services/email-service.ts:19`, `lib/services/waitlist-email.ts:18` | Server-only |
| `NEXT_PUBLIC_APP_URL` | App config | `lib/metadata.ts:7`, `lib/env.ts:64`, email services | Frontend |
| `NEXT_PUBLIC_SITE_URL` | App config | `app/robots.ts:17`, `app/sitemap.ts:22` | Frontend |
| `NEXT_PUBLIC_MAINTENANCE_MODE` | App config | `lib/config.ts:6` | Frontend |
| `CRON_SECRET` | Vercel Cron | `lib/security/cron-auth.ts:41`, `playwright.config.ts:62` | Server-only |

### Potentially Orphaned Environment Variables

These are referenced in code but may not have a clear active integration or are only used in edge cases:

| Env Var | Where Referenced | Status |
|---------|-----------------|--------|
| `NEXT_PUBLIC_X_HANDLE` | `lib/metadata.ts:10` | Active — Twitter/X metadata for SEO |
| `NEXT_PUBLIC_TWITTER_HANDLE` | `lib/metadata.ts:10` | Legacy fallback for `X_HANDLE` — could be removed |
| `WAITLIST_EMAIL_ENCRYPTION_KEY` | `lib/security/waitlist-encryption.ts` | Active — waitlist email encryption |
| `WAITLIST_EMAIL_HASH_PEPPER` | `lib/security/waitlist-encryption.ts` | Active — waitlist email hashing |
| `WAITLIST_EMAIL_KEY_VERSION` | `lib/security/waitlist-encryption.ts` | Active — encryption key versioning |
| `STRIPE_PUBLISHABLE_KEY` | CLAUDE.md only (non-`NEXT_PUBLIC` version) | Possibly orphaned — code uses `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `STRIPE_WEBHOOK_SECRET` | CLAUDE.md only | May be used in a webhook route not yet built or in Supabase Edge Functions |

### Test-Only Environment Variables

| Env Var | Where Referenced |
|---------|-----------------|
| `TEST_USER_EMAIL` | E2E tests |
| `TEST_USER_PASSWORD` | E2E tests |
| `TEST_TEMP_DIR` | E2E tests |
| `TEST_URL` | `scripts/test-rate-limit.mjs` |
| `BASE_URL` | `scripts/test-cron-auth.mjs` |
| `E2E_LOGIN_EMAIL` | `e2e/performance/auth-flow.spec.ts` |
| `E2E_LOGIN_PASSWORD` | `e2e/performance/auth-flow.spec.ts` |
| `CI` | `playwright.config.ts`, `next.config.ts` (auto-set in CI environments) |

---

## CSP (Content-Security-Policy) Allowed Domains

From `next.config.ts:59-60`:

| Directive | Allowed Domains | Service |
|-----------|----------------|---------|
| `script-src` | `*.supabase.co`, `*.vercel-scripts.com`, `cdn-cookieyes.com` | Supabase, Vercel, CookieYes |
| `connect-src` | `*.supabase.co`, `*.sentry.io`, `cdn-cookieyes.com`, `log.cookieyes.com` | Supabase, Sentry, CookieYes |
| `img-src` | `*.supabase.co` | Supabase Storage |
| `frame-ancestors` | `'none'` | No embedding allowed |

### CSP Gaps

| Domain | Used In Code | In CSP? | Issue |
|--------|-------------|---------|-------|
| `challenges.cloudflare.com` | `components/ui/turnstile.tsx` (script load + API verify) | **NO** | Turnstile script and verification calls may be blocked by CSP in production |
| `api.stripe.com` | `app/api/billing/checkout/route.ts` (server-side fetch) | No (server-side, not needed) | N/A — server-side fetches bypass browser CSP |
| `*.google-analytics.com` | Loaded by `@next/third-parties` | **NO** | GA scripts may be blocked; `@next/third-parties` may use inline or Vercel proxy |
| `*.sentry.io` | `sentry.client.config.ts` | Yes (connect-src) | OK, but note tunnel at `/monitoring` bypasses need for this |

---

## GDPR / Privacy Implications

### HIGH — Active User Tracking

| Service | What It Collects | GDPR Risk | Mitigation in Place |
|---------|-----------------|-----------|---------------------|
| **Google Analytics** (`G-PKKZZFWD63`) | Page views, user behavior, device info, IP address, session data | **HIGH** — Transfers data to Google (US entity); requires explicit consent under GDPR | CookieYes consent banner (production-only); GA only loads in production |
| **Sentry Session Replay** | DOM snapshots, user interactions, click paths, network requests | **HIGH** — Records user sessions; contains PII if not masked | `maskAllText: true`, `blockAllMedia: true` configured; 5% sample rate (100% on errors) |
| **CookieYes** | Consent preferences, browser fingerprint for consent tracking | **MEDIUM** — Sets its own cookies; sends data to `log.cookieyes.com` | This IS the consent mechanism; necessary for GDPR compliance |
| **Vercel Speed Insights** | Core Web Vitals, page load metrics, device/browser info | **MEDIUM** — Performance data with limited PII | Auto-integrated; no consent gate currently |

### MEDIUM — Data Processing

| Service | What It Processes | GDPR Risk | Mitigation in Place |
|---------|------------------|-----------|---------------------|
| **Supabase** | All user data (companies, employees, trips, PII) | **MEDIUM** — Primary data processor; hosted on AWS | RLS policies on all tables; GDPR cron for data retention (`vercel.json` daily at 3AM UTC); DSAR export endpoint |
| **Stripe** | Payment info, customer email, billing details | **MEDIUM** — Payment data processor | Server-side only; no card data stored locally |
| **Resend** | Email addresses, alert content with employee names/compliance data | **MEDIUM** — Email contains PII (employee names, days used) | Server-side only; no bulk marketing |
| **Cloudflare Turnstile** | IP address, browser fingerprint for bot detection | **LOW-MEDIUM** — Privacy-focused alternative to reCAPTCHA | Managed mode (invisible for most users); Cloudflare privacy policy applies |

### LOW — Infrastructure Only

| Service | What It Processes | GDPR Risk |
|---------|------------------|-----------|
| **Upstash Redis** | IP addresses for rate limiting (ephemeral, sliding window) | **LOW** — Temporary data, auto-expires |
| **Google Fonts** (via next/font) | None — self-hosted by Next.js at build time | **NONE** — No runtime requests to Google |
| **Vercel** (hosting) | Server logs, request metadata | **LOW** — Standard hosting provider |

### Recommendations

1. **Google Analytics consent gating** — Verify that CookieYes actually blocks GA from loading until the user consents to "analytics" cookies. The current code loads GA in production unconditionally (layout.tsx:122) without checking `window.cookieyes.hasConsent('analytics')`.

2. **Vercel Speed Insights consent** — Currently loads without consent check. Determine if this qualifies as "strictly necessary" or needs consent gating.

3. **Sentry Session Replay consent** — Session replay captures user interactions. Consider gating replay behind analytics consent, or ensure the `maskAllText` + `blockAllMedia` configuration is sufficient for your DPA.

4. **CSP for Turnstile** — Add `challenges.cloudflare.com` to CSP `script-src` and `connect-src` directives before Turnstile goes live on non-preview routes.

5. **Stripe webhook secret** — `STRIPE_WEBHOOK_SECRET` is documented but no webhook handler route (`/api/billing/webhook`) was found in the codebase. Either implement it or remove the env var from documentation.

6. **`NEXT_PUBLIC_TWITTER_HANDLE`** — Legacy duplicate of `NEXT_PUBLIC_X_HANDLE`. Consider removing the fallback to reduce configuration surface.

---

## Summary

- **10 external services** with network calls (Supabase, Stripe, Sentry, Google Analytics, Vercel Speed Insights, CookieYes, Cloudflare Turnstile, Upstash Redis, Resend, Google Fonts via next/font)
- **1 CDN script** (CookieYes)
- **1 dynamically loaded script** (Cloudflare Turnstile)
- **0 iframes**
- **19 production environment variables** across all services
- **7 test-only environment variables**
- **4 items with GDPR/privacy implications** requiring attention
- **1 CSP gap** (Cloudflare Turnstile domain missing)
