# Overnight Hardening Status

Start time: 2026-06-15 23:29 BST  
Branch: `codex/engineering-audit-and-hardening-2026-06-15`

## Checks

| Check | Status | Notes |
| --- | --- | --- |
| `git status` | Pass | Baseline branch was clean before edits. |
| `pnpm install --frozen-lockfile` | Interactive | Prompted to remove/reinstall `node_modules`; rerun in CI mode. |
| `CI=true pnpm install --frozen-lockfile` | Pass | Lockfile current; noted ignored build scripts for `esbuild`. |
| `pnpm install --lockfile-only` | Pass with escalation | Required network access to resolve patched transitive dependency versions. |
| `pnpm knip` | Pass | No dependency-only findings. |
| `pnpm knip:full` | Findings | 68 unused-file candidates, 243 unused-export candidates, config hint. No deletion performed. |
| `pnpm typecheck` | Pass | `tsc --noEmit` passed after dependency remediation. |
| `pnpm lint` | Pass | `eslint .` passed after dependency remediation. |
| `pnpm test __tests__/components/ui-state.test.tsx` | Pass | 1 file, 4 tests under Vitest 4.1.9. |
| `pnpm test` | Fail | 139 files passed, 2 failed; 2122 tests passed, 2 failed. Both failures are calendar breach-day expectations in protected compliance/calendar behavior. |
| `pnpm build` | Pass | Next.js production build passed. |
| `pnpm security:check` | Pass after remediation | Initially failed with 8 transitive vulnerabilities. Overrides plus Vitest/Vite updates reduced audit to no known vulnerabilities. |
| `pnpm test:e2e` | Blocked | Stopped after repeated invalid-credential login failures; 24 passed, 16 skipped, 139 not run. |
| `pnpm test:e2e:a11y` | Pass with skips | 10 public-page checks passed; 7 authenticated checks skipped because test credentials are not set. |

## Files Changed

- `__tests__/components/ui-state.test.tsx`
- `app/(dashboard)/jobs/page.tsx`
- `app/(dashboard)/settings/import-history/import-history-list.tsx`
- `app/(dashboard)/settings/import-history/page.tsx`
- `components/forecasting/future-alerts-empty.tsx`
- `components/forecasting/future-alerts-table.tsx`
- `components/ui/data-error.tsx`
- `components/ui/empty-state.tsx`
- `docs/audits/ENGINEERING_AUDIT_2026-06-15.md`
- `docs/audits/DOCUMENTATION_AUDIT_2026-06-15.md`
- `docs/overnight-hardening/OVERNIGHT_HARDENING_STATUS.md`
- `docs/README.md`
- `package.json`
- `pnpm-lock.yaml`

## Safe Improvements

- Improved accessible naming and descriptions for shared empty/error states.
- Hid decorative icons from assistive technology in targeted UI states.
- Improved mobile button stacking for empty/error actions.
- Added minimum table widths for dense jobs and future-alerts tables.
- Hardened import-history `page` query parsing against `NaN`.
- Improved import-history mobile card and pagination layout.
- Added component tests for reusable empty/error states.
- Remediated transitive dependency audit findings with patched overrides and Vitest/Vite updates.

## Blockers

- `knip:full` is not deletion-grade until `knip.json` includes real app/script/test entrypoints.
- Full Vitest is blocked by two existing calendar breach-day expectation failures:
  - `components/calendar/__tests__/calendar-view.helpers.test.ts:117`
  - `components/calendar/__tests__/calendar-view.test.tsx:125`
- Full E2E is blocked by missing/invalid seeded auth credentials (`TEST_USER_EMAIL` and `TEST_USER_PASSWORD`).
- Local E2E server startup required escalation because sandboxed Playwright could not bind `127.0.0.1:3100`.
- Web server emitted repeated Sentry/OpenTelemetry `require-in-the-middle` static extraction warnings.
- Browser emitted logo image aspect-ratio warnings on public pages.

## Commits

- `317b801` `fix(ui): harden empty and responsive states`
- `eb8cfe7` `chore(deps): remediate audit advisories`
- `docs(engineering): document hardening sprint`

## Final Results

Audit documents created, safe UI/accessibility/responsive hardening completed, transitive dependency vulnerabilities remediated, typecheck/lint/build/security checks passing, targeted UI tests passing, public a11y checks passing. Full unit and E2E suites have documented blockers in protected calendar behavior and seeded auth credentials.

## Follow-Up Verification - 2026-06-16

The full Vitest blocker above was rechecked on 2026-06-16. The failure was reproduced as test discovery pollution from `.claude/worktrees/silly-hamilton-c3a937`, not an active calendar/compliance regression in the main worktree.

Follow-up fixes:

- `vitest.config.ts` now excludes `.claude` from test discovery.
- `__tests__/unit/security/service-role-allowlist.test.ts` now skips `.claude` while walking source files.

Follow-up result:

- `pnpm vitest run __tests__/unit/security/service-role-allowlist.test.ts`: Pass, 1 test.
- `pnpm test`: Pass, 142 files and 2,144 tests.
