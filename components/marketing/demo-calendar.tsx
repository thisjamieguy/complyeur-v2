import { cn } from '@/lib/utils'

type RiskLevel = 'green' | 'amber' | 'red'

interface DemoTrip {
  country: string
  startDay: number
  duration: number
  riskLevel: RiskLevel
}

interface CalendarEmployeeRow {
  name: string
  trips: DemoTrip[]
}

export interface DemoCalendarTripInput {
  country: string
  entryDate: Date | string
  exitDate: Date | string
}

export interface DemoCalendarEmployee {
  name: string
  trips: DemoCalendarTripInput[]
}

interface DemoCalendarProps {
  employees?: DemoCalendarEmployee[]
  title?: string
  windowDays?: number
  referenceDate?: Date
}

const DAY_WIDTH = 44
const ROW_HEIGHT = 40
const NAME_WIDTH = 120
const DAY_MS = 24 * 60 * 60 * 1000
const BUFFER_DAYS = 2
const MIN_WINDOW_DAYS = 14

const defaultEmployees: CalendarEmployeeRow[] = [
  {
    name: 'Ken Adams',
    trips: [
      { country: 'DE', startDay: 2, duration: 5, riskLevel: 'amber' },
      { country: 'FR', startDay: 16, duration: 4, riskLevel: 'red' },
    ],
  },
  {
    name: 'James Davies',
    trips: [
      { country: 'NL', startDay: 8, duration: 3, riskLevel: 'green' },
      { country: 'BE', startDay: 20, duration: 2, riskLevel: 'green' },
    ],
  },
  {
    name: 'Emma Thompson',
    trips: [
      { country: 'ES', startDay: 0, duration: 7, riskLevel: 'amber' },
      { country: 'IT', startDay: 22, duration: 5, riskLevel: 'amber' },
    ],
  },
  {
    name: 'Michael Park',
    trips: [{ country: 'AT', startDay: 11, duration: 4, riskLevel: 'green' }],
  },
  {
    name: 'Lisa Martinez',
    trips: [{ country: 'DE', startDay: 5, duration: 8, riskLevel: 'red' }],
  },
]

const DEFAULT_TOTAL_DAYS = 28
const DEFAULT_TODAY_OFFSET = 14

const riskStyles = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
} satisfies Record<RiskLevel, string>

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function diffInDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / DAY_MS)
}

function parseDateInput(input: Date | string): Date | null {
  const rawDate = input instanceof Date ? input : new Date(`${input}T00:00:00`)
  if (Number.isNaN(rawDate.getTime())) return null
  return startOfDay(rawDate)
}

function getRiskLevelFromDuration(durationDays: number): RiskLevel {
  if (durationDays <= 7) return 'green'
  if (durationDays <= 14) return 'amber'
  return 'red'
}

function generateDayLabels(windowStartDate: Date, totalDays: number): string[] {
  return Array.from({ length: totalDays }, (_, i) => {
    const date = addDays(windowStartDate, i)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  })
}

function generateDefaultDayLabels(): string[] {
  const labels: string[] = []
  const baseDay = 10
  for (let i = 0; i < DEFAULT_TOTAL_DAYS; i++) {
    const day = ((baseDay + i - 1) % 31) + 1
    labels.push(day.toString())
  }
  return labels
}

const defaultDayLabels = generateDefaultDayLabels()

function computeAutoFitWindow(employees: DemoCalendarEmployee[]): {
  startDate: Date
  endDate: Date
  totalDays: number
} {
  let earliest: Date | null = null
  let latest: Date | null = null

  for (const employee of employees) {
    for (const trip of employee.trips) {
      const entry = parseDateInput(trip.entryDate)
      const exit = parseDateInput(trip.exitDate)
      if (!entry || !exit || exit < entry) continue

      if (!earliest || entry < earliest) earliest = entry
      if (!latest || exit > latest) latest = exit
    }
  }

  if (!earliest || !latest) {
    const today = startOfDay(new Date())
    const halfWindow = Math.floor(MIN_WINDOW_DAYS / 2)
    return {
      startDate: addDays(today, -halfWindow),
      endDate: addDays(today, halfWindow - 1),
      totalDays: MIN_WINDOW_DAYS,
    }
  }

  const bufferedStart = addDays(earliest, -BUFFER_DAYS)
  const bufferedEnd = addDays(latest, BUFFER_DAYS)
  const rawDays = diffInDays(bufferedEnd, bufferedStart) + 1
  const totalDays = Math.max(rawDays, MIN_WINDOW_DAYS)

  if (totalDays > rawDays) {
    const extra = totalDays - rawDays
    const padBefore = Math.floor(extra / 2)
    return {
      startDate: addDays(bufferedStart, -padBefore),
      endDate: addDays(bufferedStart, totalDays - padBefore - 1),
      totalDays,
    }
  }

  return {
    startDate: bufferedStart,
    endDate: bufferedEnd,
    totalDays,
  }
}

