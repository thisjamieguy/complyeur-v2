# Sandbox Calendar Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the Preview Sandbox calendar so it clearly demos trip-to-timeline with correct dates, auto-fitting range, and "3 Feb" column labels.

**Architecture:** Two components to change. The `DemoCalendar` gets a new auto-fit mode that calculates the visible date range from the trips it receives, renders "3 Feb" style headers, and positions trip bars by date math. The `LandingSandboxPage` drops the date scenario dropdown in favor of native date pickers.

**Tech Stack:** React, TypeScript, Tailwind CSS (existing stack, no new deps)

---

### Task 1: Rewrite DemoCalendar to auto-fit and use "3 Feb" labels

**Files:**
- Modify: `components/marketing/demo-calendar.tsx` (full rewrite of rendering logic)

**Step 1: Replace constants and add auto-fit date calculation**

Replace the top-level constants and add a helper that calculates the visible window from trip data:

```typescript
const DAY_WIDTH = 44        // wider to fit "3 Feb" labels
const ROW_HEIGHT = 40       // unchanged
const NAME_WIDTH = 120      // unchanged
const DAY_MS = 24 * 60 * 60 * 1000
const BUFFER_DAYS = 2       // padding on each side of trip range
const MIN_WINDOW_DAYS = 14  // minimum visible columns
```

Add a function `computeAutoFitWindow` that:
1. Finds the earliest `entryDate` and latest `exitDate` across all employees
2. Adds `BUFFER_DAYS` on each side
3. Ensures the window is at least `MIN_WINDOW_DAYS` wide
4. Returns `{ startDate: Date, endDate: Date, totalDays: number }`

If no trips are provided, fall back to a 14-day window centered on today.

**Step 2: Update day label generation**

Replace `generateDefaultDayLabels` with a function that takes the window start date and total days, and returns labels in `"3 Feb"` format:

```typescript
function generateDayLabels(startDate: Date, totalDays: number): string[] {
  return Array.from({ length: totalDays }, (_, i) => {
    const date = addDays(startDate, i)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  })
}
```

This produces labels like `"3 Feb"`, `"4 Feb"`, `"1 Mar"`, etc.

**Step 3: Update today marker logic**

Instead of a fixed `todayOffset`, compute whether today falls within the visible window:

```typescript
const today = startOfDay(new Date())
const todayIndex = diffInDays(today, windowStartDate)
const showTodayMarker = todayIndex >= 0 && todayIndex < totalDays
```

Use `todayIndex` for the blue column highlight and vertical line. Only render them when `showTodayMarker` is true.

**Step 4: Update the DemoCalendar component signature**

The component should now accept an optional `autoFit` prop (default `true` when `employees` are provided). When `autoFit` is true, ignore `windowDays` and `referenceDate` and compute the window from the trip data.

Keep backward compat: when no `employees` prop is passed, use the existing `defaultEmployees` with the old fixed-window logic.

**Step 5: Update the render — column headers**

In the header row, render labels with enough width to show "3 Feb":

```tsx
{dayLabels.map((label, idx) => (
  <div
    key={`day-${idx}`}
    className={cn(
      'flex shrink-0 items-center justify-center border-r border-slate-100 text-xs text-slate-500',
      showTodayMarker && idx === todayIndex && 'bg-blue-50 font-semibold text-blue-600'
    )}
    style={{ width: DAY_WIDTH }}
  >
    {label}
  </div>
))}
```

**Step 6: Verify trip bar positioning**

The existing `TripBar` component uses `trip.startDay * DAY_WIDTH` for `left` and `trip.duration * DAY_WIDTH - 2` for width. This is correct as long as `convertEmployeesForWindow` computes `startDay` relative to the window start date — which it already does. No changes needed to `TripBar` or `convertEmployeesForWindow`.

**Step 7: Run dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:3000/landing-sandbox` and verify:
- Column headers show "3 Feb", "4 Feb" etc.
- Trip bars align to the correct date columns
- Today marker appears if today is within range
- Timeline auto-fits to show all trips with a small buffer

**Step 8: Commit**

```bash
git add components/marketing/demo-calendar.tsx
git commit -m "fix: rewrite DemoCalendar with auto-fit range and date labels"
```

---

### Task 2: Simplify the sandbox page form

**Files:**
- Modify: `app/(preview)/landing-sandbox/page.tsx`

**Step 1: Remove date scenario types and constants**

Delete:
- `DATE_SCENARIOS` constant
- `DateScenarioId` type
- `getScenarioById` function
- `dateScenarioId` from `FormState` interface

**Step 2: Replace form initial state**

Update `FormState` to use simple date strings:

```typescript
interface FormState {
  employeeName: string
  country: string
  entryDate: string   // 'YYYY-MM-DD'
  exitDate: string    // 'YYYY-MM-DD'
  tripReason: string
}
```

Set initial dates to reasonable defaults (e.g. today + 7 days for entry, today + 12 for exit):

```typescript
const [formState, setFormState] = useState<FormState>(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return {
    employeeName: EMPLOYEE_OPTIONS[0],
    country: 'DE',
    entryDate: toDateInputValue(addDays(start, 7)),
    exitDate: toDateInputValue(addDays(start, 12)),
    tripReason: REASON_OPTIONS[0],
  }
})
```

**Step 3: Replace date scenario dropdown with date inputs**

Remove the entire "Date scenario" `<select>` block and the read-only date display inputs. Replace with two native `<input type="date">` fields:

```tsx
<div>
  <label htmlFor="entryDate" className="mb-1 block text-sm font-medium text-slate-700">
    Entry date
  </label>
  <input
    id="entryDate"
    type="date"
    value={formState.entryDate}
    onChange={(e) => setFormState((prev) => ({ ...prev, entryDate: e.target.value }))}
    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
  />
</div>

<div>
  <label htmlFor="exitDate" className="mb-1 block text-sm font-medium text-slate-700">
    Exit date
  </label>
  <input
    id="exitDate"
    type="date"
    value={formState.exitDate}
    onChange={(e) => setFormState((prev) => ({ ...prev, exitDate: e.target.value }))}
    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
  />
</div>
```

**Step 4: Remove the scenario helper text**

Delete the `<p>` tag that says "Both scenarios are intentionally configured to trigger an instant non-compliant warning."

**Step 5: Clean up handleSubmit**

The `handleSubmit` function should work as-is since it reads from `formState.entryDate` and `formState.exitDate` which are now directly editable. No changes needed.

**Step 6: Stop passing referenceDate to DemoCalendar**

Since the calendar now auto-fits, remove the `referenceDate` state and prop:

```tsx
// Remove this line:
// const [referenceDate] = useState(() => new Date())

// Update the DemoCalendar usage:
<DemoCalendar
  employees={calendarEmployees}
  title="Timeline Preview"
/>
```

Remove the `windowDays` and `referenceDate` props — let the component auto-fit.

**Step 7: Run dev server and visually verify the full flow**

```bash
npm run dev
```

Open `http://localhost:3000/landing-sandbox` and verify:
- Date inputs are editable native date pickers
- No "Date scenario" dropdown
- Adding a trip updates the timeline immediately
- Timeline auto-fits to show all trips
- Removing a trip adjusts the timeline range
- Dashboard preview still updates correctly

**Step 8: Commit**

```bash
git add app/\(preview\)/landing-sandbox/page.tsx
git commit -m "fix: simplify sandbox form with native date pickers"
```
