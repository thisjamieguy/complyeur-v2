'use client'

import { useState, useTransition } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { resetPopupsAndToursAction } from '@/app/(dashboard)/actions'
import { showSuccess, showError } from '@/lib/toast'

const MFA_STORAGE_KEYS = [
  'mfa_backup_codes_empty_warning_last_shown_at',
  'mfa_backup_codes_low_warning_last_shown_at',
]

function clearLocalStorageDismissals(userId: string) {
  try {
    for (const key of MFA_STORAGE_KEYS) {
      window.localStorage.removeItem(`${key}:${userId}`)
    }
  } catch {
    // localStorage may not be available
  }
}

interface ResetPopupsSectionProps {
  userId: string
}

export function ResetPopupsSection({ userId }: ResetPopupsSectionProps) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ tourReset: boolean; alertsReset: number } | null>(null)

  function handleReset() {
    setResult(null)
    startTransition(async () => {
      try {
        const res = await resetPopupsAndToursAction()

        // Also clear localStorage-based dismissals
        clearLocalStorageDismissals(userId)

        setResult(res)

        const parts: string[] = []
        if (res.tourReset) parts.push('dashboard tour')
        if (res.alertsReset > 0) parts.push(`${res.alertsReset} alert${res.alertsReset === 1 ? '' : 's'}`)
        parts.push('local notifications')

        showSuccess('Popups reset', `Reset: ${parts.join(', ')}. Refresh to see them again.`)
      } catch {
        showError('Failed to reset popups. Please try again.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset popups &amp; tours</CardTitle>
        <CardDescription>
          Bring back all dismissed alerts, the dashboard tour, and notification popups so you can
          review them again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={handleReset} disabled={isPending}>
          <RotateCcw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isPending ? 'Resetting…' : 'Reset all popups & tours'}
        </Button>
        {result && (
          <p className="mt-3 text-sm text-muted-foreground">
            {result.tourReset && 'Dashboard tour will show on next visit. '}
            {result.alertsReset > 0 && `${result.alertsReset} alert${result.alertsReset === 1 ? '' : 's'} marked as unread. `}
            {!result.tourReset && result.alertsReset === 0 && 'Nothing to reset — everything is already visible.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
