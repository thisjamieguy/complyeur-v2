'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CountrySelect } from '@/components/trips/country-select'
import { ForecastRiskBadge } from '@/components/forecasting/forecast-risk-badge'
import {
  removeJobTripAction,
  updateJobAction,
  updateJobTripAction,
} from '@/app/(dashboard)/jobs/actions'
import { showError, showSuccess } from '@/lib/toast'
import { getCountryName } from '@/lib/constants/schengen-countries'
import type { JobWithTrips } from '@/types/database-helpers'
import type { ForecastRiskLevel } from '@/types/forecast'

interface JobTripSummary {
  riskLevel: ForecastRiskLevel
  daysUsedBeforeTrip: number
  daysRemainingAfterTrip: number
}

interface JobDetailClientProps {
  job: JobWithTrips
  summaries: Record<string, JobTripSummary>
}

interface JobFormState {
  job_ref: string
  customer: string
  country: string
  entry_date: string
  exit_date: string
  purpose: string
}

interface TripFormState {
  country: string
  entry_date: string
  exit_date: string
}

function getInitialTripState(job: JobWithTrips): Record<string, TripFormState> {
  return Object.fromEntries(
    job.trips.map((trip) => [
      trip.id,
      {
        country: trip.country,
        entry_date: trip.entry_date,
        exit_date: trip.exit_date,
      },
    ])
  )
}

