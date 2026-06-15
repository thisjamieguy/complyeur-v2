'use client'

import { useEffect, useRef, useState } from 'react'

interface DashboardScrollFocusProps {
  children: React.ReactNode
}

const SETTLE_DISTANCE_PX = 280

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isSmallViewport(): boolean {
  return window.matchMedia('(max-width: 768px)').matches
}

export function DashboardScrollFocus({ children }: DashboardScrollFocusProps) {
  const [progress, setProgress] = useState(1)
  const [isEnabled, setIsEnabled] = useState(false)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const updateEnabled = () => {
      const enabled = !prefersReducedMotion() && !isSmallViewport()
      setIsEnabled(enabled)
      if (!enabled) {
        setProgress(1)
      }
    }

    updateEnabled()
    window.addEventListener('resize', updateEnabled)

    return () => {
      window.removeEventListener('resize', updateEnabled)
    }
  }, [])

  useEffect(() => {
    if (!isEnabled) return

    const updateProgress = () => {
      frameRef.current = null
      setProgress(clamp(window.scrollY / SETTLE_DISTANCE_PX, 0, 1))
    }

    const requestUpdate = () => {
      if (frameRef.current !== null) return
      frameRef.current = window.requestAnimationFrame(updateProgress)
    }

    updateProgress()
    window.addEventListener('scroll', requestUpdate, { passive: true })

    return () => {
      window.removeEventListener('scroll', requestUpdate)
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [isEnabled])

  const rotateX = 7 - progress * 7
  const scale = 0.965 + progress * 0.035
  const translateY = 16 - progress * 16
  const shadowOpacity = 0.16 + progress * 0.08

  return (
    <div
      className="will-change-transform"
      style={{
        transform: isEnabled
          ? `perspective(1200px) translateY(${translateY}px) rotateX(${rotateX}deg) scale(${scale})`
          : undefined,
        transformOrigin: 'top center',
        transition: isEnabled ? 'box-shadow 160ms ease-out' : undefined,
        filter: isEnabled
          ? `drop-shadow(0 28px 44px rgba(15, 23, 42, ${shadowOpacity}))`
          : undefined,
      }}
    >
      {children}
    </div>
  )
}
