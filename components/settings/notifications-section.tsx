'use client'

import { useFormContext } from 'react-hook-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { SettingsFormData } from '@/lib/validations/settings'

interface NotificationsSectionProps {
  disabled?: boolean
}

export function NotificationsSection({ disabled }: NotificationsSectionProps) {
  const form = useFormContext<SettingsFormData>()
  const weeklyDigest = form.watch('weekly_digest')
  const customThreshold = form.watch('custom_alert_threshold')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notifications</CardTitle>
        <CardDescription>
          Configure when your team receives email alerts about employee compliance status.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Standard threshold alerts */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="notify_70_days"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">70-day warning</FormLabel>
                  <FormDescription>
                    Send email when an employee reaches 70 days used (at risk)
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notify_85_days"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">85-day urgent warning</FormLabel>
                  <FormDescription>
                    Send email when an employee reaches 85 days used (urgent)
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notify_90_days"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 border-red-200 bg-red-50/50">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">90-day breach alert</FormLabel>
                  <FormDescription>
                    Send email when an employee reaches 90 days (compliance breach)
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Weekly digest */}
        <div className="pt-4 border-t">
          <FormField
            control={form.control}
            name="weekly_digest"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Weekly digest</FormLabel>
                  <FormDescription>
                    Receive a weekly summary email every Monday at 9am
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {weeklyDigest && (
            <p className="mt-2 text-sm text-muted-foreground pl-4">
              Weekly digests include a summary of all employees and their current compliance status.
            </p>
          )}
        </div>

        {/* Custom threshold */}
        <div className="pt-4 border-t">
          <FormField
            control={form.control}
            name="custom_alert_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom alert threshold (optional)</FormLabel>
                <div className="flex items-center gap-3">
                  <FormControl>
                    <Input
                      type="number"
                      min={60}
                      max={85}
                      placeholder="e.g., 75"
                      disabled={disabled}
                      className="w-24"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '') {
                          field.onChange(null)
                        } else {
                          field.onChange(Number(value))
                        }
                      }}
                    />
                  </FormControl>
                  <span className="text-sm text-muted-foreground">days (60-85)</span>
                  {customThreshold && (
                    <button
                      type="button"
                      onClick={() => field.onChange(null)}
                      className="text-sm text-red-600 hover:text-red-700"
                      disabled={disabled}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <FormDescription>
                  Add an extra email alert at a custom day count. Leave empty to disable.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}
