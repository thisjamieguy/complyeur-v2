'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number // Pixels to pull before refresh triggers
  disabled?: boolean
}

interface UsePullToRefreshReturn {
  isPulling: boolean
  isRefreshing: boolean
  pullProgress: number // 0 to 1
  containerRef: React.RefObject<HTMLDivElement>
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  const pullProgress = Math.min(pullDistance / threshold, 1)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return

      // Only start pull if at top of scroll
      const container = containerRef.current
      if (!container || container.scrollTop > 0) return

      startY.current = e.touches[0].clientY
      currentY.current = e.touches[0].clientY
      setIsPulling(true)
    },
    [disabled, isRefreshing]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling || disabled || isRefreshing) return

      const container = containerRef.current
      if (!container || container.scrollTop > 0) {
        setIsPulling(false)
        setPullDistance(0)
        return
      }

      currentY.current = e.touches[0].clientY
      const diff = currentY.current - startY.current

      if (diff > 0) {
        // Apply resistance - pull further = less movement
        const resistance = 0.5
        const distance = diff * resistance
        setPullDistance(Math.min(distance, threshold * 1.5))

        // Prevent default scrolling when pulling down
        if (diff > 10) {
          e.preventDefault()
        }
      }
    },
    [isPulling, disabled, isRefreshing, threshold]
  )

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return

    setIsPulling(false)

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullDistance(0)
  }, [isPulling, disabled, pullDistance, threshold, isRefreshing, onRefresh])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    isPulling,
    isRefreshing,
    pullProgress,
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
  }
}
