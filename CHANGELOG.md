# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

### Commits

- fix: remove duplicate entry for aligning employee name column in changelog [`588de7d`](https://github.com/thisjamieguy/complyeur-v2/commit/588de7dfb7d947b7109d886226c7448356218127)
- fix: remove duplicate entry for aligning employee name column in changelog [`3d76f53`](https://github.com/thisjamieguy/complyeur-v2/commit/3d76f5360d24bdf37ae940569634309f7f019ed2)
- chore: update changelog to include recent git command additions [`d2f8bf5`](https://github.com/thisjamieguy/complyeur-v2/commit/d2f8bf555709243f4b4802bef8e558d3b086951e)
- feat(git): add git commands for pull, push, stash, and restore [`ebf1357`](https://github.com/thisjamieguy/complyeur-v2/commit/ebf1357ae1cac634412764e87769175ac55d81c5)
- chore: update changelog [`48ad090`](https://github.com/thisjamieguy/complyeur-v2/commit/48ad09014383ddeefd8cc7e10f3d2fa31475104d)
- chore: add suspicious trips diagnostic query [`79d3de6`](https://github.com/thisjamieguy/complyeur-v2/commit/79d3de6df6c2bd026159af59bfe7c969d972fcb8)
- docs: add admin guide and heuristic evaluation [`98ca243`](https://github.com/thisjamieguy/complyeur-v2/commit/98ca243a7ccff4257bb27e25a6dca6630c607b8e)
- feat(ui): add quick-add trip modal and collapsible component [`e3be410`](https://github.com/thisjamieguy/complyeur-v2/commit/e3be4102f8a7acbfab44889d7dadc3669192aa2c)
- feat(security): add database security hardening migrations [`e294d65`](https://github.com/thisjamieguy/complyeur-v2/commit/e294d65745350f6f20d6adcb775abec7da122d28)
- chore: update gitignore with tooling and cache directories [`a922d29`](https://github.com/thisjamieguy/complyeur-v2/commit/a922d296b077b2f5d0cb3e5ded017646aff88d53)

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
