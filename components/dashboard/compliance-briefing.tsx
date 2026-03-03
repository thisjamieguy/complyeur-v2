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
  return `${emp.days_remaining} days left, can stay ${emp.max_stay_days} more`
}

/**
 * Determine the color class for the compliance percentage.
 */
function getPctColor(pct: number): string {
  if (pct > 90) return 'text-emerald-700'
  if (pct >= 70) return 'text-amber-700'
  return 'text-rose-700'
}

interface ComplianceBriefingProps {
  briefing: DashboardBriefing
}

/**
 * Compliance briefing panel for the dashboard header.
 * Server component — no 'use client'.
 *
 * When all employees are compliant, renders a collapsed single-line state.
 * Otherwise shows a 3-column summary + attention employee list.
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

  // Find which employee benefits from the next window change
  let windowChangeEmployee: BriefingEmployee | null = null
  if (briefing.next_window_change_date) {
    for (const emp of briefing.attention_employees) {
      if (emp.next_expiring_date === briefing.next_window_change_date) {
        windowChangeEmployee = emp
        break
      }
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Three-column summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Column 1: Compliance rate */}
        <div className="py-3 sm:py-0 border-b sm:border-b-0 border-slate-100">
          <p className={`text-4xl font-bold ${getPctColor(briefing.compliance_pct)}`}>
            {briefing.compliance_pct}%
          </p>
          <p className="text-sm text-brand-500 mt-1">compliant</p>
          <p className="text-xs text-brand-400">
            {briefing.compliant_count} of {briefing.compliant_count + briefing.attention_count}
          </p>
        </div>

        {/* Column 2: Attention breakdown */}
        <div className="py-3 sm:py-0 border-b sm:border-b-0 border-slate-100">
          <p className="text-lg font-semibold text-brand-900">
            {briefing.attention_count} need attention
          </p>
          <div className="text-sm text-brand-500 mt-1 space-y-0.5">
            {briefing.high_risk_count > 0 && (
              <p>{briefing.high_risk_count} high risk</p>
            )}
            {briefing.at_risk_count > 0 && (
              <p>{briefing.at_risk_count} at risk</p>
            )}
            {briefing.breach_count > 0 && (
              <p>{briefing.breach_count} in breach</p>
            )}
          </div>
        </div>

        {/* Column 3: Next window shift */}
        <div className="py-3 sm:py-0">
          {briefing.next_window_change_date ? (
            <>
              <p className="text-lg font-semibold text-brand-900">
                Next window shift
              </p>
              <p className="text-sm text-brand-500 mt-1">
                in {briefing.next_window_change_days} {briefing.next_window_change_days === 1 ? 'day' : 'days'}
              </p>
              {windowChangeEmployee && (
                <p className="text-xs text-brand-400">
                  {windowChangeEmployee.name} gets {windowChangeEmployee.next_expiring_count} {windowChangeEmployee.next_expiring_count === 1 ? 'day' : 'days'} back
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-brand-900">
                No upcoming changes
              </p>
              <p className="text-sm text-brand-500 mt-1">
                No days expiring soon
              </p>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 my-4" />

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="space-y-2">
          <div className="h-10 w-20 bg-slate-200 rounded" />
          <div className="h-4 w-24 bg-slate-100 rounded" />
          <div className="h-3 w-16 bg-slate-100 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-36 bg-slate-200 rounded" />
          <div className="h-4 w-24 bg-slate-100 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-32 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-100 rounded" />
        </div>
      </div>
      <div className="border-t border-slate-100 my-4" />
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
