'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type RiskLevel = 'green' | 'amber' | 'red'

interface DemoEmployee {
  id: number
  name: string
  daysUsed: number
  daysRemaining: number
  status: RiskLevel
  lastTrip: string
}

// Status badge styling matching the real StatusBadge component
const statusConfig = {
  green: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
    label: 'Compliant',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    label: 'At Risk',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    label: 'Non-Compliant',
  },
} as const

function DemoStatusBadge({ status }: { status: RiskLevel }) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-sm font-medium border transition-all duration-500',
        config.bg,
        config.text,
        config.border
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full transition-colors duration-500', config.dot)}
      />
      {config.label}
    </span>
  )
}

// Animation keyframes for the demo
// Each employee has a sequence of states they cycle through
const employeeAnimations: Array<{
  name: string
  lastTrip: string
  frames: Array<{ daysUsed: number; status: RiskLevel }>
}> = [
  {
    name: 'Ken Adams',
    lastTrip: '15 Jan 2026',
    frames: [
      { daysUsed: 72, status: 'amber' },
      { daysUsed: 78, status: 'amber' },
      { daysUsed: 85, status: 'red' },
      { daysUsed: 91, status: 'red' },
    ],
  },
  {
    name: 'James Davies',
    lastTrip: '22 Jan 2026',
    frames: [
      { daysUsed: 45, status: 'green' },
      { daysUsed: 52, status: 'green' },
      { daysUsed: 58, status: 'green' },
      { daysUsed: 45, status: 'green' },
    ],
  },
  {
    name: 'Emma Thompson',
    lastTrip: '18 Jan 2026',
    frames: [
      { daysUsed: 62, status: 'amber' },
      { daysUsed: 68, status: 'amber' },
      { daysUsed: 75, status: 'amber' },
      { daysUsed: 62, status: 'amber' },
    ],
  },
  {
    name: 'Michael Park',
    lastTrip: '10 Jan 2026',
    frames: [
      { daysUsed: 28, status: 'green' },
      { daysUsed: 35, status: 'green' },
      { daysUsed: 42, status: 'green' },
      { daysUsed: 28, status: 'green' },
    ],
  },
  {
    name: 'Lisa Martinez',
    lastTrip: '20 Jan 2026',
    frames: [
      { daysUsed: 88, status: 'red' },
      { daysUsed: 88, status: 'red' },
      { daysUsed: 65, status: 'amber' }, // Days "freed up" as old trips leave window
      { daysUsed: 88, status: 'red' },
    ],
  },
]

export function DemoEmployeeList() {
  const [frameIndex, setFrameIndex] = useState(0)
  const [employees, setEmployees] = useState<DemoEmployee[]>(() =>
    employeeAnimations.map((emp, idx) => ({
      id: idx,
      name: emp.name,
      lastTrip: emp.lastTrip,
      daysUsed: emp.frames[0].daysUsed,
      daysRemaining: 90 - emp.frames[0].daysUsed,
      status: emp.frames[0].status,
    }))
  )

  // Animate through frames
  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % employeeAnimations[0].frames.length)
    }, 2500) // Change every 2.5 seconds

    return () => clearInterval(interval)
  }, [])

  // Update employees when frame changes
  useEffect(() => {
    setEmployees(
      employeeAnimations.map((emp, idx) => {
        const frame = emp.frames[frameIndex]
        return {
          id: idx,
          name: emp.name,
          lastTrip: emp.lastTrip,
          daysUsed: frame.daysUsed,
          daysRemaining: 90 - frame.daysUsed,
          status: frame.status,
        }
      })
    )
  }, [frameIndex])

  return (
    <div className="bg-slate-50 p-4">
      {/* Mini stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-2xl font-bold text-slate-900">5</div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-2xl font-bold text-green-600">
            {employees.filter((e) => e.status === 'green').length}
          </div>
          <div className="text-xs text-slate-500">Compliant</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-2xl font-bold text-amber-600">
            {employees.filter((e) => e.status === 'amber').length}
          </div>
          <div className="text-xs text-slate-500">At Risk</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="text-2xl font-bold text-red-600">
            {employees.filter((e) => e.status === 'red').length}
          </div>
          <div className="text-xs text-slate-500">Non-Compliant</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                Employee
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                Status
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden sm:table-cell">
                Days Used
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">
                Remaining
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr
                key={employee.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900">{employee.name}</span>
                </td>
                <td className="px-4 py-3">
                  <DemoStatusBadge status={employee.status} />
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 tabular-nums transition-all duration-500">
                      {employee.daysUsed} / 90
                    </span>
                    {/* Mini progress bar */}
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          employee.status === 'green' && 'bg-green-500',
                          employee.status === 'amber' && 'bg-amber-500',
                          employee.status === 'red' && 'bg-red-500'
                        )}
                        style={{ width: `${(employee.daysUsed / 90) * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'font-medium tabular-nums transition-colors duration-500',
                      employee.daysRemaining >= 30 && 'text-green-600',
                      employee.daysRemaining >= 10 &&
                        employee.daysRemaining < 30 &&
                        'text-amber-600',
                      employee.daysRemaining < 10 && 'text-red-600'
                    )}
                  >
                    {employee.daysRemaining} days
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
