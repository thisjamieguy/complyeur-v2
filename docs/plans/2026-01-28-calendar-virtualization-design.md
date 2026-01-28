# Calendar Virtualization Design

**Date:** 2026-01-28
**Status:** Approved
**Author:** AI-assisted

## Problem

The calendar Gantt chart renders slowly on initial page load when displaying 50-100 employees with hundreds of trips. The bottleneck is React mounting all employee row components at once.

## Solution

Virtualize the employee row list using `@tanstack/react-virtual`. Only rows visible in the viewport (plus a small buffer) are rendered to the DOM.

## Architecture

### Before

```
CalendarView
  └── GanttChart
        └── DateHeader
        └── employees.map() → 100 EmployeeRows mounted
```

### After

```
CalendarView (pre-calculates row heights)
  └── GanttChart
        └── DateHeader
        └── useVirtualizer({ count: 100 })
              └── ~15 visible EmployeeRows mounted
```

## Key Changes

### 1. New Dependency

```bash
npm install @tanstack/react-virtual
```

### 2. New Utility: Row Height Calculator

**File:** `lib/calendar/row-height.ts`

Pre-calculates row heights based on trip stacking (overlapping trips stack vertically). The virtualizer needs heights before rendering.

### 3. Modified: GanttChart

- Wrap employee list in `useVirtualizer`
- Set `overscan: 5` (render 5 extra rows above/below viewport)
- Pass row heights from CalendarView

### 4. Modified: EmployeeRow

- Accept positioning props (`style`) from virtualizer
- Use `position: absolute` for vertical placement

### 5. Modified: CalendarView

- Pre-calculate `rowHeights` array using memoization
- Pass to GanttChart

## Trade-offs

| Aspect | Before | After |
|--------|--------|-------|
| Initial DOM nodes | 100+ rows | ~15 rows |
| Initial render | Slow | Fast |
| Memory | Higher | Lower |
| Scroll behavior | Native | Virtualized |
| Complexity | Simple | Moderate |

## Implementation Steps

1. Install `@tanstack/react-virtual`
2. Create `lib/calendar/row-height.ts` utility
3. Update `CalendarView` to pre-calculate heights
4. Update `GanttChart` to use virtualizer
5. Update `EmployeeRow` for absolute positioning
6. Test with 50-100 employees

## Rollback

If issues arise, revert to commit `d6e2b50` (pre-virtualization baseline).

## Future Considerations

- Horizontal virtualization (not needed now, timeline is one row)
- Web Workers for compliance calculations (if "what-if" projections added)
- Drag-and-drop integration (TanStack ecosystem compatible)
