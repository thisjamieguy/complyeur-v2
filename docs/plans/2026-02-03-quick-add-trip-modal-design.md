# Quick-Add Trip Modal — Design Document

**Date:** 2026-02-03
**Status:** Ready for implementation

## Overview

Add an "Add Trip" button to each employee row in the dashboard compliance table. Clicking it opens a modal pre-filled with that employee's name and ID, allowing quick trip creation without navigating to the employee detail page.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Desktop button placement | Next to View button | Two actions visible, clear purpose |
| Button style | Icon only (+ icon) | Compact, saves horizontal space |
| Mobile button placement | Card header, next to name | Always visible without expanding |
| Breach warning | Inline in form | Informational, non-blocking |
| Warning calculation | Real-time as dates change | Immediate feedback |
| Data source for calculation | Pass `daysRemaining` from table | Data already available, no extra fetch |
| Advanced fields (is_private, ghosted) | Collapsible section | Keep quick-add simple, full options available |
| Refresh method | `router.refresh()` | Existing pattern, maintains filter/scroll state |

## Component Architecture

### Files to Create

| File | Purpose |
|------|---------|
| `components/dashboard/quick-add-trip-modal.tsx` | Modal content for dashboard context |

### Files to Modify

| File | Changes |
|------|---------|
| `components/dashboard/compliance-table.tsx` | Add + button to table rows and mobile cards |
| `components/trips/trip-form.tsx` | Add breach warning, collapsible advanced section |

## Detailed Specifications

### 1. QuickAddTripModal Component

**Props:**
```typescript
interface QuickAddTripModalProps {
  employeeId: string
  employeeName: string
  daysRemaining: number
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

**Behavior:**
- Controlled modal (open state managed by parent)
- Reuses existing `TripForm` component
- Passes `daysRemaining` to TripForm for breach calculation
- Calls existing `addTripAction` server action
- Shows success toast on completion
- Calls `router.refresh()` after successful add

### 2. Desktop Table Changes

**Actions column:**
- Width: `w-[130px]` (increased from `w-[90px]`)
- Layout: `flex items-center gap-2`
- Buttons:
  1. Add Trip: `Button variant="outline" size="sm"` with `Plus` icon only
  2. View: Existing button unchanged

**Row state management:**
- Each row wrapped in component that tracks modal open state
- Click handlers use `e.stopPropagation()` to prevent row navigation

### 3. Mobile Card Changes

**Header layout:**
```
┌─────────────────────────────────────┐
│ Employee Name        [+]   [Badge]  │
└─────────────────────────────────────┘
```

- Plus button: `Button variant="ghost" size="sm"` with `Plus` icon
- Position: Between name and status badge
- Click handler: `e.preventDefault()` + `e.stopPropagation()`

### 4. TripForm Modifications

**New props:**
```typescript
interface TripFormProps {
  // ... existing props
  daysRemaining?: number          // For breach calculation
  showAdvancedCollapsed?: boolean // Collapse advanced options (default: false)
}
```

**Breach warning:**
- Appears when: `(90 - daysRemaining) + tripDuration > 90`
- Position: Below date fields, above submit button
- Styling: `bg-amber-50 border border-amber-200 rounded-lg p-4`
- Content:
  - `AlertTriangle` icon in amber
  - "Warning: This trip would exceed the 90-day limit"
  - "Projected days used: **X**/90"
- Calculation: Real-time on date change using `date-fns` `differenceInDays`
- **Non-blocking:** Submit button remains enabled

**Advanced options section:**
- When `showAdvancedCollapsed={true}`:
  - Wrap `is_private` and `ghosted` checkboxes in `Collapsible`
  - Trigger: "Advanced options" with `ChevronDown` icon
  - Default: Collapsed
- When `showAdvancedCollapsed={false}` (default):
  - Show checkboxes inline (current behavior, backwards compatible)

### 5. Data Flow

```
Dashboard loads → employees[] with days_remaining
                      ↓
User clicks [+] on row → QuickAddTripModal opens
                      ↓
                 TripForm rendered with daysRemaining prop
                      ↓
User enters dates → breach warning calculated locally
                      ↓
User submits → checkTripOverlap() → addTripAction()
                      ↓
Success → toast shown, modal closes, router.refresh()
                      ↓
Dashboard re-renders with updated compliance data
```

## Implementation Sequence

1. **Modify TripForm** — Add `daysRemaining` prop and breach warning UI
2. **Modify TripForm** — Add collapsible advanced section
3. **Create QuickAddTripModal** — New controlled modal component
4. **Modify ComplianceTable** — Add button to desktop rows
5. **Modify ComplianceTable** — Add button to mobile cards
6. **Test** — Verify all flows work correctly

## Reuse (No Duplication)

The following existing code is reused without modification:
- `TripForm` component (extended with new optional props)
- `addTripAction` server action
- `checkTripOverlap` validation
- `tripFormSchema` Zod validation
- Toast utilities (`showSuccess`, `showError`)
- Dialog components from shadcn/ui

## Edge Cases

| Case | Handling |
|------|----------|
| Days remaining is negative (already in breach) | Warning shows, submit allowed |
| Trip overlap detected | Error shown in modal, submit blocked |
| Server error | Error toast + error in modal |
| User cancels | Modal closes, no state change |
| Dates invalid (exit before entry) | Existing TripForm validation handles |

## Not Included (YAGNI)

- Bulk add from dashboard (use existing bulk import)
- Inline editing in table (navigate to employee page)
- Pre-fill country from last trip (manual selection)
- Keyboard shortcut to open modal
