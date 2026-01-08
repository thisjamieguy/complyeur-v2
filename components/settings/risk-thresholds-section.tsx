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

interface RiskThresholdsSectionProps {
  disabled?: boolean
}

export function RiskThresholdsSection({ disabled }: RiskThresholdsSectionProps) {
  const form = useFormContext<SettingsFormData>()
  const greenThreshold = form.watch('risk_threshold_green')
  const amberThreshold = form.watch('risk_threshold_amber')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Thresholds</CardTitle>
        <CardDescription>
          Configure how employee compliance status is displayed throughout the application.
          These thresholds are based on days remaining in the rolling 180-day window.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Green Threshold */}
        <FormField
          control={form.control}
          name="risk_threshold_green"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-green-500" />
                <FormLabel className="mb-0">Green (Safe)</FormLabel>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Days remaining &ge;</span>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={89}
                    disabled={disabled}
                    className="w-20"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
              </div>
              <FormDescription>
                Employees with {greenThreshold} or more days remaining show green status.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amber Threshold */}
        <FormField
          control={form.control}
          name="risk_threshold_amber"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-amber-500" />
                <FormLabel className="mb-0">Amber (Caution)</FormLabel>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Days remaining &ge;</span>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={88}
                    disabled={disabled}
                    className="w-20"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
              </div>
              <FormDescription>
                Employees with {amberThreshold}-{greenThreshold - 1} days remaining show amber status.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Red - Display Only */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-red-500" />
            <span className="text-sm font-medium">Red (Critical)</span>
          </div>
          <p className="text-sm text-muted-foreground pl-7">
            Employees with fewer than {amberThreshold} days remaining show red status.
          </p>
        </div>

        {/* Visual summary */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-3">Current threshold visualization:</p>
          <div className="flex h-6 rounded-md overflow-hidden text-xs font-medium">
            <div
              className="bg-red-500 flex items-center justify-center text-white"
              style={{ width: `${(amberThreshold / 90) * 100}%` }}
            >
              &lt;{amberThreshold}
            </div>
            <div
              className="bg-amber-500 flex items-center justify-center text-white"
              style={{ width: `${((greenThreshold - amberThreshold) / 90) * 100}%` }}
            >
              {amberThreshold}-{greenThreshold - 1}
            </div>
            <div
              className="bg-green-500 flex items-center justify-center text-white flex-1"
            >
              &ge;{greenThreshold}
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0 days</span>
            <span>90 days remaining</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
