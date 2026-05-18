# Exports Page — Split Panel Redesign

**Date:** 2026-05-18
**Status:** Approved

## Overview

Replace the current single-card stacked form with a persistent two-column split panel. The left column holds all configuration; the right column shows a live summary of the report that will be generated, with the recent exports log below it.

The goal is a layout that feels like a tool, not a form — you can see what you're about to generate while you configure it.

## Layout

Two columns, `grid-template-columns: 1.1fr 0.9fr` (~55/45 split), gap 16px, aligned to their tops.

### Left column — Configure report

A single white card (`rounded-lg border bg-card`) with a `Configure report` heading.

Sections stacked vertically inside:

**Scope** — four full-width stacked rows (not the current 2×2 grid). Each row is a clickable button showing a radio indicator, a bold label, and a muted description line. Selected row uses dark filled background (`bg-slate-900 text-white`); unselected uses border-only. Rows:
- All employees — `7 employees · full company overview`
- Single employee — `Individual report with full trip history`
- By compliance status — `Export only at-risk or non-compliant`
- Planned trip forecast — `Upcoming trips and predicted compliance`

Conditional fields (same as current behaviour, unchanged):
- If `single` → employee select dropdown
- If `filtered` → status select dropdown
- If `future-alerts` → alerts filter select + amber info box

**Period** — existing `DateRangePicker` component, unchanged. Shows preset dropdown + resolved date range below.

**Format** — two-column grid of format buttons (CSV / PDF), same logic as current `FormatOption` sub-component, unchanged.

**Generate Export** button — full width, dark, at the bottom of the card.

### Right column — Preview + History

Two cards stacked vertically, gap 12px.

**Report preview card** (top)

Header: `Report preview` label + a `Live` pill badge (muted, small).

Body:

- Two stat tiles side by side: **employee count** and **day window**. Employee count: `all` → total count, `single` → 1, `filtered` → depends on status (show `—` until filter selected), `future-alerts` → total count. Day window: `differenceInDays(to, from) + 1` from the current date range; hidden for `future-alerts` scope (replaced with `—` or "Future trips").
- Compliance snapshot bar: a proportional bar split into green/amber/red segments based on current employee compliance statuses. Label row below showing counts. This is display-only; data fetched server-side on page load alongside the employee list.
- Format detail strip: conditional. For PDF: green tinted box — "PDF · Audit format / Unique document ID will be assigned on generation". For CSV: neutral — "CSV · Opens in Excel or Google Sheets".

The preview updates reactively as the user changes scope, date range, or format on the left.

**Recent exports card** (bottom)

Header: `Recent exports`.

Body: list of the last 5 exports, each row showing:
- Icon (PDF or spreadsheet)
- Report type label + format badge
- Date range + record count
- Document ID (monospace, muted) + relative timestamp

Sourced from `getRecentExports(5)` — already implemented. If no exports exist, card is hidden entirely (existing behaviour).

## Data requirements

| Data | Source | When fetched |
|------|--------|-------------|
| Employee list + count | `getEmployeesForExport()` | Server, on page load (existing) |
| Compliance snapshot (compliant/at-risk/non-compliant counts) | New query — `getCompanyComplianceSnapshot()` | Server, on page load |
| Recent exports | `getRecentExports(5)` | Server, on page load (existing) |

The compliance snapshot is a simple count query over employees' current compliance status. It lives in `lib/db/employees.ts` (consistent with where other employee queries are defined) and is called from `page.tsx` via a `ComplianceSnapshotLoader` Suspense wrapper.

## Component changes

| File | Change |
|------|--------|
| `app/(dashboard)/exports/page.tsx` | Add `ComplianceSnapshotLoader` alongside existing loaders; restructure page into two-column grid |
| `components/exports/export-form.tsx` | Receive `scope`/`dateRange`/`format` state + setters as props (lifted to shell); restructure layout to left-column config only; card wrapper (`Card`/`CardHeader`/`CardContent`/`CardFooter`) moved to `ExportsClientShell` |
| `components/exports/report-preview.tsx` | **New.** Right-panel preview card. Props: `scope`, `employeeCount`, `dateRange`, `format`, `snapshot`. Pure display — no server calls. |
| `app/actions/exports.ts` | Add `getCompanyComplianceSnapshot()` (or place in `lib/db/`) |

The `ExportForm` becomes the left column only. The right column (`ReportPreview` + recent exports) is rendered by the page, not inside the form. State is lifted: `scope`, `dateRange`, `format` live in the page's client wrapper so both columns can read them.

## State architecture

Because the preview must react to the form's state, a thin client wrapper owns the shared state:

```
ExportsClientShell (client component — owns scope/dateRange/format state)
├── ExportForm (left column — receives state + setters as props)
└── ReportPreview (right column — receives state + snapshot as props)
```

The page (`page.tsx`) remains a server component and passes the server-fetched data (employees, snapshot, recent exports) into `ExportsClientShell`.

## Out of scope

- No changes to export generation logic, server actions, or file download behaviour.
- No changes to `DateRangePicker` or `date-range-picker.tsx`.
- No mobile-specific layout (existing responsive behaviour is acceptable for now; the two columns will stack on narrow viewports via `grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]`).
