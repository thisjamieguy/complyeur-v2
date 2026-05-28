# Testing Standards

Testing should match the risk of the change. Compliance, security, billing, and data migrations require stronger evidence than cosmetic UI changes.

## Baseline Expectations

- Run targeted unit tests for changed domain logic.
- Run Playwright or integration coverage for changed authentication, import, billing, or dashboard workflows.
- Run lint/type checks before handing off material application changes.
- For documentation-only changes, `git diff --check` is the minimum verification.

## High-Risk Areas

Broaden testing when touching:

- 90/180-day compliance calculations
- date parsing, overlapping trips, and boundary days
- RLS policies, auth middleware, role checks, and admin paths
- imports, CSV/Excel parsing, and bulk insert flows
- billing webhooks and entitlement enforcement
- migrations that alter tenant-owned tables

## Test Data

- Use `.test`, `.example`, `.invalid`, or clearly synthetic domains for test identities.
- Do not use real customer data in tests, fixtures, screenshots, or documentation.
- Keep production and Test/Preview credentials separate in local and CI runs.

## Evidence

- Record the exact command run and its outcome in PR notes or handoff summaries.
- If a test cannot run locally, state the blocker and identify the smallest useful substitute.