export function JobDetailClient({ job, summaries }: JobDetailClientProps) {
  const router = useRouter()
  const [form, setForm] = useState<JobFormState>({
    job_ref: job.job_ref,
    customer: job.customer,
    country: job.country,
    entry_date: job.entry_date,
    exit_date: job.exit_date,
    purpose: job.purpose ?? '',
  })
  const [tripForms, setTripForms] = useState<Record<string, TripFormState>>(
    getInitialTripState(job)
  )
  const [tripErrors, setTripErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [isSavingJob, setIsSavingJob] = useState(false)
  const [savingTripId, setSavingTripId] = useState<string | null>(null)
  const [pendingJobSave, setPendingJobSave] = useState<JobFormState | null>(null)

  const sharedTravelChanged = useMemo(
    () =>
      form.country !== job.country ||
      form.entry_date !== job.entry_date ||
      form.exit_date !== job.exit_date,
    [form.country, form.entry_date, form.exit_date, job.country, job.entry_date, job.exit_date]
  )

  function updateTripForm(
    tripId: string,
    field: keyof TripFormState,
    value: string
  ) {
    setTripForms((current) => ({
      ...current,
      [tripId]: {
        ...current[tripId],
        [field]: value,
      },
    }))
    setTripErrors((current) => {
      const next = { ...current }
      delete next[tripId]
      return next
    })
  }

  async function saveJob(applyToTrips: boolean) {
    setIsSavingJob(true)
    setError(null)
    setTripErrors({})

    try {
      const result = await updateJobAction(job.id, {
        ...form,
        applyToTrips,
      })

      if (!result.success) {
        if (result.errors?.length) {
          const tripErrorEntries = job.trips
            .filter((trip) =>
              result.errors?.some((rowError) => rowError.employeeId === trip.employee_id)
            )
            .map((trip) => {
              const rowError = result.errors?.find(
                (candidate) => candidate.employeeId === trip.employee_id
              )
              return [trip.id, rowError?.message ?? 'Trip overlaps with an existing trip']
            })

          setTripErrors(Object.fromEntries(tripErrorEntries))
          setError('Some employee trips have conflicting dates.')
          return
        }

        const message = result.error ?? 'Failed to update job'
        setError(message)
        showError('Failed to update job', message)
        return
      }

      showSuccess('Job updated')
      router.refresh()
    } finally {
      setIsSavingJob(false)
      setPendingJobSave(null)
    }
  }

  async function handleJobSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (sharedTravelChanged && job.trips.length > 0) {
      setPendingJobSave(form)
      return
    }

    await saveJob(false)
  }

  async function handleTripSave(tripId: string) {
    const trip = job.trips.find((candidate) => candidate.id === tripId)
    const tripForm = tripForms[tripId]
    if (!trip || !tripForm) return

    setSavingTripId(tripId)
    setTripErrors((current) => {
      const next = { ...current }
      delete next[tripId]
      return next
    })

    try {
      const result = await updateJobTripAction(job.id, tripId, tripForm)

      if (!result.success) {
        const message =
          result.errors?.[0]?.message ?? result.error ?? 'Failed to update employee trip'
        setTripErrors((current) => ({ ...current, [tripId]: message }))
        showError('Failed to update trip', message)
        return
      }

      showSuccess('Employee trip updated')
      router.refresh()
    } finally {
      setSavingTripId(null)
    }
  }

  async function handleRemoveTrip(tripId: string, employeeId: string) {
    const confirmed = window.confirm('Remove this employee from the job? This deletes the linked trip.')
    if (!confirmed) return

    setSavingTripId(tripId)

    try {
      const result = await removeJobTripAction(job.id, tripId, employeeId)

      if (!result.success) {
        const message = result.error ?? 'Failed to remove employee from job'
        showError('Failed to remove employee', message)
        return
      }

      showSuccess('Employee removed from job')
      router.refresh()
    } finally {
      setSavingTripId(null)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <form
          onSubmit={handleJobSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Job Details</h2>
              <p className="mt-1 text-sm text-slate-600">
                Update saved job details and choose whether shared travel changes apply to employees.
              </p>
            </div>
            <Button type="submit" disabled={isSavingJob}>
              {isSavingJob && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Job
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="job_ref">Job Reference</Label>
              <Input
                id="job_ref"
                value={form.job_ref}
                onChange={(event) =>
                  setForm((current) => ({ ...current, job_ref: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                value={form.customer}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customer: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Default Country</Label>
              <CountrySelect
                value={form.country}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, country: value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                value={form.purpose}
                onChange={(event) =>
                  setForm((current) => ({ ...current, purpose: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry_date">Default Entry Date</Label>
              <Input
                id="entry_date"
                type="date"
                value={form.entry_date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, entry_date: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exit_date">Default Exit Date</Label>
              <Input
                id="exit_date"
                type="date"
                value={form.exit_date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, exit_date: event.target.value }))
                }
                required
              />
            </div>
          </div>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Assigned Employees
            </h2>
            <p className="text-sm text-slate-600">
              Edit each employee&apos;s linked trip dates when their travel differs from the job defaults.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {job.trips.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No employees are assigned to this job.
              </div>
            ) : (
              job.trips.map((trip) => {
                const tripForm = tripForms[trip.id]
                const summary = summaries[trip.id]

                return (
                  <div
                    key={trip.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="grid gap-3 lg:grid-cols-[1fr_180px_150px_150px_160px_auto] lg:items-end">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {trip.employee?.name ?? 'Employee'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {getCountryName(trip.country)}
                        </p>
                        {tripErrors[trip.id] && (
                          <p className="mt-1 text-sm text-red-600">
                            {tripErrors[trip.id]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Country</Label>
                        <CountrySelect
                          value={tripForm?.country ?? trip.country}
                          onValueChange={(value) =>
                            updateTripForm(trip.id, 'country', value)
                          }
                          placeholder="Select..."
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Entry</Label>
                        <Input
                          type="date"
                          value={tripForm?.entry_date ?? trip.entry_date}
                          onChange={(event) =>
                            updateTripForm(trip.id, 'entry_date', event.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Exit</Label>
                        <Input
                          type="date"
                          value={tripForm?.exit_date ?? trip.exit_date}
                          onChange={(event) =>
                            updateTripForm(trip.id, 'exit_date', event.target.value)
                          }
                        />
                      </div>

                      <div>
                        {summary ? (
                          <div className="space-y-1">
                            <ForecastRiskBadge riskLevel={summary.riskLevel} />
                            <p className="text-xs text-slate-500">
                              {summary.daysRemainingAfterTrip} days remaining after trip
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">Not calculated</span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTripSave(trip.id)}
                          disabled={savingTripId === trip.id}
                        >
                          {savingTripId === trip.id ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTrip(trip.id, trip.employee_id)}
                          disabled={savingTripId === trip.id}
                          aria-label={`Remove ${trip.employee?.name ?? 'employee'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!pendingJobSave} onOpenChange={() => setPendingJobSave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply travel changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You changed the job country or dates. Apply those changes to every employee
              trip linked to this job, or keep their current trip details?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingJob}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-white text-slate-900 hover:bg-slate-100"
              disabled={isSavingJob}
              onClick={() => saveJob(false)}
            >
              Keep employee trips
            </AlertDialogAction>
            <AlertDialogAction disabled={isSavingJob} onClick={() => saveJob(true)}>
              Apply to all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
