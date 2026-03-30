# Schengen 90/180-Day Compliance — Calculation Logic

**Version:** 2.0
**Last updated:** 30 March 2026
**Source:** `lib/compliance/` — all calculations are deterministic. No AI or approximation is used at any point in the algorithm. Every result is reproducible and auditable from the underlying trip data.

---

## 1. Legal Basis

The calculation implements **EU Regulation 610/2013** (Schengen Borders Code), Article 6(1):

> "Short-stay visas allow third-country nationals to stay for a period of no more than 90 days in any 180-day period."

The European Commission's FAQ (europa.eu) clarifies that this is evaluated as a **rolling** 180-day window, not a fixed calendar period. Every day is evaluated against the 180 days immediately preceding it. ComplyEUR implements this exactly as specified.

---

## 2. The Rolling 180-Day Window

### Definition

For any reference date R, the compliance window is:

```
window_start = R − 179 days  (inclusive)
window_end   = R             (inclusive)
```

This produces exactly **180 calendar dates** in the window. The reference date itself is included, consistent with EU Regulation 610/2013 — the 180-day period includes the day of intended stay.

### Example

For reference date **2025-07-01**:

- `window_start` = 2025-07-01 − 179 = **2025-01-03**
- `window_end`   = **2025-07-01**
- The window spans 2025-01-03 to 2025-07-01 inclusive (180 days)

A date of 2025-01-02 falls **outside** the window (181 days before reference date).
A date of 2025-01-03 falls **inside** the window (exactly at the start).

### Implementation

```typescript
// lib/compliance/window-calculator.ts
windowStart = refDate − 179 days   // addUtcDays(normalizedRef, -(WINDOW_SIZE_DAYS - 1))
windowEnd   = refDate              // normalizeToUTCDate(normalizedRef)
```

All dates are normalised to **UTC midnight** before comparison. Native JavaScript `Date` objects are not used for arithmetic — `date-fns` is used throughout to avoid timezone-related day shifts.

---

## 3. Counting Presence Days

### How days are counted

ComplyEUR counts each **calendar day** on which an employee was physically present in the Schengen Area. A trip from entry date E to exit date X contributes:

```
days = (X − E) + 1   (inclusive of both entry and exit day)
```

This matches the EU's day-counting methodology: both the day of entry and the day of exit count as full presence days.

### Overlap deduplication

If two trips overlap (e.g., an employee has overlapping entries because of a data import error), each calendar day is counted only **once**. The implementation builds a `Set<string>` of ISO date keys (`YYYY-MM-DD`), which eliminates duplicates by construction.

### Active trips (no exit date)

If a trip has no exit date (the employee is currently in Schengen), all days from the entry date up to and including **today** are added to the presence set. The system does not assume a future exit date.

### Compliance start date

A configurable `complianceStartDate` can be set per company. Days before this date are excluded from calculations even if they fall within the 180-day window. The default is `1970-01-01` (epoch) — no trips are artificially excluded.

---

## 4. Schengen Area Membership

### Full members (27 countries as of January 2025)

Austria (AT), Belgium (BE), Bulgaria (BG)\*, Croatia (HR), Czech Republic (CZ), Denmark (DK), Estonia (EE), Finland (FI), France (FR), Germany (DE), Greece (GR), Hungary (HU), Iceland (IS), Italy (IT), Latvia (LV), Liechtenstein (LI), Lithuania (LT), Luxembourg (LU), Malta (MT), Netherlands (NL), Norway (NO), Poland (PL), Portugal (PT), Romania (RO)\*, Slovakia (SK), Slovenia (SI), Spain (ES), Sweden (SE), Switzerland (CH).

> \* **Romania and Bulgaria** became full Schengen members with land border checks removed on **1 January 2025**. Both countries were already part of Schengen for air and sea borders from March 2024. Trips to Romania or Bulgaria on or after 1 January 2025 count toward the 90-day limit. This is reflected in `lib/compliance/constants.ts` with `since: '2025-01-01'` for both countries.

