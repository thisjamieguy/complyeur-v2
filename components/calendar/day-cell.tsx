'use client'

import {
  memo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { addUtcDays, differenceInUtcDays } from '@/lib/compliance/date-utils'
import { getCountryName } from '@/lib/constants/schengen-countries'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { TripPopover } from './trip-popover'
import { toDateKey } from './calendar-view.utils'
import type {
  CalendarCellContextMenuRequest,
  ProcessedTrip,
  ProcessedTripDay,
  TripResizeEdge,
} from './types'

/** Fixed height for each grid row */
export const GRID_ROW_HEIGHT = 40
const DRAG_ACTIVATION_DISTANCE = 6

interface DayCellProps {
  tripDay: ProcessedTripDay | undefined
  date: Date
  dateKey: string
  dayWidth: number
  isRowHovered: boolean
  isWeekend: boolean
  isToday: boolean
  isMonthStart: boolean
  isInRollingWindow: boolean
  isRollingWindowStart: boolean
  isRollingWindowEnd: boolean
  isTripStart: boolean
  isTripEnd: boolean
  isDropTarget?: boolean
  interactive?: boolean
  onCreateTrip?: (dateKey: string) => void
  onEditTrip?: (trip: ProcessedTrip) => void
  onDeleteTrip?: (trip: ProcessedTrip) => void
  onResizeTrip?: (params: {
    tripId: string
    edge: TripResizeEdge
    dateKey: string
    originalEntryDateKey: string
    originalExitDateKey: string
  }) => void
  onShiftTripDates?: (params: {
    tripId: string
    entryDateKey: string
    exitDateKey: string
    originalEntryDateKey: string
    originalExitDateKey: string
  }) => void
  onMoveTrip?: (params: {
    tripId: string
    targetEmployeeId: string
    targetEmployeeName: string
    country: string
    entryDateKey: string
    exitDateKey: string
    originalEntryDateKey: string
    originalExitDateKey: string
  }) => void
  onMoveTripTargetChange?: (employeeId: string | null) => void
  onOpenContextMenu?: (params: CalendarCellContextMenuRequest) => void
}

const schengenTripStyles = {
  green: {
    base: 'bg-emerald-100',
    weekend: 'bg-emerald-200/70',
    text: 'text-emerald-900',
    hover: 'hover:bg-emerald-200/80',
    border: 'border-emerald-300',
  },
  amber: {
    base: 'bg-amber-100',
    weekend: 'bg-amber-200/70',
    text: 'text-amber-900',
    hover: 'hover:bg-amber-200/80',
    border: 'border-amber-300',
  },
  red: {
    base: 'bg-rose-100',
    weekend: 'bg-rose-200/70',
    text: 'text-rose-900',
    hover: 'hover:bg-rose-200/80',
    border: 'border-rose-300',
  },
  breach: {
    base: 'bg-rose-700',
    weekend: 'bg-rose-800/90',
    text: 'text-white',
    hover: 'hover:bg-rose-800',
    border: 'border-rose-800',
  },
} as const

const historicalTripStyles = {
  base: 'bg-slate-200/75',
  weekend: 'bg-slate-300/60',
  text: 'text-slate-700',
  hover: 'hover:bg-slate-300/75',
  border: 'border-slate-300',
} as const

const nonSchengenTripStyles = {
  base: 'bg-indigo-50',
  weekend: 'bg-indigo-100/70',
  text: 'text-indigo-800',
  hover: 'hover:bg-indigo-100/80',
  border: 'border-indigo-200',
} as const

/**
 * Single day cell in the spreadsheet grid.
 * Shows country code when employee is traveling, empty otherwise.
 */
export const DayCell = memo(function DayCell({
  tripDay,
  date,
  dateKey,
  dayWidth,
  isRowHovered,
  isWeekend,
  isToday,
  isMonthStart,
  isInRollingWindow,
  isRollingWindowStart,
  isRollingWindowEnd,
  isTripStart,
  isTripEnd,
  isDropTarget = false,
  interactive = false,
  onCreateTrip,
  onEditTrip,
  onDeleteTrip,
  onResizeTrip,
  onShiftTripDates,
  onMoveTrip,
  onMoveTripTargetChange,
  onOpenContextMenu,
}: DayCellProps) {
  const suppressNextClickRef = useRef(false)
  const [resizePreview, setResizePreview] = useState<{
    edge: TripResizeEdge
    dateKey: string
    invalid: boolean
  } | null>(null)
  const [dragPreview, setDragPreview] = useState<{
    entryDateKey: string
    exitDateKey: string
    left: number
    top: number
    width: number
  } | null>(null)
  const trip = tripDay?.trip
  const showCountryLabel = Boolean(tripDay && isTripStart && dayWidth >= 16)
  const cellContent = showCountryLabel
    ? trip?.isPrivate
      ? 'PR'
      : trip?.country
    : null
  const tripTitle = trip
    ? `${trip.isPrivate ? 'Private' : getCountryName(trip.rawCountry)} trip`
    : null

  const baseCls = cn(
    'shrink-0 flex items-center justify-center border-r border-slate-100',
    // Empty cells
    !trip && !isToday && !isWeekend && !isInRollingWindow && 'bg-white',
    !trip && !isToday && !isWeekend && isInRollingWindow && 'bg-sky-50/40',
    !trip && isWeekend && !isToday && !isInRollingWindow && 'bg-slate-100/70',
    !trip && isWeekend && !isToday && isInRollingWindow && 'bg-sky-100/55',
    !trip && isToday && 'bg-blue-100/80',
    !trip && isRowHovered && 'bg-slate-100/70',
    isMonthStart && !(trip && !isTripStart) && 'border-l border-l-slate-400/80',
    // Today's travel cells should preserve trip color while still standing out
    trip && isToday && 'ring-2 ring-inset ring-blue-300',
    trip && isRowHovered && 'ring-1 ring-inset ring-slate-200/80',
    // Make trip bars solid — no internal borders
    trip && !isTripEnd && 'border-r-0',
    !trip && isRollingWindowStart && 'border-l border-l-sky-400',
    !trip && isRollingWindowEnd && 'border-r border-r-sky-400',
    isDropTarget && !trip && '!bg-sky-100/70'
  )

  const tripStyles = trip
    ? tripDay?.displayMode === 'historical'
      ? historicalTripStyles
      : trip.isSchengen
      ? tripDay?.isBreachDay
        ? schengenTripStyles.breach
        : schengenTripStyles[tripDay?.riskLevel ?? 'green']
      : nonSchengenTripStyles
    : null

  const openContextMenu = (
    event: ReactMouseEvent<HTMLButtonElement>,
    menuTrip?: ProcessedTrip
  ) => {
    if (!interactive || !onOpenContextMenu) return

    event.preventDefault()
    event.stopPropagation()
    onOpenContextMenu({
      x: event.clientX,
      y: event.clientY,
      dateKey,
      ...(menuTrip ? { trip: menuTrip } : {}),
    })
  }

  if (!trip) {
    if (interactive && onCreateTrip) {
      return (
        <button
          type="button"
          className={cn(
            baseCls,
            'cursor-cell transition-colors hover:bg-sky-100/80 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-inset'
          )}
          style={{ width: dayWidth, height: GRID_ROW_HEIGHT }}
          aria-label={`Add trip on ${format(date, 'MMM d')}`}
          onClick={() => onCreateTrip(dateKey)}
          onContextMenu={(event) => openContextMenu(event)}
        />
      )
    }

    return (
      <div
        className={baseCls}
        style={{ width: dayWidth, height: GRID_ROW_HEIGHT }}
      />
    )
  }

  const startResize = (
    edge: TripResizeEdge,
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (!interactive || !onResizeTrip) return

    event.preventDefault()
    event.stopPropagation()

    const startX = event.clientX
    const originalEntryDate = trip.entryDate
    const originalExitDate = trip.exitDate
    const originalEntryDateKey = toDateKey(originalEntryDate)
    const originalExitDateKey = toDateKey(originalExitDate)
    let latestDateKey = edge === 'start' ? originalEntryDateKey : originalExitDateKey

    const updatePreview = (clientX: number) => {
      const deltaDays = Math.round((clientX - startX) / dayWidth)
      const nextDate =
        edge === 'start'
          ? addUtcDays(originalEntryDate, deltaDays)
          : addUtcDays(originalExitDate, deltaDays)
      latestDateKey = toDateKey(nextDate)
      const invalid =
        edge === 'start'
          ? nextDate.getTime() > originalExitDate.getTime()
          : nextDate.getTime() < originalEntryDate.getTime()

      setResizePreview({ edge, dateKey: latestDateKey, invalid })
    }

    updatePreview(startX)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updatePreview(moveEvent.clientX)
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      setResizePreview(null)

      const unchanged =
        edge === 'start'
          ? latestDateKey === originalEntryDateKey
          : latestDateKey === originalExitDateKey

      if (unchanged) return

      onResizeTrip({
        tripId: trip.id,
        edge,
        dateKey: latestDateKey,
        originalEntryDateKey,
        originalExitDateKey,
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }

  const resizeHandleClass = cn(
    'absolute top-0 z-10 h-full w-2 cursor-ew-resize bg-slate-900/0 transition-colors hover:bg-slate-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-inset',
    dayWidth <= 16 && 'w-1.5'
  )

  const getMoveTarget = (clientX: number, clientY: number) => {
    if (
      typeof document === 'undefined' ||
      typeof document.elementFromPoint !== 'function'
    ) {
      return null
    }

    const element = document.elementFromPoint(clientX, clientY)
    const row = element?.closest<HTMLElement>('[data-calendar-employee-row]')
    const employeeId = row?.dataset.employeeId
    const employeeName = row?.dataset.employeeName

    if (!employeeId || !employeeName) {
      return null
    }

    return {
      employeeId,
      employeeName,
      top: row.getBoundingClientRect().top,
    }
  }

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!interactive || event.button !== 0 || (!onMoveTrip && !onShiftTripDates)) {
      return
    }

    const startX = event.clientX
    const startY = event.clientY
    const tripBlockDayOffset = differenceInUtcDays(date, trip.entryDate)
    const sourceCellRect = event.currentTarget.getBoundingClientRect()
    const sourceRowRect = event.currentTarget
      .closest<HTMLElement>('[data-calendar-employee-row]')
      ?.getBoundingClientRect()
    const sourceBlockLeft = sourceCellRect.left - tripBlockDayOffset * dayWidth
    const sourceRowTop = sourceRowRect?.top ?? sourceCellRect.top
    const previewWidth = Math.max(dayWidth, trip.duration * dayWidth)
    const originalEntryDate = trip.entryDate
    const originalExitDate = trip.exitDate
    const originalEntryDateKey = toDateKey(originalEntryDate)
    const originalExitDateKey = toDateKey(originalExitDate)
    let isActive = false
    let latestShift = {
      entryDateKey: originalEntryDateKey,
      exitDateKey: originalExitDateKey,
    }
    let latestTarget = getMoveTarget(startX, startY)
    let latestPointer = { clientX: startX, clientY: startY }
    let previewFrame: number | null = null

    const updateDragPreview = (
      clientX: number,
      clientY: number,
      renderPreview = true
    ) => {
      const deltaDays = Math.round((clientX - startX) / dayWidth)
      latestTarget = getMoveTarget(clientX, clientY)
      latestShift = {
        entryDateKey: toDateKey(addUtcDays(originalEntryDate, deltaDays)),
        exitDateKey: toDateKey(addUtcDays(originalExitDate, deltaDays)),
      }
      onMoveTripTargetChange?.(latestTarget?.employeeId ?? null)
      if (!renderPreview) {
        return
      }

      setDragPreview({
        ...latestShift,
        left: sourceBlockLeft + deltaDays * dayWidth,
        top:
          latestTarget?.top ??
          sourceRowTop +
            Math.round((clientY - startY) / GRID_ROW_HEIGHT) * GRID_ROW_HEIGHT,
        width: previewWidth,
      })
    }

    const queueDragPreview = (clientX: number, clientY: number) => {
      latestPointer = { clientX, clientY }

      if (typeof window.requestAnimationFrame !== 'function') {
        updateDragPreview(clientX, clientY)
        return
      }

      if (previewFrame !== null) {
        return
      }

      previewFrame = window.requestAnimationFrame(() => {
        previewFrame = null
        updateDragPreview(latestPointer.clientX, latestPointer.clientY)
      })
    }

    const cancelQueuedPreview = () => {
      if (
        previewFrame !== null &&
        typeof window.cancelAnimationFrame === 'function'
      ) {
        window.cancelAnimationFrame(previewFrame)
      }

      previewFrame = null
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      const distance = Math.hypot(deltaX, deltaY)

      if (!isActive && distance < DRAG_ACTIVATION_DISTANCE) return

      if (!isActive) {
        isActive = true
        suppressNextClickRef.current = true
        updateDragPreview(moveEvent.clientX, moveEvent.clientY)
        return
      }

      suppressNextClickRef.current = true
      queueDragPreview(moveEvent.clientX, moveEvent.clientY)
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      cancelQueuedPreview()
      setDragPreview(null)

      if (!isActive) {
        onMoveTripTargetChange?.(null)
        return
      }

      updateDragPreview(upEvent.clientX, upEvent.clientY, false)
      const target = getMoveTarget(upEvent.clientX, upEvent.clientY) ?? latestTarget
      onMoveTripTargetChange?.(null)

      if (target && onMoveTrip) {
        onMoveTrip({
          tripId: trip.id,
          targetEmployeeId: target.employeeId,
          targetEmployeeName: target.employeeName,
          country: trip.country,
          entryDateKey: latestShift.entryDateKey,
          exitDateKey: latestShift.exitDateKey,
          originalEntryDateKey,
          originalExitDateKey,
        })
        return
      }

      if (onShiftTripDates) {
        if (
          latestShift.entryDateKey === originalEntryDateKey &&
          latestShift.exitDateKey === originalExitDateKey
        ) {
          return
        }

        onShiftTripDates?.({
          tripId: trip.id,
          entryDateKey: latestShift.entryDateKey,
          exitDateKey: latestShift.exitDateKey,
          originalEntryDateKey,
          originalExitDateKey,
        })
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }

  const handleTripClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!suppressNextClickRef.current) return

    event.preventDefault()
    event.stopPropagation()
    suppressNextClickRef.current = false
  }

  // Travel cell — clickable with popover
  return (
    <div
      className="relative shrink-0"
      style={{ width: dayWidth, height: GRID_ROW_HEIGHT }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              baseCls,
              tripStyles && tripStyles.base,
              tripStyles?.hover,
              // Outer border for trip block definition
              tripStyles && 'border-t border-b',
              tripStyles && tripStyles.border,
              isTripStart && 'border-l rounded-l-md',
              isTripEnd && 'border-r rounded-r-md',
              'cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-inset'
            )}
            style={{ width: dayWidth, height: GRID_ROW_HEIGHT }}
            aria-label={`${trip.country} trip on ${format(date, 'MMM d')}`}
            title={tripTitle ?? undefined}
            onPointerDown={startDrag}
            onClick={handleTripClick}
            onContextMenu={(event) => openContextMenu(event, trip)}
          >
            <span
              className={cn(
                'max-w-full truncate px-1 text-[10px] font-semibold leading-none',
                tripStyles?.text ?? (isToday ? 'text-blue-700' : 'text-slate-600')
              )}
            >
              {cellContent}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="center" side="top">
          <TripPopover
            tripDay={tripDay!}
            onEditTrip={interactive ? onEditTrip : undefined}
            onDeleteTrip={interactive ? onDeleteTrip : undefined}
          />
        </PopoverContent>
      </Popover>

      {interactive && onResizeTrip && isTripStart && (
        <button
          type="button"
          className={cn(resizeHandleClass, 'left-0 rounded-l-md')}
          aria-label={`Resize ${trip.country} trip start`}
          onPointerDown={(event) => startResize('start', event)}
        />
      )}

      {interactive && onResizeTrip && isTripEnd && (
        <button
          type="button"
          className={cn(resizeHandleClass, 'right-0 rounded-r-md')}
          aria-label={`Resize ${trip.country} trip end`}
          onPointerDown={(event) => startResize('end', event)}
        />
      )}

      {resizePreview && (
        <div
          className={cn(
            'pointer-events-none absolute -top-7 z-20 rounded-md px-2 py-1 text-[11px] font-medium shadow-sm',
            resizePreview.edge === 'start' ? 'left-0' : 'right-0',
            resizePreview.invalid
              ? 'bg-red-600 text-white'
              : 'bg-slate-900 text-white'
          )}
        >
          {resizePreview.dateKey}
        </div>
      )}

      {dragPreview && (
        <div
          aria-hidden="true"
          data-testid="trip-drag-preview"
          className="pointer-events-none fixed z-50 flex items-center rounded-md border border-sky-400 bg-white/80 px-2 text-[10px] font-semibold text-sky-900 shadow-xl ring-2 ring-sky-300/60 backdrop-blur-[2px]"
          style={{
            left: dragPreview.left,
            top: dragPreview.top,
            width: dragPreview.width,
            height: GRID_ROW_HEIGHT,
          }}
        >
          {dragPreview.width >= 24 && (trip.isPrivate ? '--' : trip.country)}
        </div>
      )}
    </div>
  )
})
