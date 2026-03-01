# Hero Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the above-the-fold hero section of the ComplyEur landing page to improve B2B conversion quality — sharper copy, inline CTAs, and consistent language across nav and waitlist form.

**Architecture:** Pure copy + minimal JSX changes across two files. No new components. The hero text column gains a consequence line, a micro-trust line, and a CTA button group. The nav and waitlist form get label updates to match. No structural page redesign.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS

**Design reference:** `docs/plans/2026-03-01-hero-upgrade-design.md`

---

## File Map

```
app/(preview)/landing/page.tsx        ← hero copy, CTA group, mock caption, nav labels, waitlist eyebrow
app/(preview)/landing/waitlist-form.tsx  ← submit button label
```

---

### Task 1: Update the hero eyebrow and H1

**File:** `app/(preview)/landing/page.tsx`

The hero text column starts around line 182 inside the `<section>` at line 179. The eyebrow `<p>` is at line 183, the `<h1>` is at lines 186–188.

**Step 1: Open the file and locate the hero eyebrow**

Find this block (around line 183):
```tsx
<p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
  UK business travel compliance
</p>
```

Replace with:
```tsx
<p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
  Schengen compliance for UK travel teams
</p>
```

**Step 2: Update the H1**

Find (around line 186):
```tsx
<h1 className="landing-serif mt-4 text-balance text-5xl font-semibold leading-[1.02] text-slate-900 sm:text-6xl lg:text-7xl">
  Approve EU trips with every Schengen day already clear.
</h1>
```

Replace with:
```tsx
<h1 className="landing-serif mt-4 text-balance text-5xl font-semibold leading-[1.02] text-slate-900 sm:text-6xl lg:text-7xl">
  Know every employee&rsquo;s Schengen position before you approve.
</h1>
```

Note: Use `&rsquo;` for the apostrophe in "employee's" — Next.js/React will render it correctly and avoids linting warnings for unescaped entities.

**Step 3: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

**Step 4: Commit**

```bash
git add app/\(preview\)/landing/page.tsx
git commit -m "copy(hero): update eyebrow and H1 to outcome-led messaging"
```

---

### Task 2: Replace two-paragraph subheadline with single paragraph + consequence line + micro-trust line

**File:** `app/(preview)/landing/page.tsx`

Currently there are two `<p>` elements after the H1 (around lines 190–198). Replace both with three new elements.

**Step 1: Find the existing two-paragraph block**

```tsx
<p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
  ComplyEur gives HR, operations, and mobility teams a live 90/180-day position for every traveller, so
  approvals are based on current data instead of spreadsheet checks.
</p>

<p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
  As the EU Entry/Exit System (EES) expands automated border controls, manual counting leaves less room
  for error. ComplyEur becomes the working record behind each Schengen travel decision.
</p>
```

**Step 2: Replace with three new elements**

```tsx
<p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
  ComplyEur gives HR, operations, and mobility teams a live 90/180-day record for every traveller
  &mdash; so approvals are based on current data, not manual counting.
</p>

<p className="mt-4 max-w-xl text-sm font-medium text-slate-700">
  Avoid overstays. Avoid fines. Avoid border refusals.
</p>

<p className="mt-2 max-w-xl text-sm text-slate-500">
  No spreadsheets. No manual counting. One live record per approval.
</p>
```

Notes:
- Use `&mdash;` for the em dash — avoids lint warnings
- The consequence line is `font-medium text-slate-700` so it reads with light emphasis without competing with the subheadline
- The micro-trust line is `text-slate-500` — visually subordinate

**Step 3: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

**Step 4: Commit**

```bash
git add app/\(preview\)/landing/page.tsx
git commit -m "copy(hero): tighten subheadline + add consequence line and micro-trust"
```

---

### Task 3: Add CTA button group to the hero text column

**File:** `app/(preview)/landing/page.tsx`

Add the CTA group immediately after the micro-trust `<p>` (the last element added in Task 2), still inside the `<div className="max-w-2xl">`.

**Step 1: Add the CTA group**

After the micro-trust `<p>`, add:

```tsx
<div className="mt-8 flex flex-wrap items-center gap-3">
  <Link
    href="#waitlist"
    className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
  >
    Request Early Access
  </Link>
  <Link
    href="/landing/preview"
    className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
  >
    See the product &rarr;
  </Link>
</div>
```

Notes:
- `flex flex-wrap gap-3` — on narrow viewports both buttons wrap to full width naturally
- `&rarr;` for the arrow — avoids lint warnings for the `→` character
- `Link` is already imported at the top of the file (`import Link from 'next/link'`) — no new import needed

**Step 2: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

**Step 3: Commit**

