'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { updateNotificationPreferencesAction } from '../actions'
import type { NotificationPreferences } from '@/types/database-helpers'

interface UserPreferencesFormProps {
  preferences: NotificationPreferences
  disabled?: boolean
}

export function UserPreferencesForm({ preferences, disabled = false }: UserPreferencesFormProps) {
  const [isPending, startTransition] = useTransition()

  const [receiveWarning, setReceiveWarning] = useState(preferences.receive_warning_emails ?? true)
  const [receiveUrgent, setReceiveUrgent] = useState(preferences.receive_urgent_emails ?? true)
  const [receiveBreach, setReceiveBreach] = useState(preferences.receive_breach_emails ?? true)

  // Check for changes
  const hasChanges =
    receiveWarning !== preferences.receive_warning_emails ||
    receiveUrgent !== preferences.receive_urgent_emails ||
    receiveBreach !== preferences.receive_breach_emails

  // Check if user is completely unsubscribed
  const isUnsubscribed = preferences.unsubscribed_at !== null

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        await updateNotificationPreferencesAction({
          receive_warning_emails: receiveWarning,
          receive_urgent_emails: receiveUrgent,
          receive_breach_emails: receiveBreach,
        })
        toast.success('Preferences saved successfully')
      } catch (error) {
        console.error('Failed to save preferences:', error)
        toast.error('Failed to save preferences')
      }
    })
  }

  const handleReset = () => {
    setReceiveWarning(preferences.receive_warning_emails ?? true)
    setReceiveUrgent(preferences.receive_urgent_emails ?? true)
    setReceiveBreach(preferences.receive_breach_emails ?? true)
  }

  if (isUnsubscribed) {
    return (
      <div className="bg-slate-50 rounded-lg p-4 text-center">
        <p className="text-slate-600 mb-4">
          You have unsubscribed from all email notifications.
        </p>
        <Button
          onClick={() => {
            setReceiveWarning(true)
            setReceiveUrgent(true)
            setReceiveBreach(true)
          }}
        >
          Re-subscribe to Notifications
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Warning emails */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="receive-warning" className="text-sm font-medium">
              Warning Alerts
            </Label>
            <p className="text-xs text-slate-500">
              Early warnings when employees approach limits
            </p>
          </div>
          <Switch
            id="receive-warning"
            checked={receiveWarning}
            onCheckedChange={setReceiveWarning}
            disabled={disabled}
          />
        </div>

        {/* Urgent emails */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="receive-urgent" className="text-sm font-medium">
              Urgent Alerts
            </Label>
            <p className="text-xs text-slate-500">
              Critical warnings when very close to limits
            </p>
          </div>
          <Switch
            id="receive-urgent"
            checked={receiveUrgent}
            onCheckedChange={setReceiveUrgent}
            disabled={disabled}
          />
        </div>

        {/* Breach emails */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="receive-breach" className="text-sm font-medium">
              Breach Alerts
            </Label>
            <p className="text-xs text-slate-500">
              Alerts when legal limit is exceeded
            </p>
          </div>
          <Switch
            id="receive-breach"
            checked={receiveBreach}
            onCheckedChange={setReceiveBreach}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Warning if all disabled */}
      {!receiveWarning && !receiveUrgent && !receiveBreach && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            You have disabled all email notifications. You will only see alerts in the dashboard.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={disabled || !hasChanges || isPending}
        >
          Reset
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={disabled || !hasChanges || isPending}
        >
          {isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}
