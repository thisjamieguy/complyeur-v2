'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { CheckCircle2, CreditCard, Upload, UserPlus, Users, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UnifiedAddEmployeeDialog } from '@/components/employees/unified-add-employee-dialog'
import { cn } from '@/lib/utils'

const DISMISS_STORAGE_KEY = 'complyeur.dashboard.first_run_checklist.dismissed'

interface FirstRunChecklistProps {
  hasEmployees: boolean
  teamMemberCount: number
  isPaidCustomer: boolean
}

interface ChecklistItem {
  key: string
  title: string
  body: string
  completed: boolean
  eyebrow: string
  icon: LucideIcon
  action: ReactNode
}

function StatusPill({ completed, label }: { completed: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        completed
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
      )}
    >
      {completed ? 'Done' : label}
    </span>
  )
}

export function FirstRunChecklist({
  hasEmployees,
  teamMemberCount,
  isPaidCustomer,
}: FirstRunChecklistProps) {
  const [isDismissed, setIsDismissed] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(DISMISS_STORAGE_KEY) === '1'
  )
  const hasTeam = teamMemberCount > 1

  const items = useMemo<ChecklistItem[]>(() => [
    {
      key: 'add',
      title: 'Add employee',
      body: 'Create the first record manually when you only need to check one traveller.',
      completed: hasEmployees,
      eyebrow: 'Recommended',
      icon: Users,
      action: (
        <UnifiedAddEmployeeDialog
          source="dashboard_header"
          trigger={
            <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
              Add employee
            </Button>
          }
        />
      ),
    },
    {
      key: 'import',
      title: 'Import spreadsheet',
      body: 'Bring in employee or trip data when your starting point is a workbook.',
      completed: hasEmployees,
      eyebrow: hasEmployees ? 'Optional' : 'Fast setup',
      icon: Upload,
      action: (
        <Button asChild variant="outline" className="rounded-xl border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900">
          <Link href="/import">Open import</Link>
        </Button>
      ),
    },
    {
      key: 'invite',
      title: 'Invite team',
      body: 'Give HR, operations, or mobility colleagues access to the same workspace.',
      completed: hasTeam,
      eyebrow: 'Team',
      icon: UserPlus,
      action: (
        <Button asChild variant="outline" className="rounded-xl border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900">
          <Link href="/settings/team">Invite team</Link>
        </Button>
      ),
    },
    {
      key: 'plan',
      title: 'Choose plan',
      body: 'Keep the workspace active after the trial with the self-serve plan that fits.',
      completed: isPaidCustomer,
      eyebrow: 'Billing',
      icon: CreditCard,
      action: (
        <Button asChild className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">
          <Link href="/pricing?autostart=1&plan=starter&billingInterval=monthly">Choose plan</Link>
        </Button>
      ),
    },
  ], [hasEmployees, hasTeam, isPaidCustomer])

  const completedCount = items.filter((item) => item.completed).length
  const shouldHide = isDismissed || (hasEmployees && hasTeam && isPaidCustomer)

  if (shouldHide) return null

  function dismissChecklist() {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, '1')
    setIsDismissed(true)
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Set up your workspace
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Start with the action that matches your data. You can explore the dashboard while setup stays available here.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {completedCount} of {items.length} done
          </span>
          <button
            type="button"
            onClick={dismissChecklist}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Dismiss setup checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <article
              key={item.key}
              className="flex min-h-[13rem] flex-col rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
                  {item.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Icon className="h-4 w-4" />}
                </div>
                <StatusPill completed={item.completed} label={item.eyebrow} />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{item.body}</p>
              <div className="mt-4">{item.action}</div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
