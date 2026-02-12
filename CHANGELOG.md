# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

### Commits

- chore(changelog): sync unreleased entries [`39257af`](https://github.com/thisjamieguy/complyeur-v2/commit/39257af4cc4bb4bbc1ed646d53305e4d101bdfa8)
- chore: sync local changes for landing redirect and stop hook [`ade618d`](https://github.com/thisjamieguy/complyeur-v2/commit/ade618d861ed947e07ef2d0785325dc2360e23ab)
- chore(changelog): sync unreleased entries [`48dbbb9`](https://github.com/thisjamieguy/complyeur-v2/commit/48dbbb996a300745b3850c298f80da226ab94a31)
- chore(changelog): sync unreleased entries [`ae5284c`](https://github.com/thisjamieguy/complyeur-v2/commit/ae5284cf500ecda2123c8a4ecb99e626e5a0c3e5)
- docs: update CLAUDE.md to match actual codebase [`8470eef`](https://github.com/thisjamieguy/complyeur-v2/commit/8470eef445834d6b57a1882cf0b300c3106c6f7f)
- chore(changelog): sync unreleased entries [`58d7263`](https://github.com/thisjamieguy/complyeur-v2/commit/58d726371b29f62d983d525d4a0072a4aebb5bf3)
- docs: update memory files to match actual codebase [`082f719`](https://github.com/thisjamieguy/complyeur-v2/commit/082f71944b12c2c717b4269091f13535d7fe26e8)
- chore(changelog): settle auto-changelog entries [`cf52edd`](https://github.com/thisjamieguy/complyeur-v2/commit/cf52edddd12619ffeddfb7e38860b1a024841357)
- chore(changelog): finalize unreleased changelog sync [`34bf7cb`](https://github.com/thisjamieguy/complyeur-v2/commit/34bf7cbda0bd89c115216066e3b68e2429a91104)
- chore(changelog): sync unreleased entries [`70f5076`](https://github.com/thisjamieguy/complyeur-v2/commit/70f5076fc0999f17cba7f7d37618cf3b5b7150ae)

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
