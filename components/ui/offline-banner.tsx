'use client'

import { useState } from 'react'
import { WifiOff, X } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const [isDismissed, setIsDismissed] = useState(false)

  // Reset dismissed state when coming back online
  if (isOnline && isDismissed) {
    setIsDismissed(false)
  }

  if (isOnline || isDismissed) {
    return null
  }

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-amber-950 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            You&apos;re offline. Changes will sync when reconnected.
          </p>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-amber-600/20 transition-colors"
          aria-label="Dismiss offline banner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
