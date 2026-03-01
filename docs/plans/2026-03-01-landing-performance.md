# Landing Page Performance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce Total Blocking Time and improve Lighthouse/Core Web Vitals on `/landing` by deferring above-fold JS animations until after browser idle, and skipping below-fold rendering work with `content-visibility: auto`.

**Architecture:** Three targeted changes — idle-deferred setInterval on DemoEmployeeList and FeatureTicker, plus a CSS-only `content-visibility: auto` utility applied to 5 below-fold page sections. No new dependencies. No structural page changes.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4, TypeScript

**Design doc:** `docs/plans/2026-03-01-landing-performance-design.md`

---

## Task 1: Add `.cv-auto` utility to globals.css

**Why:** `content-visibility: auto` tells the browser to skip layout/paint for off-screen sections. `contain-intrinsic-block-size` gives it a height hint so scroll position doesn't jump when a section first renders.

**Files:**
- Modify: `app/globals.css`

**Step 1: Open globals.css and find the end of the file**

The file uses Tailwind v4 (`@import "tailwindcss"`). Custom utilities go at the bottom using plain CSS class syntax (not `@utility`, which would be stripped from the output).

**Step 2: Add the utility class at the bottom of globals.css**

Append this block after all existing rules:

```css
/* Performance: skip off-screen section layout/paint */
.cv-auto {
  content-visibility: auto;
  contain-intrinsic-block-size: var(--cis-h, 600px);
}
```

Explanation of each property:
- `content-visibility: auto` — browser skips rendering content that is off-screen
- `contain-intrinsic-block-size` — tells the browser what height to use as a placeholder when the section is not rendered, preventing scroll jump. Falls back to `600px` if no `--cis-h` variable is set on the element.

**Step 3: Verify the file saved correctly**

Open `app/globals.css` and confirm `.cv-auto` is at the bottom with both properties.

**Step 4: Commit**

```bash
git add app/globals.css
git commit -m "perf(landing): add cv-auto utility for content-visibility optimisation"
```

---

## Task 2: Apply `.cv-auto` to 5 below-fold sections in the landing page

**Why:** The landing page has large sections below the fold that the browser renders eagerly. `content-visibility: auto` defers their layout/paint until they're near the viewport.

**Files:**
- Modify: `app/(preview)/landing/page.tsx`

**Context:** The file has `export const dynamic = 'force-static'` — it's pre-rendered HTML at build time. All changes here are className/style additions only; no logic changes.

**Step 1: Find the 5 sections to update**

Search for these 5 landmarks in the file (line numbers are approximate, use the text anchors):

1. **Enforcement band** — `<section className="bg-slate-50/80 py-20 sm:py-24">`
2. **Features wrapper** — `<div id="features">`
3. **How it works** — `<section id="how-it-works" className="bg-slate-50 py-24">`
4. **Explore more** — `<section className="border-t border-slate-200/70 bg-white py-16">`
5. **Early access CTA** — `<section id="early-access" className="relative overflow-hidden bg-slate-900 py-24">`

**Step 2: Add `cv-auto` class and `--cis-h` height hint to each section**

For each section, add `cv-auto` to the `className` AND add a `style` prop with the height hint. Match each section to its estimated height:

**Enforcement band (section ~line 235):**
```tsx
<section
  className="cv-auto bg-slate-50/80 py-20 sm:py-24"
  style={{ '--cis-h': '800px' } as React.CSSProperties}
>
```

**Features wrapper (div ~line 366):**
```tsx
<div
  id="features"
  className="cv-auto"
  style={{ '--cis-h': '700px' } as React.CSSProperties}
>
```

**How it works (section ~line 370):**
```tsx
<section
  id="how-it-works"
  className="cv-auto bg-slate-50 py-24"
  style={{ '--cis-h': '750px' } as React.CSSProperties}
>
```

**Explore more (section ~line 406):**
```tsx
<section
  className="cv-auto border-t border-slate-200/70 bg-white py-16"
  style={{ '--cis-h': '350px' } as React.CSSProperties}
>
```

