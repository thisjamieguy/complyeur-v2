# Unified Add Employee Dialog — Design Document

**Date:** 2026-03-03
**Status:** Ready for implementation

## Problem

The current employee creation UX is split and inconsistent:
1. **Empty state** uses an inline form (`FirstEmployeeInlineForm`) — name + nationality only, no trip entry
2. **Dashboard header** uses a dialog (`AddEmployeeDialog`) — also name + nationality only, no trip entry
3. After adding an employee, users must navigate elsewhere to add trips — no smooth flow
4. The two different UX patterns (inline vs dialog) feel jarring

## Solution

Replace both with a **single unified dialog** used everywhere:
- Empty state button opens it
- Dashboard header "Add Employee" button opens it
- Alt+N keyboard shortcut opens it
- Same component, same experience, every time

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Form container | Dialog/modal (`sm:max-w-2xl`) | User chose dialog over inline; wider for trip fields |
| Trip fields visibility | Always visible, optional to fill | User wants everything upfront; trips can be left blank |
| Country picker | Searchable combobox (Command + Popover) | 35+ countries need type-to-filter; primitives already exist |
| Country list | All EU + Schengen countries | User chose this; includes IE, CY with non-Schengen warnings |
| Multi-trip support | "Add another trip" button, dynamic rows | Users may know multiple upcoming trips |
| Trip row layout | Stacked card per trip (entry, exit, country in card) | Cleaner in a dialog than cramped horizontal rows |
| Date pickers | Two separate pickers (entry + exit) per trip | User chose this; clearer than range picker |
| Compliance preview | Show 90/180 impact after entering dates | "X of 90 days used" — calculated client-side from trip duration |
| Post-submit | Success state with two CTAs | "Add another employee" resets form; "Done" closes dialog |
| Empty state | Button opens dialog | Replaces inline form; consistent with rest of app |
| Event system | Keep `complyeur:open-add-employee` event | Existing keyboard shortcut + other triggers still work |

## Component Architecture

### Files to Create

| File | Purpose |
|------|---------|
| `components/employees/unified-add-employee-dialog.tsx` | Main dialog with employee + trip form |
| `components/employees/trip-entry-row.tsx` | Reusable trip entry card (dates + country + remove) |
| `components/employees/country-combobox.tsx` | Searchable country dropdown (Command + Popover) |

### Files to Modify

| File | Changes |
|------|---------|
| `components/dashboard/empty-state.tsx` | Replace `FirstEmployeeInlineForm` with button that opens dialog |
| `app/(dashboard)/dashboard/page.tsx` | Replace `AddEmployeeDialog` import with `UnifiedAddEmployeeDialog` |
| `app/(dashboard)/actions.ts` | Add `addEmployeeWithTripsAction` server action |
| `lib/validations/employee.ts` | Add `employeeWithTripsSchema` for combined validation |

### Files to Delete (after migration)

| File | Reason |
|------|--------|
| `components/employees/first-employee-inline-form.tsx` | Replaced by unified dialog |
| `components/employees/add-employee-dialog.tsx` | Replaced by unified dialog |

## Detailed Specifications

### 1. UnifiedAddEmployeeDialog

**Responsibilities:**
- Renders the full dialog with employee fields + trip section
- Manages form state via `react-hook-form` with Zod validation
- Handles dynamic trip rows (add/remove)
- Calculates and displays compliance impact preview
- Shows post-submit success state with CTAs
- Listens for `complyeur:open-add-employee` event (for Alt+N shortcut)

**Props:**
```typescript
interface UnifiedAddEmployeeDialogProps {
  /** Optional trigger button — if not provided, dialog is controlled externally via event */
  trigger?: React.ReactNode
  /** Source tracking for analytics */
  source?: 'dashboard_header' | 'empty_state' | 'keyboard_shortcut'
}
```

**Form Schema (combined):**
```typescript
const unifiedEmployeeSchema = z.object({
  name: employeeSchema.shape.name,
  nationality_type: nationalityTypeEnum,
  trips: z.array(z.object({
    entry_date: z.string().optional(),
    exit_date: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
})
```

Trips are fully optional — a user can add an employee with zero trips.

**Dialog Layout:**
```
┌──────────────────────────────────────────┐
│ Add Employee                          [×]│
│ Add an employee and optionally their     │
│ upcoming trips.                          │
│                                          │
│ ── Employee Details ──────────────────── │
│                                          │
│ Name                                     │
│ ┌──────────────────────────────────────┐ │
│ │ e.g. Jane Smith                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Nationality type                         │
│ ┌──────────────────────────────────────┐ │
│ │ ○ UK Citizen                         │ │
│ │ ○ EU/Schengen Citizen                │ │
│ │ ○ Rest of World                      │ │
│ └──────────────────────────────────────┘ │
│ EU/Schengen citizens are exempt from     │
│ 90/180-day tracking.                     │
│                                          │
│ ── Trips (optional) ─────────────────── │
│                                          │
│ ┌─ Trip 1 ───────────────────────── [×]┐ │
│ │ Entry date        Exit date          │ │
│ │ ┌─────────────┐  ┌─────────────┐     │ │
│ │ │ Select date  │  │ Select date  │    │ │
│ │ └─────────────┘  └─────────────┘     │ │
│ │ Country                              │ │
│ │ ┌──────────────────────────────────┐ │ │
│ │ │ Search countries...              │ │ │
│ │ └──────────────────────────────────┘ │ │
│ │ 📊 12 days — uses 12 of 90 allowed  │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [+ Add another trip]                     │
│                                          │
│ ────────────────────────────────────── │
│              [Cancel]  [Add Employee]    │
└──────────────────────────────────────────┘
```

