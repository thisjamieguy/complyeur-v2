# Day-by-Day Forecast Compliance Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the forecast compliance check to evaluate each day of a planned trip individually against the rolling 180-day window, eliminating false positives where old days drop off faster than new ones accumulate.

**Architecture:** The day-by-day loop is contained entirely in `lib/services/forecast-service.ts`. It builds a presence set for historical trips, adds all planned trip days to it, then calls the existing `daysUsedInWindow` primitive for each day of the trip to find the peak. `calculateCompliantFromDate` gets the same inner loop. A new `firstViolationDay` field on `ForecastResult` enables a more precise violation message in the UI.

**Tech Stack:** TypeScript, date-fns, existing compliance engine primitives (`presenceDays`, `daysUsedInWindow`, `addUtcDays`)

---

## Window boundary reference

The 180-day window for a reference date D is `[D - 179 days, D]` inclusive. This is 180 calendar dates. The window-calculator uses `addUtcDays(refDate, -(WINDOW_SIZE_DAYS - 1))` = `-179`. Keep this in mind when constructing test scenarios — the window start is 179 days before the reference date, not 180.

---

## Chunk 1: Type update and regression tests

### Task 1: Add `firstViolationDay` to `ForecastResult`

**Files:**
- Modify: `types/forecast.ts`

- [ ] **Step 1: Add the field**

In `types/forecast.ts`, add `firstViolationDay` after the `compliantFromDate` field in `ForecastResult`:

```typescript
  /** If not compliant, the 1-indexed day number of the trip when the 90-day
   * limit is first reached or exceeded. Undefined when trip is compliant or non-Schengen. */
  firstViolationDay?: number;
```

Also update the JSDoc on `daysAfterTrip` from:
```typescript
  /** Days that will be used AFTER this trip completes */
  daysAfterTrip: number;
```
to:
```typescript
  /** Peak days used on any single day during this trip (the highest daysUsedInWindow
   * value across all days from entry to exit). For non-Schengen trips equals daysUsedBeforeTrip. */
  daysAfterTrip: number;
```

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: no new errors (`firstViolationDay` is optional so all existing spreads still satisfy the type).

- [ ] **Step 3: Commit**

```bash
git add types/forecast.ts
git commit -m "types(forecast): add firstViolationDay field and clarify daysAfterTrip semantics"
```

---

### Task 2: Write regression tests for `calculateFutureJobCompliance`

**Files:**
- Modify: `lib/services/__tests__/forecast-service.test.ts`

These tests must **fail** with the current implementation and pass after Task 3.

- [ ] **Step 1: Verify the window boundary formula**

Open `lib/compliance/window-calculator.ts`. Confirm `isInWindow` uses:
```typescript
const windowStart = addUtcDays(normalizedRef, -(WINDOW_SIZE_DAYS - 1)); // -179 days
```
So window for `2026-07-01` = `[2026-01-03, 2026-07-01]`. This matters for correct test data.

- [ ] **Step 2: Verify the test scenario arithmetic**

Planned trip: `2026-07-01` to `2026-07-08` (8 days, Schengen).

Historical trips:
- **Trip A**: `2026-04-17` to `2026-06-30` = 75 days.
  All 75 days fall within `[2026-01-03, 2026-07-01]` ✓ (Apr 17 > Jan 3, Jun 30 < Jul 1).
- **Trip B**: `2026-01-03` to `2026-01-09` = 7 days.
  Window for `2026-07-01` starts on `2026-01-03`, so all 7 days are in-window ✓.

Historical days at entry: 75 + 7 = **82**.
Static algo result: 82 + 8 = **90** → non-compliant. (This is the bug.)

Day-by-day during the planned trip — as each day passes, the window moves forward and Trip B drops off one day at a time:
- Day 1 (`2026-07-01`): window `[2026-01-03, 2026-07-01]` → 75 (A) + 7 (B) + 1 (today) = **83**
- Day 2 (`2026-07-02`): window `[2026-01-04, 2026-07-02]` → 75 + 6 + 2 = **83** (`Jan 03` drops off)
- Day 3 (`2026-07-03`): window `[2026-01-05, 2026-07-03]` → 75 + 5 + 3 = **83**
- ... (pattern holds for all 8 days)
- Day 8 (`2026-07-08`): window `[2026-01-10, 2026-07-08]` → 75 + 0 + 8 = **83**

