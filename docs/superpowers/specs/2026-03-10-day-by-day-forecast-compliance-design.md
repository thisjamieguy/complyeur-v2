# Day-by-Day Forecast Compliance — Design Spec

**Date:** 2026-03-10
**Status:** Approved
**Scope:** `lib/services/forecast-service.ts`, `types/forecast.ts`, `components/forecasting/forecast-result-card.tsx`, tests

---

## Problem

The current forecast algorithm computes compliance using a **static snapshot** at the trip entry date:

```
daysAfterTrip = daysUsedBeforeTrip + tripDuration
```

This overstates the risk for trips where old days drop off the 180-day rolling window faster than new trip days accumulate. A person at 82 days with 5 days rolling off during an 8-day trip would never exceed 83/90 on any single day — but the static algorithm flags them at 90/90 (Critical).

The 90/180-day rule is evaluated **per day**: a traveller is in violation only if, on any given day, the preceding 180-day window contains 90 or more Schengen days. The fix is to check each day of the planned trip individually.

---

## Decision: Peak Days

The number displayed as "days used" for a forecast trip is the **peak** — the maximum `daysUsedInWindow` across all days of the planned trip. This is the legally operative figure: it represents the worst-case exposure at any single point during the trip.

Showing the exit-date figure risks false assurance when days drop off mid-trip. Showing both figures adds cognitive load. Peak is the correct single number.

---

## Approach: Day-by-Day Loop in Forecast Service

All changes are contained within `lib/services/forecast-service.ts`. No new compliance engine primitives. No structural refactoring.

---

## Algorithm Changes

### `calculateFutureJobCompliance`

**Current:**
```
daysUsedBeforeTrip = daysUsedInWindow(historicalPresence, entryDate)
daysAfterTrip = daysUsedBeforeTrip + tripDuration
isCompliant = daysAfterTrip < 90
```

**New:**
```
historicalPresence = presenceDays(historicalTrips)
presenceWithTrip   = historicalPresence ∪ {entry, entry+1, …, exit}

peakDaysUsed = 0
firstViolationDay = null

for D in [entry → exit] (1-indexed as day 1, 2, ...):
    daily = daysUsedInWindow(presenceWithTrip, D)
    peakDaysUsed = max(peakDaysUsed, daily)
    if daily >= 90 and firstViolationDay is null:
        firstViolationDay = D (1-indexed day number of the trip)

daysAfterTrip = peakDaysUsed        ← field name kept, semantics updated
isCompliant   = peakDaysUsed < 90
```

`daysUsedBeforeTrip` is unchanged — it remains the snapshot at entry date, displayed in the "Days Before Trip" column.

### `calculateCompliantFromDate`

The outer loop (candidate start dates) is unchanged. For each candidate start date S:

**Current inner check:**
```
daysAfterTrip = daysUsedBefore + tripDuration
compliant = daysAfterTrip < limit
```

**New inner check:**
```
shiftedPresence = historicalPresence ∪ {S, S+1, …, S+(duration-1)}
for D in [S → S+(duration-1)]:
    if daysUsedInWindow(shiftedPresence, D) >= limit:
        compliant = false; break
compliant = true  ← only if all days pass
```

Return S when all days of the shifted trip are compliant.

---

## Type Changes — `types/forecast.ts`

### Updated field (no rename)

`daysAfterTrip: number` — field name preserved to avoid touching 10 downstream consumers (exports, PDFs, CSVs, table). Semantics updated: now represents the **peak days used on any single day during the trip**, not `daysUsedBeforeTrip + tripDuration`. JSDoc updated accordingly.

### New optional field

```typescript
/**
 * If not compliant, the 1-indexed day number of the trip when the 90-day
 * limit is first reached or exceeded. Null when trip is compliant or non-Schengen.
 */
firstViolationDay?: number;
```

---

## UI Changes — `forecast-result-card.tsx`

### Column label
- **Before:** `DAYS AFTER TRIP`
- **After:** `PEAK DURING TRIP`

### Violation message
- **Before:** "The employee will be 10 days over the limit after this trip."
- **After:** "The employee will exceed the limit on day {firstViolationDay} of this trip (peak: {daysAfterTrip}/90 days)."

No other UI files change. The future alerts table and exports display the number from `daysAfterTrip` — they benefit from the corrected value without code changes.

---

## Performance

`calculateCompliantFromDate` becomes O(maxCheckDays × tripDuration) inner iterations. Worst case: 180 start dates × 30-day trip = 5,400 calls to `daysUsedInWindow`. Each call iterates a Set of at most ~90 string keys. Acceptable for a synchronous server-side calculation.

`calculateFutureJobCompliance` adds at most 30 iterations (max typical trip length). Negligible.

---

## Tests

### Regression test (new)
Scenario: employee has 82 historical Schengen days at trip entry, with 5 of those days exactly 180 days before trip days 1–5. 8-day trip.

- **Static algo result:** 82 + 8 = 90 → Critical (wrong)
- **Day-by-day result:** peak = 83 → Green (correct)

### Existing tests
Update any tests asserting `daysAfterTrip` values that were computed as `daysUsedBeforeTrip + tripDuration` — recalculate the expected value using the day-by-day peak logic.

---

## Files Touched

| File | Change |
|------|--------|
| `lib/services/forecast-service.ts` | Core algorithm change (both functions) |
| `types/forecast.ts` | Add `firstViolationDay?: number`, update JSDoc on `daysAfterTrip` |
| `components/forecasting/forecast-result-card.tsx` | Label + violation message |
| `lib/services/__tests__/forecast-service.test.ts` | Add regression test, update affected assertions |

---

## Out of Scope

- Renaming `daysAfterTrip` across all consumers (separate cleanup task)
- Changes to the compliance engine (`lib/compliance/`)
- Changes to the future alerts table, exports, or PDFs