**Early access CTA (section ~line 434):**
```tsx
<section
  id="early-access"
  className="cv-auto relative overflow-hidden bg-slate-900 py-24"
  style={{ '--cis-h': '500px' } as React.CSSProperties}
>
```

Note: The `as React.CSSProperties` cast is needed because TypeScript's `CSSProperties` type doesn't include custom CSS variables. This is standard practice in Next.js projects.

**Step 3: Run the dev server and check for layout issues**

```bash
npm run dev
```

Visit `http://localhost:3000/landing`. Scroll slowly down the page. The sections should appear and render normally. If any section appears blank when visible, check that `cv-auto` is not on an element that contains a scroll anchor.

**Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no new errors.

**Step 5: Commit**

```bash
git add app/(preview)/landing/page.tsx
git commit -m "perf(landing): apply content-visibility:auto to 5 below-fold sections"
```

---

## Task 3: Idle-defer animation in DemoEmployeeList

**Why:** This component runs a `setInterval` every 2500ms from first paint, contributing to Total Blocking Time. Deferring it until after browser idle removes JS work from the critical path.

**Files:**
- Modify: `components/marketing/demo-employee-list.tsx`

**Step 1: Add `isAnimating` state**

Find the existing state declarations near the top of `DemoEmployeeList`:

```tsx
const isControlled = Boolean(employees)
const [frameIndex, setFrameIndex] = useState(0)
```

Add `isAnimating` immediately after:

```tsx
const isControlled = Boolean(employees)
const [frameIndex, setFrameIndex] = useState(0)
const [isAnimating, setIsAnimating] = useState(false)
```

**Step 2: Add the idle-callback useEffect**

Find the existing `useEffect` that runs the `setInterval`:

```tsx
useEffect(() => {
  if (isControlled) return

  const interval = setInterval(() => {
    setFrameIndex((prev) => (prev + 1) % employeeAnimations[0].frames.length)
  }, 2500)

  return () => clearInterval(interval)
}, [isControlled])
```

**Replace it** with two separate `useEffect` calls. The first fires the idle callback; the second runs the interval only after `isAnimating` is true:

```tsx
// Fire requestIdleCallback after mount to signal "browser is ready"
useEffect(() => {
  if (isControlled) return
  let id: number

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    id = window.requestIdleCallback(() => setIsAnimating(true), { timeout: 2000 })
  } else {
    id = window.setTimeout(() => setIsAnimating(true), 1000) as unknown as number
  }

  return () => {
    if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(id)
    } else {
      window.clearTimeout(id)
    }
  }
}, [isControlled])

// Only start cycling frames after browser idle
useEffect(() => {
  if (isControlled || !isAnimating) return

  const interval = setInterval(() => {
    setFrameIndex((prev) => (prev + 1) % employeeAnimations[0].frames.length)
  }, 2500)

  return () => clearInterval(interval)
}, [isControlled, isAnimating])
```

Key points:
- `requestIdleCallback` fires when the browser has spare time after the initial load. The `{ timeout: 2000 }` option is a deadline — if the browser is still busy after 2 seconds, it fires anyway.
- `setTimeout(fn, 1000)` is the fallback for browsers that don't support `requestIdleCallback` (older Safari). 1 second is a reasonable post-load delay.
- `typeof window !== 'undefined'` guards are needed because Next.js SSR runs this code on the server where `window` doesn't exist.
- The first render always shows frame 0 (the existing default). No visual change on first paint.

**Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

**Step 4: Manual smoke test**

```bash
npm run dev
```

Visit `http://localhost:3000/landing`. The demo table should be visible immediately with static data. After ~1 second, the numbers in the table should start cycling. This confirms the defer is working.

**Step 5: Commit**

```bash
git add components/marketing/demo-employee-list.tsx
git commit -m "perf(demo-employee-list): defer setInterval until browser idle"
```

---

## Task 4: Idle-defer animation in FeatureTicker

**Why:** Same pattern as Task 3. The ticker runs a `setInterval` from first paint, contributing to TBT. The ticker already shows `features[0]` statically on first render — we just stop the interval from starting until after idle.

