# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1.0] - 2026-04-14

### Added

- Landing page is now the primary public-facing page — `/landing` replaces the old sandbox and goes live as the main marketing page
- Mobile hamburger menu on the landing page: mobile users can now access all nav links and the primary CTA from any screen size
- Centralised marketing CTA (`lib/marketing-primary-cta.ts`): one place to change the primary call-to-action label and destination across the entire public site
- Admin routes now protected at the middleware level (`/admin` added to `protectedRoutePrefixes`), adding a fast-path auth gate before any server component fires
- Supabase health probe with automatic fallback: if the custom `ping()` RPC is unavailable, the health check falls back to a direct table query so the app stays observable during migrations

### Changed

- Landing page is statically pre-rendered at build time (`force-static`) — fastest possible response for the highest-traffic public page
- Middleware route protection switched from deny-by-default to an explicit allowlist, so unrecognised routes return a proper 404 instead of being redirected to the landing page
- Sentry is only initialised when all required environment variables are present — prevents startup errors in local and preview environments
- Primary CTA on all public pages and the public layout header updated to "Create account" linking to `/signup`
- Dependency overrides: `vite` pinned to `>=7.3.2` (two HIGH vulnerabilities patched, dev-only)

### Fixed

- `next` upgraded to 16.2.3 — patches a Denial of Service vulnerability in Server Components (CVE via GHSA-q4gf-8mx6-v5v3)
- Race condition in `getNotificationPreferences`: concurrent first-login requests no longer throw when both try to insert the default preferences row simultaneously
- Race condition in `getCompanySettings`: same fix applied — concurrent requests handle the unique constraint violation gracefully
- Waitlist form now shows a client-side validation error before submitting if the email field is empty
- Navigation links on the landing page and sub-pages are consistent — no broken or placeholder `#` anchors
- Health probe instrumentation loads safely even when Sentry environment variables are absent

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

### Security

- Resolved all 25 dependency vulnerabilities (1 critical, 15 high, 8 moderate, 1 low) — audit is now clean
- Removed `auto-changelog` (eliminated critical Handlebars.js injection CVEs)
- Added `pnpm.overrides` to force patched transitive deps: `rollup`, `flatted`, `minimatch`, `picomatch`, `ajv`
- Documented accepted exception: `eslint > @eslint/eslintrc > ajv` moderate ReDoS (dev-only, no production risk)

### Changed

- restore lint as a required CI gate and clear the current lint error backlog
- align production-readiness documentation with the current state of tests, proxy migration, and dependency audit findings
- updated `PRODUCTION_READINESS_ASSESSMENT.md` — both blockers resolved, verdict updated to Go

### Merged

