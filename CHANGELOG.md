# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

### Commits

- docs: add performance audit report and reference in CLAUDE.md [`f6224b2`](https://github.com/thisjamieguy/complyeur-v2/commit/f6224b20c16564afb57795ed24e9fedee06e3a2c)
- chore(changelog): sync auto-changelog [`1ed3485`](https://github.com/thisjamieguy/complyeur-v2/commit/1ed34859319484c1c5084a15252a780422780388)
- fix(test): include nationality_type in employee form validation test [`3e30515`](https://github.com/thisjamieguy/complyeur-v2/commit/3e305152b1cc398ad99dabce61c497af66a26ab2)
- perf: 6 high-priority performance fixes from audit [`43f6802`](https://github.com/thisjamieguy/complyeur-v2/commit/43f68020420b785efc2b2466b5ca7260e7a968aa)
- chore: clean up project root — move docs, delete orphaned files, remove clutter [`266520e`](https://github.com/thisjamieguy/complyeur-v2/commit/266520eeae2f0fada1408a110b3b0d5a47b284e9)
- chore: add Agent Context Protocol (ACP) with project-specific documentation [`3469235`](https://github.com/thisjamieguy/complyeur-v2/commit/346923564e1c2e582b01d50f8a1a4f823232718f)
- fix: site owner bypasses onboarding redirect in middleware [`55e77ab`](https://github.com/thisjamieguy/complyeur-v2/commit/55e77ab1bacf28cdd4ac561b47ee7abcf2372b2b)
- fix: site owner skips onboarding and goes straight to dashboard [`f71c44c`](https://github.com/thisjamieguy/complyeur-v2/commit/f71c44cacc77a47945771cf5fefacffb3cbd51f6)
- fix: auto-promote site owner to superadmin on Google OAuth sign-in [`c51c484`](https://github.com/thisjamieguy/complyeur-v2/commit/c51c484d26e473da6607a89e16bdd90bde681001)
- fix: add admin error boundary and server-side error logging [`75a8e3d`](https://github.com/thisjamieguy/complyeur-v2/commit/75a8e3d185cf17e07c4720fb07bb117a809488fc)

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
