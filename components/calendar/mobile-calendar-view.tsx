'use client'

import Link from 'next/link'
import { Monitor } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/lib/compliance'

interface ProcessedEmployee {
  id: string
  name: string
  tripsInRange: number
  currentDaysRemaining: number
  currentRiskLevel: RiskLevel
}

interface MobileCalendarViewProps {
  employees: ProcessedEmployee[]
}

const riskConfig = {
  green: {
    label: 'Safe',
    dotColor: 'bg-green-500',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  amber: {
    label: 'Warning',
    dotColor: 'bg-amber-500',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  red: {
    label: 'Critical',
    dotColor: 'bg-red-500',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  breach: {
    label: 'Breach',
    dotColor: 'bg-slate-900',
    textColor: 'text-slate-900',
    bgColor: 'bg-slate-100',
  },
} satisfies Record<
  RiskLevel,
  { label: string; dotColor: string; textColor: string; bgColor: string }
>

/**
 * Simplified mobile view showing employee compliance status as a list
 */
export function MobileCalendarView({ employees }: MobileCalendarViewProps) {
  return (
    <div className="space-y-4">
      {/* Desktop suggestion banner */}
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 flex items-start gap-3">
        <Monitor className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-700">
            Timeline view works best on larger screens
          </p>
          <p className="text-xs text-slate-500 mt-1">
            View on tablet or desktop for the full Gantt chart experience
          </p>
        </div>
      </div>

      <Card className="rounded-xl">
        <CardHeader className="pb-4">
          <h2 className="text-sm font-medium text-slate-700">
            Employee Compliance
          </h2>
          <p className="text-xs text-slate-500">
            Tap an employee to view their trips
          </p>
        </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {employees.map((employee) => {
            const config = riskConfig[employee.currentRiskLevel]

            return (
              <Link
                key={employee.id}
                href={`/employee/${employee.id}`}
                className="block px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">
                      {employee.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          config.dotColor
                        )}
                      />
                      <span
                        className={cn('text-xs font-medium', config.textColor)}
                      >
                        {config.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {' '}
                        — {employee.currentDaysRemaining} days remaining
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">
                      {employee.tripsInRange}{' '}
                      {employee.tripsInRange === 1 ? 'trip' : 'trips'} in range
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}

          {employees.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-slate-500">No employees found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