function convertEmployeesForWindow(
  employees: DemoCalendarEmployee[],
  windowStartDate: Date,
  windowEndDate: Date
): CalendarEmployeeRow[] {
  return employees.map((employee) => {
    const trips = employee.trips
      .map((trip): DemoTrip | null => {
        const entryDate = parseDateInput(trip.entryDate)
        const exitDate = parseDateInput(trip.exitDate)

        if (!entryDate || !exitDate || exitDate < entryDate) {
          return null
        }

        const fullDuration = diffInDays(exitDate, entryDate) + 1
        const clippedStart = entryDate < windowStartDate ? windowStartDate : entryDate
        const clippedEnd = exitDate > windowEndDate ? windowEndDate : exitDate

        if (clippedEnd < clippedStart) {
          return null
        }

        return {
          country: trip.country.toUpperCase().slice(0, 2),
          startDay: diffInDays(clippedStart, windowStartDate),
          duration: diffInDays(clippedEnd, clippedStart) + 1,
          riskLevel: getRiskLevelFromDuration(fullDuration),
        }
      })
      .filter((trip): trip is DemoTrip => Boolean(trip))
      .sort((a, b) => a.startDay - b.startDay)

    return {
      name: employee.name,
      trips,
    }
  })
}

function TripBar({ trip }: { trip: DemoTrip }) {
  const left = trip.startDay * DAY_WIDTH
  const width = trip.duration * DAY_WIDTH - 2

  return (
    <div
      className={cn(
        'absolute flex h-6 items-center justify-center rounded-md text-xs font-medium text-white shadow-sm',
        riskStyles[trip.riskLevel]
      )}
      style={{
        left: `${left}px`,
        width: `${Math.max(width, 24)}px`,
        top: '50%',
        transform: 'translateY(-50%)',
      }}
      title={`${trip.country} (${trip.duration} day${trip.duration > 1 ? 's' : ''})`}
    >
      {trip.country}
    </div>
  )
}

export function DemoCalendar({
  employees,
  title = 'Timeline View',
  windowDays = DEFAULT_TOTAL_DAYS,
  referenceDate = new Date(),
}: DemoCalendarProps) {
  const isPropDriven = Array.isArray(employees)

  // Auto-fit mode: compute window from trip data
  const autoFitWindow = isPropDriven ? computeAutoFitWindow(employees) : null

  const windowStartDate = autoFitWindow
    ? autoFitWindow.startDate
    : addDays(startOfDay(referenceDate), -Math.floor(Math.max(7, Math.floor(windowDays)) / 2))

  const totalDays = autoFitWindow
    ? autoFitWindow.totalDays
    : Math.max(7, Math.floor(windowDays))

  const windowEndDate = addDays(windowStartDate, totalDays - 1)

  const dayLabels = isPropDriven
    ? generateDayLabels(windowStartDate, totalDays)
    : defaultDayLabels

  const rows = isPropDriven
    ? convertEmployeesForWindow(employees, windowStartDate, windowEndDate)
    : defaultEmployees

  // Today marker — only show if today falls within the visible window
  const today = startOfDay(new Date())
  const todayIndex = diffInDays(today, windowStartDate)
  const showTodayMarker = todayIndex >= 0 && todayIndex < totalDays

  const timelineWidth = totalDays * DAY_WIDTH

  return (
    <div className="max-w-full overflow-hidden bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <span className="text-sm font-medium text-slate-700">{title}</span>
      </div>

      <div className="flex">
        <div className="shrink-0 border-r border-slate-200" style={{ width: NAME_WIDTH }}>
          <div className="flex h-8 items-center border-b border-slate-200 bg-slate-50 px-3">
            <span className="text-xs font-medium text-slate-500">Employee</span>
          </div>

          {rows.map((employee) => (
            <div
              key={employee.name}
              className="flex items-center border-b border-slate-100 px-3"
              style={{ height: ROW_HEIGHT }}
            >
              <span className="truncate text-sm text-slate-700">{employee.name}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="relative" style={{ width: timelineWidth }}>
            <div className="relative flex h-8 border-b border-slate-200 bg-slate-50">
              {dayLabels.map((label, idx) => (
                <div
                  key={`day-${idx}`}
                  className={cn(
                    'flex shrink-0 items-center justify-center border-r border-slate-100 text-xs text-slate-500',
                    showTodayMarker && idx === todayIndex && 'bg-blue-50 font-semibold text-blue-600'
                  )}
                  style={{ width: DAY_WIDTH }}
                >
                  {label}
                </div>
              ))}
            </div>

            {rows.map((employee) => (
              <div
                key={employee.name}
                className="relative border-b border-slate-100"
                style={{ height: ROW_HEIGHT }}
              >
                <div className="pointer-events-none absolute inset-0 flex">
                  {dayLabels.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'shrink-0 border-r border-slate-50',
                        showTodayMarker && idx === todayIndex && 'bg-blue-50/50'
                      )}
                      style={{ width: DAY_WIDTH }}
                    />
                  ))}
                </div>

                {employee.trips.map((trip, idx) => (
                  <TripBar key={`${employee.name}-${trip.country}-${idx}`} trip={trip} />
                ))}
              </div>
            ))}

            {showTodayMarker && (
              <div
                className="pointer-events-none absolute bottom-0 top-8 z-10 w-0.5 bg-blue-500"
                style={{ left: todayIndex * DAY_WIDTH + DAY_WIDTH / 2 }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-green-500" />
          <span className="text-xs text-slate-600">Compliant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-amber-500" />
          <span className="text-xs text-slate-600">At Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-red-500" />
          <span className="text-xs text-slate-600">Non-Compliant</span>
        </div>
      </div>
    </div>
  )
}
