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
import type { SettingsFormData } from '@/lib/validations/settings'

interface ForecastingSectionProps {
  disabled?: boolean
}

export function ForecastingSection({ disabled }: ForecastingSectionProps) {
  const form = useFormContext<SettingsFormData>()
  const warningThreshold = form.watch('future_job_warning_threshold')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forecasting</CardTitle>
        <CardDescription>
          Configure when to show warnings for future scheduled trips that may cause compliance issues.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="future_job_warning_threshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Future Job Warning Threshold</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    type="number"
                    min={50}
                    max={89}
                    disabled={disabled}
                    className="w-20"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <FormDescription>
                Show warnings when scheduled future trips would exceed {warningThreshold} days in any 180-day window.
                This helps you identify potential compliance issues before they occur.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Info box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> When creating or viewing future jobs, the system will check if
            the cumulative days would exceed your threshold. A warning will appear on the Trip Forecast
            and Future Job Alerts pages for any employee at risk.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
