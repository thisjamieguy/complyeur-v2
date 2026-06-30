'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addTripAction,
  updateTripAction,
  deleteTripAction,
  updateTripAssignmentAction,
  reassignTripAction,
} from '@/app/(dashboard)/actions'
import { checkTripOverlap } from '@/lib/validations/trip-overlap'
import { showError, showSuccess } from '@/lib/toast'
import { parseDateOnlyAsUTC } from '@/lib/compliance'
import { addUtcDays } from '@/lib/compliance/date-utils'
import { toDateKey } from './calendar-view.utils'
import { getOverlapMessage } from './calendar-view.helpers'
import type { TripOverride } from './calendar-view.helpers'
import type { TripEditorDraft } from './interactive-trip-editor'
import type {
  CalendarCopiedTrip,
  CalendarPasteTripRequest,
  EmployeeWithTrips,
  TripDateShiftRequest,
  TripDeleteRequest,
  TripEditRequest,
  TripMoveRequest,
  TripResizeRequest,
} from './types'

/**
 * Owns all trip-mutation state and handlers for the calendar: the editor /
 * delete / move dialog drafts, the clipboard, and the optimistic
 * `tripOverrides` used to preview a change (resize, move, privacy toggle,
 * delete) before the server confirms it.
 *
 * Extracted from calendar-view.tsx to keep that component focused on layout and
 * data shaping.
 */
