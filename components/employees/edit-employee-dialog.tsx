'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { updateEmployeeAction } from '@/app/(dashboard)/actions'
import { employeeSchema, type EmployeeFormData } from '@/lib/validations/employee'
import type { Employee } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { showSuccess, showError } from '@/lib/toast'
import { FormError } from '@/components/forms'

interface EditEmployeeDialogProps {
  employee: Employee
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditEmployeeDialog({ employee, open, onOpenChange }: EditEmployeeDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee.name,
    },
    mode: 'onBlur', // Validate on blur for immediate feedback
  })

  // Reset form when employee changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({ name: employee.name })
      setFormError(null)
    }
  }, [open, employee.name, form])

  async function onSubmit(data: EmployeeFormData) {
    setIsLoading(true)
    setFormError(null)

    try {
      await updateEmployeeAction(employee.id, data)
      showSuccess('Employee updated successfully')
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update employee'
      setFormError(message)
      showError('Failed to update employee', message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    onOpenChange(isOpen)
    if (!isOpen) {
      setFormError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update the employee&apos;s information.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <FormError
                message={formError}
                onDismiss={() => setFormError(null)}
              />
            )}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter employee name"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
