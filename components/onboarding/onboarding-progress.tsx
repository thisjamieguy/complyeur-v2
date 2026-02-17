'use client'

import { cn } from '@/lib/utils'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
}

const STEP_LABELS = ['Company', 'Employee', 'Team']

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const isActive = step === currentStep
        const isCompleted = step < currentStep
        return (
          <div key={step} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  isActive && 'bg-brand-600 text-white',
                  isCompleted && 'bg-brand-100 text-brand-700',
                  !isActive && !isCompleted && 'bg-slate-100 text-slate-400'
                )}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  isActive && 'text-brand-700',
                  isCompleted && 'text-brand-600',
                  !isActive && !isCompleted && 'text-slate-400'
                )}
              >
                {STEP_LABELS[i]}
              </span>
            </div>
            {step < totalSteps && (
              <div
                className={cn(
                  'h-px w-10 mb-5',
                  step < currentStep ? 'bg-brand-300' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
