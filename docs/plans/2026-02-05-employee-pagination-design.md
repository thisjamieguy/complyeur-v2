# Employee List Pagination Design

**Date:** 2026-02-05
**Status:** Approved

## Problem

The employee dashboard loads all employees at once. While acceptable for beta (<50 employees), this won't scale to 200+ employees without performance degradation.

## Solution

Server-side pagination with page size of 25, preserving client-side status filtering for instant UX.

## Design

### Data Layer

**File:** `lib/data/employees.ts`

```typescript
interface PaginationParams {
  page?: number        // 1-indexed, default 1
  pageSize?: number    // default 25
  search?: string      // optional name search
}

interface PaginatedEmployeeResult {
  employees: EmployeeCompliance[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}
```

**New function:** `getEmployeeComplianceDataPaginated(params, statusThresholds)`

- Uses Supabase `.range(from, to)` for pagination
- Search uses `.ilike('name', '%search%')`
- Separate count query for totals
- Stats calculated from count query, not loaded data

### URL Structure

```
/dashboard?page=2&search=john
```

- `page` - 1-indexed page number
- `search` - name search query (debounced on client)
- Status filter remains client-side (instant toggling)

### Component Changes

**`ComplianceTable`** - receives pagination props, renders pagination controls
**`Pagination`** - new reusable component (extract from admin pattern)
**`DashboardPage`** - reads URL params, passes to data fetcher

### Pagination Component

```typescript
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}
```

Features:
- Previous/Next buttons
- Page X of Y indicator
- Disabled states at boundaries
- Mobile-friendly

## Test Plan

1. Unit tests for `getEmployeeComplianceDataPaginated`
2. Verify pagination math (edge cases: 0 items, 1 item, exact page boundary)
3. Verify search + pagination interaction
4. Manual test: add 30 employees, verify 2 pages shown

## Migration

No database changes. Backward compatible - existing code continues to work.
