'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Loader2 } from 'lucide-react'

export interface ConfirmDestructiveActionProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Title of the confirmation dialog */
  title: string
  /** Description explaining what will happen */
  description: string | React.ReactNode
  /** Bullet points of consequences */
  consequences?: string[]
  /** Text the user must type to confirm (e.g., "DELETE") */
  confirmText: string
  /** Label for the confirm button */
  confirmButtonLabel?: string
  /** Whether the action is currently loading */
  isLoading?: boolean
  /** Callback when user confirms the action */
  onConfirm: () => void | Promise<void>
}

/**
 * A double-confirmation modal for destructive actions.
 *
 * Requires the user to type a specific text (e.g., "DELETE") before
 * the action can proceed. This prevents accidental destructive operations.
 *
 * @example
 * ```tsx
 * <ConfirmDestructiveAction
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Permanently Delete Employee"
 *   description="You are about to delete John Smith."
 *   consequences={[
 *     "Removes the employee after 30 days",
 *     "Cannot be undone after the recovery period",
 *     "Will be logged for compliance purposes"
 *   ]}
 *   confirmText="DELETE"
 *   onConfirm={handleDelete}
 * />
 * ```
 */
export function ConfirmDestructiveAction({
  open,
  onOpenChange,
  title,
  description,
  consequences,
  confirmText,
  confirmButtonLabel = 'Confirm',
  isLoading = false,
  onConfirm,
}: ConfirmDestructiveActionProps) {
  const [inputValue, setInputValue] = React.useState('')

  const isConfirmEnabled = inputValue === confirmText && !isLoading

  // Reset input when dialog closes
  React.useEffect(() => {
    if (!open) {
      setInputValue('')
    }
  }, [open])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isConfirmEnabled) {
      await onConfirm()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow escape to close
    if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }

  // Prevent closing during loading
  const handleOpenChange = (newOpen: boolean) => {
    if (isLoading && !newOpen) {
      return // Don't allow closing while loading
    }
    onOpenChange(newOpen)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md" onKeyDown={handleKeyDown}>
        <form onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {typeof description === 'string' ? (
                  <p>{description}</p>
                ) : (
                  description
                )}

                {consequences && consequences.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-medium text-slate-700">This action:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      {consequences.map((consequence, index) => (
                        <li key={index}>{consequence}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Label htmlFor="confirm-input" className="text-slate-700">
                    Type <span className="font-mono font-bold text-red-600">{confirmText}</span> to confirm:
                  </Label>
                  <Input
                    id="confirm-input"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={confirmText}
                    className="font-mono"
                    disabled={isLoading}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    autoFocus
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!isConfirmEnabled}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmButtonLabel
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
