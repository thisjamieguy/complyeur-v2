# Compliance Calculation Audit - 2026-06-16

## Scope

Reviewed the Schengen 90/180-day core calculation under `lib/compliance/` against:

- European Commission Short-stay Schengen calculator manual: `https://ec.europa.eu/assets/home/visa-calculator/docs/short_stay_schengen_calculator_user_manual_en.pdf`
- European Commission Schengen area page: `https://home-affairs.ec.europa.eu/policies/schengen/schengen-area_en`
- Local calculation specification: `docs/CALCULATION_LOGIC.md`
- Local ADR: `docs/engineering/adr/ADR-002-compliance-engine-boundaries.md`

Files reviewed:

- `lib/compliance/date-utils.ts`
- `lib/compliance/presence-calculator.ts`
- `lib/compliance/window-calculator.ts`
- `lib/compliance/safe-entry.ts`
- `lib/compliance/compliance-vector.ts`
- `lib/compliance/schengen-validator.ts`
- `lib/compliance/constants.ts`
- `lib/compliance/index.ts`
- `lib/compliance/__tests__/safe-entry.test.ts`
- `lib/compliance/__tests__/snapshots.test.ts`
- `lib/compliance/__tests__/oracle-calculator.ts`

## Official Rule Check

Confirmed source requirements:

- Maximum short stay is no more than 90 days in any 180-day period.
- The 180-day period is moving and must be checked against each day of stay.
- Entry day and exit day both count as stay days.
- Residence-permit and long-stay visa periods are excluded from the short-stay calculation.
- Cyprus, Ireland, and the United Kingdom do not count for Schengen short-stay days.
- Iceland, Liechtenstein, Norway, and Switzerland do count.
- The current Schengen area has 29 countries; Bulgaria and Romania joined on 1 January 2025.

## Round 1 Findings

### Fixed: `maxStayDays` used a static entry-date remainder

Evidence:

- Previous implementation returned `limit - daysUsed` from the entry date only.
- Official calculator examples require projecting each intended stay day because older stays can fall outside the moving 180-day window during a future consecutive stay.
- The manual's 2024 visa-holder examples expect 20, 20, 50, and 90 consecutive days for proposed entries on 2024-06-19, 2024-08-07, 2024-08-08, and 2024-09-08.

Change:

- `lib/compliance/safe-entry.ts` now simulates each proposed consecutive stay day, adds that day to a temporary presence set, and calls `daysUsedInWindow()` for that specific day. It returns the first stay length before the window would exceed the configured limit.

Tests added:

- `lib/compliance/__tests__/safe-entry.test.ts` now encodes the four European Commission manual planning examples.
- `lib/compliance/__tests__/__snapshots__/snapshots.test.ts.snap` was updated for an existing snapshot whose test title already expected sliding-window expiry behavior.

## Round 2 Review

Second pass re-read the changed files and call sites:

- No stale `canSafelyEnter` import remains in `safe-entry.ts`.
- Existing 0-day, 1-day, 90-day, and custom-limit tests still pass.
- Snapshot update is consistent with the test name and corrected algorithm.
- The change is contained to planning maximum-stay calculation; presence-day generation, window calculation, country validation, and high-level compliance result behavior were not modified.

## Follow-Up Hardening

Added date-aware Schengen membership counting:

- `isSchengenCountry()` remains a current-membership helper for UI/import classification.
- `isSchengenCountryOnDate()` now checks whether a country counted as Schengen on a specific calendar day.
- `presenceDays()` now adds a day only if that country counted as Schengen on that day. A trip spanning an accession date is clipped day-by-day.
- Regression tests cover Bulgaria and Romania before, on, and after 1 January 2025.
- The seeded strict UTC differential oracle was updated to model Bulgaria/Romania accession dates and to treat exactly 90 days as compliant.

Cleaned up Vitest mock hoisting warnings:

- Replaced nested `vi.unmock()` calls in `__tests__/unit/rate-limit.test.ts` with `vi.doUnmock()`.
- Replaced helper-scoped `vi.mock()` calls in `__tests__/utils/mock-supabase.ts` with `vi.doMock()`.

## Verification

Commands run:

- `pnpm vitest run lib/compliance/__tests__/safe-entry.test.ts`
  - Result: 1 test file passed, 43 tests passed.
- `pnpm vitest run lib/compliance/__tests__/schengen-validator.test.ts lib/compliance/__tests__/presence-calculator.test.ts`
  - Result: 2 test files passed, 123 tests passed.
- `pnpm vitest run lib/compliance/__tests__/accuracy-scenarios.test.ts`
  - Result: 1 test file passed, 18 tests passed.
- `pnpm test:compliance`
  - Result after initial fix: 13 test files passed, 486 tests passed.
  - Result after follow-up hardening: 13 test files passed, 493 tests passed.
- `pnpm test:unit`
  - Result after initial fix: 100 test files passed, 1535 tests passed.
  - Result after follow-up hardening: 100 test files passed, 1542 tests passed.
  - Result after mock cleanup: 100 test files passed, 1542 tests passed with no Vitest hoisting warnings.
- `pnpm typecheck`
  - Result: passed.
- `pnpm lint`
  - Result: passed.

## Remaining Caveats

- The calculator intentionally does not implement bilateral visa waiver exceptions, visa-sticker validity limits, residence permit logic, long-stay visa logic, or legal advice.
- Bulgaria/Romania air/sea membership from March 2024 is not modelled because trips do not currently store border mode. The conservative implementation counts Bulgaria/Romania from full membership on 1 January 2025.
