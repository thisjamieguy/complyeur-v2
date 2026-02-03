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
  const greenMax = form.watch('status_green_max')
  const amberMax = form.watch('status_amber_max')
  const redMax = form.watch('status_red_max')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Thresholds</CardTitle>
        <CardDescription>
          Configure how employee compliance status badges are displayed on the dashboard.
          Thresholds are based on days used in the rolling 180-day window.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Green Threshold */}
        <FormField
          control={form.control}
          name="status_green_max"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-green-500" />
                <FormLabel className="mb-0">Green (Compliant)</FormLabel>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Days used &le;</span>
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
                Employees with 0-{greenMax} days used show as Compliant (green).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amber Threshold */}
        <FormField
          control={form.control}
          name="status_amber_max"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-amber-500" />
                <FormLabel className="mb-0">Amber (At Risk)</FormLabel>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Days used &le;</span>
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
                Employees with {greenMax + 1}-{amberMax} days used show as At Risk (amber).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Red Threshold */}
        <FormField
          control={form.control}
          name="status_red_max"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-red-500" />
                <FormLabel className="mb-0">Red (Non-Compliant)</FormLabel>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Days used &le;</span>
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
                Employees with {amberMax + 1}-{redMax} days used show as Non-Compliant (red).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Breach - Display Only */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-slate-900" />
            <span className="text-sm font-medium">Breach (90+ days)</span>
          </div>
          <p className="text-sm text-muted-foreground pl-7">
            Employees with 90 or more days used always show as Breach (black).
            This threshold cannot be changed.
          </p>
        </div>

        {/* Visual summary */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-3">Current threshold ranges:</p>
          <div className="flex h-6 rounded-md overflow-hidden text-xs font-medium">
            <div
              className="bg-green-500 flex items-center justify-center text-white"
              style={{ width: `${((greenMax + 1) / 100) * 100}%` }}
            >
              0-{greenMax}
            </div>
            <div
              className="bg-amber-500 flex items-center justify-center text-white"
              style={{ width: `${((amberMax - greenMax) / 100) * 100}%` }}
            >
              {greenMax + 1}-{amberMax}
            </div>
            <div
              className="bg-red-500 flex items-center justify-center text-white"
              style={{ width: `${((redMax - amberMax) / 100) * 100}%` }}
            >
              {amberMax + 1}-{redMax}
            </div>
            <div
              className="bg-slate-900 flex items-center justify-center text-white flex-1"
            >
              90+
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Green: 0-{greenMax} days | Amber: {greenMax + 1}-{amberMax} days | Red: {amberMax + 1}-{redMax} days | Breach: 90+ days
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
