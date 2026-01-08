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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { SESSION_TIMEOUT_OPTIONS } from '@/lib/types/settings'
import type { SettingsFormData } from '@/lib/validations/settings'

interface DataPrivacySectionProps {
  disabled?: boolean
}

export function DataPrivacySection({ disabled }: DataPrivacySectionProps) {
  const form = useFormContext<SettingsFormData>()
  const retentionMonths = form.watch('retention_months')

  // Calculate the purge date based on retention months
  const purgeDate = new Date()
  purgeDate.setMonth(purgeDate.getMonth() - retentionMonths)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data & Privacy</CardTitle>
        <CardDescription>
          Configure data retention and session security settings for your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Retention Period */}
        <FormField
          control={form.control}
          name="retention_months"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Retention Period</FormLabel>
              <FormControl>
                <div className="space-y-3">
                  <Slider
                    min={12}
                    max={84}
                    step={6}
                    value={[field.value]}
                    onValueChange={([value]) => field.onChange(value)}
                    disabled={disabled}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>12 months</span>
                    <span className="font-medium text-foreground">
                      {retentionMonths} months ({Math.floor(retentionMonths / 12)} year{Math.floor(retentionMonths / 12) !== 1 ? 's' : ''}{retentionMonths % 12 > 0 ? ` ${retentionMonths % 12} months` : ''})
                    </span>
                    <span>84 months</span>
                  </div>
                </div>
              </FormControl>
              <FormDescription>
                Trip data older than {retentionMonths} months will be automatically deleted for GDPR compliance.
                Trips before {purgeDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} will be purged.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Session Timeout */}
        <FormField
          control={form.control}
          name="session_timeout_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session Timeout</FormLabel>
              <Select
                disabled={disabled}
                onValueChange={(value) => field.onChange(Number(value))}
                value={String(field.value)}
              >
                <FormControl>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select timeout" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SESSION_TIMEOUT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                You&apos;ll be logged out after {field.value} minutes of inactivity.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
