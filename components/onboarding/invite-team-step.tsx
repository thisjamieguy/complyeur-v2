'use client'

import { useState } from 'react'
import { inviteTeamMembers, completeOnboarding } from '@/app/(onboarding)/onboarding/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface InviteTeamStepProps {
  onBack: () => void
}

export function InviteTeamStep({ onBack }: InviteTeamStepProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [emails, setEmails] = useState(['', '', ''])

  function updateEmail(index: number, value: string) {
    setEmails((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const hasAnyEmail = emails.some((e) => e.trim() !== '')

  async function handleSubmit() {
    setIsLoading(true)
    try {
      if (hasAnyEmail) {
        const formData = new FormData()
        emails.forEach((email, i) => formData.append(`email${i}`, email))
        await inviteTeamMembers(formData)
        toast.success('Invitations sent')
      }
      await completeOnboarding()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  async function handleSkip() {
    setIsLoading(true)
    try {
      await completeOnboarding()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Invite your team</CardTitle>
        <CardDescription>
          Add colleagues who need to manage travel compliance. You can invite more later from Settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {emails.map((email, i) => (
          <div key={i}>
            <Label htmlFor={`invite-email-${i}`} className="sr-only">
              Team member email {i + 1}
            </Label>
            <Input
              id={`invite-email-${i}`}
              type="email"
              placeholder={`colleague${i + 1}@company.com`}
              value={email}
              onChange={(e) => updateEmail(i, e.target.value)}
              disabled={isLoading}
            />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={isLoading} className="flex-1">
            Back
          </Button>
          <Button type="button" variant="ghost" onClick={handleSkip} disabled={isLoading}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
            {isLoading ? 'Finishing...' : 'Get Started'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