```bash
git add app/\(preview\)/landing/page.tsx
git commit -m "feat(hero): add inline CTA button group to hero text column"
```

---

### Task 4: Add caption above the browser mock in the right column

**File:** `app/(preview)/landing/page.tsx`

The right column `<div id="product-demo">` is around line 201.

**Step 1: Find the right column div**

```tsx
<div id="product-demo" className="space-y-5 lg:pt-2">
  <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur">
```

**Step 2: Add the caption before the inner div**

```tsx
<div id="product-demo" className="space-y-5 lg:pt-2">
  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
    Live 90/180-day tracking, per employee
  </p>
  <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur">
```

**Step 3: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

**Step 4: Commit**

```bash
git add app/\(preview\)/landing/page.tsx
git commit -m "copy(hero): add caption above product demo mock"
```

---

### Task 5: Update nav labels

**File:** `app/(preview)/landing/page.tsx`

Two places in the `<nav>` need updating (around lines 155–172).

**Step 1: Update the nav link text**

Find (around line 155):
```tsx
<Link href="#waitlist" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
  Join waitlist
</Link>
```

Replace with:
```tsx
<Link href="#waitlist" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
  Request access
</Link>
```

**Step 2: Update the nav pill button**

Find (around line 167):
```tsx
<Link
  href="#waitlist"
  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
>
  Join Waiting List
</Link>
```

Replace with:
```tsx
<Link
  href="#waitlist"
  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
>
  Request Early Access
</Link>
```

**Step 3: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

**Step 4: Commit**

```bash
git add app/\(preview\)/landing/page.tsx
git commit -m "copy(nav): update waitlist labels to request access language"
```

---

### Task 6: Update the waitlist section eyebrow

**File:** `app/(preview)/landing/page.tsx`

The waitlist section is around line 433.

**Step 1: Find the waitlist eyebrow**

```tsx
<p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Private launch cohort</p>
```

Replace with:
```tsx
<p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">Early access</p>
```

**Step 2: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

**Step 3: Commit**

```bash
git add app/\(preview\)/landing/page.tsx
git commit -m "copy(waitlist): update eyebrow from launch cohort to early access"
```

---

### Task 7: Update waitlist form submit button label

**File:** `app/(preview)/landing/waitlist-form.tsx`

The submit button label is at line 119.

**Step 1: Find the button label**

```tsx
'Join Waiting List'
```

This appears twice — once as the button text on line 119, once as the `isPending` fallback check. Find the non-pending branch:

```tsx
) : (
  'Join Waiting List'
)}
```

Replace with:
```tsx
) : (
  'Request Access'
)}
```

**Step 2: Verify TypeScript compiles**

```bash
npm run typecheck
```
Expected: no errors.

**Step 3: Commit**

```bash
git add app/\(preview\)/landing/waitlist-form.tsx
git commit -m "copy(waitlist-form): update submit button label to Request Access"
```

---

### Task 8: Full build verification + acceptance test walkthrough

**Step 1: Run the production build**

```bash
npm run build
```
Expected: Build completes with no errors. The pre-existing `/settings/mappings` dynamic route warning is expected — not an error.

**Step 2: Start the dev server**

```bash
npm run dev
```

Navigate to `http://localhost:3000/landing`.

**Step 3: Run through acceptance tests manually**

| # | Check | Pass? |
|---|---|---|
| 1 | H1 reads "Know every employee's Schengen position before you approve." | |
| 2 | H1 is ≤10 words (count: 9) | |
| 3 | Subheadline is one paragraph, ≤28 words | |
| 4 | Consequence line reads "Avoid overstays. Avoid fines. Avoid border refusals." | |
| 5 | Micro-trust line reads "No spreadsheets. No manual counting. One live record per approval." | |
| 6 | "Request Early Access" and "See the product →" buttons visible in hero | |
| 7 | No stats or numeric claims in hero section | |
| 8 | "HR, operations, and mobility" named in subheadline | |
| 9 | At 1280×800: "Request Early Access" button visible without scrolling | |
| 10 | At 390px mobile: "Request Early Access" button visible without scrolling | |
| 11 | Secondary "See the product →" is outline style, visually distinct from primary | |
| 12 | Micro-trust line is smaller/lighter than subheadline | |
| 13 | Nav pill shows "Request Early Access" | |
| 14 | Nav link shows "Request access" | |
| 15 | Waitlist section eyebrow shows "Early access" | |
| 16 | Waitlist form submit shows "Request Access" | |
| 17 | Caption "Live 90/180-day tracking, per employee" appears above browser mock | |

**Step 4: Final commit if any minor fixes were needed**

```bash
git add -p
git commit -m "fix(hero): acceptance test corrections"
```
