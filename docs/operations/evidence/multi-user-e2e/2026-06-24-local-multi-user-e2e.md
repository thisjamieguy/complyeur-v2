# Local Multi-User E2E Evidence

Date: 2026-06-24
Environment: local Next.js app with local Supabase at `http://127.0.0.1:54321`
Executor: Codex

## Command

```bash
pnpm test:e2e:multi-user
```

## Result

Passed.

```text
2 passed (1.1m)
```

## Coverage

The Playwright suite exercised:

- Dashboard search isolation so a signed-in tenant only sees its own employees.
- Direct employee detail route and DSAR download denial for cross-tenant access.

## Notes

- Supabase local development services were running before execution.
- The command printed development warnings from Sentry/Next.js instrumentation,
  local in-memory rate-limit fallback, and image sizing warnings. These did not
  fail the suite.
- `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` were not set, so global auth setup
  was skipped; the multi-user suite created its own local Supabase users.

## Remaining External Evidence

This local pass closes the local multi-user E2E gate. Public release still needs
staging or production-like RLS/RPC attack evidence against the deployed database
environment.
