# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

### Commits

- fix: lock employee name column during horizontal scroll [`03b9abd`](https://github.com/thisjamieguy/complyeur-v2/commit/03b9abd01c0a35bd0244fc04026e3ae96deed586)
- perf: virtualize calendar employee rows with TanStack Virtual [`672959a`](https://github.com/thisjamieguy/complyeur-v2/commit/672959afe4715a1d4af465284577985778a93078)
- feat: add danger zone, bulk delete, and preview landing page [`d6e2b50`](https://github.com/thisjamieguy/complyeur-v2/commit/d6e2b50fe72be50db01f6b7414af8d78dd71b95b)
- docs: add delete data feature design [`084f44b`](https://github.com/thisjamieguy/complyeur-v2/commit/084f44b404d5de67949bb930557ac949d8aea154)
- docs: update changelog [`882cdfc`](https://github.com/thisjamieguy/complyeur-v2/commit/882cdfc3dcca72fb5641036d80581e2dd025d2a3)
- chore: test infrastructure and config updates [`e05e008`](https://github.com/thisjamieguy/complyeur-v2/commit/e05e008977cb1939da1f6b8dc8524b19ecd9434f)
- feat: seo, accessibility, and marketing pages [`7a0c0d9`](https://github.com/thisjamieguy/complyeur-v2/commit/7a0c0d9963e9bc5fc95591eba7eb66ad610f0bed)
- chore(db): migrations cleanup and RLS optimization [`f66de21`](https://github.com/thisjamieguy/complyeur-v2/commit/f66de21bdc4feb0ad46b8af8b6da15269f2c76f6)
- refactor: compliance engine and import parser improvements [`18f35fd`](https://github.com/thisjamieguy/complyeur-v2/commit/18f35fd82fa05accfe1598c7b2e8dead090a6560)
- feat: add Google Analytics 4 integration [`a5d009f`](https://github.com/thisjamieguy/complyeur-v2/commit/a5d009f9599c514bebcde3fb41c41319695e6eb9)

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
