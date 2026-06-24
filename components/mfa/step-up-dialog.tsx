'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { verifyStepUpAction } from '@/lib/actions/mfa'

interface StepUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful re-verification so the caller can retry its action. */
  onVerified: () => void
  description?: string
}

/**
 * Re-authentication ("step up") prompt shown when a sensitive action requires a
 * fresh MFA verification. Reuses verifyStepUpAction to refresh the session's
 * assurance level, then hands control back via onVerified so the caller can
 * retry the original action.
 */
export function StepUpDialog({ open, onOpenChange, onVerified, description }: StepUpDialogProps) {
  const [code, setCode] = React.useState('')
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Reset transient state whenever the dialog is (re)opened.
  React.useEffect(() => {
    if (open) {
      setCode('')
      setError(null)
      setIsVerifying(false)
    }
  }, [open])

  const handleVerify = async () => {
    const trimmed = code.replace(/\s/g, '')
    if (trimmed.length === 0) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const result = await verifyStepUpAction(trimmed)
      if (!result.success) {
        setError(result.error ?? 'Verification failed. Please try again.')
        return
      }
      onOpenChange(false)
      onVerified()
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-600" />
            Re-verify your identity
          </DialogTitle>
          <DialogDescription>
            {description ??
              'For your security, enter a fresh code from your authenticator app to continue with this sensitive action.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="step-up-code">Authenticator code</Label>
          <Input
            id="step-up-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            maxLength={10}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleVerify()
              }
            }}
            disabled={isVerifying}
            autoFocus
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isVerifying}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={isVerifying} className="gap-2">
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify & continue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
