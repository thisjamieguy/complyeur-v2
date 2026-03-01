# Landing Page Performance Design

**Date:** 2026-03-01
**Scope:** `/landing` page performance improvements
**Approach:** Option A — requestIdleCallback deferral + content-visibility
**Target metrics:** Core Web Vitals (LCP, INP, TBT) + Lighthouse score

---

## Context

The landing page (`app/(preview)/landing/page.tsx`) is `force-static`. Server components (FeatureCards, DemoCalendar, BrowserFrame) are already optimal — no client JS. The remaining JS weight comes from three `'use client'` components:

| Component | Location | Issue |
|---|---|---|
| `DemoEmployeeList` | Hero (above fold) | setInterval fires every 2500ms from first paint |
| `FeatureTicker` | Hero (above fold) | setInterval fires every 4000ms from first paint |
| `WaitlistForm` | Early access CTA (below fold) | Already optimised — Turnstile lazy-loads on interaction |

---

## Design

### Part 1 — Idle deferral: DemoEmployeeList

**File:** `components/marketing/demo-employee-list.tsx`

Add `isAnimating` state, defaulting to `false`. On mount, fire `requestIdleCallback` (with `setTimeout(fn, 1000)` fallback for Safari/old browsers) that flips `isAnimating` to `true`. Move the `setInterval` guard to include `!isAnimating`.

**Behaviour:**
- First paint: component renders frame 0 as a static snapshot
- After browser idle (~500–1500ms post-load): animation starts cycling through frames every 2500ms
- Cleanup: cancel idle callback on unmount; existing clearInterval unchanged

**Pattern:**
```tsx
const [isAnimating, setIsAnimating] = useState(false)

// Idle callback — runs once on mount
useEffect(() => {
  if (isControlled) return
  let id: number
  if ('requestIdleCallback' in window) {
    id = window.requestIdleCallback(() => setIsAnimating(true), { timeout: 2000 })
  } else {
    id = window.setTimeout(() => setIsAnimating(true), 1000) as unknown as number
  }
  return () => {
    if ('cancelIdleCallback' in window) window.cancelIdleCallback(id)
    else window.clearTimeout(id)
  }
}, [isControlled])

// Animation interval — only runs after idle
useEffect(() => {
  if (isControlled || !isAnimating) return
  const interval = setInterval(() => {
    setFrameIndex((prev) => (prev + 1) % employeeAnimations[0].frames.length)
  }, 2500)
  return () => clearInterval(interval)
}, [isControlled, isAnimating])
```

---

### Part 2 — Idle deferral: FeatureTicker

**File:** `components/marketing/feature-ticker.tsx`

Same pattern as Part 1. Add `isAnimating` state. Add `!isAnimating` guard to the existing interval `useEffect`. Add a new `useEffect` for the `requestIdleCallback`.

**Behaviour:**
- First paint: shows `features[0]` statically (already the case)
- After browser idle: 4-second rotation begins
- `prefersReducedMotion` and pause-on-hover logic unchanged

---

### Part 3 — content-visibility: auto for below-fold sections

**Files:** `app/(preview)/landing/page.tsx`, `app/globals.css` (or equivalent)

Add a CSS utility class and apply it to 5 sections below the fold. This tells the browser to skip layout/paint for off-screen sections until they enter the viewport.

**CSS utility (globals.css):**
```css
.cv-auto {
  content-visibility: auto;
  contain-intrinsic-size: auto 0 auto var(--cis-h, 600px);
}
```

**Sections to target (in page.tsx):**

| Section | Selector | Height hint |
|---|---|---|
| Enforcement / impact band | `section.bg-slate-50/80` | `--cis-h: 800px` |
| Features (`#features`) | `div#features` | `--cis-h: 600px` |
| How it works (`#how-it-works`) | `section#how-it-works` | `--cis-h: 700px` |
| Explore more | `section.border-t.bg-white` | `--cis-h: 300px` |
| Early access (`#early-access`) | `section#early-access` | `--cis-h: 500px` |

Height hints are rough estimates to prevent scroll-jump when the browser discovers real section heights. The `auto` prefix tells the browser to remember the measured size after first render.

---

## Files to Change

| File | Change |
|---|---|
| `components/marketing/demo-employee-list.tsx` | Add `isAnimating` state + idle callback useEffect |
| `components/marketing/feature-ticker.tsx` | Add `isAnimating` state + idle callback useEffect |
| `app/(preview)/landing/page.tsx` | Add `cv-auto` class + `--cis-h` CSS variable to 5 sections |
| `app/globals.css` (or equivalent) | Add `.cv-auto` utility class |

---

## What We're NOT Changing

- `FeatureCards` — already a server component, zero client JS
- `DemoCalendar` — already a server component, zero client JS
- `BrowserFrame` — already a server component, zero client JS
- `WaitlistForm` — already lazy-loads Turnstile on interaction; no further optimisation needed

---

## Expected Impact

| Metric | Expected improvement |
|---|---|
| Total Blocking Time (TBT) | Reduced — fewer long JS tasks during load |
| Largest Contentful Paint (LCP) | Unchanged (logo already has `priority` + `fetchPriority="high"`) |
| Cumulative Layout Shift (CLS) | Neutral — height hints prevent scroll jump |
| Lighthouse Performance | +5–15 points estimated |

---

## Risk

Low. No structural changes to the page. No new dependencies. requestIdleCallback degrades gracefully (setTimeout fallback). content-visibility: auto is supported in all modern browsers (Chrome 85+, Firefox 125+, Safari 18+).
