# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/thisjamieguy/complyeur-v2/compare/v1.0.0...HEAD)

### Commits

- chore(changelog): add recent commit entry for changelog update [`79308d4`](https://github.com/thisjamieguy/complyeur-v2/commit/79308d4e60c4198c8a7540bee63aedff756027ab)
- chore(changelog): update changelog with recent commit entries [`08274fb`](https://github.com/thisjamieguy/complyeur-v2/commit/08274fbb6ad8b9f55af753f8308dd22a640dc13f)
- chore(changelog): update changelog with recent commit entries [`242eaae`](https://github.com/thisjamieguy/complyeur-v2/commit/242eaae22b584053498c0db9cff11608fa817a83)
- style(import): reduce non-schengen advisory dialog size [`1279bbd`](https://github.com/thisjamieguy/complyeur-v2/commit/1279bbdbf434b63e04f1f16b85a0c568b3faf27a)
- fix(import): keep hook order stable on preview page [`e7dee06`](https://github.com/thisjamieguy/complyeur-v2/commit/e7dee060dc5172530938baab4cf0dc3edd764610)
- chore: checkpoint import workflow changes before hook bugfix [`f87be86`](https://github.com/thisjamieguy/complyeur-v2/commit/f87be8620e4f4f65f6b795d9a3ca6e40a9586b92)
- fix: resolve missing waitlist action imports in design variants [`aed2d5d`](https://github.com/thisjamieguy/complyeur-v2/commit/aed2d5dff4ec45bcaad9c91a5f8ae30fd3173c4b)
- chore(changelog): finalize unreleased changelog sync [`bd668ac`](https://github.com/thisjamieguy/complyeur-v2/commit/bd668acebffe0a64b7c4f3f619b48f23caf070d2)
- chore(changelog): sync unreleased entries [`772ae6c`](https://github.com/thisjamieguy/complyeur-v2/commit/772ae6c459def81e47a491b8da3087c2ad8d7515)
- feat: encrypt waitlist emails and refresh landing content [`0c209ae`](https://github.com/thisjamieguy/complyeur-v2/commit/0c209ae12fac55b730a622729dd814745b620c43)

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
