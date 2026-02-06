'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { submitFeedbackAction } from '@/app/(dashboard)/actions'
import type { FeedbackSubmissionFormData } from '@/lib/validations/feedback'
import { showError, showSuccess } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type FeedbackCategory = FeedbackSubmissionFormData['category']

const DEFAULT_CATEGORY: FeedbackCategory = 'bug'

const FEEDBACK_OPTIONS: Array<{ value: FeedbackCategory; label: string }> = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'confusing_ux', label: 'Confusing UX' },
  { value: 'other', label: 'Other' },
]

interface FeedbackDialogProps {
  trigger: ReactNode
}

export function FeedbackDialog({ trigger }: FeedbackDialogProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory>(DEFAULT_CATEGORY)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const trimmedMessage = message.trim()
  const canSubmit = trimmedMessage.length >= 10 && trimmedMessage.length <= 2000

  function resetForm() {
    setCategory(DEFAULT_CATEGORY)
    setMessage('')
    setFormError(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen && !isSubmitting) {
      resetForm()
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || isSubmitting) return

    setIsSubmitting(true)
    setFormError(null)

    try {
      await submitFeedbackAction({
        category,
        message: trimmedMessage,
        page_path: pathname || '/dashboard',
      })
      showSuccess('Thanks, feedback received')
      resetForm()
      setOpen(false)
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Please try again'
      setFormError(details)
      showError('Could not submit feedback', details)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Share Feedback</DialogTitle>
          <DialogDescription>
            You are using a beta feature. Tell us what is working well and what needs fixing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Feedback Type</Label>
            <RadioGroup
              value={category}
              onValueChange={(value) => setCategory(value as FeedbackCategory)}
              disabled={isSubmitting}
              className="grid grid-cols-2 gap-2"
            >
              {FEEDBACK_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2"
                >
                  <RadioGroupItem value={option.value} id={`feedback-${option.value}`} />
                  <Label htmlFor={`feedback-${option.value}`} className="cursor-pointer font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-message">Details</Label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={isSubmitting}
              rows={5}
              placeholder="Tell us what happened, what you expected, and what we could improve..."
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Minimum 10 characters</p>
              <p className="text-xs text-slate-500">{trimmedMessage.length}/2000</p>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Feedback'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