export function useCalendarTripActions(employees: EmployeeWithTrips[]) {
  const router = useRouter()
  const [tripEditorDraft, setTripEditorDraft] = useState<TripEditorDraft | null>(null)
  const [tripDeleteDraft, setTripDeleteDraft] = useState<TripDeleteRequest | null>(null)
  const [isDeletingTrip, setIsDeletingTrip] = useState(false)
  const [tripMoveDraft, setTripMoveDraft] = useState<TripMoveRequest | null>(null)
  const [tripMoveError, setTripMoveError] = useState<string | null>(null)
  const [isMovingTrip, setIsMovingTrip] = useState(false)
  const [copiedTrip, setCopiedTrip] = useState<CalendarCopiedTrip | null>(null)
  const [tripOverrides, setTripOverrides] = useState(
    () => new Map<string, TripOverride>()
  )

  // Drop optimistic overrides once the server data confirms them (or, for a
  // delete override, once the trip is actually gone from `employees`).
  useEffect(() => {
    setTripOverrides((current) => {
      if (current.size === 0) {
        return current
      }

      const sourceByTrip = new Map<
        string,
        { entry_date: string; exit_date: string; is_private: boolean }
      >()
      for (const employee of employees) {
        for (const trip of employee.trips) {
          sourceByTrip.set(trip.id, {
            entry_date: trip.entry_date,
            exit_date: trip.exit_date,
            is_private: trip.is_private,
          })
        }
      }

      let changed = false
      const next = new Map(current)
      for (const [tripId, override] of current) {
        const source = sourceByTrip.get(tripId)

        if (!source) {
          // Trip is gone server-side: nothing left for any override to do.
          next.delete(tripId)
          changed = true
          continue
        }

        if (override.deleted) {
          // Server still has the trip — keep hiding it until refresh confirms.
          continue
        }

        const datesSettled =
          (override.entry_date === undefined || override.entry_date === source.entry_date) &&
          (override.exit_date === undefined || override.exit_date === source.exit_date)
        const privacySettled =
          override.is_private === undefined || override.is_private === source.is_private

        if (datesSettled && privacySettled) {
          next.delete(tripId)
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [employees])

  const openCreateTrip = ({
    employeeId,
    employeeName,
    dateKey,
  }: {
    employeeId: string
    employeeName: string
    dateKey: string
  }) => {
    setTripEditorDraft({
      mode: 'create',
      employeeId,
      employeeName,
      entryDate: dateKey,
      exitDate: dateKey,
    })
  }

  const openEditTrip = ({ employeeId, employeeName, trip }: TripEditRequest) => {
    setTripEditorDraft({
      mode: 'edit',
      employeeId,
      employeeName,
      tripId: trip.id,
      country: trip.rawCountry,
      entryDate: toDateKey(trip.entryDate),
      exitDate: toDateKey(trip.exitDate),
      purpose: trip.purpose,
      jobRef: trip.jobRef,
      isPrivate: trip.isPrivate,
      ghosted: trip.ghosted,
    })
  }

  const requestDeleteTrip = (request: TripDeleteRequest) => {
    setTripDeleteDraft(request)
  }

  const copyTrip = ({ trip }: TripEditRequest) => {
    setCopiedTrip({
      country: trip.rawCountry,
      duration: trip.duration,
      purpose: trip.purpose,
      jobRef: trip.jobRef,
      isPrivate: trip.isPrivate,
      ghosted: trip.ghosted,
    })
    showSuccess('Trip copied')
  }

  const pasteTrip = async ({
    employeeId,
    employeeName,
    dateKey,
  }: CalendarPasteTripRequest) => {
    if (!copiedTrip) {
      showError('No copied trip', 'Copy a trip before pasting it into the calendar.')
      return
    }

    const entryDate = parseDateOnlyAsUTC(dateKey)
    const exitDate = addUtcDays(entryDate, copiedTrip.duration - 1)
    const exitDateKey = toDateKey(exitDate)

    const overlapResult = await checkTripOverlap(employeeId, dateKey, exitDateKey)

    if (overlapResult.hasOverlap) {
      showError(
        'Trip overlap detected',
        `Cannot paste trip. ${getOverlapMessage(overlapResult, employeeName)}`
      )
      return
    }

    try {
      await addTripAction({
        employee_id: employeeId,
        country: copiedTrip.country,
        entry_date: dateKey,
        exit_date: exitDateKey,
        ...(copiedTrip.purpose ? { purpose: copiedTrip.purpose } : {}),
        ...(copiedTrip.jobRef ? { job_ref: copiedTrip.jobRef } : {}),
        is_private: copiedTrip.isPrivate,
        ghosted: copiedTrip.ghosted,
      })
      showSuccess('Trip pasted successfully')
      router.refresh()
    } catch (error) {
      showError(
        'Failed to paste trip',
        error instanceof Error ? error.message : 'Please try again.'
      )
    }
  }

  const toggleTripPrivacy = async ({ employeeId, trip }: TripEditRequest) => {
    const nextIsPrivate = !trip.isPrivate

    // Optimistic flip so the grid updates the instant this is clicked, instead
    // of sitting unchanged until the mutation + refresh round trip completes.
    setTripOverrides((current) => {
      const next = new Map(current)
      next.set(trip.id, { ...next.get(trip.id), is_private: nextIsPrivate })
      return next
    })

    try {
      await updateTripAction(trip.id, employeeId, {
        is_private: nextIsPrivate,
      })
      showSuccess(nextIsPrivate ? 'Trip marked as private' : 'Trip marked as work trip')
      router.refresh()
    } catch (error) {
      setTripOverrides((current) => {
        const next = new Map(current)
        next.set(trip.id, { ...next.get(trip.id), is_private: trip.isPrivate })
        return next
      })
      showError(
        'Failed to update trip',
        error instanceof Error ? error.message : 'Please try again.'
      )
    }
  }

  const confirmDeleteTrip = async () => {
    if (!tripDeleteDraft) return

    const { trip, employeeId } = tripDeleteDraft
    setIsDeletingTrip(true)

    // Optimistic hide: the trip drops off the grid as soon as the user
    // confirms, rather than staying visible through the delete + refresh
    // round trip. Rolled back below if the delete fails.
    setTripOverrides((current) => {
      const next = new Map(current)
      next.set(trip.id, { ...next.get(trip.id), deleted: true })
      return next
    })

    try {
      await deleteTripAction(trip.id, employeeId)
      showSuccess('Trip deleted successfully')
      setTripDeleteDraft(null)
      router.refresh()
    } catch (error) {
      setTripOverrides((current) => {
        const next = new Map(current)
        const { deleted: _deleted, ...rest } = next.get(trip.id) ?? {}
        if (Object.keys(rest).length === 0) {
          next.delete(trip.id)
        } else {
          next.set(trip.id, rest)
        }
        return next
      })
      showError(
        'Failed to delete trip',
        error instanceof Error ? error.message : 'Please try again.'
      )
    } finally {
      setIsDeletingTrip(false)
    }
  }

  const resizeTrip = async ({
    tripId,
    employeeId,
    edge,
    dateKey,
    originalEntryDateKey,
    originalExitDateKey,
  }: TripResizeRequest) => {
    const nextEntryDate = edge === 'start' ? dateKey : originalEntryDateKey
    const nextExitDate = edge === 'end' ? dateKey : originalExitDateKey

    if (nextEntryDate > nextExitDate) {
      showError('Invalid date range', 'Entry date must be on or before exit date.')
      return
    }

    const overlapResult = await checkTripOverlap(
      employeeId,
      nextEntryDate,
      nextExitDate,
      tripId
    )

    if (overlapResult.hasOverlap) {
      showError('Trip overlap detected', `Cannot resize trip. ${getOverlapMessage(overlapResult)}`)
      return
    }

    setTripOverrides((current) => {
      const next = new Map(current)
      next.set(tripId, {
        entry_date: nextEntryDate,
        exit_date: nextExitDate,
      })
      return next
    })

    try {
      await updateTripAction(tripId, employeeId, {
        entry_date: edge === 'start' ? dateKey : undefined,
        exit_date: edge === 'end' ? dateKey : undefined,
      })
      showSuccess('Trip dates updated')
      router.refresh()
    } catch (error) {
      setTripOverrides((current) => {
        const next = new Map(current)
        next.set(tripId, {
          entry_date: originalEntryDateKey,
          exit_date: originalExitDateKey,
        })
        return next
      })
      showError(
        'Failed to update trip',
        error instanceof Error ? error.message : 'Please try again.'
      )
    }
  }

  const shiftTripDates = async ({
    tripId,
    employeeId,
    entryDateKey,
    exitDateKey,
    originalEntryDateKey,
    originalExitDateKey,
  }: TripDateShiftRequest) => {
    if (
      entryDateKey === originalEntryDateKey &&
      exitDateKey === originalExitDateKey
    ) {
      return
    }

    if (entryDateKey > exitDateKey) {
      showError('Invalid date range', 'Entry date must be on or before exit date.')
      return
    }

    const overlapResult = await checkTripOverlap(
      employeeId,
      entryDateKey,
      exitDateKey,
      tripId
    )

    if (overlapResult.hasOverlap) {
      showError('Trip overlap detected', `Cannot shift trip. ${getOverlapMessage(overlapResult)}`)
      return
    }

    setTripOverrides((current) => {
      const next = new Map(current)
      next.set(tripId, {
        entry_date: entryDateKey,
        exit_date: exitDateKey,
      })
      return next
    })

    try {
      await updateTripAction(tripId, employeeId, {
        entry_date: entryDateKey,
        exit_date: exitDateKey,
      })
      showSuccess('Trip dates updated')
      router.refresh()
    } catch (error) {
      setTripOverrides((current) => {
        const next = new Map(current)
        next.set(tripId, {
          entry_date: originalEntryDateKey,
          exit_date: originalExitDateKey,
        })
        return next
      })
      showError(
        'Failed to update trip',
        error instanceof Error ? error.message : 'Please try again.'
      )
    }
  }

  const requestMoveTrip = (request: TripMoveRequest) => {
    if (request.sourceEmployeeId === request.targetEmployeeId) {
      if (
        request.entryDateKey !== request.originalEntryDateKey ||
        request.exitDateKey !== request.originalExitDateKey
      ) {
        void shiftTripDates({
          tripId: request.tripId,
          employeeId: request.sourceEmployeeId,
          entryDateKey: request.entryDateKey,
          exitDateKey: request.exitDateKey,
          originalEntryDateKey: request.originalEntryDateKey,
          originalExitDateKey: request.originalExitDateKey,
        })
      }

      return
    }

    setTripMoveError(null)
    setTripMoveDraft(request)
  }

  const confirmMoveTrip = async () => {
    if (!tripMoveDraft) return

    setIsMovingTrip(true)
    setTripMoveError(null)
    try {
      const overlapResult = await checkTripOverlap(
        tripMoveDraft.targetEmployeeId,
        tripMoveDraft.entryDateKey,
        tripMoveDraft.exitDateKey,
        tripMoveDraft.tripId
      )

      if (overlapResult.hasOverlap) {
        const message = `Cannot move trip. ${getOverlapMessage(
          overlapResult,
          tripMoveDraft.targetEmployeeName
        )}`
        setTripMoveError(message)
        showError('Trip overlap detected', message)
        return
      }

      const datesChanged =
        tripMoveDraft.entryDateKey !== tripMoveDraft.originalEntryDateKey ||
        tripMoveDraft.exitDateKey !== tripMoveDraft.originalExitDateKey

      if (datesChanged) {
        await updateTripAssignmentAction(
          tripMoveDraft.tripId,
          tripMoveDraft.sourceEmployeeId,
          tripMoveDraft.targetEmployeeId,
          {
            entry_date: tripMoveDraft.entryDateKey,
            exit_date: tripMoveDraft.exitDateKey,
          }
        )
      } else {
        await reassignTripAction(
          tripMoveDraft.tripId,
          tripMoveDraft.sourceEmployeeId,
          tripMoveDraft.targetEmployeeId
        )
      }

      showSuccess(datesChanged ? 'Trip moved and dates updated' : 'Trip moved successfully')
      setTripMoveDraft(null)
      router.refresh()
    } catch (error) {
      showError(
        'Failed to move trip',
        error instanceof Error ? error.message : 'Please try again.'
      )
    } finally {
      setIsMovingTrip(false)
    }
  }

  return {
    // optimistic state consumed by the processing memo
    tripOverrides,
    copiedTrip,
    // editor dialog
    tripEditorDraft,
    closeTripEditor: () => setTripEditorDraft(null),
    // delete dialog
    tripDeleteDraft,
    isDeletingTrip,
    closeTripDelete: () => setTripDeleteDraft(null),
    confirmDeleteTrip,
    // move dialog
    tripMoveDraft,
    tripMoveError,
    isMovingTrip,
    closeTripMove: () => {
      setTripMoveError(null)
      setTripMoveDraft(null)
    },
    confirmMoveTrip,
    // grid handlers
    openCreateTrip,
    openEditTrip,
    requestDeleteTrip,
    copyTrip,
    pasteTrip,
    toggleTripPrivacy,
    resizeTrip,
    shiftTripDates,
    requestMoveTrip,
  }
}
