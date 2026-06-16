# Algorithm Decisions

## Summary

The Schengen compliance engine is deterministic, auditable, and implemented in `lib/compliance/`. The key rule is that every compliance result must be reproducible from trip data, Schengen membership data, and a reference date.

## Confirmed Decisions

- Decision: Use a rolling 180-day window ending on the reference date.
  - Why: Schengen 90/180 compliance is not calendar-month or calendar-year based.
  - Repository alignment: `lib/compliance/window-calculator.ts` and `docs/CALCULATION_LOGIC.md`.
  - Confidence: High.

- Decision: Count entry and exit dates inclusively.
  - Why: A calendar day of presence consumes a day, including same-day entry/exit.
  - Repository alignment: `presenceDays()` expands trips from effective start through effective end.
  - Confidence: High.

- Decision: Deduplicate overlapping trip days with date keys.
  - Why: Overlapping imports or duplicate trip ranges must not double-count the same calendar day.
  - Repository alignment: `presenceDays()` uses `Set<string>` date keys.
  - Confidence: High.

- Decision: Normalize compliance dates to UTC date-only values.
  - Why: Browser and server timezone offsets must not move a trip across calendar days.
  - Repository alignment: `lib/compliance/date-utils.ts` and `normalizeToUTCDate()`.
  - Confidence: High.

- Decision: Keep Schengen membership data explicit and reviewable.
  - Why: Country membership and edge cases are compliance-sensitive and can change.
  - Repository alignment: `lib/constants/schengen-countries.ts`, `lib/compliance/constants.ts`, and `lib/compliance/schengen-validator.ts`.
  - Calculation detail: `presenceDays()` applies membership per presence day using accession metadata, so historical trips are clipped to the dates on which the country counted as Schengen. Bulgaria and Romania are counted from full membership on 1 January 2025 because trip records do not currently store border mode.
  - Confidence: High, with periodic legal/source review required.

- Decision: Treat exactly 90 days as exhausted but still compliant.
  - Why: The rule permits up to 90 days in a rolling 180-day period; the breach starts on day 91.
  - Repository alignment: `lib/compliance/window-calculator.ts`, `lib/compliance/risk-calculator.ts`, `lib/services/forecast-service.ts`, and boundary tests in `lib/compliance/__tests__/`.
  - Confidence: High.

- Decision: Keep forecasting and safe-entry calculations on the same presence-day model.
  - Why: Scenario planning must not fork core compliance logic.
  - Repository alignment: `lib/compliance/safe-entry.ts`, `lib/compliance/compliance-vector.ts`, tests in `lib/compliance/__tests__/`.
  - Confidence: High.

## Historical Context

Historical AI discussions captured useful edge cases: Bulgaria/Romania dates, microstates, non-Schengen EU countries, overlapping trips, same-day travel, residence permits, and SRT/tax expansion. Only the parts implemented and tested in this repo are authoritative.

## Risks / Caveats

- Schengen membership source review must stay current. The June 2026 review confirmed Bulgaria and Romania as full Schengen members from 1 January 2025, while Ireland and Cyprus remain excluded.
- Bulgaria/Romania air/sea membership from March 2024 is not modelled because trip records do not currently include border mode.
- Residence permits, national visas, posted-worker rules, and tax/SRT logic are not covered by the Schengen algorithm unless explicitly implemented and reviewed.
- Native `Date` appears in tests and internal UTC-normalized code; do not treat that as permission to parse user date strings casually.

## Follow-Up Review Needed

- Refresh the Schengen membership verification date in `lib/compliance/constants.ts` after checking primary sources.
- Add or confirm fixture coverage for residence-permit and host-country exception decisions before claiming support.
- Keep `docs/CALCULATION_LOGIC.md` synchronized with code changes.
