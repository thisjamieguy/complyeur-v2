# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

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
