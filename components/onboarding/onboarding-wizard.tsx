'use client'

import { useState } from 'react'
import { OnboardingProgress } from './onboarding-progress'
import { CompanyNameStep } from './company-name-step'
import { AddEmployeeStep } from './add-employee-step'
import { InviteTeamStep } from './invite-team-step'

const TOTAL_STEPS = 3

interface OnboardingWizardProps {
  initialCompanyName: string
}

export function OnboardingWizard({ initialCompanyName }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)

  return (
    <div>
      <OnboardingProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
      {currentStep === 1 && (
        <CompanyNameStep
          initialName={initialCompanyName}
          onComplete={() => setCurrentStep(2)}
        />
      )}
      {currentStep === 2 && (
        <AddEmployeeStep
          onComplete={() => setCurrentStep(3)}
          onSkip={() => setCurrentStep(3)}
          onBack={() => setCurrentStep(1)}
        />
      )}
      {currentStep === 3 && (
        <InviteTeamStep
          onBack={() => setCurrentStep(2)}
        />
      )}
    </div>
  )
}
