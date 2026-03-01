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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { SettingsFormData } from '@/lib/validations/settings'

interface CalendarPreferencesSectionProps {
  disabled?: boolean
}

export function CalendarPreferencesSection({ disabled }: CalendarPreferencesSectionProps) {
  const form = useFormContext<SettingsFormData>()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
        <CardDescription>
          Choose how employee rows are loaded for the calendar timeline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="calendar_load_mode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Calendar Loading</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={disabled}
                  className="gap-3"
                >
                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <RadioGroupItem value="all_employees" id="calendar-load-all-employees" className="mt-0.5" />
                    <div className="space-y-1">
                      <Label htmlFor="calendar-load-all-employees" className="cursor-pointer">
                        Load all employees
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Shows every employee, including those without trips in the selected range.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-md border p-3">
                    <RadioGroupItem value="employees_with_trips" id="calendar-load-with-trips" className="mt-0.5" />
                    <div className="space-y-1">
                      <Label htmlFor="calendar-load-with-trips" className="cursor-pointer">
                        Load only employees with trips
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Faster initial loading by fetching only employees that have trips in the visible timeline.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormDescription>
                This changes the default loading behavior for <code>/calendar</code>.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
