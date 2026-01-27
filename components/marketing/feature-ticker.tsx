'use client'

import { useState, useEffect, useCallback } from 'react'

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

  const cycleFeature = useCallback(() => {
    setIsVisible(false)

    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % features.length)
      setIsVisible(true)
    }, 500)
  }, [])

  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(cycleFeature, 3000)

    return () => clearInterval(interval)
  }, [isPaused, cycleFeature])

  return (
    <div
      className="mt-8 h-10 flex items-center justify-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="marquee"
      aria-live="polite"
      aria-atomic="true"
    >
      <p
        className={`text-slate-500 font-medium text-base sm:text-lg transition-all duration-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        {features[currentIndex]}
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