### Microstates — count as Schengen

The following microstates have open borders with their Schengen neighbours. There are no passport or border controls between them and the Schengen zone. Days spent in these territories **count toward the 90-day limit**:

| Country | ISO | Rationale |
|---------|-----|-----------|
| Monaco | MC | Open border with France — no passport control |
| Vatican City | VA | Open border with Italy — no passport control |
| San Marino | SM | Open border with Italy — no passport control |
| Andorra | AD | Open borders with France and Spain — no passport control |

These are included in `SCHENGEN_COUNTRY_CODES` in `lib/compliance/constants.ts`. Border agents do count time in microstates as Schengen presence, and so does ComplyEUR.

### Explicitly NOT Schengen — common confusion cases

The following countries are EU members but are **not part of the Schengen Area**:

| Country | ISO | Reason |
|---------|-----|--------|
| Ireland | IE | EU member, opted out of Schengen. **Not Schengen despite being in the EU.** |
| Cyprus | CY | EU member, Schengen accession not yet implemented. **Not Schengen despite being in the EU.** |

Trips to Ireland or Cyprus **do not count** toward the 90-day Schengen limit. This is a common point of confusion — both countries use passports and have standard border checks that are separate from the Schengen system.

The United Kingdom (GB) is neither EU nor Schengen and is also excluded.

---

## 5. Status Thresholds

ComplyEUR assigns a compliance status to each employee based on days used in the current rolling window:

| Status | Days Used | Days Remaining | Meaning |
|--------|-----------|----------------|---------|
| Compliant | 0–68 | 22+ | No near-term risk |
| At Risk | 69–82 | 8–21 | Approaching limit — review travel plans |
| High Risk | 83–89 | 1–7 | Immediate attention required |
| Violation | 90+ | 0 or negative | Limit exceeded — legal jeopardy |

Thresholds are configurable per company via company settings. The defaults above are set in `lib/compliance/constants.ts`. A violation occurs at exactly 90 days — the maximum permitted is 89 days used to remain legally compliant.

---

## 6. Worked Examples

### Example 1 — Simple, compliant

An employee takes two trips:

- Trip A: 2025-03-10 → 2025-03-20 (11 days)
- Trip B: 2025-05-01 → 2025-05-14 (14 days)

**Reference date: 2025-06-01**

Window: 2024-12-04 to 2025-06-01.

Both trips fall within the window.
Days used = 11 + 14 = **25**
Days remaining = 90 − 25 = **65**
Status: **Compliant**

---

### Example 2 — At Risk, approaching limit

An employee has been making regular short trips throughout the year:

- Jan 2025: 20 days
- Feb 2025: 15 days
- Mar 2025: 10 days
- Apr 2025: 15 days
- May 2025: 12 days

**Reference date: 2025-06-01**

Window: 2024-12-04 to 2025-06-01.

All five trips fall within the window.
Days used = 20 + 15 + 10 + 15 + 12 = **72**
Days remaining = 90 − 72 = **18**
Status: **At Risk**

The rolling nature matters here: as earlier trips fall out of the window (e.g., by July the January trip starts to drop out), days remaining will gradually recover — but only if no new Schengen travel occurs.

---

### Example 3 — Violation, rolling window effect

An employee spent 60 days in Schengen between November and December 2024, then returned for another 35 days in early 2025.

- Nov–Dec 2024: 60 days
- Jan–Feb 2025: 35 days

**Reference date: 2025-02-28**

Window: 2024-09-01 to 2025-02-28.

Both blocks of travel fall within this window.
Days used = 60 + 35 = **95**
Days remaining = 90 − 95 = **−5**
Status: **Violation** — employee has exceeded the limit by 5 days.

**By 2025-05-01**, the November–December 2024 trips start falling out of the rolling window. Depending on exact dates, days remaining begins to recover. ComplyEUR recalculates on every page load so the current status is always accurate.

---

### Example 4 — Microstate stay counts

