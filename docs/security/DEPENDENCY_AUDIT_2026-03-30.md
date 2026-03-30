# Dependency Audit - 2026-03-30

## Summary

`pnpm audit` completed successfully on 2026-03-30 and reported 25 vulnerabilities:

- 1 critical
- 15 high
- 8 moderate
- 1 low

This replaced the earlier "403 / unknown status" state in the production readiness notes. The dependency posture is now known, but it is not yet acceptable for release without either remediation or documented exceptions.

## Highest-Risk Findings

### `auto-changelog > handlebars`

- Severity: critical
- Advisory: `GHSA-2w6w-674q-4c4q`
- Installed path: `auto-changelog > handlebars`
- Notes: `auto-changelog` is a dev-only tool, but the dependency tree currently pins `handlebars@4.7.8`, which is below the patched `4.7.9` floor.

### `@sentry/nextjs` transitive toolchain packages

- Severities: high / moderate
- Packages: `minimatch`, `rollup`, `picomatch`
- Notes: These appear through build-time plugin chains such as `@sentry/bundler-plugin-core`, `glob`, `unplugin`, and related file-watching utilities.

### `eslint` / `eslint-config-next` transitive packages

- Severities: high / moderate
- Packages: `minimatch`, `picomatch`
- Notes: These findings are in development tooling rather than shipped runtime code, but they should still be reviewed and either upgraded or explicitly accepted.

## Initial Triage

1. Remove or replace `auto-changelog`, or force a patched `handlebars` version if the tool must stay.
2. Review whether newer `@sentry/nextjs` and `eslint-config-next` releases close the current transitive advisories.
3. Separate runtime risk from dev-only risk in the exception record.
4. Add CI enforcement only after accepted exceptions are written down or the tree is remediated.

## Verification

- Command: `pnpm audit`
- Date: `2026-03-30`
- Environment: local developer machine
