'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

export type RiskLevel = 'green' | 'amber' | 'red'

export interface DemoEmployee {
  id: number
  name: string
  daysUsed: number
  daysRemaining: number
  status: RiskLevel
  lastTrip: string
}

interface DemoEmployeeListProps {
  employees?: DemoEmployee[]
  highlightedEmployeeName?: string
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
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-sm font-medium transition-all duration-500',
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

// Animation keyframes for the fallback autonomous demo mode.
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
      { daysUsed: 65, status: 'amber' },
      { daysUsed: 88, status: 'red' },
    ],
  },
]

function getAutonomousEmployees(frameIndex: number): DemoEmployee[] {
  return employeeAnimations.map((emp, idx) => {
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
}

export function DemoEmployeeList({ employees, highlightedEmployeeName }: DemoEmployeeListProps) {
  const isControlled = Boolean(employees)
  const [frameIndex, setFrameIndex] = useState(0)

  const autonomousEmployees = useMemo(() => getAutonomousEmployees(frameIndex), [frameIndex])
  const rows = employees ?? autonomousEmployees

  useEffect(() => {
    if (isControlled) return

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % employeeAnimations[0].frames.length)
    }, 2500)

    return () => clearInterval(interval)
  }, [isControlled])

  const compliantCount = rows.filter((employee) => employee.status === 'green').length
  const atRiskCount = rows.filter((employee) => employee.status === 'amber').length
  const nonCompliantCount = rows.filter((employee) => employee.status === 'red').length

  return (
    <div className="bg-slate-50 p-4">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-2xl font-bold text-slate-900">{rows.length}</div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-2xl font-bold text-green-600 transition-all duration-500">{compliantCount}</div>
          <div className="text-xs text-slate-500">Compliant</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-2xl font-bold text-amber-600 transition-all duration-500">{atRiskCount}</div>
          <div className="text-xs text-slate-500">At Risk</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-2xl font-bold text-red-600 transition-all duration-500">{nonCompliantCount}</div>
          <div className="text-xs text-slate-500">Non-Compliant</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Employee
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Status
              </th>
              <th className="hidden px-4 py-3 text-left text-sm font-semibold text-slate-700 sm:table-cell">
                Days Used
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Remaining
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((employee) => {
              const isHighlighted = highlightedEmployeeName === employee.name

              return (
                <tr
                  key={employee.id}
                  className={cn(
                    'border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50',
                    isHighlighted &&
                      'bg-brand-50/60 shadow-[inset_0_0_0_1px_rgba(53,92,130,0.22)] motion-safe:animate-pulse'
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{employee.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <DemoStatusBadge status={employee.status} />
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-sm text-slate-600 transition-all duration-500">
                        {employee.daysUsed} / 90
                      </span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
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
                        'tabular-nums font-medium transition-colors duration-500',
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
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
