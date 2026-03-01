# Hero Upgrade Design — ComplyEur Landing Page
**Date:** 2026-03-01
**Scope:** Above-the-fold hero section only (`app/(preview)/landing/page.tsx` + `waitlist-form.tsx`)
**Target:** Conversion quality 9.2 → 9.5

---

## Problem
- Two-paragraph subheadline kills scanning
- No CTA in the hero text column — buyer must scroll or use nav
- "Join Waiting List" language signals consumer/early-stage product
- H1 is passive; doesn't name the problem being solved

---

## Approved Design

### Eyebrow
> Schengen compliance for UK travel teams

### H1
> Know every employee's Schengen position before you approve.

### Subheadline (single paragraph)
> ComplyEur gives HR, operations, and mobility teams a live 90/180-day record for every traveller — so approvals are based on current data, not manual counting.

### Consequence line (new, below subheadline)
> Avoid overstays. Avoid fines. Avoid border refusals.

### Micro-trust line (above CTA buttons)
> No spreadsheets. No manual counting. One live record per approval.

### CTA group
- **Primary:** "Request Early Access" → `#waitlist`
- **Secondary:** "See the product →" → `/landing/preview`

### Browser mock caption (right column, above the mock)
> Live 90/180-day tracking, per employee

---

## Files to Change

| File | Change |
|---|---|
| `app/(preview)/landing/page.tsx` | Hero copy, CTA group, mock caption, nav button label, nav link text |
| `app/(preview)/landing/waitlist-form.tsx` | Submit button label: "Join Waiting List" → "Request Access" |

---

## Structural Changes

1. Replace eyebrow text
2. Replace H1
3. Replace two-paragraph subheadline with single paragraph
4. Add consequence line (`text-sm font-medium text-slate-700`) after subheadline
5. Add micro-trust line (`text-sm text-slate-500`) after consequence line
6. Add CTA button group (`flex flex-wrap gap-3`) — primary filled + secondary outline
7. Add caption above right-column browser mock
8. Nav pill button: "Join Waiting List" → "Request Early Access"
9. Nav link: "Join waitlist" → "Request access"
10. Waitlist section eyebrow: "Private launch cohort" → "Early access"
11. Waitlist form submit: "Join Waiting List" → "Request Access"

---

## Acceptance Tests

| # | Test | Pass |
|---|---|---|
| 1 | Headline communicates outcome within 5 seconds | Cold reader states "helps approve trips safely" |
| 2 | Headline ≤ 10 words | Count ≤ 10 |
| 3 | Subheadline ≤ 28 words, single paragraph | Count ≤ 28, no second paragraph |
| 4 | No unverifiable numeric claims in hero | No stats, percentages, breach counts |
| 5 | Target audience named | "HR, operations, and mobility" in subheadline |
| 6 | "90/180-day" contextualised | Followed by plain-English explanation |
| 7 | No EES in hero | No EES language above the fold |
| 8 | No unverifiable guarantees | No "never breach" / "guaranteed compliance" |
| 9 | Primary CTA above fold on 1280×800 | Visible without scrolling |
| 10 | Primary CTA above fold on 390px mobile | Visible without scrolling |
| 11 | Secondary CTA visually distinct | Outline/ghost style, not matching primary |
| 12 | Micro-trust line subordinate | `text-sm` or smaller, below subheadline |
