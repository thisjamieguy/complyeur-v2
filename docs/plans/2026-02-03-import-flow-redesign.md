# Import Flow UX Redesign

**Date:** 2026-02-03
**Status:** Ready for implementation
**Priority:** UX simplification first, visual polish second

---

## Problem Statement

The current import flow has several UX issues:
- Format selection cards look generic and cluttered
- Users don't understand the purpose or next steps
- No visual progress indication across the 4-step flow
- Duplicate handling options confuse users
- Success page feels anticlimactic
- No feedback during file processing stages

## Target Users

Mix of beginners (HR/Admin staff needing hand-holding) and power users (Finance/Ops managers wanting efficiency).

## Design Direction

Clean & minimal (Linear/Notion style) — white space, subtle colors, let content breathe.

---

## Changes

### 1. Step Indicator Component

**New file:** `components/import/StepIndicator.tsx`

4 horizontal dots with connecting lines showing progress:
1. Format
2. Upload
3. Preview
4. Done

Visual states:
- Current step: filled blue (`bg-blue-600`)
- Completed: filled blue with checkmark
- Future: gray outline (`border-slate-300`)
- Labels below dots: `text-xs text-slate-500`

Usage:
```tsx
<StepIndicator currentStep={1} />
```

Placement:
- `import/page.tsx` → `currentStep={1}`
- `import/upload/page.tsx` → `currentStep={2}`
- `import/preview/page.tsx` → `currentStep={3}`
- `import/success/page.tsx` → `currentStep={4}`

---

### 2. Simplified Format Selection Cards

**Modify:** `components/import/FormatSelector.tsx`

Changes:
- Icon: smaller (40px instead of 48px)
- Required columns: change from badges to subtle text (`text-xs text-slate-400`)
- Download button: `variant="ghost"` with icon + "Template"
- Card hover: subtle `bg-slate-50`, no aggressive lift
- Increase gap between cards (`gap-8`)
- Remove "Coming Soon" badge logic

---

### 3. Collapsible First-Time Guide

**New file:** `components/import/FirstTimeGuide.tsx`

Collapsed state (default):
- Single line: "First time importing? See how it works"
- Help icon + chevron, subtle styling

Expanded state:
- Bordered box with 3-step explanation:
  1. Choose a format
  2. Upload your file
  3. Review & import
- "Got it" button to collapse

No localStorage persistence — keep it simple.

---

### 4. Remove Duplicate Handling Options

**Delete:** `components/import/DuplicateHandlingOptions.tsx`

Smart defaults (hardcoded):
- Employees: `update` (update existing if email matches)
- Trips: `skip` (skip if same employee + dates exist)

Changes to `preview/page.tsx`:
- Remove `duplicateOptions` state
- Remove `DuplicateHandlingOptions` render
- Pass hardcoded defaults to `executeImport()`
- Add subtle info line: "Existing employees will be updated. Duplicate trips will be skipped."

Update `types/import.ts`:
- Change `DEFAULT_DUPLICATE_OPTIONS` to reflect smart defaults

---

### 5. Celebratory Success Page

**Modify:** `components/import/ImportSummary.tsx`

Header changes:
- Larger icon (32px) with scale-in animation
- Headline: "Import Successful" → "You're all set!"
- Contextual subheadline based on import type:
  - "12 employees are now ready to track"
  - "24 trips have been added to your records"

Stats cards:
- Add staggered fade-in animation (100ms delay each)
- Hide cards with 0 count

Actions:
- "Go to Dashboard" → `size="lg"`, primary
- "Import More Data" → `variant="ghost"`, secondary
- Add prompt: "View your updated dashboard →"

No confetti — animations and copy provide enough satisfaction.

---

### 6. Processing Feedback

**Modify:** `app/(dashboard)/import/upload/page.tsx`

New processing stages:
```tsx
type ProcessingStage =
  | 'uploading'    // "Uploading file..."
  | 'parsing'      // "Reading spreadsheet..."
  | 'validating'   // "Validating data..."
  | 'preparing'    // "Preparing preview..."
```

UI during processing:
- Replace dropzone with centered processing state
- Spinner + current stage text
- Fade transition between stages

Update stages in `handleFileSelect()`:
- After `createImportSession()` → `'parsing'`
- After `parseFileRaw()` → `'validating'`
- After `validateRows()` → `'preparing'`

---

## File Changes Summary

| Action | File |
|--------|------|
| Create | `components/import/StepIndicator.tsx` |
| Create | `components/import/FirstTimeGuide.tsx` |
| Modify | `components/import/FormatSelector.tsx` |
| Modify | `components/import/ImportSummary.tsx` |
| Modify | `app/(dashboard)/import/page.tsx` |
| Modify | `app/(dashboard)/import/upload/page.tsx` |
| Modify | `app/(dashboard)/import/preview/page.tsx` |
| Modify | `app/(dashboard)/import/success/page.tsx` |
| Modify | `types/import.ts` |
| Delete | `components/import/DuplicateHandlingOptions.tsx` |

---

## Out of Scope

- Column mapping table redesign (deprioritized — unclear usage frequency)
- Shared import layout wrapper (keeping simple per-page approach)
- localStorage for first-time guide (unnecessary complexity)

---

## Success Criteria

- [ ] Users can see their progress through the 4-step flow
- [ ] Format selection feels cleaner with less visual noise
- [ ] First-time users have optional guidance available
- [ ] No confusing duplicate handling decisions required
- [ ] Success page feels rewarding, not flat
- [ ] Users see meaningful feedback during processing