Peak = **83** on every day → compliant.

- [ ] **Step 3: Write the tests**

Add this describe block to `lib/services/__tests__/forecast-service.test.ts` (before the final closing of the file):

```typescript
describe('day-by-day rolling window — regression', () => {
  it('treats a trip as compliant when old days drop off during the trip', () => {
    // Planned trip: 2026-07-01 → 2026-07-08 (8 days, Schengen)
    // Window for 2026-07-01 starts 2026-01-03 (179 days prior)
    const futureTrip = createTrip({
      id: 'future-rolling',
      country: 'FR',
      entryDate: '2026-07-01',
      exitDate: '2026-07-08',
    });

    // Trip A: 75 days, entirely within the window for the full planned trip duration
    // 2026-04-17 to 2026-06-30 = 75 days
    const tripA = createTrip({
      id: 'hist-a',
      country: 'FR',
      entryDate: '2026-04-17',
      exitDate: '2026-06-30',
    });

    // Trip B: 7 days at the near edge of the window — they drop off one-per-day
    // during the planned trip as the window slides forward.
    // Window start on entry date = 2026-01-03, so 2026-01-03 to 2026-01-09 are in-window.
    const tripB = createTrip({
      id: 'hist-b',
      country: 'DE',
      entryDate: '2026-01-03',
      exitDate: '2026-01-09',
    });

    // Historical at entry: 75 + 7 = 82 days.
    // Static algo (buggy): 82 + 8 = 90 → non-compliant.
    // Day-by-day (correct): peak = 83 on every day → compliant.
    const result = calculateFutureJobCompliance(
      futureTrip,
      [futureTrip, tripA, tripB],
      'Test Employee'
    );

    expect(result.daysUsedBeforeTrip).toBe(82);
    expect(result.daysAfterTrip).toBe(83); // peak, not 82 + 8 = 90
    expect(result.isCompliant).toBe(true);
    expect(result.riskLevel).toBe('yellow'); // 83 >= 80 warning threshold
    expect(result.firstViolationDay).toBeUndefined();
  });

  it('correctly identifies the first violation day when a trip breaches the limit', () => {
    // Planned trip: 2026-07-01 → 2026-07-08 (8 days)
    // 89 recent historical days, none drop off during the trip.
    // Day 1: 89 + 1 = 90 → violation on day 1.
    const futureTrip = createTrip({
      id: 'future-violation',
      country: 'FR',
      entryDate: '2026-07-01',
      exitDate: '2026-07-08',
    });

    // 89 days, all recent — none fall out of the window during the trip
    // 2026-04-03 to 2026-06-30 = 89 days
    const historicalTrip = createTrip({
      id: 'hist-89',
      country: 'FR',
      entryDate: '2026-04-03',
      exitDate: '2026-06-30',
    });

    const result = calculateFutureJobCompliance(
      futureTrip,
      [futureTrip, historicalTrip],
      'Test Employee'
    );

    expect(result.daysUsedBeforeTrip).toBe(89);
    expect(result.isCompliant).toBe(false);
    expect(result.firstViolationDay).toBe(1); // violates on day 1
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

```bash
npm run test -- --reporter=verbose lib/services/__tests__/forecast-service.test.ts
```

Expected: both new tests **FAIL**. The first should show `received 90, expected 83`.

- [ ] **Step 5: Commit the failing tests**

```bash
git add lib/services/__tests__/forecast-service.test.ts
git commit -m "test(forecast): add failing regression tests for day-by-day rolling window"
```

---

### Task 3: Write a failing test for `calculateCompliantFromDate`

**Files:**
- Modify: `lib/services/__tests__/forecast-service.test.ts`

This ensures TDD discipline for Task 5.

- [ ] **Step 1: Write the test**

Using the same scenario (Trip A + Trip B + planned trip starting `2026-07-01`):
- Static algo: at entry `2026-07-01`, sees 82 historical days, 82+8=90 → not compliant. Checks next day `2026-07-02`: window shifts, Trip B loses `Jan 03` → 81 historical + 8 = 89 < 90 → returns `2026-07-02`.
- Day-by-day: at entry `2026-07-01`, peak across 8 days = 83 < 90 → returns `2026-07-01` (the original start date — trip is already compliant).

Add this inside the existing `describe('calculateCompliantFromDate', ...)` block (after the existing tests, before the closing `}`):

```typescript
  it('returns the original entry date when day-by-day shows the trip is already compliant', () => {
    // Same scenario as the calculateFutureJobCompliance rolling-window test.
    // Static algo returns 2026-07-02 (one day later than needed).
    // Day-by-day should return 2026-07-01 — the trip was always compliant.
    const futureTrip = createTrip({
      id: 'future-cfd-rolling',
      country: 'FR',
      entryDate: '2026-07-01',
      exitDate: '2026-07-08',
    });

    const tripA = createTrip({
      id: 'cfd-hist-a',
      country: 'FR',
      entryDate: '2026-04-17',
      exitDate: '2026-06-30',
    });

    const tripB = createTrip({
      id: 'cfd-hist-b',
      country: 'DE',
      entryDate: '2026-01-03',
      exitDate: '2026-01-09',
    });

    const result = calculateCompliantFromDate(
      [futureTrip, tripA, tripB],
      futureTrip
    );

    // Should return 2026-07-01, not 2026-07-02
    expect(dateKey(result)).toBe('2026-07-01');
  });
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test -- --reporter=verbose lib/services/__tests__/forecast-service.test.ts
```

Expected: the new `calculateCompliantFromDate` test **FAILS** (returns `'2026-07-02'`, expected `'2026-07-01'`).

- [ ] **Step 3: Commit**

```bash
git add lib/services/__tests__/forecast-service.test.ts
git commit -m "test(forecast): add failing regression test for calculateCompliantFromDate day-by-day"
```

---

## Chunk 2: Core algorithm fix

### Task 4: Rewrite `calculateFutureJobCompliance` to use day-by-day peak

**Files:**
- Modify: `lib/services/forecast-service.ts`

Read the full function (lines ~157–250) before editing.

- [ ] **Step 1: Replace the presence + days calculation block**

Find this block (roughly lines 183–206 — ends just before `daysRemainingAfterTrip`):

```typescript
  // Convert to compliance trips for the presence calculation
  const complianceTrips: ComplianceTrip[] = tripsBeforeJob.map(toComplianceTrip);

  // Calculate presence days using 'planning' mode to include all trips
  // We use the trip entry date as reference and look back 180 days
  const complianceConfig: ComplianceConfig = {
    mode: 'planning',
    referenceDate: tripEntryDate,
    complianceStartDate: DEFAULT_COMPLIANCE_START_DATE,
    limit,
  };

  const presence = presenceDays(complianceTrips, complianceConfig);

  // Calculate days used in the 180-day window BEFORE the trip starts
  // The window is [entryDate - 179, entryDate] (180 days inclusive)
  const daysUsedBeforeTrip = daysUsedInWindow(presence, tripEntryDate, complianceConfig);

  // Calculate days after the trip
  // If Schengen: add the trip duration
  // If non-Schengen: days remain the same (trip doesn't count)
  const daysAfterTrip = isSchengen
    ? daysUsedBeforeTrip + tripDuration
    : daysUsedBeforeTrip;
