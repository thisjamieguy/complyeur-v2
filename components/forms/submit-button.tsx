'use client'

import { ComponentProps } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ButtonProps = ComponentProps<typeof Button>

interface SubmitButtonProps extends Omit<ButtonProps, 'type'> {
  isLoading?: boolean
  loadingText?: string
}

/**
 * A form submit button with loading state
 *
 * Features:
 * - Shows spinner when isLoading is true
 * - Disables button during submission
 * - Customizable loading text
 *
 * @example
 * <SubmitButton isLoading={isSubmitting} loadingText="Saving...">
 *   Save
 * </SubmitButton>
 */
export function SubmitButton({
  children,
  isLoading = false,
  loadingText,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
