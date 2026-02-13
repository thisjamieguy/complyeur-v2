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

const DAY_WIDTH = 28
const DEFAULT_TOTAL_DAYS = 28
const DEFAULT_TODAY_OFFSET = 14
const ROW_HEIGHT = 40
const NAME_WIDTH = 120
const DAY_MS = 24 * 60 * 60 * 1000

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
    trips: [
      { country: 'DE', startDay: 5, duration: 8, riskLevel: 'red' },
    ],
  },
]

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

// Simplified illustrative risk mapping for preview mode.
function getRiskLevelFromDuration(durationDays: number): RiskLevel {
  if (durationDays <= 7) return 'green'
  if (durationDays <= 14) return 'amber'
  return 'red'
}

function convertEmployeesForWindow(
  employees: DemoCalendarEmployee[],
  startDate: Date,
  endDate: Date
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
        const clippedStart = entryDate < startDate ? startDate : entryDate
        const clippedEnd = exitDate > endDate ? endDate : exitDate

        if (clippedEnd < clippedStart) {
          return null
        }

        return {
          country: trip.country.toUpperCase().slice(0, 2),
          startDay: diffInDays(clippedStart, startDate),
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
  const normalizedWindowDays = Math.max(7, Math.floor(windowDays))
  const centeredTodayOffset = Math.floor(normalizedWindowDays / 2)
  const normalizedReferenceDate = startOfDay(referenceDate)
  const windowStartDate = addDays(normalizedReferenceDate, -centeredTodayOffset)
  const windowEndDate = addDays(windowStartDate, normalizedWindowDays - 1)

  const dayLabels = isPropDriven
    ? Array.from({ length: normalizedWindowDays }, (_, index) =>
        addDays(windowStartDate, index).getDate().toString()
      )
    : defaultDayLabels

  const rows = isPropDriven
    ? convertEmployeesForWindow(employees, windowStartDate, windowEndDate)
    : defaultEmployees

  const totalDays = isPropDriven ? normalizedWindowDays : DEFAULT_TOTAL_DAYS
  const todayOffset = isPropDriven ? centeredTodayOffset : DEFAULT_TODAY_OFFSET
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
              {dayLabels.map((day, idx) => (
                <div
                  key={`${day}-${idx}`}
                  className={cn(
                    'flex shrink-0 items-center justify-center border-r border-slate-100 text-xs',
                    idx === todayOffset && 'bg-blue-50 font-semibold text-blue-600'
                  )}
                  style={{ width: DAY_WIDTH }}
                >
                  {day}
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
                      className={cn('shrink-0 border-r border-slate-50', idx === todayOffset && 'bg-blue-50/50')}
                      style={{ width: DAY_WIDTH }}
                    />
                  ))}
                </div>

                {employee.trips.map((trip, idx) => (
                  <TripBar key={`${employee.name}-${trip.country}-${idx}`} trip={trip} />
                ))}
              </div>
            ))}

            <div
              className="pointer-events-none absolute bottom-0 top-8 z-10 w-0.5 bg-blue-500"
              style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
            />
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
