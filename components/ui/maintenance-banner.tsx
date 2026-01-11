'use client'

import { Wrench } from 'lucide-react'
import { config } from '@/lib/config'

export function MaintenanceBanner() {
  if (!config.maintenanceMode) return null

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-amber-950 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <Wrench className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm font-medium">
          ComplyEUR is undergoing scheduled maintenance. Some features may be temporarily unavailable.
        </p>
      </div>
    </div>
  )
}