```

Replace with:

```typescript
  // Convert historical trips to compliance format
  const complianceTrips: ComplianceTrip[] = tripsBeforeJob.map(toComplianceTrip);

  // Base config — referenceDate here is used for presence set construction only
  const baseConfig: ComplianceConfig = {
    mode: 'planning',
    referenceDate: tripEntryDate,
    complianceStartDate: DEFAULT_COMPLIANCE_START_DATE,
    limit,
  };

  // Snapshot of days used at entry date — displayed in "Days Before Trip" column
  const historicalPresence = presenceDays(complianceTrips, baseConfig);
  const daysUsedBeforeTrip = daysUsedInWindow(historicalPresence, tripEntryDate, baseConfig);

  // For Schengen trips: check each day of the trip individually.
  // The 180-day window slides forward each day, so old days drop off as new ones
  // accumulate. A traveller is in violation only if any single day hits 90+.
  // We track the peak (worst-case day) as the compliance figure.
  let daysAfterTrip = daysUsedBeforeTrip; // non-Schengen: unchanged
  let firstViolationDay: number | undefined;

  if (isSchengen) {
    // Include all planned trip days in the presence set so daysUsedInWindow
    // correctly counts them when the reference date falls within the trip.
    // Using tripExitDate as the config referenceDate ensures presenceDays
    // (in planning mode) includes the full trip range.
    const plannedTripAsCompliance: ComplianceTrip = {
      id: futureTrip.id,
      entryDate: tripEntryDate,
      exitDate: tripExitDate,
      country: futureTrip.country,
    };
    const presenceWithTrip = presenceDays(
      [...complianceTrips, plannedTripAsCompliance],
      { ...baseConfig, referenceDate: tripExitDate }
    );

    let peakDays = 0;
    for (let i = 0; i < tripDuration; i++) {
      const checkDate = addUtcDays(tripEntryDate, i);
      const dailyUsed = daysUsedInWindow(presenceWithTrip, checkDate, baseConfig);
      if (dailyUsed > peakDays) peakDays = dailyUsed;
      if (dailyUsed >= limit && firstViolationDay === undefined) {
        firstViolationDay = i + 1; // 1-indexed day number within the trip
      }
    }
    daysAfterTrip = peakDays;
  }