An employee travels to Paris for 10 days, then spends a weekend in Monaco (2 days), then returns to London.

- France: 10 days
- Monaco: 2 days (open border with France, counts as Schengen)

Total days charged to 90-day limit: **12**

If the employee had spent those same 2 days in Ireland instead, only 10 days would be charged (Ireland is not Schengen).

---

## 7. Edge Cases and Boundary Conditions

### At exactly 90 days

An employee with exactly 90 days used in the window is **in violation**. The maximum permitted is 89 days. `isCompliant()` returns `false` at 90.

### Entry on the 90th day

If an employee has used 89 days and intends to enter Schengen today, `canSafelyEnter()` returns `false` — they would reach exactly 90 days on entry, leaving no room to stay. ComplyEUR treats 89 days used as the last safe threshold for entry.

### Zero days

An employee with no trips recorded has 0 days used and 90 days remaining. Status: Compliant.

### Overlapping trip records

If duplicate or overlapping trips are imported, the Set-based deduplication ensures each calendar day is counted only once. No inflation of the day count occurs.

### Trips straddling window boundary

Only the days that fall **within** the rolling window are counted. If a trip runs from 2024-11-01 to 2024-12-15 and the window starts 2024-12-04, only days from 2024-12-04 onward are counted for that trip.

---

## 8. Implementation Files

| File | Purpose |
|------|---------|
| `lib/compliance/window-calculator.ts` | Core rolling window: `isInWindow()`, `daysUsedInWindow()`, `calculateDaysRemaining()`, `isCompliant()`, `canSafelyEnter()`, `getWindowBounds()` |
| `lib/compliance/presence-calculator.ts` | Builds the presence `Set<string>` from trip records; normalises dates to UTC midnight |
| `lib/compliance/constants.ts` | Schengen country list (members, microstates, excluded), default thresholds, window size |
| `lib/compliance/risk-calculator.ts` | Maps days-used to risk level (green/amber/red) using configurable thresholds |
| `lib/compliance/safe-entry.ts` | Evaluates whether a proposed entry date is safe given existing travel |
| `lib/compliance/types.ts` | TypeScript interfaces: `Trip`, `ComplianceConfig`, `ComplianceResult`, `RiskLevel` |
| `lib/compliance/errors.ts` | Typed errors: `InvalidTripError`, `InvalidDateRangeError`, `UnknownCountryError`, `InvalidReferenceDateError` |
| `lib/compliance/__tests__/` | Unit test suite covering boundary conditions, oracle reference cases, accuracy scenarios |

---

## 9. What This System Does NOT Do

- **No AI or machine learning.** Every calculation is deterministic arithmetic. Given the same input trips and reference date, the output is always identical. There are no probabilistic estimates, confidence intervals, or model inferences.
- **No legal advice.** ComplyEUR calculates days mathematically. It does not account for special bilateral agreements, diplomatic exceptions, visa category nuances, or post-EES enforcement discretion. For legal questions, consult a qualified immigration solicitor.
- **No real-time border data.** ComplyEUR does not connect to any border agency systems. The EES (Entry/Exit System, live October 2025) is a separate EU border infrastructure — ComplyEUR provides complementary pre-trip tracking, not a replacement for official EES registration.
- **No data migration from v1.** ComplyEUR v2 is a clean rebuild. No historical data was carried over from the previous Flask application. All trip data in the system has been entered or imported by users directly.

---

## 10. Verification and Testing

The compliance engine has an independent test suite at `lib/compliance/__tests__/`. Tests cover:

- Window boundary conditions (day 0, 1, 89, 90, 91)
- Microstate inclusion
- Overlap deduplication
- Active trips (no exit date)
- Compliance start date enforcement
- Oracle reference cases (manually verified expected outputs)
- Accuracy scenarios from real-world edge cases

Before each release, Schengen membership is verified against the European Commission's official list at:
[https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/schengen-area_en](https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/schengen-area_en)

A quarterly review date is recorded in `constants.ts`.
