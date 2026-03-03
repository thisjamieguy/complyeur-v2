'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm, useFieldArray, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Upload, CheckCircle2 } from 'lucide-react'
import { z } from 'zod'
import { addEmployeeWithTripsAction } from '@/app/(dashboard)/actions'
import {
  NATIONALITY_TYPE_LABELS,
  type NationalityType,
} from '@/lib/constants/nationality-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { FormError } from '@/components/forms'
import { showError } from '@/lib/toast'
import { trackEvent } from '@/lib/analytics/client'
import { TripEntryRow } from './trip-entry-row'

// Client-side form schema — trips are always optional
// Trip fields use required strings (not .optional()) to avoid Zod/react-hook-form type mismatch.
// Empty strings are set as defaultValues in useForm instead.
const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  nationality_type: z.enum(['uk_citizen', 'eu_schengen_citizen', 'rest_of_world']),
  trips: z.array(
    z.object({
      entry_date: z.string(),
      exit_date: z.string(),
      country: z.string(),
      is_private: z.boolean(),
    })
  ),
})

type FormData = z.infer<typeof formSchema>

interface UnifiedAddEmployeeDialogProps {
  trigger?: React.ReactNode
  source?: 'dashboard_header' | 'empty_state' | 'keyboard_shortcut'
}

interface SuccessState {
  name: string
  tripsCreated: number
}

export function UnifiedAddEmployeeDialog({
  trigger,
  source = 'dashboard_header',
}: UnifiedAddEmployeeDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<SuccessState | null>(null)
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      nationality_type: 'uk_citizen',
      trips: [],
    },
    mode: 'onBlur',
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'trips',
  })

  const nationalityType = form.watch('nationality_type') as NationalityType

  async function onSubmit(data: FormData) {
    setIsLoading(true)
    setFormError(null)

    try {
      // Filter out completely empty trip rows before sending
      const filledTrips = data.trips.filter(
        (t) => t.entry_date && t.exit_date && t.country
      )

      // Check for partially filled trips (warn user)
      const partialTrips = data.trips.filter(
        (t) =>
          (t.entry_date || t.exit_date || t.country) &&
          !(t.entry_date && t.exit_date && t.country)
      )
      if (partialTrips.length > 0) {
        setFormError(
          'Some trips are incomplete. Please fill in all fields (entry date, exit date, country) or remove the trip.'
        )
        setIsLoading(false)
        return
      }

      const result = await addEmployeeWithTripsAction({
        name: data.name,
        nationality_type: data.nationality_type,
        trips: filledTrips.length > 0
          ? filledTrips.map((t) => ({
              entry_date: t.entry_date!,
              exit_date: t.exit_date!,
              country: t.country!,
              is_private: t.is_private || false,
            }))
          : undefined,
      })

      trackEvent('add_employee', {
        source,
        trips_count: result.tripsCreated,
      })

      window.dispatchEvent(
        new CustomEvent('complyeur:employee-updated', {
          detail: `${data.name} added successfully.`,
        })
      )

      setSuccess({
        name: data.name,
        tripsCreated: result.tripsCreated,
      })

      router.refresh()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add employee'
      setFormError(message)
      showError('Failed to add employee', message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      resetForm()
    }
  }

  function resetForm() {
    form.reset()
    setFormError(null)
    setSuccess(null)
  }

  function handleAddAnother() {
    resetForm()
    // Keep dialog open
  }

  function handleDone() {
    setOpen(false)
    resetForm()
  }

  // Listen for external open events (Alt+N keyboard shortcut)
  useEffect(() => {
    const openHandler = () => setOpen(true)
    window.addEventListener('complyeur:open-add-employee', openHandler)
    return () =>
      window.removeEventListener('complyeur:open-add-employee', openHandler)
  }, [])

  const defaultTrigger = (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Employee
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        {success ? (
          // Success state
          <div className="flex flex-col items-center py-8 text-center space-y-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">
                Employee added
              </h3>
              <p className="text-sm text-slate-500">
                {success.name} has been added to your compliance tracker
                {success.tripsCreated > 0
                  ? ` with ${success.tripsCreated} ${success.tripsCreated === 1 ? 'trip' : 'trips'}`
                  : ''}
                .
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleAddAnother}>
                Add another employee
              </Button>
              <Button onClick={handleDone}>Done</Button>
            </div>
          </div>
        ) : (
          // Form state
          <>
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
              <DialogDescription>
                Add an employee and optionally their upcoming trips.
              </DialogDescription>
            </DialogHeader>

            <FormProvider {...form}>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {formError && (
                    <FormError
                      message={formError}
                      onDismiss={() => setFormError(null)}
                    />
                  )}

                  {/* Employee details section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                      Employee Details
                    </h4>

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Jane Smith"
                              autoFocus
                              disabled={isLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nationality_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nationality type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isLoading}
                              className="gap-2"
                            >
                              {(
                                Object.entries(NATIONALITY_TYPE_LABELS) as [
                                  NationalityType,
                                  string,
                                ][]
                              ).map(([value, label]) => (
                                <div
                                  key={value}
                                  className="flex items-center gap-2"
                                >
                                  <RadioGroupItem
                                    value={value}
                                    id={`unified-${value}`}
                                  />
                                  <Label
                                    htmlFor={`unified-${value}`}
                                    className="cursor-pointer font-normal"
                                  >
                                    {label}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <p className="text-xs text-slate-500">
                            EU/Schengen citizens are exempt from 90/180-day
                            compliance tracking.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Trips section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                        Trips{' '}
                        <span className="normal-case font-normal">(optional)</span>
                      </h4>
                    </div>

                    {fields.length === 0 && (
                      <p className="text-sm text-slate-400 py-2">
                        No trips added yet. You can add trips now or later from
                        the employee&apos;s profile.
                      </p>
                    )}

                    {fields.map((field, index) => (
                      <TripEntryRow
                        key={field.id}
                        index={index}
                        onRemove={() => remove(index)}
                        isOnly={fields.length === 1}
                        nationalityType={nationalityType}
                        disabled={isLoading}
                      />
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          entry_date: '',
                          exit_date: '',
                          country: '',
                          is_private: false,
                        })
                      }
                      disabled={isLoading}
                      className="w-full border-dashed"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add {fields.length > 0 ? 'another ' : 'a '}trip
                    </Button>
                  </div>

                  <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      asChild
                      className="sm:mr-auto"
                    >
                      <Link href="/import">
                        <Upload className="mr-2 h-4 w-4" />
                        Import spreadsheet
                      </Link>
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          'Add Employee'
                        )}
                      </Button>
                    </div>
                  </DialogFooter>
                </form>
              </Form>
            </FormProvider>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
