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
import type { EmployeeWithTrips, TripDateOverride } from './calendar-view.helpers'
import type { TripEditorDraft } from './interactive-trip-editor'
import type {
  CalendarCopiedTrip,
  CalendarPasteTripRequest,
  TripDateShiftRequest,
  TripDeleteRequest,
  TripEditRequest,
  TripMoveRequest,
  TripResizeRequest,
} from './types'

/**
 * Owns all trip-mutation state and handlers for the calendar: the editor /
 * delete / move dialog drafts, the clipboard, and the optimistic
 * `tripDateOverrides` used to preview drag/resize before the server confirms.
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
  const [tripDateOverrides, setTripDateOverrides] = useState(
    () => new Map<string, TripDateOverride>()
  )

  // Drop optimistic overrides once the server data matches (or the trip is gone).
  useEffect(() => {
    setTripDateOverrides((current) => {
      if (current.size === 0) {
        return current
      }

      const sourceDatesByTrip = new Map<string, { entry_date: string; exit_date: string }>()
      for (const employee of employees) {
        for (const trip of employee.trips) {
          sourceDatesByTrip.set(trip.id, {
            entry_date: trip.entry_date,
            exit_date: trip.exit_date,
          })
        }
      }

      let changed = false
      const next = new Map(current)
      for (const [tripId, override] of current) {
        const sourceDates = sourceDatesByTrip.get(tripId)
        if (
          !sourceDates ||
          (sourceDates.entry_date === override.entry_date &&
            sourceDates.exit_date === override.exit_date)
        ) {
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

    try {
      await updateTripAction(trip.id, employeeId, {
        is_private: nextIsPrivate,
      })
      showSuccess(nextIsPrivate ? 'Trip marked as private' : 'Trip marked as work trip')
      router.refresh()
    } catch (error) {
      showError(
        'Failed to update trip',
        error instanceof Error ? error.message : 'Please try again.'
      )
    }
  }

  const confirmDeleteTrip = async () => {
    if (!tripDeleteDraft) return

    setIsDeletingTrip(true)

    try {
      await deleteTripAction(tripDeleteDraft.trip.id, tripDeleteDraft.employeeId)
      setTripDateOverrides((current) => {
        if (!current.has(tripDeleteDraft.trip.id)) {
          return current
        }

        const next = new Map(current)
        next.delete(tripDeleteDraft.trip.id)
        return next
      })
      showSuccess('Trip deleted successfully')
      setTripDeleteDraft(null)
      router.refresh()
    } catch (error) {
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

    setTripDateOverrides((current) => {
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
      setTripDateOverrides((current) => {
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

    setTripDateOverrides((current) => {
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
      setTripDateOverrides((current) => {
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
    tripDateOverrides,
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
