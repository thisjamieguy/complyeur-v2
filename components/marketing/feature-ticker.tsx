'use client'

import { useState, useEffect, useCallback } from 'react'

const features = [
  'A single system of record for Schengen travel compliance',
  'Rolling 90/180 windows recalculated with every trip update',
  'Per-employee compliance visibility across your team',
  'Centralised oversight of every EU travel approval',
  'Accurate day tracking aligned with automated border checks',
]

export function FeatureTicker() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const cycleFeature = useCallback(() => {
    setIsVisible(false)

    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % features.length)
      setIsVisible(true)
    }, 250)
  }, [])

  // Wait for browser idle before starting rotation — keeps first paint free of interval work
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setIsAnimating(true), { timeout: 2000 })
      return () => window.cancelIdleCallback(id)
    } else {
      const id = setTimeout(() => setIsAnimating(true), 1000) as unknown as number
      return () => clearTimeout(id)
    }
  }, [])

  useEffect(() => {
    if (isPaused || prefersReducedMotion || !isAnimating) return

    const interval = setInterval(cycleFeature, 4000)

    return () => clearInterval(interval)
  }, [isPaused, prefersReducedMotion, cycleFeature, isAnimating])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches)
    }

    handleChange()
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const activeFeature = prefersReducedMotion ? features[0] : features[currentIndex]

  return (
    <div
      className="mt-8 min-h-5 sm:min-h-6 flex items-center justify-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="marquee"
      aria-live="polite"
      aria-atomic="true"
    >
      <p
        className={`text-muted-foreground font-normal text-sm sm:text-base leading-5 sm:leading-6 ${
          prefersReducedMotion ? '' : 'transition-all duration-300'
        } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      >
        {activeFeature}
      </p>

      {/* Hidden list for screen readers */}
      <ul className="sr-only">
        {features.map((feature, i) => (
          <li key={i}>{feature}</li>
        ))}
      </ul>
    </div>
  )
}
