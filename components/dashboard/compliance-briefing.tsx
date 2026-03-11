import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { StatusBadge } from './status-badge'
import type { DashboardBriefing, BriefingEmployee } from '@/types/dashboard'

/**
 * Format a briefing date string (YYYY-MM-DD) for display.
 */
function formatBriefingDate(iso: string): string {
  return format(parseISO(iso), 'd MMM')
}

/**
 * Build contextual action text for an attention employee.
 */
function getActionText(emp: BriefingEmployee): string {
  if (emp.risk_level === 'breach') {
    const overBy = Math.abs(emp.days_remaining)
    if (emp.earliest_safe_entry) {
      return `Over by ${overBy} days, re-entry ${formatBriefingDate(emp.earliest_safe_entry)}`
    }
    return `Over by ${overBy} days`
  }

  if (emp.risk_level === 'red' && emp.next_expiring_date) {
    return `${emp.days_remaining} days left, ${emp.next_expiring_count} ${emp.next_expiring_count === 1 ? 'day expires' : 'days expire'} ${formatBriefingDate(emp.next_expiring_date)}`
  }

  // amber or red without expiring info
  return `${emp.days_remaining} days left`
}


interface ComplianceBriefingProps {
  briefing: DashboardBriefing
}

/**
 * Compliance briefing panel for the dashboard header.
 * Server component — no 'use client'.
 *
 * When all employees are compliant, renders a collapsed single-line state.
 * Otherwise shows the list of employees needing attention.
 */
export function ComplianceBriefing({ briefing }: ComplianceBriefingProps) {
  // All-compliant collapsed state
  if (briefing.attention_count === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 px-6 py-4 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
        <p className="text-sm text-brand-600">
          All {briefing.total} employees compliant. No action needed.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <p className="text-sm font-medium text-brand-500 mb-3">
        {briefing.attention_count} {briefing.attention_count === 1 ? 'employee needs' : 'employees need'} attention
      </p>

      {/* Attention list */}
      <div className="space-y-3">
        {briefing.attention_employees.map((emp) => (
          <div
            key={emp.id}
            className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"
          >
            <Link
              href={`/employee/${emp.id}`}
              className="text-sm font-medium text-brand-900 hover:underline transition-colors duration-150 cursor-pointer shrink-0"
            >
              {emp.name}
            </Link>
            <StatusBadge status={emp.risk_level} className="w-fit" />
            <p className="text-sm text-brand-500">
              {getActionText(emp)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton placeholder for the briefing panel during Suspense loading.
 * Matches approximate dimensions of the full briefing.
 */
export function ComplianceBriefingSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
      <div className="h-4 w-40 bg-slate-100 rounded mb-3" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-5 w-16 bg-slate-100 rounded" />
            <div className="h-4 w-48 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