```

**Important:** Leave the lines below this block (`daysRemainingAfterTrip`, `riskLevel`, `isCompliant`) exactly as they are — they read from `daysAfterTrip` which is now the peak value, so they compute correctly without changes.

- [ ] **Step 2: Thread `firstViolationDay` into the return object**

In the return statement (the object returned at the end of the function), add `firstViolationDay`:

```typescript
    firstViolationDay,
```

alongside the other fields.

- [ ] **Step 3: Run the regression tests**

```bash
npm run test -- --reporter=verbose lib/services/__tests__/forecast-service.test.ts
```

Expected: the two new `calculateFutureJobCompliance` tests now **PASS**. Verify the existing `treats exactly 90 days after trip as non-compliant` test still passes (89 historical + 1-day trip: daily used = 90 on day 1, peak = 90, non-compliant ✓).

If any other existing assertions on `daysAfterTrip` fail, recalculate the expected value as the day-by-day peak and update the assertion.

- [ ] **Step 4: Commit**

```bash
git add lib/services/forecast-service.ts lib/services/__tests__/forecast-service.test.ts
git commit -m "fix(forecast): use day-by-day peak for compliance instead of static snapshot

The 90/180 rule is evaluated per-day. Trips near the limit could be
falsely flagged as non-compliant when old days drop off the 180-day
window faster than new trip days accumulate. Now checks each trip day
individually and uses the peak as the compliance figure."
```

---

### Task 5: Remove the stale characterisation test and fix `calculateCompliantFromDate`

**Files:**
- Modify: `lib/services/__tests__/forecast-service.test.ts`
- Modify: `lib/services/forecast-service.ts`

The existing `'matches baseline behavior across deterministic randomized scenarios'` test (line ~221) compares `calculateCompliantFromDate` against `baselineCalculateCompliantFromDate` (the old static algorithm). After this task, the two will legitimately diverge for scenarios where days drop off during the candidate trip. Remove the test before implementing.

- [ ] **Step 1: Remove the characterisation test and its baseline helper**

In `lib/services/__tests__/forecast-service.test.ts`:

1. Delete the `baselineCalculateCompliantFromDate` function (lines ~50–103).
2. Delete the test case `'matches baseline behavior across deterministic randomized scenarios'` (lines ~221–230).
3. Delete the `createSeededRng`, `randomInt`, `randomFrom`, and `generateScenario` helper functions (lines ~105–158) — they were only used by the removed test.

Also remove any imports that become unused after these deletions (`isBefore` from date-fns, if no longer used elsewhere in the file).

- [ ] **Step 2: Run the remaining tests to confirm they still pass**

```bash
npm run test -- --reporter=verbose lib/services/__tests__/forecast-service.test.ts
```

Expected: all remaining tests (excluding the deleted ones) pass. The new `calculateCompliantFromDate` regression test still fails (expected — Task 5 Step 4 will fix it).

- [ ] **Step 3: Implement the day-by-day inner check in `calculateCompliantFromDate`**

In `lib/services/forecast-service.ts`, find the inner loop body in `calculateCompliantFromDate` (roughly lines 320–335):

```typescript
    const complianceConfig: ComplianceConfig = {
      ...complianceConfigBase,
      referenceDate: checkDate,
    };

    const presence = presenceDays(tripsBeforeCheck, complianceConfig);
    const daysUsedBefore = daysUsedInWindow(presence, checkDate, complianceConfig);

    // Check if trip would be compliant starting on this date
    const daysAfterTrip = daysUsedBefore + tripDuration;

    if (daysAfterTrip < limit) {
      return checkDate;
    }
