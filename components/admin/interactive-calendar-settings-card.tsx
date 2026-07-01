'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { updateInteractiveCalendarGlobalSetting } from '@/app/admin/settings/actions'

interface InteractiveCalendarSettingsCardProps {
  initialEnabled: boolean
  allowedEmails: string[]
}

export function InteractiveCalendarSettingsCard({
  initialEnabled,
  allowedEmails,
}: InteractiveCalendarSettingsCardProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [savedEnabled, setSavedEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()
  const hasChanges = enabled !== savedEnabled

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateInteractiveCalendarGlobalSetting({ enabled })

      if (result.success) {
        setSavedEnabled(enabled)
        toast.success(
          enabled
            ? 'Interactive calendar enabled globally'
            : 'Interactive calendar disabled globally'
        )
        return
      }

      toast.error(result.error || 'Failed to update interactive calendar')
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Interactive Calendar
            </CardTitle>
            <CardDescription>
              Control whether calendar editing is available to all calendar-entitled companies.
            </CardDescription>
          </div>
          <Badge className={savedEnabled ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}>
            {savedEnabled ? 'Globally enabled' : 'Globally disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
          <div className="space-y-1">
            <Label htmlFor="interactive-calendar-global" className="text-sm font-medium">
              Enable globally
            </Label>
            <p className="text-sm text-slate-500">
              When enabled, every company with the calendar entitlement can create, edit, move,
              and delete trips from the calendar.
            </p>
          </div>
          <Switch
            id="interactive-calendar-global"
            checked={enabled}
            disabled={isPending}
            onCheckedChange={setEnabled}
            aria-label="Enable interactive calendar globally"
          />
        </div>

        {allowedEmails.length > 0 && (
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Always-enabled accounts</p>
            <p className="mt-1 text-sm text-slate-500">
              These emails keep interactive access even when the global switch is off.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {allowedEmails.map((email) => (
                <Badge key={email} variant="secondary">
                  {email}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Changes apply on the next calendar page load. No redeploy is required.
          </p>
          <Button onClick={handleSave} disabled={!hasChanges || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save setting
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
