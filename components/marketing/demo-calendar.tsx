'use client'

import { cn } from '@/lib/utils'

type RiskLevel = 'green' | 'amber' | 'red'

interface DemoTrip {
  country: string
  startDay: number // Day offset from start of timeline
  duration: number // Days
  riskLevel: RiskLevel
}

interface DemoEmployee {
  name: string
  trips: DemoTrip[]
}

// Day width in pixels
const DAY_WIDTH = 28
// Total days to show (4 weeks)
const TOTAL_DAYS = 28
// "Today" is positioned at day 14 (middle of the timeline)
const TODAY_OFFSET = 14
// Row height
const ROW_HEIGHT = 40
// Name column width
const NAME_WIDTH = 120

// Mock data showing realistic travel patterns
const employees: DemoEmployee[] = [
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

// Generate day labels (we'll show abbreviated dates)
function generateDayLabels(): string[] {
  const labels: string[] = []
  // Start from a realistic date offset
  const baseDay = 10
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const day = ((baseDay + i - 1) % 31) + 1
    labels.push(day.toString())
  }
  return labels
}

const dayLabels = generateDayLabels()

const riskStyles = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
} satisfies Record<RiskLevel, string>

function TripBar({ trip }: { trip: DemoTrip }) {
  const left = trip.startDay * DAY_WIDTH
  const width = trip.duration * DAY_WIDTH - 2 // Small gap

  return (
    <div
      className={cn(
        'absolute h-6 rounded-md flex items-center justify-center',
        'text-white text-xs font-medium shadow-sm',
        riskStyles[trip.riskLevel]
      )}
      style={{
        left: `${left}px`,
        width: `${Math.max(width, 24)}px`,
        top: '50%',
        transform: 'translateY(-50%)',
      }}
    >
      {trip.country}
    </div>
  )
}

export function DemoCalendar() {
  const timelineWidth = TOTAL_DAYS * DAY_WIDTH

  return (
    <div className="bg-white overflow-hidden max-w-full">
      {/* Header with month label */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
        <span className="text-sm font-medium text-slate-700">Timeline View</span>
      </div>

      <div className="flex">
        {/* Employee names column (fixed) */}
        <div className="shrink-0 border-r border-slate-200" style={{ width: NAME_WIDTH }}>
          {/* Header spacer for date row */}
          <div className="h-8 border-b border-slate-200 bg-slate-50 px-3 flex items-center">
            <span className="text-xs font-medium text-slate-500">Employee</span>
          </div>
          {/* Employee names */}
          {employees.map((employee) => (
            <div
              key={employee.name}
              className="border-b border-slate-100 px-3 flex items-center"
              style={{ height: ROW_HEIGHT }}
            >
              <span className="text-sm text-slate-700 truncate">{employee.name}</span>
            </div>
          ))}
        </div>

        {/* Timeline (horizontally scrollable) */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ width: timelineWidth }}>
            {/* Date header */}
            <div className="h-8 border-b border-slate-200 bg-slate-50 flex relative">
              {dayLabels.map((day, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'shrink-0 flex items-center justify-center text-xs border-r border-slate-100',
                    idx === TODAY_OFFSET && 'bg-blue-50 font-semibold text-blue-600'
                  )}
                  style={{ width: DAY_WIDTH }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Employee rows */}
            {employees.map((employee) => (
              <div
                key={employee.name}
                className="relative border-b border-slate-100"
                style={{ height: ROW_HEIGHT }}
              >
                {/* Day grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {dayLabels.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'shrink-0 border-r border-slate-50',
                        idx === TODAY_OFFSET && 'bg-blue-50/50'
                      )}
                      style={{ width: DAY_WIDTH }}
                    />
                  ))}
                </div>

                {/* Trip bars */}
                {employee.trips.map((trip, idx) => (
                  <TripBar key={idx} trip={trip} />
                ))}
              </div>
            ))}

            {/* Today marker line */}
            <div
              className="absolute top-8 bottom-0 w-0.5 bg-blue-500 pointer-events-none z-10"
              style={{ left: TODAY_OFFSET * DAY_WIDTH + DAY_WIDTH / 2 }}
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span className="text-xs text-slate-600">Compliant</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-500" />
          <span className="text-xs text-slate-600">At Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span className="text-xs text-slate-600">Non-Compliant</span>
        </div>
      </div>
    </div>
  )
}
