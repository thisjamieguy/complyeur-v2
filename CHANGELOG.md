# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

### Commits

- fix: enable RLS on stripe_webhook_events and sanitise server logs [`c4c016e`](https://github.com/thisjamieguy/complyeur-v2/commit/c4c016eeb15f9e8b7984eb72b60e64a88cf8290c)
- fix: add complyeur@gmail.com as site owner across all auth checks [`a1d991b`](https://github.com/thisjamieguy/complyeur-v2/commit/a1d991bd1d3e498336e830c9269007cf02726261)
- chore: sync pending docs and changelog updates [`c3ea064`](https://github.com/thisjamieguy/complyeur-v2/commit/c3ea064b215cbe9f527f25eb7c65342968a1552e)
- perf: complete phases 7-10 of performance audit (18 fixes) [`bb01a25`](https://github.com/thisjamieguy/complyeur-v2/commit/bb01a25700d3d85d7913c2bdbf693ad5002c4a78)
- perf: complete phase 6 architecture improvements (10 fixes) [`cb3a479`](https://github.com/thisjamieguy/complyeur-v2/commit/cb3a4793a13db4d8777c6a6e2dc9cbd2a9d31a98)
- fix(test): update import-api mocks for requireCompanyAccessCached auth flow [`3448119`](https://github.com/thisjamieguy/complyeur-v2/commit/34481193fdf1c32d738cef428854ec3fbc313f3a)
- perf: complete phase 5 database optimisation (7 fixes) [`bd104a2`](https://github.com/thisjamieguy/complyeur-v2/commit/bd104a2c020981714c70638c4998e056b6b8ae84)
- perf: complete phases 1-4 of performance audit (20 fixes) [`2cee929`](https://github.com/thisjamieguy/complyeur-v2/commit/2cee929223a1ce888e9a43d4df9c1297ea8cf263)
- docs: add performance audit report and reference in CLAUDE.md [`f6224b2`](https://github.com/thisjamieguy/complyeur-v2/commit/f6224b20c16564afb57795ed24e9fedee06e3a2c)
- chore(changelog): sync auto-changelog [`1ed3485`](https://github.com/thisjamieguy/complyeur-v2/commit/1ed34859319484c1c5084a15252a780422780388)

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
