# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

### Commits

- fix: add missing entry for aligning employee name column with timeline rows in changelog [`b137040`](https://github.com/thisjamieguy/complyeur-v2/commit/b137040adf24798dfbff60cbb14f647db65debb2)
- fix: add missing entry for locking employee name column during horizontal scroll in changelog [`1445bff`](https://github.com/thisjamieguy/complyeur-v2/commit/1445bff0b8a62095a8280442835fd69a5a8540e1)
- fix: add missing entry for SEO and accessibility improvements in changelog [`7f89015`](https://github.com/thisjamieguy/complyeur-v2/commit/7f890154aa733c7c0f2c4f01ba607525d22394f0)
- fix: improve SEO and accessibility from website audit [`6c9d67f`](https://github.com/thisjamieguy/complyeur-v2/commit/6c9d67f67e55f810a98adba17390d6535107b344)
- fix: improve landing page mobile responsiveness [`44d793d`](https://github.com/thisjamieguy/complyeur-v2/commit/44d793d96697d02b2d34cf70bd9d7968f38f4b20)
- feat: improve import system, calendar, and data refresh [`1aec5fa`](https://github.com/thisjamieguy/complyeur-v2/commit/1aec5fa5d680356b7cd9b5bc73e09e30eb177855)
- fix: update landing page headline to emphasize consequences [`bcb3dc2`](https://github.com/thisjamieguy/complyeur-v2/commit/bcb3dc2c01f78c57dff50ebbd1159e1d6c5b1338)
- fix: remove preview mode banner for live landing page [`8b547fa`](https://github.com/thisjamieguy/complyeur-v2/commit/8b547fa90b100526b7d3e6e702ef184faf339040)
- feat: launch landing page in waitlist-only mode [`c1636e2`](https://github.com/thisjamieguy/complyeur-v2/commit/c1636e2bfa5444d64eef785db57a3e8b4387a0a0)
- fix: prevent false country matches from 3+ letter codes in gantt parser [`679240c`](https://github.com/thisjamieguy/complyeur-v2/commit/679240cd8c258f02c26cbc38fad1f645774bc300)

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
