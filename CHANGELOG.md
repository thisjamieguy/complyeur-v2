# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

### Commits

- chore(types): regenerate Supabase types for roles, invites, and feedback [`f5f748d`](https://github.com/thisjamieguy/complyeur-v2/commit/f5f748df94d922f79b7d4e3c3114bcd4927e107e)
- perf(forecast): optimize compliant-date scan with characterization tests [`286354f`](https://github.com/thisjamieguy/complyeur-v2/commit/286354fa7ddca09d68379954100ccb1480a0a976)
- feat(feedback): add in-app feedback capture flow and storage [`534deca`](https://github.com/thisjamieguy/complyeur-v2/commit/534decaf261ef156f6ccc1be769f3c495998f6ca)
- feat(team): add owner role, invites, and ownership transfer workflow [`fb982f1`](https://github.com/thisjamieguy/complyeur-v2/commit/fb982f13e1af3f511438cc878d1b677e4ff62e30)
- fix(auth): harden oauth callback and relax activity update failures [`0b05fdf`](https://github.com/thisjamieguy/complyeur-v2/commit/0b05fdffd2bca23f5ab38e5d2e9727a34239735e)
- feat(settings): move GDPR into settings and add section tabs [`7f468cf`](https://github.com/thisjamieguy/complyeur-v2/commit/7f468cff1331402873c9fbff661c52a1e028e786)
- feat: add paid tiers, pricing page, UI refresh, migration consolidation [`0034b5b`](https://github.com/thisjamieguy/complyeur-v2/commit/0034b5b736fa96cd7788f9301675fc14adfd2bd9)
- feat: add nationality type to employees with EU/Schengen exemption [`6049c61`](https://github.com/thisjamieguy/complyeur-v2/commit/6049c612ac0188a2d049b90db9397794fa22fbda)
- fix: resolve hydration error, infinite spinner, and middleware auth gaps [`0c2c9db`](https://github.com/thisjamieguy/complyeur-v2/commit/0c2c9dbdfd4d3e00b03dd6f437d3dc6a9d9c7f1c)
- fix: prevent duplicate ComplyEUR in page titles [`372f056`](https://github.com/thisjamieguy/complyeur-v2/commit/372f05632130d7d8fe5f63bf44739ef0dfb77855)

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
