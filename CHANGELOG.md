# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

### Commits

- chore(changelog): capture latest commit metadata [`44c1367`](https://github.com/thisjamieguy/complyeur-v2/commit/44c1367bc421b1c405822ecc39ce30c176179a58)
- chore(changelog): update unreleased commit list [`1e86aa6`](https://github.com/thisjamieguy/complyeur-v2/commit/1e86aa62e715c94f7be5f45ec038053895f9981d)
- chore: checkpoint current workspace changes [`78b389e`](https://github.com/thisjamieguy/complyeur-v2/commit/78b389ec6e69f4278f0103c0f102cb34ad2458a2)
- feat(billing): connect pricing page to Stripe checkout [`cbdc75e`](https://github.com/thisjamieguy/complyeur-v2/commit/cbdc75e13db99cbf62c86b12ffa235dc9120eccb)
- chore(changelog): update changelog to include missing entries for v1.0.0 release [`a653c13`](https://github.com/thisjamieguy/complyeur-v2/commit/a653c1322fc1003fe729005c038aa1c1ac16c87e)
- chore(changelog): update changelog format and add missing entries for v1.0.0 release [`1e34732`](https://github.com/thisjamieguy/complyeur-v2/commit/1e3473283898f260bbf5b982192a9e742f250bb6)
- fix(changelog): add missing feat entry for status thresholds implementation [`a2e2678`](https://github.com/thisjamieguy/complyeur-v2/commit/a2e267889cd5498ea18ece9b977123ce19efd2c4)
- Merge pull request #9 from thisjamieguy/claude/security-audit-complyeur-3Qgjh [`8278a81`](https://github.com/thisjamieguy/complyeur-v2/commit/8278a81b52b765538db9201b458dd3cfee87f8e7)
- docs(security): add comprehensive pre-launch security audit report [`5afcb50`](https://github.com/thisjamieguy/complyeur-v2/commit/5afcb504094d1562f88bfd3d6ab9010a064043fc)
- chore(changelog): finalize changelog after commit split [`5c3b758`](https://github.com/thisjamieguy/complyeur-v2/commit/5c3b758f0b0032fbefaa774502369c7847c2eaf0)

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
