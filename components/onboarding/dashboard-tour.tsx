'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Compass, Sparkles } from 'lucide-react'
import { completeDashboardTour } from '@/app/(dashboard)/dashboard/tour-actions'
import { cn } from '@/lib/utils'

interface DashboardTourProps {
  startOpen: boolean
}

const TOUR_STEPS = [
  {
    title: 'Dashboard',
    targetId: 'tour-dashboard-home',
    description: 'This view tracks live compliance risk and current employee status.',
  },
  {
    title: 'Calendar',
    targetId: 'tour-nav-calendar',
    description: 'Plan future movements and validate Schengen day usage before travel.',
  },
  {
    title: 'Import',
    targetId: 'tour-nav-import',
    description: 'Bulk import employee travel records to keep data synchronized quickly.',
  },
  {
    title: 'Exports',
    targetId: 'tour-nav-exports',
    description: 'Generate downloadable reports for internal and external stakeholders.',
  },
  {
    title: 'Alerts & Forecast',
    targetId: 'tour-nav-alerts',
    description: 'Use Future Alerts and Trip Forecast to stay ahead of upcoming exposure.',
  },
  {
    title: 'Settings & Billing',
    targetId: 'tour-nav-settings',
    description: 'Manage workspace defaults, team access, and billing controls from Settings.',
  },
] as const

export function DashboardTour({ startOpen }: DashboardTourProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(startOpen)
  const [currentStep, setCurrentStep] = useState(0)
  const [completionError, setCompletionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalSteps = TOUR_STEPS.length
  const isLastStep = currentStep === totalSteps - 1
  const step = TOUR_STEPS[currentStep]

  const replaceWithoutTourQuery = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString())
    if (!nextParams.has('tour')) return

    nextParams.delete('tour')
    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname
    router.replace(nextUrl, { scroll: false })
  }, [pathname, router, searchParams])

  const finishTour = useCallback(() => {
    setCompletionError(null)
    startTransition(() => {
      void (async () => {
        try {
          await completeDashboardTour()
          setIsOpen(false)
          replaceWithoutTourQuery()
          router.refresh()
        } catch (error) {
          setCompletionError(
            error instanceof Error
              ? error.message
              : 'Unable to save tour progress right now.'
          )
        }
      })()
    })
  }, [replaceWithoutTourQuery, router])

  useEffect(() => {
    if (!isOpen) return

    const selector = `[data-tour-id="${step.targetId}"]`
    const target = document.querySelector<HTMLElement>(selector)
    if (!target) return

    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })

    const previousOutline = target.style.outline
    const previousOutlineOffset = target.style.outlineOffset
    const previousBoxShadow = target.style.boxShadow
    const previousBorderRadius = target.style.borderRadius

    target.style.outline = '3px solid rgba(14, 116, 144, 0.8)'
    target.style.outlineOffset = '4px'
    target.style.boxShadow = '0 0 0 4px rgba(103, 232, 249, 0.22)'
    if (!previousBorderRadius) {
      target.style.borderRadius = '12px'
    }

    return () => {
      target.style.outline = previousOutline
      target.style.outlineOffset = previousOutlineOffset
      target.style.boxShadow = previousBoxShadow
      target.style.borderRadius = previousBorderRadius
    }
  }, [isOpen, step.targetId])

  const progressPercent = useMemo(
    () => ((currentStep + 1) / totalSteps) * 100,
    [currentStep, totalSteps]
  )

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div className="fixed inset-0 z-[65] bg-slate-950/45 backdrop-blur-[1px]" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard onboarding tour"
        className="fixed inset-x-4 bottom-4 z-[70] max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/20 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:p-6"
      >
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
          <Sparkles className="h-3.5 w-3.5" />
          Guided Tour
        </p>
        <h2 className="mt-3 text-xl font-semibold text-slate-900">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {step.description}
        </p>

        <div className="mt-4 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-cyan-600 transition-[width] duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Step {currentStep + 1} of {totalSteps}
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
            <Compass className="h-3.5 w-3.5" />
            Looking at
          </p>
          <p className="mt-1 break-all font-mono text-[11px]">{step.targetId}</p>
        </div>

        {completionError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {completionError}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={finishTour}
            disabled={isPending}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Skip
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep((stepIndex) => Math.max(0, stepIndex - 1))}
            disabled={currentStep === 0 || isPending}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              currentStep === 0 || isPending
                ? 'cursor-not-allowed border-slate-200 text-slate-400'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={finishTour}
              disabled={isPending}
              className="ml-auto inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Saving…' : 'Finish'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep((stepIndex) => Math.min(totalSteps - 1, stepIndex + 1))}
              disabled={isPending}
              className="ml-auto inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>
    </>
  )
}