**Post-Submit Success State:**
```
┌──────────────────────────────────────────┐
│ ✓ Employee added                      [×]│
│                                          │
│ Jane Smith has been added to your        │
│ compliance tracker with 2 trips.         │
│                                          │
│  [Add another employee]  [Done]          │
└──────────────────────────────────────────┘
```

### 2. TripEntryRow

**Responsibilities:**
- Renders a single trip's fields (entry date, exit date, country)
- Shows compliance impact inline (trip duration + days used)
- Remove button to delete the row
- Warns if country is non-Schengen EU (IE, CY)

**Props:**
```typescript
interface TripEntryRowProps {
  index: number
  onRemove: () => void
  /** Whether this is the only trip (hide remove button) */
  isOnly?: boolean
  /** For compliance preview calculation */
  nationalityType: NationalityType
}
```

The component uses `useFormContext()` from react-hook-form to access/set field values for `trips[index].entry_date`, `trips[index].exit_date`, `trips[index].country`.

**Compliance Impact Calculation (client-side):**
- When both dates are filled: calculate `exit_date - entry_date + 1` = trip duration
- Show: `"{duration} days — uses {duration} of 90 allowed"`
- If nationality is EU/Schengen: show "Exempt from 90/180-day tracking" instead
- If country is non-Schengen (IE, CY): show warning "This country is EU but not Schengen — does not count toward 90 days"
- Note: This is a simple duration display for v1. It doesn't query the employee's existing trips (they're new and have none). For existing employees added via the header button, this is still a useful approximation.

### 3. CountryCombobox

**Responsibilities:**
- Searchable dropdown using existing `Command` + `Popover` primitives
- Shows all countries from `COUNTRY_LIST` (already sorted alphabetically in `schengen-countries.ts`)
- Groups: "Schengen Area" (33 countries) and "Other Countries" (IE, CY, GB, US, etc.)
- Shows Schengen badge next to Schengen countries
- Non-Schengen EU countries (IE, CY) show a subtle indicator

**Props:**
```typescript
interface CountryComboboxProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}
```

### 4. Server Action: `addEmployeeWithTripsAction`

```typescript
export async function addEmployeeWithTripsAction(formData: {
  name: string
  nationality_type: string
  trips?: Array<{
    entry_date: string
    exit_date: string
    country: string
  }>
}): Promise<{ employeeId: string; tripsCreated: number }> {
  // 1. Enforce mutation access (EMPLOYEES_CREATE)
  // 2. Validate employee fields with employeeSchema
  // 3. Create employee → get employee ID
  // 4. If trips provided:
  //    a. Enforce TRIPS_CREATE permission
  //    b. Validate each trip with tripSchema (injecting employee_id)
  //    c. Use createBulkTrips() for atomic insertion
  //    d. Run alert detection background
  // 5. Revalidate paths
  // 6. Return { employeeId, tripsCreated }
}
```

### 5. Empty State Changes

**Before:**
```tsx
<FirstEmployeeInlineForm />
```

**After:**
```tsx
<div className="flex flex-col gap-3 mt-6 sm:flex-row sm:items-center">
  <UnifiedAddEmployeeDialog
    trigger={<Button>Add your first employee</Button>}
    source="empty_state"
  />
  <Button asChild variant="ghost">
    <Link href="/import">
      <Upload className="mr-2 h-4 w-4" />
      Import a spreadsheet instead
    </Link>
  </Button>
</div>
```

## Implementation Phases

### Phase 1: Foundation Components
1. Create `CountryCombobox` — searchable country dropdown
2. Create `TripEntryRow` — single trip card with dates + country
3. Test both in isolation

### Phase 2: Unified Dialog
4. Create `UnifiedAddEmployeeDialog` with full form
5. Add `addEmployeeWithTripsAction` server action
6. Add `employeeWithTripsSchema` validation
7. Wire up form submission, loading states, error handling

### Phase 3: Integration
8. Update `dashboard/page.tsx` — swap `AddEmployeeDialog` for `UnifiedAddEmployeeDialog`
9. Update `empty-state.tsx` — replace inline form with button that opens dialog
10. Verify Alt+N shortcut still works via event system
11. Delete old `FirstEmployeeInlineForm` and `AddEmployeeDialog`

### Phase 4: Polish
12. Compliance impact preview in trip rows
13. Post-submit success state with CTAs
14. Test mobile responsiveness (dialog should scroll on small screens)
15. Analytics tracking for source differentiation

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Dialog too tall on mobile | Use `max-h-[80vh] overflow-y-auto` on dialog content; trip section scrolls |
| Compliance preview accuracy | v1 shows trip duration only (not rolling window). Clearly label as "this trip uses X days" |
| Form complexity with dynamic trips | Use `useFieldArray` from react-hook-form for clean add/remove |
| Country list too long | Grouped display + search filtering; most users type 2-3 chars to find country |

## Dependencies

All required UI primitives already exist:
- `components/ui/dialog.tsx` — Dialog/modal
- `components/ui/command.tsx` — Searchable list (cmdk)
- `components/ui/popover.tsx` — Popover container for combobox
- `components/ui/calendar.tsx` — Date picker (react-day-picker)
- `components/ui/button.tsx`, `input.tsx`, `label.tsx`, `radio-group.tsx` — Form elements

Server-side infrastructure:
- `addTripAction` / `bulkAddTripsAction` — existing trip creation actions
- `createBulkTrips` in `lib/db` — atomic bulk insert
- `tripSchema` — existing trip validation
- `employeeSchema` — existing employee validation
