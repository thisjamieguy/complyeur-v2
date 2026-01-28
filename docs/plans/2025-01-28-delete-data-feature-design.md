# Delete Data Feature Design

**Date:** 2025-01-28
**Status:** Approved

## Overview

Add a "Delete Data" feature to the Settings page allowing users to bulk-delete their data with appropriate safeguards.

## Requirements

| Requirement | Decision |
|-------------|----------|
| Location | Settings page, "Danger Zone" section at bottom |
| Data types | Employees, Trips, Column Mappings, Import History |
| Deletion behavior | Soft-delete for employees (30-day recovery), hard-delete for trips/mappings/history |
| Confirmation | Summary with counts + type "DELETE" to confirm |
| Selection UI | Expandable categories with "Select All" and individual item checkboxes |

## User Flow

1. User navigates to Settings page
2. Scrolls to "Danger Zone" section at bottom
3. Clicks "Delete Data..." button
4. Modal opens showing 4 collapsible categories with counts
5. User checks categories or expands to select individual items
6. Clicks "Continue"
7. Summary screen shows exact counts, grouped by recoverable vs permanent
8. User types "DELETE" to confirm
9. Deletion executes with progress indicator
10. Success toast, modal closes, page refreshes

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `components/settings/danger-zone.tsx` | Create | Danger zone card + modal (single file) |
| `lib/actions/bulk-delete.ts` | Create | Server action for bulk deletion |
| `app/(dashboard)/settings/page.tsx` | Modify | Add DangerZone component |

## Component Design

### DangerZone Component

Single file containing:
- Danger zone card (red border, warning styling)
- Delete data modal with two steps
- Category expansion components (inline, not separate files)

### Modal Step 1: Selection

```
┌─────────────────────────────────────────────────┐
│  Delete Data                              [X]   │
├─────────────────────────────────────────────────┤
│  Select data to delete:                         │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ ☐ Employees (recoverable)      47  [▼]  │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ ☐ Trips (permanent)           312  [▶]  │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ ☐ Column Mappings (permanent)   3  [▶]  │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ ☐ Import History (permanent)   12  [▶]  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│                        [Cancel]  [Continue →]   │
└─────────────────────────────────────────────────┘
```

- Counts fetched on modal open (4 quick queries)
- Individual items loaded only when category expanded
- Max-height with scroll for expanded lists (virtualize if >50 items)

### Modal Step 2: Confirmation

```
┌─────────────────────────────────────────────────┐
│  ← Confirm Deletion                       [X]   │
├─────────────────────────────────────────────────┤
│  ⚠️  You are about to delete:                   │
│                                                 │
│  🔄 Recoverable (30 days)                       │
│     • 47 employees                              │
│                                                 │
│  🗑️  Permanent                                  │
│     • 312 trips                                 │
│     • 3 column mappings                         │
│     • 12 import history records                 │
│                                                 │
│  ℹ️  Employees can be restored from             │
│     Settings → GDPR within 30 days.             │
│     All other items cannot be recovered.        │
│                                                 │
│  Type DELETE to confirm:                        │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│                     [← Back]  [Delete Data]     │
└─────────────────────────────────────────────────┘
```

## Server Action Design

### `bulkDeleteData()`

```typescript
interface BulkDeleteParams {
  employeeIds: string[]
  tripIds: string[]
  mappingIds: string[]
  historyIds: string[]
}

interface BulkDeleteResult {
  employees: number
  trips: number
  mappings: number
  history: number
  errors: string[]
}

async function bulkDeleteData(params: BulkDeleteParams): Promise<BulkDeleteResult>
```

### Execution Order

1. **Hard-delete trips** (batch: `DELETE FROM trips WHERE id = ANY($1)`)
2. **Soft-delete employees** (batch: `UPDATE employees SET deleted_at = NOW() WHERE id = ANY($1)`)
3. **Hard-delete mappings** (batch)
4. **Hard-delete import history** (batch)
5. **Log to GDPR audit trail** (single entry with summary)

### Error Handling

- No transaction wrapper (Supabase limitation for multi-table)
- Delete in dependency order (trips before employees)
- Continue on partial failure, collect errors
- Return counts of what succeeded + error messages
- Always log to audit trail regardless of outcome

## Danger Zone Card Styling

```tsx
<div className="border border-red-200 bg-red-50/50 rounded-xl p-6">
  <div className="flex items-center gap-2 text-red-800 mb-2">
    <AlertTriangle className="h-5 w-5" />
    <h2 className="text-lg font-semibold">Danger Zone</h2>
  </div>
  <p className="text-sm text-red-700 mb-4">
    Permanently remove employees, trips, and other data from your account.
  </p>
  <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
    Delete Data...
  </Button>
</div>
```

## Data Queries

### Count Queries (on modal open)

```sql
SELECT COUNT(*) FROM employees WHERE company_id = $1 AND deleted_at IS NULL;
SELECT COUNT(*) FROM trips WHERE company_id = $1;
SELECT COUNT(*) FROM column_mappings WHERE company_id = $1;
SELECT COUNT(*) FROM import_history WHERE company_id = $1;
```

### Item List Queries (on category expand)

```sql
-- Employees
SELECT id, name FROM employees WHERE company_id = $1 AND deleted_at IS NULL ORDER BY name;

-- Trips
SELECT id, employee_id, destination, start_date, end_date FROM trips WHERE company_id = $1 ORDER BY start_date DESC;

-- Mappings
SELECT id, name FROM column_mappings WHERE company_id = $1 ORDER BY name;

-- Import History
SELECT id, filename, created_at FROM import_history WHERE company_id = $1 ORDER BY created_at DESC;
```

## Reused Components

- `ConfirmDestructiveAction` from `components/gdpr/` for type-to-confirm pattern
- Existing checkbox, button, dialog components from `components/ui/`
- Toast notifications from existing pattern

## Out of Scope

- Soft-delete for trips (would require migration + recovery UI)
- Undo within the modal (use GDPR recovery instead)
- Scheduled/delayed deletion
- Export before delete prompt

## Testing Checklist

- [ ] Modal opens and shows correct counts
- [ ] Categories expand and show individual items
- [ ] "Select All" toggles all items in category
- [ ] Continue disabled until selection made
- [ ] Summary shows correct grouped counts
- [ ] Delete button disabled until "DELETE" typed
- [ ] Deletion executes and reports results
- [ ] Employees appear in GDPR recovery table
- [ ] Trips/mappings/history are permanently gone
- [ ] Audit log entry created
- [ ] Error states handled gracefully
- [ ] Works on mobile viewport
