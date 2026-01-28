# Feature Ticker Design

**Date:** 2026-01-27
**Status:** Approved
**Location:** Landing page hero section

## Problem

Large white space between the waitlist CTA ("No spam, ever...") and the browser mockup. This prime real estate could showcase app features.

## Solution

An animated text ticker that cycles through key features with a fade + slide-up transition.

## Content

The ticker cycles through these 5 messages:

1. Track your team's 90/180-day rule automatically
2. Plan future trips confidently
3. Get alerted before limits are reached
4. Import trips from spreadsheets in seconds
5. Monitor your whole team in one dashboard

## Behavior

- **Timing:** Each item displays for 3 seconds
- **Animation:** Fade out + slide up, then next item fades in + slides up
- **Loop:** Cycles infinitely
- **Hover:** Pauses on hover, resumes on mouse leave
- **Accessibility:** `aria-live="polite"` for screen readers, plus hidden list of all features

## Visual Style

- Centered text
- Muted color: `text-slate-500`
- Medium font weight: `font-medium`
- No icons — clean typography only
- Fixed container height to prevent layout shift

## Implementation

### New file: `components/marketing/feature-ticker.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'

const features = [
  "Track your team's 90/180-day rule automatically",
  'Plan future trips confidently',
  'Get alerted before limits are reached',
  'Import trips from spreadsheets in seconds',
  'Monitor your whole team in one dashboard',
]

export function FeatureTicker() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setIsVisible(false)

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % features.length)
        setIsVisible(true)
      }, 500) // Wait for fade-out before changing text
    }, 3000)

    return () => clearInterval(interval)
  }, [isPaused])

  return (
    <div
      className="mt-8 h-8 flex items-center justify-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-live="polite"
    >
      <p
        className={`text-slate-500 font-medium transition-all duration-500 ${
          isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-2'
        }`}
      >
        {features[currentIndex]}
      </p>

      {/* Hidden list for accessibility */}
      <ul className="sr-only">
        {features.map((feature, i) => (
          <li key={i}>{feature}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Update: `app/(preview)/landing/page.tsx`

Add import at top:
```tsx
import { FeatureTicker } from '@/components/marketing/feature-ticker'
```

Add component after WaitlistForm (around line 232):
```tsx
<div id="waitlist" className="max-w-md mx-auto">
  <WaitlistForm variant="minimal" />
</div>

<FeatureTicker />  {/* NEW */}
```

## Files Changed

1. `components/marketing/feature-ticker.tsx` — new file
2. `app/(preview)/landing/page.tsx` — import and use component
