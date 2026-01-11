'use client'

import { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

interface FormFieldWrapperProps {
  /** Field name for accessibility */
  name: string
  /** Label text */
  label: string
  /** Whether the field is required */
  required?: boolean
  /** Error message from validation */
  error?: string
  /** Whether the field has been touched and is valid */
  isValid?: boolean
  /** Whether to show the valid checkmark */
  showValidIndicator?: boolean
  /** Optional description below the field */
  description?: string
  /** The form input element */
  children: ReactNode
  /** Additional class names */
  className?: string
}

/**
 * A wrapper component for form fields
 *
 * Features:
 * - Shows label above
 * - Shows error message below in red if validation fails
 * - Shows green checkmark if valid and touched (optional)
 * - Supports description text
 *
 * Note: For use with react-hook-form, prefer using the Shadcn Form components
 * (FormField, FormItem, FormLabel, FormControl, FormMessage) directly.
 * This component is useful for simpler forms without react-hook-form.
 *
 * @example
 * <FormFieldWrapper
 *   name="email"
 *   label="Email"
 *   required
 *   error={errors.email?.message}
 *   isValid={!errors.email && touchedFields.email}
 * >
 *   <Input {...register('email')} />
 * </FormFieldWrapper>
 */
export function FormFieldWrapper({
  name,
  label,
  required,
  error,
  isValid,
  showValidIndicator = true,
  description,
  children,
  className,
}: FormFieldWrapperProps) {
  const inputId = `field-${name}`
  const errorId = `${inputId}-error`
  const descriptionId = `${inputId}-description`

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label
          htmlFor={inputId}
          className={cn(error && 'text-destructive')}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {showValidIndicator && isValid && !error && (
          <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
        )}
      </div>

      <div className="relative">
        {children}
      </div>

      {description && !error && (
        <p
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Simple field label with optional indicator
 */
interface FieldLabelProps {
  htmlFor: string
  children: ReactNode
  required?: boolean
  optional?: boolean
  className?: string
}

export function FieldLabel({
  htmlFor,
  children,
  required,
  optional,
  className,
}: FieldLabelProps) {
  return (
    <Label htmlFor={htmlFor} className={className}>
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
      {optional && (
        <span className="text-muted-foreground font-normal ml-1">(optional)</span>
      )}
    </Label>
  )
}