- Add comprehensive penetration testing checklist for ComplyEur [`#10`](https://github.com/thisjamieguy/complyeur-v2/pull/10)

### Commits

- fix(security): remediate CEUR-PT-001..006 findings [`b8f2771`](https://github.com/thisjamieguy/complyeur-v2/commit/b8f2771d84fb936e262563ffea66aed3ac60c7d1)
- docs: add comprehensive penetration testing checklist for ethical hacker review [`96c780f`](https://github.com/thisjamieguy/complyeur-v2/commit/96c780f45fe6338e45046ea5e1908c195a886030)
- docs: update changelog [`2247638`](https://github.com/thisjamieguy/complyeur-v2/commit/22476388e31432c20ef1daaad98e16d0ed3080f6)
- fix(security): complete phase 2 auth and tenant isolation [`58fde92`](https://github.com/thisjamieguy/complyeur-v2/commit/58fde9280e5220e3eba295a07bb4ad52d037d7aa)
- fix: move cron-auth import to Node.js-only runtime to fix edge middleware crash [`1e5934c`](https://github.com/thisjamieguy/complyeur-v2/commit/1e5934ca02934488982f09cc5b0d0b38b1175de6)
- fix: accept all ISO country codes in import — non-Schengen trips now warn instead of error [`16f3bc4`](https://github.com/thisjamieguy/complyeur-v2/commit/16f3bc46aa29fc5d15f37ccd464d4e81583c8fe0)
- docs: mark Phase 1 credential rotation fully complete [`4204bf3`](https://github.com/thisjamieguy/complyeur-v2/commit/4204bf34eaa9ff4c4bf501733f4f419ca24d3f4e)
- docs: mark Phase 1 credential rotation fully complete [`b4faf8e`](https://github.com/thisjamieguy/complyeur-v2/commit/b4faf8edd341b5af248f3e75acf5a3865ded5347)
- docs: update security audit — 16 of 37 findings resolved [`7de4485`](https://github.com/thisjamieguy/complyeur-v2/commit/7de4485242f921c899b094e37e5821d7bf665cbb)
- fix: resolve 5 critical security findings before production launch [`aac1f39`](https://github.com/thisjamieguy/complyeur-v2/commit/aac1f393e26fb7c1e7f486de0e648e39472bb289)

## v1.0.0 - 2026-01-22

### Merged

- Add Vercel Speed Insights to Next.js [`#6`](https://github.com/thisjamieguy/complyeur-v2/pull/6)
- claude/audit-maintainability-scale-EOLmL [`#4`](https://github.com/thisjamieguy/complyeur-v2/pull/4)
- claude/audit-maintainability-scale-EOLmL [`#4`](https://github.com/thisjamieguy/complyeur-v2/pull/4)
- Soc 2 readiness audit [`#2`](https://github.com/thisjamieguy/complyeur-v2/pull/2)
- Soc 2 readiness audit [`#2`](https://github.com/thisjamieguy/complyeur-v2/pull/2)

### Commits

- docs: add CHANGELOG.md with Keep a Changelog format [`a915c4f`](https://github.com/thisjamieguy/complyeur-v2/commit/a915c4fc8109c828ee9c92d25d99e828029fa154)
- refactor: consolidate redirect validation logic [`a9d6c6c`](https://github.com/thisjamieguy/complyeur-v2/commit/a9d6c6cf1f0d3827f1108c9115e77e39c76cf580)
- feat: make redirect validation more flexible [`169f537`](https://github.com/thisjamieguy/complyeur-v2/commit/169f537270d86098a9451922675dcc06a688986a)
- fix: disable session timeout check until last_activity_at column is deployed [`39bb121`](https://github.com/thisjamieguy/complyeur-v2/commit/39bb1215a9acc2f0c49e10ec8aeed89c3e640ce9)
- fix: make last_activity_at update non-blocking in auth callback [`c21a94d`](https://github.com/thisjamieguy/complyeur-v2/commit/c21a94d930e553c5604fb0e1af44c90cd2d78ce1)
- fix: only rate limit POST requests to auth pages, not page views [`949aadd`](https://github.com/thisjamieguy/complyeur-v2/commit/949aadd2ec984f2df3ebe2d54cb81d04e631ce1f)
- fix: add CookieYes domains to Content Security Policy [`fb1d72c`](https://github.com/thisjamieguy/complyeur-v2/commit/fb1d72c18df2d1e613da0f09cacbc91e68ca14d7)
- fix: exclude auth callback from rate limiting [`028d90d`](https://github.com/thisjamieguy/complyeur-v2/commit/028d90dffb9a59bf736e32ccb66593f6b97cd5f4)
- fix: resolve Google OAuth login loop by preventing middleware race condition [`3270b9b`](https://github.com/thisjamieguy/complyeur-v2/commit/3270b9b8354aac6a6782fe169fa30d491e257c04)
- feat: integrate CookieYes GDPR consent banner [`5c503b4`](https://github.com/thisjamieguy/complyeur-v2/commit/5c503b42ed2c5b7818d461e9fb6e1bbac32d6eb1)
