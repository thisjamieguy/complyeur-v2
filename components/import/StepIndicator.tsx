'use client';

import { Check } from 'lucide-react';

const STEPS = [
  { label: 'Format', step: 1 },
  { label: 'Upload', step: 2 },
  { label: 'Preview', step: 3 },
  { label: 'Done', step: 4 },
] as const;

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.step;
        const isCurrent = currentStep === step.step;
        const isFuture = currentStep < step.step;

        return (
          <div key={step.step} className="flex items-center">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  transition-all duration-200
                  ${isCompleted ? 'bg-blue-600 text-white' : ''}
                  ${isCurrent ? 'bg-blue-600 text-white' : ''}
                  ${isFuture ? 'border-2 border-slate-300 text-slate-400' : ''}
                `}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.step
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium
                  ${isCurrent ? 'text-blue-600' : 'text-slate-500'}
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connecting line (except after last step) */}
            {index < STEPS.length - 1 && (
              <div
                className={`
                  w-12 h-0.5 mx-2
                  ${currentStep > step.step ? 'bg-blue-600' : 'bg-slate-200'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
