# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

### Commits

- chore(changelog): sync auto-changelog [`fea752b`](https://github.com/thisjamieguy/complyeur-v2/commit/fea752be4adc567de8d32e09af480838ab5bc004)
- chore(changelog): sync auto-changelog [`2ad78fc`](https://github.com/thisjamieguy/complyeur-v2/commit/2ad78fc6cec4a38f86e04e18246181c6839be9b5)
- fix: team invites, bulk-delete batching, promo codes, MFA unenroll, and RLS policy [`9918789`](https://github.com/thisjamieguy/complyeur-v2/commit/991878921c5a8ccb3d2704b3571b64a18d9e3e17)
- chore(changelog): sync auto-changelog [`e413f2c`](https://github.com/thisjamieguy/complyeur-v2/commit/e413f2ca3ebaa8a87c5ab13934423d08624beb86)
- fix: close beta launch blockers and add analytics [`0dcde22`](https://github.com/thisjamieguy/complyeur-v2/commit/0dcde2244270eb13dc04ea1c37d4ab86b9436f78)
- chore: complete beta launch audit (sections 5-18) [`e089a06`](https://github.com/thisjamieguy/complyeur-v2/commit/e089a06efa170dc3f9b12d35e64c21dd90ed35af)
- test(e2e): harden multi-user UX and stabilize suite [`5ebe9c3`](https://github.com/thisjamieguy/complyeur-v2/commit/5ebe9c3d786e73e96cb9ebcfec73680efd7de6e2)
- fix: sandbox calendar auto-fit with dynamic column width and month headers [`9de3e90`](https://github.com/thisjamieguy/complyeur-v2/commit/9de3e90096b5933f37a018abb9108e1e99d9e21b)
- chore(changelog): finalize unreleased changelog sync [`2cde438`](https://github.com/thisjamieguy/complyeur-v2/commit/2cde438de5753d1fbece15ef8b7b762ba7adf72f)
- chore(changelog): sync unreleased entries [`4d8aa5b`](https://github.com/thisjamieguy/complyeur-v2/commit/4d8aa5b86b9f5103fc07d3468f8e03faecb82870)

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
