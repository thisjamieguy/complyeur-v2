# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

### Commits

- feat(security): add database security hardening migrations [`e294d65`](https://github.com/thisjamieguy/complyeur-v2/commit/e294d65745350f6f20d6adcb775abec7da122d28)
- chore: update gitignore with tooling and cache directories [`a922d29`](https://github.com/thisjamieguy/complyeur-v2/commit/a922d296b077b2f5d0cb3e5ded017646aff88d53)
- docs: add quick-add trip modal design document [`b469287`](https://github.com/thisjamieguy/complyeur-v2/commit/b469287fb11c4db38d96cdb07eafaf177f43267e)
- fix: add missing entry for aligning employee name column with timeline rows in changelog [`7a5f851`](https://github.com/thisjamieguy/complyeur-v2/commit/7a5f851fd8e92ee6a6018065d5b958742c7ad2af)
- fix: add missing entry for aligning employee name column with timeline rows in changelog [`b137040`](https://github.com/thisjamieguy/complyeur-v2/commit/b137040adf24798dfbff60cbb14f647db65debb2)
- fix: add missing entry for locking employee name column during horizontal scroll in changelog [`1445bff`](https://github.com/thisjamieguy/complyeur-v2/commit/1445bff0b8a62095a8280442835fd69a5a8540e1)
- fix: add missing entry for SEO and accessibility improvements in changelog [`7f89015`](https://github.com/thisjamieguy/complyeur-v2/commit/7f890154aa733c7c0f2c4f01ba607525d22394f0)
- Merge pull request #7 from thisjamieguy/claude/supabase-security-audit-OIz8Y [`9a7a537`](https://github.com/thisjamieguy/complyeur-v2/commit/9a7a5376dcb46dc3b2b9d5ba003afc53b3686163)
- docs: add comprehensive Supabase security baseline audit report [`d9499ea`](https://github.com/thisjamieguy/complyeur-v2/commit/d9499eab88e51a8d64ab09ae696710680f71e410)
- fix: improve SEO and accessibility from website audit [`6c9d67f`](https://github.com/thisjamieguy/complyeur-v2/commit/6c9d67f67e55f810a98adba17390d6535107b344)

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