**Files:**
- Modify: `components/marketing/feature-ticker.tsx`

**Step 1: Add `isAnimating` state**

Find the existing state declarations at the top of `FeatureTicker`:

```tsx
const [currentIndex, setCurrentIndex] = useState(0)
const [isVisible, setIsVisible] = useState(true)
const [isPaused, setIsPaused] = useState(false)
const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
```

Add `isAnimating` after them:

```tsx
const [currentIndex, setCurrentIndex] = useState(0)
const [isVisible, setIsVisible] = useState(true)
const [isPaused, setIsPaused] = useState(false)
const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
const [isAnimating, setIsAnimating] = useState(false)
```

**Step 2: Add idle-callback useEffect**

Add this new `useEffect` after the existing state declarations, before the `cycleFeature` callback:

```tsx
// Defer ticker animation until browser idle
useEffect(() => {
  let id: number

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    id = window.requestIdleCallback(() => setIsAnimating(true), { timeout: 2000 })
  } else {
    id = window.setTimeout(() => setIsAnimating(true), 1000) as unknown as number
  }

  return () => {
    if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(id)
    } else {
      window.clearTimeout(id)
    }
  }
}, [])
```

**Step 3: Guard the interval useEffect with `isAnimating`**

Find the existing interval `useEffect`:

```tsx
useEffect(() => {
  if (isPaused || prefersReducedMotion) return

  const interval = setInterval(cycleFeature, 4000)

  return () => clearInterval(interval)
}, [isPaused, prefersReducedMotion, cycleFeature])
```

Add `!isAnimating` to the guard and `isAnimating` to the dependency array:

```tsx
useEffect(() => {
  if (isPaused || prefersReducedMotion || !isAnimating) return

  const interval = setInterval(cycleFeature, 4000)

  return () => clearInterval(interval)
}, [isPaused, prefersReducedMotion, cycleFeature, isAnimating])
```

**Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

**Step 5: Manual smoke test**

```bash
npm run dev
```

Visit `http://localhost:3000/landing`. The ticker text below the hero CTA should show the first feature statically on load. After ~1 second, it should start rotating through the 5 features every 4 seconds.

**Step 6: Commit**

```bash
git add components/marketing/feature-ticker.tsx
git commit -m "perf(feature-ticker): defer setInterval until browser idle"
```

---

## Task 5: Verify with Lighthouse

**Why:** Confirm the changes actually moved the needle before deploying.

**Step 1: Build for production**

```bash
npm run build
npm run start
```

**Step 2: Run Lighthouse on the local production build**

Open Chrome DevTools → Lighthouse → Performance. Set:
- Mode: Navigation
- Device: Mobile

Run against `http://localhost:3000/landing`.

**Step 3: Check TBT specifically**

Look at "Total Blocking Time" in the Lighthouse report. Before these changes, TBT was likely 150–400ms on a throttled mobile connection. After, it should be materially lower (target: under 200ms).

Also check:
- LCP: should be unchanged or slightly improved
- CLS: should be 0 or very close (height hints prevent jump)

**Step 4: If TBT hasn't improved, debug**

Open Chrome DevTools → Performance → record a page load. Look for long tasks (red bars). If the `setInterval` callbacks are still appearing early, check that the idle callback `useEffect` is firing correctly by adding a temporary `console.log('idle fired')` inside the callback.

**Step 5: Final commit if any tweaks were made**

```bash
git add -p
git commit -m "perf(landing): adjust idle deferral height hints after Lighthouse verification"
```

---

## Summary of Changes

| File | What changed |
|---|---|
| `app/globals.css` | Added `.cv-auto` utility class |
| `app/(preview)/landing/page.tsx` | Added `cv-auto` class + height hints to 5 sections |
| `components/marketing/demo-employee-list.tsx` | Idle-deferred `setInterval` |
| `components/marketing/feature-ticker.tsx` | Idle-deferred `setInterval` |

**Expected outcome:** TBT reduced, Lighthouse Performance score improved. No visual regressions. The landing page looks and functions identically to before.