```

Replace with:

```typescript
    const complianceConfig: ComplianceConfig = {
      ...complianceConfigBase,
      referenceDate: checkDate,
    };

    // Build presence including all days of the shifted trip starting at checkDate
    const shiftedTripEnd = addUtcDays(checkDate, tripDuration - 1);
    const shiftedTripAsCompliance: ComplianceTrip = {
      id: futureTrip.id,
      entryDate: checkDate,
      exitDate: shiftedTripEnd,
      country: futureTrip.country,
    };
    const presenceWithShiftedTrip = presenceDays(
      [...tripsBeforeCheck, shiftedTripAsCompliance],
      { ...complianceConfig, referenceDate: shiftedTripEnd }
    );

    // The shifted trip is compliant only if no single day during it hits the limit
    let shiftedTripCompliant = true;
    for (let d = 0; d < tripDuration; d++) {
      const dayToCheck = addUtcDays(checkDate, d);
      const dailyUsed = daysUsedInWindow(presenceWithShiftedTrip, dayToCheck, complianceConfig);
      if (dailyUsed >= limit) {
        shiftedTripCompliant = false;
        break;
      }
    }

    if (shiftedTripCompliant) {
      return checkDate;
    }
```

- [ ] **Step 4: Run the full test suite**

```bash
npm run test
```

Expected: all tests pass, including the new `calculateCompliantFromDate` regression test.

- [ ] **Step 5: Commit**

```bash
git add lib/services/forecast-service.ts lib/services/__tests__/forecast-service.test.ts
git commit -m "fix(forecast): calculateCompliantFromDate uses day-by-day check for shifted trip

Also removes the stale characterisation test that compared against
the old static algorithm — the two intentionally diverge now."
```

---

## Chunk 3: UI update

### Task 6: Update `forecast-result-card.tsx` label and violation message

**Files:**
- Modify: `components/forecasting/forecast-result-card.tsx`

- [ ] **Step 1: Update the column label**

Find (line ~76):
```tsx
          <div className="text-xs font-medium uppercase text-slate-500">
            Days After Trip
          </div>
```

Replace with:
```tsx
          <div className="text-xs font-medium uppercase text-slate-500">
            Peak During Trip
          </div>
```

- [ ] **Step 2: Update the violation message**

Find (lines ~124–126):
```tsx
              <div className="text-sm text-red-700">
                The employee will be {Math.abs(result.daysRemainingAfterTrip)}{' '}
                days over the limit after this trip.
              </div>
```

Replace with:
```tsx
              <div className="text-sm text-red-700">
                {result.firstViolationDay
                  ? `The employee exceeds the limit on day ${result.firstViolationDay} of this trip (peak: ${result.daysAfterTrip}/90 days).`
                  : `The employee will be ${Math.abs(result.daysRemainingAfterTrip)} days over the limit during this trip.`}
              </div>
```

- [ ] **Step 3: Type-check and build**

```bash
npm run typecheck && npm run build
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/forecasting/forecast-result-card.tsx
git commit -m "ui(forecast): update label to 'Peak During Trip' and improve violation message"
```

---

## Chunk 4: Final verification

### Task 7: Full regression and smoke test

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 2: Type-check**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Navigate to the trip forecast page. Verify:
- An employee at ~82 days with a week-long trip that the old algo flagged Critical now shows Green or Yellow
- The "Peak During Trip" column label is correct
- A genuinely non-compliant trip shows "exceeds the limit on day N of this trip"
- "Compliant from" date is correct (try delaying a non-compliant trip and verify the suggested date results in a compliant forecast)

---

## Summary of files changed

| File | Change |
|------|--------|
| `types/forecast.ts` | Add `firstViolationDay?: number`, update `daysAfterTrip` JSDoc |
| `lib/services/forecast-service.ts` | Day-by-day peak loop in both functions |
| `components/forecasting/forecast-result-card.tsx` | Label + violation message |
| `lib/services/__tests__/forecast-service.test.ts` | Three new regression tests, remove stale characterisation test |
