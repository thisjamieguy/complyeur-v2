# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

### Commits

- feat: add Google Analytics 4 integration [`a5d009f`](https://github.com/thisjamieguy/complyeur-v2/commit/a5d009f9599c514bebcde3fb41c41319695e6eb9)
- docs: update changelog [`8e37648`](https://github.com/thisjamieguy/complyeur-v2/commit/8e37648912b5804c820c04a38998df3e84b88850)
- fix: auto-create employees for trip imports [`05498e7`](https://github.com/thisjamieguy/complyeur-v2/commit/05498e75a7f2dc709230b0822caa931702421b84)
- fix: accept undefined in validateRedirectUrl type signature [`deb5cad`](https://github.com/thisjamieguy/complyeur-v2/commit/deb5cade5c4002ef64b06b082822bec969be1e94)
- docs: update changelog [`74dc1ee`](https://github.com/thisjamieguy/complyeur-v2/commit/74dc1ee764fd6642020ead05b5d545a7f8fc605c)
- chore: use git tags only for changelog versioning [`650be4d`](https://github.com/thisjamieguy/complyeur-v2/commit/650be4daafa82ee728a1266c6665b76ff0eb8993)
- chore: bump version to 1.0.0 to match git tag [`08516de`](https://github.com/thisjamieguy/complyeur-v2/commit/08516debf00be83be812cdb50076849e2eae9f36)
- chore: configure auto-changelog with Keep a Changelog format [`6d592e4`](https://github.com/thisjamieguy/complyeur-v2/commit/6d592e4e8116537f258241c7627142fd4f27cb88)

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
