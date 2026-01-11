'use client'

import { RefreshCw } from 'lucide-react'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const { isPulling, isRefreshing, pullProgress, containerRef } =
    usePullToRefresh({
      onRefresh,
      threshold: 80,
      disabled,
    })

  const showIndicator = isPulling || isRefreshing
  const indicatorHeight = isPulling ? pullProgress * 60 : isRefreshing ? 60 : 0

  return (
    <div className={cn('relative', className)}>
      {/* Pull indicator */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-center overflow-hidden transition-all duration-200 ease-out z-10"
        style={{ height: indicatorHeight }}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md border border-slate-200',
            isRefreshing && 'animate-spin'
          )}
          style={{
            opacity: pullProgress,
            transform: `rotate(${pullProgress * 360}deg)`,
          }}
        >
          <RefreshCw className="h-5 w-5 text-slate-600" />
        </div>
      </div>

      {/* Content container */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{
          transform: showIndicator
            ? `translateY(${indicatorHeight}px)`
            : undefined,
          transition: isPulling ? undefined : 'transform 200ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
